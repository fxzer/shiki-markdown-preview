# Shiki Markdown Preview

一个功能强大的 VS Code 扩展，提供基于 Shiki 的 Markdown 预览功能，支持 60+ 种语法高亮主题。

## 功能特性

- 🎨 **丰富的主题选择**: 支持 60+ 种 Shiki 主题，包括浅色和深色主题
- ⌨️ **交互式主题选择器**: 使用键盘方向键实时预览不同主题效果
- 🔄 **实时主题切换**: 一键切换主题，无需重启
- 📝 **语法高亮**: 支持多种编程语言的语法高亮
- 🔗 **滚动同步**: 编辑器与预览区实时滚动同步
- 💾 **配置持久化**: 主题选择自动保存到 VS Code 配置

## 使用方法

### 打开预览

1. 打开任意 Markdown 文件
2. 使用以下方式之一打开预览：
   - 快捷键：`Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
   - 命令面板：`Shiki Markdown Preview: Open Preview`
   - 编辑器标题栏：点击预览按钮

### 选择主题

1. 打开 Markdown 预览后，使用以下方式打开主题选择器：
   - 快捷键：`Ctrl+Shift+T` (Windows/Linux) 或 `Cmd+Shift+T` (Mac)
   - 命令面板：`Shiki Markdown Preview: Select Theme`

2. 在主题选择器中：
   - 使用 **方向键** 导航主题选项
   - 按 **Enter** 确认选择
   - 按 **Esc** 取消选择
   - 也可以直接点击主题选项

## 支持的主题

### 浅色主题

- GitHub Light
- Vitesse Light
- One Light
- Solarized Light
- Catppuccin Latte
- 等等...

### 深色主题

- Vitesse Dark
- Dracula
- One Dark Pro
- Tokyo Night
- Catppuccin Mocha
- 等等...

完整主题列表请参考扩展配置。

## 配置选项

在 VS Code 设置中可以配置：

```json
{
  "shiki-markdown-preview.currentTheme": "vitesse-dark"
}
```

## 开发

### 运行扩展

1. 克隆仓库
2. 安装依赖：`npm install`
3. 编译：`npm run compile`
4. 按 `F5` 开始调试

### 项目结构

```
src/
├── extension.ts          # 扩展入口点
├── markdown-preview.ts   # 预览面板管理
├── scroll-sync-manager.ts # 滚动同步
└── utils.ts             # 工具函数

media/
├── main.js              # 预览区脚本
├── markdown.css         # 预览样式
└── vscode.css          # VS Code 主题适配
```

## 技术栈

- **Shiki**: 语法高亮引擎
- **Markdown-it**: Markdown 解析器
- **VS Code Webview API**: 预览界面
- **TypeScript**: 开发语言

## 许可证

MIT License
