# 图片测试

## 基础图片

![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

![GitHub Octocat](https://github.githubassets.com/images/modules/logos_page/Octocat.png '图片标题')

## 图片链接

[![VS Code Logo](https://code.visualstudio.com/assets/images/code-stable.png)](https://code.visualstudio.com)

## HTML 尺寸控制

<img src="https://picsum.photos/300/200" alt="示例图片" width="150">

## 特殊格式

### SVG

![SVG Icon](https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/github.svg)

### GIF

![GIF 动图](https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif)

# 图片加载失败测试

这个文档用于测试图片加载失败时的样式效果。

## 正常图片

![正常图片](https://picsum.photos/400/300?random=1)

## 会加载失败的图片

![无效图片1](https://invalid-url-that-will-fail.com/image1.jpg)

![无效图片2](https://nonexistent-domain-12345.com/image2.png)

![无效图片3](https://broken-link.example.com/image3.gif)

## 更多正常图片

![正常图片2](https://picsum.photos/400/300?random=2)

![正常图片3](https://picsum.photos/400/300?random=3)

## 说明

上面的无效图片链接会触发加载失败，应该显示：

- 红色虚线边框
- 浅红色背景
- "图片加载失败" 文字提示
- 固定的最小宽高 (200px x 200px)

# 懒加载测试

这是一个测试 vanilla-lazyload 库集成效果的文档。

## 图片测试

这里有一些图片用于测试懒加载功能：

![测试图片1](https://picsum.photos/800/600?random=1)

![测试图片2](https://picsum.photos/800/600?random=2)

![测试图片3](https://picsum.photos/800/600?random=3)

## 更多内容

这里有一些文本内容，用于测试滚动时的懒加载效果。

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## 更多图片

![测试图片4](https://picsum.photos/800/600?random=4)

![测试图片5](https://picsum.photos/800/600?random=5)

![测试图片6](https://picsum.photos/800/600?random=6)

## 结尾

测试完成！请滚动页面查看懒加载效果。
