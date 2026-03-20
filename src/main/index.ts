import path, { join } from 'path'
import fs from 'fs'
import type { App, NativeTheme, IpcMain } from 'electron'

import { registerFsHandlers } from './ipc/fsHandlers'
import { registerLlmHandlers } from './ipc/llmHandlers'
import { registerGitHandlers } from './ipc/gitHandlers'
import { registerGitHubHandlers } from './ipc/githubHandlers'
import { registerTerminalHandlers } from './ipc/terminalHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { terminalService } from './services/TerminalService'
import { settingsService } from './services/SettingsService'

const LOG_PATH = path.join(path.dirname(process.execPath), 'locallmide_debug.log')
const LOG = (msg: string) => {
  try { fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`) } catch (e: any) {
    try { fs.appendFileSync('C:/Users/Public/locallmide_debug.log', `LOGFAIL: ${e.message} | ${msg}\n`) } catch {}
  }
}

LOG(`main loading — process.type=${process.type}`)
process.on('uncaughtException', (err) => { LOG(`UNCAUGHT: ${err.stack}`) })
process.on('unhandledRejection', (reason) => { LOG(`UNHANDLED: ${reason}`) })

// Defer ALL Electron API access — guard against ELECTRON_RUN_AS_NODE being set
// and ensure Module._load patch is in place before accessing electron APIs
setImmediate(() => {
  const e = require('electron') as {
    app: App
    BrowserWindow: typeof import('electron').BrowserWindow
    nativeTheme: NativeTheme
    ipcMain: IpcMain
  }

  if (!e.app) {
    LOG(`ERROR: require('electron').app is undefined — process.type=${process.type}`)
    return
  }

  LOG(`setImmediate — process.type=${process.type}`)

  const { app, BrowserWindow, nativeTheme, ipcMain } = e

  function createWindow(): import('electron').BrowserWindow {
    const savedBounds = settingsService.get('windowBounds') as import('electron').Rectangle | undefined
    const preloadPath = join(__dirname, '../preload/preload.cjs')
    const rendererPath = join(__dirname, '../renderer/index.html')
    LOG(`preload=${preloadPath}  renderer=${rendererPath}`)

    const win = new BrowserWindow({
      width: savedBounds?.width ?? 1400,
      height: savedBounds?.height ?? 900,
      x: savedBounds?.x,
      y: savedBounds?.y,
      minWidth: 900,
      minHeight: 600,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#0d0d0d',
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    win.once('ready-to-show', () => {
      win.show()
      LOG('ready-to-show')
    })

    win.on('render-process-gone', (_ev, details) => { LOG(`renderer crashed: ${JSON.stringify(details)}`) })
    win.webContents.on('did-fail-load', (_ev, code, desc, url) => { LOG(`did-fail-load: ${code} ${desc} ${url}`) })

    win.on('close', () => {
      settingsService.set('windowBounds', win.getBounds())
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      win.loadFile(rendererPath)
    }

    return win
  }

  app.whenReady().then(() => {
    LOG('app ready')
    nativeTheme.themeSource = 'dark'

    registerFsHandlers()
    registerLlmHandlers()
    registerGitHandlers()
    registerGitHubHandlers()
    registerTerminalHandlers()
    registerSettingsHandlers()

    // Window controls (frameless)
    ipcMain.on('win:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
    ipcMain.on('win:maximize', () => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return
      win.isMaximized() ? win.unmaximize() : win.maximize()
    })
    ipcMain.on('win:close', () => BrowserWindow.getFocusedWindow()?.close())

    const win = createWindow()
    LOG(`window created, id=${win.id}`)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    LOG('window-all-closed')
    terminalService.killAll()
    if (process.platform !== 'darwin') app.quit()
  })
})
