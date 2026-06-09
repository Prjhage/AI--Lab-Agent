import re

# Simulate what the PDF might look like
sample_text = (
    "Step 1: Install Git\n"
    "Open your terminal and install Git on your system.\n"
    "~sudo apt install git~\n\n"
    "Step 2: Configure Git\n"
    "Set up your name and email for Git.\n"
    "~git config --global user.name YourName~\n"
    "~git config --global user.email you@example.com~\n\n"
    "Step 3: Clone Repository\n"
    "Clone the project repository.\n"
    "~git clone https://github.com/example/repo.git~\n"
)

from app.utils.rag_engine import generate_steps_from_text
steps = generate_steps_from_text(sample_text)
for s in steps:
    print(f'Title: {s["title"]}')
    print(f'Desc:  {s["description"]}')
    print(f'Cmd:   {s.get("expected_command")}')
    print()
