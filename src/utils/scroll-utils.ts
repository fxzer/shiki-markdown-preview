import * as vscode from 'vscode'

/**
 * 获取编辑器顶部可见行（支持小数行号）
 */
export function getTopVisibleLine(editor: vscode.TextEditor): number | undefined {
  if (!editor.visibleRanges.length) {
    return undefined
  }

  const firstVisiblePosition = editor.visibleRanges[0].start
  const lineNumber = firstVisiblePosition.line
  const line = editor.document.lineAt(lineNumber)
  const progress = firstVisiblePosition.character / (line.text.length + 2)
  return lineNumber + progress // 返回小数行号
}

/**
 * 获取编辑器底部可见行
 */
export function getBottomVisibleLine(editor: vscode.TextEditor): number | undefined {
  if (!editor.visibleRanges.length) {
    return undefined
  }

  const lastVisiblePosition = editor.visibleRanges[editor.visibleRanges.length - 1].end
  const lineNumber = lastVisiblePosition.line
  let text = ''
  if (lineNumber < editor.document.lineCount) {
    text = editor.document.lineAt(lineNumber).text
  }
  const progress = lastVisiblePosition.character / (text.length + 2)
  return lineNumber + progress
}

/**
 * 根据小数行号滚动到精确位置
 */
export function revealLinePrecise(editor: vscode.TextEditor, line: number): void {
  const sourceLine = Math.min(Math.floor(line), editor.document.lineCount - 1)
  const fraction = line - sourceLine
  const text = editor.document.lineAt(sourceLine).text
  const start = Math.floor(fraction * text.length)

  // 滚动到指定位置
  editor.revealRange(
    new vscode.Range(sourceLine, start, sourceLine + 1, 0),
    vscode.TextEditorRevealType.InCenter,
  )
}

/**
 * 计算预览区的滚动百分比到编辑器行号的映射
 */
export function calculateEditorLineFromScrollPercentage(
  scrollPercentage: number,
  totalLines: number,
): number {
  if (totalLines === 0) {
    return 0
  }

  // 使用更精确的计算，考虑小数行号
  const targetLine = scrollPercentage * (totalLines - 1)
  return Math.max(0, Math.min(targetLine, totalLines - 1))
}

/**
 * 计算编辑器行号到预览区滚动百分比的映射
 */
export function calculateScrollPercentageFromEditorLine(
  line: number,
  totalLines: number,
): number {
  if (totalLines <= 1) {
    return 0
  }

  return Math.max(0, Math.min(1, line / (totalLines - 1)))
}
