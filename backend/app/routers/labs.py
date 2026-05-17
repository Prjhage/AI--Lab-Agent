import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Lab, User, EnrolledLab
from ..schemas import LabCreate, LabResponse, LabJoin
from ..deps import get_current_user, get_current_teacher, get_current_student

router = APIRouter(prefix="/api/labs", tags=["Labs & Workspace"])

def generate_lab_invite_code(db: Session) -> str:
    """Generates a unique 10-character alphanumeric invite code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
        # Ensure uniqueness
        exists = db.query(Lab).filter(Lab.code == code).first()
        if not exists:
            return code


@router.post("", response_model=LabResponse, status_code=status.HTTP_201_CREATED)
def create_lab(
    payload: LabCreate, 
    db: Session = Depends(get_db), 
    teacher: User = Depends(get_current_teacher)
):
    """Creates a new laboratory workspace with an automated invite code (Teacher only)."""
    invite_code = generate_lab_invite_code(db)
    new_lab = Lab(
        title=payload.title,
        type=payload.type,
        editor_type=payload.editor_type,
        code=invite_code,
        faculty_id=teacher.id
    )
    db.add(new_lab)
    db.commit()
    db.refresh(new_lab)
    return new_lab


@router.get("", response_model=List[LabResponse])
def get_labs(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Lists all laboratories appropriate for the current authenticated user's role."""
    if current_user.role == "teacher":
        # Teachers see labs they created
        return db.query(Lab).filter(Lab.faculty_id == current_user.id).all()
    else:
        # Students see labs they are enrolled in
        enrolled_lab_ids = db.query(EnrolledLab.lab_id).filter(EnrolledLab.student_id == current_user.id).all()
        lab_ids = [r[0] for r in enrolled_lab_ids]
        return db.query(Lab).filter(Lab.id.in_(lab_ids)).all()


@router.post("/join", response_model=LabResponse)
def join_lab(
    payload: LabJoin, 
    db: Session = Depends(get_db), 
    student: User = Depends(get_current_student)
):
    """Enrolls a student in a laboratory workspace via invite code (Student only)."""
    lab = db.query(Lab).filter(Lab.code == payload.code.upper().strip()).first()
    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory workspace not found with this code."
        )
    
    # Check if already joined
    already_enrolled = db.query(EnrolledLab).filter(
        EnrolledLab.student_id == student.id,
        EnrolledLab.lab_id == lab.id
    ).first()
    
    if already_enrolled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this laboratory."
        )
        
    enrollment = EnrolledLab(student_id=student.id, lab_id=lab.id)
    db.add(enrollment)
    db.commit()
    
    # Fetch lab with experiments loaded
    return lab


@router.get("/{lab_id}", response_model=LabResponse)
def get_lab_details(
    lab_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves specific details of a laboratory by ID."""
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory not found."
        )
        
    # Check authorizations
    if current_user.role == "teacher" and lab.faculty_id != current_user.id:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden."
        )
    elif current_user.role == "student":
        enrolled = db.query(EnrolledLab).filter(
            EnrolledLab.student_id == current_user.id,
            EnrolledLab.lab_id == lab.id
        ).first()
        if not enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enrolled in this laboratory."
            )
            
    return lab
