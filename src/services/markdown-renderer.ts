import type { ThemeService } from './theme-service'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import * as vscode from 'vscode'
import { escapeHtml } from '../utils'

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
          const resolvedUri = this.resolveRelativePath(href)
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
          const resolvedUri = this.resolveRelativePath(href)
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
        return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`
      }

      return highlighted
    }
    catch (error) {
      console.warn(`Failed to highlight code for language: ${lang}`, error)
      return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`
    }
  }

  /**
   * Resolve relative paths in markdown content
   */
  private resolveRelativePath(href: string): string | null {
    if (!this._currentDocument) {
      return null
    }

    try {
      const documentDir = vscode.Uri.joinPath(this._currentDocument.uri, '..')

      const resolvedUri = vscode.Uri.joinPath(documentDir, href)

      return resolvedUri.toString()
    }
    catch (error) {
      console.warn(`Failed to resolve relative path: ${href}`, error)
      return null
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
    catch (error) {
      console.warn('Failed to parse front matter:', error)
      return {
        content,
        data: {},
      }
    }
  }

  /**
   * Render markdown content with line number tracking
   */
  render(content: string, document?: vscode.TextDocument): string {
    if (!this._markdownIt) {
      throw new Error('Markdown renderer not initialized')
    }

    if (document) {
      this._currentDocument = document
    }

    try {
      // 使用 gray-matter 分离 front matter 和内容
      const { content: markdownContent } = this.parseFrontMatter(content)
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
      console.error('Error rendering markdown:', error)
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

  get markdownIt(): MarkdownIt | undefined {
    return this._markdownIt
  }

  dispose(): void {
    this._markdownIt = undefined
    this._currentDocument = undefined
  }
}
