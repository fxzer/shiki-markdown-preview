/**
 * Webview 主入口 - 兼容模式
 *
 * 这个文件提供了向后兼容的支持，确保旧的直接引用仍然可用。
 * 所有的主要功能已经迁移到 modules/ 目录下的模块化文件中。
 *
 * 模块化结构：
 * - modules/utils.js - 工具函数
 * - modules/syntax-highlight.js - 语法高亮
 * - modules/link-handler.js - 链接处理
 * - modules/scroll-sync.js - 滚动同步
 * - modules/notion-toc.js - 目录导航
 * - modules/main.js - 主入口和协调器
 *
 * 注意：这个文件只提供兼容性导出，实际功能由HTML模板中加载的模块提供。
 */

// 如果模块系统可用，直接返回 - 功能由HTML模板中的脚本加载
if (window.initializeWebviewModules) {
  console.warn('[Webview Compatibility] Modules already loaded via HTML template, skipping compatibility layer')
}
else {
  console.error('[Webview Compatibility] Modules not loaded! Please ensure HTML template includes all required modules.')
}

// 提供基本的兼容性保护
try {
  // 确保基本的VSCode API存在
  if (!window.vscode) {
    console.error('[Webview Compatibility] VSCode API not found!')
  }
}
catch (error) {
  console.error('[Webview Compatibility] Error in compatibility layer:', error)
}
