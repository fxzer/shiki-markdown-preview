/**
 * 优化的滚动同步脚本
 * 提供高效的预览窗口滚动处理
 */

(function () {
  // 检查是否已经获取了 VS Code API
  let vscode
  if (window.vscode) {
    vscode = window.vscode
  } else {
    try {
      vscode = acquireVsCodeApi()
      window.vscode = vscode
    } catch (error) {
      console.error('Failed to acquire VS Code API:', error)
      vscode = {
        postMessage: () => { },
        setState: () => { },
        getState: () => null,
      }
    }
  }

  // 滚动同步配置
  const SCROLL_CONFIG = {
    THRESHOLD: 0.01,
    DEBOUNCE_DELAY: 16, // 约60fps
    THROTTLE_DELAY: 100,
    POLL_INTERVAL: 200,
    SYNC_TIMEOUT: 50,
    HEIGHT_CACHE_DURATION: 1000,
  }

  // 滚动状态
  let isScrollingFromEditor = false
  let scrollTimeout = null
  let lastScrollPercentage = -1
  let cachedDocumentHeight = 0
  let cachedViewportHeight = 0
  let heightCacheTime = 0
  let isScrolling = false

  // 获取文档内容的总高度（带缓存）
  function getDocumentHeight() {
    const now = Date.now()
    if (now - heightCacheTime < SCROLL_CONFIG.HEIGHT_CACHE_DURATION && cachedDocumentHeight > 0) {
      return cachedDocumentHeight
    }

    cachedDocumentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.scrollHeight,
      document.body.offsetHeight,
    )
    heightCacheTime = now
    return cachedDocumentHeight
  }

  // 获取视口高度（带缓存）
  function getViewportHeight() {
    const now = Date.now()
    if (now - heightCacheTime < SCROLL_CONFIG.HEIGHT_CACHE_DURATION && cachedViewportHeight > 0) {
      return cachedViewportHeight
    }

    cachedViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
    return cachedViewportHeight
  }

  // 防抖函数
  function debounce(func, delay) {
    let timeoutId
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        timeoutId = null
      }, delay)
    }
  }

  // 节流函数
  function throttle(func, limit) {
    let inThrottle
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => {
          inThrottle = false
        }, limit)
      }
    }
  }

  // 优化的滚动处理函数
  function handleScroll() {
    if (isScrollingFromEditor || isScrolling) {
      return
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = getDocumentHeight()
    const viewportHeight = getViewportHeight()
    const maxScrollTop = Math.max(0, documentHeight - viewportHeight)

    const scrollPercentage = maxScrollTop > 0
      ? Math.max(0, Math.min(1, scrollTop / maxScrollTop))
      : 0

    // 检查滚动变化是否显著
    if (Math.abs(scrollPercentage - lastScrollPercentage) < SCROLL_CONFIG.THRESHOLD) {
      return
    }

    lastScrollPercentage = scrollPercentage
    isScrolling = true

    try {
      vscode.postMessage({
        command: 'scroll',
        scrollPercentage,
        source: 'preview',
      })
    } catch (error) {
      console.error('Failed to post scroll message:', error)
    } finally {
      isScrolling = false
    }
  }

  // 创建防抖和节流的滚动处理函数
  const debouncedHandleScroll = debounce(handleScroll, SCROLL_CONFIG.DEBOUNCE_DELAY)
  const throttledHandleScroll = throttle(handleScroll, SCROLL_CONFIG.THROTTLE_DELAY)

  // 监听滚动事件，使用被动监听器提高性能
  const scrollOptions = { passive: true }
  document.addEventListener('scroll', debouncedHandleScroll, scrollOptions)
  window.addEventListener('scroll', debouncedHandleScroll, scrollOptions)
  document.documentElement.addEventListener('scroll', debouncedHandleScroll, scrollOptions)
  document.body.addEventListener('scroll', debouncedHandleScroll, scrollOptions)

  // 优化的轮询检测
  let lastScrollTop = 0
  const scrollCheckInterval = setInterval(() => {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    if (currentScrollTop !== lastScrollTop) {
      lastScrollTop = currentScrollTop
      throttledHandleScroll()
    }
  }, SCROLL_CONFIG.POLL_INTERVAL)

  // 监听窗口大小变化，清除高度缓存
  window.addEventListener('resize', () => {
    cachedDocumentHeight = 0
    cachedViewportHeight = 0
    heightCacheTime = 0
  }, scrollOptions)

  // 处理来自扩展的消息
  window.addEventListener('message', (event) => {
    const message = event.data

    switch (message.command) {
      case 'scrollToPercentage':
        // 避免循环滚动
        if (message.source === 'preview') {
          break
        }

        isScrollingFromEditor = true

        const documentHeight = getDocumentHeight()
        const viewportHeight = getViewportHeight()
        const maxScrollTop = Math.max(0, documentHeight - viewportHeight)
        const targetScrollTop = Math.max(0, Math.min(maxScrollTop, maxScrollTop * message.percentage))

        const scrollTopNumber = Math.round(Number(targetScrollTop))
        if (Number.isNaN(scrollTopNumber)) {
          console.error('Invalid scroll position:', targetScrollTop)
          return
        }

        // 优化的滚动方法
        try {
          // 使用 requestAnimationFrame 优化滚动性能
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollTopNumber,
              behavior: 'auto',
            })

            // 备用滚动方法
            setTimeout(() => {
              if (window.scrollY === 0 && scrollTopNumber > 0) {
                document.documentElement.scrollTop = scrollTopNumber
                document.body.scrollTop = scrollTopNumber
              }
            }, 10)
          })
        } catch (error) {
          console.error('Error during scroll:', error)
          // 备用滚动方法
          document.documentElement.scrollTop = scrollTopNumber
          document.body.scrollTop = scrollTopNumber
        }

        // 重置滚动状态
        setTimeout(() => {
          isScrollingFromEditor = false
        }, SCROLL_CONFIG.SYNC_TIMEOUT)
        break

      case 'updateContent':
        const markdownContent = document.getElementById('markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = message.content
          applySyntaxHighlighting()
          // 清除高度缓存，因为内容已更新
          cachedDocumentHeight = 0
          cachedViewportHeight = 0
          heightCacheTime = 0
        }
        break

      case 'highlightLine':
        highlightLine(message.line)
        break
    }
  })

  // 语法高亮和复制按钮功能
  function applySyntaxHighlighting() {
    const codeBlocks = document.querySelectorAll('pre code')
    codeBlocks.forEach((block) => {
      addCopyButton(block.parentElement)
    })
  }

  function addCopyButton(preElement) {
    if (!preElement || preElement.querySelector('.copy-button'))
      return

    const button = document.createElement('button')
    button.className = 'copy-button'
    button.title = 'Copy code'

    // 复制图标SVG
    const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"/></svg>`

    // 已复制图标SVG
    const copiedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19V5v11.35v-2.125zm0 2q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v8h-2V5H5v14h7v2zm12.35 1l-3.55-3.55l1.425-1.4l2.125 2.125l4.25-4.25L23 16.35zM8 13q.425 0 .713-.288T9 12t-.288-.712T8 11t-.712.288T7 12t.288.713T8 13m0-4q.425 0 .713-.288T9 8t-.288-.712T8 7t-.712.288T7 8t.288.713T8 9m3 4h6v-2h-6zm0-4h6V7h-6z"/></svg>`

    button.innerHTML = copyIcon
    button.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      padding: 4px;
      background: rgba(0, 0, 0, 0.2);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.2s;
      z-index: 10;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1'
    })

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.7'
    })

    button.addEventListener('click', async () => {
      const code = preElement.textContent || ''
      try {
        await navigator.clipboard.writeText(code)
        button.innerHTML = copiedIcon
        button.style.color = '#4CAF50'
        button.style.background = 'rgba(76, 175, 80, 0.1)'
        setTimeout(() => {
          button.innerHTML = copyIcon
          button.style.color = 'var(--vscode-button-foreground)'
          button.style.background = 'rgba(0, 0, 0, 0.1)'
        }, 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
        button.innerHTML = copyIcon
        button.style.color = '#f44336'
        button.style.background = 'rgba(244, 67, 54, 0.1)'
        setTimeout(() => {
          button.innerHTML = copyIcon
          button.style.color = 'var(--vscode-button-foreground)'
          button.style.background = 'rgba(0, 0, 0, 0.1)'
        }, 2000)
      }
    })

    preElement.style.position = 'relative'
    preElement.appendChild(button)
  }

  function highlightLine(lineNumber) {
    const previousHighlights = document.querySelectorAll('.line-highlight')
    previousHighlights.forEach(el => el.classList.remove('line-highlight'))

    const elements = document.querySelectorAll('#markdown-content h1, #markdown-content h2, #markdown-content h3, #markdown-content h4, #markdown-content h5, #markdown-content h6, #markdown-content p, #markdown-content li, #markdown-content pre, #markdown-content blockquote')
    const targetElement = elements[lineNumber]

    if (targetElement) {
      targetElement.classList.add('line-highlight')
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      setTimeout(() => {
        targetElement.classList.remove('line-highlight')
      }, 2000)
    }
  }

  // 处理链接点击事件
  document.addEventListener('click', (event) => {
    let target = event.target
    while (target && target.tagName !== 'A') {
      target = target.parentElement
    }

    if (target && target.tagName === 'A') {
      const hrefAttr = target.getAttribute('href')

      if (!hrefAttr) {
        return
      }

      // 处理外部链接
      if ((hrefAttr.startsWith('http://') || hrefAttr.startsWith('https://') || hrefAttr.startsWith('//'))
        && !hrefAttr.includes('vscode-resource.vscode-cdn.net')) {
        event.preventDefault()
        event.stopPropagation()
        vscode.postMessage({
          command: 'openExternal',
          url: hrefAttr,
        })
      }
      // 处理相对路径链接
      else if (hrefAttr.endsWith('.md')) {
        event.preventDefault()
        vscode.postMessage({
          command: 'openRelativeFile',
          filePath: hrefAttr,
          href: hrefAttr,
        })
      }
    }
  })

  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    applySyntaxHighlighting()

    vscode.postMessage({
      command: 'ready',
    })
  })

  // 清理函数
  function cleanup() {
    // 移除事件监听器
    document.removeEventListener('scroll', debouncedHandleScroll)
    window.removeEventListener('scroll', debouncedHandleScroll)
    document.documentElement.removeEventListener('scroll', debouncedHandleScroll)
    document.body.removeEventListener('scroll', debouncedHandleScroll)
    window.removeEventListener('resize', () => {
      cachedDocumentHeight = 0
      cachedViewportHeight = 0
      heightCacheTime = 0
    })

    // 清理定时器
    if (scrollCheckInterval) {
      clearInterval(scrollCheckInterval)
    }

    // 清理超时
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  }

  // 如果页面卸载，清理资源
  window.addEventListener('beforeunload', cleanup)
})()