import * as vscode from 'vscode'
import { ConfigService, MarkdownPreviewPanel, MarkdownPreviewSerializer, showThemePicker } from './services'
import { DocumentValidator, ErrorHandler } from './utils'

export function activate(context: vscode.ExtensionContext) {
  const configService = new ConfigService()

  // 注册配置变更监听器，用于实时主题更新
  // 注册 markdown 预览命令 - 侧边预览 (ViewColumn.Two)
  context.subscriptions.push(
    vscode.commands.registerCommand('shikiMarkdownPreview.openPreviewSlide', () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (markdownDocument) {
        MarkdownPreviewPanel.createOrShowSlide(context.extensionUri, markdownDocument)
      }
    }),
  )

  // 注册 markdown 预览命令 - 全屏预览 (ViewColumn.One)
  context.subscriptions.push(
    vscode.commands.registerCommand('shikiMarkdownPreview.openPreviewFull', () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (markdownDocument) {
        MarkdownPreviewPanel.createOrShowFull(context.extensionUri, markdownDocument)
      }
    }),
  )

  // 注册主题选择命令
  context.subscriptions.push(
    vscode.commands.registerCommand('shikiMarkdownPreview.selectTheme', async () => {
      const markdownDocument = DocumentValidator.validateMarkdownDocument()
      if (!markdownDocument)
        return

      // 确保预览窗口已打开并等待其完全初始化
      if (!MarkdownPreviewPanel.currentPanel) {
        await MarkdownPreviewPanel.createOrShowSlide(context.extensionUri, markdownDocument)
      }

      if (MarkdownPreviewPanel.currentPanel) {
        await ErrorHandler.safeExecute(
          () => showThemePicker(MarkdownPreviewPanel.currentPanel!, configService.getCurrentTheme()),
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
        ErrorHandler.safeExecuteSync(
          () => MarkdownPreviewPanel.currentPanel!.updateContentDebounced(event.document),
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
        // 只有在切换到不同的 markdown 文件时才更新预览
        const currentDocument = MarkdownPreviewPanel.currentPanel.currentDocument
        if (!currentDocument || editor!.document !== currentDocument) {
          ErrorHandler.safeExecuteSync(
            () => MarkdownPreviewPanel.currentPanel!.updateContentDebounced(editor!.document),
            '活动编辑器内容更新失败',
            'Extension',
          )
        }
      }
    }),
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      // 检查是否是我们扩展的配置发生了变化
      if (event.affectsConfiguration('shikiMarkdownPreview.currentTheme')) {
        if (MarkdownPreviewPanel.currentPanel) {
          // 使用配置服务获取新的主题设置
          const newTheme = configService.getCurrentTheme()
          const currentTheme = MarkdownPreviewPanel.currentPanel.themeService.currentTheme

          // 如果主题没有实际变化，跳过更新
          if (newTheme === currentTheme) {
            ErrorHandler.logInfo(`主题未变化，跳过更新: ${newTheme}`, 'Extension')
            return
          }

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
              ErrorHandler.safeExecuteSync(
                () => MarkdownPreviewPanel.currentPanel!.updateContentDebounced(currentDocument),
                '主题更新后内容刷新失败',
                'Extension',
              )
            }
          }

          // 显示通知
          ErrorHandler.showInfo(`主题已更改为: ${newTheme}`)
        }
      }

      // 检查滚动同步设置是否发生变化
      if (event.affectsConfiguration('shikiMarkdownPreview.enableScrollSync')) {
        if (MarkdownPreviewPanel.currentPanel) {
          const config = vscode.workspace.getConfiguration('shikiMarkdownPreview')
          const enableScrollSync = config.get<boolean>('enableScrollSync', true)

          if (MarkdownPreviewPanel.currentPanel.scrollSyncManager) {
            if (enableScrollSync) {
              MarkdownPreviewPanel.currentPanel.scrollSyncManager.enable()
            }
            else {
              MarkdownPreviewPanel.currentPanel.scrollSyncManager.disable()
            }
          }

          // 通知webview更新滚动同步状态
          MarkdownPreviewPanel.currentPanel.panel.webview.postMessage({
            command: 'updateScrollSyncState',
            enabled: enableScrollSync,
          })
        }
      }
    }),
  )

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
