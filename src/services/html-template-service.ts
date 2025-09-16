import * as vscode from 'vscode'
import { escapeHtml, getNonce } from '../utils'

export interface HTMLTemplateOptions {
  webview: vscode.Webview
  extensionUri: vscode.Uri
  content: string
  themeCSSVariables?: string
  frontMatterData?: any
  nonce?: string
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
    } = options

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media/main.js'))
    const webviewCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media/webview.css'))

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
                <title>${frontMatterData?.title ? escapeHtml(frontMatterData.title) : 'Markdown Preview'}</title>
            </head>
            <body>
                <div class="markdown-body" id="markdown-content">
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
        vscode.Uri.joinPath(extensionUri, 'media'),
      ],
    }
  }
}
