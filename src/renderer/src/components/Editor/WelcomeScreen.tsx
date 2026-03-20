import { useWorkspaceStore } from '../../store/workspaceStore'
import styles from './WelcomeScreen.module.css'

export function WelcomeScreen(): JSX.Element {
  const { openFolder } = useWorkspaceStore()

  return (
    <div className={styles.screen}>
      <div className={styles.logo}>⬡</div>
      <h1 className={styles.name}>LocaLLMIDE</h1>
      <p className={styles.sub}>AI-powered editor with local LLMs</p>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => openFolder()}>
          Open Folder
        </button>
      </div>

      <div className={styles.shortcuts}>
        <div className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
          <span>Command Palette</span>
        </div>
        <div className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>L</kbd>
          <span>Toggle AI Chat</span>
        </div>
        <div className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>`</kbd>
          <span>Toggle Terminal</span>
        </div>
        <div className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>S</kbd>
          <span>Save File</span>
        </div>
      </div>
    </div>
  )
}
