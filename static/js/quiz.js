/**
 * Interactive Practice Quiz Module
 */

let quizQuestionsList = [];
let currentQuizIndex = 0;
let currentQuizScore = 0;
let hasAnsweredCurrent = false;
let activeQuizId = null;

const SAMPLE_QUIZ_DATA = [
  {
    id: 1,
    question: "Which page replacement algorithm is susceptible to Belady's Anomaly?",
    options: [
      "Least Recently Used (LRU)",
      "Optimal Page Replacement",
      "First-In-First-Out (FIFO)",
      "Most Recently Used (MRU)"
    ],
    correct_index: 2,
    explanation: "FIFO does not satisfy the inclusion property of stack algorithms. Paradoxically, adding more frame capacity can increase page faults.",
    difficulty: "Medium",
    topic: "Page Replacement"
  },
  {
    id: 2,
    question: "A system uses 32-bit virtual addresses and a 4 KB page size. How many bits are allocated for the page offset?",
    options: [
      "10 bits",
      "12 bits",
      "20 bits",
      "16 bits"
    ],
    correct_index: 1,
    explanation: "4 KB = 4096 bytes = 2^12 bytes. Therefore, exactly 12 bits are allocated for the offset, and the remaining 20 bits index the page table.",
    difficulty: "Easy",
    topic: "Paging Architecture"
  },
  {
    id: 3,
    question: "In paging with TLB hit ratio 90%, TLB access time 10 ns, and memory access time 100 ns, what is the Effective Memory Access Time (EMAT)?",
    options: [
      "110 ns",
      "120 ns",
      "130 ns",
      "100 ns"
    ],
    correct_index: 1,
    explanation: "EMAT = 0.90*(10+100) + 0.10*(10+100+100) = 0.90*(110) + 0.10*(210) = 99 + 21 = 120 ns.",
    difficulty: "Hard",
    topic: "Memory Calculations"
  },
  {
    id: 4,
    question: "What happens when a 'Dirty Bit' (Modify Bit) is set to 1 in a page table entry?",
    options: [
      "The page has encountered a parity checksum error",
      "The page has been modified in RAM and must be written back to disk before replacement",
      "The page is read-only and cannot be executed",
      "The page is locked by the kernel scheduler"
    ],
    correct_index: 1,
    explanation: "The dirty bit tracks writes. If set to 1, the page differs from the disk copy and must be written out during eviction; if 0, it can be overwritten without disk I/O.",
    difficulty: "Medium",
    topic: "Virtual Memory"
  },
  {
    id: 5,
    question: "Which fragmentation type is completely avoided by pure Paging?",
    options: [
      "Internal Fragmentation",
      "External Fragmentation",
      "Segment Fragmentation",
      "Stack Frame Fragmentation"
    ],
    correct_index: 1,
    explanation: "Because physical memory is allocated in uniform, fixed-size frames, any free frame can satisfy any page request, completely preventing external fragmentation.",
    difficulty: "Easy",
    topic: "Memory Management"
  }
];

function loadSampleQuiz() {
  quizQuestionsList = [...SAMPLE_QUIZ_DATA];
  currentQuizIndex = 0;
  currentQuizScore = 0;
  hasAnsweredCurrent = false;
  activeQuizId = "sample_quiz";

  document.getElementById("quizContainer").classList.remove("hidden");
  document.getElementById("quizCompleteCard").classList.add("hidden");
  renderCurrentQuizQuestion();
}

async function generateQuizFromSource(text, pdfB64) {
  if (!text && !pdfB64) {
    loadSampleQuiz();
    return;
  }

  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: text,
        pdf_base64: pdfB64,
        count: 5,
        difficulty: "Medium",
        api_key: AppState.apiKey,
        title: "Subject Mastery Quiz"
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

    quizQuestionsList = data.questions;
    activeQuizId = data.quiz_id;
    currentQuizIndex = 0;
    currentQuizScore = 0;
    hasAnsweredCurrent = false;

    document.getElementById("quizContainer").classList.remove("hidden");
    document.getElementById("quizCompleteCard").classList.add("hidden");
    renderCurrentQuizQuestion();
  } catch (err) {
    console.error("Quiz error:", err);
    loadSampleQuiz();
  }
}

function renderCurrentQuizQuestion() {
  if (!quizQuestionsList || quizQuestionsList.length === 0) {
    loadSampleQuiz();
    return;
  }

  hasAnsweredCurrent = false;
  const q = quizQuestionsList[currentQuizIndex];

  // Labels & Bars
  document.getElementById("quizProgressLabel").innerText = `Question ${currentQuizIndex + 1} of ${quizQuestionsList.length}`;
  document.getElementById("quizScoreTracker").innerText = `Current Score: ${currentQuizScore}/${currentQuizIndex}`;
  const pct = ((currentQuizIndex + 1) / quizQuestionsList.length) * 100;
  document.getElementById("quizProgressBar").style.width = `${pct}%`;

  document.getElementById("quizDifficultyBadge").innerText = q.difficulty || "Standard";
  document.getElementById("quizTopicBadge").innerText = q.topic || "Core Topic";
  document.getElementById("quizQuestionText").innerText = q.question;

  // Options
  const optionsContainer = document.getElementById("quizOptionsList");
  optionsContainer.innerHTML = "";

  q.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition flex items-center space-x-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200";
    btn.id = `quizOptBtn-${idx}`;
    btn.onclick = () => selectQuizOption(idx);

    const letter = ["A", "B", "C", "D"][idx] || `${idx + 1}`;
    btn.innerHTML = `
      <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">${letter}</span>
      <span class="flex-1">${optText}</span>
    `;
    optionsContainer.appendChild(btn);
  });

  // Reset explanation & Next button
  document.getElementById("quizExplanationBox").classList.add("hidden");
  document.getElementById("quizNextBtn").classList.add("hidden");
}

function selectQuizOption(selectedIndex) {
  if (hasAnsweredCurrent) return;
  hasAnsweredCurrent = true;

  const q = quizQuestionsList[currentQuizIndex];
  const isCorrect = selectedIndex === q.correct_index;

  const selectedBtn = document.getElementById(`quizOptBtn-${selectedIndex}`);
  const correctBtn = document.getElementById(`quizOptBtn-${q.correct_index}`);

  if (isCorrect) {
    currentQuizScore++;
    selectedBtn.className = "w-full text-left p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold text-xs sm:text-sm flex items-center space-x-3";
    playCorrectSound();
  } else {
    selectedBtn.className = "w-full text-left p-3.5 rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 font-semibold text-xs sm:text-sm flex items-center space-x-3";
    if (correctBtn) {
      correctBtn.className = "w-full text-left p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-semibold text-xs sm:text-sm flex items-center space-x-3";
    }
    playIncorrectSound();
  }

  // Show explanation
  const expBox = document.getElementById("quizExplanationBox");
  const verdictIcon = document.getElementById("quizVerdictIcon");
  const verdictTitle = document.getElementById("quizVerdictTitle");
  const expText = document.getElementById("quizExplanationText");

  if (isCorrect) {
    verdictIcon.innerText = "✅";
    verdictTitle.innerText = "Correct! Well done.";
    verdictTitle.className = "text-sm font-bold text-emerald-600 dark:text-emerald-400";
  } else {
    verdictIcon.innerText = "❌";
    verdictTitle.innerText = `Incorrect. Option ${["A", "B", "C", "D"][q.correct_index]} is correct.`;
    verdictTitle.className = "text-sm font-bold text-red-600 dark:text-red-400";
  }

  expText.innerText = q.explanation;
  expBox.classList.remove("hidden");

  // Show Next button
  document.getElementById("quizNextBtn").classList.remove("hidden");
  document.getElementById("quizScoreTracker").innerText = `Current Score: ${currentQuizScore}/${currentQuizIndex + 1}`;
}

async function nextQuizQuestion() {
  if (currentQuizIndex < quizQuestionsList.length - 1) {
    currentQuizIndex++;
    renderCurrentQuizQuestion();
  } else {
    // Finish Quiz
    showQuizCompletion();
  }
}

async function showQuizCompletion() {
  document.getElementById("quizContainer").classList.add("hidden");
  const completeCard = document.getElementById("quizCompleteCard");
  completeCard.classList.remove("hidden");

  const total = quizQuestionsList.length;
  const pct = Math.round((currentQuizScore / total) * 100);

  document.getElementById("finalScoreText").innerText = `${currentQuizScore} / ${total}`;
  document.getElementById("scorePercentageText").innerText = `${pct}% Accuracy`;

  if (pct >= 60 && window.confetti) {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    playSuccessChime();
  }

  // Submit score to server for streak logging
  try {
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: activeQuizId,
        score: currentQuizScore,
        total: total
      })
    });
    const data = await res.json();
    if (data.streak) {
      updateStreakDisplay(data.streak);
    }
  } catch (e) {
    console.warn("Quiz submission error:", e);
  }
}

function restartCurrentQuiz() {
  currentQuizIndex = 0;
  currentQuizScore = 0;
  hasAnsweredCurrent = false;
  document.getElementById("quizContainer").classList.remove("hidden");
  document.getElementById("quizCompleteCard").classList.add("hidden");
  renderCurrentQuizQuestion();
}

document.addEventListener("DOMContentLoaded", () => {
  loadSampleQuiz();
});
