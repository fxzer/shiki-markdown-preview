// Notion风格的文档结构导航菜单
class NotionToc {
  constructor() {
    console.log('NotionToc constructor called');
    this.headers = [];
    this.tocContainer = null;
    this.detailedMenu = null;
    this.isHovering = false;
    this.currentActiveIndex = -1;
    this.scrollThrottleTimer = null;
    this.isScrollingToTarget = false;
    
    this.init();
  }

  init() {
    console.log('NotionToc init() called');
    try {
      this.createTocContainer();
      this.parseHeaders();
      this.renderToc();
      this.bindEvents();
      this.observeContentChanges();
      console.log('NotionToc init() completed successfully');
    } catch (error) {
      console.error('Error in NotionToc init():', error);
    }
  }

  // 创建TOC容器
  createTocContainer() {
    console.log('Creating TOC container...');
    this.tocContainer = document.createElement('div');
    this.tocContainer.className = 'notion-toc-container';
    this.tocContainer.innerHTML = `
      <div class="notion-toc-minimal">
        <div class="toc-lines"></div>
      </div>
      <div class="notion-toc-detailed" style="display: none;">
        <div class="toc-items"></div>
      </div>
    `;
    
    document.body.appendChild(this.tocContainer);
    console.log('TOC container appended to body');
    
    this.minimalView = this.tocContainer.querySelector('.notion-toc-minimal');
    this.detailedView = this.tocContainer.querySelector('.notion-toc-detailed');
    this.linesContainer = this.tocContainer.querySelector('.toc-lines');
    this.itemsContainer = this.tocContainer.querySelector('.toc-items');
    
    console.log('TOC container created successfully');
  }

  // 解析文章标题结构
  parseHeaders() {
    console.log('NotionToc parseHeaders() called');
    const content = document.getElementById('markdown-content');
    console.log('Found markdown-content element:', content);
    if (!content) return;

    this.headers = [];
    const headers = content.querySelectorAll('h1, h2, h3');
    console.log('Found headers:', headers.length);
    
    headers.forEach((header, index) => {
      const id = header.id || `header-${index}`;
      if (!header.id) {
        header.id = id;
      }
      
      this.headers.push({
        element: header,
        id: id,
        level: parseInt(header.tagName.charAt(1)),
        text: header.textContent.trim(),
        offsetTop: header.offsetTop
      });
    });
    
    console.log('Parsed headers:', this.headers.length);
  }

  // 渲染目录
  renderToc() {
    this.renderMinimalView();
    this.renderDetailedView();
  }

  // 渲染简约视图（短横线）
  renderMinimalView() {
    if (!this.linesContainer) return;
    
    this.linesContainer.innerHTML = '';
    
    this.headers.forEach((header, index) => {
      const line = document.createElement('div');
      line.className = 'toc-line';
      line.setAttribute('data-index', index);
      
      const lineBar = document.createElement('div');
      lineBar.className = 'toc-line-bar';
      
      // 根据标题级别设置线条长度和右对齐缩进
      const widthMap = { 1: 16, 2: 12, 3: 8 };
      
      lineBar.style.width = `${widthMap[header.level] || 8}px`;
      
      if (index === this.currentActiveIndex) {
        lineBar.classList.add('active');
      }
      
      line.appendChild(lineBar);
      this.linesContainer.appendChild(line);
    });
  }

  // 渲染详细视图
  renderDetailedView() {
    if (!this.itemsContainer) return;
    
    this.itemsContainer.innerHTML = '';
    
    this.headers.forEach((header, index) => {
      const item = document.createElement('div');
      item.className = 'toc-item';
      item.setAttribute('data-index', index);
      
      // 根据级别添加左缩进（详细视图保持左对齐）
      const indentMap = { 1: 0, 2: 16, 3: 32 };
      item.style.marginLeft = `${indentMap[header.level] || 0}px`;
      
      if (index === this.currentActiveIndex) {
        item.classList.add('active');
      }
      
      item.innerHTML = `
        <span class="toc-item-text">${this.escapeHtml(header.text)}</span>
      `;
      
      item.addEventListener('click', () => this.scrollToHeader(index));
      this.itemsContainer.appendChild(item);
    });
  }

  // 绑定事件
  bindEvents() {
    // 鼠标悬停事件
    this.tocContainer.addEventListener('mouseenter', () => {
      this.isHovering = true;
      this.showDetailedView();
    });

    this.tocContainer.addEventListener('mouseleave', () => {
      this.isHovering = false;
      this.hideDetailedView();
    });

    // 简约视图点击事件
    this.linesContainer.addEventListener('click', (e) => {
      const line = e.target.closest('.toc-line');
      if (line) {
        const index = parseInt(line.getAttribute('data-index'));
        this.scrollToHeader(index);
      }
    });

    // 滚动事件（节流）
    window.addEventListener('scroll', this.throttledScrollHandler.bind(this));
    
    // 窗口大小改变事件
    window.addEventListener('resize', () => {
      this.updateHeaderPositions();
    });
  }

  // 显示详细视图
  showDetailedView() {
    this.minimalView.style.display = 'none';
    this.detailedView.style.display = 'block';
  }

  // 隐藏详细视图
  hideDetailedView() {
    this.minimalView.style.display = 'block';
    this.detailedView.style.display = 'none';
  }

  // 滚动到指定标题
  scrollToHeader(index) {
    if (index < 0 || index >= this.headers.length) return;
    
    const header = this.headers[index];
    this.isScrollingToTarget = true;
    
    header.element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // 更新当前活跃项
    this.updateActiveItem(index);
    
    // 滚动完成后重置标志
    setTimeout(() => {
      this.isScrollingToTarget = false;
    }, 1000);
  }

  // 节流的滚动处理
  throttledScrollHandler() {
    if (this.scrollThrottleTimer || this.isScrollingToTarget) return;
    
    this.scrollThrottleTimer = setTimeout(() => {
      this.handleScroll();
      this.scrollThrottleTimer = null;
    }, 100);
  }

  // 处理滚动事件
  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    let activeIndex = -1;
    
    // 找到当前视口中的标题
    for (let i = this.headers.length - 1; i >= 0; i--) {
      const header = this.headers[i];
      const elementTop = header.element.offsetTop;
      const elementBottom = elementTop + header.element.offsetHeight;
      
      // 判断标题是否在视口中
      if (scrollTop + 100 >= elementTop && scrollTop < elementBottom) {
        activeIndex = i;
        break;
      }
    }
    
    // 如果在页面底部，激活最后一个标题
    if (scrollTop + viewportHeight >= documentHeight - 100) {
      activeIndex = this.headers.length - 1;
    }
    
    this.updateActiveItem(activeIndex);
  }

  // 更新活跃项
  updateActiveItem(index) {
    if (this.currentActiveIndex === index) return;
    
    this.currentActiveIndex = index;
    
    // 更新简约视图
    const lines = this.linesContainer.querySelectorAll('.toc-line-bar');
    lines.forEach((line, i) => {
      line.classList.toggle('active', i === index);
    });
    
    // 更新详细视图
    const items = this.itemsContainer.querySelectorAll('.toc-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  }

  // 更新标题位置
  updateHeaderPositions() {
    this.headers.forEach(header => {
      header.offsetTop = header.element.offsetTop;
    });
  }

  // 监听内容变化
  observeContentChanges() {
    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName && node.nodeName.match(/^H[1-6]$/)) {
              shouldUpdate = true;
            }
          });
        }
      });
      
      if (shouldUpdate) {
        setTimeout(() => {
          this.refresh();
        }, 100);
      }
    });
    
    const content = document.getElementById('markdown-content');
    if (content) {
      observer.observe(content, {
        childList: true,
        subtree: true
      });
    }
  }

  // 刷新目录
  refresh() {
    this.parseHeaders();
    this.renderToc();
    this.handleScroll();
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 销毁
  destroy() {
    if (this.tocContainer) {
      this.tocContainer.remove();
    }
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
    }
  }
}

// 初始化Notion TOC
function initializeNotionToc() {
  console.log('Initializing NotionToc...');
  
  // 检查必要的DOM元素是否存在
  const content = document.getElementById('markdown-content');
  console.log('Markdown content element:', content);
  
  if (!content) {
    console.warn('Markdown content not found, retrying in 500ms...');
    setTimeout(initializeNotionToc, 500);
    return;
  }
  
  // 检查是否有标题元素
  const headers = content.querySelectorAll('h1, h2, h3');
  console.log('Found headers:', headers.length);
  
  if (headers.length === 0) {
    console.warn('No headers found, retrying in 1000ms...');
    setTimeout(initializeNotionToc, 1000);
    return;
  }
  
  console.log('Creating NotionToc instance...');
  window.notionToc = new NotionToc();
  console.log('NotionToc instance created:', window.notionToc);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  // 等待内容加载完成
  setTimeout(initializeNotionToc, 100);
});

// 监听来自扩展的消息
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.command) {
    case 'refreshToc':
      if (window.notionToc) {
        window.notionToc.refresh();
      }
      break;
  }
});