## 6. 表格

### 基础表格

| 姓名 | 年龄 | 城市 |
| ---- | ---- | ---- |
| 张三 | 25   | 北京 |
| 李四 | 30   | 上海 |
| 王五 | 28   | 广州 |

### 对齐表格

## 4. 链接和引用

### 普通链接

[GitHub](https://github.com)

[带标题的链接](https://github.com 'GitHub 主页')https://github.com
<https://github.com>

[test-tables.md](./test-tables.md)

[测试相对路径跳转功能](./test-relative-links.md)

### 自动链接

### 引用

> 这是一个引用块
> 可以包含多行文本1
>
> > 嵌套引用2
> >
> > > 第3行
> > >
> > > > 第4行
> > > >
> > > > > 第5行
> > > > >
> > > > > > 第6行

## 7. 代码块 `行内代码`

### Bash

```bash
#!/bin/bash

# 现代 Bash 脚本示例
set -euo pipefail

# 颜色定义
readonly RED='\033[0;31m'

# 日志函数
log() {
    local level=$1
}

info() { log "$GREEN" "$@"; }

# 获取 Git 信息
get_git_info() {
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    echo "branch:$branch,commit:$commit$dirty"
}
```

### CSS

```css
/* 现代 CSS 特性示例 */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
}

/* 使用 CSS Grid */
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

/* 使用 Flexbox */
.card {
  display: flex;
  flex-direction: column;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
```

### JavaScript

```javascript
// ES6+ 特性示例
const users = [
  { name: 'Alice', age: 25, active: true },
]

// 使用箭头函数和数组方法
const activeUsers = users
  .filter(user => user.active)
  .map(user => ({ ...user, displayName: user.name.toUpperCase() }))

// 异步函数示例
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`)
    const data = await response.json()
    return data
  }
  catch (error) {
    console.error('获取用户数据失败:', error)
    throw error
  }
}

// 使用 Promise
fetchUserData(123)
  .then(user => console.log('用户信息:', user))
  .catch(err => console.error('错误:', err))
```
