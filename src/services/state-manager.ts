import type * as vscode from 'vscode'

export interface PreviewState {
  documentUri: string
  theme: string
  timestamp: number
}

export class StateManager {
  private _stateSaveInterval: NodeJS.Timeout | undefined
  private _panel: vscode.WebviewPanel | undefined
  private _currentState: PreviewState | undefined

  constructor(panel?: vscode.WebviewPanel) {
    this._panel = panel
  }

  /**
   * Set the webview panel
   */
  setPanel(panel: vscode.WebviewPanel): void {
    this._panel = panel
  }

  startPeriodicStateSave(): void {
    this.stopPeriodicStateSave() // Clear any existing interval

    this.saveState()

    this._stateSaveInterval = setInterval(() => {
      this.saveState()
    }, 5000)
  }

  stopPeriodicStateSave(): void {
    if (this._stateSaveInterval) {
      clearInterval(this._stateSaveInterval)
      this._stateSaveInterval = undefined
    }
  }

  /**
   * Save current state to webview
   */
  saveState(document?: vscode.TextDocument, theme?: string): void {
    if (!this._panel || !document) {
      return
    }

    const state: PreviewState = {
      documentUri: document.uri.toString(),
      theme: theme || '',
      timestamp: Date.now(),
    }

    this._currentState = state

    this._panel.webview.postMessage({
      command: 'saveState',
      state,
    })
  }

  /**
   * Get the current state
   */
  get currentState(): PreviewState | undefined {
    return this._currentState
  }

  /**
   * Restore state from a saved state
   */
  restoreState(state: PreviewState): void {
    this._currentState = state
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopPeriodicStateSave()
    this._panel = undefined
    this._currentState = undefined
  }
}
