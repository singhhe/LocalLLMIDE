// ── File System ───────────────────────────────────────────────────────────────

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
}

export interface FileEvent {
  type: 'created' | 'deleted' | 'changed' | 'renamed'
  path: string
  newPath?: string
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface WorkspaceInfo {
  name: string
  path: string
}

// ── Editor ────────────────────────────────────────────────────────────────────

export interface EditorTab {
  id: string
  filePath: string
  fileName: string
  language: string
  isDirty: boolean
}

// ── LLM ───────────────────────────────────────────────────────────────────────

export interface ModelInfo {
  name: string
  description: string
  sizeDisplay: string
  downloadUrl: string
  sizeBytes: number
}

export interface LlmLoadOptions {
  contextSize?: number
  gpuLayers?: number
  threads?: number
  systemPrompt?: string
}

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

export interface FimRequest {
  prefix: string
  suffix: string
  language: string
  maxTokens?: number
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

// ── Git ───────────────────────────────────────────────────────────────────────

export type GitFileState = 'untracked' | 'modified' | 'added' | 'deleted' | 'renamed' | 'conflicted'

export interface GitFileStatus {
  path: string
  state: GitFileState
  isStaged: boolean
}

export interface GitRepoInfo {
  workingDir: string
  branch: string
  isRepo: boolean
}

// ── GitHub ────────────────────────────────────────────────────────────────────

export interface GitHubRepo {
  fullName: string
  cloneUrl: string
  defaultBranch: string
  isPrivate: boolean
  description: string
}

export interface GitHubPR {
  number: number
  title: string
  state: string
  headBranch: string
  baseBranch: string
  url: string
}

export interface CreatePROptions {
  owner: string
  repo: string
  title: string
  body: string
  head: string
  base: string
}

// ── Download ──────────────────────────────────────────────────────────────────

export interface DownloadProgress {
  bytesReceived: number
  totalBytes: number
  percent: number
  fileName: string
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light'
  recentWorkspaces: string[]
  githubPat: string
  gitAuthorName: string
  gitAuthorEmail: string
  loadedModelPath: string | null
  modelsDir: string | null        // custom model download folder (null = use default)
  defaultGpuLayers: number
  defaultContextSize: number
  defaultThreads: number
  editorFontSize: number
  editorTabSize: number
}
