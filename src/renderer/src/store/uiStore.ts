import { create } from 'zustand'

type SidebarPanel = 'files' | 'git' | 'models' | 'github'
type Theme = 'dark' | 'light'

interface UiState {
  theme: Theme
  editorFontSize: number
  editorTabSize: number
  sidebarPanel: SidebarPanel
  sidebarVisible: boolean
  aiPanelVisible: boolean
  terminalVisible: boolean
  commandPaletteOpen: boolean
  modelManagerOpen: boolean
  githubModalOpen: boolean
  settingsOpen: boolean
  statusMessage: string
  sidebarWidth: number
  aiPanelWidth: number
  terminalHeight: number

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setEditorFontSize: (size: number) => void
  setEditorTabSize: (size: number) => void
  setSidebarPanel: (panel: SidebarPanel) => void
  toggleSidebar: () => void
  toggleAiPanel: () => void
  toggleTerminal: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setModelManagerOpen: (open: boolean) => void
  setGithubModalOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setStatusMessage: (msg: string, durationMs?: number) => void
  setSidebarWidth: (w: number) => void
  setAiPanelWidth: (w: number) => void
  setTerminalHeight: (h: number) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'dark',
  editorFontSize: 14,
  editorTabSize: 2,
  sidebarPanel: 'files',
  sidebarVisible: true,
  aiPanelVisible: true,
  terminalVisible: false,
  commandPaletteOpen: false,
  modelManagerOpen: false,
  githubModalOpen: false,
  settingsOpen: false,
  statusMessage: '',
  sidebarWidth: 260,
  aiPanelWidth: 360,
  terminalHeight: 240,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  setEditorFontSize: (size) => set({ editorFontSize: size }),
  setEditorTabSize: (size) => set({ editorTabSize: size }),

  setSidebarPanel: (panel) => set({ sidebarPanel: panel, sidebarVisible: true }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleAiPanel: () => set((s) => ({ aiPanelVisible: !s.aiPanelVisible })),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setModelManagerOpen: (open) => set({ modelManagerOpen: open }),
  setGithubModalOpen: (open) => set({ githubModalOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setStatusMessage: (msg, durationMs = 3000) => {
    set({ statusMessage: msg })
    if (durationMs > 0) setTimeout(() => set({ statusMessage: '' }), durationMs)
  },

  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(w, 600)) }),
  setAiPanelWidth: (w) => set({ aiPanelWidth: Math.max(280, Math.min(w, 700)) }),
  setTerminalHeight: (h) => set({ terminalHeight: Math.max(100, Math.min(h, 600)) })
}))
