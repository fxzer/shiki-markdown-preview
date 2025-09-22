// 工具函数模块

/**
 * 优化：使用轮询代替 setTimeout 来初始化
 */
function robustInitialize(checkFn, initFn, failureMsg, maxRetries = 10, interval = 200) {
  let retries = 0
  const intervalId = setInterval(() => {
    if (checkFn()) {
      clearInterval(intervalId)
      initFn()
    }
    else {
      retries++
      if (retries >= maxRetries) {
        clearInterval(intervalId)
      }
    }
  }, interval)
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 节流函数：确保函数在指定时间内只执行一次
 */
function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { robustInitialize, escapeHtml, throttle }
}
else {
  window.robustInitialize = robustInitialize
  window.escapeHtml = escapeHtml
  window.throttle = throttle
}
