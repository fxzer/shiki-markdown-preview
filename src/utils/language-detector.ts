import MarkdownIt from 'markdown-it'

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
const md = new MarkdownIt()

export function isSupportedLanguage(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language)
}
/**
 * 从 Markdown 内容中检测所有使用的代码块语言
 * @param content Markdown 内容
 * @returns 检测到的语言列表（去重）
 */
export function detectLanguages(content: string): string[] {
  try {
    const tokens = md.parse(content, {})
    const languages = new Set<string>()

    tokens.forEach((token) => {
      if (token.type === 'fence' && token.info) {
        // info 可能带参数，比如 "js {lineNumbers}"
        const lang = token.info.split(/\s+/)[0].trim()
        if (lang) {
          languages.add(lang)
        }
      }
    })

    return Array.from(languages).sort()
  }
  catch (error) {
    console.warn('Language detection failed:', error)
    return []
  }
}
