import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import json
from ..database import get_db
from ..models import Experiment, Step, TestCase, CompletedExperiment, Lab, User
from ..schemas import ExperimentResponse, CompletionResponse
from ..deps import get_current_user, get_current_teacher, get_current_student
from ..utils.rag_engine import extract_text_from_pdf, generate_steps_from_text

router = APIRouter(prefix="/api/labs", tags=["Experiments"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{lab_id}/experiments", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
async def add_experiment(
    lab_id: str,
    title: str = Form(...),
    description: str = Form(...),
    points: int = Form(100),
    test_cases: str = Form("[]"), # JSON array string representing List[TestCaseCreate]
    test_cases_json: Optional[str] = Form(None), # Backward compatibility field
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    teacher: User = Depends(get_current_teacher)
):
    """Creates a new experiment within a laboratory. Extracts sequential steps automatically if a PDF is provided."""
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab or lab.faculty_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory workspace not found."
        )

    # Save PDF locally if present
    saved_file_path = None
    extracted_text = ""
    if file:
        file_ext = os.path.splitext(file.filename)[1]
        if file_ext.lower() != ".pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only instruction sheets in PDF format are supported."
            )
        
        filename = f"{lab_id}_{file.filename}"
        saved_file_path = os.path.join(UPLOAD_DIR, filename)
        with open(saved_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract text from the PDF file
        extracted_text = extract_text_from_pdf(saved_file_path)

    # Save experiment
    new_exp = Experiment(
        lab_id=lab_id,
        title=title,
        description=description,
        points=points,
        file_path=saved_file_path
    )
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)

    # Add test cases
    try:
        actual_test_cases = test_cases_json if test_cases_json is not None else test_cases
        tc_list = json.loads(actual_test_cases)
        for tc in tc_list:
            new_tc = TestCase(
                experiment_id=new_exp.id,
                input=tc.get("input", ""),
                expected=tc.get("expected", "")
            )
            db.add(new_tc)
    except Exception as e:
        print(f"Error parsing test cases: {e}")

    # Generate and add sequential steps
    steps = []
    if extracted_text:
        # Generate steps from RAG extraction
        steps = generate_steps_from_text(extracted_text)
    else:
        # Create standard placeholder steps from description if no PDF was provided
        steps = [
            {"title": "Initial Setup", "description": "Read the experiment guidelines carefully and prepare your environment.", "step_order": 1},
            {"title": "Implementation Phase", "description": f"Write the core logic for '{title}' as specified.", "step_order": 2},
            {"title": "Validation & Submission", "description": "Execute the code against test cases to verify complete correctness.", "step_order": 3}
        ]

    for step in steps:
        new_step = Step(
            experiment_id=new_exp.id,
            title=step["title"],
            description=step["description"],
            step_order=step["step_order"]
        )
        db.add(new_step)
        
    db.commit()
    db.refresh(new_exp)
    return new_exp


@router.post("/{lab_id}/experiments/{exp_id}/complete", response_model=CompletionResponse)
def complete_experiment(
    lab_id: str,
    exp_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student)
):
    """Logs completion of an experiment by a student (Student only)."""
    # Verify experiment existence
    exp = db.query(Experiment).filter(Experiment.id == exp_id, Experiment.lab_id == lab_id).first()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in this laboratory."
        )

    # Check duplicate
    already_done = db.query(CompletedExperiment).filter(
        CompletedExperiment.student_id == student.id,
        CompletedExperiment.experiment_id == exp_id
    ).first()
    
    if already_done:
        return already_done

    completion = CompletedExperiment(
        student_id=student.id,
        experiment_id=exp_id
    )
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


@router.get("/{lab_id}/completions", response_model=List[str])
def get_completions(
    lab_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(get_current_student)
):
    """Retrieves list of all experiment IDs completed by this student in the lab (Student only)."""
    experiments = db.query(Experiment.id).filter(Experiment.lab_id == lab_id).all()
    exp_ids = [e[0] for e in experiments]
    
    completed = db.query(CompletedExperiment.experiment_id).filter(
        CompletedExperiment.student_id == student.id,
        CompletedExperiment.experiment_id.in_(exp_ids)
    ).all()
    
    return [c[0] for c in completed]


@router.delete("/{lab_id}/experiments/{exp_id}", status_code=status.HTTP_200_OK)
def delete_experiment(
    lab_id: str,
    exp_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(get_current_teacher)
):
    """Deletes an experiment within a laboratory workspace (Teacher only)."""
    # Verify the laboratory exists and belongs to the teacher
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab or lab.faculty_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory workspace not found."
        )

    # Find the experiment
    exp = db.query(Experiment).filter(Experiment.id == exp_id, Experiment.lab_id == lab_id).first()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found."
        )

    # Delete the experiment (cascade rules will delete steps, test cases and completions)
    db.delete(exp)
    db.commit()
    return {"detail": "Experiment deleted successfully."}


print("Ready")
