---
title: "测试 Front Matter 集成"
author: "开发者"
date: "2024-01-15"
tags: ["markdown", "front-matter", "测试"]
description: "这是一个测试 gray-matter 集成的示例文档"
---

# 测试 Front Matter 集成

这是一个测试文档，用于验证 `gray-matter` 库的集成是否正常工作。

## 功能特性

- ✅ 解析 YAML front matter
- ✅ 提取元数据（title, author, date, tags, description）
- ✅ 渲染 Markdown 内容
- ✅ 在预览面板中显示正确的标题

## 代码示例

```javascript
import * as matter from 'gray-matter'

// 使用 gray-matter 分离 front matter 和内容
const parsed = matter.default(rawContent)
const content = parsed.content // 只使用内容部分，忽略元数据
```

## 预期结果

1. 预览面板的标题应该显示为 "测试 Front Matter 集成"
2. 页面标题应该使用 front matter 中的 title
3. front matter 数据应该可以通过 `window.frontMatterData` 在 webview 中访问

## 测试数据

- **标题**: 测试 Front Matter 集成
- **作者**: 开发者
- **日期**: 2024-01-15
- **标签**: markdown, front-matter, 测试
- **描述**: 这是一个测试 gray-matter 集成的示例文档
