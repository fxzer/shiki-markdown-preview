import * as vscode from 'vscode'
import { ErrorHandler } from './error-handler'

/**
 * 文档验证工具类
 * 提供统一的文档验证和检查功能
 */
export class DocumentValidator {
  /**
   * 检查编辑器是否为 Markdown 文档
   * @param editor 文本编辑器
   * @returns 是否为 Markdown 文档
   */
  static isMarkdownEditor(editor?: vscode.TextEditor): boolean {
    return editor?.document.languageId === 'markdown'
  }

  /**
   * 检查文档是否为 Markdown 文档
   * @param document 文本文档
   * @returns 是否为 Markdown 文档
   */
  static isMarkdownDocument(document?: vscode.TextDocument): boolean {
    return document?.languageId === 'markdown'
  }

  /**
   * 获取当前活动的 Markdown 编辑器
   * @returns 活动的 Markdown 编辑器或 undefined
   */
  static getActiveMarkdownEditor(): vscode.TextEditor | undefined {
    const activeEditor = vscode.window.activeTextEditor
    return this.isMarkdownEditor(activeEditor) ? activeEditor : undefined
  }

  /**
   * 获取当前活动的 Markdown 文档
   * @returns 活动的 Markdown 文档或 undefined
   */
  static getActiveMarkdownDocument(): vscode.TextDocument | undefined {
    const activeEditor = this.getActiveMarkdownEditor()
    return activeEditor?.document
  }

  /**
   * 验证并获取 Markdown 文档，如果无效则显示提示
   * @param document 要验证的文档（可选）
   * @param showMessage 是否显示提示消息
   * @returns 有效的 Markdown 文档或 undefined
   */
  static validateMarkdownDocument(
    document?: vscode.TextDocument,
    showMessage: boolean = true,
  ): vscode.TextDocument | undefined {
    const targetDocument = document || this.getActiveMarkdownDocument()

    if (!targetDocument) {
      if (showMessage) {
        ErrorHandler.showInfo('请先打开一个 Markdown 文件')
      }
      return undefined
    }

    if (!this.isMarkdownDocument(targetDocument)) {
      if (showMessage) {
        ErrorHandler.showInfo('请先打开一个 Markdown 文件')
      }
      return undefined
    }

    return targetDocument
  }

  /**
   * 检查文档是否有效且可编辑
   * @param document 文档
   * @returns 是否有效且可编辑
   */
  static isDocumentEditable(document?: vscode.TextDocument): boolean {
    if (!document)
      return false
    return !document.isClosed && !document.isUntitled
  }

  /**
   * 检查文档是否有未保存的更改
   * @param document 文档
   * @returns 是否有未保存的更改
   */
  static hasUnsavedChanges(document?: vscode.TextDocument): boolean {
    if (!document)
      return false
    return document.isDirty
  }

  /**
   * 获取文档的基本信息
   * @param document 文档
   * @returns 文档信息对象
   */
  static getDocumentInfo(document?: vscode.TextDocument): {
    fileName: string
    languageId: string
    isMarkdown: boolean
    isEditable: boolean
    hasUnsavedChanges: boolean
    lineCount: number
    size: number
  } | null {
    if (!document)
      return null

    return {
      fileName: document.fileName,
      languageId: document.languageId,
      isMarkdown: this.isMarkdownDocument(document),
      isEditable: this.isDocumentEditable(document),
      hasUnsavedChanges: this.hasUnsavedChanges(document),
      lineCount: document.lineCount,
      size: document.getText().length,
    }
  }

  /**
   * 等待文档保存（如果文档有未保存的更改）
   * @param document 文档
   * @param timeout 超时时间（毫秒）
   * @returns Promise<boolean> 是否成功保存
   */
  static async waitForDocumentSave(
    document: vscode.TextDocument,
    timeout: number = 5000,
  ): Promise<boolean> {
    if (!this.hasUnsavedChanges(document)) {
      return true
    }

    return new Promise((resolve) => {
      const startTime = Date.now()

      const checkSave = () => {
        if (!this.hasUnsavedChanges(document)) {
          resolve(true)
          return
        }

        if (Date.now() - startTime > timeout) {
          ErrorHandler.logWarning(`文档保存超时: ${document.fileName}`, 'DocumentValidator')
          resolve(false)
          return
        }

        setTimeout(checkSave, 100)
      }

      checkSave()
    })
  }
}
