# 📚 Saraswati AI — Personal Study & PDF Summarizer Suite

**Author:** [Aditya Shahu](https://github.com/adityashahu2005-glitch)  
**Repository:** [https://github.com/adityashahu2005-glitch/Saraswati_AI](https://github.com/adityashahu2005-glitch/Saraswati_AI)

A high-performance personal study companion powered by the **Google Gemini API** (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`). It transforms lecture notes, textbooks, and PDF documents into bullet-point summaries, active recall flashcards, interactive quizzes, and examination prep assets.

It also features an **Exam Question Paper Analyzer** to rank question importance and a **Question Paper Generator** to construct targeted mock exams with step-by-step marking schemes.

---

## 🌟 Key Features

### 1. 📄 PDF & Notes Bullet-Point Summarizer
- **Executive Summaries**: High-level conceptual overview.
- **High-Yield Bullet Points**: Essential definitions, principles, and key facts.
- **Core Concepts Table**: Terms paired with their exam importance.
- **Formulas & Equations**: Clear mathematical expressions.
- **Memory Mnemonics & Exam Traps**: Catchy recall acronyms and common pitfalls.
- **Active Recall Checklist**: Self-evaluation questions to verify comprehension.
- **Export & Print**: Copy raw markdown or print as clean A4 document.

### 2. 🎴 Active Recall Flashcards (SM-2 Spaced Repetition)
- **3D Flip Card UI**: Question on front, answer and key insight on back.
- **Keyboard Shortcuts**: `Space` to flip, `1` (Again), `2` (Hard), `3` (Good), `4` (Easy), `←` / `→` to navigate.
- **Spaced Repetition Engine**: Calculates optimal review intervals based on difficulty ratings.
- **Anki Export**: One-click download of Anki-compatible `.tsv` files.

### 3. 📝 Interactive Practice Quiz
- Instant feedback with color-coded selections and audio feedback.
- Step-by-step explanation for why each answer choice is correct or incorrect.
- Live score tracker, progress bar, and completion summary report.

### 4. 📊 Question Paper Analyzer (Importance Level Ranking)
- Paste past examination papers (PYQs), question banks, or syllabus text.
- Categorizes questions into 3 distinct priority tiers:
  - 🔴 **High Importance (Must-Know)**: High probability, recurring questions, heavy marks weightage.
  - 🟡 **Medium Importance (Core Concepts)**: Moderate recurrence, supporting theory.
  - 🟢 **Low Importance (Niche/Optional)**: Infrequently asked or fringe topics.
- **Topic Weightage Breakdown**: Visual percentage bars showing mark distribution.
- **Examiner Pattern Observations**: Identifies trends and high-probability topics.

### 5. 🎓 Question Paper Generator (Targeted Mock Exams)
- Generates realistic, balanced question papers prioritized around the highest importance questions (70% High, 20% Medium, 10% Low).
- Configurable settings:
  - Total Marks: 25, 50, 75, or 100 Marks.
  - Duration: 1 Hour, 2 Hours, or 3 Hours.
  - Sections: Section A (Short Answer), Section B (Analytical), Section C (Comprehensive).
- **Model Answer Key & Marking Scheme**: Step-by-step solutions with evaluator mark allocations.
- **Print-Ready**: Styled for standard A4 paper printing.

### 6. 🔥 Active Recall Hub & Streak Notifications
- **Daily Study Streak Counter**: Preserves streaks across days and tracks longest streak.
- **Browser Web Notifications**: Daily alerts reminding you to maintain your active recall habit.
- **3-Minute Active Recall Drill**: Timed blitz challenge to dump concepts from memory before checking notes.
- **Activity Heatmap**: 30-day activity tracking grid.

### 7. 📜 Study Library & Local SQLite Persistence
- Automatically saves all generated summaries, flashcard decks, quiz results, and question papers locally in `data/study_pulse.db`.

---

## 🚀 Quick Start Guide

### Zero Dependencies Required!
The backend is crafted entirely with Python's standard library (`http.server`, `sqlite3`, `urllib`, `json`). No external pip dependencies are needed.

### Running on Windows:
1. Double-click `run.bat` (or right-click `run.ps1` and choose **Run with PowerShell**).
2. The server will start and automatically open your web browser at:
   ```
   http://127.0.0.1:8000
   ```

### Running Manually via Command Line:
```bash
python server.py 8000
```
Then visit `http://127.0.0.1:8000` in Chrome, Edge, or Firefox.

---

## 🔑 Setting Up Your Google Gemini API Key
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In the app, click the **API Key** button in the top navigation bar.
3. Paste your key and click **Test Connection**, then **Save Key**.
4. **Demo Mode**: If you don't have an API key right now, click **Continue in Demo Mode** or use the preloaded **Load Sample Notes / PYQs** buttons in each module.

---

## 📁 Project Architecture
```
Saraswati_AI/
│
├── server.py             # HTTP server & REST API (standard library)
├── database.py           # SQLite schema, SM-2 spaced repetition, and streaks
├── gemini_client.py      # Google Gemini 2.5/2.0/1.5 client & prompt templates
│
├── static/
│   ├── index.html        # Responsive Single Page Application
│   ├── css/
│   │   └── style.css     # 3D flip card, importance badges, print styles
│   └── js/
│       ├── app.js        # Global state, theme, synthesizers, key manager
│       ├── pdf-handler.js# PDF upload & drag-and-drop
│       ├── summarizer.js # Structured bullet-point summarizer
│       ├── flashcards.js # Interactive flashcards & spaced repetition
│       ├── quiz.js       # Multiple-choice quiz engine with instant validation
│       ├── analyzer.js   # Question paper analyzer & importance classifier
│       ├── generator.js  # Targeted mock paper generator & marking scheme
│       └── streak.js     # Web notifications, daily streak, and 30-day heatmap
│
├── data/
│   ├── sample_notes.txt  # Preloaded OS study material
│   └── sample_paper.txt  # Preloaded university exam questions
│
├── run.bat               # One-click Windows batch launcher
├── run.ps1               # PowerShell launcher
├── requirements.txt      # Zero dependencies note
├── .gitignore            # Git ignore rules
└── README.md             # Complete user documentation
```

---

## 👤 Author & Maintainer

- **Developer:** Aditya Shahu
- **GitHub:** [@adityashahu2005-glitch](https://github.com/adityashahu2005-glitch)
- **Project Repository:** [https://github.com/adityashahu2005-glitch/Saraswati_AI](https://github.com/adityashahu2005-glitch/Saraswati_AI)
