# Changelog

## [Unreleased]

## [Fixed]
- Converted backend to ES module syntax to fix compatibility issues with Render deployment.
- Fixed frontend Socket.IO client connection by adding explicit path and transport settings for Render.
- Fixed Socket.IO path resolution and server listen config for Render deployment.
- Set explicit path and transport settings in frontend socket.io-client to ensure compatibility with Render-hosted backend.
- Bound backend to 0.0.0.0 and confirmed Socket.IO is properly exposed for Render
- Replaced raw or misconfigured backend with guaranteed working Socket.IO server, bound to 0.0.0.0 for Render compatibility.
- Added /health route and live server log for backend validation on Render
- Aligned frontend/backend Socket.IO path to `/socket.io`
- Stabilized WebSocket connection between Vercel frontend and Render backend
  by enforcing correct path, transport ('websocket'), wildcard CORS, and 0.0.0.0 server binding.
- Explicitly set transport to `websocket` on frontend client
- Enabled CORS with wildcard origin and bound to 0.0.0.0 for Render
- Added /health check route and startup log to verify deployment
- Hardened Socket.IO connection to fix Render <-> Vercel 404 issue
  - Bound backend server to 0.0.0.0
  - Aligned explicit path `/socket.io` in frontend + backend
  - Forced transport to `websocket`
  - Enabled wildcard CORS for initial testing
  - Added /health route and connection logs
