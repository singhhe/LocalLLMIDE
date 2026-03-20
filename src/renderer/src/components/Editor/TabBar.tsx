import { useEditorStore } from '../../store/editorStore'
import styles from './TabBar.module.css'

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()

  return (
    <div className={styles.bar}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
          onClick={() => setActiveTab(tab.id)}
          title={tab.path}
        >
          <span className={styles.name}>{tab.isDirty ? '● ' : ''}{tab.name}</span>
          <button
            className={styles.close}
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
            title="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
