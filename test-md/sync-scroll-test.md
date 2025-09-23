# 双向同步滚动测试

这个文档用于测试 VS Code 扩展的双向同步滚动功能。

## 测试原理

基于以下核心机制：

1. **单一状态锁**：只使用一个 `isSyncing` 锁来防止循环同步
2. **事件源驱动**：滚动必须由明确的源发起，目标窗口被动响应
3. **防抖处理**：对用户滚动操作进行防抖，提高性能
4. **可靠行号映射**：每个 HTML 元素都有 `data-line` 属性

## 测试步骤

### 第一步：基本滚动测试

请尝试在编辑器中滚动，观察预览窗口是否同步滚动。

然后尝试在预览窗口中滚动，观察编辑器是否同步滚动。

### 第二步：快速滚动测试

快速滚动编辑器，观察预览窗口的响应是否流畅。

快速滚动预览窗口，观察编辑器的响应是否流畅。

### 第三步：边界测试

滚动到文档顶部和底部，检查同步是否准确。

### 第四步：性能测试

这个文档包含大量内容，用于测试滚动性能：

## 长文档测试内容

### 章节 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### 章节 2

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### 章节 3

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

### 代码块测试

```javascript
function testScrollSync() {
    console.log("Testing scroll sync functionality");
    
    // 模拟大量代码
    for (let i = 0; i < 1000; i++) {
        console.log(`Line ${i}: Testing scroll synchronization`);
    }
}
```

### 列表测试

1. 第一项内容
2. 第二项内容
   - 子项 A
   - 子项 B
3. 第三项内容

### 表格测试

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |
| 数据7 | 数据8 | 数据9 |

### 引用测试

> 这是一个引用块，用于测试滚动同步。
> 
> 引用内容应该也有 data-line 属性。

### 更多内容

重复的内容用于测试长文档滚动：

#### 子章节 1

Additional content for scroll testing. This section contains more text to make the document longer and test the scroll synchronization functionality.

#### 子章节 2

More content here. The goal is to have enough content to properly test the bidirectional scroll synchronization between the editor and preview windows.

#### 子章节 3

Even more content to extend the document length. This helps verify that the scroll sync works correctly throughout the entire document, from top to bottom.

### 数学公式测试

当启用 KaTeX 时，数学公式也应该有正确的行号映射：

$$
E = mc^2
$$

行内公式：$a^2 + b^2 = c^2$

### 最后部分

这是文档的最后部分，用于测试滚动到底部时的同步情况。

## 预期行为

1. **编辑器滚动** → **预览同步**：当在编辑器中滚动时，预览窗口应该平滑地同步到对应位置
2. **预览滚动** → **编辑器同步**：当在预览窗口中滚动时，编辑器应该同步到对应位置
3. **无循环同步**：不应该出现两个窗口互相触发导致的循环同步现象
4. **性能良好**：滚动应该流畅，没有明显的延迟或卡顿
5. **精度准确**：同步位置应该准确，特别是在文档的不同部分

## 技术实现

### 状态锁机制

```typescript
private _isSyncing: boolean = false
private _syncSource: 'editor' | 'preview' | null = null
```

### 事件源识别

每个滚动事件都带有明确的源标识：

```typescript
const event: ScrollEvent = {
  percent,
  timestamp: Date.now(),
  source: 'editor', // 或 'preview'
  direction: this.calculateDirection(percent),
}
```

### 防抖处理

使用智能防抖算法，根据滚动速度调整延迟：

```typescript
private readonly _DEBOUNCE_MS = 16 // 约60fps
private readonly _MIN_PERCENT_DIFF = 0.005 // 0.5%的最小变化
```

### 行号映射

在 MarkdownRenderer 中为每个块级元素添加 data-line 属性：

```typescript
token.attrSet?.('data-line', lineNumber.toString())
```

## 结论

如果以上测试都能正常工作，说明双向同步滚动功能实现成功！