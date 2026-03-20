import { useState, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { ChatMessage as ChatMessageType } from '../../../../shared/types'
import styles from './ChatMessage.module.css'

interface Props {
  message: ChatMessageType
}

interface CodeBlock {
  lang: string
  filePath: string | null  // set when header is lang:path/to/file
  code: string
}

function parseCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const re = /```([\w./-]*:[^\n]+|[\w]*)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const header = m[1]
    const code = m[2].trimEnd()
    const colonIdx = header.indexOf(':')
    if (colonIdx > 0) {
      blocks.push({ lang: header.slice(0, colonIdx), filePath: header.slice(colonIdx + 1).trim(), code })
    } else {
      blocks.push({ lang: header, filePath: null, code })
    }
  }
  return blocks
}

function renderContent(
  text: string,
  onApply: (code: string) => void,
  onCreateFile: (filePath: string, code: string) => void,
  onDeleteFile: (filePath: string) => void,
  deleteStatus: Record<string, 'pending' | 'ok' | 'err'>
) {
  // Split into alternating text and code block segments
  const segments = text.split(/(```[\s\S]*?```)/g)

  return segments.map((seg, i) => {
    if (!seg.startsWith('```')) {
      // Render text: detect DELETE:filepath lines, then inline code, then plain text
      const lines = seg.split('\n')
      const parts: JSX.Element[] = []
      lines.forEach((line, li) => {
        const deleteMatch = line.match(/^DELETE:(.+)$/)
        if (deleteMatch) {
          const fp = deleteMatch[1].trim()
          const status = deleteStatus[fp]
          parts.push(
            <div key={`del-${i}-${li}`} className={styles.deleteDirective}>
              <span className={styles.deleteIcon}>🗑</span>
              <span className={styles.deletePath}>{fp}</span>
              {status === 'ok' ? (
                <span className={styles.deleteOk}>✓ Deleted</span>
              ) : status === 'err' ? (
                <span className={styles.deleteErr}>✗ Failed</span>
              ) : (
                <button className={styles.deleteBtn} onClick={() => onDeleteFile(fp)}>
                  Delete file
                </button>
              )}
            </div>
          )
        } else {
          const inlineParts = line.split(/(`[^`\n]+`)/g)
          parts.push(
            <span key={`txt-${i}-${li}`} style={{ whiteSpace: 'pre-wrap' }}>
              {inlineParts.map((p, j) =>
                p.startsWith('`') && p.endsWith('`') && p.length > 2
                  ? <code key={j} className={styles.inlineCode}>{p.slice(1, -1)}</code>
                  : <span key={j}>{p}</span>
              )}
              {li < lines.length - 1 ? '\n' : ''}
            </span>
          )
        }
      })
      return <span key={i}>{parts}</span>
    }

    // Code block
    const lines = seg.split('\n')
    const header = lines[0].replace('```', '').trim()
    const colonIdx = header.indexOf(':')
    const lang = colonIdx > 0 ? header.slice(0, colonIdx) : header
    let filePath = colonIdx > 0 ? header.slice(colonIdx + 1).trim() : null
    const code = lines.slice(1, -1).join('\n')

    // Fallback: check if the preceding text segment ends with `filename.ext`
    if (!filePath && i > 0) {
      const prev = segments[i - 1]
      const m = prev.match(/`([^`\n]+\.[a-zA-Z0-9]{1,10})`\s*$/)
      if (m) filePath = m[1].trim()
    }

    return (
      <div key={i} className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          {filePath
            ? <span className={styles.codePath}>{filePath}</span>
            : lang && <span className={styles.codeLang}>{lang}</span>
          }
          <div className={styles.codeActions}>
            {filePath && (
              <button className={styles.createBtn} onClick={() => onCreateFile(filePath!, code)}>
                + Create file
              </button>
            )}
            <button className={styles.applyBtn} onClick={() => onApply(code)}>
              ⬆ Apply
            </button>
          </div>
        </div>
        <pre className={styles.code}><code>{code}</code></pre>
      </div>
    )
  })
}

export function ChatMessage({ message }: Props): JSX.Element {
  const { tabs, activeTabId, setTabContent } = useEditorStore()
  const { current: workspace, refreshTree } = useWorkspaceStore()
  const [copied, setCopied] = useState(false)
  const [createStatus, setCreateStatus] = useState<Record<string, 'ok' | 'err'>>({})
  const [deleteStatus, setDeleteStatus] = useState<Record<string, 'pending' | 'ok' | 'err'>>({})
  const isUser = message.role === 'user'

  const applyToEditor = (code: string) => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return
    setTabContent(activeTabId!, activeTab.content + '\n' + code)
  }

  const createFile = async (filePath: string, code: string) => {
    const base = workspace?.path
    const winAbsolute = /^[a-zA-Z]:/.test(filePath)
    const unixAbsolute = filePath.startsWith('/')
    let fullPath: string
    if (winAbsolute) fullPath = filePath
    else if (unixAbsolute) fullPath = base ? `${base}/${filePath.replace(/^\//, '')}` : filePath
    else fullPath = base ? `${base}/${filePath}` : filePath
    try {
      await window.api.writeFile(fullPath, code)
      setCreateStatus((s) => ({ ...s, [filePath]: 'ok' }))
      await refreshTree()
    } catch {
      setCreateStatus((s) => ({ ...s, [filePath]: 'err' }))
    }
  }

  const deleteFile = useCallback(async (filePath: string) => {
    const base = workspace?.path
    const winAbsolute = /^[a-zA-Z]:/.test(filePath)
    const unixAbsolute = filePath.startsWith('/')
    let fullPath: string
    if (winAbsolute) fullPath = filePath
    else if (unixAbsolute) fullPath = base ? `${base}/${filePath.replace(/^\//, '')}` : filePath
    else fullPath = base ? `${base}/${filePath}` : filePath
    setDeleteStatus((s) => ({ ...s, [filePath]: 'pending' }))
    try {
      await window.api.deleteFile(fullPath)
      setDeleteStatus((s) => ({ ...s, [filePath]: 'ok' }))
      await refreshTree()
    } catch {
      setDeleteStatus((s) => ({ ...s, [filePath]: 'err' }))
    }
  }, [workspace, refreshTree])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`${styles.msg} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.role}>{isUser ? 'You' : 'AI'}</div>
      <div className={styles.content}>
        {renderContent(message.content, applyToEditor, createFile, deleteFile, deleteStatus)}
        {message.isStreaming && <span className={styles.cursor}>▋</span>}
      </div>
      {!isUser && !message.isStreaming && (
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={copyToClipboard}>
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
        </div>
      )}
      {Object.entries(createStatus).map(([fp, status]) => (
        <div key={fp} className={status === 'ok' ? styles.createOk : styles.createErr}>
          {status === 'ok' ? `✓ Created ${fp}` : `✗ Failed to create ${fp}`}
        </div>
      ))}
    </div>
  )
}
