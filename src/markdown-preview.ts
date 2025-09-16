import * as vscode from 'vscode'

import { ScrollSyncManager } from './scroll-sync-manager'
import {
  HTMLTemplateService,
  MarkdownRenderer,
  StateManager,
  ThemeService,
} from './services'

// 添加日志记录器
const logger = {
  info: (message: string, ...args: any[]) => console.warn(`[MarkdownPreview] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[MarkdownPreview] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[MarkdownPreview] ${message}`, ...args),
}

/**
 * Manages markdown preview webview panels
 */
export class MarkdownPreviewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: MarkdownPreviewPanel | undefined

  public static readonly viewType = 'shiki-markdown-preview'

  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []

  // 服务
  private _themeService: ThemeService
  private _markdownRenderer: MarkdownRenderer
  private _scrollSyncManager: ScrollSyncManager
  private _stateManager: StateManager

  // 状态
  private _currentDocument: vscode.TextDocument | undefined
  private _isInitialized: boolean = false

  public static createOrShow(extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two)
      if (document) {
        MarkdownPreviewPanel.currentPanel.updateContent(document).catch((error) => {
          console.error('Error updating content on createOrShow:', error)
        })
      }
      return
    }

    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      'Markdown Preview',
      vscode.ViewColumn.Two,
      HTMLTemplateService.getWebviewOptions(extensionUri),
    )

    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri, document)
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri, document)
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._currentDocument = document

    // 初始化服务
    this._themeService = new ThemeService()
    this._markdownRenderer = new MarkdownRenderer(this._themeService)
    this._scrollSyncManager = new ScrollSyncManager()
    this._stateManager = new StateManager(panel)

    this.setupPanel()
    this.setupEventListeners()
    this.initializeServices()
  }

  /**
   * Set up panel configuration
   */
  private setupPanel(): void {
    // 设置面板图标
    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media/preview-icon.svg')

    // 设置滚动同步管理器
    this._scrollSyncManager.setPanel(this._panel)
    if (this._currentDocument) {
      this._scrollSyncManager.setupScrollSync(this._currentDocument)
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // 监听面板被释放时的事件
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // 根据视图变化更新内容
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible && this._currentDocument) {
          this.updateContent(this._currentDocument).catch((error) => {
            console.error('Error updating content on view state change:', error)
          })
        }
      },
      null,
      this._disposables,
    )

    // 处理来自 webview 的消息
    this._panel.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message),
      null,
      this._disposables,
    )
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    try {
      // 初始化主题服务
      await this._themeService.initializeHighlighter()

      // 初始化 markdown 渲染器
      this._markdownRenderer.initialize()

      this._isInitialized = true

      // 设置初始内容
      if (this._currentDocument) {
        await this.updateContent(this._currentDocument)
      }
      else {
        await this.updatePanelContent()
      }

      // 开始定期状态保存
      this._stateManager.startPeriodicStateSave()
    }
    catch (error) {
      console.error('Failed to initialize services:', error)
      this.showError('Failed to initialize preview services').catch((err) => {
        console.error('Error showing initialization error:', err)
      })
    }
  }

  /**
   * 验证和规范化文件路径，防止路径遍历攻击
   * @param basePath 基础路径
   * @param relativePath 相对路径
   * @returns 规范化后的安全路径，如果路径不安全则返回 null
   */
  private validateAndResolvePath(basePath: vscode.Uri, relativePath: string): vscode.Uri | null {
    try {
      // 解码 URL 编码的字符
      const decodedPath = decodeURIComponent(relativePath)

      // 检查路径是否包含可疑字符
      if (decodedPath.includes('..') || decodedPath.includes('~') || decodedPath.startsWith('/')) {
        logger.warn(`检测到潜在的路径遍历攻击: ${relativePath}`)
        return null
      }

      // 检查路径是否包含非法字符（Windows 和 Unix）
      // eslint-disable-next-line no-control-regex
      const illegalChars = /[<>:"|?*\u0000-\u001F]/
      if (illegalChars.test(decodedPath)) {
        logger.warn(`路径包含非法字符: ${relativePath}`)
        return null
      }

      // 检查文件扩展名，只允许安全的文件类型
      const allowedExtensions = ['.md', '.markdown', '.txt', '.json', '.yaml', '.yml', '.xml', '.csv']
      const fileExtension = decodedPath.toLowerCase().substring(decodedPath.lastIndexOf('.'))
      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        logger.warn(`不允许的文件扩展名: ${fileExtension}`)
        return null
      }

      // 解析相对路径
      const resolvedPath = vscode.Uri.joinPath(basePath, decodedPath)

      // 规范化路径并检查是否仍在基础路径下
      const normalizedBasePath = basePath.fsPath.replace(/[/\\]+$/, '')
      const normalizedResolvedPath = resolvedPath.fsPath.replace(/[/\\]+$/, '')

      // 确保解析后的路径仍然在基础路径下
      if (!normalizedResolvedPath.startsWith(normalizedBasePath)) {
        logger.warn(`路径遍历尝试检测: ${relativePath} 解析为 ${normalizedResolvedPath}`)
        return null
      }

      return resolvedPath
    }
    catch (error) {
      logger.error(`路径验证失败: ${relativePath}`, error)
      return null
    }
  }

  // 处理相对路径文件点击
  private async handleRelativeFileClick(filePath: string) {
    try {
      const currentDocument = this._currentDocument
      if (!currentDocument) {
        // 只有在面板仍然有效时才显示错误消息
        if (this._panel) {
          vscode.window.showErrorMessage('无法获取当前文档信息')
        }
        else {
          logger.info('面板已销毁，跳过文档信息错误消息显示')
        }
        return
      }

      // 解析相对路径
      const currentFileUri = vscode.Uri.file(currentDocument.fileName)
      const currentDir = vscode.Uri.joinPath(currentFileUri, '..')

      // 验证和解析路径
      const targetFile = this.validateAndResolvePath(currentDir, filePath)
      if (!targetFile) {
        if (this._panel) {
          vscode.window.showErrorMessage(`无效或不安全的文件路径: ${filePath}`)
        }
        return
      }

      // 检查文件是否存在
      try {
        await vscode.workspace.fs.stat(targetFile)
      }
      catch {
        // 只有在面板仍然有效时才显示错误消息
        if (this._panel) {
          vscode.window.showErrorMessage(`文件不存在: ${filePath}`)
        }
        else {
          logger.info('面板已销毁，跳过文件不存在错误消息显示')
        }
        return
      }

      // 直接在编辑区打开文件，而不是在WebView中更新内容
      const document = await vscode.workspace.openTextDocument(targetFile)
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One)

      // 注意：不再调用 switchToDocument，避免WebView竞态条件
      // 用户可以在编辑区查看文档，如果需要预览可以手动触发

      logger.info(`已打开相对路径文件: ${filePath}`)
    }
    catch (error) {
      logger.error('处理相对路径文件点击时出错:', error)

      // 只有在面板仍然有效时才显示错误消息
      if (this._panel) {
        vscode.window.showErrorMessage(`无法打开文件: ${filePath}`)
      }
      else {
        logger.info('面板已销毁，跳过文件打开错误消息显示')
      }
    }
  }

  /**
   * Handle messages from the webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'alert':
        vscode.window.showErrorMessage(message.text)
        return

      case 'scroll':
      case 'scrollToPercentage':
        this.handleScrollMessage(message)
        return

      case 'selectTheme':
        this.handleThemeSelection(message.theme)
        return

      case 'cancelThemeSelection':
        this.handleThemeSelectionCancel()
        return
      case 'openExternal':
        vscode.env.openExternal(vscode.Uri.parse(message.url))
        return

      case 'openRelativeFile':
        this.handleRelativeFileClick(message.filePath)
        break
    }
  }

  /**
   * Handle scroll messages from webview
   */
  private handleScrollMessage(message: any): void {
    const scrollPercentage = message.scrollPercentage || message.percentage

    this._scrollSyncManager.handlePreviewScroll(
      scrollPercentage,
      message.source,
      message.timestamp,
    )
  }

  /**
   * Handle theme selection
   */
  private async handleThemeSelection(theme: string): Promise<void> {
    const success = await this._themeService.changeTheme(theme)
    if (success && this._currentDocument) {
      await this.updateContent(this._currentDocument)
    }
  }

  /**
   * Handle theme selection cancellation
   */
  private handleThemeSelectionCancel(): void {
    if (this._currentDocument) {
      this.updateContent(this._currentDocument).catch((error) => {
        console.error('Error updating content after theme selection cancel:', error)
      })
    }
  }

  /**
   * Update content with a new document
   */
  public async updateContent(document: vscode.TextDocument): Promise<void> {
    if (!this._isInitialized) {
      console.warn('Preview panel not initialized yet')
      return
    }

    this._currentDocument = document

    // 更新滚动同步管理器
    this._scrollSyncManager.setupScrollSync(document)

    try {
      const content = document.getText()

      // 获取 front matter 数据
      const frontMatterData = this._markdownRenderer.getFrontMatterData(content)
      const renderedContent = this._markdownRenderer.render(content, document)

      // 为 webview 解析相对路径
      const processedContent = this.processContentForWebview(renderedContent)

      // 等待主题 CSS 变量
      const themeCSSVariables = await this._themeService.getThemeCSSVariables()

      this._panel.webview.html = HTMLTemplateService.generateHTML({
        webview: this._panel.webview,
        extensionUri: this._extensionUri,
        content: processedContent,
        themeCSSVariables,
        frontMatterData, // 传递 front matter 数据
      })

      // 更新面板标题 - 优先使用 front matter 中的 title
      const fileName = document.fileName.split('/').pop() || 'Untitled'
      const title = frontMatterData?.title || fileName
      this._panel.title = title

      // 保存状态
      this._stateManager.saveState(document, this._themeService.currentTheme)
    }
    catch (error) {
      console.error('Error updating content:', error)
      this.showError(`Error updating preview: ${error instanceof Error ? error.message : String(error)}`).catch((err) => {
        console.error('Error showing error message:', err)
      })
    }
  }

  /**
   * Process content for webview (resolve relative paths)
   */
  private processContentForWebview(content: string): string {
    if (!this._currentDocument) {
      return content
    }

    // 解析内容中的相对路径
    // 这是一个简化版本 - 在实际实现中，
    // 您可能希望使用更复杂的 HTML 解析器
    return content.replace(
      /(src|href)="([^"]+)"/g,
      (match, attr, path) => {
        if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('vscode-webview-resource:')) {
          return match
        }

        // 对于锚点链接（以#开头），保持原样，不进行任何处理
        if (attr === 'href' && path.startsWith('#')) {
          return match
        }

        // 对于 .md 文件的链接，保持相对路径，不转换为webview URI
        if (attr === 'href' && path.endsWith('.md')) {
          return match
        }

        try {
          const documentDir = vscode.Uri.joinPath(this._currentDocument!.uri, '..')
          const resolvedUri = vscode.Uri.joinPath(documentDir, path)
          const webviewUri = this._panel.webview.asWebviewUri(resolvedUri).toString()
          return `${attr}="${webviewUri}"`
        }
        catch (error) {
          console.warn(`Failed to resolve path: ${path}`, error)
          return match
        }
      },
    )
  }

  /**
   * Update panel content when no document is available
   */
  private async updatePanelContent(): Promise<void> {
    const content = HTMLTemplateService.generateNoDocumentContent()
    const themeCSSVariables = await this._themeService.getThemeCSSVariables()

    this._panel.webview.html = HTMLTemplateService.generateHTML({
      webview: this._panel.webview,
      extensionUri: this._extensionUri,
      content,
      themeCSSVariables,
    })
  }

  /**
   * Show error message in the panel
   */
  private async showError(message: string): Promise<void> {
    const content = HTMLTemplateService.generateErrorContent(message)
    const themeCSSVariables = await this._themeService.getThemeCSSVariables()

    this._panel.webview.html = HTMLTemplateService.generateHTML({
      webview: this._panel.webview,
      extensionUri: this._extensionUri,
      content,
      themeCSSVariables,
    })
  }

  /**
   * Dispose of the panel and services
   */
  public dispose(): void {
    MarkdownPreviewPanel.currentPanel = undefined

    // 停止定期状态保存
    this._stateManager.dispose()

    // 清理滚动同步管理器
    this._scrollSyncManager.dispose()

    // 清理服务
    this._themeService.dispose()
    this._markdownRenderer.dispose()

    // 清理面板
    this._panel.dispose()

    // 清理可释放资源
    while (this._disposables.length) {
      const disposable = this._disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }

  /**
   * Get the current document
   */
  get currentDocument(): vscode.TextDocument | undefined {
    return this._currentDocument
  }

  /**
   * Get the panel
   */
  get panel(): vscode.WebviewPanel {
    return this._panel
  }

  /**
   * Get the theme service
   */
  get themeService(): ThemeService {
    return this._themeService
  }
}
