import * as vscode from 'vscode';
import { createHighlighter, type Highlighter } from 'shiki';
import MarkdownIt from 'markdown-it';
import { escapeHtml, getNonce } from './utils';
import { ScrollSyncManager } from './scroll-sync-manager';

// 所有可用的 Shiki 主题
const AVAILABLE_THEMES = [
  "catppuccin-latte",
  "everforest-light",
  "github-light",
  "github-light-default",
  "github-light-high-contrast",
  "gruvbox-light-hard",
  "gruvbox-light-medium",
  "gruvbox-light-soft",
  "kanagawa-lotus",
  "light-plus",
  "material-theme-lighter",
  "min-light",
  "one-light",
  "rose-pine-dawn",
  "slack-ochin",
  "snazzy-light",
  "solarized-light",
  "vitesse-light",
  "andromeeda",
  "aurora-x",
  "ayu-dark",
  "catppuccin-frappe",
  "catppuccin-macchiato",
  "catppuccin-mocha",
  "dark-plus",
  "dracula",
  "dracula-soft",
  "everforest-dark",
  "github-dark",
  "github-dark-default",
  "github-dark-dimmed",
  "github-dark-high-contrast",
  "gruvbox-dark-hard",
  "gruvbox-dark-medium",
  "gruvbox-dark-soft",
  "houston",
  "kanagawa-dragon",
  "kanagawa-wave",
  "laserwave",
  "material-theme",
  "material-theme-darker",
  "material-theme-ocean",
  "material-theme-palenight",
  "min-dark",
  "monokai",
  "night-owl",
  "nord",
  "one-dark-pro",
  "plastic",
  "poimandres",
  "red",
  "rose-pine",
  "rose-pine-moon",
  "slack-dark",
  "solarized-dark",
  "synthwave-84",
  "tokyo-night",
  "vesper",
  "vitesse-black",
  "vitesse-dark"
] as const;

/**
 * Manages markdown preview webview panels
 */
export class MarkdownPreviewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: MarkdownPreviewPanel | undefined;

  public static readonly viewType = 'shiki-markdown-preview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentDocument: vscode.TextDocument | undefined;
  private _highlighter: Highlighter | undefined;
  private _markdownIt: MarkdownIt | undefined;
  private _scrollSyncManager: ScrollSyncManager;
  private _currentTheme: string;

  public static createOrShow(extensionUri: vscode.Uri, document?: vscode.TextDocument) {

    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      if (document) {
        MarkdownPreviewPanel.currentPanel.updateContent(document);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      'Markdown Preview',
      vscode.ViewColumn.Two,
      getWebviewOptions(extensionUri),
    );
    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri, document);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._currentDocument = document;
    this._scrollSyncManager = new ScrollSyncManager();
    
    // 从配置中获取当前主题
    const config = vscode.workspace.getConfiguration('shiki-markdown-preview');
    this._currentTheme = config.get('currentTheme', 'vitesse-dark');



    panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'preview-icon.svg');


    // 设置滚动同步管理器
    this._scrollSyncManager.setPanel(this._panel);
    if (document) {
      this._scrollSyncManager.setupScrollSync(document);
    }

    this.initializeComponents().then(() => {
      // Set the webview's initial html content after initialization
      if (document) {
        this.updateContent(document);
      } else {
        this._update();
      }
    });

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible && this._currentDocument) {
          this.updateContent(this._currentDocument);
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
          case 'scroll':
          case 'scrollToPercentage':
            // Handle percentage-based scroll sync from webview
            {
              const scrollPercentage = message.scrollPercentage || message.percentage;
              console.log(`Extension received scroll message: ${(scrollPercentage * 100).toFixed(1)}% from ${message.source}`);
              this._scrollSyncManager.handlePreviewScroll(
                scrollPercentage,
                message.source,
                message.timestamp
              );
              return;
            }
          case 'selectTheme':
            // Handle theme selection
            this.changeTheme(message.theme);
            return;
          case 'cancelThemeSelection':
            // Handle theme selection cancellation
            if (this._currentDocument) {
              this.updateContent(this._currentDocument);
            }
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private async initializeComponents(): Promise<void> {
    await this.initializeHighlighter();
    this.initializeMarkdownIt();
  }

  private async initializeHighlighter(): Promise<void> {
    try {
      this._highlighter = await createHighlighter({
        themes: [...AVAILABLE_THEMES],
        langs: ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'markdown']
      });
    } catch (error) {
      console.error('Failed to initialize highlighter:', error);
    }
  }

  private initializeMarkdownIt() {
    // Initialize markdown-it with optimized settings
    this._markdownIt = new MarkdownIt({
      html: true,
      xhtmlOut: true,
      breaks: false,
      linkify: true,
      typographer: true,
      highlight: (code: string, lang: string) => {
        if (!lang || !this._highlighter) {
          return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }

        try {
          const html = (this._highlighter as any).codeToHtml(code, {
            lang: lang,
            theme: this._currentTheme
          });
          return html;
        } catch (error) {
          console.warn(`Failed to highlight code for language: ${lang}`, error);
          return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`;
        }
      }
    });

    // Add custom rule for handling relative paths
    this._markdownIt.renderer.rules.image = (tokens, idx, options, env, renderer) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');

      if (srcIndex >= 0 && token.attrs && token.attrs[srcIndex]) {
        const href = token.attrs[srcIndex][1];
        if (!href.startsWith('http') && !href.startsWith('data:')) {
          const resolvedUri = this.resolveRelativePath(href);
          if (resolvedUri) {
            token.attrs[srcIndex][1] = resolvedUri;
          }
        }
      }

      return renderer.renderToken(tokens, idx, options);
    };

    this._markdownIt.renderer.rules.link_open = (tokens, idx, options, env, renderer) => {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex('href');

      if (hrefIndex >= 0 && token.attrs && token.attrs[hrefIndex]) {
        const href = token.attrs[hrefIndex][1];
        if (!href.startsWith('http') && !href.startsWith('#') && !href.startsWith('data:')) {
          const resolvedUri = this.resolveRelativePath(href);
          if (resolvedUri) {
            token.attrs[hrefIndex][1] = resolvedUri;
          }
        }
      }

      return renderer.renderToken(tokens, idx, options);
    };
  }

  public updateContent(document: vscode.TextDocument) {
    this._currentDocument = document;

    // 更新滚动同步管理器
    this._scrollSyncManager.setupScrollSync(document);

    const content = document.getText();
    const html = this.renderMarkdown(content);
    this._panel.webview.html = html;
    const fileName = document.fileName.split('/').pop() || 'Untitled';
    this._panel.title = fileName;
  }

  private renderMarkdown(content: string): string {
    try {
      if (!this._markdownIt) {
        return this._getHtmlForWebview(this._panel.webview, '<p>Markdown parser not initialized</p>');
      }

      // Add line number tracking to markdown rendering
      const lines = content.split('\n');
      let currentLine = 0;

      // Custom renderer that adds line number attributes
      const originalRules = {
        heading_open: this._markdownIt.renderer.rules.heading_open,
        paragraph_open: this._markdownIt.renderer.rules.paragraph_open,
        list_item_open: this._markdownIt.renderer.rules.list_item_open,
        blockquote_open: this._markdownIt.renderer.rules.blockquote_open,
        code_block: this._markdownIt.renderer.rules.code_block,
        fence: this._markdownIt.renderer.rules.fence,
        table_open: this._markdownIt.renderer.rules.table_open,
        hr: this._markdownIt.renderer.rules.hr
      };

      // Add line number tracking to block elements
      const addLineNumber = (tokens: any, idx: number, options: any, env: any, renderer: any, ruleName: string) => {
        const token = tokens[idx];
        if (token && currentLine < lines.length) {
          // Find the corresponding line in the source
          for (let i = currentLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('<!--')) {
              token.attrSet('data-line', i.toString());
              currentLine = i + 1;
              break;
            }
          }
        }

        return originalRules[ruleName as keyof typeof originalRules] ?
          originalRules[ruleName as keyof typeof originalRules]!(tokens, idx, options, env, renderer) :
          renderer.renderToken(tokens, idx, options);
      };

      // Override renderer rules to add line numbers
      this._markdownIt.renderer.rules.heading_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'heading_open');

      this._markdownIt.renderer.rules.paragraph_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'paragraph_open');

      this._markdownIt.renderer.rules.list_item_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'list_item_open');

      this._markdownIt.renderer.rules.blockquote_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'blockquote_open');

      this._markdownIt.renderer.rules.code_block = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'code_block');

      this._markdownIt.renderer.rules.fence = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'fence');

      this._markdownIt.renderer.rules.table_open = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'table_open');

      this._markdownIt.renderer.rules.hr = (tokens, idx, options, env, renderer) =>
        addLineNumber(tokens, idx, options, env, renderer, 'hr');

      const html = this._markdownIt.render(content);
      return this._getHtmlForWebview(this._panel.webview, html);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this._getHtmlForWebview(this._panel.webview, `<p>Error rendering markdown: ${errorMessage}</p>`);
    }
  }


  private resolveRelativePath(href: string): string | null {
    if (!this._currentDocument) return null;

    try {
      // Get the directory of the current markdown file
      const documentDir = vscode.Uri.joinPath(this._currentDocument.uri, '..');

      // Resolve the relative path
      const resolvedUri = vscode.Uri.joinPath(documentDir, href);

      // Convert to webview URI
      return this._panel.webview.asWebviewUri(resolvedUri).toString();
    } catch (error) {
      console.warn(`Failed to resolve relative path: ${href}`, error);
      return null;
    }
  }


  /**
   * 显示主题选择器
   */
  public showThemeSelector(): void {
    const currentIndex = AVAILABLE_THEMES.indexOf(this._currentTheme as any);
    if (currentIndex === -1) {
      vscode.window.showErrorMessage('Current theme not found in available themes');
      return;
    }

    // 创建主题选择器 HTML
    const themeSelectorHtml = this._createThemeSelectorHtml(currentIndex);
    
    // 显示主题选择器
    this._panel.webview.html = themeSelectorHtml;
  }

  /**
   * 切换主题
   */
  public changeTheme(theme: string): void {
    if (!AVAILABLE_THEMES.includes(theme as any)) {
      vscode.window.showErrorMessage(`Invalid theme: ${theme}`);
      return;
    }

    this._currentTheme = theme;
    
    // 更新配置
    const config = vscode.workspace.getConfiguration('shiki-markdown-preview');
    config.update('currentTheme', theme, vscode.ConfigurationTarget.Global);

    // 重新渲染内容
    if (this._currentDocument) {
      this.updateContent(this._currentDocument);
    }
  }

  /**
   * 创建主题选择器 HTML
   */
  private _createThemeSelectorHtml(selectedIndex: number): string {
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
    const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);
    
    const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
    const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
    const markdownCssPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'markdown.css');
    
    const stylesResetUri = this._panel.webview.asWebviewUri(styleResetPath);
    const stylesMainUri = this._panel.webview.asWebviewUri(stylesPathMainPath);
    const markdownCssUri = this._panel.webview.asWebviewUri(markdownCssPath);
    
    const nonce = getNonce();

    // 创建主题选项 HTML
    const themeOptions = AVAILABLE_THEMES.map((theme, index) => {
      const isSelected = index === selectedIndex;
      const isLight = this._isLightTheme(theme);
      return `
        <div class="theme-option ${isSelected ? 'selected' : ''}" data-theme="${theme}" data-index="${index}">
          <div class="theme-preview ${isLight ? 'light' : 'dark'}">
            <div class="preview-code">
              <span class="keyword">function</span> <span class="function">hello</span>() {
                <span class="string">"Hello, World!"</span>
              }
            </div>
          </div>
          <div class="theme-name">${theme}</div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; img-src ${this._panel.webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesResetUri}" rel="stylesheet">
                <link href="${stylesMainUri}" rel="stylesheet">
                <link href="${markdownCssUri}" rel="stylesheet">
                <title>Select Theme</title>
                <style>
                    .theme-selector {
                        padding: 20px;
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .theme-selector h1 {
                        text-align: center;
                        margin-bottom: 30px;
                        color: var(--vscode-editor-foreground);
                    }
                    .theme-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .theme-option {
                        border: 2px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 15px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--vscode-editor-background);
                    }
                    .theme-option:hover {
                        border-color: var(--vscode-focusBorder);
                        transform: translateY(-2px);
                    }
                    .theme-option.selected {
                        border-color: var(--vscode-focusBorder);
                        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                    }
                    .theme-preview {
                        border-radius: 4px;
                        padding: 12px;
                        margin-bottom: 10px;
                        font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, monospace;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .theme-preview.light {
                        background: #f6f8fa;
                        color: #24292e;
                    }
                    .theme-preview.dark {
                        background: #0d1117;
                        color: #e6edf3;
                    }
                    .preview-code .keyword { color: #d73a49; }
                    .preview-code .function { color: #6f42c1; }
                    .preview-code .string { color: #032f62; }
                    .theme-preview.dark .preview-code .keyword { color: #ff7b72; }
                    .theme-preview.dark .preview-code .function { color: #d2a8ff; }
                    .theme-preview.dark .preview-code .string { color: #a5d6ff; }
                    .theme-name {
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                        text-align: center;
                    }
                    .instructions {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 20px;
                    }
                    .current-theme {
                        text-align: center;
                        margin-bottom: 20px;
                        padding: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="theme-selector">
                    <h1>Select Shiki Theme</h1>
                    <div class="instructions">
                        Use <strong>Arrow Keys</strong> to navigate • <strong>Enter</strong> to select • <strong>Esc</strong> to cancel
                    </div>
                    <div class="current-theme">
                        Current Theme: <strong>${this._currentTheme}</strong>
                    </div>
                    <div class="theme-grid" id="theme-grid">
                        ${themeOptions}
                    </div>
                </div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentIndex = ${selectedIndex};
                    const themeOptions = document.querySelectorAll('.theme-option');
                    
                    function updateSelection() {
                        themeOptions.forEach((option, index) => {
                            option.classList.toggle('selected', index === currentIndex);
                        });
                    }
                    
                    function selectTheme() {
                        const selectedOption = themeOptions[currentIndex];
                        const theme = selectedOption.dataset.theme;
                        vscode.postMessage({
                            command: 'selectTheme',
                            theme: theme
                        });
                    }
                    
                    function cancelSelection() {
                        vscode.postMessage({
                            command: 'cancelThemeSelection'
                        });
                    }
                    
                    document.addEventListener('keydown', (e) => {
                        switch(e.key) {
                            case 'ArrowUp':
                                e.preventDefault();
                                currentIndex = Math.max(0, currentIndex - Math.ceil(themeOptions.length / Math.ceil(themeOptions.length / 4)));
                                updateSelection();
                                break;
                            case 'ArrowDown':
                                e.preventDefault();
                                currentIndex = Math.min(themeOptions.length - 1, currentIndex + Math.ceil(themeOptions.length / Math.ceil(themeOptions.length / 4)));
                                updateSelection();
                                break;
                            case 'ArrowLeft':
                                e.preventDefault();
                                currentIndex = Math.max(0, currentIndex - 1);
                                updateSelection();
                                break;
                            case 'ArrowRight':
                                e.preventDefault();
                                currentIndex = Math.min(themeOptions.length - 1, currentIndex + 1);
                                updateSelection();
                                break;
                            case 'Enter':
                                e.preventDefault();
                                selectTheme();
                                break;
                            case 'Escape':
                                e.preventDefault();
                                cancelSelection();
                                break;
                        }
                    });
                    
                    // 点击选择主题
                    themeOptions.forEach((option, index) => {
                        option.addEventListener('click', () => {
                            currentIndex = index;
                            updateSelection();
                            selectTheme();
                        });
                    });
                    
                    // 初始化选择
                    updateSelection();
                </script>
            </body>
            </html>`;
  }

  /**
   * 判断是否为浅色主题
   */
  private _isLightTheme(theme: string): boolean {
    const lightThemes = [
      'catppuccin-latte', 'everforest-light', 'github-light', 'github-light-default',
      'github-light-high-contrast', 'gruvbox-light-hard', 'gruvbox-light-medium',
      'gruvbox-light-soft', 'kanagawa-lotus', 'light-plus', 'material-theme-lighter',
      'min-light', 'one-light', 'rose-pine-dawn', 'slack-ochin', 'snazzy-light',
      'solarized-light', 'vitesse-light'
    ];
    return lightThemes.includes(theme);
  }

  public dispose() {
    MarkdownPreviewPanel.currentPanel = undefined;

    // 清理滚动同步管理器
    this._scrollSyncManager.dispose();

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    if (this._currentDocument) {
      this.updateContent(this._currentDocument);
    } else {
      this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, '<p>No document selected</p>');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, content: string) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
    const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
    const markdownCssPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'markdown.css');

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
    const markdownCssUri = webview.asWebviewUri(markdownCssPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesResetUri}" rel="stylesheet">
                <link href="${stylesMainUri}" rel="stylesheet">
                <link href="${markdownCssUri}" rel="stylesheet">
                <title>Markdown Preview</title>
            </head>
            <body>
                <div class="markdown-body" id="markdown-content">
                    ${content}
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, 'media'),
      vscode.Uri.joinPath(extensionUri, 'node_modules')
    ]
  };
}

