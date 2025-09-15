(function () {
  // 检查是否已经获取了 VS Code API
  let vscode
  if (window.vscode) {
    // 如果全局变量中已有 vscode 实例，直接使用
    vscode = window.vscode
  }
  else {
    try {
      // 尝试获取 VS Code API
      vscode = acquireVsCodeApi()
      // 将 vscode 实例保存到全局变量，供其他脚本使用
      window.vscode = vscode
    }
    catch (error) {
      console.error('Failed to acquire VS Code API:', error)
      // 创建一个模拟的 vscode 对象，避免后续错误
      vscode = {
        postMessage: () => { },
        setState: () => { },
        getState: () => null,
      }
    }
  }

  // Get the markdown content container
  const contentContainer = document.getElementById('markdown-content')
  if (!contentContainer) {
    console.error('Markdown content container not found')
    return
  }


  // 滚动同步 - 优化版本，带防抖、阈值控制和缓存
  let isScrollingFromEditor = false
  let scrollTimeout = null
  let lastScrollPercentage = -1
  let cachedDocumentHeight = 0
  let cachedViewportHeight = 0
  let heightCacheTime = 0
  const HEIGHT_CACHE_DURATION = 1000
  const SCROLL_THRESHOLD = 0.005

  // 获取文档内容的总高度（带缓存）
  function getDocumentHeight() {
    const now = Date.now()
    if (now - heightCacheTime < HEIGHT_CACHE_DURATION && cachedDocumentHeight > 0) {
      return cachedDocumentHeight
    }

    // 优先使用 documentElement 的高度，这是最准确的
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
    if (now - heightCacheTime < HEIGHT_CACHE_DURATION && cachedViewportHeight > 0) {
      return cachedViewportHeight
    }

    // 使用 window.innerHeight 作为视口高度
    cachedViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
    return cachedViewportHeight
  }

  // 优化的滚动处理函数
  function handleScroll() {
    if (isScrollingFromEditor) {
      return
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = getDocumentHeight()
    const viewportHeight = getViewportHeight()
    const maxScrollTop = Math.max(0, documentHeight - viewportHeight)

    const scrollPercentage = maxScrollTop > 0
      ? Math.max(0, Math.min(1, scrollTop / maxScrollTop))
      : 0

    if (Math.abs(scrollPercentage - lastScrollPercentage) < SCROLL_THRESHOLD) {
      return
    }

    lastScrollPercentage = scrollPercentage
    vscode.postMessage({
      command: 'scroll',
      scrollPercentage,
      source: 'preview',
    })
  }

  // 防抖滚动处理
  function debouncedHandleScroll() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }

    scrollTimeout = setTimeout(() => {
      handleScroll()
      scrollTimeout = null
    }, 16) // 约60fps的防抖
  }

  // 监听滚动事件，使用防抖处理
  // 监听多个可能的滚动容器，确保捕获所有滚动
  document.addEventListener('scroll', debouncedHandleScroll, { passive: true })
  window.addEventListener('scroll', debouncedHandleScroll, { passive: true })
  document.documentElement.addEventListener('scroll', debouncedHandleScroll, { passive: true })
  document.body.addEventListener('scroll', debouncedHandleScroll, { passive: true })

  // 添加轮询检测作为备用方案
  let lastScrollTop = 0
  const scrollCheckInterval = setInterval(() => {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    if (currentScrollTop !== lastScrollTop) {
      lastScrollTop = currentScrollTop
      debouncedHandleScroll()
    }
  }, 100) // 每100ms检查一次

  // 监听窗口大小变化，清除高度缓存
  window.addEventListener('resize', () => {
    cachedDocumentHeight = 0
    cachedViewportHeight = 0
    heightCacheTime = 0
  }, { passive: true })

  // Handle messages from the extension
  window.addEventListener('message', (event) => {
    const message = event.data

    switch (message.command) {
      case 'scrollToPercentage':
        // 如果消息来源是预览区自己，忽略避免循环
        if (message.source === 'preview') {
          break
        }

        isScrollingFromEditor = true

        const documentHeight = getDocumentHeight()
        const viewportHeight = getViewportHeight()
        const maxScrollTop = Math.max(0, documentHeight - viewportHeight)
        const targetScrollTop = Math.max(0, Math.min(maxScrollTop, maxScrollTop * message.percentage))

        // 确保 targetScrollTop 是数字类型并四舍五入到整数
        const scrollTopNumber = Math.round(Number(targetScrollTop))
        if (Number.isNaN(scrollTopNumber)) {
          console.error('Invalid scroll position:', targetScrollTop)
          return
        }

        // 添加更多调试信息

        // 尝试多种滚动方法
        try {
          window.scrollTo({
            top: scrollTopNumber,
            behavior: 'auto',
          })

          // 如果 window.scrollTo 不工作，尝试直接设置 scrollTop
          setTimeout(() => {
            if (window.scrollY === 0 && scrollTopNumber > 0) {
              document.documentElement.scrollTop = scrollTopNumber
              document.body.scrollTop = scrollTopNumber
            }
          }, 10)
        }
        catch (error) {
          console.error('Error during scroll:', error)
          // 备用滚动方法
          document.documentElement.scrollTop = scrollTopNumber
          document.body.scrollTop = scrollTopNumber
        }


        setTimeout(() => {
          isScrollingFromEditor = false
        }, 50) // 缩短到50ms，避免阻塞用户滚动
        break

      case 'updateContent':
        const markdownContent = document.getElementById('markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = message.content
          applySyntaxHighlighting()
        }
        break

      case 'highlightLine':
        highlightLine(message.line)
        break
    }
  })

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
        // 切换到已复制状态（绿色勾选图标）
        button.innerHTML = copiedIcon
        button.style.color = '#4CAF50' // 绿色
        button.style.background = 'rgba(76, 175, 80, 0.1)' // 绿色半透明背景
        setTimeout(() => {
          // 恢复原始状态
          button.innerHTML = copyIcon
          button.style.color = 'var(--vscode-button-foreground)'
          button.style.background = 'rgba(0, 0, 0, 0.1)'
        }, 2000)
      }
      catch (err) {
        console.error('Failed to copy text: ', err)
        // 失败状态（红色）
        button.innerHTML = copyIcon
        button.style.color = '#f44336' // 红色
        button.style.background = 'rgba(244, 67, 54, 0.1)' // 红色半透明背景
        setTimeout(() => {
          // 恢复原始状态
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

    const elements = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote')
    const targetElement = elements[lineNumber]

    if (targetElement) {
      targetElement.classList.add('line-highlight')
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      setTimeout(() => {
        targetElement.classList.remove('line-highlight')
      }, 2000)
    }
  }

  contentContainer.addEventListener('click', (event) => {
    const target = event.target
    if (target.tagName === 'A') {
      const href = target.getAttribute('href')
      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        event.preventDefault()
        vscode.postMessage({
          command: 'openLink',
          href,
        })
      }
    }
  })

  contentContainer.addEventListener('click', (event) => {
    const target = event.target
    if (target.tagName === 'IMG') {
      // TODO: You could implement image zoom functionality here
    }
  })

  document.addEventListener('DOMContentLoaded', () => {
    applySyntaxHighlighting()

    vscode.postMessage({
      command: 'ready',
    })
  })
})()
