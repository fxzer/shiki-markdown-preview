import * as vscode from 'vscode'

/**
 * 统一错误处理工具类
 * 提供标准化的错误处理、日志记录和用户通知功能
 */
export class ErrorHandler {
  private static readonly LOG_PREFIX = '[ShikiMarkdownPreview]'

  /**
   * 记录错误日志
   * @param message 错误消息
   * @param error 错误对象
   * @param context 上下文信息
   */
  static logError(message: string, error?: any, context?: string): void {
    const contextInfo = context ? ` [${context}]` : ''
    console.error(`${this.LOG_PREFIX}${contextInfo} ${message}`, error || '')
  }

  /**
   * 记录警告日志
   * @param message 警告消息
   * @param context 上下文信息
   */
  static logWarning(message: string, context?: string): void {
    const contextInfo = context ? ` [${context}]` : ''
    console.warn(`${this.LOG_PREFIX}${contextInfo} ${message}`)
  }

  /**
   * 记录信息日志
   * @param message 信息消息
   * @param context 上下文信息
   */
  static logInfo(message: string, context?: string): void {
    const contextInfo = context ? ` [${context}]` : ''
    console.warn(`${this.LOG_PREFIX}${contextInfo} ${message}`)
  }

  /**
   * 显示错误消息给用户
   * @param message 错误消息
   * @param showInPanel 是否在面板中显示（可选）
   */
  static async showError(message: string, showInPanel?: boolean): Promise<void> {
    if (showInPanel) {
      // 如果需要在面板中显示，这里可以扩展
      vscode.window.showErrorMessage(message)
    }
    else {
      vscode.window.showErrorMessage(message)
    }
  }

  /**
   * 显示信息消息给用户
   * @param message 信息消息
   */
  static showInfo(message: string): void {
    vscode.window.showInformationMessage(message)
  }

  /**
   * 显示警告消息给用户
   * @param message 警告消息
   */
  static showWarning(message: string): void {
    vscode.window.showWarningMessage(message)
  }

  /**
   * 安全执行异步操作，自动处理错误
   * @param operation 要执行的操作
   * @param errorMessage 错误消息
   * @param context 上下文信息
   * @returns 操作结果或 null（如果失败）
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    context?: string,
  ): Promise<T | null> {
    try {
      return await operation()
    }
    catch (error) {
      this.logError(errorMessage, error, context)
      return null
    }
  }

  /**
   * 安全执行同步操作，自动处理错误
   * @param operation 要执行的操作
   * @param errorMessage 错误消息
   * @param context 上下文信息
   * @param defaultValue 失败时的默认值
   * @returns 操作结果或默认值
   */
  static safeExecuteSync<T>(
    operation: () => T,
    errorMessage: string,
    context?: string,
    defaultValue?: T,
  ): T | undefined {
    try {
      return operation()
    }
    catch (error) {
      this.logError(errorMessage, error, context)
      return defaultValue
    }
  }

  /**
   * 处理主题相关错误
   * @param error 错误对象
   * @param themeName 主题名称
   * @param operation 操作类型
   */
  static handleThemeError(error: any, themeName: string, operation: string): void {
    const message = `主题${operation}失败: ${themeName}`
    this.logError(message, error, 'ThemeService')
    this.showError(message)
  }

  /**
   * 处理文件操作错误
   * @param error 错误对象
   * @param filePath 文件路径
   * @param operation 操作类型
   */
  static handleFileError(error: any, filePath: string, operation: string): void {
    const message = `文件${operation}失败: ${filePath}`
    this.logError(message, error, 'FileOperation')
    this.showError(message)
  }

  /**
   * 处理渲染错误
   * @param error 错误对象
   * @param context 渲染上下文
   */
  static handleRenderError(error: any, context: string): void {
    const message = `渲染失败: ${context}`
    this.logError(message, error, 'MarkdownRenderer')
    this.showError(message)
  }
}
