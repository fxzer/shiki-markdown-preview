// 主入口模块 - 负责初始化和协调各个功能模块

// 初始化滚动同步管理器
let scrollSyncManager = null

/**
 * 初始化滚动同步
 */
function initializeScrollSync() {
  // 确保内容已经加载
  const content = document.getElementById('markdown-content')
  if (!content) {
    setTimeout(initializeScrollSync, 200)
    return
  }

  // 确保页面完全加载
  if (document.readyState !== 'complete') {
    setTimeout(initializeScrollSync, 100)
    return
  }

  if (scrollSyncManager) {
    scrollSyncManager.destroy()
  }

  scrollSyncManager = new window.ScrollSyncManager()
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
      // 如果ScrollSyncManager已初始化，使用它处理
      if (scrollSyncManager) {
        scrollSyncManager.syncToPercent(message.percent, message.immediate)
      }
      else {
        // 如果ScrollSyncManager未初始化，直接处理消息 - 优化版本
        const scrollHeight = document.documentElement.scrollHeight
        const clientHeight = document.documentElement.clientHeight

        if (scrollHeight > clientHeight) {
          const targetY = message.percent * (scrollHeight - clientHeight)
          const currentY = window.scrollY

          // 检查是否需要滚动（避免不必要的滚动操作）
          if (Math.abs(targetY - currentY) > 2) { // 减少阈值，提高精度
            // 使用即时滚动，避免动画延迟
            window.scrollTo({ top: targetY, behavior: 'instant' })
          }
        }
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
  // 检查TOC初始化条件
  const canInitToc = () => {
    const content = document.getElementById('markdown-content')
    return content && content.querySelector('h1, h2, h3')
  }

  if (window.robustInitialize && window.NotionToc) {
    window.robustInitialize(canInitToc, () => {
      window.notionToc = new window.NotionToc()
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
