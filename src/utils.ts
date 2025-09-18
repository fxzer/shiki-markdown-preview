
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// 查找当前主题的辅助函数
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
