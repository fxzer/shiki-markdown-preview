// Notion风格的文档结构导航菜单
class NotionToc {
  constructor() {
    this.headers = []
    this.tocContainer = null
    this.detailedMenu = null
    this.isHovering = false
    this.currentActiveIndex = -1
    this.isScrollingToTarget = false

    // 使用 throttle-debounce 库创建节流函数
    this.throttledScrollHandler = window.throttleDebounce.throttle(100, this.handleScroll.bind(this))

    this.init()
  }

  init() {
    try {
      this.createTocContainer()
      this.parseHeaders()
      this.renderToc()
      this.bindEvents()
      this.observeContentChanges()

      // 初始化时立即检测当前滚动位置并设置活跃项
      setTimeout(() => {
        this.handleScroll()
      }, 100)
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

  // 解析文章标题结构
  parseHeaders() {
    const content = document.getElementById('markdown-content')
    if (!content)
      return

    this.headers = []
    const headers = content.querySelectorAll('h1, h2, h3')

    headers.forEach((header, index) => {
      const id = header.id || `header-${index}`
      if (!header.id) {
        header.id = id
      }

      this.headers.push({
        element: header,
        id,
        level: Number.parseInt(header.tagName.charAt(1)),
        text: header.textContent.trim(),
        offsetTop: header.offsetTop,
      })
    })
  }

  // 渲染目录
  renderToc() {
    this.renderMinimalView()
    this.renderDetailedView()
  }

  // 渲染简约视图（短横线）
  renderMinimalView() {
    if (!this.linesContainer)
      return

    this.linesContainer.innerHTML = ''

    this.headers.forEach((header, index) => {
      const line = document.createElement('div')
      line.className = 'toc-line'
      line.setAttribute('data-index', index)

      const lineBar = document.createElement('div')
      lineBar.className = 'toc-line-bar'

      // 根据标题级别设置线条长度和右对齐缩进
      const widthMap = { 1: 16, 2: 12, 3: 8 }

      lineBar.style.width = `${widthMap[header.level] || 8}px`

      if (index === this.currentActiveIndex) {
        lineBar.classList.add('active')
      }

      line.appendChild(lineBar)
      this.linesContainer.appendChild(line)
    })
  }

  // 渲染详细视图
  renderDetailedView() {
    if (!this.itemsContainer)
      return

    this.itemsContainer.innerHTML = ''

    this.headers.forEach((header, index) => {
      const item = document.createElement('div')
      item.className = 'toc-item'
      item.setAttribute('data-index', index)

      // 根据级别添加左缩进（详细视图保持左对齐）
      const indentMap = { 1: 0, 2: 16, 3: 32 }
      item.style.marginLeft = `${indentMap[header.level] || 0}px`

      if (index === this.currentActiveIndex) {
        item.classList.add('active')
      }

      item.innerHTML = `
        <span class="toc-item-text">${this.escapeHtml(header.text)}</span>
      `

      item.addEventListener('click', () => this.scrollToHeader(index))
      this.itemsContainer.appendChild(item)
    })
  }

  // 绑定事件
  bindEvents() {
    // 鼠标悬停事件
    this.tocContainer.addEventListener('mouseenter', () => {
      this.isHovering = true
      this.showDetailedView()
    })

    this.tocContainer.addEventListener('mouseleave', () => {
      this.isHovering = false
      this.hideDetailedView()
    })

    // 简约视图点击事件
    this.linesContainer.addEventListener('click', (e) => {
      const line = e.target.closest('.toc-line')
      if (line) {
        const index = Number.parseInt(line.getAttribute('data-index'))
        this.scrollToHeader(index)
      }
    })

    // 滚动事件（节流）
    window.addEventListener('scroll', this.throttledScrollHandler)

    // 窗口大小改变事件
    window.addEventListener('resize', () => {
      this.updateHeaderPositions()
    })
  }

  // 显示详细视图
  showDetailedView() {
    this.minimalView.style.display = 'none'
    this.detailedView.style.display = 'block'

    // 确保详细视图显示时同步当前的活跃状态
    this.syncDetailedViewActiveState()
  }

  // 隐藏详细视图
  hideDetailedView() {
    this.minimalView.style.display = 'block'
    this.detailedView.style.display = 'none'
  }

  // 滚动到指定标题
  scrollToHeader(index) {
    if (index < 0 || index >= this.headers.length)
      return

    const header = this.headers[index]
    this.isScrollingToTarget = true

    header.element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    // 更新当前活跃项
    this.updateActiveItem(index)

    // 滚动完成后重置标志
    setTimeout(() => {
      this.isScrollingToTarget = false
    }, 1000)
  }

  // 处理滚动事件
  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const viewportHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // 计算滚动百分比并发送给扩展
    const scrollPercentage = documentHeight > viewportHeight
      ? Math.max(0, Math.min(1, scrollTop / (documentHeight - viewportHeight)))
      : 0

    // 发送滚动事件给扩展
    if (window.vscode && window.vscode.postMessage) {
      console.warn('Sending scroll event to extension:', {
        scrollPercentage,
        scrollTop,
        documentHeight,
        viewportHeight,
        timestamp: Date.now(),
      })
      window.vscode.postMessage({
        command: 'scroll',
        scrollPercentage,
        source: 'preview',
        timestamp: Date.now(),
      })
    }
    else {
      console.warn('vscode.postMessage not available')
    }

    let activeIndex = -1

    // 如果页面滚动到顶部，激活第一个标题
    if (scrollTop <= 100) {
      activeIndex = 0
    }
    // 如果在页面底部，激活最后一个标题
    else if (scrollTop + viewportHeight >= documentHeight - 100) {
      activeIndex = this.headers.length - 1
    }
    // 否则找到当前视口中的标题
    else {
      // 从后往前遍历，找到第一个在视口上方或视口中的标题
      for (let i = this.headers.length - 1; i >= 0; i--) {
        const header = this.headers[i]
        const elementTop = header.element.offsetTop
        const elementBottom = elementTop + header.element.offsetHeight

        // 更精确的检测逻辑：
        // 1. 如果标题在视口上方但距离视口顶部不超过200px，则激活
        // 2. 如果标题在视口中，则激活
        // 3. 优先选择距离视口顶部最近的标题
        if (scrollTop + 200 >= elementTop) {
          // 如果标题在视口中，或者距离视口顶部很近，则激活
          if (scrollTop < elementBottom || scrollTop + 100 >= elementTop) {
            activeIndex = i
            break
          }
        }
      }
    }

    this.updateActiveItem(activeIndex)
  }

  // 更新活跃项
  updateActiveItem(index) {
    if (this.currentActiveIndex === index)
      return

    this.currentActiveIndex = index

    // 更新简约视图
    const lines = this.linesContainer.querySelectorAll('.toc-line-bar')
    lines.forEach((line, i) => {
      line.classList.toggle('active', i === index)
    })

    // 更新详细视图
    this.syncDetailedViewActiveState()
  }

  // 同步详细视图的活跃状态
  syncDetailedViewActiveState() {
    const items = this.itemsContainer.querySelectorAll('.toc-item')
    items.forEach((item, i) => {
      item.classList.toggle('active', i === this.currentActiveIndex)
    })
  }

  // 更新标题位置
  updateHeaderPositions() {
    this.headers.forEach((header) => {
      header.offsetTop = header.element.offsetTop
    })
  }

  // 监听内容变化
  observeContentChanges() {
    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName && node.nodeName.match(/^H[1-6]$/)) {
              shouldUpdate = true
            }
          })
        }
      })

      if (shouldUpdate) {
        setTimeout(() => {
          this.refresh()
        }, 100)
      }
    })

    const content = document.getElementById('markdown-content')
    if (content) {
      observer.observe(content, {
        childList: true,
        subtree: true,
      })
    }
  }

  // 刷新目录
  refresh() {
    this.parseHeaders()
    this.renderToc()
    this.handleScroll()
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // 销毁
  destroy() {
    if (this.tocContainer) {
      this.tocContainer.remove()
    }
    // 取消防抖函数
    if (this.throttledScrollHandler) {
      this.throttledScrollHandler.cancel()
    }
  }
}

// 初始化Notion TOC
function initializeNotionToc() {
  // 检查必要的DOM元素是否存在
  const content = document.getElementById('markdown-content')

  if (!content) {
    console.warn('Markdown content not found, retrying in 500ms...')
    setTimeout(initializeNotionToc, 500)
    return
  }

  // 检查是否有标题元素
  const headers = content.querySelectorAll('h1, h2, h3')

  if (headers.length === 0) {
    console.warn('No headers found, retrying in 1000ms...')
    setTimeout(initializeNotionToc, 1000)
    return
  }

  window.notionToc = new NotionToc()
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeNotionToc, 100)
  // 确保在页面加载完成后应用语法高亮
  setTimeout(applySyntaxHighlighting, 200)
})

// 页面加载完成后也调用一次，确保语法高亮被应用
window.addEventListener('load', () => {
  setTimeout(applySyntaxHighlighting, 100)
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
    case 'scrollToPercentage': {
      // 如果消息来源是预览区自己，忽略避免循环
      if (message.source === 'preview') {
        break
      }

      // 定义缺失的函数
      const getDocumentHeight = () => {
        return Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
        )
      }

      const getViewportHeight = () => {
        return window.innerHeight || document.documentElement.clientHeight
      }

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

      // 滚动完成后的清理工作
      setTimeout(() => {
        // 可以在这里添加滚动完成后的逻辑
      }, 100) // 与扩展端保持一致
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
    case 'updateDocumentWidth': {
      // 更新文档宽度CSS变量
      document.documentElement.style.setProperty('--document-width', message.width)
      break
    }
  }
})
