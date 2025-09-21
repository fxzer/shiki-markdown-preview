import type { MarkdownPreviewPanel } from '../renderer/markdown-preview'
import { debounce } from 'throttle-debounce'
import * as vscode from 'vscode'

/**
 * 滚动同步管理器 - 基于百分比的同步方案
 * 核心思想：将编辑器和预览区的滚动条视为等价物，一个移动了X%，另一个也应该移动X%
 */
export class ScrollSyncManager {
  private readonly _panel: MarkdownPreviewPanel
  private _isSyncing = false
  private _disposables: vscode.Disposable[] = []
  private _lastEditorPercent = 0
  private _lastPreviewPercent = 0

  constructor(panel: MarkdownPreviewPanel) {
    this._panel = panel
  }

  /**
   * 开始滚动同步
   */
  public start(): void {
    // 立即设置消息监听器，减少延迟
    this.setupMessageListener()

    // 监听编辑器可视范围变化 - 使用防抖避免性能问题（减少到20ms）
    this._disposables.push(
      vscode.window.onDidChangeTextEditorVisibleRanges(
        debounce(20, (event) => {
          // 只处理当前文档对应的编辑器
          if (event.textEditor.document === this._panel.currentDocument) {
            this.handleEditorScroll(event.textEditor)
          }
        }),
      ),
    )
  }

  /**
   * 处理编辑器滚动事件
   */
  private handleEditorScroll(editor: vscode.TextEditor): void {
    // 只处理当前文档对应的编辑器
    if (editor.document !== this._panel.currentDocument)
      return

    // 避免死循环：如果正在同步中，直接返回
    if (this._isSyncing)
      return

    const lineCount = editor.document.lineCount
    if (lineCount === 0)
      return

    // 计算当前可视区域的顶部行号对应的百分比
    const topLine = editor.visibleRanges[0].start.line
    const percent = topLine / (lineCount - 1) // 减1因为行号从0开始

    // 避免重复同步：如果百分比变化不大，跳过
    if (Math.abs(percent - this._lastEditorPercent) < 0.01)
      return
    this._lastEditorPercent = percent

    // 设置同步锁，避免死循环（使用更短的锁时间）
    this._isSyncing = true

    // 立即发送同步消息到预览区，移除延迟
    this._panel.panel.webview.postMessage({
      command: 'syncScrollToPercent',
      percent,
      immediate: true, // 添加立即模式标记
    })

    // 使用更短的延迟释放锁（减少到10ms）
    setTimeout(() => {
      this._isSyncing = false
    }, 10)
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    // 监听来自Webview的消息
    this._disposables.push(
      this._panel.panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'previewScrolled') {
          this.handlePreviewScroll(message.percent)
        }
      }),
    )
  }

  /**
   * 处理预览区滚动事件
   */
  private async handlePreviewScroll(percent: number): Promise<void> {
    console.warn('[ScrollSync] handlePreviewScroll called with percent:', percent)

    // 找到对应的编辑器
    const editor = vscode.window.visibleTextEditors.find(
      e => e.document === this._panel.currentDocument,
    )
    if (!editor) {
      console.warn('[ScrollSync] No editor found for current document')
      return
    }

    const lineCount = editor.document.lineCount
    if (lineCount === 0)
      return

    // 避免重复同步：如果百分比变化不大，跳过
    if (Math.abs(percent - this._lastPreviewPercent) < 0.01)
      return
    this._lastPreviewPercent = percent

    // 从百分比计算目标行号
    const targetLine = Math.round(percent * (lineCount - 1))

    // 确保行号在有效范围内
    const clampedLine = Math.max(0, Math.min(targetLine, lineCount - 1))

    console.warn('[ScrollSync] Scrolling to line:', clampedLine, 'total lines:', lineCount)

    // 设置同步锁，避免死循环（使用更短的锁时间）
    this._isSyncing = true

    try {
      const position = new vscode.Position(clampedLine, 0)
      const range = new vscode.Range(position, position)
      // 将目标行滚动到编辑器顶部，使用立即模式避免平滑动画延迟
      editor.revealRange(range, vscode.TextEditorRevealType.AtTop)
      console.warn('[ScrollSync] Successfully scrolled to line:', clampedLine)
    }
    finally {
      // 使用更短的延迟释放锁（减少到20ms）
      setTimeout(() => {
        this._isSyncing = false
      }, 20)
    }
  }

  /**
   * 停止滚动同步并清理资源
   */
  public dispose(): void {
    this._disposables.forEach(d => d.dispose())
    this._disposables = []
  }
}
