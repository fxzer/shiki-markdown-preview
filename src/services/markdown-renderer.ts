import type { ThemeService } from './theme-service'
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
        if (!href.startsWith('http') && !href.startsWith('#') && !href.startsWith('data:')) {
          const resolvedUri = this.resolveRelativePath(href)
          if (resolvedUri) {
            token.attrs[hrefIndex][1] = resolvedUri
          }
        }
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
      const lines = content.split('\n')
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

      return this._markdownIt.render(content)
    }
    catch (error) {
      console.error('Error rendering markdown:', error)
      throw error
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
