const fs = require('fs')
const path = require('path')

// 复制webview静态文件到输出目录
function copyWebviewFiles() {
  const srcDir = path.join(__dirname, '../src/webview')
  const outDir = path.join(__dirname, '../out/webview')
  
  // 确保输出目录存在
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  
  // 复制文件
  const files = ['index.js', 'style.css']
  
  files.forEach(file => {
    const srcPath = path.join(srcDir, file)
    const outPath = path.join(outDir, file)
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, outPath)
      console.log(`Copied ${file} to output directory`)
    } else {
      console.warn(`Warning: ${file} not found in ${srcDir}`)
    }
  })
}

// 执行复制
copyWebviewFiles()
console.log('Build script completed')