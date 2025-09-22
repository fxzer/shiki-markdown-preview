/**
 * 滚动同步状态枚举
 */
const SyncState = {
  IDLE: 'idle',
  EDITOR_SYNCING: 'editor_syncing',
  PREVIEW_SYNCING: 'preview_syncing',
  BLOCKED: 'blocked',
}

/**
 * 滚动同步管理器 - 重构版本
 * 核心思想：事件驱动 + 状态管理，避免双向同步冲突
 */
class ScrollSyncManager {
  constructor() {
    // 状态管理
    this.syncState = SyncState.IDLE
    this.lastEvent = null
    this.syncTimeout = null
    this.scrollEndTimeout = null

    // 防抖和去重
    this.DEBOUNCE_MS = 8 // 约120fps，提高响应速度
    this.MIN_PERCENT_DIFF = 0.003 // 0.3%的最小变化，更敏感
    this.SYNC_BLOCK_MS = 80 // 减少阻塞时间，提高响应
    this.SCROLL_END_MS = 150 // 减少滚动结束检测时间
    this.FAST_SCROLL_THRESHOLD = 0.02 // 快速滚动阈值

    // 其他属性
    this.lastPercent = 0
    this.resizeObserver = null

    this.init()
  }

  init() {
    // 监听滚动事件，使用 requestAnimationFrame 优化性能
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true })

    // 监听内容高度变化，应对图片加载等情况
    this.setupResizeObserver()
  }

  /**
   * 处理滚动事件 - 重构版本
   */
  handleScroll() {
    // 状态检查：如果正在同步或阻塞，跳过
    if (this.syncState === SyncState.EDITOR_SYNCING
      || this.syncState === SyncState.BLOCKED) {
      return
    }

    // 立即处理滚动事件，减少延迟
    this.processScrollEvent()

    // 重置滚动结束定时器
    this.resetScrollEndTimer()
  }

  /**
   * 处理滚动事件
   */
  processScrollEvent() {
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    if (scrollHeight <= clientHeight)
      return

    const scrollY = window.scrollY
    const percent = Math.max(0, Math.min(1, scrollY / (scrollHeight - clientHeight)))

    // 创建滚动事件
    const event = {
      percent,
      timestamp: Date.now(),
      source: 'preview',
      direction: this.calculateDirection(percent),
    }

    // 处理滚动事件
    this.handleScrollEvent(event)
  }

  /**
   * 计算滚动方向
   */
  calculateDirection(percent) {
    if (!this.lastEvent)
      return 'none'

    const diff = percent - this.lastEvent.percent
    if (Math.abs(diff) < this.MIN_PERCENT_DIFF)
      return 'none'

    return diff > 0 ? 'down' : 'up'
  }

  /**
   * 处理滚动事件 - 防循环和去重
   */
  handleScrollEvent(event) {
    // 去重检查
    if (this.lastEvent
      && event.source === this.lastEvent.source
      && Math.abs(event.percent - this.lastEvent.percent) < this.MIN_PERCENT_DIFF
      && (event.timestamp - this.lastEvent.timestamp) < this.DEBOUNCE_MS) {
      return
    }

    // 清除之前的防抖定时器
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }

    // 智能防抖：根据滚动速度调整延迟
    const debounceMs = this.calculateSmartDebounce(event.percent)
    
    // 使用 requestAnimationFrame 获得更流畅的滚动
    this.syncTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.sendScrollPercent(event.percent)
      })
    }, debounceMs)

    this.lastEvent = event
  }

  /**
   * 计算智能防抖时间
   */
  calculateSmartDebounce(percent) {
    if (!this.lastEvent) {
      return this.DEBOUNCE_MS
    }

    const timeDiff = Date.now() - this.lastEvent.timestamp
    const percentDiff = Math.abs(percent - this.lastEvent.percent)
    
    // 快速滚动时减少防抖时间
    if (percentDiff > this.FAST_SCROLL_THRESHOLD && timeDiff < 50) {
      return Math.max(4, this.DEBOUNCE_MS / 2) // 快速滚动时使用更短的防抖
    }
    
    // 慢速滚动时使用正常防抖
    return this.DEBOUNCE_MS
  }

  /**
   * 发送滚动百分比
   */
  sendScrollPercent(percent) {
    // 更新状态
    this.syncState = SyncState.PREVIEW_SYNCING
    this.lastPercent = percent

    // 发送消息给扩展
    if (window.vscode && window.vscode.postMessage) {
      window.vscode.postMessage({
        command: 'previewScrolled',
        percent,
      })
    }

    // 设置状态恢复定时器
    setTimeout(() => {
      this.syncState = SyncState.IDLE
    }, this.SYNC_BLOCK_MS)
  }

  /**
   * 处理来自扩展的消息 - 重构版本
   */
  handleMessage(event) {
    const message = event.data

    if (message.command === 'syncScrollToPercent') {
      this.syncToPercent(message.percent, message.immediate, message.source)
    }
  }

  /**
   * 同步滚动到指定百分比 - 重构版本
   * @param {number} percent - 滚动百分比 (0-1)
   * @param {boolean} _immediate - 是否立即滚动（未使用）
   * @param {string} _source - 滚动来源（未使用）
   */
  syncToPercent(percent, _immediate = false, _source = 'editor') {
    // 状态检查：如果正在同步预览，跳过
    if (this.syncState === SyncState.PREVIEW_SYNCING) {
      return
    }

    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    if (scrollHeight <= clientHeight) {
      return
    }

    // 计算目标滚动位置
    const targetY = percent * (scrollHeight - clientHeight)
    const currentY = window.scrollY

    // 防止微小变化：只在真正需要滚动时才执行
    if (Math.abs(targetY - currentY) < 2) {
      return
    }

    // 设置同步状态
    this.syncState = SyncState.EDITOR_SYNCING

    // 使用即时滚动，避免动画延迟
    window.scrollTo({ top: targetY, behavior: 'instant' })

    // 更新最后的百分比记录
    this.lastPercent = percent

    // 设置状态恢复定时器
    setTimeout(() => {
      this.syncState = SyncState.IDLE
    }, this.SYNC_BLOCK_MS)

    // 滚动结束检测
    this.resetScrollEndTimer()
  }

  /**
   * 重置滚动结束定时器
   */
  resetScrollEndTimer() {
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout)
    }

    this.scrollEndTimeout = setTimeout(() => {
      // 滚动结束，重置状态
      this.syncState = SyncState.IDLE
      // 滚动结束后发送一次同步，确保位置准确
      this.sendScrollPercent()
    }, this.SCROLL_END_MS)
  }

  /**
   * 设置ResizeObserver监听内容高度变化
   */
  setupResizeObserver() {
    // 监听内容高度变化，应对图片加载等情况
    this.resizeObserver = new ResizeObserver(() => {
      // 当内容高度变化时，重新计算并同步当前位置
      this.sendScrollPercent()
    })

    // 观察body元素的变化
    this.resizeObserver.observe(document.body)
  }

  /**
   * 清理资源 - 重构版本
   */
  destroy() {
    // 清理定时器
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
      this.syncTimeout = null
    }

    // 清理ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // 重置状态
    this.syncState = SyncState.IDLE
    this.lastEvent = null
  }
}

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScrollSyncManager }
}
else {
  window.ScrollSyncManager = ScrollSyncManager
}
