import { useState, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'
import type { AppSettings } from '../../../../shared/types'
import styles from './SettingsModal.module.css'


type Section = 'general' | 'models' | 'editor' | 'git' | 'github'

export function SettingsModal(): JSX.Element | null {
  const { settingsOpen, setSettingsOpen, setTheme, setEditorFontSize, setEditorTabSize } = useUiStore()
  const [section, setSection] = useState<Section>('general')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settingsOpen) window.api.getSettings().then(setSettings)
  }, [settingsOpen])

  if (!settingsOpen || !settings) return null

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => s ? { ...s, [key]: value } : s)
  }

  const save = async () => {
    if (!settings) return
    const keys: (keyof AppSettings)[] = [
      'theme', 'modelsDir', 'defaultGpuLayers', 'defaultContextSize',
      'defaultThreads', 'editorFontSize', 'editorTabSize',
      'gitAuthorName', 'gitAuthorEmail', 'githubPat'
    ]
    for (const k of keys) await window.api.setSetting(k, settings[k] as any)
    setTheme(settings.theme)
    setEditorFontSize(settings.editorFontSize)
    setEditorTabSize(settings.editorTabSize)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const browseModelsDir = async () => {
    const dir = await window.api.browseModelsDir()
    if (dir) update('modelsDir', dir)
  }

  const navItems: { id: Section; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'models', label: 'Models' },
    { id: 'editor', label: 'Editor' },
    { id: 'git', label: 'Git' },
    { id: 'github', label: 'GitHub' },
  ]

  return (
    <div className={styles.overlay} onClick={() => setSettingsOpen(false)}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
          <button className="icon-btn" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>

        <div className={styles.body}>
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${section === item.id ? styles.navActive : ''}`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            {section === 'general' && (
              <>
                <div className={styles.group}>
                  <label className={styles.label}>Theme</label>
                  <select
                    className={styles.select}
                    value={settings.theme}
                    onChange={(e) => update('theme', e.target.value as 'dark' | 'light')}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </>
            )}

            {section === 'models' && (
              <>
                <div className={styles.group}>
                  <label className={styles.label}>Model Download Folder</label>
                  <div className={styles.pathRow}>
                    <input
                      className={styles.input}
                      value={settings.modelsDir ?? ''}
                      placeholder="Default (app data folder)"
                      onChange={(e) => update('modelsDir', e.target.value || null)}
                      readOnly
                    />
                    <button className={styles.browseBtn} onClick={browseModelsDir}>Browse…</button>
                    {settings.modelsDir && (
                      <button className={styles.clearBtn} onClick={() => update('modelsDir', null)}>✕</button>
                    )}
                  </div>
                  <span className={styles.hint}>Where .gguf files are downloaded. Leave blank for default.</span>
                </div>

                <div className={styles.group}>
                  <label className={styles.label}>Default GPU Layers</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={0} max={200}
                    value={settings.defaultGpuLayers}
                    onChange={(e) => update('defaultGpuLayers', Number(e.target.value))}
                  />
                  <span className={styles.hint}>Layers offloaded to GPU. 0 = CPU only, 99 = all layers.</span>
                </div>

                <div className={styles.group}>
                  <label className={styles.label}>Default Context Size</label>
                  <select
                    className={styles.select}
                    value={settings.defaultContextSize}
                    onChange={(e) => update('defaultContextSize', Number(e.target.value))}
                  >
                    {[2048, 4096, 8192, 16384, 32768].map((v) => (
                      <option key={v} value={v}>{v.toLocaleString()} tokens</option>
                    ))}
                  </select>
                </div>

                <div className={styles.group}>
                  <label className={styles.label}>Default CPU Threads</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1} max={64}
                    value={settings.defaultThreads}
                    onChange={(e) => update('defaultThreads', Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {section === 'editor' && (
              <>
                <div className={styles.group}>
                  <label className={styles.label}>Font Size</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={10} max={32}
                    value={settings.editorFontSize}
                    onChange={(e) => update('editorFontSize', Number(e.target.value))}
                  />
                </div>
                <div className={styles.group}>
                  <label className={styles.label}>Tab Size</label>
                  <select
                    className={styles.select}
                    value={settings.editorTabSize}
                    onChange={(e) => update('editorTabSize', Number(e.target.value))}
                  >
                    {[2, 4, 8].map((v) => (
                      <option key={v} value={v}>{v} spaces</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {section === 'git' && (
              <>
                <div className={styles.group}>
                  <label className={styles.label}>Author Name</label>
                  <input
                    className={styles.input}
                    value={settings.gitAuthorName}
                    placeholder="Your Name"
                    onChange={(e) => update('gitAuthorName', e.target.value)}
                  />
                </div>
                <div className={styles.group}>
                  <label className={styles.label}>Author Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={settings.gitAuthorEmail}
                    placeholder="you@example.com"
                    onChange={(e) => update('gitAuthorEmail', e.target.value)}
                  />
                </div>
              </>
            )}

            {section === 'github' && (
              <>
                <div className={styles.group}>
                  <label className={styles.label}>Personal Access Token</label>
                  <input
                    className={styles.input}
                    type="password"
                    value={settings.githubPat}
                    placeholder="ghp_…"
                    onChange={(e) => update('githubPat', e.target.value)}
                  />
                  <span className={styles.hint}>Required for pushing to GitHub and creating PRs.</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => setSettingsOpen(false)}>Cancel</button>
          <button className={styles.saveBtn} onClick={save}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
