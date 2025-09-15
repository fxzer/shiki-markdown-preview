# 主题颜色提取演示

这个文档用于演示从Shiki主题中提取的颜色如何应用到webview的各个组件。

## 引用块演示

> 这是一个引用块，使用了从主题中提取的颜色。
> 
> 引用块应该有不同的背景色、边框色和文字颜色，以区别于普通文本。

> **重要提示**：引用块的颜色现在会根据选择的Shiki主题自动调整！

## 代码块演示

### JavaScript代码
```javascript
// 这是一个JavaScript代码块
function greetUser(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

// 调用函数
greetUser("World");
```

### Python代码
```python
# 这是一个Python代码块
def calculate_fibonacci(n):
    """计算斐波那契数列的第n项"""
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# 测试函数
result = calculate_fibonacci(10)
print(f"斐波那契数列第10项: {result}")
```

### 内联代码演示

这里有一些内联代码：`const theme = "vitesse-dark"` 和 `background-color: var(--theme-background)`。

## 表格演示

| 主题名称 | 类型 | 描述 | 状态 |
|---------|------|------|------|
| vitesse-dark | 深色 | 现代深色主题 | ✅ 支持 |
| github-light | 浅色 | GitHub风格浅色主题 | ✅ 支持 |
| dracula | 深色 | 经典的Dracula主题 | ✅ 支持 |
| one-light | 浅色 | One Light主题 | ✅ 支持 |

## 列表演示

### 无序列表
- 第一项：主题颜色提取
- 第二项：CSS变量生成
- 第三项：组件样式应用
- 第四项：实时主题切换

### 有序列表
1. 初始化Shiki高亮器
2. 创建主题颜色提取器
3. 提取主题颜色配置
4. 生成CSS变量
5. 应用到webview组件

### 任务列表
- [x] 实现主题颜色提取器
- [x] 创建CSS变量系统
- [x] 应用颜色到引用块
- [x] 应用颜色到代码块
- [x] 应用颜色到表格
- [ ] 测试所有主题
- [ ] 优化颜色提取算法

## 标题演示

# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

## 文本样式演示

这是**粗体文本**，这是*斜体文本*，这是~~删除线文本~~，这是`内联代码`。

这是==标记文本==（如果支持的话）。

## 链接演示

- [GitHub](https://github.com)
- [VS Code](https://code.visualstudio.com)
- [Shiki](https://shiki.matsu.io)

## 分割线演示

---

## 键盘按键演示

按 `Ctrl+Shift+V` 打开预览，按 `Ctrl+Shift+T` 选择主题。

## 数学公式演示

行内公式：$E = mc^2$

块级公式：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 脚注演示

这是一个脚注引用[^1]。

[^1]: 这是脚注的内容。

## 图片演示

![示例图片](https://via.placeholder.com/300x200?text=Theme+Colors+Demo)

## 总结

通过这个演示文档，您可以看到：

1. **引用块**：使用主题的背景色、边框色和文字颜色
2. **代码块**：使用主题的代码背景色和边框色
3. **表格**：使用主题的表格颜色和边框色
4. **列表**：使用主题的文字颜色和标记颜色
5. **标题**：使用主题的标题颜色
6. **链接**：使用主题的链接颜色
7. **其他元素**：都使用相应的主题颜色

现在，当您切换不同的Shiki主题时，整个webview的样式都会相应地调整，提供一致的主题体验！
