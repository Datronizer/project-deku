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
2. Every 5–10min, a `SimpleSummarizer` batches events into a one-sentence activity summary
3. Summary + heuristics decide whether to trigger the mischief agent (Tier 1: Text-only periodic; Tier 2: Standard screen observer; Tier 3: Urgent window detection)
4. Only on trigger: screenshot → Vision API → Gemini orchestrator → dialogue

**Overlay UI (visual novel style):**
- Transparent, frameless, always-on-top Electron window covering the full screen
- **High-Contrast Design:** Full-width bottom-docked dialogue box with solid black/white backgrounds and prominent borders.
- Character portrait (still image, swappable per expression: neutral, mad, smug, etc.) with its own border.
- Dialogue box with typewriter text (large font), synced to ElevenLabs audio.
- While dialogue is active: `setIgnoreMouseEvents(false)` captures mouse events; the [dismiss] button dodges the cursor using CSS `position:fixed`.

**Screen awareness:** Desktop takes a screenshot → sends to backend → Vision API interprets it → orchestrator reacts to what the user is actually doing.

**Auth0 integration:** Auth0 AI Agents lets the orchestrator log into the user's accounts without exposing credentials.

**I/O control (Electron/desktop):** `screenshot-desktop` for screen capture, `uiohook-napi` for global input events, `active-win` for active window info.

**Cross-platform:** Mac, Windows, Linux.

## Environment Variables

Create a `.env` file in `backend/`:

```
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_CALLBACK_URL=http://localhost:8000/auth/callback
AUTH0_MGMT_CLIENT_ID=
AUTH0_MGMT_CLIENT_SECRET=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
```

Create a `.env` file in `desktop/`:

```
VITE_BACKEND_URL=http://localhost:8000
```

## Commands

### First-time setup

```bash
./bootstrap.sh    # installs all frontend and backend dependencies
```

### Running the dev servers

```bash
./dev.sh          # launches both servers concurrently
```

### Individual commands

```bash
# desktop/
npm run build     # production build → dist/

# backend/
uvicorn main:app --reload
```

## Implementation Notes

**Keyboard Shortcuts:**
- `Ctrl+Shift+9`: Force Tier 2
- `Ctrl+Shift+8`: Force Tier 3 (Screenshot)
- `Ctrl+Shift+7`: Toggle Settings
- `Ctrl+Shift+6`: Force Tier 1 (Text-only)
- `Ctrl+Shift+0`: Panic (Quit)

**Gemini SDK:** Use `google-genai`. Import as `from google import genai`; async via `client.aio.models.generate_content(...)`.

**Backend → Desktop push:** Backend POSTs `DialoguePayload` JSON to `http://127.0.0.1:7777/dialogue`.

**Audio delivery:** ElevenLabs TTS returns a `data:audio/mpeg;base64,...` URI.

**Voice Interaction:** Integrated Web Speech API in `DialogueBox.tsx`. Use the microphone button to record. Transcripts sync to the input field. Auto-close timer pauses while typing or recording.

**AI Personality:** Both Gemini and ElevenLabs are instructed with `_DEMO_CONTEXT` for the hackathon. Responses are longer (3-4 sentences) and more intense.

**Tailwind:** v4 via `@tailwindcss/vite` plugin.

**Auth0 dual-app pattern:** Regular Web App for user auth; M2M App for Management API.

**Testing:** 
- Backend: `pytest`
- Desktop: `npm run test`

## Git Conventions

- Branch and PR names: `<type>/<short-description>`
- Keep commits small and focused
- **Scan for leaked API keys before pushing**
