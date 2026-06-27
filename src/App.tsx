import { useState, useEffect, useRef, useCallback } from 'react'
import type { HistoryEntry } from './types'

function App() {
  const [text, setText] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toggleShortcut, setToggleShortcut] = useState('')
  const [toggleShortcutInput, setToggleShortcutInput] = useState('')
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [recording, setRecording] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : ''
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    window.electronAPI.getHistory().then(setHistory)
    window.electronAPI.getConfig().then((config) => {
      setToggleShortcut(config.shortcut)
      setToggleShortcutInput(config.shortcut)
      setAlwaysOnTop(config.alwaysOnTop)
    })
  }, [])

  // Sync text to main process for copy shortcut
  useEffect(() => {
    window.electronAPI.syncText(text)
  }, [text])

  useEffect(() => {
    if (!showHistory && !showSettings) {
      textareaRef.current?.focus()
    }
  }, [showHistory, showSettings])

  const saveCurrentText = useCallback(async () => {
    if (text.trim()) {
      const updated = await window.electronAPI.saveToHistory(text)
      setHistory(updated)
    }
  }, [text])

  const handleNew = useCallback(async () => {
    await saveCurrentText()
    setText('')
    textareaRef.current?.focus()
  }, [saveCurrentText])

  const handleCopy = useCallback(async () => {
    if (!text.trim()) return
    await window.electronAPI.copyToClipboard(text)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1500)
  }, [text])

  const handleSelectHistory = useCallback(async (entry: HistoryEntry) => {
    if (text.trim()) {
      const updated = await window.electronAPI.saveToHistory(text)
      setHistory(updated)
    }
    setText(entry.text)
    setShowHistory(false)
    textareaRef.current?.focus()
  }, [text])

  const handleDeleteHistory = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = await window.electronAPI.deleteHistoryEntry(id)
    setHistory(updated)
  }, [])

  const handleShortcutKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta']
    if (modifierKeys.includes(e.key)) return

    const parts: string[] = []
    if (e.metaKey) parts.push('Command')
    if (e.ctrlKey) parts.push('Control')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    parts.push(key)

    setToggleShortcutInput(parts.join('+'))
    setRecording(false)
  }, [recording])

  const handleSaveToggleShortcut = useCallback(async () => {
    if (toggleShortcutInput.trim()) {
      const success = await window.electronAPI.setShortcut(toggleShortcutInput)
      if (success) {
        setToggleShortcut(toggleShortcutInput)
      }
    }
  }, [toggleShortcutInput])

  const handleAlwaysOnTopChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked
    const applied = await window.electronAPI.setAlwaysOnTop(next)
    setAlwaysOnTop(applied)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showHistory) {
        setShowHistory(false)
      } else if (showSettings) {
        setShowSettings(false)
      } else {
        window.electronAPI.hideWindow()
      }
    }
  }, [showHistory, showSettings])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }

  const truncate = (s: string, len: number) => {
    const line = s.split('\n')[0]
    return line.length > len ? line.slice(0, len) + '...' : line
  }

  return (
    <div className="app" onKeyDown={handleKeyDown}>
      {/* Titlebar (drag region) */}
      <div className="titlebar">
        <span className="titlebar-text">One-Time Editor</span>
        <div className="titlebar-buttons">
          <button
            className="btn btn-new"
            onClick={handleNew}
            title="New"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          <button
            className={`btn btn-copy ${copyFeedback ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy"
          >
            {copyFeedback ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            className={`btn btn-history ${showHistory ? 'active' : ''}`}
            onClick={() => { setShowHistory(!showHistory); setShowSettings(false) }}
            title="History"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            className={`btn btn-settings ${showSettings ? 'active' : ''}`}
            onClick={() => { setShowSettings(!showSettings); setShowHistory(false) }}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            className="btn btn-theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="main-area">
        <textarea
          ref={textareaRef}
          className="editor"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type here..."
          spellCheck={false}
          autoFocus
        />

        {/* History panel */}
        {showHistory && (
          <div className="panel history-panel">
            <div className="panel-header">
              <h3>History</h3>
            </div>
            <div className="panel-content">
              {history.length === 0 ? (
                <div className="empty-message">No history</div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="history-item"
                    onClick={() => handleSelectHistory(entry)}
                  >
                    <div className="history-item-text">
                      {truncate(entry.text, 60)}
                    </div>
                    <div className="history-item-footer">
                      <span className="history-item-date">
                        {formatDate(entry.createdAt)}
                      </span>
                      <button
                        className="history-delete-btn"
                        onClick={(e) => handleDeleteHistory(entry.id, e)}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="panel settings-panel">
            <div className="panel-header">
              <h3>Settings</h3>
            </div>
            <div className="panel-content">
              <div className="settings-item">
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Always on Top</div>
                    <div className="setting-description">
                      Keep this window above other applications.
                    </div>
                  </div>
                  <label className="switch" htmlFor="always-on-top-toggle">
                    <input
                      id="always-on-top-toggle"
                      type="checkbox"
                      checked={alwaysOnTop}
                      onChange={handleAlwaysOnTopChange}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>
              <div className="settings-item">
                <div className="settings-label">Toggle Window</div>
                <div className="shortcut-current">
                  Current: <code>{toggleShortcut}</code>
                </div>
                <input
                  type="text"
                  className={`shortcut-input ${recording ? 'recording' : ''}`}
                  value={recording ? 'Press keys...' : toggleShortcutInput}
                  onKeyDown={handleShortcutKeyDown}
                  onFocus={() => setRecording(true)}
                  onBlur={() => setRecording(false)}
                  readOnly
                  placeholder="Click to record shortcut"
                />
                <button className="btn-save" onClick={handleSaveToggleShortcut}>
                  Save
                </button>
                <div className="shortcut-hint">
                  Hiding the window also copies the editor text to clipboard.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
