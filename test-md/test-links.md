# 链接测试文档

## 目录

- [跳转到引用](#引用)
- [跳转到代码块](#代码块)
- [跳转到列表](#列表)

这是一个用于测试链接功能的文档。

## 外部链接测试

- [GitHub](https://github.com) - 外部链接，应该在新标签页打开
- [VS Code](https://code.visualstudio.com) - 另一个外部链接

## 相对链接测试

- [测试文档1](./test-links-and-quotes.md) - 相对路径的markdown文件
- [测试文档2](./test-front-matter.md) - 另一个相对路径的markdown文件
- [上级目录文档](../README.md) - 上级目录的文档（如果存在）

## 锚点链接测试

- [跳转到外部链接测试](#外部链接测试)
- [跳转到相对链接测试](#相对链接测试)

## 其他链接类型

- [邮箱链接](mailto:test@example.com) - 邮箱链接
- [电话链接](tel:+1234567890) - 电话链接

## 图片链接测试

![测试图片](./test-image.png) - 相对路径的图片（如果存在）

## 注意事项

1. 外部链接（http/https）应该在新标签页打开
2. 相对路径的.md文件应该在左侧编辑区打开
3. 锚点链接应该在当前页面内跳转
4. 其他类型的链接应该保持默认行为

# 简化链接测试

## 网络链接

- [GitHub](https://github.com)
- [GitHub](github.com)
- [VS Code](https://code.visualstudio.com)

## Markdown 文件链接

- [相对路径文件](./test-code-blocks.md)
- [绝对路径文件](/Users/dev/m/shikiMarkdownPreview/test-md/test-code-blocks.md)

## 其他链接（应该被忽略）

- [普通文本文件](./README.txt)
- [图片文件](./image.png)
- [锚点链接](#标题)

## 锚点链接测试

- [跳转到标题](#markdown-文件链接)

# 链接和引用测试

## 链接

[GitHub](https://github.com 'GitHub 主页')

<https://github.com>

这是[引用式链接][1]。

[1]: https://github.com

[跳转到引用](#引用)

[abc](./test-tables.md)

[index](./index.md)
[index.md](./index.md)

## 安全测试 - 路径遍历攻击测试

### 恶意路径测试（应该被阻止）

[路径遍历攻击1](../../../etc/passwd)
[路径遍历攻击2](../../../../../../windows/system32/cmd.exe)
[路径遍历攻击3](~/.ssh/id_rsa)
[路径遍历攻击4](/etc/hosts)
[路径遍历攻击5](./../../../etc/passwd)
[路径遍历攻击6](../test-links-and-quotes.md/../../../etc/passwd)

### URL编码绕过测试（应该被阻止）

[URL编码攻击1](.%2e%2e%2fetc%2fpasswd)
[URL编码攻击2](..%2f..%2f..%2fetc%2fpasswd)
[URL编码攻击3](%2e%2e%2f%2e%2e%2fetc%2fpasswd)

### 非法字符测试（应该被阻止）

[非法字符1](./test<file.md)
[非法字符2](./test>file.md)
[非法字符3](./test:file.md)
[非法字符4](./test|file.md)
[非法字符5](./test?file.md)
[非法字符6](./test*file.md)

### 不允许的文件扩展名测试（应该被阻止）

[可执行文件1](./test.exe)
[可执行文件2](./test.bat)
[可执行文件3](./test.sh)
[可执行文件4](./test.py)
[可执行文件5](./test.js)
[系统文件1](./test.dll)
[系统文件2](./test.so)

### 合法路径测试（应该正常工作）

[合法相对路径1](./test-basic-syntax.md)
[合法相对路径2](../test-md/test-tables.md)
[合法相对路径3](test-code-blocks.md)
[合法相对路径4](./test-images.md)
[合法相对路径5](test-katex.md)

### 边界情况测试

[空路径]()
[仅点路径](./.)
[双点路径](./..)
[路径包含空格](./test file.md)
[路径包含中文](./测试文件.md)

# 锚点链接测试

## 引用

> 这是一个引用块，用于测试锚点链接跳转功能。

## 代码块

```javascript
function test() {
  console.log('Hello, World!')
}
```

## 列表

1. 第一项
2. 第二项
3. 第三项

## 测试说明

点击上面的链接应该能够跳转到对应的章节。
