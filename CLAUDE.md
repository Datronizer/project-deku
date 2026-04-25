# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Project Deku is a Rube-Goldberg-style ecosystem of AI agents that intentionally performs simple daily tasks in the most complex, inefficient way possible. Users interact via a Google Nest Mini 2; all agents deliberate out loud before acting. Agent voices are synthesized via ElevenLabs.

## Architecture

Monorepo with two sub-projects:

- `frontend/` — React + Vite web UI for testing, debugging, and configuring agents
- `backend/` — FastAPI backend; handles Google Home device communication, orchestrates AI agents

**Agent model:** A single orchestrator agent spawns and coordinates sub-agents. Agents are powered by Vertex AI (Gemini). Voice output goes through ElevenLabs.

**Google Home integration:** The Nest Mini 2 communicates with the backend API (exact integration method TBD). A `google-nest-app/` directory exists in case a custom app is needed, but note that the Google Home API is deprecated — avoid building against it.

## Environment Variables

Create a `.env` file in the repo root:

```
GEMINI_API_KEY=
GOOGLE_HOME_API_KEY=
ELEVENLABS_API_KEY=
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
# frontend/
npm run build     # production build → dist/

# backend/
uvicorn main:app --reload
```

## Git Conventions

- Branch and PR names: `<type>/<short-description>` (e.g. `feat/voice-orchestrator`, `fix/home-webhook`)
- Keep commits small and focused — one logical change per commit
- **All commits must be scanned for leaked API keys before pushing**
