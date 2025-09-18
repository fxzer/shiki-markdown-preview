import type { debounce as DebounceFunction } from 'throttle-debounce'
import { debounce } from 'throttle-debounce'
import * as vscode from 'vscode'

/**
 * 滚动同步管理器
 * 负责管理编辑器和预览窗口之间的滚动同步
 */
export class ScrollSyncManager {
  private _currentDocument: vscode.TextDocument | undefined
  private _scrollSyncDisposables: vscode.Disposable[] = []
  private _scrollSource: 'editor' | 'preview' | 'none' = 'none'
  private _panel: vscode.WebviewPanel | undefined
  private _lastVisibleRange: vscode.Range | undefined
  private _scrollCheckInterval: NodeJS.Timeout | undefined
  private _resetScrollSourceDebounced: DebounceFunction<() => void>

  constructor() {
    // 使用 throttle-debounce 库创建防抖函数来重置滚动源
    this._resetScrollSourceDebounced = debounce(100, () => {
      this._scrollSource = 'none'
    })
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

    // 添加定时器来定期检查编辑器滚动位置（降低频率以减少性能影响）
    this._scrollCheckInterval = setInterval(() => {
      const activeEditor = vscode.window.activeTextEditor
      if (activeEditor && activeEditor.document === document && this._panel && this._scrollSource !== 'preview') {
        const currentVisibleRange = activeEditor.visibleRanges[0]
        if (currentVisibleRange && this._lastVisibleRange) {
          // 检查可见区域是否发生显著变化（至少相差2行）
          const startDiff = Math.abs(currentVisibleRange.start.line - this._lastVisibleRange.start.line)
          const endDiff = Math.abs(currentVisibleRange.end.line - this._lastVisibleRange.end.line)
          if (startDiff >= 2 || endDiff >= 2) {
            this.syncEditorScrollToPreview(activeEditor)
            this._lastVisibleRange = currentVisibleRange
          }
        }
        else if (currentVisibleRange) {
          this._lastVisibleRange = currentVisibleRange
        }
      }
    }, 200) // 每200ms检查一次，减少频率

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
    console.warn('handlePreviewScroll called:', {
      scrollPercentage,
      source,
      currentScrollSource: this._scrollSource,
      hasDocument: !!this._currentDocument,
      hasPanel: !!this._panel,
    })

    // 检查基本条件：必须有文档和面板
    if (!this._currentDocument || !this._panel) {
      console.warn('Skipping preview scroll sync: missing document or panel')
      return
    }

    // 如果消息来源是编辑器，跳过避免循环
    if (source === 'editor') {
      console.warn('Skipping preview scroll sync: source is editor')
      return
    }

    // 如果当前正在从编辑器同步滚动，跳过避免冲突
    if (this._scrollSource === 'editor') {
      console.warn('Skipping preview scroll sync: currently syncing from editor')
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
      console.warn('No target editor found for scroll sync')
      return
    }

    try {
      const totalLines = this._currentDocument.lineCount
      if (totalLines === 0) {
        console.warn('Document has no lines')
        return
      }

      const targetLine = Math.min(
        Math.floor(scrollPercentage * Math.max(0, totalLines - 1)),
        totalLines - 1,
      )
      const range = new vscode.Range(targetLine, 0, targetLine, 0)

      console.warn('Scrolling editor to line:', {
        targetLine,
        totalLines,
        scrollPercentage,
      })

      // 设置滚动源并即时滚动编辑器
      this._scrollSource = 'preview'
      targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)

      // 使用防抖函数重置滚动源，避免循环滚动
      this._resetScrollSourceDebounced()
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

    // 使用防抖函数重置滚动源，避免死循环
    this._resetScrollSourceDebounced()
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

    // 取消防抖函数
    this._resetScrollSourceDebounced.cancel()

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
