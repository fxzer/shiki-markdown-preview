// 主入口模块 - 负责初始化和协调各个功能模块

// 初始化滚动同步管理器
let scrollSyncManager = null

/**
 * 初始化滚动同步
 */
function initializeScrollSync() {
  console.warn('[ScrollSync] initializeScrollSync called')

  // 确保内容已经加载
  const content = document.getElementById('markdown-content')
  if (!content) {
    console.warn('[ScrollSync] Content not found, retrying...')
    setTimeout(initializeScrollSync, 200)
    return
  }

  // 确保页面完全加载
  if (document.readyState !== 'complete') {
    console.warn('[ScrollSync] Document not complete, retrying...')
    setTimeout(initializeScrollSync, 100)
    return
  }

  if (scrollSyncManager) {
    console.warn('[ScrollSync] Destroying existing scrollSyncManager')
    scrollSyncManager.destroy()
  }

  console.warn('[ScrollSync] Creating new ScrollSyncManager')
  scrollSyncManager = new window.ScrollSyncManager()
  console.warn('[ScrollSync] ScrollSyncManager initialized successfully')
}

/**
 * 处理来自扩展的消息
 */
function handleExtensionMessage(event) {
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

        // 重新应用语法高亮
        if (window.applySyntaxHighlighting) {
          window.applySyntaxHighlighting()
        }

        // 重新初始化链接处理
        if (window.initializeLinkHandling) {
          window.robustInitialize(
            () => document.getElementById('markdown-content'),
            window.initializeLinkHandling,
            'Link handling reinitialization failed after content update.',
            3,
            50,
          )
        }

        // 重新初始化NotionToc
        if (window.NotionToc) {
          window.robustInitialize(
            () => {
              const content = document.getElementById('markdown-content')
              return content && content.querySelector('h1, h2, h3')
            },
            () => {
              if (window.notionToc) {
                window.notionToc.destroy()
              }
              window.notionToc = new window.NotionToc()
            },
            'NotionToc reinitialization failed after content update.',
            5,
            100,
          )
        }

        // 延迟重新初始化滚动同步
        setTimeout(() => {
          initializeScrollSync()
        }, 300)
      }
      break
    }
    case 'syncScrollToPercent': {
      // 即使ScrollSyncManager未初始化，也直接处理消息
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight

      if (scrollHeight > clientHeight) {
        const targetY = message.percent * (scrollHeight - clientHeight)
        const behavior = message.immediate ? 'auto' : 'smooth'
        window.scrollTo({ top: targetY, behavior })
      }

      // 如果ScrollSyncManager已初始化，也通知它
      if (scrollSyncManager) {
        scrollSyncManager.syncToPercent(message.percent, message.immediate)
      }
      break
    }
    case 'updateDocumentWidth': {
      // 更新文档宽度CSS变量
      document.documentElement.style.setProperty('--document-width', message.width)
      break
    }
    case 'updateFontFamily': {
      // 更新字体CSS变量
      document.documentElement.style.setProperty('--font-family', message.fontFamily)
      break
    }
  }
}

/**
 * 主初始化函数
 */
function initializeWebviewModules() {
  console.warn('[Webview] Starting module initialization...')

  // 检查TOC初始化条件
  const canInitToc = () => {
    const content = document.getElementById('markdown-content')
    return content && content.querySelector('h1, h2, h3')
  }

  if (window.robustInitialize && window.NotionToc) {
    window.robustInitialize(canInitToc, () => {
      window.notionToc = new window.NotionToc()
      console.warn('NotionToc initialized successfully')
    }, 'NotionToc initialization failed: Content or headers not found.')
  }

  // 检查语法高亮初始化条件
  if (window.robustInitialize && window.applySyntaxHighlighting) {
    window.robustInitialize(
      () => document.querySelector('pre code'),
      window.applySyntaxHighlighting,
      'Syntax highlighting failed: Code blocks not found.',
    )
  }

  // 检查链接处理初始化条件
  if (window.robustInitialize && window.initializeLinkHandling) {
    window.robustInitialize(
      () => document.getElementById('markdown-content'),
      window.initializeLinkHandling,
      'Link handling initialization failed: Markdown content not found.',
    )
  }

  // 初始化滚动同步
  initializeScrollSync()

  console.warn('[Webview] All modules initialized')
}

// 页面加载完成后也调用一次，确保语法高亮被应用
window.addEventListener('load', () => {
  if (window.robustInitialize && window.applySyntaxHighlighting) {
    window.robustInitialize(
      () => document.querySelector('pre code'),
      window.applySyntaxHighlighting,
      'Syntax highlighting on load failed: Code blocks not found.',
      5, // 减少重试次数，因为页面已经加载完成
      100,
    )
  }
})

// 设置全局消息监听器
window.addEventListener('message', handleExtensionMessage)

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeWebviewModules,
    initializeScrollSync,
    handleExtensionMessage,
    scrollSyncManager: () => scrollSyncManager,
  }
}
else {
  window.initializeWebviewModules = initializeWebviewModules
  window.initializeScrollSync = initializeScrollSync
  window.handleExtensionMessage = handleExtensionMessage
}
