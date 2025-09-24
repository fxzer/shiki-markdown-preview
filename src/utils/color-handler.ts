import chroma from 'chroma-js'

/**
 * 判断颜色是否为深色
 * @param color 颜色字符串
 * @returns 是否为深色
 */
export function isDarkColor(color: string): boolean {
  if (!color)
    return false
  try {
    return chroma(color).luminance() < 0.5
  }
  catch {
    return false
  }
}

/**
 * 将颜色映射对象转换为CSS变量字符串
 * @param colorsMap 颜色映射对象
 * @returns CSS变量字符串
 */
export function toCssVarsStr(colorsMap: Record<string, string>): string {
  return Object.entries(colorsMap).filter(([_, value]) => Boolean(value)).map(([key, value]) => {
    const cssVarName = key.replace(/\./g, '-')
    return `--${cssVarName}: ${value};`
  }).join('')
}

/**
 * 计算两个颜色之间的对比度
 * @param color1 第一个颜色（字符串或 chroma.Color 对象）
 * @param color2 第二个颜色（字符串或 chroma.Color 对象）
 * @returns 对比度比值
 */
export function getContrastRatio(color1: string | chroma.Color, color2: string | chroma.Color): number {
  try {
    const c1 = typeof color1 === 'string' ? chroma(color1) : color1
    const c2 = typeof color2 === 'string' ? chroma(color2) : color2
    const l1 = c1.luminance()
    const l2 = c2.luminance()
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }
  catch {
    console.error('色值格式错误')
    return 1
  }
}

/**
 * 调整颜色对比度
 *
 * 数轴逻辑：
 *
 * 0.0 ────────────┬─────────────────┬─────────────────┬──────────────── 1.0
 *            darkThreshold       midpoint       lightThreshold
 *               (0.2)             (0.5)             (0.8)
 *                 │                 │                 │
 *       过暗 → 提亮 │ 中间偏暗 → 压暗   │ 中间偏亮 → 提亮   │ 过亮 → 压暗     │
 *
 * @param colorInput 输入颜色（字符串或 chroma.Color 对象）
 * @param options 调整选项
 * @param options.darkThreshold 深色阈值，默认 0.2
 * @param options.lightThreshold 浅色阈值，默认 0.8
 * @param options.adjustmentAmount 调整幅度，默认 0.28
 * @returns 调整后的颜色十六进制值
 */
export function adjustContrastColor(colorInput: string | chroma.Color, options: { darkThreshold?: number, lightThreshold?: number, adjustmentAmount?: number } = {}) {
  const {
    darkThreshold = 0.2,
    lightThreshold = 0.8,
    adjustmentAmount = 0.28,
  } = options

  const color = typeof colorInput === 'string' ? chroma(colorInput) : colorInput
  const luminance = color.luminance()
  const midpoint = (darkThreshold + lightThreshold) / 2

  let newColor

  if (luminance < darkThreshold) {
    newColor = color.brighten(adjustmentAmount)
  }
  else if (luminance > lightThreshold) {
    newColor = color.darken(adjustmentAmount)
  }
  else {
    if (luminance < midpoint) {
      newColor = color.darken(adjustmentAmount / 2)
    }
    else {
      newColor = color.brighten(adjustmentAmount / 2)
    }
  }
  return newColor.hex()
}

/**
 * 生成多层级颜色渐变
 * 根据基础颜色和覆盖色生成指定数量的颜色层级
 *
 * @param baseColor - 基础颜色
 * @param overlayColor - 覆盖颜色，用于混合生成渐变
 * @param levels - 生成的层级数量
 * @param baseAlpha - 基础透明度
 * @param alphaStep - 透明度步长
 * @param maxMixRatio - 最大混合比例
 * @returns 生成的颜色数组，按层级从浅到深排序
 */
export function generateColorLevels(
  baseColor: string,
  overlayColor: string,
  levels: number,
  baseAlpha: number,
  alphaStep: number,
  maxMixRatio: number = 0.4,
): string[] {
  try {
    const base = chroma(baseColor)
    const overlay = chroma(overlayColor)
    const colors: string[] = []

    for (let i = 0; i < levels; i++) {
      const alpha = baseAlpha + (alphaStep * i)
      const mixRatio = Math.min(alpha * 2, maxMixRatio)
      const levelColor = chroma.mix(base, overlay, mixRatio, 'lab')
      colors.push(levelColor.hex())
    }

    return colors
  }
  catch (error) {
    console.error('生成颜色层级失败:', error)
    return []
  }
}
