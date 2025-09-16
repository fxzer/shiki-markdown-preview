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
      // eslint-disable-next-line no-undef
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
  // eslint-disable-next-line no-unused-vars
  const _scrollCheckInterval = setInterval(() => {
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
      case 'scrollToPercentage': {
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
      }

      case 'updateContent': {
        const markdownContent = document.getElementById('markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = message.content
          applySyntaxHighlighting()
        }
        break
      }

      case 'highlightLine':
        highlightLine(message.line)
        break
    }
  })

  function applySyntaxHighlighting() {
    const codeBlocks = document.querySelectorAll('pre code')
    codeBlocks.forEach((codeElement) => {
      const preElement = codeElement.parentElement
      if (!codeElement || !preElement)
        return

      addCopyButton(preElement, codeElement)
      addLanguageDisplay(preElement, codeElement)
    })
  }

  function addCopyButton(preElement, codeElement) {
    if (preElement.querySelector('.copy-button'))
      return

    const button = document.createElement('button')
    button.className = 'copy-button'
    button.title = 'Copy code'

    // 复制图标SVG
    const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"/></svg>`

    // 已复制图标SVG
    const copiedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19V5v11.35v-2.125zm0 2q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v8h-2V5H5v14h7v2zm12.35 1l-3.55-3.55l1.425-1.4l2.125 2.125l4.25-4.25L23 16.35zM8 13q.425 0 .713-.288T9 12t-.288-.712T8 11t-.712.288T7 12t.288.713T8 13m0-4q.425 0 .713-.288T9 8t-.288-.712T8 7t-.712.288T7 8t.288.713T8 9m3 4h6v-2h-6zm0-4h6V7h-6z"/></svg>`

    button.innerHTML = copyIcon
    // CSS 样式已移动到 webview.css 文件中

    // 鼠标悬停效果已通过 CSS 处理

    button.addEventListener('click', async () => {
      const code = codeElement ? codeElement.textContent || '' : ''
      try {
        await navigator.clipboard.writeText(code)
        // 切换到已复制状态
        button.innerHTML = copiedIcon
        button.classList.add('copied')
        setTimeout(() => {
          // 恢复原始状态
          button.innerHTML = copyIcon
          button.classList.remove('copied')
        }, 2000)
      }
      catch (err) {
        console.error('Failed to copy text: ', err)
        // 失败状态
        button.innerHTML = copyIcon
        button.classList.add('failed')
        setTimeout(() => {
          // 恢复原始状态
          button.innerHTML = copyIcon
          button.classList.remove('failed')
        }, 2000)
      }
    })

    preElement.style.position = 'relative'
    preElement.appendChild(button)
  }

  function addLanguageDisplay(preElement, codeElement) {
    if (preElement.querySelector('.lang'))
      return

    if (!codeElement)
      return

    const language = codeElement.getAttribute('data-lang') || ''

    // 如果找到了语言信息，创建语言显示元素
    if (language && language.trim()) {
      const langElement = document.createElement('span')
      langElement.className = 'lang'
      langElement.textContent = language.trim().toLowerCase()
      preElement.appendChild(langElement)
    }
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

  // 处理链接点击事件
  document.addEventListener('click', (event) => {
    let target = event.target
    // 处理 <a> 标签内部元素的点击事件，确保我们总能拿到 <a> 元素
    while (target && target.tagName !== 'A') {
      target = target.parentElement
    }

    if (target && target.tagName === 'A') {
      const hrefAttr = target.getAttribute('href')

      if (!hrefAttr) {
        return
      }

      // 处理外部链接（排除VS Code内部资源）
      if ((hrefAttr.startsWith('http://') || hrefAttr.startsWith('https://') || hrefAttr.startsWith('//'))
        && !hrefAttr.includes('vscode-resource.vscode-cdn.net')) {
        event.preventDefault()
        event.stopPropagation() // 阻止事件冒泡
        vscode.postMessage({
          command: 'openExternal',
          url: hrefAttr,
        })
      }
      // 处理相对路径链接（.md 文件）
      else if (hrefAttr.endsWith('.md')) {
        event.preventDefault()
        vscode.postMessage({
          command: 'openRelativeFile',
          // 关键修复：使用 href 属性值作为文件路径
          filePath: hrefAttr,
          href: hrefAttr, // 保持消息结构一致性
        })
      }
      // 锚点链接（以 # 开头）让浏览器原生处理，不需要特殊处理
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
