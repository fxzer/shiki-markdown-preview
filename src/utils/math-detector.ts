/**
 * 数学公式检测工具
 * 用于检测 markdown 内容中是否包含数学公式，实现按需加载 KaTeX
 */

/**
 * 检测文本中是否包含数学公式
 * @param content markdown 内容
 * @returns 是否包含数学公式
 */
export function hasMathExpressions(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false
  }

  // 检测行内数学公式：$...$ 或 \(...\)
  const inlineMathPattern = /\$[^$]+\$|\\\([^)]+\\\)/
  
  // 检测块级数学公式：$$...$$ 或 \[...\]
  const blockMathPattern = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/
  
  // 检测数学 fence 块（可选，如果支持的话）
  const mathFencePattern = /```math\s*[\s\S]*?```|```katex\s*[\s\S]*?```/
  
  return inlineMathPattern.test(content) || 
         blockMathPattern.test(content) || 
         mathFencePattern.test(content)
}

/**
 * 获取数学公式的详细信息
 * @param content markdown 内容
 * @returns 数学公式信息
 */
export function getMathInfo(content: string): {
  hasMath: boolean
  inlineCount: number
  blockCount: number
  fenceCount: number
  totalCount: number
} {
  if (!content || typeof content !== 'string') {
    return {
      hasMath: false,
      inlineCount: 0,
      blockCount: 0,
      fenceCount: 0,
      totalCount: 0
    }
  }

  // 统计行内数学公式
  const inlineMatches = content.match(/\$[^$]+\$|\\\([^)]+\\\)/g) || []
  const inlineCount = inlineMatches.length

  // 统计块级数学公式
  const blockMatches = content.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g) || []
  const blockCount = blockMatches.length

  // 统计数学 fence 块
  const fenceMatches = content.match(/```math\s*[\s\S]*?```|```katex\s*[\s\S]*?```/g) || []
  const fenceCount = fenceMatches.length

  const totalCount = inlineCount + blockCount + fenceCount

  return {
    hasMath: totalCount > 0,
    inlineCount,
    blockCount,
    fenceCount,
    totalCount
  }
}

/**
 * 检测数学公式的复杂度
 * @param content markdown 内容
 * @returns 复杂度级别
 */
export function getMathComplexity(content: string): 'none' | 'simple' | 'medium' | 'complex' {
  const mathInfo = getMathInfo(content)
  
  if (!mathInfo.hasMath) {
    return 'none'
  }

  // 简单：只有基本的行内公式
  if (mathInfo.inlineCount > 0 && mathInfo.blockCount === 0 && mathInfo.fenceCount === 0) {
    return 'simple'
  }

  // 中等：有块级公式或少量复杂结构
  if (mathInfo.totalCount <= 5) {
    return 'medium'
  }

  // 复杂：大量公式或复杂结构
  return 'complex'
}
