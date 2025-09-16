import type * as vscode from 'vscode'
import type { ThemeService } from './theme-service'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { escapeHtml } from '../utils'
import { ErrorHandler } from '../utils/error-handler'
import { PathResolver } from '../utils/path-resolver'
import { LanguageDetector } from './language-detector'

export class MarkdownRenderer {
  private _markdownIt: MarkdownIt | undefined
  private _themeService: ThemeService
  private _currentDocument: vscode.TextDocument | undefined

  constructor(themeService: ThemeService) {
    this._themeService = themeService
  }

  /**
   * Initialize the markdown renderer
   */
  initialize(): void {
    this._markdownIt = new MarkdownIt({
      html: true,
      xhtmlOut: true,
      breaks: false,
      linkify: true,
      typographer: true,
      highlight: (code: string, lang: string) => {
        return this.highlightCode(code, lang)
      },
    })

    this.setupCustomRules()
  }

  /**
   * Set up custom rendering rules for relative paths
   */
  private setupCustomRules(): void {
    if (!this._markdownIt)
      return

    this._markdownIt.renderer.rules.image = (tokens, idx, options, env, renderer) => {
      const token = tokens[idx]
      const srcIndex = token.attrIndex('src')

      if (srcIndex >= 0 && token.attrs && token.attrs[srcIndex]) {
        const href = token.attrs[srcIndex][1]
        if (!href.startsWith('http') && !href.startsWith('data:')) {
          const resolvedUri = this._currentDocument ? PathResolver.resolveRelativePath(this._currentDocument, href) : null
          if (resolvedUri) {
            token.attrs[srcIndex][1] = resolvedUri
          }
        }
      }

      return renderer.renderToken(tokens, idx, options)
    }

    this._markdownIt.renderer.rules.link_open = (tokens, idx, options, env, renderer) => {
      const token = tokens[idx]
      const hrefIndex = token.attrIndex('href')

      if (hrefIndex >= 0 && token.attrs && token.attrs[hrefIndex]) {
        const href = token.attrs[hrefIndex][1]
        // 对于锚点链接（以#开头），保持原样，不进行任何处理
        if (href.startsWith('#')) {
          // 锚点链接，保持原样
          return renderer.renderToken(tokens, idx, options)
        }
        // 对于 .md 文件，保持相对路径，不转换为绝对URI
        if (!href.startsWith('http') && !href.startsWith('data:') && !href.endsWith('.md')) {
          const resolvedUri = this._currentDocument ? PathResolver.resolveRelativePath(this._currentDocument, href) : null
          if (resolvedUri) {
            token.attrs[hrefIndex][1] = resolvedUri
          }
        }
      }

      return renderer.renderToken(tokens, idx, options)
    }

    // 为标题添加id属性，支持锚点链接
    this._markdownIt.renderer.rules.heading_open = (tokens, idx, options, env, renderer) => {
      const token = tokens[idx]
      token.tag.replace('h', '')

      // 获取标题文本内容
      let titleText = ''
      let i = idx + 1
      while (i < tokens.length && tokens[i].type !== 'heading_close') {
        if (tokens[i].type === 'inline') {
          titleText += tokens[i].content
        }
        i++
      }

      // 生成id（移除特殊字符，转换为URL友好的格式）
      const id = this.generateHeadingId(titleText)

      // 添加id属性
      const attrIndex = token.attrIndex('id')
      if (attrIndex < 0) {
        token.attrPush(['id', id])
      }
      else {
        token.attrs![attrIndex][1] = id
      }

      return renderer.renderToken(tokens, idx, options)
    }
  }

  /**
   * Highlight code using the theme service
   */
  private highlightCode(code: string, lang: string): string {
    if (!lang || !this._themeService.highlighter) {
      return `<pre><code>${escapeHtml(code)}</code></pre>`
    }

    try {
      // 使用同步版本的 highlightCode 方法
      const highlighted = this._themeService.highlightCode(code, lang)

      // 如果结果是空的，返回基本的 HTML
      if (!highlighted) {
        return `<pre><code class="language-${lang}" data-lang="${lang}">${escapeHtml(code)}</code></pre>`
      }

      // 确保高亮后的 HTML 包含语言信息
      // 检查是否已经包含 language- 类
      if (highlighted.includes(`class="language-${lang}"`) || highlighted.includes(`class='language-${lang}'`)) {
        return highlighted
      }

      // 如果没有语言类，添加它
      // 查找 <code> 标签并添加语言信息
      const codeTagRegex = /<code([^>]*)>/i
      const match = highlighted.match(codeTagRegex)

      if (match) {
        const existingAttrs = match[1] || ''
        const newAttrs = existingAttrs.includes('class=')
          ? existingAttrs.replace(/class="([^"]*)"/, `class="$1 language-${escapeHtml(lang)}"`)
          : `${existingAttrs} class="language-${escapeHtml(lang)}"`

        return highlighted.replace(codeTagRegex, `<code${newAttrs} data-lang="${escapeHtml(lang)}">`)
      }

      // 如果无法找到 code 标签，返回原始高亮结果
      return highlighted
    }
    catch {
      ErrorHandler.logWarning(`代码高亮失败: ${lang}`, 'MarkdownRenderer')
      return `<pre><code class="language-${escapeHtml(lang)}" data-lang="${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`
    }
  }

  /**
   * Generate heading ID from title text
   */
  private generateHeadingId(titleText: string): string {
    return titleText
      .trim()
      .toLowerCase()
      .replace(/[^\u4E00-\u9FA5a-z0-9\s-]/g, '') // 保留中文、英文、数字、空格、连字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-|-$/g, '') // 移除首尾连字符
  }

  /**
   * Parse front matter from markdown content
   */
  parseFrontMatter(content: string): { content: string, data: any } {
    try {
      const parsed = matter(content)
      return {
        content: parsed.content, // 只使用内容部分，忽略元数据
        data: parsed.data,
      }
    }
    catch {
      ErrorHandler.logWarning('Front matter 解析失败', 'MarkdownRenderer')
      return {
        content,
        data: {},
      }
    }
  }

  /**
   * Render markdown content with line number tracking
   */
  async render(content: string, document?: vscode.TextDocument): Promise<string> {
    if (!this._markdownIt) {
      throw new Error('Markdown renderer not initialized')
    }

    if (document) {
      this._currentDocument = document
    }

    try {
      // 使用 gray-matter 分离 front matter 和内容
      const { content: markdownContent } = this.parseFrontMatter(content)

      // 在渲染前检测并预加载需要的语言
      await this._preloadLanguagesForContent(content)

      const lines = markdownContent.split('\n')
      let currentLine = 0

      const originalRules = {
        heading_open: this._markdownIt.renderer.rules.heading_open,
        paragraph_open: this._markdownIt.renderer.rules.paragraph_open,
        list_item_open: this._markdownIt.renderer.rules.list_item_open,
        blockquote_open: this._markdownIt.renderer.rules.blockquote_open,
        code_block: this._markdownIt.renderer.rules.code_block,
        fence: this._markdownIt.renderer.rules.fence,
        table_open: this._markdownIt.renderer.rules.table_open,
        hr: this._markdownIt.renderer.rules.hr,
      }

      const addLineNumber = (tokens: any[], idx: number, options: any, env: any, renderer: any, ruleName: string) => {
        const token = tokens[idx]
        if (token && currentLine < lines.length) {
          for (let i = currentLine; i < lines.length; i++) {
            const line = lines[i].trim()
            if (line && !line.startsWith('<!--')) {
              token.attrSet?.('data-line', i.toString())
              currentLine = i + 1
              break
            }
          }
        }

        return originalRules[ruleName as keyof typeof originalRules]
          ? originalRules[ruleName as keyof typeof originalRules]!(tokens, idx, options, env, renderer)
          : renderer.renderToken(tokens, idx, options)
      }

      this._markdownIt.renderer.rules.heading_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'heading_open')

      this._markdownIt.renderer.rules.paragraph_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'paragraph_open')

      this._markdownIt.renderer.rules.list_item_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'list_item_open')

      this._markdownIt.renderer.rules.blockquote_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'blockquote_open')

      this._markdownIt.renderer.rules.code_block = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'code_block')

      this._markdownIt.renderer.rules.fence = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'fence')

      this._markdownIt.renderer.rules.table_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'table_open')

      this._markdownIt.renderer.rules.hr = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'hr')

      return this._markdownIt.render(markdownContent)
    }
    catch (error) {
      ErrorHandler.handleRenderError(error, 'Markdown 渲染')
      throw error
    }
  }

  /**
   * Get front matter data from markdown content
   */
  getFrontMatterData(content: string): any {
    const { data } = this.parseFrontMatter(content)
    return data
  }

  /**
   * 为内容预加载需要的语言
   * @param content Markdown 内容
   */
  private async _preloadLanguagesForContent(content: string): Promise<void> {
    try {
      // 检查是否包含代码块
      if (!LanguageDetector.hasCodeBlocks(content)) {
        return
      }

      // 获取语言统计信息
      const languageStats = LanguageDetector.getLanguageStats(content)
      const codeBlockCount = LanguageDetector.getCodeBlockCount(content)

      ErrorHandler.logInfo(`内容分析: ${codeBlockCount} 个代码块, ${languageStats.size} 种语言`, 'MarkdownRenderer')

      // 预加载检测到的语言
      await this._themeService.preloadLanguagesFromContent(content)
    }
    catch {
      ErrorHandler.logWarning('语言预加载失败', 'MarkdownRenderer')
      // 不抛出错误，继续渲染
    }
  }

  /**
   * 获取内容分析信息（用于调试）
   * @param content Markdown 内容
   */
  getContentAnalysis(content: string): {
    hasCodeBlocks: boolean
    codeBlockCount: number
    languages: string[]
    languageStats: Map<string, number>
    loadingStats: { loaded: string[], total: number, unloaded: string[] }
  } {
    const hasCodeBlocks = LanguageDetector.hasCodeBlocks(content)
    const codeBlockCount = LanguageDetector.getCodeBlockCount(content)
    const languages = LanguageDetector.detectLanguages(content)
    const languageStats = LanguageDetector.getLanguageStats(content)
    const loadingStats = this._themeService.getLanguageLoadingStats()

    return {
      hasCodeBlocks,
      codeBlockCount,
      languages,
      languageStats,
      loadingStats,
    }
  }

  get markdownIt(): MarkdownIt | undefined {
    return this._markdownIt
  }

  dispose(): void {
    this._markdownIt = undefined
    this._currentDocument = undefined
  }
}
