# Shiki 原生行号功能测试

## 功能说明

现在使用 Shiki 内置的 `lineNumbers` 选项来实现行号显示，这比之前的自定义实现更加高效和稳定。

## 测试代码块

### JavaScript 示例

```javascript
// 这是一个 JavaScript 函数示例
function calculateSum(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

// 使用示例
const numbers = [1, 2, 3, 4, 5];
const result = calculateSum(numbers);
console.log(`Sum: ${result}`);
```

### TypeScript 示例

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  findUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getActiveUsers(): User[] {
    return this.users.filter(user => user.isActive);
  }
}
```

### Python 示例

```python
import asyncio
from typing import List, Optional

class DataProcessor:
    def __init__(self, data: List[int]):
        self.data = data
        self.processed_data: Optional[List[int]] = None
    
    async def process_data(self) -> List[int]:
        """异步处理数据"""
        await asyncio.sleep(0.1)  # 模拟异步操作
        self.processed_data = [x * 2 for x in self.data if x > 0]
        return self.processed_data
    
    def get_statistics(self) -> dict:
        """获取数据统计信息"""
        if not self.processed_data:
            return {"error": "数据未处理"}
        
        return {
            "count": len(self.processed_data),
            "sum": sum(self.processed_data),
            "average": sum(self.processed_data) / len(self.processed_data)
        }
```

### CSS 示例

```css
/* 响应式网格布局 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.grid-item {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 1.5rem;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.grid-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
    padding: 0.5rem;
  }
}
```

## 技术优势

✅ **原生支持**：使用 Shiki 内置的 transformers 机制  
✅ **性能优化**：无需额外的 DOM 操作和 HTML 生成  
✅ **样式统一**：行号样式与代码高亮完美集成  
✅ **维护简单**：减少了自定义代码，降低维护成本  
✅ **功能稳定**：基于 Shiki 官方 API，更加可靠  

## 设置方法

在 VS Code 设置中启用行号显示：

```json
{
  "shiki-markdown-preview.showLineNumbers": true
}
```

享受更好的代码阅读体验！🎉
