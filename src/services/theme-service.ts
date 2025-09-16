import type { Highlighter } from 'shiki'
import type { GroupedThemes, ThemeCache, ThemeMetadata } from '../types/theme'
import { bundledThemes, createHighlighter } from 'shiki'
import * as vscode from 'vscode'
import { generateEnhancedColors } from '../color-hander'
import { toCssVarsStr } from '../color-utils'
import { escapeHtml } from '../utils'
import { ThemeUtils } from '../utils/theme-utils'
import { ConfigService } from './config-service'

const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'html',
  'css',
  'scss',
  'json',
  'xml',
  'yaml',
  'markdown',
]

export class ThemeService {
  private _highlighter: Highlighter | undefined
  private _currentTheme: string
  private _loadedThemes: Set<string> = new Set<string>()
  private _loadedLanguages: Set<string> = new Set<string>()
  private _commonLanguages: string[] = ['javascript', 'typescript', 'html', 'css', 'json', 'markdown', 'python']
  private _configService: ConfigService // 配置服务实例

  // 主题缓存系统（简化版，无过期时间）
  private _themeCache: ThemeCache = {
    metadata: new Map<string, ThemeMetadata>(),
    grouped: { light: [], dark: [], all: [] },
    loaded: false,
  }

  constructor() {
    this._configService = new ConfigService() // 初始化配置服务
    this._currentTheme = this._configService.getCurrentTheme() // 使用配置服务获取当前主题
  }

  /**
   * 初始化语法高亮器，只加载当前主题和常用语言
   */
  async initializeHighlighter(): Promise<void> {
    try {
      // 只预加载当前主题和常用语言
      const currentTheme = this._configService.getCurrentTheme()

      this._highlighter = await createHighlighter({
        themes: [currentTheme],
        langs: this._commonLanguages,
      })

      // 记录已加载的主题和语言
      this._loadedThemes.add(currentTheme)
      this._commonLanguages.forEach(lang => this._loadedLanguages.add(lang))

      // 高亮器初始化完成
    }
    catch (error) {
      console.error('Failed to initialize highlighter:', error)
      throw error
    }
  }

  /**
   * 验证主题是否可用
   */
  isValidThemeSync(theme: string): boolean {
    return this._themeCache.loaded && this._themeCache.metadata.has(theme)
  }

  /**
   * 返回当前主题类型
   */
  getCurrentThemeType(themeName: string): 'light' | 'dark' {
    return this._themeCache.metadata.get(themeName)?.type || 'light'
  }

  /* 是暗黑主题 */
  isDarkTheme(themeName: string): boolean {
    return this._themeCache.metadata.get(themeName)?.type === 'dark'
  }

  /**
   * 提取主题的核心颜色信息
   * @param theme 主题名称
   * @returns 主题颜色配置对象
   */
  public getThemeColors(theme: string): any | null {
    if (!this._highlighter) {
      console.warn('Highlighter not initialized')
      return null
    }

    try {
      const themeData = (this._highlighter as any).getTheme(theme)
      if (!themeData) {
        console.warn(`Theme ${theme} not found`)
        return null
      }

      // 确保返回完整的颜色对象，包括 tokenColors 中的颜色
      const colors = themeData.colors || {}

      // 如果主题数据中有 tokenColors，也提取一些关键颜色
      if (themeData.tokenColors && Array.isArray(themeData.tokenColors)) {
        themeData.tokenColors.forEach((tokenColor: any) => {
          if (tokenColor.settings && tokenColor.settings.foreground) {
            // 为一些常见的 token 类型添加颜色映射
            if (tokenColor.scope && tokenColor.scope.includes('string')) {
              colors['string.foreground'] = tokenColor.settings.foreground
            }
            if (tokenColor.scope && tokenColor.scope.includes('comment')) {
              colors['comment.foreground'] = tokenColor.settings.foreground
            }
            if (tokenColor.scope && tokenColor.scope.includes('keyword')) {
              colors['keyword.foreground'] = tokenColor.settings.foreground
            }
          }
        })
      }

      return colors
    }
    catch (error) {
      console.error(`Failed to extract colors for theme ${theme}:`, error)
      return null
    }
  }

  /**
   * 获取主题的CSS变量
   * @param theme 主题名称
   * @returns CSS变量字符串
   */
  public getCssVars(theme: string): string {
    const themeColors = this.getThemeColors(theme)
    if (!themeColors) {
      console.warn('Theme colors not found for theme:', theme)
      return ''
    }

    // 提取核心颜色变量（频率最高的变量）
    const coreColorNames = [
      'editor.background',
      'editor.foreground',
      'activityBar.background',
      'button.background',
      'focusBorder',
      'panel.border',
      'list.activeSelectionBackground',
      'list.hoverBackground',
      'statusBar.background',
      'titleBar.activeBackground',
      'activityBarBadge.background',
      'textLink.foreground',
      'textLink.activeForeground',
    ]

    const isDarkTheme = this.isDarkTheme(theme)
    const themeCoreCss = coreColorNames.reduce((acc, varName) => {
      let colorValue = themeColors[varName]
      if (!colorValue) {
        if (varName === 'editor.foreground') {
          colorValue = isDarkTheme ? '#ffffff' : '#000000'
        }
      }
      acc[varName] = colorValue
      return acc
    }, {} as Record<string, string>)

    const themeCoreCssVars = toCssVarsStr(themeCoreCss)
    const enhancedCssVars = generateEnhancedColors(themeCoreCss, isDarkTheme)

    return `${themeCoreCssVars} ${enhancedCssVars}`
  }

  /**
   * 更改当前主题并更新配置
   * 动态加载新主题
   */
  async changeTheme(theme: string): Promise<boolean> {
    if (!await this.isValidTheme(theme)) {
      vscode.window.showErrorMessage(`无效的主题: ${theme}`)
      return false
    }

    // 如果主题未加载，先加载主题
    if (!this._loadedThemes.has(theme)) {
      try {
        await this.loadTheme(theme)
      }
      catch (error) {
        console.error(`加载主题失败: ${theme}`, error)
        vscode.window.showErrorMessage(`加载主题失败: ${theme}`)
        return false
      }
    }

    this._currentTheme = theme

    // 使用配置服务更新配置
    try {
      await this._configService.updateConfig('currentTheme', theme, vscode.ConfigurationTarget.Global)
      return true
    }
    catch (error) {
      console.error('更新主题配置失败:', error)
      return false
    }
  }

  /**
   * 更新预览主题（不保存配置）
   * 动态加载预览主题
   */
  async updateThemeForPreview(theme: string): Promise<boolean> {
    if (!this.isValidTheme(theme)) {
      console.warn(`Invalid theme: ${theme}`)
      return false
    }

    // 如果主题未加载，先加载主题
    if (!this._loadedThemes.has(theme)) {
      try {
        await this.loadTheme(theme)
      }
      catch (error) {
        console.error(`Failed to load theme for preview: ${theme}`, error)
        return false
      }
    }

    this._currentTheme = theme
    return true
  }

  /**
   * 获取当前主题的CSS变量
   * 确保主题已加载
   */
  async getThemeCSSVariables(): Promise<string> {
    // 确保当前主题已加载
    if (!this._loadedThemes.has(this._currentTheme)) {
      try {
        await this.loadTheme(this._currentTheme)
      }
      catch (error) {
        console.error(`Failed to load theme for CSS variables: ${this._currentTheme}`, error)
        return ''
      }
    }

    return this.getCssVars(this._currentTheme)
  }

  /**
   * 使用当前主题高亮代码（同步版本）
   * 同步高亮代码，要求主题和语言已经预加载
   */
  highlightCode(code: string, language: string): string {
    if (!this._highlighter || !language) {
      return escapeHtml(code)
    }

    try {
      // 检查主题是否已加载
      if (!this._loadedThemes.has(this._currentTheme)) {
        console.warn(`Theme not loaded: ${this._currentTheme}, falling back to escaped HTML`)
        return escapeHtml(code)
      }

      // 检查语言是否已加载
      if (!this._loadedLanguages.has(language)) {
        console.warn(`Language not loaded: ${language}, falling back to escaped HTML`)
        return escapeHtml(code)
      }

      const highlighted = this._highlighter.codeToHtml(code, {
        lang: language,
        theme: this._currentTheme,
      })

      // 确保返回的是字符串类型
      if (typeof highlighted === 'string') {
        return highlighted
      }
      else {
        console.warn(`Highlighted result is not a string: ${typeof highlighted}`)
        return escapeHtml(code)
      }
    }
    catch (error) {
      console.warn(`Failed to highlight code for language: ${language}`, error)
      // 如果失败，返回简单的HTML转义代码
      return escapeHtml(code)
    }
  }

  /**
   * 使用当前主题高亮代码（异步版本）
   * 异步高亮代码，会动态加载所需的主题和语言
   */
  async highlightCodeAsync(code: string, language: string): Promise<string> {
    if (!this._highlighter || !language) {
      return escapeHtml(code)
    }

    try {
      // 检查主题是否已加载
      if (!this._loadedThemes.has(this._currentTheme)) {
        await this.loadTheme(this._currentTheme)
      }

      // 检查语言是否已加载
      if (!this._loadedLanguages.has(language)) {
        await this.loadLanguage(language)
      }

      const highlighted = this._highlighter.codeToHtml(code, {
        lang: language,
        theme: this._currentTheme,
      })

      // 确保返回的是字符串类型
      if (typeof highlighted === 'string') {
        return highlighted
      }
      else {
        console.warn(`Highlighted result is not a string: ${typeof highlighted}`)
        return escapeHtml(code)
      }
    }
    catch (error) {
      console.warn(`Failed to highlight code for language: ${language}`, error)
      // 如果失败，返回简单的HTML转义代码
      return escapeHtml(code)
    }
  }

  /**
   * 动态加载指定的主题
   */
  private async loadTheme(theme: string): Promise<void> {
    if (!this._highlighter || this._loadedThemes.has(theme)) {
      return
    }

    try {
      // 首先验证主题是否可用
      const isValid = await this.isValidTheme(theme)
      if (!isValid) {
        throw new Error(`Theme ${theme} is not available in the discovered themes`)
      }

      // 创建一个新的高亮器实例，加载指定主题
      const newHighlighter = await createHighlighter({
        themes: [theme],
        langs: [],
      })

      // 将新主题的数据合并到当前高亮器
      if (newHighlighter) {
        try {
          // 获取主题数据并应用到当前高亮器
          const themeData = (newHighlighter as any).getTheme(theme)
          if (themeData) {
            (this._highlighter as any).setTheme(theme, themeData)
            this._loadedThemes.add(theme)
            console.warn(`Theme loaded: ${theme}`)
          }
          else {
            throw new Error(`Could not get theme data for ${theme}`)
          }
        }
        catch (themeError) {
          console.warn(`Could not load theme ${theme} using getTheme, trying alternative method`, themeError)

          // 如果获取主题数据失败，尝试直接加载主题
          await (this._highlighter as any).loadTheme(theme)
          this._loadedThemes.add(theme)
          console.warn(`Theme loaded using loadTheme: ${theme}`)
        }
      }
    }
    catch (error) {
      console.error(`Failed to load theme: ${theme}`, error)
      throw error
    }
  }

  /**
   * 加载指定的语言
   */
  private async loadLanguage(language: string): Promise<void> {
    if (!this._highlighter || this._loadedLanguages.has(language)) {
      return
    }

    try {
      // 创建一个新的高亮器实例，加载指定语言
      const newHighlighter = await createHighlighter({
        themes: [],
        langs: [language],
      })

      // 将新语言的数据合并到当前高亮器
      if (newHighlighter) {
        // 直接尝试加载语言，不再检查 getLoadedLanguages
        try {
          (this._highlighter as any).loadLanguage(language)
          this._loadedLanguages.add(language)
          console.warn(`Language loaded: ${language}`)
        }
        catch (langError) {
          console.warn(`Could not load language ${language} directly, trying alternative method`, langError)

          // 如果直接加载失败，尝试从 shiki 内置语言中加载
          if (SUPPORTED_LANGUAGES.includes(language as any)) {
            await (this._highlighter as any).loadLanguage(language)
            this._loadedLanguages.add(language)
            console.warn(`Language loaded from supported languages: ${language}`)
          }
          else {
            throw new Error(`Language ${language} is not supported`)
          }
        }
      }
    }
    catch (error) {
      console.error(`Failed to load language: ${language}`, error)
      throw error
    }
  }

  get currentTheme(): string {
    return this._currentTheme
  }

  get highlighter(): Highlighter | undefined {
    return this._highlighter
  }

  /**
   * 动态发现和缓存所有可用主题
   */
  async discoverAndCacheThemes(): Promise<void> {
    try {
      console.warn('开始动态发现主题...')
      const startTime = Date.now()

      // 清空现有缓存
      this._themeCache.metadata.clear()

      // 获取所有可用的主题模块
      const themeEntries = Object.entries(bundledThemes)
      console.warn(`发现 ${themeEntries.length} 个主题模块`)

      // 并行加载所有主题元数据
      const themePromises = themeEntries.map(async ([themeName, themeImporter]) => {
        try {
          const themeModule = await themeImporter()
          const themeData = themeModule.default

          if (themeData && themeData.name && ThemeUtils.isValidThemeName(themeData.name)) {
            const metadata: ThemeMetadata = {
              name: themeData.name,
              displayName: themeData.displayName || themeData.name,
              type: (themeData.type === 'light' ? 'light' : 'dark') as 'light' | 'dark',
            }

            this._themeCache.metadata.set(themeData.name, metadata)
            return metadata
          }
        }
        catch (error) {
          console.warn(`加载主题失败: ${themeName}`, error)
          return null
        }
      })

      const results = await Promise.allSettled(themePromises)
      const validThemes = results
        .filter((result): result is PromiseFulfilledResult<ThemeMetadata | null> =>
          result.status === 'fulfilled' && result.value !== null,
        )
        .map(result => result.value!)

      // 分组和排序
      this._themeCache.grouped = ThemeUtils.groupThemesByType(validThemes)
      this._themeCache.loaded = true

      const duration = Date.now() - startTime
      console.warn(`主题发现完成: ${validThemes.length} 个主题，耗时 ${duration}ms`)
      console.warn(`Light主题: ${this._themeCache.grouped.light.length} 个`)
      console.warn(`Dark主题: ${this._themeCache.grouped.dark.length} 个`)
    }
    catch (error) {
      console.error('主题发现过程失败:', error)
      throw error
    }
  }

  /**
   * 获取缓存的主题元数据
   */
  async getCachedThemeMetadata(): Promise<ThemeMetadata[]> {
    if (!this._themeCache.loaded) {
      await this.discoverAndCacheThemes()
    }
    return this._themeCache.grouped.all
  }

  /**
   * 获取分组的主题数据
   */
  async getGroupedThemes(): Promise<GroupedThemes> {
    if (!this._themeCache.loaded) {
      await this.discoverAndCacheThemes()
    }
    return this._themeCache.grouped
  }

  /**
   * 验证主题是否可用（基于缓存）
   */
  async isValidTheme(theme: string): Promise<boolean> {
    if (!this._themeCache.loaded) {
      await this.discoverAndCacheThemes()
    }
    return this._themeCache.metadata.has(theme)
  }

  /**
   * 手动刷新主题缓存（提供外部调用）
   */
  async refreshThemeCache(): Promise<void> {
    console.warn('手动刷新主题缓存...')
    this._themeCache.loaded = false
    await this.discoverAndCacheThemes()
  }

  /**
   * 获取所有可用主题名称（替代原来的常量）
   */
  async getAvailableThemeNames(): Promise<string[]> {
    const metadata = await this.getCachedThemeMetadata()
    return metadata.map(theme => theme.name)
  }

  /**
   * 预加载额外的语言以提升同步性能
   */
  async preloadLanguage(language: string): Promise<void> {
    if (!this._loadedLanguages.has(language)) {
      try {
        await this.loadLanguage(language)
      }
      catch (error) {
        console.warn(`Failed to preload language: ${language}`, error)
      }
    }
  }

  async preloadLanguages(languages: string[]): Promise<void> {
    const promises = languages.map(lang => this.preloadLanguage(lang))
    await Promise.allSettled(promises)
  }

  dispose(): void {
    this._highlighter = undefined
  }
}
