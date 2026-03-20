import { useWorkspaceStore } from '../../store/workspaceStore'
import { useEditorStore } from '../../store/editorStore'
import { useGitStore } from '../../store/gitStore'
import { useAiStore } from '../../store/aiStore'
import { useUiStore } from '../../store/uiStore'
import styles from './StatusBar.module.css'

export function StatusBar(): JSX.Element {
  const { current } = useWorkspaceStore()
  const { tabs, activeTabId, cursorLine, cursorColumn } = useEditorStore()
  const { info } = useGitStore()
  const { isModelLoaded, modelName } = useAiStore()
  const { statusMessage, toggleTerminal, toggleAiPanel, setModelManagerOpen, toggleTheme } = useUiStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className={styles.bar}>
      {/* Left section */}
      <div className={styles.left}>
        {info?.branch && (
          <button className={styles.item} title="Branch">
            <span className={styles.icon}>⎇</span>
            <span>{info.branch}</span>
          </button>
        )}
        {statusMessage && (
          <span className={styles.item}>{statusMessage}</span>
        )}
      </div>

      {/* Right section */}
      <div className={styles.right}>
        {activeTab && (
          <>
            <span className={styles.item}>Ln {cursorLine}, Col {cursorColumn}</span>
            <span className={styles.divider} />
            <span className={styles.item}>{activeTab.language}</span>
            <span className={styles.divider} />
          </>
        )}
        <button
          className={`${styles.item} ${isModelLoaded ? styles.modelActive : ''}`}
          onClick={() => setModelManagerOpen(true)}
          title="Model Manager"
        >
          <span className={styles.icon}>⬡</span>
          <span>{isModelLoaded && modelName ? truncate(modelName, 22) : 'No Model'}</span>
        </button>
        <span className={styles.divider} />
        <button className={styles.item} onClick={toggleAiPanel} title="Toggle AI Panel (Ctrl+L)">
          AI
        </button>
        <button className={styles.item} onClick={toggleTerminal} title="Toggle Terminal (Ctrl+`)">
          ⌨
        </button>
        <button className={styles.item} onClick={toggleTheme} title="Toggle Theme">
          ◑
        </button>
      </div>
    </div>
  )
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
