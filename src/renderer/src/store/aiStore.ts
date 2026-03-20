import { create } from 'zustand'
import type { ChatMessage } from '@shared/types'

interface AiState {
  messages: ChatMessage[]
  isStreaming: boolean
  stopFn: (() => void) | null
  modelName: string | null
  isModelLoaded: boolean
  addUserMessage: (content: string) => void
  startAssistantMessage: () => string
  appendToken: (id: string, token: string) => void
  finalizeMessage: (id: string) => void
  setStop: (fn: (() => void) | null) => void
  stop: () => void
  clearMessages: () => void
  loadHistory: () => Promise<void>
  setModelStatus: (loaded: boolean, name: string | null) => void
  sendMessage: (prompt: string, workspacePath?: string) => Promise<void>
}

// Resolve a file path from the AI response to a real disk path.
// Unix-style absolute paths (e.g. /usr/local/bin/foo.sh) are treated as
// workspace-relative on Windows since the model doesn't know the OS.
function resolvePath(filePath: string, workspacePath?: string): string | null {
  const winAbsolute = /^[a-zA-Z]:/.test(filePath)
  const unixAbsolute = filePath.startsWith('/')

  if (winAbsolute) return filePath  // genuine Windows absolute — use as-is
  if (unixAbsolute) {
    // Strip leading slash and make workspace-relative
    const rel = filePath.replace(/^\//, '')
    return workspacePath ? `${workspacePath}/${rel}` : null
  }
  return workspacePath ? `${workspacePath}/${filePath}` : null
}

// Extract file blocks from assistant response.
// Handles two formats:
//   1. ```lang:path/to/file.ext  (explicit)
//   2. ### Heading: `filename.ext` followed by a code block (model fallback)
function extractFileBlocks(text: string): { filePath: string; code: string }[] {
  const blocks: { filePath: string; code: string }[] = []

  // Format 1: explicit lang:filepath header
  const explicit = /```[\w./-]*:([^\n]+)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = explicit.exec(text)) !== null) {
    blocks.push({ filePath: m[1].trim(), code: m[2].trimEnd() })
  }
  if (blocks.length > 0) return blocks

  // Format 2: heading with `filename.ext` immediately before a code block
  const segments = text.split(/(```[\s\S]*?```)/g)
  for (let i = 1; i < segments.length; i += 2) {
    const preceding = segments[i - 1]
    const codeBlock = segments[i]
    const fileMatch = preceding.match(/`([^`\n]+\.[a-zA-Z0-9]{1,10})`\s*$/)
    if (fileMatch) {
      const lines = codeBlock.split('\n')
      const code = lines.slice(1, -1).join('\n').trimEnd()
      blocks.push({ filePath: fileMatch[1].trim(), code })
    }
  }
  return blocks
}

let _msgId = 1

function saveChatHistory(messages: ChatMessage[]) {
  // Only persist non-streaming messages
  const toSave = messages.filter((m) => !m.isStreaming)
  window.api.saveChatHistory(toSave).catch(() => { /* non-fatal */ })
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  isStreaming: false,
  stopFn: null,
  modelName: null,
  isModelLoaded: false,

  addUserMessage: (content: string) => {
    const msg: ChatMessage = {
      id: String(_msgId++), role: 'user', content, timestamp: Date.now()
    }
    set((s) => ({ messages: [...s.messages, msg] }))
  },

  startAssistantMessage: () => {
    const id = String(_msgId++)
    const msg: ChatMessage = {
      id, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true
    }
    set((s) => ({ messages: [...s.messages, msg], isStreaming: true }))
    return id
  },

  appendToken: (id: string, token: string) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      )
    }))
  },

  finalizeMessage: (id: string) => {
    set((s) => {
      const messages = s.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      )
      saveChatHistory(messages)
      return { messages, isStreaming: false, stopFn: null }
    })
  },

  setStop: (fn) => set({ stopFn: fn }),

  stop: () => {
    const { stopFn } = get()
    stopFn?.()
    set({ isStreaming: false, stopFn: null })
  },

  clearMessages: () => {
    window.api.clearHistory().catch(() => { /* model may not be loaded */ })
    window.api.saveChatHistory([]).catch(() => { /* non-fatal */ })
    set({ messages: [] })
  },

  loadHistory: async () => {
    try {
      const messages = await window.api.loadChatHistory()
      if (messages.length > 0) {
        const maxId = messages.reduce((m, msg) => Math.max(m, Number(msg.id)), 0)
        _msgId = maxId + 1
        set({ messages })
      }
    } catch { /* non-fatal */ }
  },

  setModelStatus: (loaded: boolean, name: string | null) =>
    set({ isModelLoaded: loaded, modelName: name }),

  sendMessage: async (userPrompt: string, workspacePath?: string) => {
    const { addUserMessage, startAssistantMessage, appendToken, finalizeMessage, setStop } = get()
    if (!get().isModelLoaded) return

    addUserMessage(userPrompt)
    const assistantId = startAssistantMessage()

    const onDone = async () => {
      finalizeMessage(assistantId)
      // Auto-create any files the AI specified in lang:filepath code blocks
      const msg = get().messages.find((m) => m.id === assistantId)
      if (msg) {
        for (const { filePath, code } of extractFileBlocks(msg.content)) {
          const fullPath = resolvePath(filePath, workspacePath)
          if (fullPath) {
            try { await window.api.writeFile(fullPath, code) } catch { /* ignore */ }
          }
        }
      }
    }

    // LlamaChatSession maintains history internally — just send the user message
    const cancel = await window.api.generateStream(
      userPrompt,
      { maxTokens: 2048, temperature: 0.7 },
      (token) => appendToken(assistantId, token),
      onDone,
      (err) => {
        appendToken(assistantId, `\n\n[Error: ${err}]`)
        finalizeMessage(assistantId)
      }
    )
    setStop(cancel)
  }
}))
