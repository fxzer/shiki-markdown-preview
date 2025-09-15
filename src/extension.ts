import * as vscode from 'vscode';
import { MarkdownPreviewPanel } from './markdown-preview';
import { showThemePicker } from './theme-picker';
import { MarkdownPreviewSerializer } from './webview-serializer';


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
		vscode.commands.registerCommand('shiki-markdown-preview.selectTheme', async () => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && activeEditor.document.languageId === 'markdown') {
				// 确保预览窗口已打开
				if (!MarkdownPreviewPanel.currentPanel) {
					MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document);
					// 等待预览窗口创建完成
					await new Promise(resolve => setTimeout(resolve, 100));
				}
				
				if (MarkdownPreviewPanel.currentPanel) {
					await showThemePicker(MarkdownPreviewPanel.currentPanel);
				}
			} else {
				vscode.window.showInformationMessage('Please open a Markdown file first');
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

	// Register configuration change listener for real-time theme updates
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			// 检查是否是我们扩展的配置发生了变化
			if (event.affectsConfiguration('shiki-markdown-preview.currentTheme')) {
				if (MarkdownPreviewPanel.currentPanel) {
					// 获取新的主题设置
					const config = vscode.workspace.getConfiguration('shiki-markdown-preview');
					const newTheme = config.get<string>('currentTheme', 'github-light');
					
					// 实时更新预览主题
					MarkdownPreviewPanel.currentPanel.updateTheme(newTheme);
					
					// 显示通知
					vscode.window.showInformationMessage(`主题已更新为: ${newTheme}`);
				}
			}
		})
	);

	// 滚动同步现在由 ScrollSyncManager 处理，不需要在这里重复实现

	// Register webview serializer
	if (vscode.window.registerWebviewPanelSerializer) {
		const serializer = new MarkdownPreviewSerializer(context.extensionUri);
		context.subscriptions.push(
			vscode.window.registerWebviewPanelSerializer(MarkdownPreviewPanel.viewType, serializer)
		);
	}
}

export function deactivate() {
	// Clean up resources if needed
}
