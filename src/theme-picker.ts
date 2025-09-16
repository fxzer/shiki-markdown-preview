import * as vscode from 'vscode'
import { MarkdownPreviewPanel } from './markdown-preview'
import { findThemeIndex } from './utils'
import { DocumentValidator } from './utils/document-validator'
import { ErrorHandler } from './utils/error-handler'
import { ThemeManager } from './utils/theme-manager'

/**
 * 主题快速选择项接口
 */
interface ThemeQuickPickItem extends vscode.QuickPickItem {
  theme: string
}

/**
 * 显示主题选择器
 */
export async function showThemePicker(panel: MarkdownPreviewPanel, currentThemeValue: string): Promise<void> {
  // 使用ThemeService获取缓存的主题数据
  const themeService = panel.themeService
  const groupedThemes = await ErrorHandler.safeExecute(
    () => themeService.getGroupedThemes(),
    '获取主题数据失败',
    'ThemePicker',
  )

  if (!groupedThemes) {
    ErrorHandler.showError('无法获取主题数据')
    return
  }

  ErrorHandler.logInfo(`从缓存获取主题数据: Light(${groupedThemes.light.length}) Dark(${groupedThemes.dark.length})`, 'ThemePicker')

  // 构建QuickPick项目，增强视觉效果和区分度
  const lightThemeItems: ThemeQuickPickItem[] = groupedThemes.light.map((theme: any) => ({
    label: theme.displayName,
    theme: theme.name,
    description: theme.name,
  }))

  const darkThemeItems: ThemeQuickPickItem[] = groupedThemes.dark.map((theme: any) => ({
    label: theme.displayName,
    theme: theme.name,
    description: theme.name,
  }))

  // 创建带有更好视觉效果的分割线，包含统计信息
  const lightSeparator: ThemeQuickPickItem = {
    label: '═ 亮色主题 ═',
    theme: '',
    kind: vscode.QuickPickItemKind.Separator,
    description: `共 ${groupedThemes.light.length} 个主题`,
  }

  const darkSeparator: ThemeQuickPickItem = {
    label: '═ 暗色主题 ═',
    theme: '',
    kind: vscode.QuickPickItemKind.Separator,
    description: `共 ${groupedThemes.dark.length} 个主题`,
  }

  const themes: ThemeQuickPickItem[] = [
    lightSeparator,
    ...lightThemeItems,
    darkSeparator,
    ...darkThemeItems,
  ]

  // 找到当前主题的索引
  const currentIndex = findThemeIndex(themes, currentThemeValue)

  if (currentIndex !== -1) {
    themes[currentIndex].picked = true
    themes[currentIndex].description = `${themes[currentIndex].description} (当前)`
  }

  // 创建 QuickPick 实例以获得更多控制
  const quickPick = vscode.window.createQuickPick<ThemeQuickPickItem>()
  quickPick.title = '选择 Markdown 预览主题'
  quickPick.placeholder = `使用方向键预览主题，按回车确认选择（共 ${groupedThemes.all.length} 个主题）`
  quickPick.items = themes
  quickPick.canSelectMany = false
  quickPick.matchOnDescription = true

  // 设置初始选中项
  if (currentIndex !== -1) {
    quickPick.activeItems = [themes[currentIndex]]
  }
  else {
    ErrorHandler.logWarning(`无法设置活动项，当前主题: ${currentThemeValue}`, 'ThemePicker')
  }

  let isPreviewMode = true
  const originalTheme = currentThemeValue
  let debounceTimer: NodeJS.Timeout | undefined
  const DEBOUNCE_DELAY = 300

  // 监听活动项变化（键盘导航时触发）
  quickPick.onDidChangeActive(async (items) => {
    if (items.length > 0 && isPreviewMode) {
      const selectedTheme = items[0].theme
      ErrorHandler.logInfo(`预览主题: ${selectedTheme}`, 'ThemePicker')

      // 清除之前的防抖计时器
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // 设置防抖计时器
      debounceTimer = setTimeout(async () => {
        await ErrorHandler.safeExecute(
          async () => {
            // 确保预览窗口已打开
            const activeEditor = DocumentValidator.getActiveMarkdownEditor()
            // 如果有预览窗口，实时预览主题，但不保存到配置
            if (MarkdownPreviewPanel.currentPanel) {
              // 实时预览主题，但不保存到配置
              const themeService = panel.themeService
              if (await themeService.updateThemeForPreview(selectedTheme)) {
                const currentDocument = panel.currentDocument
                if (currentDocument) {
                  await panel.updateContent(currentDocument)
                }
              }
            }
            else if (activeEditor) {
              // 如果没有预览窗口，先打开它
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
              if (workspaceFolder) {
                const extensionUri = workspaceFolder.uri
                MarkdownPreviewPanel.createOrShow(extensionUri, activeEditor.document)
              }
              // 等待预览窗口创建完成
              await new Promise(resolve => setTimeout(resolve, 100))

              // 实时预览主题，但不保存到配置
              const currentPanel = MarkdownPreviewPanel.currentPanel
              if (currentPanel) {
                const themeService = (currentPanel as MarkdownPreviewPanel).themeService
                if (await themeService.updateThemeForPreview(selectedTheme)) {
                  const currentDocument = (currentPanel as MarkdownPreviewPanel).currentDocument
                  if (currentDocument) {
                    await (currentPanel as MarkdownPreviewPanel).updateContent(currentDocument)
                  }
                }
              }
            }
            else {
              ErrorHandler.showWarning('请先打开一个 Markdown 文件')
            }
          },
          '主题预览更新失败',
          'ThemePicker',
        )
        debounceTimer = undefined
      }, DEBOUNCE_DELAY)
    }
  })

  // 监听接受事件（回车或点击）
  quickPick.onDidAccept(async () => {
    const selectedItem = quickPick.selectedItems[0] || quickPick.activeItems[0]
    if (selectedItem) {
      await ErrorHandler.safeExecute(
        async () => {
          // 使用配置服务更新主题
          await ThemeManager.updateTheme(selectedItem.theme, vscode.ConfigurationTarget.Global)

          // 使用主题服务更新主题
          const themeService = panel.themeService
          if (await themeService.changeTheme(selectedItem.theme)) {
            const currentDocument = panel.currentDocument
            if (currentDocument) {
              await panel.updateContent(currentDocument)
            }
          }
        },
        '主题切换失败',
        'ThemePicker',
      )
    }
    isPreviewMode = false
    quickPick.hide()
  })

  // 监听隐藏事件（ESC 或点击外部）
  quickPick.onDidHide(async () => {
    // 清理防抖计时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }

    if (isPreviewMode) {
      // 如果是取消操作，恢复原始主题
      await ErrorHandler.safeExecute(
        async () => {
          const themeService = panel.themeService
          if (await themeService.updateThemeForPreview(originalTheme)) {
            const currentDocument = panel.currentDocument
            if (currentDocument) {
              await panel.updateContent(currentDocument)
            }
          }
        },
        '主题恢复失败',
        'ThemePicker',
      )
    }
    quickPick.dispose()
  })

  quickPick.show()
}
