/**
 * Interactive Flashcard Module (Active Recall & Spaced Repetition)
 */

let flashcardsList = [];
let currentCardIndex = 0;
let isCardFlipped = false;
let currentDeckId = null;

const SAMPLE_FLASHCARDS = [
  {
    id: 1,
    front: "What is the primary difference between Internal and External Fragmentation?",
    back: "Internal occurs when allocated memory blocks are larger than requested. External occurs when total free space exists but is fractured into non-contiguous holes.",
    explanation: "Paging solves external fragmentation using fixed frames, but incurs small internal fragmentation on the final page.",
    topic: "Memory Management"
  },
  {
    id: 2,
    front: "What is the formula for Effective Memory Access Time (EMAT) with TLB?",
    back: "EMAT = α · (t_TLB + t_mem) + (1 - α) · (t_TLB + 2 · t_mem)",
    explanation: "α is the hit ratio. On miss: TLB check + Page table access + Target physical memory access.",
    topic: "Virtual Memory"
  },
  {
    id: 3,
    front: "What is Belady's Anomaly and which page replacement algorithm exhibits it?",
    back: "Belady's Anomaly is when allocating MORE physical memory frames leads to MORE page faults. It occurs in FIFO.",
    explanation: "Stack algorithms like LRU and Optimal are provably immune to Belady's Anomaly.",
    topic: "Page Replacement"
  },
  {
    id: 4,
    front: "What causes Thrashing in an Operating System?",
    back: "Thrashing occurs when the sum of active processes' working-sets exceeds total physical RAM, causing continuous page swapping and near-zero CPU execution.",
    explanation: "Countermeasures include the Working-Set Model and Page Fault Frequency (PFF) control.",
    topic: "Virtual Memory"
  },
  {
    id: 5,
    front: "What are the two parts of a CPU-generated logical address in Paging?",
    back: "Page Number (p) and Page Offset (d).",
    explanation: "Page number indexes the page table to get the frame number; offset indexes the exact byte within that frame.",
    topic: "Paging Architecture"
  }
];

function loadSampleFlashcards() {
  flashcardsList = [...SAMPLE_FLASHCARDS];
  currentCardIndex = 0;
  isCardFlipped = false;
  currentDeckId = "sample_deck";
  renderCurrentCard();
}

async function generateFlashcardsFromSource(text, pdfB64) {
  if (!text && !pdfB64) {
    loadSampleFlashcards();
    return;
  }

  try {
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: text,
        pdf_base64: pdfB64,
        count: 8,
        api_key: AppState.apiKey,
        title: "Active Recall Study Deck"
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate flashcards");

    flashcardsList = data.cards;
    currentDeckId = data.deck_id;
    currentCardIndex = 0;
    isCardFlipped = false;
    renderCurrentCard();

    if (data.streak) {
      updateStreakDisplay(data.streak);
    }
  } catch (err) {
    console.error("Flashcards error:", err);
    loadSampleFlashcards();
  }
}

function renderCurrentCard() {
  if (!flashcardsList || flashcardsList.length === 0) {
    loadSampleFlashcards();
    return;
  }

  const card = flashcardsList[currentCardIndex];
  const flipCard = document.getElementById("flipCardElement");
  
  // Reset flip
  isCardFlipped = false;
  flipCard.classList.remove("flipped");

  // Populate data
  document.getElementById("cardFrontText").innerText = card.front;
  document.getElementById("cardBackText").innerText = card.back;
  document.getElementById("cardExplanationText").innerText = card.explanation || "Core exam concept to remember.";
  document.getElementById("flashcardTopicBadge").innerText = card.topic || "Core Concept";

  // Indicators
  document.getElementById("flashcardIndexLabel").innerText = `Card ${currentCardIndex + 1} of ${flashcardsList.length}`;
  const pct = ((currentCardIndex + 1) / flashcardsList.length) * 100;
  document.getElementById("flashcardProgressBar").style.width = `${pct}%`;
}

function toggleCardFlip() {
  const flipCard = document.getElementById("flipCardElement");
  isCardFlipped = !isCardFlipped;
  if (isCardFlipped) {
    flipCard.classList.add("flipped");
  } else {
    flipCard.classList.remove("flipped");
  }
  playFlipCardSound();
}

async function rateFlashcard(rating) {
  const card = flashcardsList[currentCardIndex];
  
  if (card && card.id && typeof card.id === "number") {
    try {
      const res = await fetch("/api/flashcard/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id, rating: rating })
      });
      const data = await res.json();
      if (data.streak) {
        updateStreakDisplay(data.streak);
      }
    } catch (e) {
      console.warn("Rating save failed:", e);
    }
  }

  // Visual celebration on Easy rating
  if (rating === 4 && window.confetti) {
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.8 } });
  }

  nextFlashcard();
}

function prevFlashcard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderCurrentCard();
  }
}

function nextFlashcard() {
  if (currentCardIndex < flashcardsList.length - 1) {
    currentCardIndex++;
    renderCurrentCard();
  } else {
    // Deck complete!
    if (window.confetti) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    playSuccessChime();
    alert("🎉 Excellent! You have completed reviewing this active recall deck!");
    currentCardIndex = 0;
    renderCurrentCard();
  }
}

function exportDeckToAnki() {
  if (!currentDeckId || currentDeckId === "sample_deck") {
    // Generate simple client-side TSV download for sample
    let tsv = "#separator:tab\n#html:true\n#tags column:3\n";
    flashcardsList.forEach(c => {
      tsv += `${c.front}\t${c.back}<br><small>${c.explanation || ''}</small>\tSaraswatiAI\n`;
    });
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saraswati_ai_flashcards.tsv";
    a.click();
    return;
  }

  window.open(`/api/export-anki/${currentDeckId}`, "_blank");
}

// Global Keyboard Shortcuts for Flashcards
document.addEventListener("keydown", (e) => {
  if (AppState.activeTab !== "flashcards") return;
  // Ignore if typing inside textarea/input
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  if (e.code === "Space") {
    e.preventDefault();
    toggleCardFlip();
  } else if (e.key === "1") {
    rateFlashcard(1);
  } else if (e.key === "2") {
    rateFlashcard(2);
  } else if (e.key === "3") {
    rateFlashcard(3);
  } else if (e.key === "4") {
    rateFlashcard(4);
  } else if (e.key === "ArrowLeft") {
    prevFlashcard();
  } else if (e.key === "ArrowRight") {
    nextFlashcard();
  }
});

// Auto load sample on first view
document.addEventListener("DOMContentLoaded", () => {
  loadSampleFlashcards();
});
