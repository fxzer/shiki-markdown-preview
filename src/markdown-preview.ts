import * as vscode from 'vscode'

import { ScrollSyncManager } from './scroll-sync-manager'
import {
  HTMLTemplateService,
  MarkdownRenderer,
  StateManager,
  ThemeService,
} from './services'

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
