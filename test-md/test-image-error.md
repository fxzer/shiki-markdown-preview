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
