// 滚动同步管理器
class ScrollSyncManager {
  constructor() {
    this.isSyncing = false
    this.lastPercent = 0
    this.resizeObserver = null
    this.scrollDebounceTimer = null
    this.isImmediateMode = false // 立即模式标志

    this.init()
  }

  init() {
    // 监听滚动事件，使用防抖避免性能问题
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true })

    // 监听内容高度变化，应对图片加载等情况
    this.setupResizeObserver()

  }

  /**
   * 处理滚动事件
   */
  handleScroll() {
    // 避免死循环：如果正在同步中，直接返回
    if (this.isSyncing)
      return

    // 清除之前的定时器
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer)
    }

    // 使用合理的防抖时间
    this.scrollDebounceTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        this.sendScrollPercent()
      })
    }, 50)
  }

  /**
   * 计算并发送滚动百分比
   */
  sendScrollPercent() {
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    // 如果内容不够高，无法滚动，则不发送事件
    if (scrollHeight <= clientHeight)
      return

    const scrollY = window.scrollY
    const percent = scrollY / (scrollHeight - clientHeight)

    // 提高精度阈值，减少不必要的同步
    if (Math.abs(percent - this.lastPercent) < 0.01)
      return
    this.lastPercent = percent

    // 确保百分比在0和1之间
    const clampedPercent = Math.max(0, Math.min(1, percent))

    // 发送消息给扩展
    if (window.vscode && window.vscode.postMessage) {
      window.vscode.postMessage({
        command: 'previewScrolled',
        percent: clampedPercent,
      })
    }
  }

  /**
   * 处理来自扩展的消息
   */
  handleMessage(event) {
    const message = event.data

    if (message.command === 'syncScrollToPercent') {
      this.syncToPercent(message.percent, message.immediate)
    }
  }

  /**
   * 同步滚动到指定百分比
   */
  syncToPercent(percent, immediate = false) {
    // 设置同步锁，避免死循环
    this.isSyncing = true

    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    if (scrollHeight <= clientHeight) {
      this.isSyncing = false
      return
    }

    // 计算目标滚动位置
    const targetY = percent * (scrollHeight - clientHeight)

    // 检查是否需要滚动（避免不必要的滚动操作）
    const currentY = window.scrollY
    if (Math.abs(targetY - currentY) < 1) {
      this.isSyncing = false
      return
    }

    // 根据immediate参数决定是否使用平滑动画
    const behavior = immediate || this.isImmediateMode ? 'auto' : 'smooth'

    // 执行滚动
    window.scrollTo({ top: targetY, behavior })

    // 更新最后的百分比记录
    this.lastPercent = percent

    // 延迟释放锁，给滚动动画足够的时间
    setTimeout(() => {
      this.isSyncing = false
    }, 100)
  }

  /**
   * 设置ResizeObserver监听内容高度变化
   */
  setupResizeObserver() {
    // 监听内容高度变化，应对图片加载等情况
    this.resizeObserver = new ResizeObserver(() => {
      // 当内容高度变化时，重新计算并同步当前位置
      if (!this.isSyncing) {
        this.sendScrollPercent()
      }
    })

    // 观察body元素的变化
    this.resizeObserver.observe(document.body)
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer)
    }
  }
}

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScrollSyncManager }
}
else {
  window.ScrollSyncManager = ScrollSyncManager
}
