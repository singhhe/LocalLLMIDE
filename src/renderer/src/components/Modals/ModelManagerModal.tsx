import { useState, useEffect, useRef } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useAiStore } from '../../store/aiStore'
import type { ModelInfo, DownloadProgress } from '../../../../shared/types'
import styles from './ModelManagerModal.module.css'

interface ModelWithStatus extends ModelInfo {
  localPath: string | null
}

interface HfModel {
  id: string
  downloads: number
  likes: number
}

interface HfFile {
  rfilename: string
  size: number
}

export function ModelManagerModal(): JSX.Element | null {
  const { modelManagerOpen, setModelManagerOpen } = useUiStore()
  const { setModelStatus } = useAiStore()

  const [tab, setTab] = useState<'curated' | 'search'>('curated')
  const [models, setModels] = useState<ModelWithStatus[]>([])
  const [progress, setProgress] = useState<Record<string, DownloadProgress>>({})
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadOpts, setLoadOpts] = useState({ gpuLayers: 99, contextSize: 4096, threads: 4 })

  // HF search state
  const [query, setQuery] = useState('')
  const [hfResults, setHfResults] = useState<HfModel[]>([])
  const [hfFiles, setHfFiles] = useState<Record<string, HfFile[]>>({})
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (modelManagerOpen) {
      window.api.listModels().then(setModels)
      window.api.getSettings().then((s) => {
        setLoadOpts({
          gpuLayers: s.defaultGpuLayers,
          contextSize: s.defaultContextSize,
          threads: s.defaultThreads,
        })
      })
    }
  }, [modelManagerOpen])

  if (!modelManagerOpen) return null

  // ── Curated tab handlers ─────────────────────────────────────────────────

  const handleDownload = async (model: ModelInfo) => {
    try {
      setError(null)
      await window.api.downloadModel(model, (p) => {
        setProgress((prev) => ({ ...prev, [model.name]: p }))
      })
      const updated = await window.api.listModels()
      setModels(updated)
      setProgress((prev) => { const n = { ...prev }; delete n[model.name]; return n })
    } catch (e) {
      setError(String(e))
    }
  }

  const handleLoad = async (localPath: string, modelName: string) => {
    try {
      setError(null)
      setLoadingModel(modelName)
      await window.api.loadModel(localPath, loadOpts)
      setModelStatus(true, modelName)
      setLoadingModel(null)
      setModelManagerOpen(false)
    } catch (e) {
      setError(String(e))
      setLoadingModel(null)
    }
  }

  const handleBrowse = async () => {
    const path = await window.api.browseLocalModel()
    if (!path) return
    const name = path.split(/[\\/]/).pop() ?? path
    await handleLoad(path, name)
  }

  const handleUnload = async () => {
    await window.api.unloadModel()
    setModelStatus(false, null)
  }

  // ── HF search ────────────────────────────────────────────────────────────

  const runSearch = async (q: string) => {
    if (!q.trim()) { setHfResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://huggingface.co/api/models?search=${encodeURIComponent(q)}&filter=gguf&sort=downloads&direction=-1&limit=20`
      )
      const data: HfModel[] = await res.json()
      setHfResults(data)
    } catch {
      setHfResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => runSearch(q), 500)
  }

  const toggleExpand = async (modelId: string) => {
    if (expandedModel === modelId) { setExpandedModel(null); return }
    setExpandedModel(modelId)
    if (hfFiles[modelId]) return
    try {
      const res = await fetch(`https://huggingface.co/api/models/${modelId}`)
      const data: { siblings: HfFile[] } = await res.json()
      const ggufFiles = data.siblings.filter((f) => f.rfilename.endsWith('.gguf'))
      setHfFiles((prev) => ({ ...prev, [modelId]: ggufFiles }))
    } catch {
      setHfFiles((prev) => ({ ...prev, [modelId]: [] }))
    }
  }

  const downloadHfFile = async (modelId: string, file: HfFile) => {
    const name = file.rfilename.replace('.gguf', '')
    const downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${file.rfilename}`
    const model: ModelInfo = {
      name,
      description: modelId,
      sizeDisplay: formatBytes(file.size),
      sizeBytes: file.size,
      downloadUrl,
    }
    setTab('curated')
    // Add temporarily to models list if not already there
    setModels((prev) => prev.find((m) => m.name === name) ? prev : [...prev, { ...model, localPath: null }])
    await handleDownload(model)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.overlay} onClick={() => setModelManagerOpen(false)}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Model Manager</span>
          <button className="icon-btn" onClick={() => setModelManagerOpen(false)}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'curated' ? styles.tabActive : ''}`}
            onClick={() => setTab('curated')}
          >
            Curated ({models.length})
          </button>
          <button
            className={`${styles.tab} ${tab === 'search' ? styles.tabActive : ''}`}
            onClick={() => setTab('search')}
          >
            Search HuggingFace
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          {tab === 'curated' && (
            <>
              <div className={styles.section}>
                {models.map((m) => {
                  const dl = progress[m.name]
                  const isDownloading = !!dl
                  const isLoading = loadingModel === m.name
                  return (
                    <div key={m.name} className={styles.modelRow}>
                      <div className={styles.modelInfo}>
                        <div className={styles.modelName}>{m.name}</div>
                        <div className={styles.modelMeta}>{m.description} • {m.sizeDisplay}</div>
                        {isDownloading && (
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${dl.percent.toFixed(1)}%` }} />
                            <span className={styles.progressText}>
                              {dl.percent.toFixed(1)}% — {formatBytes(dl.bytesReceived)} / {formatBytes(dl.totalBytes)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={styles.modelActions}>
                        {m.localPath ? (
                          <button className={styles.loadBtn} disabled={isLoading} onClick={() => handleLoad(m.localPath!, m.name)}>
                            {isLoading ? 'Loading…' : 'Load'}
                          </button>
                        ) : isDownloading ? (
                          <button className={styles.cancelBtn} onClick={() => window.api.cancelDownload(m.name)}>Cancel</button>
                        ) : (
                          <button className={styles.downloadBtn} onClick={() => handleDownload(m)}>Download</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Local GGUF File</div>
                <div className={styles.browseRow}>
                  <span className={styles.browseHint}>Load any .gguf file from your disk</span>
                  <button className={styles.browseBtn} onClick={handleBrowse}>Browse…</button>
                </div>
              </div>

              <div className={styles.section}>
                <button className={styles.unloadBtn} onClick={handleUnload}>Unload Current Model</button>
              </div>
            </>
          )}

          {tab === 'search' && (
            <div className={styles.section}>
              <input
                className={styles.searchInput}
                placeholder="Search HuggingFace for GGUF models…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoFocus
              />
              {searching && <div className={styles.searchHint}>Searching…</div>}
              {!searching && query && hfResults.length === 0 && (
                <div className={styles.searchHint}>No results.</div>
              )}
              {hfResults.map((m) => (
                <div key={m.id} className={styles.hfModel}>
                  <div className={styles.hfHeader} onClick={() => toggleExpand(m.id)}>
                    <div>
                      <div className={styles.modelName}>{m.id}</div>
                      <div className={styles.modelMeta}>
                        ↓ {m.downloads.toLocaleString()} downloads • ♥ {m.likes}
                      </div>
                    </div>
                    <span className={styles.expandIcon}>{expandedModel === m.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedModel === m.id && (
                    <div className={styles.hfFiles}>
                      {!hfFiles[m.id] && <div className={styles.searchHint}>Loading files…</div>}
                      {hfFiles[m.id]?.length === 0 && <div className={styles.searchHint}>No GGUF files found.</div>}
                      {hfFiles[m.id]?.map((f) => (
                        <div key={f.rfilename} className={styles.hfFileRow}>
                          <span className={styles.hfFileName}>{f.rfilename}</span>
                          <span className={styles.hfFileSize}>{formatBytes(f.size)}</span>
                          <button className={styles.downloadBtn} onClick={() => downloadHfFile(m.id, f)}>
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
