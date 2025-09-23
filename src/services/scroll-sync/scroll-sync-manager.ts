import type { MarkdownPreviewPanel } from '../renderer/markdown-preview'
import * as vscode from 'vscode'

/**
 * 滚动事件类型
 */
interface ScrollEvent {
  percent: number
  timestamp: number
  source: 'editor' | 'preview'
  direction: 'up' | 'down' | 'none'
}

/**
 * 滚动事件类型
 */
interface ScrollEvent {
  percent: number
  timestamp: number
  source: 'editor' | 'preview'
  direction: 'up' | 'down' | 'none'
}

/**
 * 滚动同步管理器 - 基于状态锁的严谨实现
 * 核心思想：单一状态锁 + 事件源驱动 + 防抖处理
 */
export class ScrollSyncManager {
  private readonly _panel: MarkdownPreviewPanel
  private _disposables: vscode.Disposable[] = []

  // 单一状态锁 - 核心机制
  private _isSyncing: boolean = false
  private _syncSource: 'editor' | 'preview' | null = null
  private _lastEvent: ScrollEvent | null = null
  private _syncTimeout: NodeJS.Timeout | null = null
  private _scrollEndTimeout: NodeJS.Timeout | null = null
  private _isEnabled: boolean = true

  // 防抖和性能优化参数
  private readonly _DEBOUNCE_MS = 16 // 约60fps，平衡响应性和性能
  private readonly _MIN_PERCENT_DIFF = 0.005 // 0.5%的最小变化，避免微动
  private readonly _SYNC_BLOCK_MS = 50 // 同步阻塞时间，防止循环
  private readonly _SCROLL_END_MS = 150 // 滚动结束检测时间
  private readonly _FAST_SCROLL_THRESHOLD = 0.02 // 快速滚动阈值

  constructor(panel: MarkdownPreviewPanel) {
    this._panel = panel
  }

  /**
   * 开始滚动同步
   */
  public start(): void {
    this.setupMessageListener()
    this.setupEditorListener()
  }

  /**
   * 启用滚动同步
   */
  public enable(): void {
    this._isEnabled = true
  }

  /**
   * 禁用滚动同步
   */
  public disable(): void {
    this._isEnabled = false
    // 清理当前状态
    this._isSyncing = false
    this._syncSource = null
    // 使用统一的清理方法
    this.clearAllTimeouts()
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this._isEnabled
  }

  /**
   * 设置编辑器监听器
   */
  private setupEditorListener(): void {
    this._disposables.push(
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (event.textEditor.document === this._panel.currentDocument) {
          this.handleEditorScroll(event.textEditor)
        }
      }),
    )
  }

  /**
   * 计算文档的有效内容行数（排除末尾空白行）
   */
  private getEffectiveLineCount(document: vscode.TextDocument): number {
    const lineCount = document.lineCount
    if (lineCount === 0)
      return 0

    // 从末尾开始查找第一个非空白行
    for (let i = lineCount - 1; i >= 0; i--) {
      const line = document.lineAt(i)
      if (line.text.trim().length > 0) {
        return i + 1 // 返回实际内容行数（从0开始，所以+1）
      }
    }

    return lineCount // 如果所有行都是空白，返回原始行数
  }

  /**
   * 处理编辑器滚动事件 - 基于状态锁的实现
   */
  private handleEditorScroll(editor: vscode.TextEditor): void {
    if (!this._isEnabled)
      return
    if (editor.document !== this._panel.currentDocument)
      return
    if (this._isSyncing && this._syncSource === 'preview')
      return // 状态锁：如果是预览触发的同步，忽略编辑器滚动

    const effectiveLineCount = this.getEffectiveLineCount(editor.document)
    if (effectiveLineCount === 0)
      return

    const topLine = editor.visibleRanges[0].start.line
    const percent = Math.max(0, Math.min(1, topLine / (effectiveLineCount - 1)))

    // 创建滚动事件
    const event: ScrollEvent = {
      percent,
      timestamp: Date.now(),
      source: 'editor',
      direction: this.calculateDirection(percent),
    }

    // 处理滚动事件
    this.processScrollEvent(event)
  }

  /**
   * 计算滚动方向
   */
  private calculateDirection(percent: number): 'up' | 'down' | 'none' {
    if (!this._lastEvent)
      return 'none'

    const diff = percent - this._lastEvent.percent
    if (Math.abs(diff) < this._MIN_PERCENT_DIFF)
      return 'none'

    return diff > 0 ? 'down' : 'up'
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    this._disposables.push(
      this._panel.panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'previewScrolled') {
          const event: ScrollEvent = {
            percent: message.percent,
            timestamp: Date.now(),
            source: 'preview',
            direction: this.calculateDirection(message.percent),
          }
          this.processScrollEvent(event)
        }
      }),
    )
  }

  /**
   * 核心事件处理逻辑 - 基于状态锁和事件源驱动
   */
  private processScrollEvent(event: ScrollEvent): void {
    // 检查是否启用
    if (!this._isEnabled)
      return

    // 状态锁检查：如果正在同步且来源不匹配，忽略事件
    if (this._isSyncing && this._syncSource !== event.source)
      return

    // 去重检查：避免重复处理相同的事件
    if (this._lastEvent
      && event.source === this._lastEvent.source
      && Math.abs(event.percent - this._lastEvent.percent) < this._MIN_PERCENT_DIFF
      && (event.timestamp - this._lastEvent.timestamp) < this._DEBOUNCE_MS) {
      return
    }

    // 清除之前的防抖定时器
    this.clearSyncTimeout()

    // 智能防抖：根据滚动速度调整延迟
    const debounceMs = this.calculateSmartDebounce(event)

    // 设置防抖处理
    if (debounceMs <= 0) {
      // 快速滚动时立即执行
      this.executeSync(event)
    }
    else {
      this._syncTimeout = setTimeout(() => {
        this._syncTimeout = null
        this.executeSync(event)
      }, debounceMs)
    }

    // 滚动结束检测
    this.resetScrollEndTimer()

    this._lastEvent = event
  }

  /**
   * 计算智能防抖时间 - 优化版本
   */
  private calculateSmartDebounce(event: ScrollEvent): number {
    if (!this._lastEvent || event.source !== this._lastEvent.source) {
      return this._DEBOUNCE_MS
    }

    const timeDiff = event.timestamp - this._lastEvent.timestamp
    const percentDiff = Math.abs(event.percent - this._lastEvent.percent)

    // 快速滚动时减少防抖时间
    if (percentDiff > this._FAST_SCROLL_THRESHOLD && timeDiff < 30) {
      return 0 // 快速滚动时无延迟
    }

    // 慢速滚动时使用最小防抖
    return this._DEBOUNCE_MS
  }

  /**
   * 重置滚动结束定时器
   */
  private resetScrollEndTimer(): void {
    // 清理之前的定时器
    this.clearScrollEndTimeout()

    this._scrollEndTimeout = setTimeout(() => {
      this._scrollEndTimeout = null
      // 滚动结束，释放状态锁
      this._isSyncing = false
      this._syncSource = null
    }, this._SCROLL_END_MS)
  }

  /**
   * 执行同步操作
   */
  private executeSync(event: ScrollEvent): void {
    if (event.source === 'editor') {
      this.syncToPreview(event.percent)
    }
    else {
      this.syncToEditor(event.percent)
    }
  }

  /**
   * 同步到预览区 - 基于状态锁的实现
   */
  private syncToPreview(percent: number): void {
    // 激活状态锁：标记为编辑器触发的同步
    this._isSyncing = true
    this._syncSource = 'editor'

    // 发送同步消息到预览区
    this._panel.panel.webview.postMessage({
      command: 'syncScrollToPercent',
      percent: Math.round(percent * 10000) / 10000, // 限制精度，减少数据量
      immediate: false,
      source: 'editor',
      timestamp: Date.now(),
    })

    // 设置状态释放定时器
    setTimeout(() => {
      this._isSyncing = false
      this._syncSource = null
    }, this._SYNC_BLOCK_MS)
  }

  /**
   * 同步到编辑器 - 基于状态锁的实现
   */
  private async syncToEditor(percent: number): Promise<void> {
    // 激活状态锁：标记为预览触发的同步
    this._isSyncing = true
    this._syncSource = 'preview'

    const editor = vscode.window.visibleTextEditors.find(
      e => e.document === this._panel.currentDocument,
    )
    if (!editor) {
      this._isSyncing = false
      this._syncSource = null
      return
    }

    const effectiveLineCount = this.getEffectiveLineCount(editor.document)
    if (effectiveLineCount === 0) {
      this._isSyncing = false
      this._syncSource = null
      return
    }

    const targetLine = Math.round(percent * (effectiveLineCount - 1))
    const clampedLine = Math.max(0, Math.min(targetLine, effectiveLineCount - 1))

    try {
      // 使用更高效的滚动方式
      const position = new vscode.Position(clampedLine, 0)

      // 检查是否需要滚动（避免不必要的操作）
      const currentVisibleRanges = editor.visibleRanges
      if (currentVisibleRanges.length > 0) {
        const currentTopLine = currentVisibleRanges[0].start.line
        if (Math.abs(currentTopLine - clampedLine) < 1) {
          // 如果差异很小，跳过滚动
          this._isSyncing = false
          this._syncSource = null
          return
        }
      }

      const range = new vscode.Range(position, position)
      // 使用 AtTop 而不是 Center，减少计算开销
      editor.revealRange(range, vscode.TextEditorRevealType.AtTop)
    }
    catch (error) {
      console.error('Error scrolling editor:', error)
    }

    // 设置状态释放定时器
    setTimeout(() => {
      this._isSyncing = false
      this._syncSource = null
    }, this._SYNC_BLOCK_MS)
  }

  /**
   * 停止滚动同步并清理资源 - 完善版本
   */
  public dispose(): void {
    // 1. 清理所有定时器
    this.clearAllTimeouts()

    // 2. 清理所有监听器
    this._disposables.forEach((d) => {
      try {
        d.dispose()
      }
      catch (error) {
        console.warn('清理监听器时出错:', error)
      }
    })
    this._disposables = []

    // 3. 重置所有状态
    this._isSyncing = false
    this._syncSource = null
    this._lastEvent = null
    this._isEnabled = false

    // 5. 资源清理完成
  }

  /**
   * 清理所有定时器
   */
  private clearAllTimeouts(): void {
    this.clearSyncTimeout()
    this.clearScrollEndTimeout()
  }

  /**
   * 清理同步定时器
   */
  private clearSyncTimeout(): void {
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout)
      this._syncTimeout = null
    }
  }

  /**
   * 清理滚动结束定时器
   */
  private clearScrollEndTimeout(): void {
    if (this._scrollEndTimeout) {
      clearTimeout(this._scrollEndTimeout)
      this._scrollEndTimeout = null
    }
  }
}
