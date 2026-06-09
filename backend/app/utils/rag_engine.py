import re
import math
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    """Reads PDF and extracts all text content."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""

def split_text_into_chunks(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """Splits raw text into sliding chunks for embedding retrieval."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

# --- PURE PYTHON TF-IDF COSINE SIMILARITY RETRIEVER ---
# Avoids binary dependencies (like FAISS / Chroma compilation issues on Windows)
def get_term_frequencies(text: str) -> Dict[str, int]:
    words = re.findall(r'\w+', text.lower())
    tf = {}
    for w in words:
        tf[w] = tf.get(w, 0) + 1
    return tf

def cosine_similarity(tf1: Dict[str, int], tf2: Dict[str, int]) -> float:
    intersection = set(tf1.keys()) & set(tf2.keys())
    if not intersection:
        return 0.0
    
    numerator = sum([tf1[x] * tf2[x] for x in intersection])
    
    sum1 = sum([tf1[x]**2 for x in tf1.keys()])
    sum2 = sum([tf2[x]**2 for x in tf2.keys()])
    
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    
    return float(numerator) / denominator

def retrieve_top_chunks(query: str, chunks: List[str], top_k: int = 3) -> List[Tuple[str, float]]:
    """Finds the top-K chunks matching the query using cosine term similarity."""
    query_tf = get_term_frequencies(query)
    scores = []
    for chunk in chunks:
        chunk_tf = get_term_frequencies(chunk)
        sim = cosine_similarity(query_tf, chunk_tf)
        scores.append((chunk, sim))
    
    # Sort descending
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


import json
import requests
from ..config import settings

def generate_steps_via_groq(text: str) -> List[Dict[str, Any]]:
    """Calls Groq Llama3 model using RAG-1 key to extract chronological sequential steps from PDF text."""
    if "mock-key" in settings.GROQ_API_KEY_RAG1 or not settings.GROQ_API_KEY_RAG1:
        return []
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY_RAG1}",
        "Content-Type": "application/json"
    }
    
    system_prompt = (
        "You are the VirtuaLab PDF Step Extraction Parser. Your objective is to extract sequential experimental steps from raw guidelines PDF text. "
        "In the source PDF, commands are wrapped in tilde notation like ~command~. "
        "Output strictly valid JSON arrays of objects with exactly these keys: 'title', 'description', 'expected_command', 'step_order'. "
        "RULES: "
        "'title': The step heading only (no commands). "
        "'description': Plain English explanation of WHAT the student must do. NEVER include any commands, shell syntax, or tilde-wrapped content here. "
        "'expected_command': ALL commands from ~...~ markers in this step joined with newlines. If none, use null. "
        "'step_order': Sequential integer. "
        "Do not include markdown code block formatting or explanations. Output pure JSON only."
    )
    
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the raw extracted guidelines PDF text:\n\n{text[:6000]}"}
        ],
        "temperature": 0.1
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            
            # Clean up potential markdown wrapper codeblocks if the LLM ignored guidelines
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\s*|\s*```$', '', content, flags=re.MULTILINE)
                
            data = json.loads(content)
            if isinstance(data, dict):
                for key in ["steps", "tasks", "list"]:
                    if key in data and isinstance(data[key], list):
                        return data[key]
                if len(data) == 1 and isinstance(list(data.values())[0], list):
                    return list(data.values())[0]
                if "title" in data:
                    return [data]
            elif isinstance(data, list):
                return data
    except Exception as e:
        print(f"Groq step extraction failed: {e}")
        
    return []


def _extract_commands_from_text(text: str):
    """
    Extracts expected commands from a raw text block.
    Looks for ~command~ markers (primary format) and inline `command` backtick blocks.
    Returns (cleaned_description, expected_command_or_None)
    """
    commands = []

    # 1. Extract ~command~ markers (primary format agreed with teachers)
    tilde_cmds = re.findall(r'~([^~]+)~', text)
    commands.extend(tilde_cmds)

    # 2. Extract inline backtick code blocks as fallback (e.g., `sudo apt install git`)
    backtick_cmds = re.findall(r'`([^`\n]+)`', text)
    commands.extend(backtick_cmds)

    # 3. Strip all ~...~ and `...` from the description so students don't see them
    clean = re.sub(r'~[^~]+~', '', text)
    clean = re.sub(r'`[^`\n]+`', '', clean)
    clean = clean.strip().rstrip('.')
    # Remove trailing punctuation artifacts
    clean = re.sub(r'\s+', ' ', clean).strip()

    expected = '\n'.join(commands) if commands else None
    return clean, expected


# --- STEP GENERATOR PARSER ---
# Parses a PDF's content into structural sequential lab steps
def generate_steps_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Parses structural steps from a PDF text.
    Tries Groq RAG-1 AI parsing first, then falls back to structural regex parsing.
    """
    # 1. Try Groq AI Step generation
    groq_steps = generate_steps_via_groq(text)
    if groq_steps:
        validated_steps = []
        for idx, step in enumerate(groq_steps):
            if isinstance(step, dict) and "title" in step and "description" in step:
                raw_desc = str(step["description"])
                groq_cmd = step.get("expected_command") or None

                # Always post-process: strip any leaked commands from description
                clean_desc, extracted_cmd = _extract_commands_from_text(raw_desc)

                # Prefer Groq's explicit expected_command; fall back to what we extracted
                final_cmd = groq_cmd or extracted_cmd

                validated_steps.append({
                    "title": str(step["title"]),
                    "description": clean_desc or raw_desc,
                    "expected_command": final_cmd,
                    "step_order": int(step.get("step_order", idx + 1))
                })
        if validated_steps:
            return validated_steps

    steps = []
    
    # Try finding lines like: "Step 1: Set up the environment" or "Task 2 - Coding" or "## ..."
    step_patterns = [
        r'(?:Step|Task|Phase|Section)\s*(\d+)[:.-]?\s*(.+)',
        r'(\d+)\.\s*(.+)'
    ]
    
    lines = text.split('\n')
    current_title = ""
    current_desc = []
    step_order = 1
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        matched = False
        for pattern in step_patterns:
            match = re.match(pattern, line_stripped, re.IGNORECASE)
            if match:
                # Save previous step if we had one
                if current_title:
                    desc_text = "\n".join(current_desc).strip()
                    clean_desc, extracted_cmd = _extract_commands_from_text(desc_text)
                    steps.append({
                        "title": current_title,
                        "description": clean_desc or f"Perform actions specified in {current_title}",
                        "expected_command": extracted_cmd,
                        "step_order": step_order
                    })
                    step_order += 1
                
                current_title = f"Step {match.group(1)}: {match.group(2).strip()}"
                current_desc = []
                matched = True
                break
                
        if not matched:
            if current_title:
                current_desc.append(line_stripped)
            elif len(line_stripped) > 20 and not steps:
                # Start a general step 1 if text starts without a heading
                current_title = "Step 1: Initial Instructions"
                current_desc.append(line_stripped)

    # Append the last step
    if current_title:
        desc_text = "\n".join(current_desc).strip()
        clean_desc, extracted_cmd = _extract_commands_from_text(desc_text)
        steps.append({
            "title": current_title,
            "description": clean_desc or f"Perform actions specified in {current_title}",
            "expected_command": extracted_cmd,
            "step_order": step_order
        })

    # Total fallback: if absolutely no steps detected, segment by paragraphs
    if not steps:
        paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 30]
        for idx, para in enumerate(paragraphs[:8]): # limit to top 8 paragraphs
            first_sentence = para.split('.')[0] + '.'
            steps.append({
                "title": f"Step {idx + 1}: {first_sentence[:60]}...",
                "description": para,
                "step_order": idx + 1
            })
            
    # Absolute minimum fallback
    if not steps:
        steps.append({
            "title": "Step 1: Laboratory Core Objective",
            "description": text[:800] or "Complete all experimental objectives described by your teacher.",
            "step_order": 1
        })
        
    return steps
