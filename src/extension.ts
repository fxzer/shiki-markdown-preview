import * as vscode from 'vscode';
import { MarkdownPreviewPanel } from './markdownPreview';

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media'),
            vscode.Uri.joinPath(extensionUri, 'node_modules')
        ]
    };
}

export function activate(context: vscode.ExtensionContext) {
	// Register markdown preview command
	context.subscriptions.push(
		vscode.commands.registerCommand('shiki-markdown-preview.show', () => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && activeEditor.document.languageId === 'markdown') {
				MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document);
			} else {
				vscode.window.showInformationMessage('Please open a Markdown file first');
			}
		})
	);

	// Register command to show preview for current document
	context.subscriptions.push(
		vscode.commands.registerCommand('shiki-markdown-preview.showForDocument', (uri?: vscode.Uri) => {
			if (uri) {
				vscode.workspace.openTextDocument(uri).then(document => {
					if (document.languageId === 'markdown') {
						MarkdownPreviewPanel.createOrShow(context.extensionUri, document);
					}
				});
			} else {
				const activeEditor = vscode.window.activeTextEditor;
				if (activeEditor && activeEditor.document.languageId === 'markdown') {
					MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document);
				} else {
					vscode.window.showInformationMessage('Please open a Markdown file first');
				}
			}
		})
	);

	// Register editor change listener for auto-refresh
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (MarkdownPreviewPanel.currentPanel && 
				event.document === MarkdownPreviewPanel.currentPanel['_currentDocument']) {
				MarkdownPreviewPanel.currentPanel.updateContent(event.document);
			}
		})
	);

	// Register active editor change listener
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.languageId === 'markdown' && MarkdownPreviewPanel.currentPanel) {
				// Auto-update preview when switching between markdown files
				MarkdownPreviewPanel.currentPanel.updateContent(editor.document);
			}
		})
	);

	// Register text editor selection change listener for scroll sync
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(event => {
			if (event.textEditor.document.languageId === 'markdown' && MarkdownPreviewPanel.currentPanel) {
				const currentLine = event.selections[0].active.line;
				const totalLines = event.textEditor.document.lineCount;
				const scrollPercentage = totalLines > 0 ? currentLine / totalLines : 0;
				
				// Send scroll sync message to webview
				MarkdownPreviewPanel.currentPanel.syncScroll(currentLine, scrollPercentage);
			}
		})
	);

	// Register webview serializer
	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(MarkdownPreviewPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: unknown) {
				console.log(`Got state: ${state}`);
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				MarkdownPreviewPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

export function deactivate() {
	// Clean up resources if needed
}