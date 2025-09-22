import chroma from 'chroma-js'
import { adjustContrastColor, generateColorLevels, getContrastRatio, isDarkColor, toCssVarsStr } from './color-handler'

/**
 * 透明度常量配置
 * 用于生成不同层级的背景色透明度
 */
const ALPHA = {
  /** 暗色主题的透明度级别 */
  DARK: [0.05, 0.08, 0.12, 0.16, 0.20],
  /** 亮色主题的透明度级别 */
  LIGHT: [0.04, 0.07, 0.10, 0.13, 0.16],
}

/**
 * 暗色主题的回退颜色常量
 * 当主题颜色解析失败时使用的默认颜色
 */
const DARK_FALLBACKS = {
  tableHeader: '#2d3748',
  codeBlock: '#1a202c',
  tableBorder: 'rgba(255, 255, 255, 0.3)',
  blockQuoteBackgrounds: ALPHA.DARK.map(alpha => `rgba(255, 255, 255, ${alpha})`),
  blockQuoteBorder: 'rgba(255, 255, 255, 0.3)',
}

/**
 * 亮色主题的回退颜色常量
 * 当主题颜色解析失败时使用的默认颜色
 */
const LIGHT_FALLBACKS = {
  tableHeader: '#f7fafc',
  codeBlock: '#f7fafc',
  tableBorder: 'rgba(0, 0, 0, 0.3)',
  blockQuoteBackgrounds: ALPHA.LIGHT.map(alpha => `rgba(74, 85, 104, ${alpha})`),
  blockQuoteBorder: 'rgba(0, 0, 0, 0.3)',
}
/**
 * 生成引用块边框颜色
 * 根据背景色自动计算合适的边框颜色，确保足够的对比度
 *
 * @param backgroundColor - 背景颜色
 * @param borderColor - 可选的原始边框颜色，如果对比度足够则直接使用
 * @param minContrast - 最小对比度要求，默认为 3.0
 * @returns 生成的边框颜色字符串
 */
/**
 * 验证边框颜色是否有效且满足对比度要求
 *
 * @param backgroundColor - 背景颜色
 * @param borderColor - 边框颜色
 * @param minContrast - 最小对比度要求
 * @returns 如果边框颜色有效且满足对比度要求则返回true，否则返回false
 */
export function isValidBorderColor(
  backgroundColor: string,
  borderColor: string,
  minContrast: number = 3.0,
): boolean {
  if (!borderColor)
    return false

  try {
    const bgColor = chroma(backgroundColor)
    const currentBorder = chroma(borderColor)

    // 检查透明度，如果完全透明则视为无效
    const alpha = currentBorder.alpha()
    if (alpha <= 0.6)
      return false

    // 检查对比度是否满足要求
    const contrast = getContrastRatio(bgColor, currentBorder)
    return contrast >= minContrast
  }
  catch {
    return false
  }
}

/**
 * 生成引用块边框颜色
 * 根据背景色自动计算合适的边框颜色，确保足够的对比度
 *
 * @param backgroundColor - 背景颜色
 * @param borderColor - 可选的原始边框颜色，如果对比度足够则直接使用
 * @param minContrast - 最小对比度要求，默认为 3.0
 * @returns 生成的边框颜色字符串
 */
export function generateBlockquoteBorderColor(
  backgroundColor: string,
  borderColor?: string,
  minContrast: number = 3.0,
): string {
  try {
    const bgColor = chroma(backgroundColor)
    const isDark = isDarkColor(backgroundColor)

    // 首先验证提供的边框颜色是否有效
    if (borderColor && isValidBorderColor(backgroundColor, borderColor, minContrast)) {
      return borderColor
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

/**
 * 生成引用块的多层级背景颜色
 * 根据基础颜色生成不同层级的引用块背景色，用于嵌套引用
 *
 * @param baseColor - 基础背景颜色
 * @param levels - 生成的层级数量，默认为 5
 * @returns 生成的背景颜色数组，按层级从浅到深排序
 */
export function generateBlockquoteColors(baseColor: string, levels: number = 5): string[] {
  try {
    const isDark = isDarkColor(baseColor)
    const baseAlpha = isDark ? 0.08 : 0.05
    const alphaStep = 0.03
    const overlayColor = isDark ? '#ffffff' : '#4a5568'

    return generateColorLevels(
      baseColor,
      overlayColor,
      levels,
      baseAlpha,
      alphaStep,
      0.4,
    )
  }
  catch (error) {
    console.error('生成blockquote颜色失败:', error)
    const isDark = isDarkColor(baseColor)
    return isDark
      ? DARK_FALLBACKS.blockQuoteBackgrounds
      : LIGHT_FALLBACKS.blockQuoteBackgrounds
  }
}

/**
 * 高对比度背景配置接口
 */
interface ContrastBackgroundConfig {
  lightnessOffset: number
  alpha: number
  step: number
  maxIterations: number
  minLightness?: number
  maxLightness?: number
}

/**
 * 生成高对比度背景颜色
 * 根据前景色自动计算合适的背景色，确保足够的对比度
 *
 * @param foregroundColor - 前景颜色（文本颜色）
 * @param existingBackground - 可选的现有背景色
 * @param minContrast - 最小对比度要求
 * @param lightBgConfig - 亮色背景配置对象
 * @param darkBgConfig - 暗色背景配置对象
 * @param fallbackColors - 回退颜色配置对象
 * @param fallbackColors.light - 亮色主题的回退颜色
 * @param fallbackColors.dark - 暗色主题的回退颜色
 * @returns 生成的背景颜色字符串
 */
export function generateHighContrastBackground(
  foregroundColor: string,
  existingBackground: string | undefined,
  minContrast: number,
  lightBgConfig: ContrastBackgroundConfig,
  darkBgConfig: ContrastBackgroundConfig,
  fallbackColors: {
    light: string
    dark: string
  },
): string {
  const isDarkForeground = isDarkColor(foregroundColor)

  try {
    const fgColor = chroma(foregroundColor)

    // 检查现有背景色是否满足对比度要求
    if (existingBackground) {
      try {
        const currentBg = chroma(existingBackground)
        const contrast = getContrastRatio(currentBg, fgColor)
        if (contrast >= minContrast) {
          return existingBackground
        }
      }
      catch {
      }
    }

    const config = isDarkForeground ? lightBgConfig : darkBgConfig
    const lightness = fgColor.get('hsl.l')

    let bgLightness: number
    if (isDarkForeground) {
      // 对于暗色前景，需要更亮的背景
      const minLightness = config.minLightness ?? 0.7
      bgLightness = Math.max(lightness + config.lightnessOffset, minLightness)
    }
    else {
      // 对于亮色前景，需要更暗的背景
      const maxLightness = config.maxLightness ?? 0.3
      bgLightness = Math.min(lightness - config.lightnessOffset, maxLightness)
    }

    // 迭代调整亮度直到满足对比度要求
    for (let i = 0; i < config.maxIterations; i++) {
      const testBg = fgColor.set('hsl.l', bgLightness).alpha(config.alpha)
      const contrast = getContrastRatio(testBg, fgColor)
      if (contrast >= minContrast) {
        return testBg.css()
      }

      if (isDarkForeground) {
        bgLightness = Math.min(bgLightness + config.step, 0.95)
      }
      else {
        bgLightness = Math.max(bgLightness - config.step, 0.05)
      }
    }

    // 如果迭代失败，返回回退颜色
    return isDarkForeground ? fallbackColors.light : fallbackColors.dark
  }
  catch (error) {
    console.error('生成高对比度背景色失败:', error)
    return isDarkForeground ? fallbackColors.light : fallbackColors.dark
  }
}

/**
 * 生成文本选择背景颜色
 * 根据前景色自动计算合适的文本选择背景色，确保足够的对比度
 *
 * @param foregroundColor - 前景颜色（文本颜色）
 * @param selectionBackground - 可选的原始选择背景色，如果对比度足够则直接使用
 * @param minContrast - 最小对比度要求，默认为 3.0
 * @returns 生成的选择背景颜色字符串
 */
export function generateSelectionBackgroundColor(
  foregroundColor: string,
  selectionBackground?: string,
  minContrast: number = 3.0,
): string {
  try {
    return generateHighContrastBackground(
      foregroundColor,
      selectionBackground,
      minContrast,
      {
        lightnessOffset: 0.4,
        maxLightness: 0.3,
        alpha: 0.4,
        step: 0.05,
        maxIterations: 10,
      },
      {
        lightnessOffset: 0.4,
        minLightness: 0.7,
        alpha: 0.4,
        step: 0.05,
        maxIterations: 10,
      },
      {
        light: 'rgba(0, 0, 0, 0.25)',
        dark: 'rgba(255, 255, 255, 0.25)',
      },
    )
  }
  catch (error) {
    console.error('生成选择背景色失败:', error)
    return isDarkColor(foregroundColor)
      ? 'rgba(255, 255, 255, 0.25)'
      : 'rgba(0, 0, 0, 0.25)'
  }
}

/**
 * 生成增强的主题颜色
 * 根据主题颜色配置生成完整的 Markdown 预览样式颜色变量
 * 包括表格、代码块、引用块、选择背景等所有 UI 元素的颜色
 *
 * @param themeColors - 主题颜色配置对象，包含各种 UI 元素的颜色定义
 * @param isDark - 是否为暗色主题
 * @returns 生成的 CSS 变量字符串，可直接用于样式注入
 */
export function generateEnhancedColors(
  themeColors: Record<string, string>,
  isDark: boolean,
): string {
  const enhanced: Record<string, string> = {}
  const fallbacks = isDark ? DARK_FALLBACKS : LIGHT_FALLBACKS

  const foreground = themeColors['editor.foreground']
  const background = themeColors['editor.background']

  if (!background) {
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
