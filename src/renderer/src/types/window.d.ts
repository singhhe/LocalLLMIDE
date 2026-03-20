import type {
  FileNode, WorkspaceInfo, ModelInfo, LlmLoadOptions, GenerateOptions,
  FimRequest, GitFileStatus, GitRepoInfo, GitHubRepo, GitHubPR,
  CreatePROptions, DownloadProgress, AppSettings
} from '../../../shared/types'

declare global {
  interface Window {
    api: {
      // Window controls
      minimize: () => void
      maximize: () => void
      close: () => void

      // File system
      getFileTree: (dirPath: string) => Promise<FileNode[]>
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<void>
      createFile: (filePath: string) => Promise<void>
      createDirectory: (dirPath: string) => Promise<void>
      deleteFile: (targetPath: string) => Promise<void>
      renameFile: (oldPath: string, newPath: string) => Promise<void>
      watchDir: (dirPath: string) => Promise<void>
      unwatchDir: (dirPath: string) => Promise<void>
      onFsChanged: (cb: (payload: { eventType: string; filePath: string }) => void) => () => void

      // Workspace
      openFolderDialog: () => Promise<WorkspaceInfo | null>
      openFolder: (folderPath: string) => Promise<WorkspaceInfo>
      getRecentWorkspaces: () => Promise<WorkspaceInfo[]>
      closeWorkspace: () => Promise<void>

      // LLM
      loadModel: (modelPath: string, opts?: LlmLoadOptions) => Promise<void>
      unloadModel: () => Promise<void>
      clearHistory: () => Promise<void>
      getLlmStatus: () => Promise<{ isLoaded: boolean; modelName: string | null }>
      fimComplete: (req: FimRequest) => Promise<string>
      generateStream: (
        prompt: string,
        opts: GenerateOptions,
        onToken: (token: string) => void,
        onDone: () => void,
        onError: (err: string) => void
      ) => Promise<() => void>

      // Model manager
      listModels: () => Promise<(ModelInfo & { localPath: string | null })[]>
      downloadModel: (model: ModelInfo, onProgress: (p: DownloadProgress) => void) => Promise<string>
      cancelDownload: (modelName: string) => Promise<void>
      browseLocalModel: () => Promise<string | null>

      // Git
      gitInfo: (cwd: string) => Promise<GitRepoInfo>
      gitStatus: (cwd: string) => Promise<GitFileStatus[]>
      gitStage: (cwd: string, filePath: string) => Promise<void>
      gitStageAll: (cwd: string) => Promise<void>
      gitUnstage: (cwd: string, filePath: string) => Promise<void>
      gitCommit: (cwd: string, message: string, name: string, email: string) => Promise<string>
      gitPush: (cwd: string, pat?: string) => Promise<void>
      gitPull: (cwd: string, pat?: string) => Promise<void>
      gitBranches: (cwd: string) => Promise<string[]>
      gitCheckout: (cwd: string, branch: string, create?: boolean) => Promise<void>
      gitInit: (cwd: string) => Promise<void>
      gitDiff: (cwd: string, filePath: string) => Promise<string>

      // GitHub
      githubAuth: (pat: string) => Promise<string>
      githubLogout: () => void
      githubStatus: () => Promise<{ isAuthenticated: boolean; username: string | null }>
      githubRepos: () => Promise<GitHubRepo[]>
      githubPRs: (owner: string, repo: string) => Promise<GitHubPR[]>
      githubCreatePR: (opts: CreatePROptions) => Promise<GitHubPR>

      // Settings
      getSettings: () => Promise<AppSettings>
      setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
      browseModelsDir: () => Promise<string | null>

      // Terminal
      termCreate: (id: string, cwd: string) => Promise<{ cols: number; rows: number }>
      termWrite: (id: string, data: string) => void
      termResize: (id: string, cols: number, rows: number) => void
      termKill: (id: string) => void
      onTermData: (id: string, cb: (data: string) => void) => () => void
    }
  }
}

export {}
