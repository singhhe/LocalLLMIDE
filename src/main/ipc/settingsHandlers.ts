import type { IpcMain, Dialog } from 'electron'
import { settingsService } from '../services/SettingsService'
import type { AppSettings } from '../../shared/types'

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
}
