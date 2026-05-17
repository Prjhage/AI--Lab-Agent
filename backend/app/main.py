import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, labs, experiments, ai, sandbox

# Initialize all database tables on application start for zero-config setups
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Agentic AI Virtual Laboratory API",
    description="Scalable FastAPI backend powering user workspace persistence, RAG operations, and secure sandboxed code runs.",
    version="1.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow connections from any origin (including localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(labs.router)
app.include_router(experiments.router)
app.include_router(ai.router)
app.include_router(sandbox.router)

@app.get("/")
def health_check():
    """Simple status check to verify server state."""
    return {
        "status": "online",
        "service": "Agentic AI Virtual Lab Platform API",
        "database": "connected"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
