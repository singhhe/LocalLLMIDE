import { contextBridge, ipcRenderer } from 'electron'
import type {
  FileNode, WorkspaceInfo, ModelInfo, LlmLoadOptions, GenerateOptions,
  FimRequest, GitFileStatus, GitRepoInfo, GitHubRepo, GitHubPR,
  CreatePROptions, DownloadProgress, AppSettings
} from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  // ── Window controls ─────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),

  // ── File system ─────────────────────────────────────────────────────
  getFileTree: (dirPath: string): Promise<FileNode[]> =>
    ipcRenderer.invoke('fs:tree', dirPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:read', filePath),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:write', filePath, content),
  createFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('fs:create', filePath),
  createDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:mkdir', dirPath),
  deleteFile: (targetPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:delete', targetPath),
  renameFile: (oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:rename', oldPath, newPath),
  watchDir: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:watch', dirPath),
  unwatchDir: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:unwatch', dirPath),
  onFsChanged: (cb: (payload: { eventType: string; filePath: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: { eventType: string; filePath: string }) => cb(payload)
    ipcRenderer.on('fs:changed', handler)
    return () => ipcRenderer.off('fs:changed', handler)
  },

  // ── Workspace ───────────────────────────────────────────────────────
  openFolderDialog: (): Promise<WorkspaceInfo | null> =>
    ipcRenderer.invoke('workspace:openDialog'),
  openFolder: (folderPath: string): Promise<WorkspaceInfo> =>
    ipcRenderer.invoke('workspace:open', folderPath),
  getRecentWorkspaces: (): Promise<WorkspaceInfo[]> =>
    ipcRenderer.invoke('workspace:recent'),
  closeWorkspace: (): Promise<void> =>
    ipcRenderer.invoke('workspace:close'),

  // ── LLM ─────────────────────────────────────────────────────────────
  loadModel: (modelPath: string, opts?: LlmLoadOptions): Promise<void> =>
    ipcRenderer.invoke('llm:load', modelPath, opts ?? {}),
  unloadModel: (): Promise<void> =>
    ipcRenderer.invoke('llm:unload'),
  clearHistory: (): Promise<void> =>
    ipcRenderer.invoke('llm:clearHistory'),
  getLlmStatus: (): Promise<{ isLoaded: boolean; modelName: string | null }> =>
    ipcRenderer.invoke('llm:status'),
  fimComplete: (req: FimRequest): Promise<string> =>
    ipcRenderer.invoke('llm:fim', req),
  generateStream: async (
    prompt: string,
    opts: GenerateOptions,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): Promise<() => void> => {
    const id: string = await ipcRenderer.invoke('llm:generateStart', prompt, opts)
    const tokenHandler = (_e: Electron.IpcRendererEvent, token: string) => onToken(token)
    const doneHandler = () => { cleanup(); onDone() }
    const errorHandler = (_e: Electron.IpcRendererEvent, err: string) => { cleanup(); onError(err) }
    const cleanup = () => {
      ipcRenderer.off(`llm:token:${id}`, tokenHandler)
      ipcRenderer.off(`llm:done:${id}`, doneHandler)
      ipcRenderer.off(`llm:error:${id}`, errorHandler)
    }
    ipcRenderer.on(`llm:token:${id}`, tokenHandler)
    ipcRenderer.on(`llm:done:${id}`, doneHandler)
    ipcRenderer.on(`llm:error:${id}`, errorHandler)
    return () => { ipcRenderer.emit(`llm:abort:${id}`); cleanup() }
  },

  // ── Model manager ────────────────────────────────────────────────────
  listModels: (): Promise<(ModelInfo & { localPath: string | null })[]> =>
    ipcRenderer.invoke('model:list'),
  downloadModel: (
    model: ModelInfo,
    onProgress: (p: DownloadProgress) => void
  ): Promise<string> => {
    const handler = (_e: Electron.IpcRendererEvent, p: DownloadProgress) => onProgress(p)
    ipcRenderer.on('model:progress', handler)
    return ipcRenderer.invoke('model:download', model).finally(() => {
      ipcRenderer.off('model:progress', handler)
    })
  },
  cancelDownload: (modelName: string): Promise<void> =>
    ipcRenderer.invoke('model:cancel', modelName),
  browseLocalModel: (): Promise<string | null> =>
    ipcRenderer.invoke('model:browseLocal'),

  // ── Git ──────────────────────────────────────────────────────────────
  gitInfo: (cwd: string): Promise<GitRepoInfo> =>
    ipcRenderer.invoke('git:info', cwd),
  gitStatus: (cwd: string): Promise<GitFileStatus[]> =>
    ipcRenderer.invoke('git:status', cwd),
  gitStage: (cwd: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke('git:stage', cwd, filePath),
  gitStageAll: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:stageAll', cwd),
  gitUnstage: (cwd: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke('git:unstage', cwd, filePath),
  gitCommit: (cwd: string, message: string, name: string, email: string): Promise<string> =>
    ipcRenderer.invoke('git:commit', cwd, message, name, email),
  gitPush: (cwd: string, pat?: string): Promise<void> =>
    ipcRenderer.invoke('git:push', cwd, pat),
  gitPull: (cwd: string, pat?: string): Promise<void> =>
    ipcRenderer.invoke('git:pull', cwd, pat),
  gitBranches: (cwd: string): Promise<string[]> =>
    ipcRenderer.invoke('git:branches', cwd),
  gitCheckout: (cwd: string, branch: string, create?: boolean): Promise<void> =>
    ipcRenderer.invoke('git:checkout', cwd, branch, create ?? false),
  gitInit: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:init', cwd),
  gitDiff: (cwd: string, filePath: string): Promise<string> =>
    ipcRenderer.invoke('git:diff', cwd, filePath),

  // ── GitHub ───────────────────────────────────────────────────────────
  githubAuth: (pat: string): Promise<string> =>
    ipcRenderer.invoke('github:auth', pat),
  githubLogout: (): void =>
    ipcRenderer.invoke('github:logout'),
  githubStatus: (): Promise<{ isAuthenticated: boolean; username: string | null }> =>
    ipcRenderer.invoke('github:status'),
  githubRepos: (): Promise<GitHubRepo[]> =>
    ipcRenderer.invoke('github:repos'),
  githubPRs: (owner: string, repo: string): Promise<GitHubPR[]> =>
    ipcRenderer.invoke('github:prs', owner, repo),
  githubCreatePR: (opts: CreatePROptions): Promise<GitHubPR> =>
    ipcRenderer.invoke('github:createPr', opts),

  // ── Settings ─────────────────────────────────────────────────────────
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:getAll'),
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> =>
    ipcRenderer.invoke('settings:set', key, value),
  browseModelsDir: (): Promise<string | null> =>
    ipcRenderer.invoke('settings:browseModelsDir'),
  saveChatHistory: (messages: ChatMessage[]): Promise<void> =>
    ipcRenderer.invoke('chat:save', messages),
  loadChatHistory: (): Promise<ChatMessage[]> =>
    ipcRenderer.invoke('chat:load'),

  // ── Terminal ─────────────────────────────────────────────────────────
  termCreate: (id: string, cwd: string): Promise<{ cols: number; rows: number }> =>
    ipcRenderer.invoke('term:create', id, cwd),
  termWrite: (id: string, data: string): void => {
    ipcRenderer.invoke('term:write', id, data)
  },
  termResize: (id: string, cols: number, rows: number): void => {
    ipcRenderer.invoke('term:resize', id, cols, rows)
  },
  termKill: (id: string): void => {
    ipcRenderer.invoke('term:kill', id)
  },
  onTermData: (id: string, cb: (data: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: string) => cb(data)
    ipcRenderer.on(`term:data:${id}`, handler)
    return () => ipcRenderer.off(`term:data:${id}`, handler)
  }
})
