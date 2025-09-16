import * as vscode from 'vscode'
import { ConfigService } from '../services/config-service'
import { ErrorHandler } from './error-handler'

/**
 * 主题管理工具类
 * 提供统一的主题操作和配置管理功能
 */
export class ThemeManager {
  private static _configService: ConfigService | null = null

  /**
   * 获取配置服务实例
   */
  private static getConfigService(): ConfigService {
    if (!this._configService) {
      this._configService = new ConfigService()
    }
    return this._configService
  }

  /**
   * 获取当前主题
   * @returns 当前主题名称
   */
  static getCurrentTheme(): string {
    return this.getConfigService().getCurrentTheme()
  }

  /**
   * 更新主题配置
   * @param themeName 主题名称
   * @param target 配置目标
   * @returns Promise<boolean> 是否成功更新
   */
  static async updateTheme(themeName: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<boolean> {
    return ErrorHandler.safeExecute(
      async () => {
        await this.getConfigService().updateConfig('currentTheme', themeName, target)
        return true
      },
      `主题配置更新失败: ${themeName}`,
      'ThemeManager',
    ) !== null
  }

  /**
   * 验证主题名称
   * @param themeName 主题名称
   * @returns 是否为有效的主题名称
   */
  static isValidThemeName(themeName: string): boolean {
    if (!themeName || typeof themeName !== 'string') {
      return false
    }

    // 基本验证：主题名称应该只包含字母、数字、连字符和下划线
    const validThemeNameRegex = /^[\w-]+$/
    return validThemeNameRegex.test(themeName) && themeName.length > 0 && themeName.length <= 100
  }

  /**
   * 获取主题显示名称
   * @param themeName 主题名称
   * @returns 显示名称
   */
  static getThemeDisplayName(themeName: string): string {
    if (!this.isValidThemeName(themeName)) {
      return themeName
    }

    // 将连字符和下划线替换为空格，并转换为标题格式
    return themeName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * 检查主题是否为暗色主题
   * @param themeName 主题名称
   * @returns 是否为暗色主题
   */
  static isDarkTheme(themeName: string): boolean {
    const darkThemeKeywords = ['dark', 'black', 'night', 'midnight', 'dusk', 'shadow', 'dim']
    const lowerThemeName = themeName.toLowerCase()
    return darkThemeKeywords.some(keyword => lowerThemeName.includes(keyword))
  }

  /**
   * 检查主题是否为亮色主题
   * @param themeName 主题名称
   * @returns 是否为亮色主题
   */
  static isLightTheme(themeName: string): boolean {
    const lightThemeKeywords = ['light', 'white', 'day', 'bright', 'sun', 'clear', 'pale']
    const lowerThemeName = themeName.toLowerCase()
    return lightThemeKeywords.some(keyword => lowerThemeName.includes(keyword))
  }

  /**
   * 获取主题类型
   * @param themeName 主题名称
   * @returns 主题类型
   */
  static getThemeType(themeName: string): 'light' | 'dark' | 'unknown' {
    if (this.isDarkTheme(themeName)) {
      return 'dark'
    }
    if (this.isLightTheme(themeName)) {
      return 'light'
    }
    return 'unknown'
  }

  /**
   * 格式化主题信息
   * @param themeName 主题名称
   * @returns 格式化的主题信息
   */
  static formatThemeInfo(themeName: string): {
    name: string
    displayName: string
    type: 'light' | 'dark' | 'unknown'
    isDark: boolean
    isLight: boolean
  } {
    return {
      name: themeName,
      displayName: this.getThemeDisplayName(themeName),
      type: this.getThemeType(themeName),
      isDark: this.isDarkTheme(themeName),
      isLight: this.isLightTheme(themeName),
    }
  }

  /**
   * 比较主题名称（用于排序）
   * @param a 主题A
   * @param b 主题B
   * @returns 比较结果
   */
  static compareThemes(a: string, b: string): number {
    const aInfo = this.formatThemeInfo(a)
    const bInfo = this.formatThemeInfo(b)

    // 先按类型排序（亮色主题在前）
    if (aInfo.type !== bInfo.type) {
      if (aInfo.type === 'light')
        return -1
      if (bInfo.type === 'light')
        return 1
      if (aInfo.type === 'dark')
        return -1
      if (bInfo.type === 'dark')
        return 1
    }

    // 同类型内按显示名称排序
    return aInfo.displayName.localeCompare(bInfo.displayName)
  }

  /**
   * 创建主题快速选择项
   * @param themeName 主题名称
   * @param isCurrent 是否为当前主题
   * @returns 快速选择项
   */
  static createThemeQuickPickItem(themeName: string, isCurrent: boolean = false): vscode.QuickPickItem {
    const info = this.formatThemeInfo(themeName)

    return {
      label: info.displayName,
      description: isCurrent ? `${themeName} (当前)` : themeName,
      picked: isCurrent,
    }
  }

  /**
   * 监听主题配置变化
   * @param callback 配置变化回调
   * @returns 可释放的资源
   */
  static onThemeConfigChange(callback: (themeName: string) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('shiki-markdown-preview.currentTheme')) {
        const newTheme = this.getCurrentTheme()
        callback(newTheme)
      }
    })
  }
}
