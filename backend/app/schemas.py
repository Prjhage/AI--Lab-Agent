from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---
class UserSignup(BaseModel):
    username: str = Field(..., min_length=2)
    email: EmailStr
    role: str = Field(..., pattern="^(student|teacher)$")
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None


# --- TEST CASE SCHEMAS ---
class TestCaseCreate(BaseModel):
    input: str
    expected: str

class TestCaseResponse(BaseModel):
    id: str
    input: str
    expected: str

    class Config:
        from_attributes = True


# --- STEP SCHEMAS ---
class StepCreate(BaseModel):
    title: str
    description: str
    expected_command: Optional[str] = None  # Internal only — never returned to frontend
    step_order: int

class StepResponse(BaseModel):
    id: str
    title: str
    description: str
    step_order: int
    # NOTE: expected_command is intentionally NOT here — hidden from students

    class Config:
        from_attributes = True


# --- EXPERIMENT SCHEMAS ---
class ExperimentCreate(BaseModel):
    title: str
    description: str
    points: int = 100
    test_cases: List[TestCaseCreate] = []

class ExperimentResponse(BaseModel):
    id: str
    lab_id: str
    title: str
    description: str
    points: int
    file_path: Optional[str] = None
    created_at: datetime
    steps: List[StepResponse] = []
    test_cases: List[TestCaseResponse] = []

    class Config:
        from_attributes = True


# --- LAB SCHEMAS ---
class LabCreate(BaseModel):
    title: str
    type: str = Field(..., pattern="^(code|non-code)$")
    editor_type: Optional[str] = Field("monaco")

class LabResponse(BaseModel):
    id: str
    title: str
    type: str
    editor_type: Optional[str] = None
    code: str
    faculty_id: str
    created_at: datetime
    experiments: List[ExperimentResponse] = []

    class Config:
        from_attributes = True

class LabJoin(BaseModel):
    code: str


# --- COMPLETED SCHEMAS ---
class CompletionResponse(BaseModel):
    id: str
    student_id: str
    experiment_id: str
    completed_at: datetime

    class Config:
        from_attributes = True


# --- AI CHAT SCHEMAS ---
class ChatMessage(BaseModel):
    sender: str  # "user" | "ai"
    text: str
    timestamp: Optional[str] = ""

class ChatRequest(BaseModel):
    message: Optional[str] = None
    query: Optional[str] = None # Fallback field
    history: List[ChatMessage] = []
    current_code: Optional[str] = None
    current_step: Optional[str] = None
    step_id: Optional[str] = None  # Used to fetch expected_command server-side for verification

class ChatResponse(BaseModel):
    text: str
    response: Optional[str] = None # Fallback field
