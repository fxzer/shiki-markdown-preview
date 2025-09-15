import * as vscode from 'vscode';
import { MarkdownPreviewPanel } from './markdown-preview';

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

	// Register theme selection command
	context.subscriptions.push(
		vscode.commands.registerCommand('shiki-markdown-preview.selectTheme', () => {
			if (MarkdownPreviewPanel.currentPanel) {
				MarkdownPreviewPanel.currentPanel.showThemeSelector();
			} else {
				vscode.window.showInformationMessage('Please open a Markdown preview first');
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

	// 滚动同步现在由 ScrollSyncManager 处理，不需要在这里重复实现

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
