import type { IpcMain, Dialog } from 'electron'
import crypto from 'crypto'
import { llmService } from '../services/LlmService'
import { modelDownloadService } from '../services/ModelDownloadService'
import type { LlmLoadOptions, GenerateOptions, FimRequest, ModelInfo } from '../../shared/types'

export function registerLlmHandlers(): void {
  const { ipcMain, dialog } = require('electron') as { ipcMain: IpcMain; dialog: Dialog }

  ipcMain.handle('llm:load', (_e, modelPath: string, opts: LlmLoadOptions) =>
    llmService.loadModel(modelPath, opts)
  )

  ipcMain.handle('llm:unload', () => llmService.unload())

  ipcMain.handle('llm:clearHistory', () => llmService.clearHistory())

  ipcMain.handle('llm:status', () => ({
    isLoaded: llmService.isLoaded,
    modelName: llmService.getModelDisplayName()
  }))

  ipcMain.handle('llm:fim', (_e, req: FimRequest) => llmService.fimComplete(req))

  // Streaming generation: returns a generation ID; tokens come back as events
  ipcMain.handle('llm:generateStart', async (event, prompt: string, opts: GenerateOptions) => {
    const id = crypto.randomUUID()
    let aborted = false

    setImmediate(async () => {
      try {
        for await (const token of llmService.generate(prompt, opts, (cb) => {
          ipcMain.once(`llm:abort:${id}`, () => { aborted = true; cb() })
        })) {
          if (aborted) break
          if (!event.sender.isDestroyed()) {
            event.sender.send(`llm:token:${id}`, token)
          }
        }
      } catch (err: unknown) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(`llm:error:${id}`, String(err))
        }
      } finally {
        if (!event.sender.isDestroyed()) {
          event.sender.send(`llm:done:${id}`)
        }
      }
    })

    return id
  })

  // Model manager
  ipcMain.handle('model:list', () => modelDownloadService.getModelsWithStatus())

  ipcMain.handle('model:download', async (event, model: ModelInfo) => {
    return modelDownloadService.download(model, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('model:progress', progress)
      }
    })
  })

  ipcMain.handle('model:cancel', (_e, modelName: string) =>
    modelDownloadService.cancel(modelName)
  )

  ipcMain.handle('model:browseLocal', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
