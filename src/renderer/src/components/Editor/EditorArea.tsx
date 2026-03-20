import { useEditorStore } from '../../store/editorStore'
import { TabBar } from './TabBar'
import { MonacoEditor } from './MonacoEditor'
import { WelcomeScreen } from './WelcomeScreen'
import styles from './EditorArea.module.css'

export function EditorArea(): JSX.Element {
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className={styles.area}>
      {tabs.length > 0 && <TabBar />}
      <div className={styles.content}>
        {activeTab ? (
          <MonacoEditor tab={activeTab} />
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  )
}
