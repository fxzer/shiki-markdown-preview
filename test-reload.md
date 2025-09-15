# Test Reload Functionality

This is a test markdown file to verify that the preview panel correctly restores after a VS Code window reload.

## Features to Test

1. **Window Reload**: After reloading the VS Code window, the preview should automatically restore
2. **Document Focus**: The markdown file should be automatically focused in the editor
3. **Preview Content**: The preview should show the correct content

## Code Example

```javascript
function testReload() {
    console.log("Testing reload functionality...");
    return "Success!";
}
```

## Expected Behavior

- ✅ Preview panel should restore automatically
- ✅ Document should be focused in editor
- ✅ No "No document selected" message should appear
- ✅ Content should render correctly

---

*This file will be used to test the webview serializer functionality.*
