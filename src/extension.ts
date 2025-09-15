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

	// Register text editor scroll listener for mouse wheel sync
	let editorScrollTimeout: NodeJS.Timeout | undefined;
	let lastVisibleRange: vscode.Range | undefined;
	
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorVisibleRanges(event => {
			if (event.textEditor.document.languageId === 'markdown' && 
				MarkdownPreviewPanel.currentPanel && 
				event.visibleRanges.length > 0) {
				
				const currentRange = event.visibleRanges[0];
				
				// Only sync if the visible range actually changed significantly (indicating scroll, not cursor)
				if (!lastVisibleRange || 
					Math.abs(currentRange.start.line - lastVisibleRange.start.line) > 2 ||
					Math.abs(currentRange.end.line - lastVisibleRange.end.line) > 2) {
					
					lastVisibleRange = currentRange;
					
					// Clear previous timeout
					if (editorScrollTimeout) {
						clearTimeout(editorScrollTimeout);
					}
					
					editorScrollTimeout = setTimeout(() => {
						const centerLine = Math.floor((currentRange.start.line + currentRange.end.line) / 2);
						const totalLines = event.textEditor.document.lineCount;
						const scrollPercentage = totalLines > 0 ? centerLine / totalLines : 0;
						
						console.log(`Editor wheel scroll: center line ${centerLine}, percentage ${scrollPercentage.toFixed(2)}`);
						MarkdownPreviewPanel.currentPanel?.syncScroll(centerLine, scrollPercentage);
					}, 200); // 200ms throttle for wheel-based scrolling
				}
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