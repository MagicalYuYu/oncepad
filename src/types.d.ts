export interface HistoryEntry {
  id: string
  text: string
  createdAt: string
}

export interface AppConfig {
  shortcut: string
  alwaysOnTop: boolean
}

export interface ElectronAPI {
  getHistory: () => Promise<HistoryEntry[]>
  saveToHistory: (text: string) => Promise<HistoryEntry[]>
  deleteHistoryEntry: (id: string) => Promise<HistoryEntry[]>
  copyToClipboard: (text: string) => Promise<void>
  syncText: (text: string) => Promise<void>
  getConfig: () => Promise<AppConfig>
  setShortcut: (shortcut: string) => Promise<boolean>
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>
  hideWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
