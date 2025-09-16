# 代码块行号功能使用指南

## 功能说明

本扩展现在支持在代码块中显示行号，可以通过设置进行开启/关闭。

## 设置方法

### 方法一：通过 VS Code 设置界面

1. 打开 VS Code 设置（`Ctrl/Cmd + ,`）
2. 搜索 "shiki markdown preview"
3. 找到 "Show Line Numbers" 选项
4. 勾选或取消勾选以启用/禁用行号显示

### 方法二：通过设置 JSON

在 VS Code 的 `settings.json` 中添加：

```json
{
  "shiki-markdown-preview.showLineNumbers": true
}
```

## 功能特性

✅ **实时切换**：修改设置后立即生效，无需重启扩展  
✅ **自动适配**：行号颜色自动适配当前主题  
✅ **响应式设计**：在小屏幕设备上自动隐藏行号  
✅ **美观设计**：行号区域与代码区域清晰分离  
✅ **高性能**：使用优化的渲染逻辑，不影响预览性能  

## 测试示例

```javascript
// 这是一段测试代码
function greet(name) {
  console.log(`Hello, ${name}!`);
}

// 调用函数
greet("World");
```

```python
# Python 示例
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

# 测试
numbers = [1, 2, 3, 4, 5]
result = calculate_sum(numbers)
print(f"Sum: {result}")
```

## 技术实现

- **配置管理**：使用 VS Code 配置 API 管理行号显示选项
- **渲染逻辑**：在 Markdown 渲染器中集成行号生成逻辑
- **样式设计**：使用 CSS Flexbox 实现行号和代码的并排显示
- **响应式适配**：使用媒体查询在移动设备上隐藏行号

享受更好的代码阅读体验！🎉
