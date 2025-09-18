declare module 'markdown-it-image-lazy-loading' {
  import type MarkdownIt from 'markdown-it'

  interface LazyLoadingOptions {
    /** 懒加载属性名，默认为 'loading' */
    loading?: string
    /** 懒加载属性值，默认为 'lazy' */
    loadingValue?: string
    /** 是否启用懒加载，默认为 true */
    enable?: boolean
  }

  function lazyLoading(md: MarkdownIt, options?: LazyLoadingOptions): void

  export = lazyLoading
}
