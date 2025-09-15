import type { Highlighter } from 'shiki'
import type { AvailableTheme } from '../constants'
import { createHighlighter } from 'shiki'
import * as vscode from 'vscode'
import { AVAILABLE_THEMES, CONFIG_KEYS, DEFAULT_THEME, EXTENSION_CONFIG, SUPPORTED_LANGUAGES } from '../constants'
import { ThemeProvider } from '../theme-provider'

export class ThemeService {
  private _highlighter: Highlighter | undefined
  private _themeProvider: ThemeProvider | undefined
  private _currentTheme: string

  constructor() {
    this._currentTheme = this.getConfiguredTheme()
  }

  /**
   * Initialize the highlighter with all available themes and languages
   */
  async initializeHighlighter(): Promise<void> {
    try {
      this._highlighter = await createHighlighter({
        themes: [...AVAILABLE_THEMES],
        langs: [...SUPPORTED_LANGUAGES],
      })

      if (this._highlighter) {
        this._themeProvider = new ThemeProvider(this._highlighter)
      }
    }
    catch (error) {
      console.error('Failed to initialize highlighter:', error)
      throw error
    }
  }

  /**
   * Get the current theme from configuration
   */
  getConfiguredTheme(): string {
    const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG.SECTION)
    return config.get(CONFIG_KEYS.CURRENT_THEME, DEFAULT_THEME)
  }

  /**
   * Validate if a theme is available
   */
  isValidTheme(theme: string): theme is AvailableTheme {
    return (AVAILABLE_THEMES as readonly string[]).includes(theme)
  }

  /**
   * Change the current theme and update configuration
   */
  async changeTheme(theme: string): Promise<boolean> {
    if (!this.isValidTheme(theme)) {
      vscode.window.showErrorMessage(`Invalid theme: ${theme}`)
      return false
    }

    this._currentTheme = theme

    // Update configuration
    const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG.SECTION)
    try {
      await config.update(CONFIG_KEYS.CURRENT_THEME, theme, vscode.ConfigurationTarget.Global)
      return true
    }
    catch (error) {
      console.error('Failed to update theme configuration:', error)
      return false
    }
  }

  /**
   * Update theme for preview (without saving configuration)
   */
  updateThemeForPreview(theme: string): boolean {
    if (!this.isValidTheme(theme)) {
      console.warn(`Invalid theme: ${theme}`)
      return false
    }

    this._currentTheme = theme
    return true
  }

  /**
   * Get CSS variables for the current theme
   */
  getThemeCSSVariables(): string {
    return this._themeProvider?.getCssVars(this._currentTheme) || ''
  }

  /**
   * Highlight code with the current theme
   */
  highlightCode(code: string, language: string): string {
    if (!this._highlighter || !language) {
      return ''
    }

    try {
      return this._highlighter.codeToHtml(code, {
        lang: language,
        theme: this._currentTheme,
      })
    }
    catch (error) {
      console.warn(`Failed to highlight code for language: ${language}`, error)
      throw error
    }
  }

  /**
   * Get the current theme
   */
  get currentTheme(): string {
    return this._currentTheme
  }

  /**
   * Get the highlighter instance
   */
  get highlighter(): Highlighter | undefined {
    return this._highlighter
  }

  /**
   * Get the theme provider instance
   */
  get themeProvider(): ThemeProvider | undefined {
    return this._themeProvider
  }

  /**
   * Get all available themes
   */
  get availableThemes(): readonly AvailableTheme[] {
    return AVAILABLE_THEMES
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Highlighter doesn't have a dispose method, but we can clear the reference
    this._highlighter = undefined
    this._themeProvider = undefined
  }
}
