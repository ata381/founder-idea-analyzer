# Founder Idea Analyzer

This repository contains the Founder Idea Analyzer — a small platform to help founders validate ideas, generate a Lean Canvas draft, and track early awareness growth. It's designed as a frontend-first interview project with a Node.js (vanilla) + MongoDB backend.

## Goal (Interview Pre-task)
Deliver a working mini-application that demonstrates an idea analysis flow: user answers a short form → backend generates LLM-backed insights → frontend displays results (radar chart + lean canvas) → simple mentor dashboard shows awareness delta. Focus on clear UI and demo-ready flow.

## Iteration 1 — Mülakat (Interview) Delivery (English)
Purpose: produce a demoable, production-minded implementation of the Idea Analysis Module that the interviewers can run locally and review in 5–10 minutes.

Deliverables
- Working idea submission form (frontend) that posts to `POST /api/ideas` and receives `insights`.
- LLM-powered Insight Engine that outputs 6 scores (0–100) and a draft Lean Canvas JSON via Ollama.
- Radar chart visualization of the 6 scores.
- Lean Canvas grid view filled from the draft output.
- Mentor Dashboard (simple mock) showing awareness delta and blind spots.
- Clean UI and a README with setup + demo steps.

Acceptance Criteria
- End-to-end flow works locally: form → POST → saved in MongoDB → response rendered as radar + canvas.
- Visuals are responsive and demoable.
- Code structure is clear: `lib/`, `models/`, `routes/`, `public/`.
- No Docker required. Use local MongoDB (set `MONGO_URI` in `.env`).

Run locally (Windows PowerShell)
```powershell
cd c:\Users\Aakil\Documents\GitHub\founder-idea-analyzer
npm install
node server.js
# or if you prefer nodemon and PowerShell scripts are allowed:
# npm.cmd run dev
```
Open: http://localhost:4000

## Next steps (after interview)
- Iterate on LLM prompts and add tests.
- Add versioned idea edits and comparison endpoints (for Mentor Dashboard).
- Integrate local LLM for richer insights (Iteration 4).

---

If you'd like, I will create GitHub issues for all Iteration 1 tasks and link them here.