# 代码块测试

## 行内代码
`console.log('Hello')`

## 基础代码块
```
// 基础围栏代码块
function add(a, b) {
    return a + b;
}
```

## 语法高亮

### JavaScript
```javascript
// 变量与常量

// eslint-disable-next-line no-var
var legacyVar = 'old school'
// eslint-disable-next-line prefer-const
let blockScopedLet = 'modern'
const constantVal = 'immutable'

// 函数
function classicFunction(name) {
  return `Hello, ${name}`
}

// 箭头函数
const arrowFunction = (a, b) => a + b

// 异步函数
async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}
```

### TypeScript
```typescript
interface User { id: number, name: string }
const getUser = (id: number): User => ({ id, name: 'Alice' })
```

### Python
```python
class Product:
    def __init__(self, name: str):
        self.name = name

# 列表推导式
names = [p.name for p in [Product("Laptop"), Product("Book")]]
```

### SQL
```sql
SELECT id, username FROM users WHERE created_at > NOW() - INTERVAL '30 days';
```

### Bash
```bash
#!/bin/bash
set -euo pipefail
log() {
  echo "[INFO] $1"
}
log "Script started."
```

## 特殊功能

### 行高亮
```javascript{1,3-5}
function greet(name) {
  // 高亮第 1, 3, 4, 5 行
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}
```

### Diff
```diff
+ 新增行
- 删除行
```

## 热门语言代码块

### Java
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

### C++
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
```

### Go
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

### Rust
```rust
fn main() {
    println!("Hello, World!");
}
```

### C#
```csharp
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
```

### PHP
```php
<?php
echo "Hello, World!";
?>
```

### Ruby
```ruby
puts "Hello, World!"
```

### Swift
```swift
print("Hello, World!")
```

### Kotlin
```kotlin
fun main() {
    println("Hello, World!")
}
```

### R
```r
print("Hello, World!")
```

### Dart
```dart
void main() {
  print('Hello, World!');
}
```

### Lua
```lua
print("Hello, World!")
```

### Julia
```julia
println("Hello, World!")
```

### Haskell
```haskell
main = putStrLn "Hello, World!"
```

### Scala
```scala
object Main {
  def main(args: Array[String]): Unit = {
    println("Hello, World!")
  }
}
```
