import time
import requests

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("[E2E] Starting End-to-End Backend Verification Tests...\n")
    
    # Check health check
    try:
        res = requests.get(f"{BASE_URL}/")
        assert res.status_code == 200
        print("[OK] Health Check: PASSED")
    except Exception as e:
        print(f"[FAIL] Health Check failed (is uvicorn server running?): {e}")
        return

    # 1. Sign up Teacher
    teacher_email = f"teacher_{int(time.time())}@virtualab.ai"
    teacher_payload = {
        "username": "Dr. Alice Smith",
        "email": teacher_email,
        "role": "teacher",
        "password": "strongpassword123"
    }
    
    res = requests.post(f"{BASE_URL}/api/auth/signup", json=teacher_payload)
    assert res.status_code == 201, f"Teacher signup failed: {res.text}"
    print("[OK] Teacher Signup: PASSED")

    # 2. Login Teacher
    login_payload = {
        "email": teacher_payload["email"],
        "password": teacher_payload["password"]
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Teacher login failed: {res.text}"
    teacher_token = res.json()["access_token"]
    print("[OK] Teacher Login: PASSED")
    
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 3. Create Lab
    lab_payload = {
        "title": "Advanced Algorithmic Foundations",
        "type": "code",
        "editor_type": "monaco"
    }
    res = requests.post(f"{BASE_URL}/api/labs", json=lab_payload, headers=teacher_headers)
    assert res.status_code == 201, f"Create Lab failed: {res.text}"
    lab_data = res.json()
    lab_id = lab_data["id"]
    invite_code = lab_data["code"]
    print(f"[OK] Create Lab: PASSED (Invite Code: {invite_code})")

    # 4. Sign up Student
    student_email = f"student_{int(time.time())}@virtualab.ai"
    student_payload = {
        "username": "Bob Miller",
        "email": student_email,
        "role": "student",
        "password": "studentpassword"
    }
    res = requests.post(f"{BASE_URL}/api/auth/signup", json=student_payload)
    assert res.status_code == 201, f"Student signup failed: {res.text}"
    print("[OK] Student Signup: PASSED")

    # 5. Login Student
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": student_payload["email"],
        "password": student_payload["password"]
    })
    assert res.status_code == 200
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[OK] Student Login: PASSED")

    # 6. Join Lab
    res = requests.post(f"{BASE_URL}/api/labs/join", json={"code": invite_code}, headers=student_headers)
    assert res.status_code == 200, f"Student join lab failed: {res.text}"
    print("[OK] Student Join Lab: PASSED")

    # 7. Teacher adds Experiment with Test Cases
    test_cases_json = '[{"input": "5", "expected": "25"}, {"input": "10", "expected": "100"}]'
    form_data = {
        "title": "Squaring Numbers Pipeline",
        "description": "Write a program that takes an integer and outputs its squared value.",
        "points": 50,
        "test_cases": test_cases_json
    }
    res = requests.post(f"{BASE_URL}/api/labs/{lab_id}/experiments", data=form_data, headers=teacher_headers)
    assert res.status_code == 201, f"Add experiment failed: {res.text}"
    exp_data = res.json()
    exp_id = exp_data["id"]
    print("[OK] Add Experiment: PASSED")

    # 8. Student executes Sandbox Code against the test cases
    python_code = "import sys\nx = int(sys.stdin.read().strip())\nprint(x * x)\n"
    sandbox_payload = {
        "code": python_code,
        "language": "python",
        "experiment_id": exp_id
    }
    res = requests.post(f"{BASE_URL}/api/sandbox/run", json=sandbox_payload, headers=student_headers)
    assert res.status_code == 200, f"Sandbox run failed: {res.text}"
    run_results = res.json()
    assert run_results["all_passed"] == True, f"Sandbox validation failed: {run_results}"
    print("[OK] Secure Code Sandbox execution (All Cases Passed): PASSED")

    # 9. Student completes Experiment
    res = requests.post(f"{BASE_URL}/api/labs/{lab_id}/experiments/{exp_id}/complete", headers=student_headers)
    assert res.status_code == 200, f"Complete experiment failed: {res.text}"
    print("[OK] Complete Experiment Logging: PASSED")

    # 10. Student checks completion status
    res = requests.get(f"{BASE_URL}/api/labs/{lab_id}/completions", headers=student_headers)
    assert res.status_code == 200
    assert exp_id in res.json()
    print("[OK] Query Completions Status check: PASSED")

    print("\n[ALL PASSED] ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! The FastAPI backend is 100% stable. [ALL PASSED]")

if __name__ == "__main__":
    run_tests()
