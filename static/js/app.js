/**
 * Global App State and Utilities for Saraswati AI
 */

const AppState = {
  apiKey: localStorage.getItem("saraswati_api_key") || localStorage.getItem("studypulse_api_key") || "",
  activeTab: "summarizer",
  theme: localStorage.getItem("saraswati_theme") || localStorage.getItem("studypulse_theme") || "light",
  currentSummary: null,
  currentDeck: null,
  currentQuiz: null,
  currentAnalysis: null,
  currentGeneratedPaper: null,
  activePdfBase64: null,
  streak: {
    current_streak: 0,
    longest_streak: 0,
    total_days_active: 0,
    studied_today: false,
    history: []
  }
};

// Initialize Theme
function applyTheme() {
  const root = document.documentElement;
  const themeIcon = document.getElementById("themeIcon");
  if (AppState.theme === "dark") {
    root.classList.add("dark");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
  } else {
    root.classList.remove("dark");
    if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
  }
  if (window.lucide) lucide.createIcons();
}

function toggleTheme() {
  AppState.theme = AppState.theme === "dark" ? "light" : "dark";
  localStorage.setItem("saraswati_theme", AppState.theme);
  localStorage.setItem("studypulse_theme", AppState.theme);
  applyTheme();
}

// Tab Switching
function switchTab(tabName) {
  AppState.activeTab = tabName;
  const tabs = ["summarizer", "flashcards", "quiz", "analyzer", "generator", "streak", "history"];
  
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    if (section) {
      if (t === tabName) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    }
    if (btn) {
      if (t === tabName) {
        btn.classList.add("active", "text-indigo-600", "dark:text-indigo-400", "bg-indigo-50", "dark:bg-indigo-950/50");
        btn.classList.remove("text-slate-600", "dark:text-slate-300");
      } else {
        btn.classList.remove("active", "text-indigo-600", "dark:text-indigo-400", "bg-indigo-50", "dark:bg-indigo-950/50");
        btn.classList.add("text-slate-600", "dark:text-slate-300");
      }
    }
  });

  if (tabName === "history") {
    loadLibraryHistory();
  } else if (tabName === "streak") {
    renderStreakHub();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
}

// Web Audio API Synthesizers
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn("Audio playback not permitted yet:", e);
  }
}

function playFlipCardSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
}

function playCorrectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(880, now + 0.1); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
}

function playIncorrectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(164.81, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

// API Key Modal & Key Validation
function openApiKeyModal() {
  const modal = document.getElementById("apiKeyModal");
  const input = document.getElementById("apiKeyInput");
  input.value = AppState.apiKey;
  modal.classList.remove("hidden");
}

function closeApiKeyModal() {
  const modal = document.getElementById("apiKeyModal");
  modal.classList.add("hidden");
}

function updateApiKeyPillUI() {
  const dot = document.getElementById("apiKeyDot");
  const label = document.getElementById("apiKeyStatusLabel");
  if (AppState.apiKey && AppState.apiKey.trim().length > 10) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
    label.innerText = "Gemini Key: Active";
  } else {
    dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
    label.innerText = "Using Demo Mode";
  }
}

function saveApiKey() {
  const input = document.getElementById("apiKeyInput");
  AppState.apiKey = input.value.trim();
  localStorage.setItem("saraswati_api_key", AppState.apiKey);
  localStorage.setItem("studypulse_api_key", AppState.apiKey);
  updateApiKeyPillUI();
  closeApiKeyModal();
}

function useDemoMode() {
  AppState.apiKey = "";
  localStorage.removeItem("saraswati_api_key");
  localStorage.removeItem("studypulse_api_key");
  updateApiKeyPillUI();
  closeApiKeyModal();
}

async function testApiKey() {
  const input = document.getElementById("apiKeyInput");
  const key = input.value.trim();
  const msgBox = document.getElementById("apiKeyTestMessage");
  const testBtn = document.getElementById("testKeyBtn");

  if (!key) {
    msgBox.className = "p-2.5 rounded-lg text-xs bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
    msgBox.innerText = "Please enter an API key first.";
    return;
  }

  testBtn.innerText = "Testing...";
  testBtn.disabled = true;

  try {
    const res = await fetch("/api/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key })
    });
    const data = await res.json();
    if (data.valid) {
      msgBox.className = "p-2.5 rounded-lg text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 block";
      msgBox.innerText = `✅ Connected successfully! Model ${data.model} replied: "${data.reply}"`;
    } else {
      msgBox.className = "p-2.5 rounded-lg text-xs bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
      msgBox.innerText = `❌ Error: ${data.message || data.error}`;
    }
  } catch (err) {
    msgBox.className = "p-2.5 rounded-lg text-xs bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
    msgBox.innerText = `Connection test error: ${err.message}`;
  } finally {
    testBtn.innerText = "Test Connection";
    testBtn.disabled = false;
  }
}

// Print Utility
function printFormattedDoc(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const originalContents = document.body.innerHTML;
  const printContents = el.innerHTML;

  window.print();
}

// Init on Page Load
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  updateApiKeyPillUI();
  fetchInitialStreak();
});
