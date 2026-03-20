import { useState, useCallback } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useEditorStore } from '../../store/editorStore'
import type { FileNode } from '../../../../shared/types'
import styles from './FileTree.module.css'

function FileIcon({ isDir, name }: { isDir: boolean; name: string }): JSX.Element {
  if (isDir) return <span className={styles.iconDir}>▸</span>
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const colors: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f0db4f', jsx: '#61dafb',
    json: '#cbcb41', css: '#42a5f5', html: '#e44b23', md: '#ffffff',
    py: '#3572a5', rs: '#dea584', go: '#00add8', cs: '#178600',
  }
  const color = colors[ext] ?? '#888'
  return <span className={styles.iconFile} style={{ color }}>●</span>
}

function TreeNode({
  node, depth, onOpen
}: {
  node: FileNode
  depth: number
  onOpen: (node: FileNode) => void
}): JSX.Element {
  const [expanded, setExpanded] = useState(depth === 0)

  const toggle = () => {
    if (node.isDirectory) setExpanded((e) => !e)
    else onOpen(node)
  }

  const name = node.name
  const indent = depth * 12

  return (
    <div>
      <div
        className={styles.node}
        style={{ paddingLeft: 8 + indent }}
        onClick={toggle}
        title={node.path}
      >
        <span className={styles.icon}>
          {node.isDirectory
            ? <span className={`${styles.arrow} ${expanded ? styles.expanded : ''}`}>▸</span>
            : <FileIcon isDir={false} name={name} />
          }
        </span>
        <span className={styles.label}>{name}</span>
      </div>
      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree(): JSX.Element {
  const { current, fileTree, openFolder, refreshTree } = useWorkspaceStore()
  const { openTab } = useEditorStore()

  const handleOpen = useCallback((node: FileNode) => {
    openTab(node.path, node.name)
  }, [openTab])

  return (
    <div className={styles.tree}>
      <div className={styles.header}>
        <span className={styles.title}>
          {current ? current.name.toUpperCase() : 'EXPLORER'}
        </span>
        <div className={styles.actions}>
          <button className="icon-btn" onClick={() => refreshTree()} title="Refresh">↻</button>
          <button className="icon-btn" onClick={() => openFolder()} title="Open Folder">⊕</button>
        </div>
      </div>
      <div className={styles.content}>
        {!current ? (
          <div className={styles.empty}>
            <p>No folder open</p>
            <button className={styles.openBtn} onClick={() => openFolder()}>
              Open Folder
            </button>
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} onOpen={handleOpen} />
          ))
        )}
      </div>
    </div>
  )
}
