# Body Max Width 测试

这是一个用于测试 bodyMaxWidth 配置项的 Markdown 文件。

## 测试内容

1. 这是一个长段落，用于测试预览页面的最大宽度设置。当设置不同的 bodyMaxWidth 值时，预览页面的内容区域应该相应地调整宽度。如果设置为较小的值，内容区域应该变窄；如果设置为较大的值，内容区域应该变宽。

2. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

3. 这是另一个长段落，用于进一步测试宽度设置。Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

## 测试步骤

1. 打开 VS Code 设置，找到 `vscode-markdown-shiki-preview.bodyMaxWidth` 配置项
2. 尝试设置不同的值，如 '800px'、'1200px'、'50%' 等
3. 观察预览页面的宽度变化
4. 尝试设置无效值，如 'invalid'，观察是否回退到默认值 '1000px'

## 代码块测试

```javascript
// 这是一个用于测试代码块宽度的示例代码
function exampleFunction() {
  console.log('This is a test function to check code block width in preview')
  const longVariableNameToTestCodeBlockWidthInPreview = 'This is a very long string to test the width of code blocks in the preview'
  return longVariableNameToTestCodeBlockWidthInPreview
}
```

```python
# Python 代码块测试
def example_function():
    print('This is a test function to check code block width in preview')
    long_variable_name_to_test_code_block_width_in_preview = 'This is a very long string to test the width of code blocks in the preview'
    return long_variable_name_to_test_code_block_width_in_preview
```

# 滚动同步测试

这是一个用于测试滚动同步功能的文档。

## 第一部分

这里有很多内容来测试滚动同步。

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## 第二部分

更多内容来测试滚动。

```javascript
function testFunction() {
  console.log('This is a test function')
  return 'Hello World'
}

const result = testFunction()
console.log(result)
```

## 第三部分

继续添加内容。

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

## 第四部分

更多测试内容。

```python
def hello_world():
    print("Hello, World!")
    return "Python is working"

if __name__ == "__main__":
    result = hello_world()
    print(result)
```

## 第五部分

最后一部分内容。

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

## 第六部分

更多内容来确保有足够的滚动空间。

Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.

Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.

## 第七部分

继续添加内容。

Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.

## 第八部分

更多测试内容。

```typescript
interface TestInterface {
  name: string
  value: number
}

class TestClass implements TestInterface {
  constructor(public name: string, public value: number) {}

  getInfo(): string {
    return `${this.name}: ${this.value}`
  }
}

const instance = new TestClass('test', 42)
console.log(instance.getInfo())
```

## 第九部分

接近结尾的内容。

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

## 第十部分

最后的内容。

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

---

**测试说明：**

1. 打开这个文件
2. 滚动预览区，观察编辑器是否同步滚动
3. 滚动编辑器，观察预览区是否同步滚动
4. 查看浏览器控制台和VS Code开发者控制台的调试信息
