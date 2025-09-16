import chroma from 'chroma-js'
import { adjustContrastColor, getContrastRatio, isDarkColor, toCssVarsStr } from './color-utils'

const ALPHA = {
  DARK: [0.05, 0.08, 0.12, 0.16, 0.20],
  LIGHT: [0.04, 0.07, 0.10, 0.13, 0.16],
}
// 定义回退颜色常量
const DARK_FALLBACKS = {
  tableHeader: '#2d3748',
  codeBlock: '#1a202c',
  tableBorder: 'rgba(255, 255, 255, 0.3)',
  blockQuoteBackgrounds: ALPHA.DARK.map(alpha => `rgba(255, 255, 255, ${alpha})`),
  blockQuoteBorder: 'rgba(255, 255, 255, 0.3)',
}

const LIGHT_FALLBACKS = {
  tableHeader: '#f7fafc',
  codeBlock: '#f7fafc',
  tableBorder: 'rgba(0, 0, 0, 0.3)',
  blockQuoteBackgrounds: ALPHA.LIGHT.map(alpha => `rgba(74, 85, 104, ${alpha})`),
  blockQuoteBorder: 'rgba(0, 0, 0, 0.3)',
}

export function generateBlockquoteBorderColor(
  backgroundColor: string,
  borderColor?: string,
  minContrast: number = 3.0,
): string {
  try {
    const bgColor = chroma(backgroundColor)
    const isDark = isDarkColor(backgroundColor)

    if (borderColor) {
      try {
        const currentBorder = chroma(borderColor)
        const contrast = getContrastRatio(bgColor, currentBorder)
        if (contrast >= minContrast) {
          return borderColor
        }
      }
      catch {
        console.warn('无效的边框颜色:', borderColor)
      }
    }

    if (isDark) {
      const lightness = bgColor.get('hsl.l')
      let borderLightness = Math.min(lightness + 0.3, 0.8)

      for (let i = 0; i < 10; i++) {
        const testBorder = bgColor.set('hsl.l', borderLightness)
        const contrast = getContrastRatio(bgColor, testBorder)
        if (contrast >= minContrast) {
          return testBorder.hex()
        }
        borderLightness = Math.min(borderLightness + 0.1, 0.9)
      }
      return 'rgba(255, 255, 255, 0.4)'
    }
    else {
      const lightness = bgColor.get('hsl.l')
      let borderLightness = Math.max(lightness - 0.3, 0.1)

      for (let i = 0; i < 10; i++) {
        const testBorder = bgColor.set('hsl.l', borderLightness)
        const contrast = getContrastRatio(bgColor, testBorder)
        if (contrast >= minContrast) {
          return testBorder.hex()
        }
        borderLightness = Math.max(borderLightness - 0.1, 0.05)
      }
      return 'rgba(0, 0, 0, 0.4)'
    }
  }
  catch (error) {
    console.error('生成边框颜色失败:', error)
    return isDarkColor(backgroundColor)
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)'
  }
}

export function generateBlockquoteColors(baseColor: string, levels: number = 5): string[] {
  try {
    const base = chroma(baseColor)
    const isDark = isDarkColor(baseColor)
    const colors: string[] = []

    const baseAlpha = isDark ? 0.08 : 0.05
    const alphaStep = 0.03

    let overlayColor: chroma.Color
    if (isDark) {
      overlayColor = chroma('#ffffff')
    }
    else {
      overlayColor = chroma('#4a5568')
    }

    for (let i = 0; i < levels; i++) {
      const alpha = baseAlpha + (alphaStep * i)
      const mixRatio = Math.min(alpha * 2, 0.4)
      const levelColor = chroma.mix(base, overlayColor, mixRatio, 'lab')
      colors.push(levelColor.hex())
    }

    return colors
  }
  catch (error) {
    console.error('生成blockquote颜色失败:', error)
    const isDark = isDarkColor(baseColor)
    if (isDark) {
      return DARK_FALLBACKS.blockQuoteBackgrounds
    }
    else {
      return LIGHT_FALLBACKS.blockQuoteBackgrounds
    }
  }
}

export function generateSelectionBackgroundColor(
  foregroundColor: string,
  selectionBackground?: string,
  minContrast: number = 3.0,
): string {
  try {
    const fgColor = chroma(foregroundColor)
    const isDarkForeground = isDarkColor(foregroundColor)

    if (selectionBackground) {
      try {
        const currentSelection = chroma(selectionBackground)
        const contrast = getContrastRatio(currentSelection, fgColor)
        if (contrast >= minContrast) {
          return selectionBackground
        }
      }
      catch {
        console.warn('无效的选择背景色:', selectionBackground)
      }
    }

    if (isDarkForeground) {
      const lightness = fgColor.get('hsl.l')
      let bgLightness = Math.max(lightness + 0.4, 0.7)

      for (let i = 0; i < 10; i++) {
        const testBg = fgColor.set('hsl.l', bgLightness).alpha(0.3)
        const contrast = getContrastRatio(testBg, fgColor)
        if (contrast >= minContrast) {
          return testBg.css()
        }
        bgLightness = Math.min(bgLightness + 0.05, 0.95)
      }
      return 'rgba(255, 255, 255, 0.3)'
    }
    else {
      const lightness = fgColor.get('hsl.l')
      let bgLightness = Math.min(lightness - 0.4, 0.3)

      for (let i = 0; i < 10; i++) {
        const testBg = fgColor.set('hsl.l', bgLightness).alpha(0.4)
        const contrast = getContrastRatio(testBg, fgColor)
        if (contrast >= minContrast) {
          return testBg.css()
        }
        bgLightness = Math.max(bgLightness - 0.05, 0.05)
      }
      return 'rgba(0, 0, 0, 0.4)'
    }
  }
  catch (error) {
    console.error('生成选择背景色失败:', error)
    return isDarkColor(foregroundColor)
      ? 'rgba(255, 255, 255, 0.25)'
      : 'rgba(0, 0, 0, 0.25)'
  }
}

export function generateEnhancedColors(
  themeColors: Record<string, string>,
  isDark: boolean,
): string {
  const enhanced: Record<string, string> = {}
  const fallbacks = isDark ? DARK_FALLBACKS : LIGHT_FALLBACKS

  const foreground = themeColors['editor.foreground']
  const background = themeColors['editor.background']

  if (!background) {
    console.warn('No background color found, using fallback')
    // 使用回退背景色
    const fallbackBackground = isDark ? '#1e1e1e' : '#ffffff'
    enhanced['markdown.tableHeader.background'] = adjustContrastColor(fallbackBackground)
    enhanced['markdown.codeBlock.background'] = adjustContrastColor(fallbackBackground)
    enhanced['markdown.blockQuote.background'] = fallbackBackground
    enhanced['markdown.blockQuote.border'] = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
    enhanced['markdown.table.border'] = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
    return toCssVarsStr(enhanced)
  }

  try {
    // 表格和代码块背景
    enhanced['markdown.tableHeader.background'] = adjustContrastColor(background)
    enhanced['markdown.codeBlock.background'] = adjustContrastColor(background)

    const textLinkForeground = themeColors['textLink.foreground'] || foreground
    if (textLinkForeground) {
      try {
        const codeBackground = chroma(textLinkForeground).alpha(0.2).css()
        enhanced['markdown.code.background'] = codeBackground
      }
      catch {
        enhanced['markdown.code.background'] = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }
    }

    // 引用块颜色
    const blockquoteColors = generateBlockquoteColors(background, 5)
    for (let i = 0; i < 5; i++) {
      enhanced[`markdown.blockQuote.background.level${i + 1}`] = blockquoteColors[i]
    }
    enhanced['markdown.blockQuote.background'] = blockquoteColors[0]

    // 引用块边框
    const originalBorderColor = themeColors['panel.border'] || themeColors['editor.foreground']
    enhanced['markdown.blockQuote.border'] = generateBlockquoteBorderColor(
      background,
      originalBorderColor,
      3.0,
    )

    // 表格边框
    try {
      enhanced['markdown.table.border'] = chroma(enhanced['markdown.blockQuote.border']).alpha(0.5).css()
    }
    catch {
      enhanced['markdown.table.border'] = fallbacks.tableBorder
    }

    // 选择背景
    if (foreground) {
      const originalSelectionBackground = themeColors['editor.selectionBackground']
      enhanced['editor.selectionBackground'] = generateSelectionBackgroundColor(
        foreground,
        originalSelectionBackground,
        3.0,
      )
    }
  }
  catch (error) {
    console.error('Error generating enhanced colors:', error)
  }

  const enhancedCssVars = toCssVarsStr(enhanced)

  return enhancedCssVars
}
