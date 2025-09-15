import * as vscode from 'vscode'

/**
 * 滚动同步管理器
 * 负责管理编辑器和预览窗口之间的滚动同步
 */
export class ScrollSyncManager {
  private _currentDocument: vscode.TextDocument | undefined
  private _scrollSyncDisposables: vscode.Disposable[] = []
  private _scrollSource: 'editor' | 'preview' | 'none' = 'none'
  private _scrollTimeout: NodeJS.Timeout | undefined
  private _panel: vscode.WebviewPanel | undefined
  private _lastVisibleRange: vscode.Range | undefined
  private _scrollCheckInterval: NodeJS.Timeout | undefined

  constructor() {
    // 初始化时不设置任何监听器，等待设置面板和文档
  }

  /**
   * 设置当前面板
   */
  public setPanel(panel: vscode.WebviewPanel | undefined): void {
    this._panel = panel
  }

  /**
   * 设置当前文档并初始化滚动同步
   */
  public setupScrollSync(document: vscode.TextDocument): void {
    // 清理之前的滚动同步监听器
    this.disposeScrollSync()

    this._currentDocument = document

    // 主要滚动监听器 - 使用 onDidChangeTextEditorVisibleRanges
    const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      if (event.textEditor.document === document && this._panel && this._scrollSource !== 'preview') {
        this.syncEditorScrollToPreview(event.textEditor)
      }
    })
    this._scrollSyncDisposables.push(scrollDisposable)

    // 备用滚动监听器 - 使用 onDidChangeTextEditorSelection (更频繁触发)
    const selectionDisposable = vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor.document === document && this._panel && this._scrollSource !== 'preview') {
        this.syncEditorScrollToPreview(event.textEditor)
      }
    })
    this._scrollSyncDisposables.push(selectionDisposable)

    // 添加定时器来定期检查编辑器滚动位置
    this._scrollCheckInterval = setInterval(() => {
      const activeEditor = vscode.window.activeTextEditor
      if (activeEditor && activeEditor.document === document && this._panel && this._scrollSource !== 'preview') {
        const currentVisibleRange = activeEditor.visibleRanges[0]
        if (currentVisibleRange && this._lastVisibleRange) {
          // 检查可见区域是否发生变化
          if (!currentVisibleRange.isEqual(this._lastVisibleRange)) {
            this.syncEditorScrollToPreview(activeEditor)
            this._lastVisibleRange = currentVisibleRange
          }
        }
        else if (currentVisibleRange) {
          this._lastVisibleRange = currentVisibleRange
        }
      }
    }, 100) // 每100ms检查一次

    // 监听编辑器变化
    const editorChangeDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
      const documentUri = document.uri.toString()
      for (const editor of editors) {
        if (editor.document.uri.toString() === documentUri && this._panel) {
          this.syncEditorScrollToPreview(editor)
          break
        }
      }
    })
    this._scrollSyncDisposables.push(editorChangeDisposable)

    // 监听活动编辑器变化
    const activeEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document === document && this._panel) {
        this.syncEditorScrollToPreview(editor)
      }
    })
    this._scrollSyncDisposables.push(activeEditorChangeDisposable)
  }

  /**
   * 处理预览窗口滚动事件
   */
  public handlePreviewScroll(scrollPercentage: number, source?: string, _timestamp?: number): void {
    // 只有当消息来源是编辑器时才跳过，或者当前正在从编辑器同步滚动
    if (!this._currentDocument || source === 'editor' || this._scrollSource === 'editor') {
      return
    }

    // 滚动同步默认启用，无需配置检查

    // 使用文档URI查找对应的编辑器
    const documentUri = this._currentDocument.uri.toString()
    let targetEditor: vscode.TextEditor | undefined

    // 优先使用活动编辑器
    const activeEditor = vscode.window.activeTextEditor
    if (activeEditor && activeEditor.document.uri.toString() === documentUri) {
      targetEditor = activeEditor
    }
    else {
      // 查找所有可见的编辑器
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === documentUri) {
          targetEditor = editor
          break
        }
      }
    }

    if (!targetEditor) {
      return
    }

    try {
      const totalLines = this._currentDocument.lineCount
      if (totalLines === 0) {
        return
      }

      const targetLine = Math.min(
        Math.floor(scrollPercentage * Math.max(0, totalLines - 1)),
        totalLines - 1,
      )
      const range = new vscode.Range(targetLine, 0, targetLine, 0)

      // 设置滚动源并即时滚动编辑器
      this._scrollSource = 'preview'
      targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)

      // 延迟重置滚动源，与编辑器端保持一致，避免循环滚动
      if (this._scrollTimeout) {
        clearTimeout(this._scrollTimeout)
      }
      this._scrollTimeout = setTimeout(() => {
        this._scrollSource = 'none'
      }, 50) // 与预览端保持一致
    }
    catch (error) {
      console.error('Error syncing preview scroll to editor:', error)
    }
  }

  /**
   * 同步编辑器滚动到预览窗口
   */
  private syncEditorScrollToPreview(editor: vscode.TextEditor): void {
    if (!this._panel || !this._currentDocument || this._scrollSource === 'preview') {
      return
    }

    const visibleRange = editor.visibleRanges[0]
    if (!visibleRange) {
      return
    }

    const totalLines = editor.document.lineCount
    if (totalLines === 0) {
      return
    }

    // 使用可见区域中间位置计算滚动比例
    const middleLine = Math.floor((visibleRange.start.line + visibleRange.end.line) / 2)
    const scrollRatio = Math.max(0, Math.min(1, middleLine / Math.max(1, totalLines - 1)))

    // 设置滚动源并发送消息
    this._scrollSource = 'editor'
    this._panel.webview.postMessage({
      command: 'scrollToPercentage',
      percentage: scrollRatio,
      source: 'editor',
    })

    // 延迟重置滚动源，避免死循环，与预览区保持一致的延迟时间
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout)
    }
    this._scrollTimeout = setTimeout(() => {
      this._scrollSource = 'none'
    }, 50) // 与预览端保持一致
  }

  /**
   * 启用滚动同步
   */
  public enableScrollSync(): void {
    if (this._currentDocument) {
      this.setupScrollSync(this._currentDocument)
    }
  }

  /**
   * 禁用滚动同步
   */
  public disableScrollSync(): void {
    this.disposeScrollSync()
  }

  /**
   * 清理滚动同步相关资源
   */
  public disposeScrollSync(): void {
    // 清理滚动同步相关的监听器
    this._scrollSyncDisposables.forEach(disposable => disposable.dispose())
    this._scrollSyncDisposables = []

    // 清理滚动超时
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout)
      this._scrollTimeout = undefined
    }

    // 清理定时器
    if (this._scrollCheckInterval) {
      clearInterval(this._scrollCheckInterval)
      this._scrollCheckInterval = undefined
    }

    // 重置状态
    this._lastVisibleRange = undefined
  }

  /**
   * 获取当前文档
   */
  public getCurrentDocument(): vscode.TextDocument | undefined {
    return this._currentDocument
  }

  /**
   * 完全销毁管理器
   */
  public dispose(): void {
    this.disposeScrollSync()
    this._currentDocument = undefined
    this._panel = undefined
  }
}
