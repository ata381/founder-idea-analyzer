# Issue: Version 0 - Catch-all route causes path-to-regexp error

## Summary
When running the server (Node v24+) the app throws:

```
PathError [TypeError]: Missing parameter name at index 1: *
```

This was caused by using an Express route pattern `'*'` (or similar) that `path-to-regexp` tried to parse as a parameter. The error prevented the server from starting.

## Steps to reproduce
1. Clone the repo
2. Install deps
3. Run `node server.js` or `npm run dev` (PowerShell may require `npm.cmd run dev`)

## Observed behavior
Server crashes with `PathError [TypeError]: Missing parameter name at index N: *` and stack trace pointing to `server.js` where a catch-all route was registered.

## Root cause
Using `app.get('*', ...)` leads `path-to-regexp` to attempt parameter parsing on `*` which isn't a valid named parameter. This surfaced in newer versions of dependencies that rely on `path-to-regexp`.

## Fix implemented
- Replaced the catch-all `app.get('*', ...)` with a generic fallback `app.use((req, res) => ...)` to serve `public/index.html` without using a path pattern that `path-to-regexp` would parse.
- Added `start` and `dev` npm scripts to `package.json` for easier local runs.

## Remaining notes
- PowerShell can block `npm` script execution because of execution policy (`npm.ps1`), so either run `npm.cmd run dev`, use `node server.js`, or adjust `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Suggested follow-ups
- Add a test for the health route and the static file fallback.
- Consider adding a small README section describing local dev steps on Windows.

---

If you'd like, I can open this as a GitHub issue for you (I can attempt with the `gh` CLI if you have it authenticated), or push the local commit and create a PR.