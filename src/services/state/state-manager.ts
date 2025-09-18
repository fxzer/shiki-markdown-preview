import type * as vscode from 'vscode'
/**
 * 预览状态接口
 * 定义了 Markdown 预览器需要保存的状态信息
 */
export interface PreviewState {
  /** 当前预览文档的 URI 路径 */
  documentUri: string
  /** 当前使用的主题名称 */
  theme: string
  /** 状态保存的时间戳 */
  timestamp: number
}

/**
 * 状态管理器
 * 负责管理 Markdown 预览器的状态持久化和恢复
 */
export class StateManager {
  private _stateSaveInterval: NodeJS.Timeout | undefined
  private _panel: vscode.WebviewPanel | undefined
  private _currentState: PreviewState | undefined

  /**
   * 构造函数
   * @param panel 可选的 Webview 面板实例
   */
  constructor(panel?: vscode.WebviewPanel) {
    this._panel = panel
  }

  /**
   * 设置 Webview 面板
   * @param panel Webview 面板实例
   */
  setPanel(panel: vscode.WebviewPanel): void {
    this._panel = panel
  }

  /**
   * 启动定期状态保存
   * 每 5 秒自动保存一次状态，确保状态不丢失
   */
  startPeriodicStateSave(): void {
    this.stopPeriodicStateSave()

    this.saveState()

    this._stateSaveInterval = setInterval(() => {
      this.saveState()
    }, 5000)
  }

  /**
   * 停止定期状态保存
   * 清理定时器资源
   */
  stopPeriodicStateSave(): void {
    if (this._stateSaveInterval) {
      clearInterval(this._stateSaveInterval)
      this._stateSaveInterval = undefined
    }
  }

  /**
   * 保存当前状态到 Webview
   * @param document 可选的文档实例
   * @param theme 可选的主题名称
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

    // 向 Webview 发送状态保存消息
    this._panel.webview.postMessage({
      command: 'saveState',
      state,
    })
  }

  /**
   * 获取当前状态
   * @returns 当前保存的状态，如果未保存则返回 undefined
   */
  get currentState(): PreviewState | undefined {
    return this._currentState
  }

  /**
   * 从保存的状态中恢复
   * @param state 要恢复的状态对象
   */
  restoreState(state: PreviewState): void {
    this._currentState = state
  }

  /**
   * 释放资源
   * 清理定时器和状态引用，防止内存泄漏
   */
  dispose(): void {
    this.stopPeriodicStateSave()
    this._panel = undefined
    this._currentState = undefined
  }
}
