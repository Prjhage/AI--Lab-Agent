# E2E Integration Plan — Connecting React Frontend to FastAPI Backend

This plan outlines how we will replace all current mock storage logic inside the React frontend with secure, live REST API calls pointing directly to our Python FastAPI server at `http://localhost:8000`.

---

## 🛠 Key Architectures

### 1. Unified Authentication Context (`AuthContext.jsx`)
*   **API Sign Up**: Connect the user signup screen to `POST /api/auth/signup`.
*   **API Log In**: Connect log in to `POST /api/auth/login`. On success, the response JSON Web Token (JWT) is stored in `localStorage` as `token`.
*   **Session Persistence**: On app startup, check for an existing `token`. If present, fetch the current logged-in user context using `GET /api/auth/me` by appending the authorization header: `Authorization: Bearer <token>`.
*   **Log Out**: Clear user context states and purge tokens from localStorage.

### 2. Multi-Tenant Labs & Enrollments API (`AuthContext.jsx`)
*   **Create Lab**: Faculty members can create new workspaces via `POST /api/labs`.
*   **Join Lab**: Students join specific workspaces using unique invite codes via `POST /api/labs/join`.
*   **Manage Experiments**:
    *   **GET List**: Retrieve list dynamically via `GET /api/labs/{lab_id}/experiments`.
    *   **Add Experiment**: Teachers submit details to `POST /api/labs/{lab_id}/experiments` with PDF guidelines. PDF guidelines automatically parse sequential laboratory steps inside the backend's Groq `RAG-1` parser!

### 3. Dynamic Subprocess Code Sandbox (`ExperimentPage.jsx`)
*   **Run Code**: When a student clicks the **Run Code** button in the Monaco/Jupyter console:
    1.  Post the raw Python editor source code to `POST /api/sandbox/run` with the experiment's test cases list.
    2.  The backend evaluates the code securely inside the subprocess sandbox (or public Judge0 compiler) and returns structural results (PASSED or details of failing constraints).
    3.  If all constraints pass, trigger a call to complete the experiment: `POST /api/labs/{lab_id}/experiments/{exp_id}/complete`.

### 4. Groq-Powered AI Copilot Chat (`useChat.js`)
*   **Chat Agents**: When the user sends a message, alternative code request, or debug step in the Chat panel:
    1.  Send a POST request to `POST /api/ai/chat/{exp_id}`.
    2.  Submit current code, historical conversation messages, and target queries.
    3.  The backend queries Groq's high-speed model `llama3-70b-8192` (`RAG-2` key) with background PDF context matching and streams the markdown answer directly back to the student!

---

## 📂 Proposed Changes

### [NEW] [api.js](file:///c:/Users/hagep/PROJECTS/CB/frontend/src/utils/api.js)
Create an Axios/Fetch API client wrapper setting the target base URL `http://localhost:8000` and automatically attaching JWT authorization headers to all outgoing requests.

### [MODIFY] [AuthContext.jsx](file:///c:/Users/hagep/PROJECTS/CB/frontend/src/context/AuthContext.jsx)
Transition all mock database manipulations to live Axios/Fetch endpoints.

### [MODIFY] [useChat.js](file:///c:/Users/hagep/PROJECTS/CB/frontend/src/hooks/useChat.js)
Update chatbot event actions (`askAgent`, `suggestAlternate`, `suggestTestCases`, `debugStep`) to retrieve answers from the Groq AI server.

### [MODIFY] [ExperimentPage.jsx](file:///c:/Users/hagep/PROJECTS/CB/frontend/src/pages/ExperimentPage.jsx)
Connect Monaco code execution triggers to the `/api/sandbox/run` endpoint.

---

## 🧪 Verification Plan

1.  **Teacher Lab Workspace Workflow**:
    *   Log in as `teacher@virtualab.ai`.
    *   Create a brand new code-based laboratory class and verify it generates a live invite code (e.g. `L6NE5CCV35`).
    *   Upload a PDF syllabus instruction sheet to create a new experiment.
2.  **Student Sandbox & Chat Workflow**:
    *   Log in as `student@virtualab.ai`.
    *   Join the lab using the generated code.
    *   Open the experiment, drag the vertical resizer splitters, write a Python solution, and click **Run Code**.
    *   Verify the code evaluates against the sandbox container and logs completions automatically.
