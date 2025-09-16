import * as vscode from 'vscode'
import { MarkdownPreviewPanel } from './markdown-preview'
import { showThemePicker } from './theme-picker'
import { DocumentValidator } from './utils/document-validator'
import { ErrorHandler } from './utils/error-handler'
import { ThemeManager } from './utils/theme-manager'
import { MarkdownPreviewSerializer } from './webview-serializer'

export function activate(context: vscode.ExtensionContext) {
  // 注册配置变更监听器，用于实时主题更新
  // 注册 markdown 预览命令 - 侧边预览 (ViewColumn.Two)
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.openPreviewSlide', () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (markdownDocument) {
        MarkdownPreviewPanel.createOrShowSlide(context.extensionUri, markdownDocument)
      }
    }),
  )

  // 注册 markdown 预览命令 - 全屏预览 (ViewColumn.One)
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.openPreviewFull', () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (markdownDocument) {
        MarkdownPreviewPanel.createOrShowFull(context.extensionUri, markdownDocument)
      }
    }),
  )

  // 注册主题选择命令
  context.subscriptions.push(
    vscode.commands.registerCommand('shiki-markdown-preview.selectTheme', async () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (!markdownDocument)
        return

      // 确保预览窗口已打开
      if (!MarkdownPreviewPanel.currentPanel) {
        MarkdownPreviewPanel.createOrShowSlide(context.extensionUri, markdownDocument)
        // 等待预览窗口创建完成
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (MarkdownPreviewPanel.currentPanel) {
        await ErrorHandler.safeExecute(
          () => showThemePicker(MarkdownPreviewPanel.currentPanel!, ThemeManager.getCurrentTheme()),
          '主题选择器打开失败',
          'Extension',
        )
      }
    }),
  )

  // 注册编辑器变更监听器，用于自动刷新
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (MarkdownPreviewPanel.currentPanel
        && event.document === MarkdownPreviewPanel.currentPanel.currentDocument) {
        ErrorHandler.safeExecute(
          () => MarkdownPreviewPanel.currentPanel!.updateContent(event.document),
          '文档内容更新失败',
          'Extension',
        )
      }
    }),
  )

  // 注册活动编辑器变更监听器
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (DocumentValidator.isMarkdownEditor(editor) && MarkdownPreviewPanel.currentPanel) {
        // 在切换 markdown 文件时自动更新预览
        ErrorHandler.safeExecute(
          () => MarkdownPreviewPanel.currentPanel!.updateContent(editor!.document),
          '活动编辑器内容更新失败',
          'Extension',
        )
      }
    }),
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      // 检查是否是我们扩展的配置发生了变化
      if (event.affectsConfiguration('shiki-markdown-preview.currentTheme')) {
        if (MarkdownPreviewPanel.currentPanel) {
          // 使用配置服务获取新的主题设置
          const newTheme = ThemeManager.getCurrentTheme()

          // 实时更新预览主题
          const themeService = MarkdownPreviewPanel.currentPanel.themeService
          const success = await ErrorHandler.safeExecute(
            () => themeService.updateThemeForPreview(newTheme),
            `主题预览更新失败: ${newTheme}`,
            'Extension',
          )

          if (success) {
            const currentDocument = MarkdownPreviewPanel.currentPanel.currentDocument
            if (currentDocument) {
              await ErrorHandler.safeExecute(
                () => MarkdownPreviewPanel.currentPanel!.updateContent(currentDocument),
                '主题更新后内容刷新失败',
                'Extension',
              )
            }
          }

          // 显示通知
          ErrorHandler.showInfo(`主题已更改为: ${newTheme}`)
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
