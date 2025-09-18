import * as vscode from 'vscode'
import { escapeHtml, getNonce } from '../utils'

export interface HTMLTemplateOptions {
  webview: vscode.Webview
  extensionUri: vscode.Uri
  content: string
  themeCSSVariables?: string
  frontMatterData?: any
  nonce?: string
  markdownThemeType?: 'light' | 'dark'
  documentWidth?: string
}

export class HTMLTemplateService {
  /**
   * Generate HTML for the webview
   */
  static generateHTML(options: HTMLTemplateOptions): string {
    const {
      webview,
      extensionUri,
      content,
      themeCSSVariables = '',
      frontMatterData = {},
      nonce = getNonce(),
      markdownThemeType = 'dark',
      documentWidth = '800px',
    } = options

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src/webview/index.js'))
    const webviewCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src/webview/style.css'))

    return `<!DOCTYPE html>
            <html lang="en" data-markdown-theme-type="${markdownThemeType}">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' https://unpkg.com; connect-src https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${webviewCssUri}" rel="stylesheet">
                <script nonce="${nonce}" src="https://unpkg.com/throttle-debounce@5.0.2/dist/index.umd.js"></script>
                <style>
                    :root {
                        ${themeCSSVariables}
                        --document-width: ${documentWidth};
                    }
                </style>
                <title>${frontMatterData?.title ? escapeHtml(frontMatterData.title) : 'Markdown Preview'}</title>
            </head>
            <body>
                <div class="container" id="markdown-content">
                    ${content}
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    // 将 front matter 数据存储到全局变量中
                    window.frontMatterData = ${JSON.stringify(frontMatterData)};
                    
                    // 初始化 VS Code API
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
                    
                    // Listen for messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'saveState':
                                // Save state to webview
                                vscode.setState(message.state || {
                                    documentUri: message.documentUri
                                });
                                break;
                        }
                    });
                    
                    // Send ready message when page loads
                    window.addEventListener('load', () => {
                        vscode.postMessage({ command: 'webviewReady' });
                    });
                </script>
            </body>
            </html>`
  }

  /**
   * Generate error HTML content
   */
  static generateErrorContent(errorMessage: string): string {
    return `<p>Error rendering markdown: ${escapeHtml(errorMessage)}</p>`
  }

  /**
   * Generate no document HTML content
   */
  static generateNoDocumentContent(): string {
    return `<div style="text-align: center; padding: 50px; color: var(--vscode-descriptionForeground);">
                <p>No document selected</p>
                <p style="font-size: 14px; margin-top: 10px;">Open a Markdown file to see the preview</p>
            </div>`
  }

  /**
   * Generate webview options
   */
  static getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'src/webview'),
      ],
    }
  }
}
