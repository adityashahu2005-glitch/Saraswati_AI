/**
 * Active Recall Hub, Streak Tracker & Notification Manager
 */

let notificationsEnabled = (localStorage.getItem("saraswati_notifications") || localStorage.getItem("studypulse_notifications")) === "true";
let drillTimerInterval = null;
let drillSecondsLeft = 180; // 3 minutes

async function fetchInitialStreak() {
  try {
    const res = await fetch("/api/streak");
    const data = await res.json();
    if (data.streak) {
      AppState.streak = data.streak;
      updateStreakDisplay(data.streak);
    }
  } catch (err) {
    console.warn("Could not fetch streak:", err);
  }
}

function updateStreakDisplay(streak) {
  AppState.streak = streak;

  const current = streak.current_streak || 0;
  const longest = streak.longest_streak || 0;
  const total = streak.total_days_active || 0;
  const studiedToday = streak.studied_today;

  // Header Pill
  const headerCount = document.getElementById("headerStreakCount");
  if (headerCount) {
    headerCount.innerText = `${current} Day${current === 1 ? '' : 's'} Streak`;
  }

  // Hub Stats
  const hubBig = document.getElementById("hubStreakBig");
  if (hubBig) hubBig.innerText = `${current} Day${current === 1 ? '' : 's'}`;

  const statCurr = document.getElementById("hubStatCurrentStreak");
  if (statCurr) statCurr.innerText = `${current} Days`;

  const statLong = document.getElementById("hubStatLongestStreak");
  if (statLong) statLong.innerText = `${longest} Days`;

  const statTotal = document.getElementById("hubStatTotalDays");
  if (statTotal) statTotal.innerText = `${total} Days`;

  // Update notification UI label
  updateNotificationStatusUI();
}

function renderStreakHub() {
  updateStreakDisplay(AppState.streak);

  // Render 30-Day Activity Heatmap
  const grid = document.getElementById("heatmapGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const historyMap = {};
  (AppState.streak.history || []).forEach(h => {
    historyMap[h.date] = h;
  });

  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const activity = historyMap[dateStr];

    const square = document.createElement("div");
    square.className = "h-8 rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition transform hover:scale-110";
    
    if (activity) {
      square.className += " bg-emerald-500 text-white shadow-sm shadow-emerald-500/20";
      square.title = `${dateStr}: ${activity.activities} activities (${activity.minutes} mins)`;
      square.innerText = "✓";
    } else {
      square.className += " bg-slate-100 dark:bg-slate-700 text-slate-400";
      square.title = `${dateStr}: No recorded study`;
      square.innerText = d.getDate();
    }
    grid.appendChild(square);
  }
}

// Browser Web Notifications for Active Recall
function updateNotificationStatusUI() {
  const statusText = document.getElementById("notifyStatusText");
  const hubBtnText = document.getElementById("hubNotifyBtnText");

  if (notificationsEnabled && ("Notification" in window) && Notification.permission === "granted") {
    if (statusText) statusText.innerText = "Alerts: On";
    if (hubBtnText) hubBtnText.innerText = "Study Alerts Active ✓";
  } else {
    if (statusText) statusText.innerText = "Alerts: Off";
    if (hubBtnText) hubBtnText.innerText = "Enable Desktop Study Alerts";
  }
}

async function toggleRecallNotifications() {
  if (!("Notification" in window)) {
    alert("Desktop notifications are not supported in this browser. In-app alerts will be used instead.");
    return;
  }

  if (Notification.permission === "granted") {
    notificationsEnabled = !notificationsEnabled;
    localStorage.setItem("saraswati_notifications", notificationsEnabled ? "true" : "false");
    localStorage.setItem("studypulse_notifications", notificationsEnabled ? "true" : "false");
    updateNotificationStatusUI();

    if (notificationsEnabled) {
      new Notification("🔥 Saraswati AI Active Recall Reminder", {
        body: "Study alerts are active! Saraswati AI will remind you to preserve your active recall streak.",
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='20' font-size='20'>🔥</text></svg>"
      });
      playSuccessChime();
    }
  } else {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      notificationsEnabled = true;
      localStorage.setItem("saraswati_notifications", "true");
      localStorage.setItem("studypulse_notifications", "true");
      updateNotificationStatusUI();

      new Notification("🔥 Saraswati AI Active Recall Reminder", {
        body: "Streak notifications enabled! Saraswati AI will prompt you for your daily active recall review.",
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='20' font-size='20'>🔥</text></svg>"
      });
      playSuccessChime();
    } else {
      alert("Notification permission was denied. You can re-enable it in your browser site permissions.");
    }
  }
}

// 3-Minute Active Recall Drill Modal
function startActiveRecallChallenge() {
  const modal = document.getElementById("recallModal");
  modal.classList.remove("hidden");
  document.getElementById("drillInput").value = "";

  drillSecondsLeft = 180;
  updateDrillTimerDisplay();

  if (drillTimerInterval) clearInterval(drillTimerInterval);
  drillTimerInterval = setInterval(() => {
    drillSecondsLeft--;
    updateDrillTimerDisplay();
    if (drillSecondsLeft <= 0) {
      clearInterval(drillTimerInterval);
      playSuccessChime();
      alert("⏰ Time is up! Review what you remembered and click Submit to log your study streak.");
    }
  }, 1000);
}

function updateDrillTimerDisplay() {
  const mins = Math.floor(drillSecondsLeft / 60);
  const secs = drillSecondsLeft % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  document.getElementById("drillTimerDisplay").innerText = display;
}

function closeRecallModal() {
  if (drillTimerInterval) clearInterval(drillTimerInterval);
  document.getElementById("recallModal").classList.add("hidden");
}

async function submitRecallDrill() {
  const text = document.getElementById("drillInput").value.trim();
  closeRecallModal();

  try {
    const res = await fetch("/api/streak/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: 10, notes: text })
    });
    const data = await res.json();
    if (data.streak) {
      updateStreakDisplay(data.streak);
    }
    if (window.confetti) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }
    playSuccessChime();
    alert("🎉 Fantastic active recall drill! Streak updated (+10 study minutes).");
  } catch (err) {
    console.error("Drill submit error:", err);
  }
}

// Library & Saved History
async function loadLibraryHistory() {
  const container = document.getElementById("historyListsGrid");
  if (!container) return;
  container.innerHTML = `<div class="col-span-full text-center text-xs text-slate-400 py-8">Loading saved study sessions...</div>`;

  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    container.innerHTML = "";

    // 1. Saved Summaries
    const sumCard = document.createElement("div");
    sumCard.className = "bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";
    sumCard.innerHTML = `
      <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
        <i data-lucide="file-text" class="w-4 h-4"></i>
        <span>Saved Summaries (${data.summaries.length})</span>
      </div>
      <div class="space-y-2 max-h-60 overflow-y-auto" id="historySummariesList"></div>
    `;
    container.appendChild(sumCard);

    const sumList = sumCard.querySelector("#historySummariesList");
    if (data.summaries.length === 0) {
      sumList.innerHTML = `<p class="text-xs text-slate-400 italic">No saved summaries yet.</p>`;
    } else {
      data.summaries.forEach(s => {
        const item = document.createElement("div");
        item.className = "p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer text-xs space-y-1 transition";
        item.innerHTML = `
          <p class="font-semibold text-slate-800 dark:text-slate-200 truncate">${s.title}</p>
          <p class="text-[10px] text-slate-400">${s.created_at}</p>
        `;
        item.onclick = async () => {
          const r = await fetch(`/api/history/summary/${s.id}`);
          const full = await r.json();
          AppState.currentSummary = full.summary_text;
          switchTab("summarizer");
          renderSummaryMarkdown(full.summary_text);
          document.getElementById("summaryResultContainer").classList.remove("hidden");
        };
        sumList.appendChild(item);
      });
    }

    // 2. Saved Question Paper Analyses
    const anaCard = document.createElement("div");
    anaCard.className = "bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";
    anaCard.innerHTML = `
      <div class="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm">
        <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
        <span>Paper Analyses (${data.analyses.length})</span>
      </div>
      <div class="space-y-2 max-h-60 overflow-y-auto" id="historyAnalysesList"></div>
    `;
    container.appendChild(anaCard);

    const anaList = anaCard.querySelector("#historyAnalysesList");
    if (data.analyses.length === 0) {
      anaList.innerHTML = `<p class="text-xs text-slate-400 italic">No paper analyses yet.</p>`;
    } else {
      data.analyses.forEach(a => {
        const item = document.createElement("div");
        item.className = "p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer text-xs space-y-1 transition";
        item.innerHTML = `
          <p class="font-semibold text-slate-800 dark:text-slate-200 truncate">${a.subject || a.title}</p>
          <p class="text-[10px] text-slate-400">${a.created_at}</p>
        `;
        item.onclick = () => {
          switchTab("analyzer");
        };
        anaList.appendChild(item);
      });
    }

    // 3. Saved Flashcard Decks
    const deckCard = document.createElement("div");
    deckCard.className = "bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3";
    deckCard.innerHTML = `
      <div class="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
        <i data-lucide="layers" class="w-4 h-4"></i>
        <span>Flashcard Decks (${data.decks.length})</span>
      </div>
      <div class="space-y-2 max-h-60 overflow-y-auto" id="historyDecksList"></div>
    `;
    container.appendChild(deckCard);

    const deckList = deckCard.querySelector("#historyDecksList");
    if (data.decks.length === 0) {
      deckList.innerHTML = `<p class="text-xs text-slate-400 italic">No saved decks yet.</p>`;
    } else {
      data.decks.forEach(d => {
        const item = document.createElement("div");
        item.className = "p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer text-xs space-y-1 transition";
        item.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate">${d.title}</span>
            <span class="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${d.card_count} cards</span>
          </div>
          <p class="text-[10px] text-slate-400">${d.created_at}</p>
        `;
        item.onclick = async () => {
          const r = await fetch(`/api/flashcard/deck/${d.id}`);
          const full = await r.json();
          flashcardsList = full.cards;
          currentDeckId = d.id;
          currentCardIndex = 0;
          switchTab("flashcards");
          renderCurrentCard();
        };
        deckList.appendChild(item);
      });
    }

    if (window.lucide) lucide.createIcons();

  } catch (err) {
    container.innerHTML = `<div class="col-span-full text-center text-xs text-red-500 py-8">Error loading history: ${err.message}</div>`;
  }
}
