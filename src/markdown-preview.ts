import * as vscode from 'vscode'
import { MEDIA_PATHS, WEBVIEW_CONSTANTS } from './constants'
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

  public static readonly viewType = WEBVIEW_CONSTANTS.VIEW_TYPE

  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []

  // Services
  private _themeService: ThemeService
  private _markdownRenderer: MarkdownRenderer
  private _scrollSyncManager: ScrollSyncManager
  private _stateManager: StateManager

  // State
  private _currentDocument: vscode.TextDocument | undefined
  private _isInitialized: boolean = false

  public static createOrShow(extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two)
      if (document) {
        MarkdownPreviewPanel.currentPanel.updateContent(document)
      }
      return
    }

    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      WEBVIEW_CONSTANTS.TITLE,
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

    // Initialize services
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
    // Set panel icon
    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, MEDIA_PATHS.PREVIEW_ICON)

    // Set up scroll sync manager
    this._scrollSyncManager.setPanel(this._panel)
    if (this._currentDocument) {
      this._scrollSyncManager.setupScrollSync(this._currentDocument)
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Update content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible && this._currentDocument) {
          this.updateContent(this._currentDocument)
        }
      },
      null,
      this._disposables,
    )

    // Handle messages from the webview
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
      // Initialize theme service
      await this._themeService.initializeHighlighter()

      // Initialize markdown renderer
      this._markdownRenderer.initialize()

      this._isInitialized = true

      // Set initial content
      if (this._currentDocument) {
        this.updateContent(this._currentDocument)
      }
      else {
        this.updatePanelContent()
      }

      // Start periodic state saving
      this._stateManager.startPeriodicStateSave()
    }
    catch (error) {
      console.error('Failed to initialize services:', error)
      this.showError('Failed to initialize preview services')
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
    console.log(`Extension received scroll message: ${(scrollPercentage * 100).toFixed(1)}% from ${message.source}`)

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
      this.updateContent(this._currentDocument)
    }
  }

  /**
   * Handle theme selection cancellation
   */
  private handleThemeSelectionCancel(): void {
    if (this._currentDocument) {
      this.updateContent(this._currentDocument)
    }
  }

  /**
   * Update content with a new document
   */
  public updateContent(document: vscode.TextDocument): void {
    if (!this._isInitialized) {
      console.warn('Preview panel not initialized yet')
      return
    }

    this._currentDocument = document

    // Update scroll sync manager
    this._scrollSyncManager.setupScrollSync(document)

    try {
      const content = document.getText()
      const renderedContent = this._markdownRenderer.render(content, document)

      // Resolve relative paths for webview
      const processedContent = this.processContentForWebview(renderedContent)

      this._panel.webview.html = HTMLTemplateService.generateHTML({
        webview: this._panel.webview,
        extensionUri: this._extensionUri,
        content: processedContent,
        themeCSSVariables: this._themeService.getThemeCSSVariables(),
      })

      // Update panel title
      const fileName = document.fileName.split('/').pop() || 'Untitled'
      this._panel.title = fileName

      // Save state
      this._stateManager.saveState(document, this._themeService.currentTheme)
    }
    catch (error) {
      console.error('Error updating content:', error)
      this.showError(`Error updating preview: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Process content for webview (resolve relative paths)
   */
  private processContentForWebview(content: string): string {
    if (!this._currentDocument) {
      return content
    }

    // Resolve relative paths in the content
    // This is a simplified version - in a real implementation,
    // you might want to use a more sophisticated HTML parser
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
  private updatePanelContent(): void {
    const content = HTMLTemplateService.generateNoDocumentContent()

    this._panel.webview.html = HTMLTemplateService.generateHTML({
      webview: this._panel.webview,
      extensionUri: this._extensionUri,
      content,
      themeCSSVariables: this._themeService.getThemeCSSVariables(),
    })
  }

  /**
   * Show error message in the panel
   */
  private showError(message: string): void {
    const content = HTMLTemplateService.generateErrorContent(message)

    this._panel.webview.html = HTMLTemplateService.generateHTML({
      webview: this._panel.webview,
      extensionUri: this._extensionUri,
      content,
      themeCSSVariables: this._themeService.getThemeCSSVariables(),
    })
  }

  /**
   * Dispose of the panel and services
   */
  public dispose(): void {
    MarkdownPreviewPanel.currentPanel = undefined

    // Stop periodic state saving
    this._stateManager.dispose()

    // Clean up scroll sync manager
    this._scrollSyncManager.dispose()

    // Clean up services
    this._themeService.dispose()
    this._markdownRenderer.dispose()

    // Clean up panel
    this._panel.dispose()

    // Clean up disposables
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
