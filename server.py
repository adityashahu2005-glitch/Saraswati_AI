"""
Saraswati AI - Production-grade Local Server for Personal Study & PDF Summarizer.
Author: Aditya Shahu (https://github.com/adityashahu2005-glitch)
Built entirely using Python's standard library (http.server, urllib, json, sqlite3).
Zero external dependencies required.
"""

import http.server
import socketserver
import json
import os
import sys
import mimetypes
import traceback
from urllib.parse import urlparse, parse_qs

# Import database and gemini modules
import database
import gemini_client

PORT = 8000
HOST = "127.0.0.1"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Ensure mime types are registered properly
mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")

class StudyAppRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def send_json(self, data, status_code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status_code=400, details=None):
        payload = {"error": str(message)}
        if details:
            payload["details"] = str(details)
        self.send_json(payload, status_code=status_code)

    def read_json_body(self):
        content_len = int(self.headers.get("Content-Length", 0))
        if content_len == 0:
            return {}
        raw = self.rfile.read(content_len).decode("utf-8")
        return json.loads(raw)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/streak":
            streak_data = database.get_streak_info()
            self.send_json({"streak": streak_data})
            return

        elif path == "/api/history":
            conn = database.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, source_name, created_at FROM summaries ORDER BY id DESC LIMIT 15")
            summaries = [dict(r) for r in cursor.fetchall()]

            cursor.execute("SELECT id, title, subject, created_at FROM question_analyses ORDER BY id DESC LIMIT 15")
            analyses = [dict(r) for r in cursor.fetchall()]

            cursor.execute("SELECT id, title, subject, total_marks, duration, created_at FROM generated_papers ORDER BY id DESC LIMIT 15")
            papers = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT d.id, d.title, d.created_at, count(f.id) as card_count
                FROM flashcard_decks d
                LEFT JOIN flashcards f ON f.deck_id = d.id
                GROUP BY d.id
                ORDER BY d.id DESC LIMIT 15
            """)
            decks = [dict(r) for r in cursor.fetchall()]
            conn.close()

            self.send_json({
                "summaries": summaries,
                "analyses": analyses,
                "papers": papers,
                "decks": decks
            })
            return

        elif path.startswith("/api/history/summary/"):
            summary_id = path.split("/")[-1]
            conn = database.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM summaries WHERE id = ?", (summary_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                self.send_json(dict(row))
            else:
                self.send_error_json("Summary not found", 404)
            return

        elif path.startswith("/api/flashcard/deck/"):
            deck_id = path.split("/")[-1]
            conn = database.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM flashcard_decks WHERE id = ?", (deck_id,))
            deck = cursor.fetchone()
            if not deck:
                conn.close()
                self.send_error_json("Deck not found", 404)
                return

            cursor.execute("SELECT * FROM flashcards WHERE deck_id = ? ORDER BY id ASC", (deck_id,))
            cards = [dict(r) for r in cursor.fetchall()]
            conn.close()

            self.send_json({"deck": dict(deck), "cards": cards})
            return

        elif path.startswith("/api/export-anki/"):
            deck_id = path.split("/")[-1]
            conn = database.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT front, back, explanation FROM flashcards WHERE deck_id = ?", (deck_id,))
            cards = cursor.fetchall()
            conn.close()

            tsv_lines = ["#separator:tab", "#html:true", "#tags column:3"]
            for c in cards:
                front_clean = c["front"].replace("\t", " ").replace("\n", "<br>")
                back_clean = (c["back"] + ("<br><small>" + c["explanation"] + "</small>" if c["explanation"] else "")).replace("\t", " ").replace("\n", "<br>")
                tsv_lines.append(f"{front_clean}\t{back_clean}\tSaraswatiAI")

            output_content = "\n".join(tsv_lines).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/tab-separated-values; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename=saraswati_deck_{deck_id}.tsv")
            self.send_header("Content-Length", str(len(output_content)))
            self.end_headers()
            self.wfile.write(output_content)
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            body = self.read_json_body()
        except Exception as e:
            self.send_error_json("Invalid JSON request body", 400, str(e))
            return

        try:
            if path == "/api/test-key":
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)
                if not api_key:
                    self.send_json({"valid": False, "message": "No API key supplied."})
                    return
                # Make a minimal test call
                res = gemini_client.call_gemini_api("Reply with only the word 'OK'", api_key=api_key, model=model)
                self.send_json({"valid": True, "model": model, "reply": res.strip()})
                return

            elif path == "/api/streak/ping":
                minutes = body.get("minutes", 5)
                database.log_study_activity(minutes=minutes)
                self.send_json({"status": "ok", "streak": database.get_streak_info()})
                return

            elif path == "/api/summarize":
                content = body.get("content", "")
                pdf_b64 = body.get("pdf_base64")
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)
                title = body.get("title", "Document Summary")
                source_name = body.get("source_name", "Uploaded Material")

                if not content and not pdf_b64:
                    self.send_error_json("Please provide text content or a PDF.")
                    return

                summary_md = gemini_client.generate_summary_ai(content, api_key=api_key, model=model, pdf_base64=pdf_b64)

                # Persist to database
                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO summaries (title, source_name, summary_text, created_at)
                    VALUES (?, ?, ?, datetime('now'))
                """, (title, source_name, summary_md))
                summary_id = cursor.lastrowid
                conn.commit()
                conn.close()

                database.log_study_activity(minutes=10)

                self.send_json({
                    "id": summary_id,
                    "title": title,
                    "summary": summary_md,
                    "streak": database.get_streak_info()
                })
                return

            elif path == "/api/flashcards":
                content = body.get("content", "")
                pdf_b64 = body.get("pdf_base64")
                count = int(body.get("count", 8))
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)
                deck_title = body.get("title", "Active Recall Flashcards")

                cards = gemini_client.generate_flashcards_ai(content, count=count, api_key=api_key, model=model, pdf_base64=pdf_b64)

                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO flashcard_decks (title, description, created_at)
                    VALUES (?, ?, datetime('now'))
                """, (deck_title, f"Generated with {len(cards)} cards"))
                deck_id = cursor.lastrowid

                saved_cards = []
                for card in cards:
                    cursor.execute("""
                        INSERT INTO flashcards (deck_id, front, back, explanation, due_date)
                        VALUES (?, ?, ?, ?, date('now'))
                    """, (deck_id, card.get("front", ""), card.get("back", ""), card.get("explanation", "")))
                    card_id = cursor.lastrowid
                    saved_cards.append({
                        "id": card_id,
                        "front": card.get("front"),
                        "back": card.get("back"),
                        "explanation": card.get("explanation"),
                        "topic": card.get("topic", "General")
                    })
                conn.commit()
                conn.close()

                database.log_study_activity(minutes=8)

                self.send_json({
                    "deck_id": deck_id,
                    "deck_title": deck_title,
                    "cards": saved_cards,
                    "streak": database.get_streak_info()
                })
                return

            elif path == "/api/flashcard/review":
                card_id = int(body.get("card_id"))
                rating = int(body.get("rating", 3)) # 1: Again, 2: Hard, 3: Good, 4: Easy
                res = database.update_flashcard_review(card_id, rating)
                self.send_json({
                    "status": "updated",
                    "result": res,
                    "streak": database.get_streak_info()
                })
                return

            elif path == "/api/quiz":
                content = body.get("content", "")
                pdf_b64 = body.get("pdf_base64")
                count = int(body.get("count", 5))
                difficulty = body.get("difficulty", "Medium")
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)
                title = body.get("title", "Practice Quiz")

                quiz_questions = gemini_client.generate_quiz_ai(content, count=count, difficulty=difficulty, api_key=api_key, model=model, pdf_base64=pdf_b64)

                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO quizzes (title, topic, total_questions, quiz_data, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                """, (title, difficulty, len(quiz_questions), json.dumps(quiz_questions)))
                quiz_id = cursor.lastrowid
                conn.commit()
                conn.close()

                self.send_json({
                    "quiz_id": quiz_id,
                    "title": title,
                    "difficulty": difficulty,
                    "questions": quiz_questions
                })
                return

            elif path == "/api/quiz/submit":
                quiz_id = body.get("quiz_id")
                score = body.get("score", 0)
                total = body.get("total", 0)

                if quiz_id:
                    conn = database.get_connection()
                    cursor = conn.cursor()
                    cursor.execute("UPDATE quizzes SET score = ? WHERE id = ?", (score, quiz_id))
                    conn.commit()
                    conn.close()

                database.log_study_activity(minutes=10)
                self.send_json({
                    "status": "recorded",
                    "score": score,
                    "total": total,
                    "streak": database.get_streak_info()
                })
                return

            elif path == "/api/analyze-paper":
                paper_text = body.get("paper_text", "")
                pdf_b64 = body.get("pdf_base64")
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)
                title = body.get("title", "Question Paper Analysis")
                subject = body.get("subject", "Academic Course")

                analysis = gemini_client.analyze_question_paper_ai(paper_text, api_key=api_key, model=model, pdf_base64=pdf_b64)

                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO question_analyses (title, subject, raw_text, analysis_data, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                """, (title, subject, paper_text[:5000] if paper_text else "PDF Upload", json.dumps(analysis)))
                analysis_id = cursor.lastrowid
                conn.commit()
                conn.close()

                database.log_study_activity(minutes=15)

                self.send_json({
                    "id": analysis_id,
                    "title": title,
                    "subject": subject,
                    "analysis": analysis,
                    "streak": database.get_streak_info()
                })
                return

            elif path == "/api/generate-paper":
                analysis_data = body.get("analysis_data")
                config = body.get("config", {})
                api_key = body.get("api_key")
                model = body.get("model", gemini_client.DEFAULT_MODEL)

                generated = gemini_client.generate_question_paper_ai(analysis_data, config=config, api_key=api_key, model=model)

                exam_info = generated.get("exam_info", {})
                title = exam_info.get("title", "Generated Mock Question Paper")
                subject = exam_info.get("subject", "General")
                total_marks = exam_info.get("total_marks", 50)
                duration = exam_info.get("duration", "2 Hours")

                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO generated_papers (title, subject, total_marks, duration, paper_data, marking_scheme, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                """, (title, subject, total_marks, duration, json.dumps(generated.get("sections", [])), json.dumps(generated.get("marking_scheme", []))))
                paper_id = cursor.lastrowid
                conn.commit()
                conn.close()

                database.log_study_activity(minutes=15)

                self.send_json({
                    "id": paper_id,
                    "paper": generated,
                    "streak": database.get_streak_info()
                })
                return

            else:
                self.send_error_json(f"Unknown endpoint: {path}", 404)

        except Exception as e:
            traceback.print_exc()
            self.send_error_json("Internal Server Error", 500, details=str(e))

def run_server(port=PORT):
    database.init_db()
    with socketserver.ThreadingTCPServer((HOST, port), StudyAppRequestHandler) as httpd:
        print(f"\n=======================================================")
        print(f"🚀 Saraswati AI - Personal Study & PDF Summarizer")
        print(f"🔗 Local Web App: http://{HOST}:{port}")
        print(f"📚 Features: Summaries, Flashcards, Quiz, Recall Streak,")
        print(f"             Question Paper Analyzer & Generator")
        print(f"=======================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.shutdown()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port)
