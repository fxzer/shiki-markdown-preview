import MarkdownIt from 'markdown-it'

export const SUPPORTED_LANGUAGES = [
  'abap',
  'actionscript-3',
  'ada',
  'angular-html',
  'angular-ts',
  'apache',
  'apex',
  'apl',
  'applescript',
  'ara',
  'asciidoc',
  'asm',
  'astro',
  'awk',
  'ballerina',
  'bat',
  'beancount',
  'berry',
  'bibtex',
  'bicep',
  'blade',
  'bsl',
  'c',
  'cadence',
  'cairo',
  'clarity',
  'clojure',
  'cmake',
  'cobol',
  'codeowners',
  'codeql',
  'coffee',
  'common-lisp',
  'coq',
  'cpp',
  'crystal',
  'csharp',
  'css',
  'csv',
  'cue',
  'cypher',
  'd',
  'dart',
  'dax',
  'desktop',
  'diff',
  'docker',
  'dotenv',
  'dream-maker',
  'edge',
  'elixir',
  'elm',
  'emacs-lisp',
  'erb',
  'erlang',
  'fennel',
  'fish',
  'fluent',
  'fortran-fixed-form',
  'fortran-free-form',
  'fsharp',
  'gdresource',
  'gdscript',
  'gdshader',
  'genie',
  'gherkin',
  'git-commit',
  'git-rebase',
  'gleam',
  'glimmer-js',
  'glimmer-ts',
  'glsl',
  'gnuplot',
  'go',
  'graphql',
  'groovy',
  'hack',
  'haml',
  'handlebars',
  'haskell',
  'haxe',
  'hcl',
  'hjson',
  'hlsl',
  'html',
  'html-derivative',
  'http',
  'hxml',
  'hy',
  'imba',
  'ini',
  'java',
  'javascript',
  'jinja',
  'jison',
  'json',
  'json5',
  'jsonc',
  'jsonl',
  'jsonnet',
  'jssm',
  'jsx',
  'julia',
  'kotlin',
  'kusto',
  'latex',
  'lean',
  'less',
  'liquid',
  'llvm',
  'log',
  'logo',
  'lua',
  'luau',
  'make',
  'markdown',
  'marko',
  'matlab',
  'mdc',
  'mdx',
  'mermaid',
  'mipsasm',
  'mojo',
  'move',
  'narrat',
  'nextflow',
  'nginx',
  'nim',
  'nix',
  'nushell',
  'objective-c',
  'objective-cpp',
  'ocaml',
  'pascal',
  'perl',
  'php',
  'plsql',
  'po',
  'polar',
  'postcss',
  'powerquery',
  'powershell',
  'prisma',
  'prolog',
  'proto',
  'pug',
  'puppet',
  'purescript',
  'python',
  'qml',
  'qmldir',
  'qss',
  'r',
  'racket',
  'raku',
  'razor',
  'reg',
  'regexp',
  'rel',
  'riscv',
  'rst',
  'ruby',
  'rust',
  'sas',
  'sass',
  'scala',
  'scheme',
  'scss',
  'sdbl',
  'shaderlab',
  'shellscript',
  'shellsession',
  'smalltalk',
  'solidity',
  'soy',
  'sparql',
  'splunk',
  'sql',
  'ssh-config',
  'stata',
  'stylus',
  'svelte',
  'swift',
  'system-verilog',
  'systemd',
  'talonscript',
  'tasl',
  'tcl',
  'templ',
  'terraform',
  'tex',
  'toml',
  'ts-tags',
  'tsv',
  'tsx',
  'turtle',
  'twig',
  'typescript',
  'typespec',
  'typst',
  'v',
  'vala',
  'vb',
  'verilog',
  'vhdl',
  'viml',
  'vue',
  'vue-html',
  'vue-vine',
  'vyper',
  'wasm',
  'wenyan',
  'wgsl',
  'wikitext',
  'wit',
  'wolfram',
  'xml',
  'xsl',
  'yaml',
  'zenscript',
  'zig',
]
const md = new MarkdownIt()

/**
 * Shell 语言映射表
 * 将常见的 shell 语言标识符映射到 shiki 支持的 shellscript
 */
const SHELL_LANGUAGE_MAP: Record<string, string> = {
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
  zsh: 'shellscript',
  fish: 'fish', // fish 在 shiki 中有独立支持
  powershell: 'powershell', // powershell 在 shiki 中有独立支持
}

/**
 * 语言映射函数
 * 将用户输入的语言标识符映射到 shiki 支持的语言
 */
export function mapLanguageToShiki(language: string): string {
  // 如果已经是支持的语言，直接返回
  if (SUPPORTED_LANGUAGES.includes(language)) {
    return language
  }

  // 检查 shell 语言映射
  const mappedLanguage = SHELL_LANGUAGE_MAP[language.toLowerCase()]
  if (mappedLanguage) {
    return mappedLanguage
  }

  // 如果都不匹配，返回原始语言（让后续处理决定是否支持）
  return language
}

export function isSupportedLanguage(language: string): boolean {
  const mappedLanguage = mapLanguageToShiki(language)
  return SUPPORTED_LANGUAGES.includes(mappedLanguage)
}
/**
 * 从 Markdown 内容中检测所有使用的代码块语言
 * @param content Markdown 内容
 * @returns 检测到的语言列表（去重）
 */
export function detectLanguages(content: string): string[] {
  try {
    const tokens = md.parse(content, {})
    const languages = new Set<string>()

    tokens.forEach((token) => {
      if (token.type === 'fence' && token.info) {
        // info 可能带参数，比如 "js {lineNumbers}" 或带行号范围如 "javascript{1,5,8-10}"
        let lang = token.info.split(/\s+/)[0].trim()

        // 处理带有行号范围的语言标识符，如 javascript{1,5,8-10}
        const lineNumberMatch = lang.match(/^([^{]+)(?:\{.+\})?$/)
        if (lineNumberMatch && lineNumberMatch[1]) {
          lang = lineNumberMatch[1].trim()
        }
        if (lang) {
          // 使用语言映射，将 shell 相关语言映射到 shellscript
          const mappedLang = mapLanguageToShiki(lang)
          languages.add(mappedLang)
        }
      }
    })

    return Array.from(languages).sort()
  }
  catch {
    return []
  }
}
