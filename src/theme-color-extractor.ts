import { type Highlighter } from 'shiki';

/**
 * 主题颜色提取器
 * 用于从Shiki主题中提取颜色信息，并应用到webview的各个组件
 */
export class ThemeColorExtractor {
  private _highlighter: Highlighter;

  constructor(highlighter: Highlighter) {
    this._highlighter = highlighter;
  }

  /**
   * 提取主题的所有颜色信息
   * @param theme 主题名称
   * @returns 主题颜色配置对象
   */
  public extractThemeColors(theme: string): ThemeColorConfig | null {
    try {
      const themeData = (this._highlighter as any).getTheme(theme);
      if (!themeData) {
        console.warn(`Theme ${theme} not found`);
        return null;
      }

      return this._parseThemeData(themeData);
    } catch (error) {
      console.error(`Failed to extract colors for theme ${theme}:`, error);
      return null;
    }
  }

  /**
   * 解析主题数据，提取颜色信息
   */
  private _parseThemeData(themeData: any): ThemeColorConfig {
    const colors = themeData.colors || {};
    const tokenColors = themeData.tokenColors || [];

    return {
      // 基础颜色
      background: colors['editor.background'] || colors.background || '#ffffff',
      foreground: colors['editor.foreground'] || colors.foreground || '#000000',
      
      // 编辑器颜色
      editorBackground: colors['editor.background'] || colors.background || '#ffffff',
      editorForeground: colors['editor.foreground'] || colors.foreground || '#000000',
      editorSelection: colors['editor.selectionBackground'] || colors.selection || '#add6ff26',
      editorLineHighlight: colors['editor.lineHighlightBackground'] || colors.lineHighlight || 'transparent',
      
      // 边框和分割线
      border: colors['panel.border'] || colors.border || '#e1e4e8',
      divider: colors['panel.border'] || colors.divider || '#e1e4e8',
      
      // 状态颜色
      error: colors['editorError.foreground'] || colors.error || '#f85149',
      warning: colors['editorWarning.foreground'] || colors.warning || '#d29922',
      info: colors['editorInfo.foreground'] || colors.info || '#58a6ff',
      success: colors['terminal.ansiGreen'] || colors.success || '#3fb950',
      
      // 链接颜色
      link: colors['textLink.foreground'] || colors.link || '#0969da',
      linkHover: colors['textLink.activeForeground'] || colors.linkHover || '#0969da',
      
      // 按钮和交互元素
      buttonBackground: colors['button.background'] || colors.button || '#0969da',
      buttonForeground: colors['button.foreground'] || colors.buttonText || '#ffffff',
      buttonHover: colors['button.hoverBackground'] || colors.buttonHover || '#0860ca',
      
      // 输入框
      inputBackground: colors['input.background'] || colors.input || '#ffffff',
      inputForeground: colors['input.foreground'] || colors.inputText || '#000000',
      inputBorder: colors['input.border'] || colors.inputBorder || '#d0d7de',
      
      // 引用块颜色
      blockquote: this._extractBlockquoteColors(colors, tokenColors),
      
      // 代码块颜色
      codeBlock: this._extractCodeBlockColors(colors, tokenColors),
      
      // 表格颜色
      table: this._extractTableColors(colors, tokenColors),
      
      // 列表颜色
      list: this._extractListColors(colors, tokenColors),
      
      // 标题颜色
      heading: this._extractHeadingColors(colors, tokenColors),
      
      // 原始主题数据（用于调试和高级用法）
      rawColors: colors,
      rawTokenColors: tokenColors
    };
  }

  /**
   * 提取引用块相关颜色
   */
  private _extractBlockquoteColors(colors: any, tokenColors: any[]): BlockquoteColors {
    // 查找引用块相关的token颜色
    const blockquoteToken = tokenColors.find(token => 
      token.scope && (
        token.scope.includes('markup.quote') ||
        token.scope.includes('blockquote') ||
        token.scope.includes('punctuation.definition.quote')
      )
    );

    return {
      background: colors['editor.background'] || colors.background || '#ffffff',
      border: colors['panel.border'] || colors.border || '#d0d7de',
      text: blockquoteToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#656d76',
      accent: colors['terminal.ansiBlue'] || colors.accent || '#0969da'
    };
  }

  /**
   * 提取代码块相关颜色
   */
  private _extractCodeBlockColors(colors: any, tokenColors: any[]): CodeBlockColors {
    return {
      background: colors['editor.background'] || colors.background || '#f6f8fa',
      border: colors['panel.border'] || colors.border || '#d0d7de',
      text: colors['editor.foreground'] || colors.foreground || '#24292f',
      // 从tokenColors中提取一些常见的语法高亮颜色
      keyword: this._findTokenColor(tokenColors, ['keyword', 'storage.type', 'storage.modifier']),
      string: this._findTokenColor(tokenColors, ['string', 'string.quoted']),
      comment: this._findTokenColor(tokenColors, ['comment', 'punctuation.definition.comment']),
      number: this._findTokenColor(tokenColors, ['constant.numeric', 'number']),
      function: this._findTokenColor(tokenColors, ['entity.name.function', 'support.function'])
    };
  }

  /**
   * 提取表格相关颜色
   */
  private _extractTableColors(colors: any, tokenColors: any[]): TableColors {
    return {
      background: colors['editor.background'] || colors.background || '#ffffff',
      border: colors['panel.border'] || colors.border || '#d0d7de',
      headerBackground: colors['editor.lineHighlightBackground'] || colors.lineHighlight || '#f6f8fa',
      headerText: colors['editor.foreground'] || colors.foreground || '#24292f',
      cellText: colors['editor.foreground'] || colors.foreground || '#24292f',
      alternateRow: colors['editor.lineHighlightBackground'] || colors.lineHighlight || '#f6f8fa'
    };
  }

  /**
   * 提取列表相关颜色
   */
  private _extractListColors(colors: any, tokenColors: any[]): ListColors {
    return {
      background: colors['editor.background'] || colors.background || '#ffffff',
      text: colors['editor.foreground'] || colors.foreground || '#24292f',
      bullet: colors['editor.foreground'] || colors.foreground || '#656d76',
      marker: colors['terminal.ansiBlue'] || colors.accent || '#0969da'
    };
  }

  /**
   * 提取标题相关颜色
   */
  private _extractHeadingColors(colors: any, tokenColors: any[]): HeadingColors {
    const headingToken = tokenColors.find(token => 
      token.scope && token.scope.includes('markup.heading')
    );

    return {
      h1: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f',
      h2: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f',
      h3: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f',
      h4: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f',
      h5: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f',
      h6: headingToken?.settings?.foreground || colors['editor.foreground'] || colors.foreground || '#24292f'
    };
  }

  /**
   * 从tokenColors中查找指定scope的颜色
   */
  private _findTokenColor(tokenColors: any[], scopes: string[]): string {
    for (const scope of scopes) {
      const token = tokenColors.find(t => 
        t.scope && (
          Array.isArray(t.scope) ? t.scope.some((s: string) => s.includes(scope)) : t.scope.includes(scope)
        )
      );
      if (token?.settings?.foreground) {
        return token.settings.foreground;
      }
    }
    return '#000000'; // 默认颜色
  }

  /**
   * 生成CSS变量字符串
   */
  public generateCSSVariables(themeConfig: ThemeColorConfig): string {
    const cssVars: string[] = [];

    // 基础颜色
    cssVars.push(`--theme-background: ${themeConfig.background};`);
    cssVars.push(`--theme-foreground: ${themeConfig.foreground};`);
    
    // 编辑器颜色
    cssVars.push(`--theme-editor-background: ${themeConfig.editorBackground};`);
    cssVars.push(`--theme-editor-foreground: ${themeConfig.editorForeground};`);
    cssVars.push(`--theme-editor-selection: ${themeConfig.editorSelection};`);
    cssVars.push(`--theme-editor-line-highlight: ${themeConfig.editorLineHighlight};`);
    
    // 边框和分割线
    cssVars.push(`--theme-border: ${themeConfig.border};`);
    cssVars.push(`--theme-divider: ${themeConfig.divider};`);
    
    // 状态颜色
    cssVars.push(`--theme-error: ${themeConfig.error};`);
    cssVars.push(`--theme-warning: ${themeConfig.warning};`);
    cssVars.push(`--theme-info: ${themeConfig.info};`);
    cssVars.push(`--theme-success: ${themeConfig.success};`);
    
    // 链接颜色
    cssVars.push(`--theme-link: ${themeConfig.link};`);
    cssVars.push(`--theme-link-hover: ${themeConfig.linkHover};`);
    
    // 按钮颜色
    cssVars.push(`--theme-button-background: ${themeConfig.buttonBackground};`);
    cssVars.push(`--theme-button-foreground: ${themeConfig.buttonForeground};`);
    cssVars.push(`--theme-button-hover: ${themeConfig.buttonHover};`);
    
    // 输入框颜色
    cssVars.push(`--theme-input-background: ${themeConfig.inputBackground};`);
    cssVars.push(`--theme-input-foreground: ${themeConfig.inputForeground};`);
    cssVars.push(`--theme-input-border: ${themeConfig.inputBorder};`);
    
    // 引用块颜色
    cssVars.push(`--theme-blockquote-background: ${themeConfig.blockquote.background};`);
    cssVars.push(`--theme-blockquote-border: ${themeConfig.blockquote.border};`);
    cssVars.push(`--theme-blockquote-text: ${themeConfig.blockquote.text};`);
    cssVars.push(`--theme-blockquote-accent: ${themeConfig.blockquote.accent};`);
    
    // 代码块颜色
    cssVars.push(`--theme-code-background: ${themeConfig.codeBlock.background};`);
    cssVars.push(`--theme-code-border: ${themeConfig.codeBlock.border};`);
    cssVars.push(`--theme-code-text: ${themeConfig.codeBlock.text};`);
    cssVars.push(`--theme-code-keyword: ${themeConfig.codeBlock.keyword};`);
    cssVars.push(`--theme-code-string: ${themeConfig.codeBlock.string};`);
    cssVars.push(`--theme-code-comment: ${themeConfig.codeBlock.comment};`);
    cssVars.push(`--theme-code-number: ${themeConfig.codeBlock.number};`);
    cssVars.push(`--theme-code-function: ${themeConfig.codeBlock.function};`);
    
    // 表格颜色
    cssVars.push(`--theme-table-background: ${themeConfig.table.background};`);
    cssVars.push(`--theme-table-border: ${themeConfig.table.border};`);
    cssVars.push(`--theme-table-header-background: ${themeConfig.table.headerBackground};`);
    cssVars.push(`--theme-table-header-text: ${themeConfig.table.headerText};`);
    cssVars.push(`--theme-table-cell-text: ${themeConfig.table.cellText};`);
    cssVars.push(`--theme-table-alternate-row: ${themeConfig.table.alternateRow};`);
    
    // 列表颜色
    cssVars.push(`--theme-list-background: ${themeConfig.list.background};`);
    cssVars.push(`--theme-list-text: ${themeConfig.list.text};`);
    cssVars.push(`--theme-list-bullet: ${themeConfig.list.bullet};`);
    cssVars.push(`--theme-list-marker: ${themeConfig.list.marker};`);
    
    // 标题颜色
    cssVars.push(`--theme-heading-h1: ${themeConfig.heading.h1};`);
    cssVars.push(`--theme-heading-h2: ${themeConfig.heading.h2};`);
    cssVars.push(`--theme-heading-h3: ${themeConfig.heading.h3};`);
    cssVars.push(`--theme-heading-h4: ${themeConfig.heading.h4};`);
    cssVars.push(`--theme-heading-h5: ${themeConfig.heading.h5};`);
    cssVars.push(`--theme-heading-h6: ${themeConfig.heading.h6};`);

    return cssVars.join('\n    ');
  }
}

/**
 * 主题颜色配置接口
 */
export interface ThemeColorConfig {
  // 基础颜色
  background: string;
  foreground: string;
  
  // 编辑器颜色
  editorBackground: string;
  editorForeground: string;
  editorSelection: string;
  editorLineHighlight: string;
  
  // 边框和分割线
  border: string;
  divider: string;
  
  // 状态颜色
  error: string;
  warning: string;
  info: string;
  success: string;
  
  // 链接颜色
  link: string;
  linkHover: string;
  
  // 按钮和交互元素
  buttonBackground: string;
  buttonForeground: string;
  buttonHover: string;
  
  // 输入框
  inputBackground: string;
  inputForeground: string;
  inputBorder: string;
  
  // 组件特定颜色
  blockquote: BlockquoteColors;
  codeBlock: CodeBlockColors;
  table: TableColors;
  list: ListColors;
  heading: HeadingColors;
  
  // 原始数据
  rawColors: any;
  rawTokenColors: any[];
}

export interface BlockquoteColors {
  background: string;
  border: string;
  text: string;
  accent: string;
}

export interface CodeBlockColors {
  background: string;
  border: string;
  text: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
}

export interface TableColors {
  background: string;
  border: string;
  headerBackground: string;
  headerText: string;
  cellText: string;
  alternateRow: string;
}

export interface ListColors {
  background: string;
  text: string;
  bullet: string;
  marker: string;
}

export interface HeadingColors {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
}
