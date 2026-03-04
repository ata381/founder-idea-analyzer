# Founder Idea Analyzer

Founder Idea Analyzer is a lightweight startup-evaluation workbench. Founders submit an idea through a structured form, and the app generates LLM-backed scores plus a Lean Canvas draft that can be reviewed over time.

## Why this project

Early-stage ideas usually suffer from two gaps:

1. **Unstructured thinking** (great intuition, weak articulation)
2. **No revision loop** (changes happen, but insight history gets lost)

This project helps founders turn rough concepts into comparable, iterative snapshots they can discuss with mentors, teammates, or investors.

## Core Features

- **Idea Definition Form** – Capture problem, solution, target audience, competitors, and technology choices in one place.
- **LLM Insight Engine** – Uses a local Ollama model to generate six quantitative scores and a Lean Canvas JSON draft.
- **Mentor Dashboard** – Highlights awareness deltas, blind spots, revision comparisons, and a weekly summary view.
- **Versioning API** – Add revisions, browse version history, and compare first vs. latest submissions.
- **Responsive UI** – Includes a modern beige theme, centered analysis output, Lean Canvas grid, and a Chart.js radar chart.

## Use Cases

- **Solo founder pre-validation**  
  Pressure-test an idea before writing a full business plan.
- **Accelerator or incubator intake**  
  Standardize how mentors review multiple startup ideas each week.
- **Founder-mentor weekly check-ins**  
  Compare revisions over time to track learning velocity and strategic clarity.
- **Hackathon-to-startup transition**  
  Convert a prototype concept into a more structured venture hypothesis.
- **Startup education programs**  
  Use the scoring + Lean Canvas output as a teaching aid for entrepreneurship cohorts.

## Tech Stack

- **Backend:** Node.js + Express, MongoDB (with in-memory fallback)
- **Frontend:** Vanilla HTML/CSS/JS with Chart.js
- **AI:** Ollama model (defaults to `llama3.1:8b`)

## Prerequisites

- Node.js 18+
- MongoDB (local or remote) for persistence
- [Ollama](https://ollama.com/) running locally with your configured model (default: `llama3.1:8b`)

## Setup

```bash
git clone https://github.com/ata381/founder-idea-analyzer.git
cd founder-idea-analyzer
npm install
```

Create a `.env` file (copy `.env.example` if present) and set at least:

```env
MONGO_URI=mongodb://127.0.0.1:27017/founder-idea
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
PORT=4000
```

Start MongoDB and Ollama locally, then run:

```bash
npm start
# or
npm run dev
```

Visit <http://localhost:4000>.

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/ideas` | Create a new idea, generate insights + Lean Canvas |
| GET | `/api/ideas/:id` | Fetch an idea with its latest insights |
| POST | `/api/ideas/:id/versions` | Append a new revision/version |
| GET | `/api/ideas/:id/versions` | List all versions |
| GET | `/api/ideas/:id/compare` | Compare first vs. latest version and return deltas |
| GET | `/health` | Simple health check |

> All idea endpoints require `LLM_PROVIDER=ollama` because the heuristic fallback has been removed.

## Development Notes

- Frontend assets live under `public/`; `public/app.js` wires form submission, chart rendering, and mentor dashboard behavior.
- `lib/insightEngine.js` contains prompt logic for score generation and Lean Canvas drafting.
- `routes/ideas.js` contains persistence logic and the in-memory fallback for demo scenarios.
- `scripts/` includes helper utilities for seeding and exporting demo data.

Contributions are welcome—open an issue or fork the repo to extend prompts, add test coverage, or integrate additional LLM providers.
