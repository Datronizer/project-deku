# Project Deku - GEMINI.md

This document provides foundational instructions and context for AI agents working on **Project Deku**, a chaotic desktop AI companion inspired by Desktop Goose.

## Project Overview
Project Deku is a "disruptive" desktop agent that breaks user autopilot by observing screen activity and intervening with visual novel-style dialogue and audio. It is a monorepo consisting of an Electron-based desktop client and a FastAPI-based backend.

### Architecture
- **Desktop (Thin Client):** Built with Electron, React, and TypeScript. Responsible for system tray management, screenshot capture, global input monitoring, and displaying the overlay UI.
- **Backend (Orchestrator):** Built with FastAPI and Python. Handles AI orchestration (Gemini), screen analysis (Google Cloud Vision), voice synthesis (ElevenLabs), and task execution.

## Key Technologies
- **Frontend:** Electron, React, Vite, TypeScript, Tailwind CSS v4.
- **Backend:** FastAPI, Pydantic, `google-genai` (Gemini), ElevenLabs TTS/ConvAI, Google Cloud Vision.
- **System Integration:** `uiohook-napi` (input monitoring), `active-win` (window tracking), `screenshot-desktop` (screen capture), `@nut-tree/nut-js` (input simulation).

## Getting Started

### Prerequisites
- Node.js + npm
- Python 3.10+
- Google Cloud CLI (authenticated with ADC)

### Setup & Installation
1.  **Bootstrap:** Run `./bootstrap.sh` from the root to install all dependencies for both `desktop/` and `backend/`.
2.  **Environment Variables:**
    - **`backend/.env`**: `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`.
    - **`desktop/.env`**: `VITE_BACKEND_URL` (defaults to `http://localhost:8000`).
3.  **Google Cloud Auth:** Run `gcloud auth application-default login` for local Vision API access.

### Running the Project
- **Unified Command:** `./dev.sh` (launches both frontend and backend).
- **VS Code:** Use the **"Dev: Frontend + Backend"** launch configuration.
- **Manual (Desktop):** `cd desktop && npm run dev`
- **Manual (Backend):** `cd backend && uvicorn main:app --reload`

## Development Conventions

### Coding Standards
- **TypeScript:** Use strict typing. Prefer functional components and hooks in React.
- **Python:** Use Pydantic models for request/response validation. Use `google-genai` (import as `from google import genai`) for Gemini interactions.
- **Git:** 
    - Branch names: `feat/`, `fix/`, `chore/` followed by description.
    - Commits: Small, focused, and scanned for secrets.

### Testing
- **Backend:** `cd backend && pytest` (Use `-k "not gemma"` to skip local model tests).
- **Desktop:** `cd desktop && npm run test` (Vitest).

## Project Features & Interaction

### Keyboard Shortcuts
The following shortcuts are active globally:
- `Ctrl+Shift+9`: Force a Tier 2 (Standard) cycle.
- `Ctrl+Shift+8`: Force a Tier 3 (Screenshot/Vision) cycle.
- `Ctrl+Shift+7`: Toggle Settings/Debug Overlay.
- `Ctrl+Shift+6`: Force a Tier 1 (Text-only) cycle.
- `Ctrl+Shift+0`: Panic Button (Quit application).

### Dialogue System
- **High-Contrast UI:** Full-width bottom-docked dialogue box with solid black/white backgrounds and prominent borders for maximum visibility.
- **Interactivity:** Uses `setIgnoreMouseEvents(false)` when dialogue or settings are shown to allow mouse interaction.
- **Voice Reply:** Integrated Web Speech API support. Users can click the microphone icon to record a reply, which is transcribed and sent to the ElevenLabs agent.
- **Auto-Close:** Dialogue boxes close after a timeout, but this timer is paused while the user is actively typing or recording a response.

### AI Orchestration
- **Tiered Intervention:**
    - **Tier 1:** Text-only, periodic surprise.
    - **Tier 2:** Standard screen observer (screenshot + Vision).
    - **Tier 3:** Urgent window detection or manual force-screenshot.
- **Hackathon Context:** Both Gemini (Analysis) and ElevenLabs (Agent) are instructed with `_DEMO_CONTEXT` to respond with higher intensity and 3-4 sentence lengths for better demo impact.

## Project Structure
- `backend/`: FastAPI application, AI services, and routers.
- `desktop/`: Electron/React application.
    - `electron/`: Main process logic (capture, server, settings).
    - `src/`: React frontend (components, hooks, services).
    - `public/characters/`: Asset storage for character portraits.
- `docs/`: (Refer to `README.md`, `CLAUDE.md`, and `ELEVENLABS_INTEGRATION.md` for specific details).
