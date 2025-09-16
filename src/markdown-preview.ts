import * as vscode from 'vscode'

import { ScrollSyncManager } from './scroll-sync-manager'
import {
  HTMLTemplateService,
  MarkdownRenderer,
  StateManager,
  ThemeService,
} from './services'
import { ErrorHandler } from './utils/error-handler'
import { PathResolver } from './utils/path-resolver'


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
        ErrorHandler.safeExecute(
          () => MarkdownPreviewPanel.currentPanel!.updateContent(document),
          '创建或显示时内容更新失败',
          'MarkdownPreviewPanel',
        )
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
          ErrorHandler.safeExecute(
            () => this.updateContent(this._currentDocument!),
            '视图状态变化时内容更新失败',
            'MarkdownPreviewPanel',
          )
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
      ErrorHandler.logError('服务初始化失败', error, 'MarkdownPreviewPanel')
      ErrorHandler.safeExecute(
        () => this.showError('预览服务初始化失败'),
        '显示初始化错误失败',
        'MarkdownPreviewPanel',
      )
    }
  }


  // 处理相对路径文件点击
  private async handleRelativeFileClick(filePath: string) {
    const currentDocument = this._currentDocument
    if (!currentDocument) {
      if (this._panel) {
        ErrorHandler.showError('无法获取当前文档信息')
      }
      return
    }

    // 解析相对路径
    const currentFileUri = vscode.Uri.file(currentDocument.fileName)
    const currentDir = vscode.Uri.joinPath(currentFileUri, '..')

    // 验证和解析路径
    const targetFile = PathResolver.validateAndResolvePath(currentDir, filePath)
    if (!targetFile) {
      if (this._panel) {
        ErrorHandler.showError(`无效或不安全的文件路径: ${filePath}`)
      }
      return
    }

    // 检查文件是否存在
    const fileExists = await PathResolver.fileExists(targetFile)
    if (!fileExists) {
      if (this._panel) {
        ErrorHandler.showError(`文件不存在: ${filePath}`)
      }
      return
    }

    // 安全地打开文件
    const success = await PathResolver.openFileSafely(targetFile, vscode.ViewColumn.One)
    if (success) {
      ErrorHandler.logInfo(`已打开相对路径文件: ${filePath}`, 'MarkdownPreviewPanel')
    }
  }

  /**
   * Handle messages from the webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'alert':
        ErrorHandler.showError(message.text)
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
      ErrorHandler.safeExecute(
        () => this.updateContent(this._currentDocument!),
        '主题选择取消后内容更新失败',
        'MarkdownPreviewPanel',
      )
    }
  }

  /**
   * Update content with a new document
   */
  public async updateContent(document: vscode.TextDocument): Promise<void> {
    if (!this._isInitialized) {
      ErrorHandler.logWarning('预览面板尚未初始化', 'MarkdownPreviewPanel')
      return
    }

    this._currentDocument = document

    // 更新滚动同步管理器
    this._scrollSyncManager.setupScrollSync(document)

    try {
      const content = document.getText()

      // 获取 front matter 数据
      const frontMatterData = this._markdownRenderer.getFrontMatterData(content)
      const renderedContent = await this._markdownRenderer.render(content, document)

      // 为 webview 解析相对路径
      const processedContent = PathResolver.processContentForWebview(renderedContent, document, this._panel.webview)

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
      ErrorHandler.logError('内容更新失败', error, 'MarkdownPreviewPanel')
      ErrorHandler.safeExecute(
        () => this.showError(`预览更新失败: ${error instanceof Error ? error.message : String(error)}`),
        '显示错误消息失败',
        'MarkdownPreviewPanel',
      )
    }
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
