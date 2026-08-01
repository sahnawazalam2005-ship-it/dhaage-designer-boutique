# Task: Fix Admin → Banners Delete Flow

## Investigation
- [x] Inspect frontend banner delete handler (`client/src/admin/Banners.jsx`)
- [x] Inspect API client (`client/src/api/client.js`)
- [x] Inspect backend banner routes (`server/routes/banners.js`)
- [x] Inspect auth middleware (`server/middleware/auth.js`)
- [x] Confirm DB path (`server/data/dhaage.db`) shared by frontend/backend
- [x] Reproduce DELETE live: returns 200 JSON, banner removed from DB
- [x] Reproduce POST /api/banners/:id → 404 HTML (root cause of "Unexpected server response.")

## Fix (smallest safe change)
- [x] `server/routes/banners.js`: wrap DELETE image-file unlink in try/catch so missing/locked file never blocks DB delete
- [x] `server/routes/banners.js`: add `router.post('/:id', ...)` update handler (mirrors PUT) so Edit/Activate/Deactivate return JSON instead of 404 HTML
- [x] `client/src/admin/Banners.jsx`: only report success when backend DELETE returns `success: true`; otherwise surface real error message

## Verify
- [x] Rebuild frontend
- [x] Restart backend
- [x] Create + delete one test banner → HTTP 200/204
- [x] Confirm banner removed from SQLite DB
- [x] Refresh Admin → Banners → banner does not return
- [x] Homepage no longer shows deleted banner
- [x] Restart server → banner stays deleted
- [x] Clean up temp repro scripts

