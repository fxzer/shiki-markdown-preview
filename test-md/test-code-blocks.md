---
name: abc
---

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

## 基础代码块123dfdsfdfdsf基础代码块123dfdsfdfdsf基础代码块123dfdsfdfdsf基础代码块123dfdsfdfdsf

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

#### 基础高亮语法

```javascript{1,3-5}
function greet(name) {
  // 高亮第 1, 3, 4, 5 行
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}
```

#### 单行高亮

```python{3}
def fibonacci(n):
    if n <= 1:
        return n  # 高亮这一行
    return fibonacci(n-1) + fibonacci(n-2)
```

#### 连续行高亮

```typescript{2-4}
interface User {
  id: number;        // 高亮第 2-4 行
  name: string;
  email: string;
  isActive: boolean;
}
```

#### 多段高亮

```javascript{1,5,8-10}
// 高亮第 1 行
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
};

// 高亮第 5 行
function fetchData() {
  // 高亮第 8-10 行
  return fetch(config.apiUrl)
    .then(response => response.json())
    .catch(error => console.error(error));
}
```

#### 复杂高亮模式

```go{1,3-5,7,9-11}
package main  // 高亮第 1 行

import (      // 高亮第 3-5 行
    "fmt"
    "time"
)

func main() { // 高亮第 7 行
    // 高亮第 9-11 行
    fmt.Println("Hello, World!")
    time.Sleep(1 * time.Second)
    fmt.Println("Done!")
}
```

#### 大范围高亮

```rust{2-8}
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];  // 高亮第 2-8 行
    let doubled: Vec<i32> = numbers
        .iter()
        .map(|x| x * 2)
        .collect();

    println!("{:?}", doubled);
}
```

#### 混合高亮

```java{1,3,5-7,9}
public class Calculator {  // 高亮第 1 行
    private int result;    // 高亮第 3 行

    public int add(int a, int b) {  // 高亮第 5-7 行
        result = a + b;
        return result;
    }

    public void reset() { result = 0; }  // 高亮第 9 行
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
