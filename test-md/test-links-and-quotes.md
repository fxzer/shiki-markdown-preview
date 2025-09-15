# 链接和引用测试

## 链接

[GitHub](https://github.com "GitHub 主页")

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

## 引用

> 这是第一层引用。
>
> > 这是第二层嵌套引用。
> >
> > > 这是第三层嵌套引用。
> > > > 这是第四层嵌套引用。
> > > > >这是第五层嵌套引用。
>
> 回到第一层。

> ### 引用中的组合元素
>
> - **粗体** 和 *斜体*
> - `行内代码`
> - [链接](https://example.com)
> - 无序列表
>   1. 有序列表
>   2. 第二项
