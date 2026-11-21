"""
Saraswati AI - Gemini API Client for Personal Study & PDF Summarizer.
Author: Aditya Shahu (https://github.com/adityashahu2005-glitch)
Uses standard library urllib.request to avoid external pip dependencies.
Supports Gemini 2.5 Flash, 2.0 Flash, and 1.5 Flash.
Includes fallback Mock Generator for instant demo testing without API key.
"""

import json
import urllib.request
import urllib.error
import os
import re

DEFAULT_MODEL = "gemini-2.5-flash"
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

def call_gemini_api(prompt, api_key=None, model=DEFAULT_MODEL, response_json=False, system_instruction=None, pdf_base64=None):
    """
    Sends request to Google Gemini REST API using urllib.request.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise ValueError("Missing Gemini API Key. Please provide a valid key or use Demo Mode.")

    url = f"{API_BASE_URL}/{model}:generateContent?key={key}"

    parts = []
    if pdf_base64:
        parts.append({
            "inline_data": {
                "mime_type": "application/pdf",
                "data": pdf_base64
            }
        })
    parts.append({"text": prompt})

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 8192
        }
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    if response_json:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            result_bytes = response.read()
            result_json = json.loads(result_bytes.decode("utf-8"))

            candidates = result_json.get("candidates", [])
            if not candidates:
                raise RuntimeError("No candidates returned by Gemini API")

            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            if not parts:
                raise RuntimeError("Empty response part from Gemini")

            text = parts[0].get("text", "")
            return text
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(error_body)
            msg = parsed.get("error", {}).get("message", error_body)
        except Exception:
            msg = error_body
        raise RuntimeError(f"Gemini API Error ({e.code}): {msg}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network Connection Error: {e.reason}")

def clean_json_response(raw_text):
    """
    Cleans markdown code fences if model returned ```json ... ```
    """
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```[a-zA-Z]*\n", "", raw_text)
        raw_text = re.sub(r"\n```$", "", raw_text)
    return raw_text.strip()

# --- Specialized Prompts ---

def generate_summary_ai(content_text, api_key=None, model=DEFAULT_MODEL, pdf_base64=None):
    if not api_key:
        return get_demo_summary(content_text)

    prompt = f"""
Analyze the following study material and generate a high-yield, structured study summary.

Output format should be clean GitHub-flavored markdown with the following sections:
# 📚 [Subject / Topic Title]

## ⚡ Executive Summary
(2-3 high-impact sentences summarizing the core theme)

## 🎯 Key Takeaways & Core Bullet Points
(Bullet points highlighting the most crucial concepts, principles, and rules)

## 🧠 Core Concepts & Terminology
| Concept / Term | Definition & Importance |
| :--- | :--- |
(At least 4-6 key definitions)

## 📐 Formulas, Equations, or Rules (if applicable)
(Explicit formulas, rules of thumb, or key theorems)

## 💡 Memory Mnemonics & Exam Traps
- **Mnemonic:** (Catchy acronym or memory trick)
- **Common Exam Trap / Pitfall:** (What students commonly get wrong)

## 📋 Active Recall Checklist
- [ ] Recall Question 1?
- [ ] Recall Question 2?
- [ ] Recall Question 3?

Content to analyze:
{content_text[:25000] if content_text else 'Analyze the provided PDF attachment.'}
"""
    return call_gemini_api(prompt, api_key=api_key, model=model, pdf_base64=pdf_base64)

def generate_flashcards_ai(content_text, count=10, api_key=None, model=DEFAULT_MODEL, pdf_base64=None):
    if not api_key:
        return get_demo_flashcards()

    prompt = f"""
Generate {count} high-yield, active-recall flashcards from the given study material.
Each flashcard must test a discrete, testable fact, concept, or relationship.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "front": "Clear, direct question testing active recall",
    "back": "Concise, precise answer (1-2 sentences)",
    "explanation": "Brief context, mnemonic, or rationale to solidify memory",
    "topic": "Subtopic or chapter tag"
  }}
]

Study material:
{content_text[:25000] if content_text else 'Analyze the provided PDF attachment.'}
"""
    raw = call_gemini_api(prompt, api_key=api_key, model=model, response_json=True, pdf_base64=pdf_base64)
    cleaned = clean_json_response(raw)
    return json.loads(cleaned)

def generate_quiz_ai(content_text, count=5, difficulty="Medium", api_key=None, model=DEFAULT_MODEL, pdf_base64=None):
    if not api_key:
        return get_demo_quiz()

    prompt = f"""
Generate an interactive {count}-question practice quiz based on the provided material.
Difficulty: {difficulty}.
Provide multiple choice questions testing critical thinking, concept application, and recall.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "id": 1,
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Why Option A is correct and why other options are incorrect.",
    "difficulty": "{difficulty}",
    "topic": "Topic tag"
  }}
]

Study material:
{content_text[:25000] if content_text else 'Analyze the provided PDF attachment.'}
"""
    raw = call_gemini_api(prompt, api_key=api_key, model=model, response_json=True, pdf_base64=pdf_base64)
    cleaned = clean_json_response(raw)
    return json.loads(cleaned)

def analyze_question_paper_ai(paper_text, api_key=None, model=DEFAULT_MODEL, pdf_base64=None):
    """
    Analyzes past year papers or question banks to classify importance levels (High, Medium, Low).
    """
    if not api_key:
        return get_demo_paper_analysis()

    prompt = f"""
You are an expert academic examiner and curriculum analyst.
Analyze the provided examination questions, past papers, or syllabus text.

Extract every key question/topic and classify it into one of three importance tiers:
- "High": Core concept, recurring pattern, high weightage marks (Must-know, 85-100% importance).
- "Medium": Standard concept, moderate frequency, supporting topics (60-84% importance).
- "Low": Peripheral topic, rarely asked, niche or optional question (below 60% importance).

Return ONLY a valid JSON object matching this exact schema:
{{
  "overall_analysis": {{
    "total_questions_detected": 15,
    "primary_subject": "Identified Subject",
    "key_exam_trend": "Summary of recurring patterns and examiner favorites",
    "high_importance_count": 5,
    "medium_importance_count": 6,
    "low_importance_count": 4
  }},
  "topics_weightage": [
    {{
      "topic": "Topic Name",
      "weightage_percent": 35,
      "importance": "High",
      "recurrence_notes": "Appears in every paper across long-answer sections"
    }}
  ],
  "questions": [
    {{
      "id": 1,
      "question_text": "Full question statement or conceptual prompt",
      "topic": "Topic Name",
      "importance_level": "High",
      "importance_score": 95,
      "frequency_tag": "Frequently Repeated",
      "estimated_marks": "8-10 Marks",
      "reasoning": "Why this question has this importance level",
      "revision_priority": "Priority 1: Master derivations and applications first"
    }}
  ]
}}

Content to analyze:
{paper_text[:25000] if paper_text else 'Analyze the provided PDF attachment.'}
"""
    raw = call_gemini_api(prompt, api_key=api_key, model=model, response_json=True, pdf_base64=pdf_base64)
    cleaned = clean_json_response(raw)
    return json.loads(cleaned)

def generate_question_paper_ai(analysis_data_or_text, config=None, api_key=None, model=DEFAULT_MODEL):
    """
    Generates a realistic mock question paper + marking scheme based on important questions.
    """
    if not api_key:
        return get_demo_generated_paper()

    cfg = config or {}
    total_marks = cfg.get("total_marks", 50)
    duration = cfg.get("duration", "2 Hours")
    subject = cfg.get("subject", "General Academic")
    exam_title = cfg.get("exam_title", "Mock Examination 2026")
    difficulty = cfg.get("difficulty", "Standard")

    prompt = f"""
You are an expert university/board examination paper setter.
Using the following analysis of important questions and syllabus weightage, generate a complete, rigorous, and balanced Question Paper AND its complete Model Marking Scheme.

Configuration:
- Exam Title: {exam_title}
- Subject: {subject}
- Total Marks: {total_marks}
- Time Allowed: {duration}
- Difficulty Level: {difficulty}

Strict Guideline: Give maximum weightage (70%+) to questions/topics flagged as "High" importance, 20% to "Medium", and 10% to "Low".

Return ONLY a valid JSON object matching this schema:
{{
  "exam_info": {{
    "title": "{exam_title}",
    "subject": "{subject}",
    "total_marks": {total_marks},
    "duration": "{duration}",
    "general_instructions": [
      "Read all questions carefully.",
      "All sections are compulsory with internal choice where indicated.",
      "Support answers with neat diagrams/equations wherever applicable."
    ]
  }},
  "sections": [
    {{
      "section_name": "Section A: Short Answer / Concept Recall",
      "instructions": "Answer all questions. Each question carries 2 marks.",
      "total_section_marks": 10,
      "questions": [
        {{
          "q_no": 1,
          "question": "Question text here",
          "marks": 2,
          "importance_level": "High",
          "topic": "Topic Name"
        }}
      ]
    }},
    {{
      "section_name": "Section B: Analytical & Application Questions",
      "instructions": "Answer any 4 questions. Each question carries 5 marks.",
      "total_section_marks": 20,
      "questions": [
        {{
          "q_no": 3,
          "question": "Question text here",
          "marks": 5,
          "importance_level": "High",
          "topic": "Topic Name"
        }}
      ]
    }},
    {{
      "section_name": "Section C: Comprehensive / Problem Solving",
      "instructions": "Answer all questions with detailed step-by-step reasoning. Each carries 10 marks.",
      "total_section_marks": 20,
      "questions": [
        {{
          "q_no": 7,
          "question": "Comprehensive question text here",
          "marks": 10,
          "importance_level": "High",
          "topic": "Topic Name"
        }}
      ]
    }}
  ],
  "marking_scheme": [
    {{
      "q_no": 1,
      "ideal_answer": "Complete model solution summary...",
      "step_marks": [
        "1 mark for core definition",
        "1 mark for formula and unit"
      ]
    }}
  ]
}}

Source Knowledge Base & Analyzed Important Questions:
{str(analysis_data_or_text)[:20000]}
"""
    raw = call_gemini_api(prompt, api_key=api_key, model=model, response_json=True)
    cleaned = clean_json_response(raw)
    return json.loads(cleaned)

# --- Built-in Rich Sample / Demo Data ---

def get_demo_summary(content_text=None):
    return r"""# 📚 Computer Science & Operating Systems: Memory Management & Paging

## ⚡ Executive Summary
Memory management is a core operating system subsystem responsible for coordinating primary memory allocation between competing processes. Paging eliminates external fragmentation through fixed-size hardware frames, while virtual memory decouples the logical address space from physical RAM via page tables and Translation Lookaside Buffers (TLB).

## 🎯 Key Takeaways & Core Bullet Points
- **Paging Architecture:** Logical address is split into Page Number ($p$) and Offset ($d$). Physical RAM is divided into fixed **Frames** matching the page size.
- **Fragmentation Dynamics:** Paging completely eliminates **External Fragmentation**, but may suffer from minor **Internal Fragmentation** on the final allocated page.
- **TLB Acceleration:** The Translation Lookaside Buffer is high-speed associative hardware cache. High hit-rate ($>98\%$) brings effective memory access time (EMAT) close to single memory cycle latency.
- **Page Fault Handling:** An interrupt triggered when accessing a non-present page. The OS retrieves the page from secondary swap space into a free frame and updates the page table.
- **Replacement Algorithms:** Optimal (Belady's), Least Recently Used (LRU), and First-In-First-Out (FIFO, which exhibits Belady's Anomaly).

## 🧠 Core Concepts & Terminology
| Concept / Term | Definition & Importance |
| :--- | :--- |
| **Virtual Memory** | An OS abstraction providing the illusion of a vast contiguous memory space larger than physical RAM. |
| **Page Table** | Data structure mapping virtual page numbers (VPN) to physical frame numbers (PFN) with control bits (Valid, Dirty, Read/Write). |
| **TLB Hit Ratio ($\alpha$)** | Fraction of memory references resolved directly inside the associative hardware cache without memory lookups. |
| **Thrashing** | A pathological state where the CPU spends more time swapping pages in/out than executing user instructions. |
| **Belady's Anomaly** | A counter-intuitive phenomenon in FIFO where increasing physical frames increases page fault rate. |

## 📐 Formulas & Equations
- **Effective Memory Access Time (EMAT):**
  $$EMAT = \alpha \cdot (t_{TLB} + t_{mem}) + (1 - \alpha) \cdot (t_{TLB} + 2 \cdot t_{mem})$$
- **Logical Address Split:**
  $$\text{Total Bits } m = p \text{ (page bits)} + d \text{ (offset bits)}, \quad \text{Page Size} = 2^d \text{ bytes}$$

## 💡 Memory Mnemonics & Exam Traps
- **Mnemonic for Page Fault Steps:** **T-I-S-F-U-R** (*Trap* $\rightarrow$ *Interrupt OS* $\rightarrow$ *Swap disk read* $\rightarrow$ *Frame load* $\rightarrow$ *Update table* $\rightarrow$ *Restart instruction*).
- **Common Exam Trap:** Confusing *Internal* and *External* fragmentation. Paging causes *internal* (inside fixed chunks); Segmentation causes *external* (scattered holes).

## 📋 Active Recall Checklist
- [ ] Can you draw the logical-to-physical address translation diagram with TLB?
- [ ] Can you calculate EMAT given $\alpha = 0.95$, $t_{TLB} = 10\text{ns}$, $t_{mem} = 100\text{ns}$?
- [ ] Why does Belady's Anomaly never occur with LRU or Optimal replacement?
"""

def get_demo_flashcards():
    return [
        {
            "front": "What is the primary difference between Internal and External Fragmentation?",
            "back": "Internal occurs when allocated memory blocks are larger than needed (wasted inside the block). External occurs when total free space exists but is fractured into non-contiguous holes.",
            "explanation": "Paging solves external fragmentation by using fixed frames, but has small internal fragmentation on the last page.",
            "topic": "Memory Management"
        },
        {
            "front": "What formula calculates Effective Memory Access Time (EMAT) with TLB?",
            "back": "EMAT = α * (TLB + Mem) + (1 - α) * (TLB + 2 * Mem)",
            "explanation": "α is the hit ratio. On a miss, you must access TLB, Page Table in Memory, then the actual Target Data.",
            "topic": "Virtual Memory"
        },
        {
            "front": "What is Belady's Anomaly and which algorithm suffers from it?",
            "back": "A phenomenon where allocating MORE physical memory frames causes MORE page faults. It occurs in FIFO page replacement.",
            "explanation": "Stack algorithms like LRU and Optimal are provably immune to Belady's Anomaly.",
            "topic": "Page Replacement"
        },
        {
            "front": "What causes Thrashing in an Operating System?",
            "back": "Thrashing occurs when the sum of process working sets exceeds total physical memory, causing continuous page swapping with near-zero CPU throughput.",
            "explanation": "Solution: Working Set Model or Page Fault Frequency (PFF) throttling.",
            "topic": "Operating Systems"
        },
        {
            "front": "What are the two components of a logical address in paging?",
            "back": "Page Number (p) and Page Offset (d).",
            "explanation": "Page number indexes the page table to get the frame number; offset specifies the exact byte within the frame.",
            "topic": "Paging"
        }
    ]

def get_demo_quiz():
    return [
        {
            "id": 1,
            "question": "Which page replacement algorithm is susceptible to Belady's Anomaly?",
            "options": [
                "Least Recently Used (LRU)",
                "Optimal Page Replacement",
                "First-In-First-Out (FIFO)",
                "Most Recently Used (MRU)"
            ],
            "correct_index": 2,
            "explanation": "FIFO does not satisfy the inclusion property of stack algorithms. Adding more frame capacity can paradoxically increase page faults.",
            "difficulty": "Medium",
            "topic": "Page Replacement"
        },
        {
            "id": 2,
            "question": "A system uses a 32-bit virtual address and 4 KB page size. How many bits are allocated for the page offset?",
            "options": [
                "10 bits",
                "12 bits",
                "20 bits",
                "16 bits"
            ],
            "correct_index": 1,
            "explanation": "4 KB = 4096 bytes = 2^12 bytes. Therefore, exactly 12 bits are needed for the page offset. The remaining 20 bits are for the page number.",
            "difficulty": "Easy",
            "topic": "Paging Architecture"
        },
        {
            "id": 3,
            "question": "In a paging scheme with TLB hit ratio 90%, TLB access time 10 ns, and memory access time 100 ns, what is the Effective Memory Access Time (EMAT)?",
            "options": [
                "110 ns",
                "120 ns",
                "130 ns",
                "100 ns"
            ],
            "correct_index": 1,
            "explanation": "EMAT = 0.90*(10+100) + 0.10*(10+100+100) = 0.90*(110) + 0.10*(210) = 99 + 21 = 120 ns.",
            "difficulty": "Hard",
            "topic": "Memory Calculations"
        },
        {
            "id": 4,
            "question": "What happens when a 'Dirty Bit' (Modify Bit) is set to 1 in a page table entry?",
            "options": [
                "The page has encountered a parity checksum error",
                "The page has been modified and must be written back to disk before replacement",
                "The page is read-only and cannot be executed",
                "The page is currently locked by the kernel"
            ],
            "correct_index": 1,
            "explanation": "The dirty bit tracks writes. If 1, the page in RAM differs from disk and must be flushed back upon eviction; if 0, it can be dropped cleanly without I/O write.",
            "difficulty": "Medium",
            "topic": "Virtual Memory"
        },
        {
            "id": 5,
            "question": "Which fragmentation type is completely avoided by pure Paging?",
            "options": [
                "Internal Fragmentation",
                "External Fragmentation",
                "Segment Fragmentation",
                "Data Cache Fragmentation"
            ],
            "correct_index": 1,
            "explanation": "Because physical memory is allocated in uniform, fixed-size frames, any free frame can satisfy any page request, completely preventing external fragmentation.",
            "difficulty": "Easy",
            "topic": "Memory Management"
        }
    ]

def get_demo_paper_analysis():
    return {
        "overall_analysis": {
            "total_questions_detected": 14,
            "primary_subject": "Operating Systems & System Architecture",
            "key_exam_trend": "Heavy concentration on Memory Management (EMAT calculation, Paging vs Segmentation) and Process Synchronization (Deadlock & Semaphores). These 2 topics constitute over 65% of all recurring high-mark questions.",
            "high_importance_count": 6,
            "medium_importance_count": 5,
            "low_importance_count": 3
        },
        "topics_weightage": [
            {
                "topic": "Virtual Memory & Paging",
                "weightage_percent": 38,
                "importance": "High",
                "recurrence_notes": "Appears in every semester exam without exception. Always includes one 10-mark numerical on EMAT or Page Replacement."
            },
            {
                "topic": "Process Synchronization & Deadlocks",
                "weightage_percent": 30,
                "importance": "High",
                "recurrence_notes": "Banker's Algorithm and Dining Philosophers Semaphore implementations appear in 8 out of the last 10 papers."
            },
            {
                "topic": "CPU Scheduling Algorithms",
                "weightage_percent": 18,
                "importance": "Medium",
                "recurrence_notes": "Gantt chart problems (Round Robin vs SJF). Moderate difficulty, consistent 5-7 marks."
            },
            {
                "topic": "File System & Disk Scheduling",
                "weightage_percent": 14,
                "importance": "Low",
                "recurrence_notes": "SSTF vs SCAN questions are usually optional choices in Section C."
            }
        ],
        "questions": [
            {
                "id": 1,
                "question_text": "Explain Paging hardware with TLB. Derive the expression for Effective Memory Access Time (EMAT) and solve for 95% hit ratio.",
                "topic": "Virtual Memory & Paging",
                "importance_level": "High",
                "importance_score": 98,
                "frequency_tag": "Repeated in 9/10 Past Papers",
                "estimated_marks": "10 Marks",
                "reasoning": "Standard university board favorite. Evaluates both conceptual architecture and numerical problem solving.",
                "revision_priority": "Priority 1: Must practice derivation and numerical formulas"
            },
            {
                "id": 2,
                "question_text": "State the necessary conditions for Deadlock. Explain Banker's Algorithm for deadlock avoidance with safety algorithm.",
                "topic": "Process Synchronization & Deadlocks",
                "importance_level": "High",
                "importance_score": 94,
                "frequency_tag": "Repeated in 8/10 Past Papers",
                "estimated_marks": "10 Marks",
                "reasoning": "Core theoretical anchor. 4 Coffman conditions + matrix safety test guarantee high marks.",
                "revision_priority": "Priority 1: Memorize Coffman conditions and practice matrix allocation tables"
            },
            {
                "id": 3,
                "question_text": "Compare FIFO, LRU, and Optimal page replacement algorithms for a given reference string. Demonstrate Belady's Anomaly.",
                "topic": "Virtual Memory & Paging",
                "importance_level": "High",
                "importance_score": 91,
                "frequency_tag": "Repeated in 7/10 Past Papers",
                "estimated_marks": "8 Marks",
                "reasoning": "Practical algorithmic calculation. Frequently paired with Belady's anomaly definition.",
                "revision_priority": "Priority 1: Practice trace charts for reference strings"
            },
            {
                "id": 4,
                "question_text": "What is Critical Section Problem? Give the implementation of Peterson's Solution and explain how it satisfies Mutual Exclusion and Progress.",
                "topic": "Process Synchronization & Deadlocks",
                "importance_level": "High",
                "importance_score": 88,
                "frequency_tag": "Repeated in 6/10 Past Papers",
                "estimated_marks": "6-8 Marks",
                "reasoning": "Fundamental classical synchronization problem. High probability in Section B.",
                "revision_priority": "Priority 2: Review code logic for flag[] and turn variables"
            },
            {
                "id": 5,
                "question_text": "Calculate Average Waiting Time and Turnaround Time using Round Robin (quantum=2ms) and Preemptive Shortest Job First (SJF).",
                "topic": "CPU Scheduling Algorithms",
                "importance_level": "Medium",
                "importance_score": 78,
                "frequency_tag": "Appears in alternate years",
                "estimated_marks": "6 Marks",
                "reasoning": "Standard numerical exercise. Usually alternating with Priority scheduling.",
                "revision_priority": "Priority 2: Practice drawing clean Gantt charts without calculation errors"
            },
            {
                "id": 6,
                "question_text": "Distinguish between Monolithic Kernel and Microkernel architectures with neat architectural diagrams.",
                "topic": "OS Architectures",
                "importance_level": "Medium",
                "importance_score": 72,
                "frequency_tag": "Occasional 5-mark question",
                "estimated_marks": "5 Marks",
                "reasoning": "Straightforward descriptive question for quick marks in Section B.",
                "revision_priority": "Priority 3: Keep 4 bullet points and diagrams ready"
            },
            {
                "id": 7,
                "question_text": "Explain disk scheduling algorithms: SCAN, C-SCAN, and LOOK with a numerical cylinder track example.",
                "topic": "File System & Disk Scheduling",
                "importance_level": "Low",
                "importance_score": 52,
                "frequency_tag": "Rare / Optional Question",
                "estimated_marks": "5 Marks",
                "reasoning": "Often placed as an 'OR' optional choice against Paging or Deadlock questions.",
                "revision_priority": "Priority 4: Study only if you have completed High and Medium priority topics"
            }
        ]
    }

def get_demo_generated_paper():
    return {
        "exam_info": {
            "title": "Semester Final Examination - High Yield Mock Paper",
            "subject": "Operating Systems & Computer Architecture",
            "total_marks": 50,
            "duration": "2 Hours",
            "general_instructions": [
                "All questions are compulsory with internal choice where provided.",
                "Section A carries 10 marks, Section B carries 20 marks, and Section C carries 20 marks.",
                "Draw neat diagrams and write explicit mathematical formulas wherever required."
            ]
        },
        "sections": [
            {
                "section_name": "Section A: Short Answer & Concept Recall",
                "instructions": "Answer all 5 questions. Each question carries 2 marks.",
                "total_section_marks": 10,
                "questions": [
                    {
                        "q_no": 1,
                        "question": "Define Belady's Anomaly. Which page replacement algorithm exhibits it?",
                        "marks": 2,
                        "importance_level": "High",
                        "topic": "Virtual Memory & Paging"
                    },
                    {
                        "q_no": 2,
                        "question": "List the four Coffman conditions necessary for a system deadlock to occur.",
                        "marks": 2,
                        "importance_level": "High",
                        "topic": "Process Synchronization & Deadlocks"
                    },
                    {
                        "q_no": 3,
                        "question": "Differentiate between Internal Fragmentation and External Fragmentation in memory allocation.",
                        "marks": 2,
                        "importance_level": "High",
                        "topic": "Virtual Memory & Paging"
                    },
                    {
                        "q_no": 4,
                        "question": "What is the role of the 'Dirty Bit' in virtual memory page tables?",
                        "marks": 2,
                        "importance_level": "Medium",
                        "topic": "Virtual Memory & Paging"
                    },
                    {
                        "q_no": 5,
                        "question": "Define Convoy Effect in CPU scheduling. In which algorithm is it prominently observed?",
                        "marks": 2,
                        "importance_level": "Medium",
                        "topic": "CPU Scheduling Algorithms"
                    }
                ]
            },
            {
                "section_name": "Section B: Analytical & Algorithmic Applications",
                "instructions": "Answer any 4 out of 5 questions. Each question carries 5 marks.",
                "total_section_marks": 20,
                "questions": [
                    {
                        "q_no": 6,
                        "question": "Explain the architecture of Paging Hardware with TLB. Write the mathematical formula for Effective Memory Access Time (EMAT).",
                        "marks": 5,
                        "importance_level": "High",
                        "topic": "Virtual Memory & Paging"
                    },
                    {
                        "q_no": 7,
                        "question": "Explain Peterson's Solution for the two-process critical section problem. Prove how it satisfies Mutual Exclusion and Progress.",
                        "marks": 5,
                        "importance_level": "High",
                        "topic": "Process Synchronization & Deadlocks"
                    },
                    {
                        "q_no": 8,
                        "question": "For the reference string: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3 with 3 memory frames, calculate page faults using FIFO and LRU algorithms.",
                        "marks": 5,
                        "importance_level": "High",
                        "topic": "Virtual Memory & Paging"
                    },
                    {
                        "q_no": 9,
                        "question": "Consider 4 processes P1, P2, P3, P4 with arrival times (0, 1, 2, 3) and burst times (8, 4, 9, 5). Draw the Gantt chart and compute average waiting time using Preemptive SJF.",
                        "marks": 5,
                        "importance_level": "Medium",
                        "topic": "CPU Scheduling Algorithms"
                    },
                    {
                        "q_no": 10,
                        "question": "Contrast Monolithic Kernel vs Microkernel designs. Give two modern OS examples for each.",
                        "marks": 5,
                        "importance_level": "Medium",
                        "topic": "OS Architectures"
                    }
                ]
            },
            {
                "section_name": "Section C: Comprehensive Problem Solving",
                "instructions": "Answer both questions. Each carries 10 marks.",
                "total_section_marks": 20,
                "questions": [
                    {
                        "q_no": 11,
                        "question": "Explain Banker's Algorithm for deadlock avoidance in detail. Given Allocation, Max, and Available resource vectors for 5 processes and 3 resource types (A, B, C), describe step-by-step how the Safety Algorithm determines whether the system is in a safe state.",
                        "marks": 10,
                        "importance_level": "High",
                        "topic": "Process Synchronization & Deadlocks"
                    },
                    {
                        "q_no": 12,
                        "question": "A computer system uses 32-bit virtual addresses, 4 KB page size, and 2-level paging. (a) Calculate the number of bits in Page Offset, Outer Page Table, and Inner Page Table. (b) If TLB hit ratio is 98%, TLB access time is 15 ns, and RAM access time is 120 ns, compute the Effective Memory Access Time (EMAT).",
                        "marks": 10,
                        "importance_level": "High",
                        "topic": "Virtual Memory & Paging"
                    }
                ]
            }
        ],
        "marking_scheme": [
            {
                "q_no": 1,
                "ideal_answer": "Belady's Anomaly is the counter-intuitive phenomenon where allocating more page frames results in an increased number of page faults for a given reference string. It is observed in the First-In-First-Out (FIFO) page replacement algorithm.",
                "step_marks": [
                    "1 mark for accurate definition of the phenomenon",
                    "1 mark for correctly identifying the FIFO algorithm"
                ]
            },
            {
                "q_no": 2,
                "ideal_answer": "The four Coffman conditions are: 1. Mutual Exclusion (non-shareable resources), 2. Hold and Wait (process holds resource while requesting another), 3. No Preemption (resources cannot be forcibly taken), 4. Circular Wait (closed loop of processes waiting for each other).",
                "step_marks": [
                    "0.5 marks for each correctly named and briefly explained condition (Total 2 marks)"
                ]
            },
            {
                "q_no": 12,
                "ideal_answer": "(a) Page size = 4 KB = 2^12 bytes, so Offset = 12 bits. Remaining 20 bits are split into Outer (10 bits) and Inner (10 bits) tables. (b) EMAT = 0.98*(15 + 120) + 0.02*(15 + 3*120) = 0.98*(135) + 0.02*(375) = 132.3 + 7.5 = 139.8 ns.",
                "step_marks": [
                    "2 marks for offset bit derivation (12 bits)",
                    "3 marks for 2-level split (10 bits + 10 bits)",
                    "2 marks for stating correct EMAT equation for 2-level paging",
                    "3 marks for accurate numerical computation (139.8 ns)"
                ]
            }
        ]
    }
