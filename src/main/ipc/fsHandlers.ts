import type { IpcMain, Dialog } from 'electron'
import { fileService } from '../services/FileService'
import { workspaceService } from '../services/WorkspaceService'

export function registerFsHandlers(): void {
  const { ipcMain, dialog } = require('electron') as { ipcMain: IpcMain; dialog: Dialog }

  ipcMain.handle('fs:tree', (_e, dirPath: string) => fileService.getFileTree(dirPath))
  ipcMain.handle('fs:read', (_e, filePath: string) => fileService.readFile(filePath))
  ipcMain.handle('fs:write', (_e, filePath: string, content: string) => fileService.writeFile(filePath, content))
  ipcMain.handle('fs:create', (_e, filePath: string) => fileService.createFile(filePath))
  ipcMain.handle('fs:mkdir', (_e, dirPath: string) => fileService.createDirectory(dirPath))
  ipcMain.handle('fs:delete', (_e, targetPath: string) => fileService.delete(targetPath))
  ipcMain.handle('fs:rename', (_e, oldPath: string, newPath: string) => fileService.rename(oldPath, newPath))

  ipcMain.handle('workspace:openDialog', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    return workspaceService.open(result.filePaths[0])
  })

  ipcMain.handle('workspace:open', (_e, folderPath: string) => workspaceService.open(folderPath))
  ipcMain.handle('workspace:recent', () => workspaceService.getRecent())
  ipcMain.handle('workspace:close', () => workspaceService.close())

  // File watching: renderer subscribes and gets a cleanup id
  const watchCleanups = new Map<string, () => void>()
  ipcMain.handle('fs:watch', (event, dirPath: string) => {
    const existing = watchCleanups.get(dirPath)
    if (existing) existing()
    const stop = fileService.watchDirectory(dirPath, (eventType, filePath) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('fs:changed', { eventType, filePath })
      }
    })
    watchCleanups.set(dirPath, stop)
  })

  ipcMain.handle('fs:unwatch', (_e, dirPath: string) => {
    const stop = watchCleanups.get(dirPath)
    if (stop) { stop(); watchCleanups.delete(dirPath) }
  })
}
