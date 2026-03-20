import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useUiStore } from '../../store/uiStore'
import 'xterm/css/xterm.css'
import styles from './TerminalPanel.module.css'

interface Props {
  cwd: string
}

const TERM_ID = 'main'

export function TerminalPanel({ cwd }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { toggleTerminal } = useUiStore()

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#0d0d0d',
        foreground: '#e6e6e6',
        cursor: '#7c5cf6',
        selectionBackground: 'rgba(124, 92, 246, 0.3)',
        black: '#1a1a1a', brightBlack: '#555555',
        red: '#f25c5c', brightRed: '#ff7070',
        green: '#3dca7d', brightGreen: '#50e89a',
        yellow: '#e8b84b', brightYellow: '#ffd060',
        blue: '#4d9cf6', brightBlue: '#6db5ff',
        magenta: '#7c5cf6', brightMagenta: '#9070ff',
        cyan: '#3fcfd5', brightCyan: '#55e8ee',
        white: '#e6e6e6', brightWhite: '#ffffff',
      },
      fontFamily: 'Cascadia Code, Fira Code, JetBrains Mono, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      allowTransparency: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    const { cols, rows } = term

    // Spawn PTY
    window.api.termCreate(TERM_ID, cwd).then(() => {
      fitAddon.fit()
    })

    // PTY → terminal
    const unsubData = window.api.onTermData(TERM_ID, (data) => term.write(data))

    // terminal → PTY
    term.onData((data) => window.api.termWrite(TERM_ID, data))

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      window.api.termResize(TERM_ID, term.cols, term.rows)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      unsubData()
      resizeObserver.disconnect()
      window.api.termKill(TERM_ID)
      term.dispose()
    }
  }, [cwd])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>TERMINAL</span>
        <button className="icon-btn" onClick={toggleTerminal} title="Close Terminal">✕</button>
      </div>
      <div ref={containerRef} className={styles.xterm} />
    </div>
  )
}
