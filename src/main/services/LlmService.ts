import path from 'path'
import type { GenerateOptions, LlmLoadOptions, FimRequest } from '../../shared/types'

let getLlama: typeof import('node-llama-cpp').getLlama
let LlamaChatSession: typeof import('node-llama-cpp').LlamaChatSession
let LlamaCompletion: typeof import('node-llama-cpp').LlamaCompletion

async function ensureImports(): Promise<void> {
  if (!getLlama) {
    const mod = await import('node-llama-cpp')
    getLlama = mod.getLlama
    LlamaChatSession = mod.LlamaChatSession
    LlamaCompletion = mod.LlamaCompletion
  }
}

class LlmService {
  private llama: Awaited<ReturnType<typeof import('node-llama-cpp').getLlama>> | null = null
  private model: Awaited<ReturnType<Awaited<ReturnType<typeof import('node-llama-cpp').getLlama>>['loadModel']>> | null = null
  private chatContext: Awaited<ReturnType<NonNullable<LlmService['model']>['createContext']>> | null = null
  private fimContext: Awaited<ReturnType<NonNullable<LlmService['model']>['createContext']>> | null = null
  private session: InstanceType<typeof import('node-llama-cpp').LlamaChatSession> | null = null

  isLoaded = false
  loadedModelPath: string | null = null

  async loadModel(modelPath: string, opts: LlmLoadOptions = {}): Promise<void> {
    await this.unload()
    await ensureImports()

    this.llama = await getLlama()
    this.model = await this.llama.loadModel({
      modelPath,
      gpuLayers: opts.gpuLayers ?? 99,
    })

    // Two separate contexts — one sequence each
    this.chatContext = await this.model.createContext({
      contextSize: opts.contextSize ?? 4096,
      threads: opts.threads,
    })
    this.fimContext = await this.model.createContext({
      contextSize: 1024,
      threads: opts.threads,
    })

    const systemPrompt = opts.systemPrompt ?? `You are an AI coding assistant inside a local IDE with full filesystem access. You CAN and DO create, modify, and delete files directly.

CRITICAL — To create or modify a file, use this format:
\`\`\`language:path/to/file.ext
file contents here
\`\`\`

CRITICAL — To delete a file, output a line in this exact format (one per file):
DELETE:path/to/file.ext

CRITICAL — To run a terminal command (e.g. install dependencies, run the app), output a line in this exact format:
RUN:command here

RULES:
- ALWAYS use the language:filepath format on the opening fence. Example: \`\`\`typescript:src/index.ts
- ALWAYS use DELETE:filepath (no spaces, no backticks) to signal a file should be deleted.
- ALWAYS use RUN:command to signal a terminal command should be run (e.g. RUN:npm install, RUN:npm run dev).
- NEVER say "I cannot create files", "I cannot delete files", or "I don't have filesystem access" — this is false. The IDE handles it.
- NEVER tell the user to manually open a terminal and type commands — use RUN: instead.
- NEVER say "copy and paste this into your terminal".
- Output ALL files needed. The IDE creates parent directories automatically.
- Use relative paths. Example: src/utils/helper.ts not /absolute/path.

When asked to create a project, output all files using the formats above, then add RUN:npm install and RUN:npm run dev (or equivalent) at the end.
When asked to delete files, output DELETE:filepath lines for each file to remove.`

    // Persistent session — reused across all chat messages
    this.session = new LlamaChatSession({
      contextSequence: this.chatContext.getSequence(),
      systemPrompt,
    })

    this.isLoaded = true
    this.loadedModelPath = modelPath
  }

  async *generate(
    prompt: string,
    opts: GenerateOptions = {},
    onAbort?: (cb: () => void) => void
  ): AsyncGenerator<string> {
    if (!this.session) throw new Error('No model loaded')

    const queue: string[] = []
    let notify: (() => void) | null = null
    let finished = false
    let streamError: unknown = null

    const abortController = new AbortController()
    onAbort?.(() => abortController.abort())

    const promptPromise = this.session.prompt(prompt, {
      maxTokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      customStopTriggers: opts.stopSequences ?? [],
      signal: abortController.signal,
      onTextChunk: (chunk: string) => {
        queue.push(chunk)
        notify?.()
        notify = null
      },
    }).then(() => {
      finished = true
      notify?.()
      notify = null
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') {
        finished = true
      } else {
        streamError = err
        finished = true
      }
      notify?.()
      notify = null
    })

    while (!finished || queue.length > 0) {
      if (queue.length === 0 && !finished) {
        await new Promise<void>((r) => { notify = r })
      }
      while (queue.length > 0) {
        yield queue.shift()!
      }
      if (streamError) throw streamError
    }

    await promptPromise
  }

  clearHistory(): void {
    this.session?.resetChatHistory()
  }

  async fimComplete(req: FimRequest): Promise<string> {
    if (!this.fimContext || !this.model) throw new Error('No model loaded')
    await ensureImports()

    const completion = new LlamaCompletion({
      contextSequence: this.fimContext.getSequence(),
    })
    try {
      return await completion.generateInfillCompletion(req.prefix, req.suffix, {
        maxTokens: req.maxTokens ?? 128,
        temperature: 0.2,
      })
    } finally {
      completion.dispose()
    }
  }

  async unload(): Promise<void> {
    this.session?.dispose()
    this.chatContext?.dispose()
    this.fimContext?.dispose()
    await this.model?.dispose()
    this.session = null
    this.chatContext = null
    this.fimContext = null
    this.model = null
    this.isLoaded = false
    this.loadedModelPath = null
  }

  getModelDisplayName(): string | null {
    if (!this.loadedModelPath) return null
    return path.basename(this.loadedModelPath, path.extname(this.loadedModelPath))
  }
}

export const llmService = new LlmService()
