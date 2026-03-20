import { useState, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'
import styles from './GitHubPanel.module.css'

export function GitHubPanel(): JSX.Element {
  const { setGithubModalOpen } = useUiStore()
  const [status, setStatus] = useState<{ isAuthenticated: boolean; username: string | null }>({
    isAuthenticated: false, username: null
  })

  useEffect(() => {
    window.api.githubStatus().then(setStatus)
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>GITHUB</span>
      </div>
      <div className={styles.body}>
        {status.isAuthenticated ? (
          <p className={styles.user}>Signed in as <strong>{status.username}</strong></p>
        ) : (
          <p className={styles.hint}>Not connected to GitHub.</p>
        )}
        <button className={styles.btn} onClick={() => setGithubModalOpen(true)}>
          {status.isAuthenticated ? 'Open GitHub Panel' : 'Connect to GitHub'}
        </button>
      </div>
    </div>
  )
}
