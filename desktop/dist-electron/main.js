import { ipcMain, app, BrowserWindow, globalShortcut, screen, nativeImage, Tray, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
const BACKEND_URL = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";
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
const URGENT_PATTERNS = [
  // Social media
  { pattern: /\btwitter\b|\bx\.com\b/i, category: "social" },
  { pattern: /\binstagram\b/i, category: "social" },
  { pattern: /\btiktok\b/i, category: "social" },
  { pattern: /\bfacebook\b/i, category: "social" },
  { pattern: /\breddit\b/i, category: "social" },
  { pattern: /\blinkedin\b/i, category: "social" },
  { pattern: /\bsnapchat\b/i, category: "social" },
  // Streaming / video
  { pattern: /\byoutube\b/i, category: "streaming" },
  { pattern: /\bnetflix\b/i, category: "streaming" },
  { pattern: /\btwitch\b/i, category: "streaming" },
  { pattern: /\bhulu\b/i, category: "streaming" },
  { pattern: /disney\+|disney plus/i, category: "streaming" },
  // Gaming
  { pattern: /\bsteam\b/i, category: "gaming" },
  { pattern: /\bepic games\b/i, category: "gaming" },
  { pattern: /\bgog\b/i, category: "gaming" },
  { pattern: /league of legends/i, category: "gaming" },
  { pattern: /\bminecraft\b/i, category: "gaming" },
  { pattern: /\bvalorant\b/i, category: "gaming" },
  { pattern: /\broblox\b/i, category: "gaming" }
];
const require$1 = createRequire(import.meta.url);
const summarizer = new SimpleSummarizer();
const T1_MIN_MS = 25 * 6e4;
const T1_MAX_MS = 45 * 6e4;
const T1_COOLDOWN_MS = 20 * 6e4;
const T2_MIN_MS = 5 * 6e4;
const T2_MAX_MS = 10 * 6e4;
const T3_COOLDOWN_MS = 3 * 6e4;
const MAX_WINDOW_HISTORY = 8;
let keyCount = 0;
let mouseClicks = 0;
const windowTitles = [];
let lastWindow = "";
let lastSummary = "";
let lastCycleTime = null;
let lastTier1Time = 0;
const lastTier3CategoryTime = /* @__PURE__ */ new Map();
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
function snapshotLog(durationMs) {
  return {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    durationSeconds: durationMs / 1e3
  };
}
async function startCapture() {
  const { uIOhook } = require$1("uiohook-napi");
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
      if (win2) {
        const title = win2.title ?? win2.owner.name;
        recordWindow(title);
        checkTier3(title);
      }
    } catch {
    }
  }, 3e3);
  startTier1();
  startTier2();
  console.log("[deku] capture started");
}
function startTier1() {
  const delay = T1_MIN_MS + Math.random() * (T1_MAX_MS - T1_MIN_MS);
  setTimeout(async () => {
    const now = Date.now();
    if (now - lastTier1Time >= T1_COOLDOWN_MS) {
      const log = snapshotLog(delay);
      resetLog();
      lastTier1Time = Date.now();
      await runCycle(log, 1);
    }
    startTier1();
  }, delay);
}
function startTier2() {
  const scheduleNext = () => {
    const interval = T2_MIN_MS + Math.random() * (T2_MAX_MS - T2_MIN_MS);
    setTimeout(async () => {
      const log = snapshotLog(interval);
      resetLog();
      await runCycle(log, 2);
      scheduleNext();
    }, interval);
  };
  scheduleNext();
}
function checkTier3(title) {
  for (const { pattern, category } of URGENT_PATTERNS) {
    if (!pattern.test(title)) continue;
    const now = Date.now();
    if (now - (lastTier3CategoryTime.get(category) ?? 0) < T3_COOLDOWN_MS) return;
    lastTier3CategoryTime.set(category, now);
    console.log(`[deku] tier3 — ${category} detected: "${title}"`);
    const log = snapshotLog(0);
    void runCycle(log, 3);
    return;
  }
}
async function triggerCycle(tier = 2) {
  const log = snapshotLog((T2_MIN_MS + T2_MAX_MS) / 2);
  resetLog();
  return runCycle(log, tier);
}
function getDebugState() {
  const now = Date.now();
  return {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    lastWindow,
    lastSummary,
    lastCycleTime,
    tier3Cooldowns: Object.fromEntries(
      [...lastTier3CategoryTime.entries()].map(([cat, t]) => [
        cat,
        Math.max(0, Math.ceil((t + T3_COOLDOWN_MS - now) / 1e3))
      ])
    )
  };
}
async function runCycle(log, tier) {
  const summary = await summarizer.summarize(log);
  lastSummary = summary;
  lastCycleTime = (/* @__PURE__ */ new Date()).toISOString();
  const activeWindow = log.windowTitles.at(-1) ?? "unknown";
  console.log(`[deku] tier${tier} — "${summary}"`);
  if (tier !== 1) {
    console.log(`[deku] tier${tier} — screenshot firing`);
  }
  const screenshot = tier === 1 ? "" : await takeScreenshot();
  if (tier !== 1 && !screenshot) {
    console.warn(`[deku] tier${tier} — screenshot is empty, vision API will be skipped in backend`);
  }
  try {
    await backend.analyze({ summary, active_window: activeWindow, screenshot_b64: screenshot, tier });
  } catch (err) {
    console.warn(`[deku] tier${tier} /analyze failed:`, err);
  }
}
async function takeScreenshot() {
  try {
    const screenshotDesktop = require$1("screenshot-desktop");
    const buf = await screenshotDesktop({ format: "jpg" });
    return buf.toString("base64");
  } catch (err) {
    if (process.platform === "linux") {
      console.log("[deku] screenshot-desktop failed, trying linux fallbacks...");
      const tmpPath = path.join(os.tmpdir(), `deku-snap-${Date.now()}.jpg`);
      try {
        try {
          execSync(`spectacle -b -n -o "${tmpPath}"`, { stdio: "ignore" });
        } catch {
          try {
            execSync(`scrot -z "${tmpPath}"`, { stdio: "ignore" });
          } catch {
            execSync(`gnome-screenshot -f "${tmpPath}"`, { stdio: "ignore" });
          }
        }
        if (fs.existsSync(tmpPath)) {
          const buf = fs.readFileSync(tmpPath);
          fs.unlinkSync(tmpPath);
          return buf.toString("base64");
        }
      } catch (fallbackErr) {
        console.error("[deku] all Linux screenshot methods failed:", fallbackErr);
      }
    } else {
      console.error("[deku] screenshot-desktop failed:", err);
    }
    return "";
  }
}
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
ipcMain.on("dismiss-settings", () => {
  win == null ? void 0 : win.setIgnoreMouseEvents(true, { forward: true });
});
function startDialogueServer() {
  const server = http.createServer((req, res) => {
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
  server.listen(DIALOGUE_PORT, "127.0.0.1", () => {
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
    console.log("[deku] manual trigger (T2)");
    void triggerCycle(2);
  });
  globalShortcut.register("CommandOrControl+Shift+8", () => {
    console.log("[deku] screenshot trigger (T3)");
    void triggerCycle(3);
  });
  globalShortcut.register("CommandOrControl+Shift+6", () => {
    console.log("[deku] text trigger (T1)");
    void triggerCycle(1);
  });
  globalShortcut.register("CommandOrControl+Shift+7", () => {
    console.log("[deku] settings screen");
    if (win) {
      win.setIgnoreMouseEvents(false);
      win.webContents.send("show-settings", {
        debugState: getDebugState()
      });
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
