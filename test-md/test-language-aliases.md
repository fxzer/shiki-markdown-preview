# 语言别名测试

## JavaScript 测试

```js
// 这应该被正确映射为 javascript

function hello() {
  console.log('Hello, World!')
}
```

## TypeScript 测试

```ts
// 这应该被正确映射为 typescript
interface User {
  name: string
  age: number
}

const user: User = { name: 'Alice', age: 30 }
```

## Python 测试

```py
# 这应该被正确映射为 python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
```

## Go 测试

```go
// 这应该被正确映射为 go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

## Rust 测试

```rs
// 这应该被正确映射为 rust
fn main() {
    println!("Hello, World!");
}
```

## C++ 测试

```cpp
// 这应该被正确映射为 cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
```

## C# 测试

```cs
// 这应该被正确映射为 csharp
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
```

## Ruby 测试

```rb
# 这应该被正确映射为 ruby
puts "Hello, World!"
```

## Vim 测试

```vim
" 这应该被正确映射为 viml
echo "Hello, World!"
```

## Docker 测试

```dockerfile
# 这应该被正确映射为 docker
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

## 其他测试

```txt
这应该被正确映射为 text
```

```log
2018-01-27 10:38:20.442 [8988] INFO  [Bootstrapper]: Hello World
2018-01-27 10:38:20.443 [8988] INFO  [Bootstrapper]: Hello World
2018-01-27 10:38:25.459 [8988] INFO  [Bootstrapper]: Hello World
2018-01-27 10:38:25.459 [8988] INFO  [Bootstrapper]: Hello World
27.01.2018 19:38:28,982 [8988] Verbose [Application]: Hello World
27.01.2018 19:38:28,982 [8988] VERBOSE [Application]: Hello World
27.01.2018 19:38:28,982 [8988] [verbose] [Application]: Hello World
27.01.2018 19:38:28,982 [8988] verbose: [Application]: Hello World
27.01.2018 19:38:28,982 [8988] E/Application: It crashed!
27.01.2018 19:38:28,982 [8988] E/MyService: It crashed!
27.01.2018 19:38:28,982 [8988] E/Subservice: It crashed!
```
