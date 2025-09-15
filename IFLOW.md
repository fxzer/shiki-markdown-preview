# iFlow Context - VS Code Webview Extension

## 项目概述

这是一个VS Code扩展项目，名为"Cat Coding"，是一个Webview API示例项目。该项目演示了如何使用VS Code的Webview API创建一个交互式的Webview面板，展示动态内容和处理消息通信。

**主要功能：**

- 创建和显示基本的Webview面板
- 动态更新Webview内容
- 在Webview中加载本地内容
- 在Webview中运行JavaScript脚本
- 扩展与Webview之间的双向消息通信
- 使用内容安全策略(CSP)
- Webview生命周期管理和状态持久化

## 技术栈

- **TypeScript** - 主要开发语言
- **VS Code Extension API** - 扩展开发框架
- **Webview API** - 创建交互式Webview面板
- **ESLint** - 代码质量检查
- **Node.js** - 运行时环境

## 项目结构

```
/Users/fxj/m/webview-sample/
├── src/
│   └── extension.ts          # 扩展主入口文件
├── media/
│   ├── main.js              # Webview中运行的JavaScript
│   ├── reset.css            # CSS重置样式
│   ├── vscode.css           # VS Code主题样式
│   └── cat.gif              # 示例图片资源
├── out/                     # 编译输出目录
├── .vscode/                 # VS Code配置
├── package.json             # 项目配置和依赖
├── tsconfig.json           # TypeScript配置
├── eslint.config.mjs       # ESLint配置
└── README.md               # 项目文档
```

## 核心文件说明

### src/extension.ts

扩展的主入口文件，包含：

- 扩展激活逻辑
- Webview面板管理类`CatCodingPanel`
- 命令注册（开始编码会话、重构操作）
- Webview消息处理
- Webview序列化和反序列化

### media/main.js

在Webview中运行的JavaScript脚本，负责：

- 代码行数计数器逻辑
- 与VS Code扩展的双向通信
- 状态保存和恢复
- 随机bug引入模拟

## 开发命令

```bash
# 安装依赖
npm install

# 编译TypeScript
npm run compile

# 监听模式编译（开发时使用）
npm run watch

# 运行ESLint检查
npm run lint

# 打包扩展
npm run ext:package

# 发布前编译
npm run vscode:prepublish
```

## 开发调试

1. 在VS Code中打开项目
2. 按`F5`启动调试（会打开新的VS Code窗口）
3. 在新窗口中运行命令：`Cat Coding: Start cat coding session`
4. 使用`Cat Coding: Do refactor`命令测试消息通信

## 扩展命令

- **Cat Coding: Start cat coding session** - 创建并显示Cat Coding Webview
- **Cat Coding: Do refactor** - 将显示的代码行数减半

## 代码规范

- 使用TypeScript严格模式
- 遵循ESLint配置规则
- 使用分号结尾
- 导入语句使用camelCase或PascalCase
- 未使用的变量需要以下划线开头
- 代码块使用大括号包裹

## Webview特性

- **安全策略**：使用CSP限制内容加载
- **本地资源**：只允许从扩展的media目录加载资源
- **状态持久化**：Webview关闭后状态可以恢复
- **消息通信**：支持扩展与Webview之间的双向通信
- **生命周期管理**：正确处理Webview的创建、显示、隐藏和销毁

## 注意事项

- 该扩展仅在Markdown文件激活时触发（`onLanguage:markdown`）
- 同时只允许存在一个Cat Coding面板
- Webview内容会根据所在编辑器列位置显示不同的猫咪GIF
- 随机bug引入概率随代码行数增加而提高（最高5%）
