# Founder Idea Analyzer

Founder Idea Analyzer is a lightweight startup-evaluation workbench. A founder fills in the Idea Definition form, the backend generates LLM-backed scores plus a Lean Canvas draft, and the frontend visualises the results with a radar chart, mentor dashboard, and colourful UI.

## Features

- **Idea Definition Form** – Capture problem, solution, target audience, competitors, and technology choices.
- **LLM Insight Engine** – Talks to a local Ollama model to produce six quantitative scores and a Lean Canvas JSON block.
- **Mentor Dashboard** – Shows awareness delta, blind spots, revision comparisons, and a weekly summary.
- **Versioning API** – Append new revisions, list version history, and compare first vs latest to highlight deltas.
- **Responsive UI** – Modern beige theme, centered analysis results, lean canvas grid, and Chart.js radar visual.

## Tech Stack

- **Backend:** Node.js + Express, MongoDB (with in-memory fallback).
- **Frontend:** Vanilla HTML/CSS/JS with Chart.js.
- **AI:** Ollama model (defaults to `llama3.1:8b`).

## Prerequisites

- Node.js 18+
- MongoDB (local or remote) if you want persistence
- [Ollama](https://ollama.com/) running locally with the model you configure (`OLLAMA_MODEL`).

## Setup

```bash
git clone https://github.com/ata381/founder-idea-analyzer.git
cd founder-idea-analyzer
npm install
```

Create a `.env` file (copy `.env.example` if present) and set at least:

```
MONGO_URI=mongodb://127.0.0.1:27017/founder-idea
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
PORT=4000
```

Start MongoDB and Ollama locally, then run:

```bash
npm start        # runs node server.js
# or
npm run dev      # if you have nodemon installed
```

Visit <http://localhost:4000>.

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/ideas` | Create a new idea, generate insights + Lean Canvas |
| GET | `/api/ideas/:id` | Fetch idea with latest insights |
| POST | `/api/ideas/:id/versions` | Append a new revision/version |
| GET | `/api/ideas/:id/versions` | List all versions |
| GET | `/api/ideas/:id/compare` | Compare first vs latest version and return deltas |
| GET | `/health` | Simple health-check |

All idea endpoints require `LLM_PROVIDER=ollama` because the heuristic fallback has been removed.

## Development Notes

- Frontend assets live under `public/`. `public/app.js` wires the form to the API, renders charts, and drives the mentor dashboard.
- `lib/insightEngine.js` contains the prompts for score generation and Lean Canvas drafting.
- `routes/ideas.js` hosts all persistence logic and the in-memory fallback for demo scenarios.
- `scripts/` includes helper utilities for seeding and exporting demo data.

Feel free to open an issue or fork the repo if you want to extend the prompts, add tests, or plug in another LLM provider.