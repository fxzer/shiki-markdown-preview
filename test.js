import fs from 'node:fs'
import MarkdownIt from 'markdown-it'

/**
 * 检测 Markdown 中代码块的语言
 * @param {string} mdContent - Markdown 文本
 * @returns {{ count: number, langs: string[] }}
 */
function detectCodeBlockLangs(mdContent) {
  const md = new MarkdownIt()
  const tokens = md.parse(mdContent, {})

  const langs = new Set()

  tokens.forEach((token) => {
    if (token.type === 'fence' && token.info) {
      // info 可能带参数，比如 "js {lineNumbers}"
      const lang = token.info.split(/\s+/)[0].trim()
      if (lang)
        langs.add(lang)
    }
  })

  return {
    count: langs.size,
    langs: [...langs],
  }
}

// ✅ 使用示例
const md = `
# Example

\`\`\`js
console.log("hi")
\`\`\`

\`\`\`python
print("hello")
\`\`\`

\`\`\`bash
echo hi
\`\`\`
`

// console.log(detectCodeBlockLangs(md))

// { count: 3, langs: [ 'js', 'python', 'bash' ] }

// 检测test-md/test-code-blocks.md

const md2 = fs.readFileSync('test-md/test-code-blocks.md', 'utf-8')
console.log(detectCodeBlockLangs(md2))
