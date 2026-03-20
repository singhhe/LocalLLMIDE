import fs from 'fs'
import path from 'path'
import type { App } from 'electron'
import type { AppSettings } from '../../shared/types'

const defaults: AppSettings = {
  theme: 'dark',
  recentWorkspaces: [],
  githubPat: '',
  gitAuthorName: '',
  gitAuthorEmail: '',
  loadedModelPath: null,
  modelsDir: null,
  defaultGpuLayers: 32,
  defaultContextSize: 4096,
  defaultThreads: 4,
  editorFontSize: 14,
  editorTabSize: 2,
}

// Lazy — app must be ready before calling app.getPath()
const getSettingsPath = () => {
  const { app } = require('electron') as { app: App }
  return path.join(app.getPath('userData'), 'settings.json')
}

class SettingsService {
  private data: AppSettings & { windowBounds?: Electron.Rectangle } = { ...defaults }
  private loaded = false

  private load(): void {
    if (this.loaded) return
    this.loaded = true
    try {
      const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
      const parsed = JSON.parse(raw)
      this.data = { ...defaults, ...parsed }
    } catch {
      // File doesn't exist yet — use defaults
    }
  }

  private save(): void {
    try {
      const settingsPath = getSettingsPath()
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
      fs.writeFileSync(settingsPath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('SettingsService: failed to save', err)
    }
  }

  get<K extends keyof (AppSettings & { windowBounds?: Electron.Rectangle })>(
    key: K
  ): (AppSettings & { windowBounds?: Electron.Rectangle })[K] {
    this.load()
    return this.data[key]
  }

  set<K extends keyof (AppSettings & { windowBounds?: Electron.Rectangle })>(
    key: K,
    value: (AppSettings & { windowBounds?: Electron.Rectangle })[K]
  ): void {
    this.load()
    this.data[key] = value
    this.save()
  }

  addRecentWorkspace(wsPath: string): void {
    this.load()
    const recent = (this.data.recentWorkspaces ?? []).filter((p) => p !== wsPath)
    recent.unshift(wsPath)
    this.data.recentWorkspaces = recent.slice(0, 10)
    this.save()
  }

  getAll(): AppSettings {
    this.load()
    return { ...this.data }
  }
}

export const settingsService = new SettingsService()
