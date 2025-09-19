// 节流函数：确保函数在指定时间内只执行一次
// function throttle(func, limit) {
//   let inThrottle
//   return function (...args) {
//     const context = this
//     if (!inThrottle) {
//       func.apply(context, args)
//       inThrottle = true
//       setTimeout(() => inThrottle = false, limit)
//     }
//   }
// }

// 判断是否为相对路径的 Markdown 文件
function isRelativeMarkdownFile(href) {
  const isMarkdownFile = href.toLowerCase().endsWith('.md')

  const isLocalFile = href.startsWith('/') || href.startsWith('./') || href.startsWith('../')
  if (isMarkdownFile && isLocalFile) {
    return true
  }

  return false
}

// Notion风格的文档结构导航菜单 (重构版)
class NotionToc {
  constructor() {
    this.headers = []
    this.tocContainer = null
    this.currentActiveIndex = -1

    // 缓存DOM节点，避免重复查询
    this.lineBars = []
    this.tocItems = []

    this.observer = null
    this.isManualScrolling = false // 标志位：是否正在手动滚动

    this.init()
  }

  init() {
    try {
      this.createTocContainer()
      this.refresh() // 使用 refresh 作为统一的解析和渲染入口
      this.bindEvents()
      this.observeContentChanges()
    }
    catch (error) {
      console.error('Error in NotionToc init():', error)
    }
  }

  // 创建TOC容器
  createTocContainer() {
    this.tocContainer = document.createElement('div')
    this.tocContainer.className = 'notion-toc-container'
    this.tocContainer.innerHTML = `
      <div class="notion-toc-minimal">
        <div class="toc-lines"></div>
      </div>
      <div class="notion-toc-detailed" style="display: none;">
        <div class="toc-items"></div>
      </div>
    `

    document.body.appendChild(this.tocContainer)

    this.minimalView = this.tocContainer.querySelector('.notion-toc-minimal')
    this.detailedView = this.tocContainer.querySelector('.notion-toc-detailed')
    this.linesContainer = this.tocContainer.querySelector('.toc-lines')
    this.itemsContainer = this.tocContainer.querySelector('.toc-items')
  }

  parseHeaders() {
    const content = document.getElementById('markdown-content')
    if (!content)
      return

    this.headers = []
    const headerElements = content.querySelectorAll('h1, h2, h3')

    headerElements.forEach((header, index) => {
      const id = header.id || `header-${index}`
      if (!header.id) {
        header.id = id
      }

      this.headers.push({
        element: header,
        id,
        level: Number.parseInt(header.tagName.charAt(1)),
        text: header.textContent.trim(),
        index, // 添加索引方便查找
      })
    })
  }

  // 渲染并缓存DOM节点
  renderToc() {
    if (!this.linesContainer || !this.itemsContainer)
      return

    // 清空内容和缓存
    this.linesContainer.innerHTML = ''
    this.itemsContainer.innerHTML = ''
    this.lineBars = []
    this.tocItems = []

    this.headers.forEach((header, index) => {
      // 渲染简约视图
      const line = document.createElement('div')
      line.className = 'toc-line'
      line.setAttribute('data-index', index)
      const lineBar = document.createElement('div')
      lineBar.className = 'toc-line-bar'
      const widthMap = { 1: 16, 2: 12, 3: 8 }
      lineBar.style.width = `${widthMap[header.level] || 8}px`
      line.appendChild(lineBar)
      this.linesContainer.appendChild(line)
      this.lineBars.push(lineBar) // 缓存节点

      // 渲染详细视图
      const item = document.createElement('a')
      item.className = 'toc-item'
      item.href = `#${header.id}`
      item.setAttribute('data-index', index)
      const indentMap = { 1: 0, 2: 16, 3: 32 }
      item.style.marginLeft = `${indentMap[header.level] || 0}px`
      item.innerHTML = `<span class="toc-item-text">${this.escapeHtml(header.text)}</span>`
      this.itemsContainer.appendChild(item)
      this.tocItems.push(item) // 缓存节点
    })

    this.updateActiveItem(this.currentActiveIndex)
  }

  bindEvents() {
    this.tocContainer.addEventListener('mouseenter', () => this.showDetailedView())
    this.tocContainer.addEventListener('mouseleave', () => this.hideDetailedView())

    // 使用事件委托处理点击
    this.linesContainer.addEventListener('click', (e) => {
      const line = e.target.closest('.toc-line')
      if (line) {
        const index = Number.parseInt(line.getAttribute('data-index'))
        this.scrollToHeader(index)
      }
    })

    // 详细视图的a标签会处理跳转，但为了平滑滚动，我们也需要处理
    this.itemsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.toc-item')
      if (item) {
        e.preventDefault() // 阻止默认的瞬间跳转
        const index = Number.parseInt(item.getAttribute('data-index'))
        this.scrollToHeader(index)
      }
    })
  }

  showDetailedView() {
    this.minimalView.style.display = 'none'
    this.detailedView.style.display = 'block'
  }

  hideDetailedView() {
    this.minimalView.style.display = 'block'
    this.detailedView.style.display = 'none'
  }

  // 优化：独立的滚动到标题函数
  scrollToHeader(index) {
    if (index >= 0 && index < this.headers.length) {
      const header = this.headers[index]

      // 设置手动滚动标志
      this.isManualScrolling = true

      // 现代浏览器支持平滑滚动
      header.element.scrollIntoView()
      this.updateActiveItem(index)

      // 滚动完成后重置标志
      setTimeout(() => {
        this.isManualScrolling = false
      }, 800)
    }
  }

  // 优化：使用IntersectionObserver来更新高亮
  setupIntersectionObserver() {
    if (this.observer) {
      this.observer.disconnect()
    }

    const options = {
      rootMargin: '0px 0px -80% 0px', // 视口顶部 0-20% 区域触发
      threshold: 0,
    }

    this.observer = new IntersectionObserver((entries) => {
      // 如果正在手动滚动，不更新高亮
      if (this.isManualScrolling) {
        return
      }

      // 找到所有当前在触发区域内的标题
      const visibleHeaders = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => this.headers.find(h => h.element === entry.target))

      if (visibleHeaders.length > 0) {
        // 在所有可见的标题中，选择最靠前的一个
        const firstVisibleHeader = visibleHeaders.sort((a, b) => a.index - b.index)[0]
        this.updateActiveItem(firstVisibleHeader.index)
      }
    }, options)

    this.headers.forEach(header => this.observer.observe(header.element))
  }

  // 优化：更新活跃项，直接使用缓存的节点
  updateActiveItem(index) {
    if (this.currentActiveIndex === index)
      return

    // 移除旧的 active class
    if (this.currentActiveIndex !== -1) {
      if (this.lineBars[this.currentActiveIndex])
        this.lineBars[this.currentActiveIndex].classList.remove('active')
      if (this.tocItems[this.currentActiveIndex])
        this.tocItems[this.currentActiveIndex].classList.remove('active')
    }

    this.currentActiveIndex = index

    // 添加新的 active class
    if (index !== -1) {
      if (this.lineBars[index])
        this.lineBars[index].classList.add('active')
      if (this.tocItems[index])
        this.tocItems[index].classList.add('active')
    }
  }

  observeContentChanges() {
    const content = document.getElementById('markdown-content')
    if (!content)
      return

    const observer = new MutationObserver(() => {
      this.refresh()
    })

    observer.observe(content, { childList: true, subtree: true })
  }

  refresh() {
    this.parseHeaders()
    this.renderToc()
    this.setupIntersectionObserver() // 重新设置观察器
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
    if (this.tocContainer) {
      this.tocContainer.remove()
    }
  }
}

// 优化：使用轮询代替 setTimeout 来初始化
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
        console.warn(failureMsg)
      }
    }
  }, interval)
}

document.addEventListener('DOMContentLoaded', () => {
  // 检查TOC初始化条件
  const canInitToc = () => {
    const content = document.getElementById('markdown-content')
    return content && content.querySelector('h1, h2, h3')
  }
  robustInitialize(canInitToc, () => {
    window.notionToc = new NotionToc()
    console.warn('NotionToc initialized successfully')
  }, 'NotionToc initialization failed: Content or headers not found.')

  // 检查语法高亮初始化条件
  robustInitialize(
    () => document.querySelector('pre code'),
    applySyntaxHighlighting,
    'Syntax highlighting failed: Code blocks not found.',
  )

  // 检查链接处理初始化条件
  robustInitialize(
    () => document.getElementById('markdown-content'),
    initializeLinkHandling,
    'Link handling initialization failed: Markdown content not found.',
  )
})

// 页面加载完成后也调用一次，确保语法高亮被应用
window.addEventListener('load', () => {
  robustInitialize(
    () => document.querySelector('pre code'),
    applySyntaxHighlighting,
    'Syntax highlighting on load failed: Code blocks not found.',
    5, // 减少重试次数，因为页面已经加载完成
    100,
  )
})

function applySyntaxHighlighting() {
  const codeBlocks = document.querySelectorAll('pre code')
  console.warn(`Found ${codeBlocks.length} code blocks`)

  codeBlocks.forEach((codeElement, index) => {
    const preElement = codeElement.parentElement
    if (!codeElement || !preElement) {
      console.warn(`Code block ${index}: missing codeElement or preElement`)
      return
    }

    console.warn(`Processing code block ${index}:`, {
      hasDataLang: codeElement.hasAttribute('data-lang'),
      dataLang: codeElement.getAttribute('data-lang'),
      hasCopyButton: !!preElement.querySelector('.copy-button'),
      hasLangDisplay: !!preElement.querySelector('.lang'),
    })

    addCopyButton(preElement, codeElement)
    addLanguageDisplay(preElement, codeElement)
  })
}

// 添加复制按钮
function addCopyButton(preElement, codeElement) {
  if (preElement.querySelector('.copy-button')) {
    console.warn('Copy button already exists, skipping')
    return
  }

  console.warn('Adding copy button')
  const button = document.createElement('button')
  button.className = 'copy-button'
  button.title = 'Copy code'

  // 复制图标SVG
  const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"/></svg>`

  // 已复制图标SVG
  const copiedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19V5v11.35v-2.125zm0 2q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v8h-2V5H5v14h7v2zm12.35 1l-3.55-3.55l1.425-1.4l2.125 2.125l4.25-4.25L23 16.35zM8 13q.425 0 .713-.288T9 12t-.288-.712T8 11t-.712.288T7 12t.288.713T8 13m0-4q.425 0 .713-.288T9 8t-.288-.712T8 7t-.712.288T7 8t.288.713T8 9m3 4h6v-2h-6zm0-4h6V7h-6z"/></svg>`
  button.innerHTML = copyIcon
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

// 添加语言显示
function addLanguageDisplay(preElement, codeElement) {
  if (preElement.querySelector('.lang')) {
    console.warn('Language display already exists, skipping')
    return
  }

  if (!codeElement) {
    console.warn('No codeElement provided')
    return
  }

  const language = codeElement.getAttribute('data-lang') || ''
  console.warn(`Language attribute: "${language}"`)

  // 如果找到了语言信息，创建语言显示元素
  if (language && language.trim()) {
    const langElement = document.createElement('span')
    langElement.className = 'lang'
    langElement.textContent = language.trim().toLowerCase()
    preElement.appendChild(langElement)
    console.warn(`Added language display: "${language.trim().toLowerCase()}"`)
  }
  else {
    console.warn('No language found or language is empty')
  }
}

// 监听来自扩展的消息
window.addEventListener('message', (event) => {
  const message = event.data
  switch (message.command) {
    case 'refreshToc':
      if (window.notionToc) {
        window.notionToc.refresh()
      }
      break
    case 'updateContent': {
      const markdownContent = document.getElementById('markdown-content')
      if (markdownContent) {
        markdownContent.innerHTML = message.content
        applySyntaxHighlighting()
        robustInitialize(
          () => document.getElementById('markdown-content'),
          initializeLinkHandling,
          'Link handling reinitialization failed after content update.',
          3,
          50,
        )
        // 重新初始化NotionToc以确保滚动事件监听器正确绑定
        robustInitialize(
          () => {
            const content = document.getElementById('markdown-content')
            return content && content.querySelector('h1, h2, h3')
          },
          () => {
            if (window.notionToc) {
              window.notionToc.destroy()
            }
            window.notionToc = new NotionToc()
          },
          'NotionToc reinitialization failed after content update.',
          5,
          100,
        )
      }
      break
    }
    case 'updateDocumentWidth': {
      // 更新文档宽度CSS变量
      document.documentElement.style.setProperty('--document-width', message.width)
      break
    }
  }
})

// 初始化链接点击处理
function initializeLinkHandling() {
  const markdownContent = document.getElementById('markdown-content')
  if (!markdownContent) {
    console.warn('Markdown content not found for link handling')
    return
  }

  // 为所有链接添加点击事件监听器
  const links = markdownContent.querySelectorAll('a[href]')
  console.warn(`Found ${links.length} links to process`)

  links.forEach((link, index) => {
    const href = link.getAttribute('href')
    if (!href)
      return

    console.warn(`Processing link ${index}: ${href}`)

    // 只有相对路径的 .md 文件才通过扩展处理，其他所有链接都保持默认行为
    if (isRelativeMarkdownFile(href)) {
      console.warn(`Setting up relative file link: ${href}`)

      link.addEventListener('click', (event) => {
        event.preventDefault()
        console.warn(`Clicked relative file link: ${href}`)

        // 发送消息给扩展
        if (window.vscode && window.vscode.postMessage) {
          window.vscode.postMessage({
            command: 'openRelativeFile',
            filePath: href,
          })
        }
        else {
          console.error('vscode.postMessage not available')
        }
      })

      // 添加视觉提示，表明这是一个可点击的相对链接
      link.style.cursor = 'pointer'
      link.title = `点击打开文件: ${href}`
    }
  })

  // 监听内容变化，重新处理新添加的链接
  const observer = new MutationObserver((mutations) => {
    let shouldReinitialize = false

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查是否添加了新的链接
            if (node.tagName === 'A' || (node.querySelector && node.querySelector('a'))) {
              shouldReinitialize = true
            }
          }
        })
      }
    })

    if (shouldReinitialize) {
      console.warn('Content changed, reinitializing link handling...')
      // 直接调用，因为内容已经存在
      initializeLinkHandling()
    }
  })

  observer.observe(markdownContent, {
    childList: true,
    subtree: true,
  })
}
