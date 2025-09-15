import type { GroupedThemes, ThemeMetadata } from '../types/theme'

/**
 * 主题工具类 - 提供主题相关的工具函数
 */
export class ThemeUtils {
  /**
   * 根据主题类型进行分组
   */
  static groupThemesByType(themes: ThemeMetadata[]): GroupedThemes {
    const light = themes.filter(theme => theme.type === 'light') // 筛选亮色主题
    const dark = themes.filter(theme => theme.type === 'dark') // 筛选暗色主题

    return {
      light: this.sortThemes(light), // 排序亮色主题
      dark: this.sortThemes(dark), // 排序暗色主题
      all: this.sortThemes([...light, ...dark]), // 排序所有主题
    }
  }

  /**
   * 按显示名称排序主题
   */
  private static sortThemes(themes: ThemeMetadata[]): ThemeMetadata[] {
    return themes.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  /**
   * 验证主题名称是否有效
   */
  static isValidThemeName(themeName: string): boolean {
    return typeof themeName === 'string' && themeName.length > 0 && themeName !== 'undefined'
  }

  /**
   * 获取主题的显示标签
   */
  static getThemeLabel(theme: ThemeMetadata): string {
    return theme.displayName || theme.name
  }

  /**
   * 创建主题选择项的分隔符
   */
  static createThemeSeparator(label: string): ThemeMetadata {
    return {
      name: '', // 分隔符名称为空
      displayName: label, // 显示名称
      type: 'light', // 分隔符使用light类型，但实际不会被使用
    }
  }
}
