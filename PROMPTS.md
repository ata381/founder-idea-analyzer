# Prompt Templates and Tuning (Ollama)

This file documents the prompt templates used by the app when `LLM_PROVIDER=ollama` and explains how to tune them.

Environment flags
- `LLM_PROVIDER=ollama` — enable calling the local Ollama HTTP API.
- `OLLAMA_HOST` — base URL for Ollama (default `http://127.0.0.1:11434`).
- `OLLAMA_MODEL` — model name to request from Ollama (default `llama3.1:8b`).

Files that use these prompts
- `lib/insightEngine.js` — prompts for generating numerical scores and drafting a Lean Canvas.
- `lib/versionUtils.js` — prompt for explaining deltas and producing mentor-style suggestions.

General guidelines
- Ask the model to output strict JSON when the server expects machine-readable fields. JSON-only responses reduce parsing errors.
- Keep prompts explicit about expected keys and value types (e.g. numbers 0–100) to simplify normalization.
- Include the raw inputs (`problem`, `solution`, `audience`, `alternatives`, `technology`) in the prompt so the model has full context.
- Provide a short format example in the prompt when you expect a tight response shape.

1) Scoring prompt (used by `generateScoresLLM`)

Purpose: produce a compact JSON object with the six numeric scores used by the app.

Template (conceptual):
```
You are a concise analyst. Input:
<JSON of inputs>

Produce JSON only with these keys and numeric 0-100 values (keep the entire response under ~120 characters):
problemValidationScore, marketMaturity, competitionDensity, differentiationPotential, technicalFeasibility, riskAndUncertainty

Example output:
{"problemValidationScore":72,"marketMaturity":45,"competitionDensity":60,"differentiationPotential":30,"technicalFeasibility":55,"riskAndUncertainty":40}
```

Tuning tips:
- Ask for confidence or short rationale in a separate call if you want explainability (avoid mixing with the strict JSON output).
- If the model consistently produces values out of range or non-JSON, add a stronger instruction such as `Respond with JSON only, no explanation` or wrap the JSON in a code block (but still prefer raw JSON).

2) Lean Canvas drafting prompt (used by `draftLeanCanvasLLM`)

Purpose: produce a JSON representation of a lightweight Lean Canvas using the founder inputs.

Template (conceptual):
```
You are an assistant that drafts a lean canvas. Input:
<JSON of inputs>

Respond with JSON only. Fields to include: Problem, Solution, SuggestedSolution, UniqueValueProposition, CustomerSegments, Channels, RevenueModel, CostStructure, KeyMetrics, Advantage. Keep each field under ~40 words.
```

Tuning tips:
- Encourage brevity with `Keep each field short (1-2 sentences)`.
- If you want more creative suggestions, add `Be creative` to the prompt; if you want conservative suggestions, add `Be conservative and literal`.

3) Explain deltas prompt (used by `explainDeltas`)

Purpose: given the FIRST and LATEST version inputs and the numeric DELTAS, produce a short mentor-style explanation and 2-3 actionable suggestions.

Template (conceptual):
```
You are a concise mentor for startup founders.

FIRST VERSION:
<JSON of first version inputs>

LATEST VERSION:
<JSON of latest version inputs>

DELTAS:
<JSON of numeric deltas>

Provide a short, clear explanation of the deltas and 2-3 actionable suggestions for the founder. Keep the response under 200 words.
```

Tuning tips:
- If you need the explanation in a specific tone, prepend `Use a supportive and constructive tone` or `Use a critical, data-driven tone`.
- Keep the response length bounded to avoid overly long results (e.g., `Keep the response under 200 words`).

Operational considerations
- Prompt iteration: update these templates in `lib/insightEngine.js` and `lib/versionUtils.js` to quickly iterate on model behavior. If you prefer, we can externalize prompts into `prompts/*.json` and load them at runtime.
- Rate and latency: calling LLMs introduces latency. Consider caching repeated calls for the same inputs or issuing LLM requests asynchronously where possible.

Examples
- Scoring example prompt (actual call uses the input inline):
```
Input JSON: {"problem":"Users get lost in setup and churn","solution":"A guided checklist","audience":"SaaS PMs","alternatives":"docs, support","technology":"web, analytics"}

Respond with JSON only: {"problemValidationScore":..., ...}
```

- Explain example prompt:
```
FIRST VERSION: { ... }
LATEST VERSION: { ... }
DELTAS: {"problemValidationScore":{"from":40,"to":65,"delta":25}, ...}

Provide a concise mentor explanation and 2 actions.
```

If you'd like, I can:
- extract these templates into `prompts/` JSON files and load them at startup,
- add a short CLI or script to test and iterate on prompts quickly against your local Ollama instance,
- or produce a smaller `PROMPTS_SHORT.md` that you can copy into a UI for non-technical owners.

---
Last updated: 2025-11-19
