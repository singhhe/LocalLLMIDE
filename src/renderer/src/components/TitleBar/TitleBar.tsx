import { useUiStore } from '../../store/uiStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import styles from './TitleBar.module.css'

export function TitleBar(): JSX.Element {
  const { setCommandPaletteOpen } = useUiStore()
  const { current } = useWorkspaceStore()

  const title = current ? current.name : 'LocaLLMIDE'

  return (
    <div className={`${styles.bar} drag-region`}>
      <div className={styles.left}>
        <span className={styles.logo}>⬡</span>
      </div>
      <button
        className={`${styles.search} no-drag`}
        onClick={() => setCommandPaletteOpen(true)}
        title="Command Palette (Ctrl+Shift+P)"
      >
        <span className={styles.searchIcon}>⌕</span>
        <span className={styles.searchText}>{title}</span>
        <span className={styles.searchHint}>Ctrl+Shift+P</span>
      </button>
      <div className={`${styles.controls} no-drag`}>
        <button className={styles.ctrl} onClick={() => window.api.minimize()} title="Minimize">─</button>
        <button className={styles.ctrl} onClick={() => window.api.maximize()} title="Maximize">▭</button>
        <button className={`${styles.ctrl} ${styles.close}`} onClick={() => window.api.close()} title="Close">✕</button>
      </div>
    </div>
  )
}
