# Project Deku

An ecosystem of AI agents that performs simple daily tasks in the most unnecessarily complex way possible. Users speak to a Google Nest Mini 2; a swarm of AI agents deliberates out loud before doing anything.

## Prerequisites

- Node.js + npm
- Python 3.10+
- VS Code with the [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)

## Getting Started

**1. Clone the repo**

```bash
git clone <repo-url>
cd project-deku
```

**2. Set up environment variables**

Create a `.env` file in the root directory:

```
GEMINI_API_KEY=
GOOGLE_HOME_API_KEY=
ELEVENLABS_API_KEY=
```

Ask a teammate for the actual values.

**3. Bootstrap**

```bash
./bootstrap.sh
```

This installs all frontend and backend dependencies in one shot.

**4. Run the project**

In VS Code, open the Run & Debug panel (`Ctrl+Shift+D`), select **Dev: Frontend + Backend**, and press the play button. The frontend and backend will each open in their own terminal.

No VS Code? Use the fallback:

```bash
./dev.sh
```

## Project Structure

```
frontend/         # React + Vite web UI (testing, config, debugging)
backend/          # FastAPI backend + AI agent orchestrator
google-nest-app/  # Placeholder for potential Nest app (Home API deprecated)
```

## Contributing

- Branch names: `feat/`, `fix/`, `chore/`, etc. followed by a short description
- Keep commits small and focused
- **Scan every commit for API keys before pushing**
