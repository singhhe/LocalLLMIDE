import { useRef, useEffect, useState } from 'react'
import { useAiStore } from '../../store/aiStore'
import { useUiStore } from '../../store/uiStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ChatMessage } from './ChatMessage'
import styles from './AiPanel.module.css'

export function AiPanel(): JSX.Element {
  const { messages, isStreaming, isModelLoaded, modelName, sendMessage, stop, clearMessages } = useAiStore()
  const { setModelManagerOpen } = useUiStore()
  const { current: workspace, refreshTree } = useWorkspaceStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevStreaming = useRef(false)

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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming || !isModelLoaded) return
    setInput('')
    await sendMessage(text, workspace?.path)
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
