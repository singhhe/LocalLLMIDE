import { useRef, useEffect, useState } from 'react'
import { useAiStore } from '../../store/aiStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useEditorStore } from '../../store/editorStore'
import { ChatMessage } from './ChatMessage'
import styles from './AiPanel.module.css'

interface AttachedFile {
  name: string
  path: string
  language: string
  content: string
}

export function AiPanel(): JSX.Element {
  const { messages, isStreaming, isModelLoaded, modelName, sendMessage, stop, clearMessages, loadHistory } = useAiStore()
  const { setModelManagerOpen } = useUiStore()
  const { current: workspace, refreshTree } = useWorkspaceStore()
  const { tabs, activeTabId } = useEditorStore()
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevStreaming = useRef(false)

  // Load persisted chat history once on mount
  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Refresh file tree when streaming finishes (AI may have created files)
  useEffect(() => {
    if (prevStreaming.current && !isStreaming) {
      refreshTree()
    }
    prevStreaming.current = isStreaming
  }, [isStreaming, refreshTree])

  const attachCurrentFile = () => {
    const tab = tabs.find((t) => t.id === activeTabId)
    if (!tab || tab.content == null) return
    setAttachedFiles((prev) => {
      if (prev.some((f) => f.path === tab.path)) return prev
      return [...prev, { name: tab.name, path: tab.path, language: tab.language, content: tab.content! }]
    })
  }

  const removeAttached = (path: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== path))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming || !isModelLoaded) return
    setInput('')

    let fullPrompt = text
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles
        .map((f) => `[File: ${f.name}]\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
        .join('\n\n')
      fullPrompt = `${fileContext}\n\n${text}`
      setAttachedFiles([])
    }

    await sendMessage(fullPrompt, workspace?.path)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>AI CHAT</span>
        <div className={styles.headerRight}>
          {modelName && <span className={styles.modelBadge}>{modelName}</span>}
          <button className="icon-btn" onClick={clearMessages} title="Clear chat">🗑</button>
        </div>
      </div>

      {!isModelLoaded && (
        <div className={styles.noModel}>
          <span>No model loaded.</span>
          <button className={styles.loadBtn} onClick={() => setModelManagerOpen(true)}>
            Load a Model
          </button>
        </div>
      )}

      <div className={styles.messages}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        {attachedFiles.length > 0 && (
          <div className={styles.attachedFiles}>
            {attachedFiles.map((f) => (
              <div key={f.path} className={styles.fileChip}>
                <span className={styles.fileChipName}>{f.name}</span>
                <button className={styles.fileChipRemove} onClick={() => removeAttached(f.path)}>×</button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder={isModelLoaded ? 'Ask anything… (Enter to send, Shift+Enter for newline)' : 'Load a model first'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isModelLoaded || isStreaming}
          rows={3}
        />
        <div className={styles.inputActions}>
          <button
            className={styles.attachBtn}
            onClick={attachCurrentFile}
            disabled={!isModelLoaded || isStreaming || !activeTabId}
            title="Attach current file as context"
          >
            @ file
          </button>
          {isStreaming ? (
            <button className={styles.stopBtn} onClick={stop}>■ Stop</button>
          ) : (
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!isModelLoaded || !input.trim()}
            >
              Send ↑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
