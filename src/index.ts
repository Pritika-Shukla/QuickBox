import "dotenv/config"
import { app, BrowserWindow, globalShortcut, screen } from "electron"
import { openaiHandler } from "./services/openai"
import "./services/whisper"

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

if (require("electron-squirrel-startup")) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

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

app.whenReady().then(() => {
  createWindow()
  openaiHandler()
  globalShortcut.register("F9", toggleWindow)
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
