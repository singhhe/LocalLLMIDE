import fs from 'fs'
import path from 'path'
import type { IpcMain, Dialog, App } from 'electron'
import { settingsService } from '../services/SettingsService'
import type { AppSettings, ChatMessage } from '../../shared/types'

const getChatHistoryPath = () => {
  const { app } = require('electron') as { app: App }
  return path.join(app.getPath('userData'), 'chat-history.json')
}

export function registerSettingsHandlers(): void {
  const { ipcMain, dialog } = require('electron') as { ipcMain: IpcMain; dialog: Dialog }

  ipcMain.handle('settings:getAll', () => settingsService.getAll())

  ipcMain.handle('settings:set', (_e, key: keyof AppSettings, value: unknown) => {
    settingsService.set(key as any, value as any)
  })

  ipcMain.handle('settings:browseModelsDir', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('chat:save', (_e, messages: ChatMessage[]) => {
    try {
      fs.writeFileSync(getChatHistoryPath(), JSON.stringify(messages, null, 2), 'utf-8')
    } catch { /* non-fatal */ }
  })

  ipcMain.handle('chat:load', (): ChatMessage[] => {
    try {
      const raw = fs.readFileSync(getChatHistoryPath(), 'utf-8')
      return JSON.parse(raw) as ChatMessage[]
    } catch {
      return []
    }
  })
}
