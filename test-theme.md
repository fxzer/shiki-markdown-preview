# Shiki 主题测试文档

这是一个用于测试 Shiki 主题选择器的 Markdown 文档。

## 代码示例

### JavaScript
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to Shiki theme selector!`;
}

const user = "Developer";
greet(user);
```

### TypeScript
```typescript
interface ThemeConfig {
  name: string;
  type: 'light' | 'dark';
  colors: {
    background: string;
    foreground: string;
  };
}

class ThemeManager {
  private currentTheme: ThemeConfig;
  
  constructor(theme: ThemeConfig) {
    this.currentTheme = theme;
  }
  
  switchTheme(newTheme: ThemeConfig): void {
    this.currentTheme = newTheme;
    console.log(`Switched to ${newTheme.name} theme`);
  }
}
```

### Python
```python
import json
from typing import Dict, List

class ShikiTheme:
    def __init__(self, name: str, colors: Dict[str, str]):
        self.name = name
        self.colors = colors
    
    def to_json(self) -> str:
        return json.dumps({
            'name': self.name,
            'colors': self.colors
        })

# 主题列表
themes = [
    ShikiTheme("vitesse-dark", {"bg": "#1e1e2e", "fg": "#cdd6f4"}),
    ShikiTheme("github-light", {"bg": "#ffffff", "fg": "#24292f"}),
    ShikiTheme("dracula", {"bg": "#282a36", "fg": "#f8f8f2"})
]

for theme in themes:
    print(f"Available theme: {theme.name}")
```

### CSS
```css
.theme-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.theme-option {
  border: 2px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-option:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-2px);
}

.theme-option.selected {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}
```

## 使用说明

### 方法一：命令中心主题选择（推荐）
1. **打开预览**：使用 `Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
2. **打开主题选择器**：
   - 使用快捷键 `Ctrl+Shift+T` (Windows/Linux) 或 `Cmd+Shift+T` (Mac)
   - 或者按 `Ctrl+Shift+P` 打开命令面板，搜索 "Select Theme"
3. **选择主题**：
   - 使用方向键浏览主题列表
   - 实时预览主题效果（300ms防抖）
   - 按回车确认选择
   - 按ESC取消选择

### 方法二：Webview内主题选择
1. **打开预览**：使用 `Ctrl+Shift+V` (Windows/Linux) 或 `Cmd+Shift+V` (Mac)
2. **选择主题**：点击预览窗口右上角的主题选择按钮
3. **键盘导航**：使用方向键浏览主题，回车确认选择
4. **实时预览**：选择主题时立即看到效果

## 功能特性

- ✅ 支持 60+ 种 Shiki 主题
- ✅ 键盘导航（方向键）
- ✅ 实时主题预览
- ✅ 一键切换主题
- ✅ 主题配置持久化
- ✅ 响应式 UI 设计
- ✅ SVG图标复制按钮（复制后显示绿色勾选图标）
- ✅ 命令中心主题选择器（支持实时预览和键盘导航）

## 主题分类

### 浅色主题
- GitHub Light
- Vitesse Light  
- One Light
- Solarized Light
- 等等...

### 深色主题
- Vitesse Dark
- Dracula
- One Dark Pro
- Tokyo Night
- 等等...
