# 代码块行号测试

## JavaScript 示例

```javascript
function fibonacci(n) {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
// 输出: 55

const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(n => n * n);
console.log(squared);
```

## Python 示例

```python
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n - 1)

# 计算 5!
result = factorial(5)
print(f"5! = {result}")

# 列表推导式示例
squares = [x**2 for x in range(10)]
print(squares)
```

## TypeScript 示例

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  findUser(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

const userService = new UserService();
userService.addUser({ id: 1, name: "张三", email: "zhangsan@example.com" });
console.log(userService.getAllUsers());
```

## CSS 示例

```css
.code-block-wrapper {
  display: flex;
  background-color: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
}

.line-numbers {
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  user-select: none;
}

@media (max-width: 768px) {
  .line-numbers {
    display: none;
  }
}
```

请在设置中切换 "Show Line Numbers" 选项来测试行号显示功能！
