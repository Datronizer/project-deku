import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, agent, auth


logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s — %(message)s")

app = FastAPI(title="project-deku backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(agent.router)
app.include_router(auth.router)


@app.get("/health")
def health():
    return {"status": "ok"}
