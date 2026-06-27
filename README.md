# One-Time Editor

A lightweight scratchpad that lives one shortcut away. Draft a message, hit the shortcut again, and it's already on your clipboard — ready to paste anywhere.

Built for the workflow of writing chat messages, AI prompts, and quick notes that you type once and send.

## Download

Pre-built binaries for macOS, Windows, and Linux are available on the [Releases](https://github.com/lef237/one-time-editor/releases) page.

## How it works

1. Press `Ctrl+J` to summon the editor
2. Type your text
3. Press the shortcut again — the window disappears and your text is copied to clipboard
4. Paste wherever you need it

That's it. No save dialog, no file management, no friction.

The shortcut is fully customizable — open settings and press your preferred key combination to change it.

## Features

- **Instant toggle** — Global shortcut brings up the editor from any app, and hides it just as fast
- **Auto-copy on hide** — Text is copied to clipboard when the window is dismissed via shortcut
- **Focus restore** — On macOS, focus returns to the app you were using before
- **History** — Past entries are saved automatically when you start a new draft (up to 100)
- **Dark / Light theme** — Toggle between dark and light mode
- **Configurable shortcut** — Change the global shortcut in settings by pressing your desired key combination

## Development

```bash
npm install
npm run dev
```

## Tech Stack

Electron + React + TypeScript, bundled with Vite.
