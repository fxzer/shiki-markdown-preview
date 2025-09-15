import * as vscode from 'vscode';
import { createHighlighter, type Highlighter } from 'shiki';
import MarkdownIt from 'markdown-it';
import { escapeHtml, getNonce } from './utils';
import { ScrollSyncManager } from './scroll-sync-manager';
import { ThemeProvider  } from './theme-provider';

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
  private _themeProvider: ThemeProvider | undefined;
  private _stateSaveInterval: NodeJS.Timeout | undefined;

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

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri, document);
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
      
      // 启动定期状态保存
      this.startPeriodicStateSave();
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
      
      // 初始化主题颜色提取器
      if (this._highlighter) {
        this._themeProvider = new ThemeProvider(this._highlighter);
        // 提取当前主题的颜色配置
      }
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
          const html = this._highlighter.codeToHtml(code, {
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

    // 立即保存状态
    this.saveState();
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
      const addLineNumber = (tokens: any[], idx: number, options: any, env: any, renderer: any, ruleName: string) => {
        const token = tokens[idx];
        if (token && currentLine < lines.length) {
          // Find the corresponding line in the source
          for (let i = currentLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('<!--')) {
              token.attrSet?.('data-line', i.toString());
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
    if (!this._currentDocument) {
      return null;
    }

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
   * 切换主题
   */
  public changeTheme(theme: string): void {
    if (!AVAILABLE_THEMES.includes(theme as typeof AVAILABLE_THEMES[number])) {
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
   * 更新主题（用于预览，不保存配置）
   */
  public async updateTheme(theme: string): Promise<void> {
    if (!AVAILABLE_THEMES.includes(theme as typeof AVAILABLE_THEMES[number])) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    this._currentTheme = theme;


    // 重新渲染内容
    if (this._currentDocument) {
      this.updateContent(this._currentDocument);
    }
  }


  /**
   * 启动定期状态保存
   */
  private startPeriodicStateSave(): void {
    // 清除之前的定时器
    if (this._stateSaveInterval) {
      clearInterval(this._stateSaveInterval);
    }

    // 每5秒保存一次状态
    this._stateSaveInterval = setInterval(() => {
      this.saveState();
    }, 5000);

    // 立即保存一次状态
    this.saveState();
  }

  /**
   * 保存当前状态到 webview
   */
  private saveState(): void {
    if (this._currentDocument) {
      const state = {
        documentUri: this._currentDocument.uri.toString(),
        theme: this._currentTheme,
        timestamp: Date.now()
      };

      this._panel.webview.postMessage({
        command: 'saveState',
        state: state
      });

      console.log('State saved:', state);
    }
  }

  /**
   * 停止定期状态保存
   */
  private stopPeriodicStateSave(): void {
    if (this._stateSaveInterval) {
      clearInterval(this._stateSaveInterval);
      this._stateSaveInterval = undefined;
    }
  }

  public dispose() {
    MarkdownPreviewPanel.currentPanel = undefined;

    // 停止定期状态保存
    this.stopPeriodicStateSave();

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
      this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, '<div style="text-align: center; padding: 50px; color: var(--vscode-descriptionForeground);"><p>No document selected</p><p style="font-size: 14px; margin-top: 10px;">Open a Markdown file to see the preview</p></div>');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, content: string) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const webviewCssPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.css');

    const webviewCssUri = webview.asWebviewUri(webviewCssPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    // 生成主题颜色CSS变量
    const themeCSSVariables = this._themeProvider?.getCssVars(this._currentTheme) || {};

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${webviewCssUri}" rel="stylesheet">
                <style>
                    :root {
                        ${themeCSSVariables}
                    }
                </style>
                <title>Markdown Preview</title>
            </head>
            <body>
                <div class="markdown-body" id="markdown-content">
                    ${content}
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    // 使用全局的 vscode 实例，避免重复获取 API
                    let vscode;
                    if (window.vscode) {
                        vscode = window.vscode;
                    } else {
                        try {
                            vscode = acquireVsCodeApi();
                            window.vscode = vscode;
                        } catch (error) {
                            console.error('Failed to acquire VS Code API in inline script:', error);
                            vscode = {
                                postMessage: () => {},
                                setState: () => {},
                                getState: () => null
                            };
                        }
                    }
                    
                    // 监听来自扩展的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'saveState':
                                // 保存状态到 webview
                                vscode.setState(message.state || {
                                    documentUri: message.documentUri
                                });
                                break;
                        }
                    });
                    
                    // 页面加载完成后发送 ready 消息
                    window.addEventListener('load', () => {
                        vscode.postMessage({ command: 'webviewReady' });
                    });
                </script>
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

