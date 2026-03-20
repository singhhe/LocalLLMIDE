import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import type { App } from 'electron'
import type { ModelInfo, DownloadProgress } from '../../shared/types'
import { settingsService } from './SettingsService'

// Lazy accessor — app.getPath() requires app to be ready
const getModelsDir = () => {
  const custom = settingsService.get('modelsDir')
  if (custom) return custom
  const { app } = require('electron') as { app: App }
  return path.join(app.getPath('userData'), 'Models')
}


export const AVAILABLE_MODELS: ModelInfo[] = [
  // ── Qwen2.5 Coder ─────────────────────────────────────────────────────────
  {
    name: 'Qwen2.5-Coder-1.5B-Instruct-Q4_K_M',
    description: 'Fast, small coding model. Best for low-VRAM / CPU-only machines.',
    sizeDisplay: '1.1 GB',
    sizeBytes: 1_202_590_843,
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'
  },
  {
    name: 'Qwen2.5-Coder-7B-Instruct-Q4_K_M',
    description: 'Balanced coding model. Good for 8 GB RAM machines.',
    sizeDisplay: '4.7 GB',
    sizeBytes: 5_025_100_134,
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf'
  },
  {
    name: 'Qwen2.5-Coder-14B-Instruct-Q4_K_M',
    description: 'High-quality coding model. Requires 10 GB VRAM / 16 GB RAM.',
    sizeDisplay: '8.99 GB',
    sizeBytes: 9_650_000_000,
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/qwen2.5-coder-14b-instruct-q4_k_m.gguf'
  },
  {
    name: 'Qwen2.5-Coder-32B-Instruct-Q4_K_M',
    description: 'Best-in-class coding model. Requires 24 GB RAM.',
    sizeDisplay: '19.85 GB',
    sizeBytes: 21_310_000_000,
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q4_k_m.gguf'
  },
  // ── DeepSeek Coder ────────────────────────────────────────────────────────
  {
    name: 'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M',
    description: 'Strong code generation. Requires 16 GB RAM.',
    sizeDisplay: '10.4 GB',
    sizeBytes: 11_123_961_977,
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf'
  },
  {
    name: 'DeepSeek-R1-Distill-Qwen-7B-Q4_K_M',
    description: 'Reasoning-focused model distilled from DeepSeek-R1. 8 GB RAM.',
    sizeDisplay: '4.68 GB',
    sizeBytes: 5_025_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf'
  },
  {
    name: 'DeepSeek-R1-Distill-Qwen-14B-Q4_K_M',
    description: 'Stronger reasoning distilled model. Requires 16 GB RAM.',
    sizeDisplay: '8.99 GB',
    sizeBytes: 9_650_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf'
  },
  // ── Llama 3.2 / 3.1 ──────────────────────────────────────────────────────
  {
    name: 'Llama-3.2-3B-Instruct-Q4_K_M',
    description: 'Meta Llama 3.2 3B — fast general assistant. 2 GB RAM.',
    sizeDisplay: '2.02 GB',
    sizeBytes: 2_170_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf'
  },
  {
    name: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M',
    description: 'Meta Llama 3.1 8B — solid general assistant. 8 GB RAM.',
    sizeDisplay: '4.92 GB',
    sizeBytes: 5_285_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf'
  },
  // ── Microsoft Phi ─────────────────────────────────────────────────────────
  {
    name: 'Phi-3.5-mini-instruct-Q4_K_M',
    description: 'Microsoft Phi-3.5 mini — punches above its size. 2.4 GB RAM.',
    sizeDisplay: '2.39 GB',
    sizeBytes: 2_570_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf'
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    name: 'Mistral-7B-Instruct-v0.3-Q4_K_M',
    description: 'Mistral 7B — fast and capable general model. 8 GB RAM.',
    sizeDisplay: '4.37 GB',
    sizeBytes: 4_690_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf'
  },
  // ── Google Gemma ──────────────────────────────────────────────────────────
  {
    name: 'gemma-2-2b-it-Q4_K_M',
    description: 'Google Gemma 2 2B — tiny but capable. 1.8 GB RAM.',
    sizeDisplay: '1.63 GB',
    sizeBytes: 1_750_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf'
  },
  {
    name: 'gemma-2-9b-it-Q4_K_M',
    description: 'Google Gemma 2 9B — excellent quality for its size. 8 GB RAM.',
    sizeDisplay: '5.77 GB',
    sizeBytes: 6_200_000_000,
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf'
  },
]

class ModelDownloadService {
  private activeControllers = new Map<string, AbortController>()

  getModelsWithStatus(): (ModelInfo & { localPath: string | null })[] {
    return AVAILABLE_MODELS.map((m) => {
      const localPath = path.join(getModelsDir(), m.name + '.gguf')
      return { ...m, localPath: fs.existsSync(localPath) ? localPath : null }
    })
  }

  async download(
    model: ModelInfo,
    onProgress: (p: DownloadProgress) => void
  ): Promise<string> {
    await fsp.mkdir(getModelsDir(), { recursive: true })
    const destPath = path.join(getModelsDir(), model.name + '.gguf')

    const controller = new AbortController()
    this.activeControllers.set(model.name, controller)

    const response = await fetch(model.downloadUrl, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const total = Number(response.headers.get('content-length') ?? -1)
    const dest = fs.createWriteStream(destPath)
    const reader = response.body!.getReader()

    let received = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        dest.write(value)
        received += value.byteLength
        onProgress({ bytesReceived: received, totalBytes: total, percent: total > 0 ? (received / total) * 100 : 0, fileName: model.name })
      }
    } catch (err) {
      dest.destroy()
      await fsp.unlink(destPath).catch(() => {})
      throw err
    } finally {
      dest.end()
      this.activeControllers.delete(model.name)
    }

    return destPath
  }

  cancel(modelName: string): void {
    this.activeControllers.get(modelName)?.abort()
    this.activeControllers.delete(modelName)
  }
}

export const modelDownloadService = new ModelDownloadService()
