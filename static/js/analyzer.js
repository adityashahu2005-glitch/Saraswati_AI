/**
 * Question Paper Analyzer Module (Importance Level Classification & Weightage)
 */

let currentAnalysisData = null;
let activeImportanceFilter = "all";

const SAMPLE_PAST_PAPERS = `University Examination Board - Past 5 Years PYQs Compilation
Subject: Operating Systems (CS-401)

[2024 Final]
Q1. Explain Paging hardware architecture with TLB. Derive the expression for Effective Memory Access Time (EMAT) and calculate for 95% hit ratio, TLB=10ns, Memory=100ns. [10 Marks]
Q2. State the four necessary conditions for Deadlock. Explain Banker's Algorithm with a 5-process safety test. [10 Marks]
Q3. Distinguish between Preemptive and Non-Preemptive CPU Scheduling. Draw Gantt charts for Round Robin (q=2) and SJF. [6 Marks]
Q4. Explain Peterson's solution for critical section problem. [5 Marks]

[2023 Final]
Q1. Describe the steps taken by OS when a Page Fault occurs. What is Belady's Anomaly and in which algorithm does it occur? [8 Marks]
Q2. Explain Banker's Algorithm for deadlock avoidance with resource-request algorithm. [10 Marks]
Q3. Compare Monolithic Kernel and Microkernel architectures. [5 Marks]
Q4. Solve page replacement for reference string: 7,0,1,2,0,3,0,4 using FIFO and LRU with 3 frames. [8 Marks]

[2022 Final]
Q1. Calculate Effective Memory Access Time with 2-level paging scheme and 98% TLB hit ratio. [10 Marks]
Q2. What is Deadlock? Prove how Dining Philosophers problem can cause deadlock and provide Semaphore solution. [10 Marks]
Q3. Explain disk scheduling algorithms: SCAN vs LOOK with cylinder sequence. [5 Marks]
Q4. Contrast Internal Fragmentation vs External Fragmentation. [4 Marks]`;

function loadSamplePaperData() {
  document.getElementById("analyzerSubjectInput").value = "Operating Systems (CS-401)";
  document.getElementById("analyzerTextInput").value = SAMPLE_PAST_PAPERS;
}

async function triggerAnalyzeQuestionPaper() {
  const textInput = document.getElementById("analyzerTextInput").value.trim();
  const pdfB64 = AppState.activePdfBase64;
  const subject = document.getElementById("analyzerSubjectInput").value.trim() || "Course Examination";
  const model = document.getElementById("analyzerModelSelect").value;
  const btn = document.getElementById("analyzePaperBtn");

  if (!textInput && !pdfB64) {
    alert("Please enter past questions or upload a question paper PDF first.");
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span><span>Analyzing Exam Patterns...</span>`;
  btn.disabled = true;

  try {
    const res = await fetch("/api/analyze-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paper_text: textInput,
        pdf_base64: pdfB64,
        subject: subject,
        api_key: AppState.apiKey,
        model: model
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");

    currentAnalysisData = data.analysis;
    AppState.currentAnalysis = data.analysis;

    renderAnalysisResults(data.analysis, subject);

    if (data.streak) {
      updateStreakDisplay(data.streak);
    }
    playSuccessChime();

    const container = document.getElementById("analyzerResultsContainer");
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    alert("Paper Analysis Error: " + err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

function renderAnalysisResults(analysis, subject) {
  const overall = analysis.overall_analysis || {};

  document.getElementById("statTotalQuestions").innerText = overall.total_questions_detected || analysis.questions?.length || 0;
  document.getElementById("statSubjectName").innerText = overall.primary_subject || subject;
  document.getElementById("statHighCount").innerText = `${overall.high_importance_count || 0} Questions`;
  document.getElementById("statMedCount").innerText = `${overall.medium_importance_count || 0} Questions`;
  document.getElementById("statLowCount").innerText = `${overall.low_importance_count || 0} Questions`;

  document.getElementById("examTrendText").innerText = overall.key_exam_trend || "Clear recurring emphasis on core architectural problems.";

  // Topic Weightage
  const topicList = document.getElementById("topicWeightageList");
  topicList.innerHTML = "";
  (analysis.topics_weightage || []).forEach(t => {
    const row = document.createElement("div");
    row.className = "space-y-1";
    const color = t.importance === "High" ? "bg-red-500" : (t.importance === "Medium" ? "bg-amber-500" : "bg-emerald-500");
    row.innerHTML = `
      <div class="flex items-center justify-between text-xs font-semibold">
        <span class="text-slate-800 dark:text-slate-200">${t.topic}</span>
        <span class="text-slate-500">${t.weightage_percent}% Weightage (${t.importance})</span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div class="${color} h-2 rounded-full" style="width: ${t.weightage_percent}%"></div>
      </div>
      <p class="text-[11px] text-slate-400 italic">${t.recurrence_notes || ''}</p>
    `;
    topicList.appendChild(row);
  });

  // Update counts on filter tabs
  const questions = analysis.questions || [];
  const highQ = questions.filter(q => q.importance_level === "High");
  const medQ = questions.filter(q => q.importance_level === "Medium");
  const lowQ = questions.filter(q => q.importance_level === "Low");

  document.getElementById("count-all").innerText = questions.length;
  document.getElementById("count-high").innerText = highQ.length;
  document.getElementById("count-medium").innerText = medQ.length;
  document.getElementById("count-low").innerText = lowQ.length;

  filterAnalysisQuestions("all");
}

function filterAnalysisQuestions(level) {
  activeImportanceFilter = level;
  
  // Highlight active filter button
  ["all", "High", "Medium", "Low"].forEach(l => {
    const btn = document.getElementById(`filterBtn-${l}`);
    if (btn) {
      if (l === level) {
        btn.className = "filter-btn active px-3 py-1 rounded-lg font-medium bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm";
      } else {
        btn.className = "filter-btn px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-300";
      }
    }
  });

  const listContainer = document.getElementById("analyzedQuestionsList");
  listContainer.innerHTML = "";

  if (!currentAnalysisData || !currentAnalysisData.questions) return;

  const filtered = activeImportanceFilter === "all" 
    ? currentAnalysisData.questions 
    : currentAnalysisData.questions.filter(q => q.importance_level === activeImportanceFilter);

  filtered.forEach(q => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 space-y-2.5 transition hover:shadow-sm";

    let badgeClass = "badge-high";
    let icon = "🔥";
    if (q.importance_level === "Medium") {
      badgeClass = "badge-medium";
      icon = "⚡";
    } else if (q.importance_level === "Low") {
      badgeClass = "badge-low";
      icon = "💡";
    }

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass} flex items-center space-x-1">
            <span>${icon}</span>
            <span>${q.importance_level} Importance (${q.importance_score}%)</span>
          </span>
          <span class="text-xs text-slate-500 font-medium">Estimated: ${q.estimated_marks || '5-10 Marks'}</span>
        </div>
        <span class="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
          ${q.frequency_tag || 'Standard Topic'}
        </span>
      </div>

      <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
        ${q.question_text}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
        <div>
          <span class="font-bold text-slate-500">Why it matters:</span>
          <span class="text-slate-600 dark:text-slate-300">${q.reasoning || 'Core recurring concept.'}</span>
        </div>
        <div>
          <span class="font-bold text-indigo-600 dark:text-indigo-400">Revision Focus:</span>
          <span class="text-slate-600 dark:text-slate-300">${q.revision_priority || 'Review key formulas.'}</span>
        </div>
      </div>
    `;

    listContainer.appendChild(card);
  });
}

function forwardToPaperGenerator() {
  switchTab("generator");
  if (currentAnalysisData) {
    const subject = currentAnalysisData.overall_analysis?.primary_subject || "Operating Systems";
    document.getElementById("genSubject").value = subject;
    document.getElementById("genExamTitle").value = `${subject} - High-Yield Mock Examination`;
  }
}
