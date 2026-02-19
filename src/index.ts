import { app, BrowserWindow, globalShortcut, screen, ipcMain } from "electron"

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

if (require("electron-squirrel-startup")) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

// ---- AI MEMORY (short-term) ----
const conversation: string[] = []

const createWindow = () => {
  const { width } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 520,
    height: 220,
    x: Math.floor((width - 520) / 2),
    y: 0,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  })

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  // Auto-hide when focus lost
  mainWindow.on("blur", () => {
    mainWindow?.hide()
  })
}

// ---- TOGGLE WINDOW ----
const toggleWindow = () => {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

// ---- OLLAMA AI HANDLER ----
ipcMain.handle("ask-ai", async (_, userInput: string) => {
  try {
    conversation.push(`User: ${userInput}`)

    const prompt = `
You are my personal desktop AI assistant.
Be concise, practical, and helpful.

Conversation:
${conversation.join("\n")}

Assistant:
`

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false,
      }),
    })

    const data = await res.json()
    conversation.push(`Assistant: ${data.response}`)

    return data.response
  } catch {
    return "❌ Ollama is not running. Please start it."
  }
})

app.whenReady().then(() => {
  createWindow()

  // SINGLE KEY TRIGGER
  globalShortcut.register("F9", toggleWindow)
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
