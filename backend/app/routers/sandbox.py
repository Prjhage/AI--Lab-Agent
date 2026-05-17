from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import Experiment
from ..schemas import TestCaseResponse
from ..deps import get_current_user
from ..utils.sandbox_engine import run_sandbox

router = APIRouter(prefix="/api/sandbox", tags=["Code Sandbox Execution"])

class SandboxRequest(BaseModel):
    code: str
    language: str = "python"
    stdin: Optional[str] = ""
    experiment_id: Optional[str] = None

class TestCaseResult(BaseModel):
    input: str
    expected: str
    actual: str
    passed: bool
    status: str
    stderr: str

class SandboxResponse(BaseModel):
    stdout: str
    stderr: str
    status: str
    time: str
    memory: str
    all_passed: bool = False
    test_case_results: List[TestCaseResult] = []


@router.post("/run", response_model=SandboxResponse)
def run_code_in_sandbox(
    payload: SandboxRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Executes student code securely in a compilation sandbox and validates it against test cases."""
    if not payload.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source code parameter cannot be empty."
        )

    # If experiment_id is provided, evaluate code against all registered test cases!
    if payload.experiment_id:
        exp = db.query(Experiment).filter(Experiment.id == payload.experiment_id).first()
        if not exp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experiment not found."
            )
            
        test_cases = exp.test_cases
        if not test_cases:
            # Fallback if no test cases configured: run once with empty input
            res = run_sandbox(payload.code, payload.language, "")
            return SandboxResponse(
                stdout=res["stdout"],
                stderr=res["stderr"],
                status=res["status"],
                time=res["time"],
                memory=res["memory"],
                all_passed=res["status"] == "Accepted"
            )

        tc_results = []
        all_passed = True
        
        # Execute each test case sequentially
        for tc in test_cases:
            res = run_sandbox(payload.code, payload.language, tc.input)
            
            # Clean up outputs for robust matching (ignore tailing spaces/newlines)
            actual_clean = res["stdout"].strip()
            expected_clean = tc.expected.strip()
            
            passed = (actual_clean == expected_clean) and (res["status"] == "Accepted")
            if not passed:
                all_passed = False
                
            tc_results.append(TestCaseResult(
                input=tc.input,
                expected=tc.expected,
                actual=res["stdout"],
                passed=passed,
                status=res["status"],
                stderr=res["stderr"]
            ))
            
        # Summarize primary result based on first failing test case, or show all accepted
        first_failure = next((r for r in tc_results if not r.passed), None)
        primary_status = "Accepted" if all_passed else (first_failure.status if first_failure else "Wrong Answer")
        
        total_stdout = "\n".join([f"Case Input: '{r.input}' -> Output: '{r.actual.strip()}' [ {'PASS' if r.passed else 'FAIL'} ]" for r in tc_results])
        total_stderr = "\n".join([r.stderr for r in tc_results if r.stderr])
        
        return SandboxResponse(
            stdout=total_stdout,
            stderr=total_stderr,
            status=primary_status,
            time="0.008",
            memory="6.8",
            all_passed=all_passed,
            test_case_results=tc_results
        )

    # Basic single execution run (no experiment validation)
    res = run_sandbox(payload.code, payload.language, payload.stdin)
    return SandboxResponse(
        stdout=res["stdout"],
        stderr=res["stderr"],
        status=res["status"],
        time=res["time"],
        memory=res["memory"],
        all_passed=res["status"] == "Accepted"
    )
