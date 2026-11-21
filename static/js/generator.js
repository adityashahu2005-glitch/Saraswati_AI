/**
 * Question Paper Generator Module
 */

let activePaperData = null;
let activePaperView = "questions"; // 'questions' or 'answers'

const SAMPLE_GENERATED_PAPER = {
  exam_info: {
    title: "Semester Final Examination - High Yield Mock Paper",
    subject: "Operating Systems & Computer Architecture",
    total_marks: 50,
    duration: "2 Hours",
    general_instructions: [
      "All questions are compulsory with internal choice where indicated.",
      "Section A carries 10 marks, Section B carries 20 marks, and Section C carries 20 marks.",
      "Support answers with neat diagrams and mathematical formulas wherever applicable."
    ]
  },
  sections: [
    {
      section_name: "Section A: Short Answer & Concept Recall",
      instructions: "Answer all 5 questions. Each question carries 2 marks.",
      total_section_marks: 10,
      questions: [
        {
          q_no: 1,
          question: "Define Belady's Anomaly. In which page replacement algorithm is it observed?",
          marks: 2,
          importance_level: "High",
          topic: "Virtual Memory & Paging"
        },
        {
          q_no: 2,
          question: "List the four Coffman conditions necessary for a deadlock to occur.",
          marks: 2,
          importance_level: "High",
          topic: "Process Synchronization & Deadlocks"
        },
        {
          q_no: 3,
          question: "Differentiate between Internal Fragmentation and External Fragmentation.",
          marks: 2,
          importance_level: "High",
          topic: "Virtual Memory & Paging"
        },
        {
          q_no: 4,
          question: "What is the function of the 'Dirty Bit' (Modify Bit) in a page table entry?",
          marks: 2,
          importance_level: "Medium",
          topic: "Virtual Memory & Paging"
        },
        {
          q_no: 5,
          question: "Explain the Convoy Effect in CPU scheduling. In which algorithm does it occur?",
          marks: 2,
          importance_level: "Medium",
          topic: "CPU Scheduling Algorithms"
        }
      ]
    },
    {
      section_name: "Section B: Analytical & Algorithmic Applications",
      instructions: "Answer any 4 out of 5 questions. Each question carries 5 marks.",
      total_section_marks: 20,
      questions: [
        {
          q_no: 6,
          question: "Explain Paging hardware architecture with TLB. Write down the mathematical formula for Effective Memory Access Time (EMAT).",
          marks: 5,
          importance_level: "High",
          topic: "Virtual Memory & Paging"
        },
        {
          q_no: 7,
          question: "Explain Peterson's Solution for the two-process critical section problem and prove how it satisfies Mutual Exclusion and Progress.",
          marks: 5,
          importance_level: "High",
          topic: "Process Synchronization & Deadlocks"
        },
        {
          q_no: 8,
          question: "For the reference string: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3 with 3 frames, calculate page faults using FIFO and LRU algorithms.",
          marks: 5,
          importance_level: "High",
          topic: "Virtual Memory & Paging"
        },
        {
          q_no: 9,
          question: "Processes P1, P2, P3 have arrival times (0, 1, 2) and bursts (8, 4, 9). Draw the Gantt chart and compute average waiting time using Preemptive SJF.",
          marks: 5,
          importance_level: "Medium",
          topic: "CPU Scheduling Algorithms"
        },
        {
          q_no: 10,
          question: "Contrast Monolithic Kernel vs Microkernel architectures with diagrams and modern OS examples.",
          marks: 5,
          importance_level: "Medium",
          topic: "OS Architectures"
        }
      ]
    },
    {
      section_name: "Section C: Comprehensive Problem Solving",
      instructions: "Answer both questions. Each carries 10 marks.",
      total_section_marks: 20,
      questions: [
        {
          q_no: 11,
          question: "Explain Banker's Algorithm for deadlock avoidance. Given Allocation, Max, and Available matrices for 5 processes and 3 resources (A, B, C), describe the step-by-step procedure of the Safety Algorithm.",
          marks: 10,
          importance_level: "High",
          topic: "Process Synchronization & Deadlocks"
        },
        {
          q_no: 12,
          question: "A system uses 32-bit virtual addresses, 4 KB page size, and two-level paging. (a) Derive the bit split for Outer Page, Inner Page, and Offset. (b) If TLB hit ratio is 98%, TLB access is 15ns, and RAM access is 120ns, compute the Effective Memory Access Time (EMAT).",
          marks: 10,
          importance_level: "High",
          topic: "Virtual Memory & Paging"
        }
      ]
    }
  ],
  marking_scheme: [
    {
      q_no: 1,
      ideal_answer: "Belady's Anomaly is the phenomenon where adding more frames causes more page faults. Observed in First-In-First-Out (FIFO).",
      step_marks: ["1 mark for definition", "1 mark for naming FIFO"]
    },
    {
      q_no: 2,
      ideal_answer: "Four conditions: 1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait.",
      step_marks: ["0.5 marks for each valid condition with explanation (Total 2 marks)"]
    },
    {
      q_no: 6,
      ideal_answer: "EMAT = α*(t_TLB + t_mem) + (1-α)*(t_TLB + 2*t_mem). Neat diagram showing CPU logical address, TLB cache lookup, Page Table base in RAM, and final physical frame concatenation.",
      step_marks: ["2 marks for correct TLB architecture diagram", "1.5 marks for EMAT derivation", "1.5 marks for parameter definitions"]
    },
    {
      q_no: 12,
      ideal_answer: "(a) Page size = 4 KB = 2^12 bytes -> Offset = 12 bits. Remaining 20 bits split into 10 bits outer, 10 bits inner. (b) EMAT = 0.98*(15 + 120) + 0.02*(15 + 3*120) = 0.98*(135) + 0.02*(375) = 132.3 + 7.5 = 139.8 ns.",
      step_marks: [
        "2 marks for offset derivation (12 bits)",
        "3 marks for outer/inner table split (10 bits each)",
        "2 marks for two-level EMAT formula",
        "3 marks for accurate calculation (139.8 ns)"
      ]
    }
  ]
};

function loadSampleGeneratedPaper() {
  activePaperData = SAMPLE_GENERATED_PAPER;
  renderGeneratedPaper(SAMPLE_GENERATED_PAPER);
  const container = document.getElementById("generatedPaperContainer");
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth" });
}

async function triggerGeneratePaper() {
  const btn = document.getElementById("generatePaperBtn");
  const examTitle = document.getElementById("genExamTitle").value.trim() || "Mock Examination 2026";
  const subject = document.getElementById("genSubject").value.trim() || "Academic Course";
  const totalMarks = parseInt(document.getElementById("genTotalMarks").value);
  const duration = document.getElementById("genDuration").value;

  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span><span>Setting Exam Paper...</span>`;
  btn.disabled = true;

  try {
    const res = await fetch("/api/generate-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis_data: AppState.currentAnalysis || SAMPLE_PAST_PAPERS,
        config: {
          exam_title: examTitle,
          subject: subject,
          total_marks: totalMarks,
          duration: duration,
          difficulty: "Standard"
        },
        api_key: AppState.apiKey
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Paper generation failed");

    activePaperData = data.paper;
    AppState.currentGeneratedPaper = data.paper;

    renderGeneratedPaper(data.paper);

    if (data.streak) {
      updateStreakDisplay(data.streak);
    }
    playSuccessChime();

    const container = document.getElementById("generatedPaperContainer");
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    alert("Paper Generation Error: " + err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

function renderGeneratedPaper(paper) {
  const info = paper.exam_info || {};
  document.getElementById("paperDisplayTitle").innerText = info.title || "Academic Examination Paper";
  document.getElementById("paperDisplaySubject").innerText = `Subject: ${info.subject || 'General'}`;
  document.getElementById("paperDisplayDuration").innerText = `Time Allowed: ${info.duration || '2 Hours'}`;
  document.getElementById("paperDisplayMarks").innerText = `Maximum Marks: ${info.total_marks || 50}`;

  // Instructions
  const instList = document.getElementById("paperInstructionsList");
  instList.innerHTML = "";
  (info.general_instructions || []).forEach(inst => {
    const li = document.createElement("li");
    li.innerText = inst;
    instList.appendChild(li);
  });

  // Sections
  const sectionsContainer = document.getElementById("paperSectionsContainer");
  sectionsContainer.innerHTML = "";

  (paper.sections || []).forEach(sec => {
    const secEl = document.createElement("div");
    secEl.className = "space-y-4 pt-3 border-t border-slate-200 dark:border-slate-700";

    secEl.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
        <h4 class="font-bold text-base text-slate-900 dark:text-white">${sec.section_name}</h4>
        <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">[Total: ${sec.total_section_marks || ''} Marks]</span>
      </div>
      <p class="text-xs italic text-slate-500">${sec.instructions || ''}</p>
      <div class="space-y-3.5" id="sec-q-list-${sec.section_name.replace(/\s+/g, '-')}"></div>
    `;

    sectionsContainer.appendChild(secEl);

    const qList = secEl.querySelector(`[id^="sec-q-list-"]`);
    (sec.questions || []).forEach(q => {
      const qRow = document.createElement("div");
      qRow.className = "flex items-start justify-between space-x-4 text-xs sm:text-sm";

      const badge = q.importance_level === "High" 
        ? `<span class="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold px-1.5 py-0.5 rounded ml-2">High Importance</span>`
        : "";

      qRow.innerHTML = `
        <div class="flex-1 leading-relaxed">
          <span class="font-bold text-slate-800 dark:text-slate-100 mr-2">Q${q.q_no}.</span>
          <span class="text-slate-700 dark:text-slate-200">${q.question}</span>
          ${badge}
        </div>
        <div class="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
          [${q.marks} Marks]
        </div>
      `;
      qList.appendChild(qRow);
    });
  });

  // Marking Scheme
  const msContainer = document.getElementById("markingSchemeContainer");
  msContainer.innerHTML = "";

  (paper.marking_scheme || []).forEach(ms => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2";
    
    let stepHtml = "";
    (ms.step_marks || []).forEach(s => {
      stepHtml += `<li class="text-xs text-slate-600 dark:text-slate-400">${s}</li>`;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <span>Question ${ms.q_no} - Model Solution</span>
      </div>
      <p class="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
        ${ms.ideal_answer}
      </p>
      <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
        <p class="text-[11px] font-bold uppercase text-slate-500">Marks Rubric:</p>
        <ul class="list-disc list-inside mt-1 space-y-0.5">
          ${stepHtml}
        </ul>
      </div>
    `;
    msContainer.appendChild(card);
  });
}

function togglePaperView(view) {
  activePaperView = view;
  const qBtn = document.getElementById("btnPaperView-questions");
  const aBtn = document.getElementById("btnPaperView-answers");
  const qView = document.getElementById("viewQuestionPaper");
  const aView = document.getElementById("viewMarkingScheme");

  if (view === "questions") {
    qView.classList.remove("hidden");
    aView.classList.add("hidden");
    qBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400";
    aBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
  } else {
    qView.classList.add("hidden");
    aView.classList.remove("hidden");
    aBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400";
    qBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
  }
}
