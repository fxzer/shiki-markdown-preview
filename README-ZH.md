# Shiki Markdown Preview

[English Documentation](README.md) | [中文文档](README-ZH.md)

一个功能强大的 VS Code 扩展，提供基于 Shiki 的 Markdown 预览功能，支持 60+ 种语法高亮主题。

## ✨ 功能特性

- 🎨 **丰富的主题选择**: 支持 60+ 种 Shiki 主题，包括浅色和深色主题
- ⌨️ **交互式主题选择器**: 使用键盘方向键实时预览不同主题效果
- 📝 **代码语法高亮**: 集成 Shiki 全部编程语言的语法高亮，支持代码复制
- 🔗 **双向同步滚动**: 编辑器与预览区实时滚动同步
- 📱 **响应式设计**: 适配不同屏幕尺寸的自适应布局
- 🎯 **目录自动生成**: 自动生成 Notion 风格的目录
- 🖼️ **图片懒加载**: 优化的图片加载，提升性能
- 📊 **Mermaid 支持**: 支持 Mermaid 图表渲染
- 🧮 **数学公式**: 基于 KaTeX 的数学公式渲染

## 🚀 快速开始

### 版本支持

`vscode >= 1.100.0`

### 安装

1. 打开 VS Code
2. 进入扩展页面 (Ctrl+Shift+X / Cmd+Shift+X)
3. 搜索 "Shiki Markdown Preview"
4. 点击安装

### 使用方法

#### 方法一：命令面板

1. 打开一个 Markdown 文件
2. 按 `Ctrl+Shift+P` (Mac 用户按 `Cmd+Shift+P`)
3. 输入 "Shiki Markdown Preview"
4. 选择 "Open Markdown Preview Slide" 或 "Open Markdown Preview Full"

#### 方法二：快捷键

- **侧边预览**: `Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
- **全屏预览**: `Ctrl+K V` (Windows/Linux) 或 `Cmd+K V` (Mac)
- **主题选择**: `Ctrl+Shift+T` (Windows/Linux) 或 `Cmd+Shift+T` (Mac)

## 🎨 主题选择

扩展支持 60+ 种精美主题。您可以通过以下方式切换主题：

### 交互式主题选择器

1. 使用 `Ctrl+Shift+T` (Mac 用户按 `Cmd+Shift+T`) 打开主题选择器
2. 使用方向键浏览不同主题
3. 按 Enter 键选择主题

### 可用主题

#### 浅色主题

- `catppuccin-latte`
- `everforest-light`
- `github-light`
- `gruvbox-light-*`
- `kanagawa-lotus`
- `material-theme-lighter`
- `rose-pine-dawn`
- `solarized-light`
- `vitesse-light`
- 以及更多...

#### 深色主题

- `catppuccin-mocha`
- `dracula`
- `github-dark`
- `gruvbox-dark-*`
- `kanagawa-dragon`
- `material-theme`
- `monokai`
- `night-owl`
- `nord`
- `rose-pine`
- `tokyo-night`
- `vitesse-dark`
- 以及更多...

## ⚙️ 配置

### 设置

您可以通过 VS Code 设置自定义扩展行为：

```json
{
  "shikiMarkdownPreview.currentTheme": "vitesse-dark",
  "shikiMarkdownPreview.documentWidth": "800px",
  "shikiMarkdownPreview.fontFamily": "inherit"
}
```

#### 配置选项

| 设置项                                    | 类型    | 默认值           | 描述                      |
| ----------------------------------------- | ------- | ---------------- | ------------------------- |
| `shikiMarkdownPreview.currentTheme`       | string  | `"vitesse-dark"` | Markdown 预览的当前主题   |
| `shikiMarkdownPreview.documentWidth`      | string  | `"800px"`        | 文档宽度（支持 CSS 单位） |
| `shikiMarkdownPreview.fontFamily`         | string  | `"inherit"`      | 预览字体设置              |
| `shikiMarkdownPreview.enableScrollSync  ` | boolean | `true`           | 是否开启同步滚动设置      |

## 🛠️ 开发

### 前置要求

- Node.js 18+
- VS Code 1.100.0+
- TypeScript 5.9.2+

### 构建

```bash
npm install
npm run compile
```

### 脚本命令

- `npm run compile` - 编译 TypeScript
- `npm run watch` - 开发模式监听
- `npm run lint` - 运行 ESLint
- `npm run lint:fix` - 修复 ESLint 问题
- `npm run ext:package` - 打包扩展

### 项目结构

```
src/
├── index.ts                 # 主扩展入口点
├── services/                # 核心服务
│   ├── config/             # 配置管理
│   ├── renderer/           # Markdown 渲染
│   ├── scroll-sync/        # 滚动同步
│   ├── state/             # 状态管理
│   └── theme/              # 主题管理
├── types/                  # TypeScript 类型定义
├── utils/                  # 工具函数
└── webview/                # Webview 组件
```

### 如何贡献

1. Fork 仓库
2. 创建功能分支
3. 进行您的修改
4. 如适用，添加测试
5. 提交 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Shiki](https://github.com/shikijs/shiki) - 美观的语法高亮器
- [VS Code](https://code.visualstudio.com/) - 出色的编辑器
- [Markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析器
- 所有主题作者和贡献者

## 📞 支持

- 🐛 [报告问题](https://github.com/fxzer/shiki-markdown-preview/issues)
- 💡 [功能请求](https://github.com/fxzer/shiki-markdown-preview/issues)
- 📖 [文档](https://github.com/fxzer/shiki-markdown-preview/wiki)

---

**为 VS Code 社区用心制作 ❤️**
