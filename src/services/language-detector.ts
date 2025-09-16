import matter from 'gray-matter'

/**
 * 代码块语言检测器
 * 用于分析 Markdown 文档中使用的所有代码块语言
 */
export class LanguageDetector {
  // 常量定义
  private static readonly FENCE_REGEX = /^```(\w+)(?:\{[^}]*\})?$/gm
  private static readonly FENCE_START_REGEX = /^```/m
  private static readonly INVALID_LANGUAGES = new Set([
    'text',
    'plain',
    'txt',
    'none',
    'null',
    'undefined',
    'output',
    'result',
    'console',
    'terminal',
    'shell-output',
  ])

  private static readonly VALID_LANGUAGE_REGEX = /^[a-z][\w#+-]*$/i
  private static readonly NUMBER_SUFFIX_REGEX = /\d+$/

  /**
   * 从 Markdown 内容中检测所有使用的代码块语言
   * @param content Markdown 内容
   * @returns 检测到的语言列表（去重）
   */
  static detectLanguages(content: string): string[] {
    return this.withErrorHandling(() => {
      const languages = new Set<string>()
      this.forEachCodeBlock(content, (language) => {
        languages.add(language)
      })
      return Array.from(languages).sort()
    }, [])
  }

  /**
   * 验证语言是否有效
   * @param language 语言标识符
   * @returns 是否为有效语言
   */
  private static isValidLanguage(language: string): boolean {
    // 基本验证
    if (!language || language.length === 0 || language.length > 50) {
      return false
    }

    // 检查是否为无效语言
    if (this.INVALID_LANGUAGES.has(language.toLowerCase())) {
      return false
    }

    // 验证语言标识符格式
    if (!this.VALID_LANGUAGE_REGEX.test(language)) {
      return false
    }

    // 过滤掉包含数字后缀的语言
    if (this.NUMBER_SUFFIX_REGEX.test(language)) {
      return false
    }

    return true
  }

  /**
   * 获取语言的使用统计信息
   * @param content Markdown 内容
   * @returns 语言使用统计
   */
  static getLanguageStats(content: string): Map<string, number> {
    return this.withErrorHandling(() => {
      const stats = new Map<string, number>()
      this.forEachCodeBlock(content, (language) => {
        stats.set(language, (stats.get(language) || 0) + 1)
      })
      return stats
    }, new Map())
  }

  /**
   * 检查文档是否包含代码块
   * @param content Markdown 内容
   * @returns 是否包含代码块
   */
  static hasCodeBlocks(content: string): boolean {
    return this.withErrorHandling(() => {
      const { content: markdownContent } = matter(content)
      return this.FENCE_START_REGEX.test(markdownContent)
    }, false)
  }

  /**
   * 获取代码块总数
   * @param content Markdown 内容
   * @returns 代码块总数
   */
  static getCodeBlockCount(content: string): number {
    return this.withErrorHandling(() => {
      const { content: markdownContent } = matter(content)
      const fenceMatches = markdownContent.match(/^```/gm)
      return fenceMatches ? Math.floor(fenceMatches.length / 2) : 0
    }, 0)
  }

  /**
   * 通用错误处理包装器
   * @param fn 要执行的函数
   * @param defaultValue 出错时的默认值
   * @returns 函数执行结果或默认值
   */
  private static withErrorHandling<T>(
    fn: () => T,
    defaultValue: T,
  ): T {
    try {
      return fn()
    }
    catch (error) {
      console.warn('LanguageDetector operation failed:', error)
      return defaultValue
    }
  }

  /**
   * 遍历所有代码块，对每个有效语言执行回调
   * @param content Markdown 内容
   * @param callback 对每个语言执行的回调函数
   */
  private static forEachCodeBlock(
    content: string,
    callback: (_language: string) => void,
  ): void {
    const { content: markdownContent } = matter(content)

    // 重置正则表达式的 lastIndex
    this.FENCE_REGEX.lastIndex = 0

    let match = this.FENCE_REGEX.exec(markdownContent)
    while (match !== null) {
      const language = match[1].toLowerCase()
      if (language && this.isValidLanguage(language)) {
        callback(language)
      }
      match = this.FENCE_REGEX.exec(markdownContent)
    }
  }
}
