// 链接处理相关功能

/**
 * 判断是否为相对路径的 Markdown 文件
 */
function isRelativeMarkdownFile(href) {
  const isMarkdownFile = href.toLowerCase().endsWith('.md')

  const isLocalFile = href.startsWith('/') || href.startsWith('./') || href.startsWith('../')
  if (isMarkdownFile && isLocalFile) {
    return true
  }

  return false
}

/**
 * 初始化链接点击处理
 */
function initializeLinkHandling() {
  const markdownContent = document.getElementById('markdown-content')
  if (!markdownContent) {
    return
  }

  // 为所有链接添加点击事件监听器
  const links = markdownContent.querySelectorAll('a[href]')

  links.forEach((link, index) => {
    const href = link.getAttribute('href')
    if (!href)
      return

    // 只有相对路径的 .md 文件才通过扩展处理，其他所有链接都保持默认行为
    if (isRelativeMarkdownFile(href)) {
      link.addEventListener('click', (event) => {
        event.preventDefault()

        // 发送消息给扩展
        if (window.vscode && window.vscode.postMessage) {
          window.vscode.postMessage({
            command: 'openRelativeFile',
            filePath: href,
          })
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
      // 直接调用，因为内容已经存在
      initializeLinkHandling()
    }
  })

  observer.observe(markdownContent, {
    childList: true,
    subtree: true,
  })
}

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeLinkHandling, isRelativeMarkdownFile }
}
else {
  window.initializeLinkHandling = initializeLinkHandling
  window.isRelativeMarkdownFile = isRelativeMarkdownFile
}
