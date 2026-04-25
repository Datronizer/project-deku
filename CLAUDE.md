# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Project Deku is a chaotic desktop AI agent that runs in the background and deliberately disrupts the user — inspired by Desktop Goose. It observes what you're doing on screen and intervenes by popping up a visual novel-style dialogue overlay: a character portrait with a dialogue box and ElevenLabs voice. The agent reacts to your activity in funny, unexpected ways to break your autopilot state.

**The thesis:** Every productivity tool makes your computer more obedient. This one gives the computer its own agenda. It targets the real problem of passive screen dependency — people spend hours in a zombie-like state, and polite reminders don't break that habit. Chaos does.

**BearHacks 2026 — "Break the Norm"** (April 24–26, Sheridan HMC Campus, 36-hour hackathon)

Target prize tracks: Most Fun Project, Best Use of ElevenLabs, Best Use of Google Cloud Vision API, MLH Best Use of Auth0, Best UI/UX Design.

## Architecture

Monorepo with two sub-projects:

- `desktop/` — Electron app (JS/TS + React); system tray, config UI, screenshot capture, I/O execution
- `backend/` — FastAPI (Python) deployed on Vultr; AI orchestration, all external API calls

The desktop app is a thin client. It captures screenshots and sends them to the backend, receives action commands, and executes them locally. All intelligence lives on the server.

```
[Electron desktop]               [Vultr — FastAPI]
  React config UI           ←→    Gemini orchestrator + sub-agents
  System tray                      Google Cloud Vision API
  Screenshot capture        →      ElevenLabs TTS
  Mouse/keyboard/audio exec ←      Auth0 AI Agents
```

**Agent model:** Orchestrator agent picks a mischief goal based on what's on screen, spawns sub-agents that each control one action primitive. Agents deliberate out loud before acting.

**Event pipeline (tiered to minimize API costs):**
1. `uiohook-napi` + `active-win` continuously capture raw local events (keystrokes, mouse, active window title) — free, no API calls
2. Every ~30s, a local Gemma 4 model batches events into a one-sentence activity summary (e.g. "User has been typing in VS Code for 2 minutes")
3. Summary + heuristics decide whether to trigger the mischief agent (e.g. deep focus → disrupt, idle → taunt on return, rapid app-switching → pile on)
4. Only on trigger: screenshot → Vision API → Gemini orchestrator → dialogue

**Overlay UI (visual novel style):**
- Transparent, frameless, always-on-top Electron window covering the full screen
- Character portrait (still image, swappable per expression: neutral, mad, smug, etc.)
- Dialogue box with typewriter text, synced to ElevenLabs audio
- While dialogue is active: `setIgnoreMouseEvents(false)` captures mouse events; if cursor approaches the close area, `@nut-tree/nut-js` shoves it away, portrait swaps to mad, agent scolds the user before resuming

**Screen awareness:** Desktop takes a screenshot → sends to backend → Vision API interprets it → orchestrator reacts to what the user is actually doing.

**Auth0 integration:** Auth0 AI Agents lets the orchestrator log into the user's accounts without exposing credentials — enables web-based mischief.

**I/O control (Electron/desktop):** `@nut-tree/nut-js` for mouse/keyboard, `screenshot-desktop` for screen capture, `uiohook-napi` for global input events, `active-win` for active window info, Electron's built-in `Tray` API for system tray.

**Cross-platform:** Mac, Windows, Linux.

## Environment Variables

Create a `.env` file in `backend/`:

```
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
GOOGLE_CLOUD_VISION_API_KEY=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
```

Create a `.env` file in `desktop/`:

```
VITE_BACKEND_URL=http://localhost:8000   # or Vultr URL in production
```

## Commands

### First-time setup

```bash
./bootstrap.sh    # installs all frontend and backend dependencies
```

### Running the dev servers

**VS Code:** Select `Dev: Frontend + Backend` in the Run & Debug panel and press the play button. This opens the backend and frontend each in their own integrated terminal with full debug support (requires the Python extension for `debugpy`).

**Terminal fallback:**

```bash
./dev.sh          # launches both servers concurrently; Ctrl+C stops both
```

### Individual commands

```bash
# desktop/
npm run build     # production build → dist/

# backend/
uvicorn main:app --reload
```

## Git Conventions

- Branch and PR names: `<type>/<short-description>` (e.g. `feat/voice-orchestrator`, `fix/home-webhook`)
- Keep commits small and focused — one logical change per commit
- **All commits must be scanned for leaked API keys before pushing**
