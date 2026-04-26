import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import { startCapture, triggerCycle, getDebugState, captureScreenshot } from './capture/index.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const DIALOGUE_PORT = 7777

let win: BrowserWindow | null
let tray: Tray | null = null

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds
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
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.setIgnoreMouseEvents(true, { forward: true })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createTray() {
  // Blank 1×1 transparent icon — replace with a real icon asset if desired
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  )
  tray = new Tray(icon)
  tray.setToolTip('deku')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Trigger Now',
      click: () => { void triggerCycle() },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => tray?.popUpContextMenu())
}

// When renderer dismisses dialogue or debug screen, restore mouse passthrough
ipcMain.on('dismiss-dialogue', () => {
  win?.setIgnoreMouseEvents(true, { forward: true })
})
ipcMain.on('dismiss-debug', () => {
  win?.setIgnoreMouseEvents(true, { forward: true })
})

// Small HTTP server so the backend can push dialogue events
function startDialogueServer() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/dialogue') {
      res.writeHead(404).end()
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        if (win) {
          win.setIgnoreMouseEvents(false)
          win.webContents.send('show-dialogue', payload)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
      } catch {
        res.writeHead(400).end('{"error":"invalid json"}')
      }
    })
  })

  server.listen(DIALOGUE_PORT, '127.0.0.1', () => {
    console.log(`[deku] dialogue server listening on 127.0.0.1:${DIALOGUE_PORT}`)
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  startDialogueServer()
  createTray()
  void startCapture()

  // Ctrl+Shift+9 — force an immediate cycle
  globalShortcut.register('CommandOrControl+Shift+9', () => {
    console.log('[deku] manual trigger')
    void triggerCycle()
  })

  // Ctrl+Shift+8 — take screenshot and show debug overlay with it
  globalShortcut.register('CommandOrControl+Shift+8', () => {
    console.log('[deku] screenshot trigger')
    void captureScreenshot().then(screenshotB64 => {
      if (win) {
        win.setIgnoreMouseEvents(false)
        win.webContents.send('show-debug', { ...getDebugState(), screenshotB64 })
      }
    })
  })

  // Ctrl+Shift+7 — toggle debug overlay (no screenshot)
  globalShortcut.register('CommandOrControl+Shift+7', () => {
    console.log('[deku] debug screen')
    if (win) {
      win.setIgnoreMouseEvents(false)
      win.webContents.send('show-debug', { ...getDebugState(), screenshotB64: null })
    }
  })

  // Ctrl+Shift+0 — panic button
  globalShortcut.register('CommandOrControl+Shift+0', () => {
    console.log('[deku] panic button pressed — quitting')
    app.quit()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
