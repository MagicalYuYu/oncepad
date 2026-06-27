import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

process.env.DIST = path.join(__dirname, '../dist')

let win: BrowserWindow | null = null
let currentText = ''
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Config and history file paths
const configPath = path.join(app.getPath('userData'), 'config.json')
const historyPath = path.join(app.getPath('userData'), 'history.json')

const defaultMod = 'Control'

interface Config {
  shortcut: string
  alwaysOnTop: boolean
}

interface HistoryEntry {
  id: string
  text: string
  createdAt: string
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return {
        shortcut: saved.shortcut || `${defaultMod}+J`,
        alwaysOnTop: saved.alwaysOnTop === true,
      }
    }
  } catch {}
  return {
    shortcut: `${defaultMod}+J`,
    alwaysOnTop: false,
  }
}

function saveConfig(config: Config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

function loadHistory(): HistoryEntry[] {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    }
  } catch {}
  return []
}

function saveHistory(history: HistoryEntry[]) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
}

function createWindow(config: Config) {
  win = new BrowserWindow({
    width: 700,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    frame: false,
    show: false,
    skipTaskbar: false,
    alwaysOnTop: config.alwaysOnTop,
  })

  win.on('ready-to-show', () => {
    win?.show()
    win?.focus()
  })


  win.on('closed', () => {
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

function toggleWindow() {
  if (!win) {
    createWindow(loadConfig())
    return
  }
  if (win.isVisible()) {
    copyText()
    if (process.platform === 'darwin') {
      app.hide()
    } else {
      win.hide()
    }
  } else {
    win.show()
    win.focus()
  }
}

function copyText() {
  if (currentText.trim()) {
    clipboard.writeText(currentText)
  }
}

const shortcutValidator = /^(Command|Control|Alt|Shift|Meta|Super)(\+(Command|Control|Alt|Shift|Meta|Super))*\+[A-Za-z0-9]$/

function registerShortcut(config: Config) {
  globalShortcut.unregisterAll()
  try {
    globalShortcut.register(config.shortcut, toggleWindow)
  } catch {
    globalShortcut.register(`${defaultMod}+J`, toggleWindow)
  }
}

app.whenReady().then(() => {
  const config = loadConfig()
  createWindow(config)
  registerShortcut(config)

  // IPC handlers
  ipcMain.handle('get-history', () => {
    return loadHistory()
  })

  ipcMain.handle('save-to-history', (_event, text: string) => {
    if (!text.trim()) return loadHistory()
    const history = loadHistory()
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
    }
    history.unshift(entry)
    // Keep up to 100 entries
    if (history.length > 100) {
      history.splice(100)
    }
    saveHistory(history)
    return history
  })

  ipcMain.handle('delete-history-entry', (_event, id: string) => {
    let history = loadHistory()
    history = history.filter(h => h.id !== id)
    saveHistory(history)
    return history
  })

  ipcMain.handle('copy-to-clipboard', (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('sync-text', (_event, text: string) => {
    currentText = text
  })

  ipcMain.handle('get-config', () => {
    return loadConfig()
  })

  ipcMain.handle('set-shortcut', (_event, shortcut: string) => {
    if (!shortcutValidator.test(shortcut)) return false
    const config = loadConfig()
    config.shortcut = shortcut
    saveConfig(config)
    registerShortcut(config)
    return true
  })

  ipcMain.handle('set-always-on-top', (_event, alwaysOnTop: boolean) => {
    const config = loadConfig()
    config.alwaysOnTop = alwaysOnTop === true
    saveConfig(config)
    win?.setAlwaysOnTop(config.alwaysOnTop)
    return config.alwaysOnTop
  })

  ipcMain.handle('hide-window', () => {
    win?.hide()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!win) {
    createWindow(loadConfig())
  } else {
    win.show()
    win.focus()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
