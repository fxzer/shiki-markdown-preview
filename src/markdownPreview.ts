import * as vscode from 'vscode';
import { createHighlighter } from 'shiki';
import MarkdownIt from 'markdown-it';
import { escapeHtml, getNonce } from './utils';

/**
 * Manages markdown preview webview panels
 */
export class MarkdownPreviewPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: MarkdownPreviewPanel | undefined;
    public static scrollSyncTimeout: NodeJS.Timeout | undefined;
    public static visibleRangeSyncTimeout: NodeJS.Timeout | undefined;

    public static readonly viewType = 'shiki-markdown-preview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentDocument: vscode.TextDocument | undefined;
    private _highlighter: any;
    private _markdownIt: MarkdownIt | undefined;

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



        panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'preview-icon.svg');


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
                    return `<pre><code>${escapeHtml(code)}</code></pre>`;
                }

                try {
                    const html = (this._highlighter as any).codeToHtml(code, {
                        lang: lang,
                        theme: 'github-dark'
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

    private syncEditorScroll(line: number) {
        if (!this._currentDocument) return;

        const editor = vscode.window.visibleTextEditors.find(e => e.document === this._currentDocument);
        if (editor) {
            const position = new vscode.Position(line, 0);
            console.log(`Syncing editor to line ${line}`);
            // Use smooth reveal for better user experience
            editor.revealRange(
                new vscode.Range(position, position), 
                vscode.TextEditorRevealType.AtTop
            );
        }
    }

    public syncScroll(line: number, percentage: number) {
        // Send scroll sync message with additional context for better accuracy
        const totalLines = this._currentDocument?.lineCount || 0;
        console.log(`Sending sync scroll to webview: line ${line}, percentage ${percentage}`);
        this._panel.webview.postMessage({
            command: 'syncScroll',
            line: line,
            percentage: percentage,
            totalLines: totalLines,
            timestamp: Date.now() // For performance monitoring
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
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'shiki-markdown-preview.js');

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

