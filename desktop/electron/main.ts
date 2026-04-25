import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const DIALOGUE_PORT = 7777

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
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

// When renderer dismisses dialogue, restore mouse passthrough
ipcMain.on('dismiss-dialogue', () => {
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
          // Capture mouse events so the close button is clickable
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
})
