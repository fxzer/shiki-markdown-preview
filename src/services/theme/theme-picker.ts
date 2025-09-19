import type { MarkdownPreviewPanel } from '../renderer/markdown-preview'
import type { ThemeService } from './theme-service'

import { debounce } from 'throttle-debounce'
import * as vscode from 'vscode'
import { ErrorHandler } from '../../utils/error-handler'

/**
 * 主题快速选择项接口
 */
interface ThemeQuickPickItem extends vscode.QuickPickItem {
  theme: string
}

/*
* 查找当前主题的辅助函数
*/
export function findThemeIndex(themes: any[], themeName: string): number {
  // 首先尝试精确匹配
  let index = themes.findIndex(t => t.theme === themeName)

  if (index === -1) {
    // 如果精确匹配失败，尝试模糊匹配
    const fuzzyMatch = themes.find(t =>
      t.theme && (
        t.theme.includes(themeName)
        || themeName.includes(t.theme)
        || t.label.toLowerCase().includes(themeName.toLowerCase())
      ),
    )

    if (fuzzyMatch) {
      index = themes.findIndex(t => t.theme === fuzzyMatch.theme)
    }
  }

  return index
};

async function getThemeOptions(themeService: ThemeService): Promise<{ options: ThemeQuickPickItem[], count: number }> {
  const groupedThemes = await ErrorHandler.safeExecute(
    () => themeService.getGroupedThemes(),
    '获取主题数据失败',
    'ThemePicker',
  )
  const count = groupedThemes?.all.length ?? 0

  if (!groupedThemes) {
    ErrorHandler.showError('无法获取主题数据')
    return { options: [], count: 0 }
  }

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

  const options: ThemeQuickPickItem[] = [
    lightSeparator,
    ...lightThemeItems,
    darkSeparator,
    ...darkThemeItems,
  ]

  return {
    options,
    count,
  }
}

/**
 * 显示主题选择器
 */
export async function showThemePicker(panel: MarkdownPreviewPanel, currentThemeValue: string): Promise<void> {
  const themeService = panel.themeService
  const { options, count } = await getThemeOptions(themeService)

  // 找到当前主题的索引
  const currentIndex = findThemeIndex(options, currentThemeValue)

  if (currentIndex !== -1) {
    options[currentIndex].picked = true
    options[currentIndex].description = `${options[currentIndex].description} (当前)`
  }

  // 创建 QuickPick 实例以获得更多控制
  const quickPick = vscode.window.createQuickPick<ThemeQuickPickItem>()
  quickPick.title = '选择 Markdown 预览主题'
  quickPick.placeholder = `使用方向键预览主题，按回车确认选择（共 ${count} 个主题）`
  quickPick.items = options
  quickPick.canSelectMany = false
  quickPick.matchOnDescription = true

  // 设置初始选中项
  if (currentIndex !== -1) {
    quickPick.activeItems = [options[currentIndex]]
  }
  else {
    ErrorHandler.logWarning(`无法设置活动项，当前主题: ${currentThemeValue}`, 'ThemePicker')
  }

  let accepted = false // 是否接受
  const originalTheme = currentThemeValue

  // 使用 throttle-debounce 库创建防抖函数
  const debouncedPreviewUpdate = debounce(300, async (selectedTheme: string) => {
    await ErrorHandler.safeExecute(
      async () => {
        // 直接使用传入的 panel 参数，因为外部已经确保预览面板存在
        const themeService = panel.themeService
        if (await themeService.updateThemeForPreview(selectedTheme)) {
          const currentDocument = panel.currentDocument
          if (currentDocument) {
            await panel.updateContent(currentDocument)
          }
        }
      },
      '主题预览更新失败',
      'ThemePicker',
    )
  })

  // 监听活动项变化（键盘导航时触发）
  quickPick.onDidChangeActive(async (items) => {
    if (items.length > 0 && !accepted) {
      const selectedTheme = items[0].theme
      ErrorHandler.logInfo(`预览主题: ${selectedTheme}`, 'ThemePicker')

      // 使用防抖函数
      debouncedPreviewUpdate(selectedTheme)
    }
  })

  // 监听接受事件（回车或点击）
  quickPick.onDidAccept(async () => {
    const selectedItem = quickPick.selectedItems[0] || quickPick.activeItems[0]
    if (selectedItem) {
      await ErrorHandler.safeExecute(
        async () => {
          // 使用配置服务更新主题
          await themeService.updateTheme(selectedItem.theme, vscode.ConfigurationTarget.Global)
        },
        '主题切换失败',
        'ThemePicker',
      )
    }
    accepted = true
    quickPick.hide()
  })

  // 监听隐藏事件（ESC 或点击外部）
  quickPick.onDidHide(async () => {
    // 取消防抖函数（throttle-debounce 库会自动处理）
    debouncedPreviewUpdate.cancel()

    if (!accepted) {
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
