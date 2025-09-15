declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'

  interface TaskListsOptions {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }

  function taskLists(md: MarkdownIt, options?: TaskListsOptions): void
  export = taskLists
}

declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it'

  function emoji(md: MarkdownIt): void
  export = emoji
}

declare module 'markdown-it-table-of-contents' {
  import type MarkdownIt from 'markdown-it'

  interface TocOptions {
    includeLevel?: number[]
    containerClass?: string
    markerPattern?: RegExp
    listType?: 'ul' | 'ol'
  }

  function toc(md: MarkdownIt, options?: TocOptions): void
  export = toc
}
