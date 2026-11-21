"""
Saraswati AI - Database layer for Personal Study & PDF Summarizer.
Author: Aditya Shahu (https://github.com/adityashahu2005-glitch)
Uses Python's built-in sqlite3 for zero-dependency local persistence.
"""

import sqlite3
import json
import os
from datetime import datetime, date, timedelta

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "study_pulse.db")

def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # Study Activity & Streaks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS streak_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_date TEXT UNIQUE,
        activities_count INTEGER DEFAULT 1,
        minutes_studied INTEGER DEFAULT 0,
        last_activity_time TEXT
    )
    """)

    # Summaries table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        source_name TEXT,
        summary_text TEXT,
        key_takeaways TEXT,
        created_at TEXT
    )
    """)

    # Flashcard decks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcard_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        created_at TEXT
    )
    """)

    # Flashcards with SM-2 spaced repetition tracking
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER,
        front TEXT,
        back TEXT,
        explanation TEXT,
        repetitions INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 1,
        ease_factor REAL DEFAULT 2.5,
        due_date TEXT,
        last_reviewed TEXT,
        FOREIGN KEY (deck_id) REFERENCES flashcard_decks (id) ON DELETE CASCADE
    )
    """)

    # Quizzes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        topic TEXT,
        score INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        quiz_data TEXT,
        created_at TEXT
    )
    """)

    # Question Paper Analysis table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS question_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        subject TEXT,
        raw_text TEXT,
        analysis_data TEXT,
        created_at TEXT
    )
    """)

    # Generated Question Papers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS generated_papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        subject TEXT,
        total_marks INTEGER,
        duration TEXT,
        paper_data TEXT,
        marking_scheme TEXT,
        created_at TEXT
    )
    """)

    conn.commit()
    conn.close()

# Streak management
def log_study_activity(minutes=5):
    conn = get_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    now_iso = datetime.now().isoformat()

    cursor.execute("SELECT activities_count, minutes_studied FROM streak_logs WHERE study_date = ?", (today_str,))
    row = cursor.fetchone()

    if row:
        new_count = row["activities_count"] + 1
        new_mins = row["minutes_studied"] + minutes
        cursor.execute("""
            UPDATE streak_logs 
            SET activities_count = ?, minutes_studied = ?, last_activity_time = ?
            WHERE study_date = ?
        """, (new_count, new_mins, now_iso, today_str))
    else:
        cursor.execute("""
            INSERT INTO streak_logs (study_date, activities_count, minutes_studied, last_activity_time)
            VALUES (?, 1, ?, ?)
        """, (today_str, minutes, now_iso))

    conn.commit()
    conn.close()

def get_streak_info():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT study_date, activities_count, minutes_studied FROM streak_logs ORDER BY study_date DESC")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "total_days_active": 0,
            "studied_today": False,
            "history": []
        }

    date_set = {row["study_date"] for row in rows}
    today = date.today()
    today_str = today.isoformat()
    yesterday = today - timedelta(days=1)
    yesterday_str = yesterday.isoformat()

    studied_today = today_str in date_set

    # Calculate current streak
    current_streak = 0
    check_date = today if studied_today else yesterday

    while check_date.isoformat() in date_set:
        current_streak += 1
        check_date -= timedelta(days=1)

    # Calculate longest streak
    sorted_dates = sorted([date.fromisoformat(d) for d in date_set])
    longest_streak = 0
    streak_temp = 0
    prev_d = None

    for d in sorted_dates:
        if prev_d is None or d == prev_d + timedelta(days=1):
            streak_temp += 1
        else:
            streak_temp = 1
        prev_d = d
        if streak_temp > longest_streak:
            longest_streak = streak_temp

    history_list = [
        {
            "date": row["study_date"],
            "activities": row["activities_count"],
            "minutes": row["minutes_studied"]
        } for row in rows[:30] # Last 30 active days
    ]

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest_streak, current_streak),
        "total_days_active": len(date_set),
        "studied_today": studied_today,
        "history": history_list
    }

# Flashcard SM-2 review logic
def update_flashcard_review(card_id, rating):
    """
    rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT repetitions, interval_days, ease_factor FROM flashcards WHERE id = ?", (card_id,))
    card = cursor.fetchone()
    if not card:
        conn.close()
        return None

    reps = card["repetitions"]
    interval = card["interval_days"]
    ease = card["ease_factor"]

    # SM-2 calculation
    if rating >= 3: # Good or Easy
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = int(interval * ease)
        reps += 1
    else: # Again or Hard
        reps = 0
        interval = 1

    # Adjust ease factor
    # rating scale in SM-2 is 0-5. Here rating 1-4 maps to: 1->1, 2->3, 3->4, 4->5
    q = {1: 1, 2: 3, 3: 4, 4: 5}.get(rating, 3)
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if ease < 1.3:
        ease = 1.3

    next_due = (date.today() + timedelta(days=interval)).isoformat()
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        UPDATE flashcards
        SET repetitions = ?, interval_days = ?, ease_factor = ?, due_date = ?, last_reviewed = ?
        WHERE id = ?
    """, (reps, interval, ease, next_due, now_iso, card_id))

    conn.commit()
    conn.close()
    log_study_activity(minutes=2)
    return {"card_id": card_id, "interval_days": interval, "due_date": next_due}

init_db()
