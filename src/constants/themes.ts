// 主题相关类型定义已迁移到 src/types/theme.ts
// 原有的 AVAILABLE_THEMES 常量已废弃，改为动态发现所有可用主题
// 使用 ThemeService 的 discoverAndCacheThemes() 方法获取所有主题

export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'html',
  'css',
  'scss',
  'json',
  'xml',
  'yaml',
  'markdown',
]
