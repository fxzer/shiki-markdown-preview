import * as vscode from 'vscode'
import { MarkdownPreviewPanel } from './markdown-preview'
import { ConfigService } from './services'
import { showThemePicker } from './theme-picker'
import { MarkdownPreviewSerializer } from './webview-serializer'

export function activate(context: vscode.ExtensionContext) {
  // 注册 markdown 预览命令
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.show', () => {
      const activeEditor = vscode.window.activeTextEditor
      if (activeEditor && activeEditor.document.languageId === 'markdown') {
        MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document)
      }
      else {
        vscode.window.showInformationMessage('Please open a Markdown file first')
      }
    }),
  )

  // 注册为当前文档显示预览的命令
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.showForDocument', (uri?: vscode.Uri) => {
      if (uri) {
        vscode.workspace.openTextDocument(uri).then((document) => {
          if (document.languageId === 'markdown') {
            MarkdownPreviewPanel.createOrShow(context.extensionUri, document)
          }
        })
      }
      else {
        const activeEditor = vscode.window.activeTextEditor
        if (activeEditor && activeEditor.document.languageId === 'markdown') {
          MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document)
        }
        else {
          vscode.window.showInformationMessage('Please open a Markdown file first')
        }
      }
    }),
  )

  // 注册主题选择命令
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.selectTheme', async () => {
      const activeEditor = vscode.window.activeTextEditor
      if (activeEditor && activeEditor.document.languageId === 'markdown') {
        // 确保预览窗口已打开
        if (!MarkdownPreviewPanel.currentPanel) {
          MarkdownPreviewPanel.createOrShow(context.extensionUri, activeEditor.document)
          // 等待预览窗口创建完成
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (MarkdownPreviewPanel.currentPanel) {
          await showThemePicker(MarkdownPreviewPanel.currentPanel)
        }
      }
      else {
        vscode.window.showInformationMessage('Please open a Markdown file first')
      }
    }),
  )

  // 注册编辑器变更监听器，用于自动刷新
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (MarkdownPreviewPanel.currentPanel
        && event.document === MarkdownPreviewPanel.currentPanel.currentDocument) {
        MarkdownPreviewPanel.currentPanel.updateContent(event.document).catch((error) => {
          console.error('Error updating content on text document change:', error)
        })
      }
    }),
  )

  // 注册活动编辑器变更监听器
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'markdown' && MarkdownPreviewPanel.currentPanel) {
        // 在切换 markdown 文件时自动更新预览
        MarkdownPreviewPanel.currentPanel.updateContent(editor.document).catch((error) => {
          console.error('Error updating content on active editor change:', error)
        })
      }
    }),
  )

  // 注册配置变更监听器，用于实时主题更新
  const configService = new ConfigService()
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      // 检查是否是我们扩展的配置发生了变化
      if (event.affectsConfiguration('shiki-markdown-preview.currentTheme')) {
        if (MarkdownPreviewPanel.currentPanel) {
          // 使用配置服务获取新的主题设置
          const newTheme = configService.getCurrentTheme()

          // 实时更新预览主题
          const themeService = MarkdownPreviewPanel.currentPanel.themeService
          if (await themeService.updateThemeForPreview(newTheme)) {
            const currentDocument = MarkdownPreviewPanel.currentPanel.currentDocument
            if (currentDocument) {
              MarkdownPreviewPanel.currentPanel.updateContent(currentDocument)
            }
          }

          // 显示通知
          vscode.window.showInformationMessage(`主题已更改为: ${newTheme}`)
        }
      }
    }),
  )

  // 滚动同步现在由 ScrollSyncManager 处理，不需要在这里重复实现

  // 注册 webview 序列化器
  if (vscode.window.registerWebviewPanelSerializer) {
    const serializer = new MarkdownPreviewSerializer(context.extensionUri)
    context.subscriptions.push(
      vscode.window.registerWebviewPanelSerializer(MarkdownPreviewPanel.viewType, serializer),
    )
  }
}

export function deactivate() {
  // 如需要，清理资源
}
