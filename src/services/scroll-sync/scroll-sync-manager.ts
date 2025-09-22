import type { MarkdownPreviewPanel } from '../renderer/markdown-preview'
import * as vscode from 'vscode'

/**
 * 滚动同步状态枚举
 */
enum SyncState {
  _IDLE = 'idle',
  _EDITOR_SYNCING = 'editor_syncing',
  _PREVIEW_SYNCING = 'preview_syncing',
  _BLOCKED = 'blocked',
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
 * 滚动同步管理器 - 重构版本
 * 核心思想：事件驱动 + 状态管理，避免双向同步冲突
 */
export class ScrollSyncManager {
  private readonly _panel: MarkdownPreviewPanel
  private _disposables: vscode.Disposable[] = []

  // 状态管理
  private _syncState: SyncState = SyncState._IDLE
  private _lastEvent: ScrollEvent | null = null
  private _syncTimeout: NodeJS.Timeout | null = null
  private _scrollEndTimeout: NodeJS.Timeout | null = null
  private _isEnabled: boolean = true

  // 防抖和去重 - 优化参数
  private readonly _DEBOUNCE_MS = 2 // 减少到2ms，提高响应速度
  private readonly _MIN_PERCENT_DIFF = 0.001 // 0.1%的最小变化，更敏感
  private readonly _SYNC_BLOCK_MS = 50 // 减少阻塞时间，提高响应
  private readonly _SCROLL_END_MS = 100 // 减少滚动结束检测时间
  private readonly _FAST_SCROLL_THRESHOLD = 0.01 // 快速滚动阈值

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
    this._syncState = SyncState._IDLE
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout)
      this._syncTimeout = null
    }
    if (this._scrollEndTimeout) {
      clearTimeout(this._scrollEndTimeout)
      this._scrollEndTimeout = null
    }
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
   * 处理编辑器滚动事件 - 重构版本
   */
  private handleEditorScroll(editor: vscode.TextEditor): void {
    if (!this._isEnabled)
      return
    if (editor.document !== this._panel.currentDocument)
      return
    if (this._syncState === SyncState._PREVIEW_SYNCING)
      return // 防止循环

    const lineCount = editor.document.lineCount
    if (lineCount === 0)
      return

    const topLine = editor.visibleRanges[0].start.line
    const percent = Math.max(0, Math.min(1, topLine / (lineCount - 1)))

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
   * 核心事件处理逻辑 - 智能防抖和去重
   */
  private processScrollEvent(event: ScrollEvent): void {
    // 检查是否启用
    if (!this._isEnabled)
      return
    // 状态检查
    if (this._syncState === SyncState._BLOCKED)
      return
    if (this._syncState === SyncState._EDITOR_SYNCING && event.source === 'editor')
      return
    if (this._syncState === SyncState._PREVIEW_SYNCING && event.source === 'preview')
      return

    // 去重检查
    if (this._lastEvent
      && event.source === this._lastEvent.source
      && Math.abs(event.percent - this._lastEvent.percent) < this._MIN_PERCENT_DIFF
      && (event.timestamp - this._lastEvent.timestamp) < this._DEBOUNCE_MS) {
      return
    }

    // 清除之前的防抖定时器
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout)
    }

    // 智能防抖：根据滚动速度调整延迟
    const debounceMs = this.calculateSmartDebounce(event)

    // 设置防抖 - 优化版本
    if (debounceMs <= 0) {
      // 快速滚动时立即执行
      this.executeSync(event)
    } else {
      this._syncTimeout = setTimeout(() => {
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
    if (this._scrollEndTimeout) {
      clearTimeout(this._scrollEndTimeout)
    }

    this._scrollEndTimeout = setTimeout(() => {
      // 滚动结束，重置状态
      this._syncState = SyncState._IDLE
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
   * 同步到预览区 - 优化版本
   */
  private syncToPreview(percent: number): void {
    this._syncState = SyncState._EDITOR_SYNCING

    // 使用更轻量的消息格式，减少序列化开销
    this._panel.panel.webview.postMessage({
      command: 'syncScrollToPercent',
      percent: Math.round(percent * 10000) / 10000, // 限制精度，减少数据量
      immediate: false,
      source: 'editor',
      timestamp: Date.now(), // 添加时间戳用于去重
    })

    // 设置状态恢复定时器
    setTimeout(() => {
      this._syncState = SyncState._IDLE
    }, this._SYNC_BLOCK_MS)
  }

  /**
   * 同步到编辑器 - 优化版本
   */
  private async syncToEditor(percent: number): Promise<void> {
    this._syncState = SyncState._PREVIEW_SYNCING

    const editor = vscode.window.visibleTextEditors.find(
      e => e.document === this._panel.currentDocument,
    )
    if (!editor) {
      this._syncState = SyncState._IDLE
      return
    }

    const lineCount = editor.document.lineCount
    if (lineCount === 0) {
      this._syncState = SyncState._IDLE
      return
    }

    const targetLine = Math.round(percent * (lineCount - 1))
    const clampedLine = Math.max(0, Math.min(targetLine, lineCount - 1))

    try {
      // 使用更高效的滚动方式
      const position = new vscode.Position(clampedLine, 0)

      // 检查是否需要滚动（避免不必要的操作）
      const currentVisibleRanges = editor.visibleRanges
      if (currentVisibleRanges.length > 0) {
        const currentTopLine = currentVisibleRanges[0].start.line
        if (Math.abs(currentTopLine - clampedLine) < 1) {
          // 如果差异很小，跳过滚动
          this._syncState = SyncState._IDLE
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

    // 设置状态恢复定时器
    setTimeout(() => {
      this._syncState = SyncState._IDLE
    }, this._SYNC_BLOCK_MS)
  }

  /**
   * 停止滚动同步并清理资源
   */
  public dispose(): void {
    // 清理定时器
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout)
      this._syncTimeout = null
    }

    // 清理监听器
    this._disposables.forEach(d => d.dispose())
    this._disposables = []

    // 重置状态
    this._syncState = SyncState._IDLE
    this._lastEvent = null
  }
}
