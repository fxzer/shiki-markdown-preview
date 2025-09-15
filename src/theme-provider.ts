import type { Highlighter } from 'shiki'

export class ThemeProvider {
  private _highlighter: Highlighter

  constructor(highlighter: Highlighter) {
    this._highlighter = highlighter
  }

  /**
   * 提取主题的核心颜色信息
   * @param theme 主题名称
   * @returns 主题颜色配置对象
   */
  public getThemeColors(theme: string): any | null {
    try {
      const themeData = (this._highlighter as any).getTheme(theme)
      if (!themeData) {
        console.warn(`Theme ${theme} not found`)
        return null
      }

      return themeData.colors || {}
    }
    catch (error) {
      console.error(`Failed to extract colors for theme ${theme}:`, error)
      return null
    }
  }

  public getCssVars(theme: any): any {
    const themeColors = this.getThemeColors(theme)
    if (!themeColors) {
      return {}
    }
    // 提取核心颜色变量（频率最高的变量）
    const coreColors = [
      'editor.background',
      'editor.foreground',
      'activityBar.background',
      'button.background',
      'focusBorder',
      'list.activeSelectionBackground',
      'list.hoverBackground',
      'statusBar.background',
      'titleBar.activeBackground',
      'activityBarBadge.background',
      'textLink.foreground',
      'textLink.activeForeground',
    ]

    const cssVars: Record<string, string> = {}
    coreColors.forEach((color) => {
      cssVars[color] = themeColors[color]
    })
    console.log('cssVars', cssVars)

    return cssVars
  }
}
