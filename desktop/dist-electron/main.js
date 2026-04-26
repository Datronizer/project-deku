var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, app, BrowserWindow, globalShortcut, screen, nativeImage, Tray, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
const BACKEND_URL = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";
const OLLAMA_URL = "http://localhost:11434";
async function get(baseUrl, path2) {
  const res = await fetch(`${baseUrl}${path2}`);
  if (!res.ok) throw new Error(`GET ${path2} → ${res.status}`);
  return res.json();
}
async function post(baseUrl, path2, body, timeoutMs = 1e4) {
  const res = await fetch(`${baseUrl}${path2}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`POST ${path2} → ${res.status}`);
  return res.json();
}
const backend = {
  health: () => get(BACKEND_URL, "/health"),
  analyze: (payload) => post(BACKEND_URL, "/analyze", payload)
};
const ollama = {
  generate: (req) => post(OLLAMA_URL, "/api/generate", { ...req, stream: false }, 8e3).then((data) => data.response.trim())
};
const server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  backend,
  ollama
}, Symbol.toStringTag, { value: "Module" }));
class SimpleSummarizer {
  async summarize(log) {
    const parts = [];
    const window = log.windowTitles.at(-1) ?? "unknown";
    if (log.keyCount > 0) parts.push(`typed ${log.keyCount} keys`);
    if (log.mouseClicks > 0) parts.push(`clicked ${log.mouseClicks} times`);
    if (log.windowTitles.length > 1) {
      parts.push(`switched apps ${log.windowTitles.length - 1} time${log.windowTitles.length > 2 ? "s" : ""}`);
    }
    const activity = parts.length > 0 ? parts.join(", ") : "was idle";
    return `User ${activity} in ${window} over the last ${log.durationSeconds}s`;
  }
}
const GEMMA_MODEL = "gemma3:4b";
class GemmaSummarizer {
  constructor() {
    __publicField(this, "available", null);
  }
  async summarize(log) {
    if (this.available === false) return new SimpleSummarizer().summarize(log);
    const prompt = [
      "Summarize the following desktop activity in one short, natural sentence (max 20 words).",
      "Be specific about what the user is doing. Output only the sentence, nothing else.",
      "",
      `Window: ${log.windowTitles.at(-1) ?? "unknown"}`,
      `All windows seen: ${log.windowTitles.join(" → ")}`,
      `Keystrokes: ${log.keyCount}`,
      `Mouse clicks: ${log.mouseClicks}`,
      `Duration: ${log.durationSeconds}s`
    ].join("\n");
    try {
      const { ollama: ollama2 } = await Promise.resolve().then(() => server);
      const text = await ollama2.generate({ model: GEMMA_MODEL, prompt });
      this.available = true;
      return text;
    } catch (err) {
      if (this.available === null) {
        console.warn("[deku] ollama/Gemma unavailable, falling back to simple summarizer:", err);
        this.available = false;
      }
      return new SimpleSummarizer().summarize(log);
    }
  }
}
const require$1 = createRequire(import.meta.url);
const summarizer = new GemmaSummarizer();
const INTERVAL_MS = 3e4;
const MAX_WINDOW_HISTORY = 8;
let keyCount = 0;
let mouseClicks = 0;
const windowTitles = [];
let lastWindow = "";
let lastSummary = "";
let lastCycleTime = null;
function resetLog() {
  keyCount = 0;
  mouseClicks = 0;
  windowTitles.length = 0;
  if (lastWindow) windowTitles.push(lastWindow);
}
function recordWindow(title) {
  if (title === lastWindow) return;
  lastWindow = title;
  windowTitles.push(title);
  if (windowTitles.length > MAX_WINDOW_HISTORY) windowTitles.shift();
}
async function startCapture() {
  const { uIOhook, UiohookKey } = require$1("uiohook-napi");
  uIOhook.on("keydown", () => {
    keyCount++;
  });
  uIOhook.on("click", () => {
    mouseClicks++;
  });
  uIOhook.start();
  const activeWin = require$1("active-win");
  setInterval(async () => {
    try {
      const win2 = await activeWin();
      if (win2) recordWindow(win2.title ?? win2.owner.name);
    } catch {
    }
  }, 3e3);
  setInterval(() => void runCycle(), INTERVAL_MS);
  console.log("[deku] capture started");
}
async function triggerCycle() {
  return runCycle();
}
function getDebugState() {
  return {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    lastWindow,
    lastSummary,
    lastCycleTime
  };
}
async function captureScreenshot() {
  return takeScreenshot();
}
async function runCycle() {
  const log = {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    durationSeconds: INTERVAL_MS / 1e3
  };
  resetLog();
  const [summary, screenshot] = await Promise.all([
    summarizer.summarize(log),
    takeScreenshot()
  ]);
  lastSummary = summary;
  lastCycleTime = (/* @__PURE__ */ new Date()).toISOString();
  const activeWindow = log.windowTitles.at(-1) ?? "unknown";
  console.log(`[deku] cycle — "${summary}"`);
  try {
    await backend.analyze({ summary, active_window: activeWindow, screenshot_b64: screenshot });
  } catch (err) {
    console.warn("[deku] /analyze POST failed:", err);
  }
}
async function takeScreenshot() {
  try {
    const screenshotDesktop = require$1("screenshot-desktop");
    const buf = await screenshotDesktop({ format: "jpg" });
    return buf.toString("base64");
  } catch {
    return "";
  }
}
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const DIALOGUE_PORT = 7777;
let win;
let tray = null;
function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds;
  win = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  );
  tray = new Tray(icon);
  tray.setToolTip("deku");
  const menu = Menu.buildFromTemplate([
    {
      label: "Trigger Now",
      click: () => {
        void triggerCycle();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => tray == null ? void 0 : tray.popUpContextMenu());
}
ipcMain.on("dismiss-dialogue", () => {
  win == null ? void 0 : win.setIgnoreMouseEvents(true, { forward: true });
});
ipcMain.on("dismiss-debug", () => {
  win == null ? void 0 : win.setIgnoreMouseEvents(true, { forward: true });
});
function startDialogueServer() {
  const server2 = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/dialogue") {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (win) {
          win.setIgnoreMouseEvents(false);
          win.webContents.send("show-dialogue", payload);
        }
        res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
      } catch {
        res.writeHead(400).end('{"error":"invalid json"}');
      }
    });
  });
  server2.listen(DIALOGUE_PORT, "127.0.0.1", () => {
    console.log(`[deku] dialogue server listening on 127.0.0.1:${DIALOGUE_PORT}`);
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  startDialogueServer();
  createTray();
  void startCapture();
  globalShortcut.register("CommandOrControl+Shift+9", () => {
    console.log("[deku] manual trigger");
    void triggerCycle();
  });
  globalShortcut.register("CommandOrControl+Shift+8", () => {
    console.log("[deku] screenshot trigger");
    void captureScreenshot().then((screenshotB64) => {
      if (win) {
        win.setIgnoreMouseEvents(false);
        win.webContents.send("show-debug", { ...getDebugState(), screenshotB64 });
      }
    });
  });
  globalShortcut.register("CommandOrControl+Shift+7", () => {
    console.log("[deku] debug screen");
    if (win) {
      win.setIgnoreMouseEvents(false);
      win.webContents.send("show-debug", { ...getDebugState(), screenshotB64: null });
    }
  });
  globalShortcut.register("CommandOrControl+Shift+0", () => {
    console.log("[deku] panic button pressed — quitting");
    app.quit();
  });
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
