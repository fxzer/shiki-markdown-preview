# Markdown Preview Test (markdown-it)

This is a **test markdown file** to verify the VS Code extension functionality with **markdown-it** parser.

## 🎉 markdown-it Features

### Emoji Support
I :heart: markdown-it! It's :rocket: awesome! :thumbsup:

### Typographic Replacements
(c) (C) (r) (R) (tm) (TM) (p) (P) +- 

"Smartypants, double quotes" and 'single quotes' are handled correctly.

### Table of Contents
[[toc]]

## Code Syntax Highlighting (Shiki)

### JavaScript
```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
```

### Python
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3, 6, 8, 10, 1, 2, 1]))
```

### TypeScript
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
    
    getUser(id: number): User | undefined {
        return this.users.find(user => user.id === id);
    }
}
```

## Enhanced Lists and Formatting

### Task Lists (with markdown-it-task-lists)
- [x] Completed task with checkbox
- [ ] Pending task
- [ ] Another pending task
- [x] Another completed task

### Definition Lists
Term 1
:   Definition 1

Term 2
:   Definition 2a
:   Definition 2b

### Unordered List
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

### Ordered List
1. First step
2. Second step
3. Third step

### Blockquote with Attribution
> This is a blockquote with **bold text** and *italic text*
> 
> It can span multiple lines and contain various formatting
> 
> -- Author Name

### Enhanced Table
| Language | Type | Popular | Year |
|----------|------|-----------|------|
| JavaScript | Interpreted | Yes | 1995 |
| Python | Interpreted | Yes | 1991 |
| Rust | Compiled | Growing | 2010 |
| Go | Compiled | Yes | 2009 |

## Links and Images

### External Link with Title
Visit [GitHub](https://github.com "GitHub Homepage") for more information.

### Auto-linking
https://github.com will be automatically converted to a link.

### Image with Alt Text and Title
![VS Code Logo](https://code.visualstudio.com/assets/images/code-stable.png "Visual Studio Code")

### Relative Path Test
This should handle relative paths correctly.

## Text Formatting Enhancements

You can make text **bold**, *italic*, or ***both***.

~~Strikethrough text~~ is also supported.

### Superscript and Subscript (if enabled)
H~2~O and E=mc^2^ 

### Marked Text
==Highlighted text== (with appropriate plugin)

## Code Fences with Language

### Rust
```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled);
}
```

### Go
```go
package main

import "fmt"

func main() {
    message := "Hello, World!"
    fmt.Println(message)
}
```

### Java
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

### Bash
```bash
#!/bin/bash
echo "Hello, World!"
ls -la
```

## Horizontal Rule

---

## HTML Escaping

Special characters: < > & " ' should be properly escaped.

## Long Content for Scroll Testing

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### More Language Examples

#### C++
```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    for (int num : numbers) {
        std::cout << num << " ";
    }
    return 0;
}
```

#### Ruby
```ruby
# Ruby example
def greet(name)
  "Hello, #{name}!"
end

puts greet("World")
```

#### Swift
```swift
import Foundation

func greet(name: String) -> String {
    return "Hello, \(name)!"
}

print(greet(name: "World"))
```

This content helps test scroll synchronization between the editor and preview with **markdown-it** parser.