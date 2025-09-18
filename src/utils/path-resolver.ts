import * as vscode from 'vscode'
import { ErrorHandler } from './error-handler'

/**
 * 路径解析工具类
 * 提供统一的路径解析、验证和安全检查功能
 */
export class PathResolver {
  // 允许的文件扩展名
  private static readonly ALLOWED_EXTENSIONS = [
    '.md',
    '.markdown',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.xml',
    '.csv',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
  ]

  // 非法字符正则表达式
  private static readonly ILLEGAL_CHARS = /[<>:"|?*]/

  /**
   * 验证和规范化文件路径，防止路径遍历攻击
   * @param basePath 基础路径
   * @param relativePath 相对路径
   * @returns 规范化后的安全路径，如果路径不安全则返回 null
   */
  static validateAndResolvePath(basePath: vscode.Uri, relativePath: string): vscode.Uri | null {
    return ErrorHandler.safeExecuteSync(
      () => this._validateAndResolvePathInternal(basePath, relativePath),
      `路径验证失败: ${relativePath}`,
      'PathResolver',
      null,
    ) ?? null
  }

  /**
   * 内部路径验证和解析逻辑
   */
  private static _validateAndResolvePathInternal(basePath: vscode.Uri, relativePath: string): vscode.Uri | null {
    // 解码 URL 编码的字符
    const decodedPath = decodeURIComponent(relativePath)

    // 检查路径是否包含可疑字符
    if (decodedPath.includes('..') || decodedPath.includes('~') || decodedPath.startsWith('/')) {
      ErrorHandler.logWarning(`检测到潜在的路径遍历攻击: ${relativePath}`, 'PathResolver')
      return null
    }

    // 检查路径是否包含非法字符
    if (this.ILLEGAL_CHARS.test(decodedPath)) {
      ErrorHandler.logWarning(`路径包含非法字符: ${relativePath}`, 'PathResolver')
      return null
    }

    // 检查文件扩展名
    const fileExtension = this.getFileExtension(decodedPath)
    if (fileExtension && !this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      ErrorHandler.logWarning(`不允许的文件扩展名: ${fileExtension}`, 'PathResolver')
      return null
    }

    // 解析相对路径
    const resolvedPath = vscode.Uri.joinPath(basePath, decodedPath)

    // 规范化路径并检查是否仍在基础路径下
    const normalizedBasePath = basePath.fsPath.replace(/[/\\]+$/, '')
    const normalizedResolvedPath = resolvedPath.fsPath.replace(/[/\\]+$/, '')

    // 确保解析后的路径仍然在基础路径下
    if (!normalizedResolvedPath.startsWith(normalizedBasePath)) {
      ErrorHandler.logWarning(`路径遍历尝试检测: ${relativePath} 解析为 ${normalizedResolvedPath}`, 'PathResolver')
      return null
    }

    return resolvedPath
  }

  /**
   * 获取文件扩展名
   * @param filePath 文件路径
   * @returns 文件扩展名（小写）
   */
  private static getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.')
    if (lastDotIndex === -1)
      return ''
    return filePath.substring(lastDotIndex).toLowerCase()
  }

  /**
   * 解析相对路径（简化版本，用于 Markdown 渲染器）
   * @param baseDocument 基础文档
   * @param relativePath 相对路径
   * @returns 解析后的 URI 或 null
   */
  static resolveRelativePath(baseDocument: vscode.TextDocument, relativePath: string): string | null {
    return ErrorHandler.safeExecuteSync(
      () => {
        const documentDir = vscode.Uri.joinPath(baseDocument.uri, '..')
        const resolvedUri = vscode.Uri.joinPath(documentDir, relativePath)
        return resolvedUri.toString()
      },
      `相对路径解析失败: ${relativePath}`,
      'PathResolver',
      null,
    ) ?? null
  }

  /**
   * 检查文件是否存在
   * @param fileUri 文件 URI
   * @returns Promise<boolean>
   */
  static async fileExists(fileUri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(fileUri)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 安全地打开文件
   * @param fileUri 文件 URI
   * @param viewColumn 视图列
   * @returns Promise<boolean> 是否成功打开
   */
  static async openFileSafely(fileUri: vscode.Uri, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One): Promise<boolean> {
    return ErrorHandler.safeExecute(
      async () => {
        const document = await vscode.workspace.openTextDocument(fileUri)
        await vscode.window.showTextDocument(document, viewColumn)
        return true
      },
      `无法打开文件: ${fileUri.fsPath}`,
      'PathResolver',
    ) !== null
  }
}
