import * as vscode from 'vscode';
import { createHighlighter } from 'shiki';
import MarkdownIt from 'markdown-it';

/**
 * Manages markdown preview webview panels
 */
export class MarkdownPreviewPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: MarkdownPreviewPanel | undefined;

    public static readonly viewType = 'markdownPreview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentDocument: vscode.TextDocument | undefined;
    private _highlighter: any;
    private _markdownIt: MarkdownIt | undefined;

    public static createOrShow(extensionUri: vscode.Uri, document?: vscode.TextDocument) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (MarkdownPreviewPanel.currentPanel) {
            MarkdownPreviewPanel.currentPanel._panel.reveal(column);
            if (document) {
                MarkdownPreviewPanel.currentPanel.updateContent(document);
            }
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            MarkdownPreviewPanel.viewType,
            'Markdown Preview',
            column || vscode.ViewColumn.Beside,
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

        // Initialize components asynchronously
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
                        // Handle scroll sync from webview
                        this.syncEditorScroll(message.line);
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
                themes: ['github-dark', 'github-light'],
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
                    return `<pre><code>${this.escapeHtml(code)}</code></pre>`;
                }

                try {
                    const html = (this._highlighter as any).codeToHtml(code, {
                        lang: lang,
                        theme: 'github-dark'
                    });
                    return html;
                } catch (error) {
                    console.warn(`Failed to highlight code for language: ${lang}`, error);
                    return `<pre><code class="language-${this.escapeHtml(lang)}">${this.escapeHtml(code)}</code></pre>`;
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
        const content = document.getText();
        const html = this.renderMarkdown(content);
        this._panel.webview.html = html;
        this._panel.title = `Preview: ${document.fileName}`;
    }

    private renderMarkdown(content: string): string {
        try {
            if (!this._markdownIt) {
                return this._getHtmlForWebview(this._panel.webview, '<p>Markdown parser not initialized</p>');
            }

            const html = this._markdownIt.render(content);
            return this._getHtmlForWebview(this._panel.webview, html);
        } catch (error) {
            console.error('Error rendering markdown:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return this._getHtmlForWebview(this._panel.webview, `<p>Error rendering markdown: ${errorMessage}</p>`);
        }
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
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

    private syncEditorScroll(line: number) {
        if (!this._currentDocument) return;

        const editor = vscode.window.visibleTextEditors.find(e => e.document === this._currentDocument);
        if (editor) {
            const position = new vscode.Position(line, 0);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
        }
    }

    public syncScroll(line: number, percentage: number) {
        this._panel.webview.postMessage({
            command: 'syncScroll',
            line: line,
            percentage: percentage
        });
    }

    public dispose() {
        MarkdownPreviewPanel.currentPanel = undefined;

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
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'markdownPreview.js');

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

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}