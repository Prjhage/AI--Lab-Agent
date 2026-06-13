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


def normalize_pdf_text(text: str) -> str:
    """
    Pre-processes raw PDF text that may be a single long line (common with
    some PDF exporters). Inserts newlines before every 'Step N', 'Task N',
    'Phase N', 'Section N' token so the rest of the parser sees proper lines.
    Also inserts newlines before numbered-list items like '1. ...' or '1) ...',
    without mangling multi-digit numbers (e.g. '10.' must NOT be split into
    '1' + '0.').
    """
    # Insert newline before Step/Task/Phase/Section N (with optional separator:
    # colon, dot, dash, or "Step-N" with no space before the dash)
    text = re.sub(
        r'(?<!\n)(?=(?:Step|Task|Phase|Section)\s*[-]?\s*\d+\s*[:.\-]?)',
        '\n',
        text,
        flags=re.IGNORECASE
    )
    # Insert newline before numbered list items like "1. " or "12) " at word
    # boundaries. The negative lookbehind for a preceding digit ensures we
    # match the FULL number (e.g. "10.") rather than splitting it into "1"
    # and "0.".
    text = re.sub(
        r'(?<!\n)(?<!\d)(\d{1,2}[.)]\s+[A-Z])',
        r'\n\1',
        text
    )
    # Collapse multiple blank lines into one
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

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
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


import json
import requests
from ..config import settings


def _is_intro_or_header_line(line: str) -> bool:
    """
    Returns True if a line looks like a document title, description header,
    objective/intro paragraph — i.e. NOT an actual step. Used for the
    paragraph-fallback heuristic where there's no numbering signal, so a
    length check is a useful (if imperfect) extra filter there.
    """
    lower = line.lower().strip()

    # Very short lines (likely headings/titles)
    if len(lower) < 15:
        return True

    return _matches_header_keyword(lower)


def _matches_header_keyword(lower: str) -> bool:
    """
    Returns True if a line starts with a document-level header keyword
    (title, objective, description, etc.) regardless of length. Used for
    numbered/"Step N" matches, where the numbering itself is strong evidence
    of step-hood, so short imperative lines like "Start" or "Stop" must NOT
    be filtered out — only genuine header lines should be.
    """
    intro_keywords = [
        r'^(experiment|lab|laboratory|title|course|subject|department|date|name|roll)',
        r'^(objective[s]?|aim[s]?|goal[s]?|purpose|introduction|overview|background|abstract)',
        r'^(description|about|summary|prerequisite[s]?|requirement[s]?|material[s]?|tool[s]?)',
        r'^(note[s]?|warning|important|reference[s]?|appendix|conclusion|result[s]?)',
        r'^(submitted by|submitted to|faculty|instructor|professor|student)',
    ]
    for pattern in intro_keywords:
        if re.match(pattern, lower):
            return True
    return False


def _is_steps_section_header(line: str) -> bool:
    """
    Returns True if the line is just a 'Steps:' / 'Procedure:' / 'Algorithm:'
    section header (i.e. introduces the steps list but is not itself a step).
    """
    lower = line.lower().strip()
    return bool(re.match(r'^(steps?|procedure|algorithm|method|methodology)\s*[:.\-]?\s*$', lower))


def _extract_commands_from_text(text: str, extract_backticks: bool = False):
    commands = []

    # 1. Tilde markers ~command~ (primary teacher format)
    tilde_cmds = re.findall(r'~([^~]+)~', text)
    commands.extend([c.strip() for c in tilde_cmds])

    # 2. Backtick blocks — ONLY for non-code experiments
    if extract_backticks:
        backtick_cmds = re.findall(r'`([^`]+)`', text)
        commands.extend([c.strip() for c in backtick_cmds])

    # 3. Strip markers from description
    clean = re.sub(r'~[^~]+~', '', text)
    if extract_backticks:
        clean = re.sub(r'`[^`]+`', '', clean)
    clean = clean.strip()

    clean = "\n".join(re.sub(r'[ \t]+', ' ', line).strip() for line in clean.split("\n"))
    clean = "\n".join(line for line in clean.split("\n") if line.strip())
    clean = clean.strip()
    if clean.endswith('.'):
        clean = clean[:-1]

    expected = '\n'.join(commands) if commands else None
    return clean, expected

def generate_steps_via_groq(text: str) -> List[Dict[str, Any]]:
    """Calls Groq Llama3 model to extract ONLY the sequential steps from PDF text."""
    if not settings.GROQ_API_KEY_RAG1 or "mock-key" in settings.GROQ_API_KEY_RAG1:
        return []

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY_RAG1}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are the VirtuaLab PDF Step Extraction Parser. "
        "Your ONLY job is to extract the sequential procedural STEPS that a student must perform in the experiment. "
        "\n\nCRITICAL RULES — STRICTLY FOLLOW:"
        "\n1. IGNORE and DO NOT extract: document title, experiment name, lab name, course name, "
        "aim/objective/goal sections, introduction, background, prerequisites, materials list, "
        "conclusion, result, submitted-by fields, or any descriptive/overview text."
        "\n2. ONLY extract lines/sections that are actual numbered or labelled procedural steps "
        "(e.g. 'Step 1: ...', 'Task 2: ...', or a numbered list under a 'Steps:'/'Procedure:' header "
        "such as '1. ...', '2. ...', etc.)."
        "\n3. EACH numbered item is its OWN separate step. Do NOT merge multiple numbered items "
        "into a single step's description. A numbered list of 13 items must produce 13 separate "
        "step objects, each with its own 'step_order'."
        "\n4. Sub-bullets (lines starting with 'o', '-', '*', '•', '▪') belong to the step they "
        "appear under and should be appended to that step's description, NOT treated as new steps."
        "\n5. Commands wrapped in tilde notation ~command~ belong in 'expected_command' only — "
        "NEVER in 'description'."
        "\n6. Output a strictly valid JSON array of objects with exactly these keys: "
        "'title', 'description', 'expected_command', 'step_order'."
        "\n   - 'title': The step heading only (no commands, no intro text)."
        "\n   - 'description': Plain English explanation of WHAT the student must do in this step. No shell syntax."
        "\n   - 'expected_command': ALL commands from ~...~ markers in this step joined with newlines. null if none."
        "\n   - 'step_order': Sequential integer starting at 1."
        "\n7. If the document has no procedural steps, return an empty array []."
        "\nDo NOT output markdown, code fences, or explanations. Pure JSON only."
    )

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Extract only the procedural steps from this PDF text:\n\n{text[:6000]}"}
        ],
        "temperature": 0.1
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()

            # Strip markdown code fences if LLM ignored the rule
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


# --- STEP GENERATOR PARSER ---
def generate_steps_from_text(text: str, is_non_code: bool = False) -> List[Dict[str, Any]]:
    """
    Parses ONLY the procedural steps from a PDF text.
    Tries Groq AI step generation first, then falls back to structural regex parsing.
    Title, description, aim, objectives and intro sections are always excluded.

    Supports three step formats:
      A) "Step 1: <description>" — title + description on the same line.
      B) "Step 1:" alone, with the description on following line(s).
      C) Numbered list items under a "Steps:"/"Procedure:" header, e.g.
         "1. <description>", "2. <description>", ... — each number is its
         own step. Sub-bullets (o, -, *, •, ▪) belong to the preceding step.
    """
    # 0. Normalize flat/single-line PDF text into proper lines
    text = normalize_pdf_text(text)

    # 1. Try Groq AI step generation
    groq_steps = generate_steps_via_groq(text)
    if groq_steps:
        validated_steps = []
        for idx, step in enumerate(groq_steps):
            if isinstance(step, dict) and "title" in step and "description" in step:
                raw_desc = str(step["description"])
                groq_cmd = step.get("expected_command") or None

                clean_desc, extracted_cmd = _extract_commands_from_text(raw_desc, extract_backticks=is_non_code)
                final_cmd = groq_cmd or extracted_cmd

                validated_steps.append({
                    "title": str(step["title"]),
                    "description": clean_desc or raw_desc,
                    "expected_command": final_cmd,
                    "step_order": int(step.get("step_order", idx + 1))
                })
        if validated_steps:
            return validated_steps

    # 2. Regex-based fallback
    steps = []

    # Pattern A: "Step 1: Some inline description" or "Step-1: ..." — title +
    # description on same line. The optional leading dash before the number
    # handles "Step-1" (no space) PDF exports.
    pattern_inline = re.compile(
        r'^(?:Step|Task|Phase|Section)\s*[-]?\s*(\d+)\s*[:.\-]\s*(.+)$',
        re.IGNORECASE
    )
    # Pattern B: "Step 1:" / "Step-1:" / "Step 1" alone — description follows
    # on next lines
    pattern_heading_only = re.compile(
        r'^(?:Step|Task|Phase|Section)\s*[-]?\s*(\d+)\s*[:.\-]?\s*$',
        re.IGNORECASE
    )
    # Pattern C: "1. Description" or "1) Description" — each number is its own step
    pattern_numbered = re.compile(
        r'^(\d{1,2})[.)]\s+(.+)$'
    )
    # Sub-bullet markers used inside a step as continuation lines, split by
    # nesting level so the description can preserve a proper nested-list
    # structure (e.g. "o Calculate by either: / Including, or / Excluding").
    #   Level 1: "o ...", lettered/roman sub-steps "a) ...", "i) ..."
    #   Level 2: deeper bullets "▪ ...", "- ...", "* ...", "• ..."
    pattern_subbullet_l1 = re.compile(r'^(?:o\s+|[a-zA-Z]{1,3}[.)]\s+)')
    pattern_subbullet_l2 = re.compile(r'^[▪\-*•]\s+')

    lines = text.split('\n')
    current_step_num = None
    current_desc = []
    found_first_step = False

    def _flush_step(step_num, desc_lines, out_steps, is_non_code=False):
        """
        Builds the step description, preserving sub-bullet structure.
        `desc_lines` is a list of (text, indent_level) tuples where
        indent_level 0 = main description line, 1 = first-level sub-bullet
        (o, a), i), etc.), 2 = second-level sub-bullet (▪, -, *, etc.).
        Lines are joined with newlines and indentation so nested steps
        (e.g. Step 8's "Calculate the maximum value by either: / Including
        the item, or / Excluding the item.") render as a proper nested list
        instead of being flattened into one inline run.
        """
        formatted_lines = []
        for text_part, indent in desc_lines:
            prefix = "  " * indent
            formatted_lines.append(f"{prefix}{text_part}")
        desc_text = "\n".join(formatted_lines).strip()

        clean_desc, extracted_cmd = _extract_commands_from_text(desc_text, extract_backticks=is_non_code)
        out_steps.append({
            "title": f"Step {step_num}",
            "description": clean_desc or f"Perform actions for Step {step_num}",
            "expected_command": extracted_cmd,
            "step_order": step_num
        })

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue

        # Skip bare "Steps:"/"Procedure:"/"Algorithm:" section headers entirely —
        # they introduce the steps list but are not steps themselves.
        if _is_steps_section_header(line_stripped):
            continue

        # Try Pattern A: inline step+description on one line
        m = pattern_inline.match(line_stripped)
        if m:
            inline_desc = m.group(2).strip()
            # Don't treat intro lines as steps even if numbered. The
            # numbering/"Step N" label is itself strong evidence of step-hood,
            # so only filter on header KEYWORDS, not on description length —
            # short imperative descriptions ("Stop", "Start") are valid.
            if not _matches_header_keyword(inline_desc.lower()):
                if current_step_num is not None:
                    _flush_step(current_step_num, current_desc, steps, is_non_code=is_non_code)
                current_step_num = int(m.group(1))
                current_desc = [(inline_desc, 0)]
                found_first_step = True
                continue

        # Try Pattern B: heading-only line like "Step 1:" with no trailing text
        m = pattern_heading_only.match(line_stripped)
        if m:
            if current_step_num is not None:
                _flush_step(current_step_num, current_desc, steps, is_non_code=is_non_code)
            current_step_num = int(m.group(1))
            current_desc = []
            found_first_step = True
            continue

        # Try Pattern C: numbered list "1. ..." — ALWAYS active (not gated by
        # found_first_step), so every numbered item becomes its own step.
        # Same keyword-only filter as Pattern A: numbering is sufficient
        # evidence of step-hood, so short descriptions aren't excluded.
        m = pattern_numbered.match(line_stripped)
        if m:
            inline_desc = m.group(2).strip()
            num = int(m.group(1))
            if not _matches_header_keyword(inline_desc.lower()):
                if current_step_num is not None:
                    _flush_step(current_step_num, current_desc, steps, is_non_code=is_non_code)
                current_step_num = num
                current_desc = [(inline_desc, 0)]
                found_first_step = True
                continue

        # Sub-bullet lines are continuations of the current step's
        # description, preserved as a nested list (level 1: "o", "a)", "i)";
        # level 2: "▪", "-", "*", "•"), regardless of their length.
        if found_first_step and current_step_num is not None:
            if pattern_subbullet_l2.match(line_stripped):
                current_desc.append((line_stripped, 2))
                continue
            if pattern_subbullet_l1.match(line_stripped):
                current_desc.append((line_stripped, 1))
                continue

        # Accumulate other description lines for the current open step
        if found_first_step and current_step_num is not None:
            if not _is_intro_or_header_line(line_stripped):
                current_desc.append((line_stripped, 0))

    # Flush the last open step
    if current_step_num is not None:
        _flush_step(current_step_num, current_desc, steps, is_non_code=is_non_code)

    if steps:
        return steps

    # 3. Paragraph fallback — ONLY use paragraphs that look like procedural steps
    #    Skip short/header paragraphs and intro-like content aggressively
    paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 40]

    # Heuristic: a "step-like" paragraph contains action verbs or a step keyword
    step_action_pattern = re.compile(
        r'\b(install|run|execute|create|open|write|enter|type|configure|set up|navigate|'
        r'start|stop|check|verify|test|compile|build|connect|download|upload|edit|modify|'
        r'add|remove|delete|copy|move|rename|step|task|command|cd |sudo |apt |pip |npm )\b',
        re.IGNORECASE
    )

    step_paragraphs = []
    for para in paragraphs:
        first_line = para.split('\n')[0].strip()
        # Skip if the paragraph starts with an intro/header keyword
        if _is_intro_or_header_line(first_line):
            continue
        # Only include paragraphs that have at least one action verb
        if step_action_pattern.search(para):
            step_paragraphs.append(para)

    for idx, para in enumerate(step_paragraphs[:8]):
        first_sentence = para.split('.')[0].strip()
        title_text = first_sentence[:60] if len(first_sentence) > 5 else f"Step {idx + 1}"
        clean_desc, extracted_cmd = _extract_commands_from_text(para, extract_backticks=is_non_code)
        steps.append({
            "title": f"Step {idx + 1}: {title_text}",
            "description": clean_desc or para,
            "expected_command": extracted_cmd,
            "step_order": idx + 1
        })

    if steps:
        return steps

    # 4. Absolute minimum fallback
    steps.append({
        "title": "Step 1: Laboratory Core Objective",
        "description": "Complete all experimental objectives described by your teacher.",
        "expected_command": None,
        "step_order": 1
    })
    return steps