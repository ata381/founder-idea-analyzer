Title: Iteration 1 — Backend API for Ideas

Description:
Implement `POST /api/ideas` and `GET /api/ideas/:id`.

Acceptance criteria:
- `POST /api/ideas` validates inputs, invokes insight engine, saves idea+insights to MongoDB, returns 201 with saved object.
- `GET /api/ideas/:id` returns the idea if exists (200) or 404 if not.
- Errors return proper HTTP status codes and JSON messages.

Notes:
Use `models/Idea.js` and `routes/ideas.js` (already present); review and improve validation if needed.