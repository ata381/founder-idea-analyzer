Title: Iteration 1 — Idea Submission Form

Description:
Create a clean frontend form to capture idea inputs and post them to the backend.

Fields:
- Problem (textarea)
- Solution (textarea)
- Audience (input)
- Alternatives (input)
- Technology (input)

Acceptance criteria:
- Form validates required fields (problem, solution)
- Submits to `POST /api/ideas` and shows a loading state
- Displays returned `insights` JSON or visualizations

Notes:
Keep UI minimal and demo-ready. Use existing `public/index.html` and `public/app.js` as the starting point.