declare module 'markdown-it-footnote'
declare module 'markdown-it-ins'
declare module 'markdown-it-mark'
declare module 'markdown-it-sub'
declare module 'markdown-it-sup'
declare module 'markdown-it-task-checkbox' {
  import type MarkdownIt from 'markdown-it'
  
  const taskCheckbox: {
    bare: (md: MarkdownIt, options?: any) => void
    full: (md: MarkdownIt, options?: any) => void
    light: (md: MarkdownIt, options?: any) => void
  }
  export = taskCheckbox
}
