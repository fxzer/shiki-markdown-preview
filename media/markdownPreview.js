// This script will be run within the markdown preview webview
// It handles scroll synchronization and other interactive features

(function () {
    const vscode = acquireVsCodeApi();
    
    // Get the markdown content container
    const contentContainer = document.getElementById('markdown-content');
    if (!contentContainer) {
        console.error('Markdown content container not found');
        return;
    }

    // Use window as scroll container since div doesn't scroll by default
    const scrollContainer = window;
    console.log('Markdown preview initialized, sync scroll enabled');

    // Scroll synchronization
    let isScrollingFromWebview = false;
    let scrollTimeout;
    let lastScrollUpdate = 0;
    const SCROLL_THROTTLE = 16; // ~60fps for smooth scrolling

    // Handle wheel events for more precise mouse wheel scroll detection
    let wheelTimeout;
    let isWheelScrolling = false;
    let lastScrollTop = 0;
    
    function handleWheelScroll(event) {
        if (isScrollingFromWebview) {
            isScrollingFromWebview = false;
            return;
        }

        const now = Date.now();
        if (now - lastScrollUpdate < SCROLL_THROTTLE) {
            return; // Throttle for smooth performance
        }
        lastScrollUpdate = now;

        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
            const scrollTop = scrollContainer.pageYOffset || document.documentElement.scrollTop;
            
            // Only sync if there was actual scroll movement
            if (Math.abs(scrollTop - lastScrollTop) > 5) {
                lastScrollTop = scrollTop;
                
                const scrollHeight = document.documentElement.scrollHeight - scrollContainer.innerHeight;
                const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
                
                // Find the current visible line with better accuracy
                const elements = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, table, hr');
                let currentLine = 0;
                let bestMatch = null;
                let bestDistance = Infinity;
                
                const containerCenter = window.innerHeight / 2; // Viewport center
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    const rect = element.getBoundingClientRect();
                    const elementCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(elementCenter - containerCenter);
                    
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestMatch = element;
                        // Prioritize data-line attribute, fallback to element index
                        const dataLine = element.getAttribute('data-line');
                        currentLine = dataLine ? parseInt(dataLine) : i;
                    }
                }

                // Send scroll information to extension with additional context
                vscode.postMessage({
                    command: 'scroll',
                    line: currentLine,
                    percentage: scrollPercentage,
                    timestamp: now,
                    elementCount: elements.length,
                    isWheelEvent: true  // Mark as wheel event for better handling
                });
                
                console.log(`Wheel scroll sync: line ${currentLine}, percentage ${(scrollPercentage * 100).toFixed(1)}%`);
            }
        }, 150); // 150ms delay for wheel events
    }

    // Listen for both scroll and wheel events
    scrollContainer.addEventListener('scroll', handleWheelScroll);
    scrollContainer.addEventListener('wheel', (event) => {
        isWheelScrolling = true;
        handleWheelScroll(event);
        
        // Reset wheel scrolling flag after a delay
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
            isWheelScrolling = false;
        }, 200);
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Webview received message:', message);
        
        switch (message.command) {
            case 'syncScroll':
                // Sync scroll position from editor with smooth animation
                isScrollingFromWebview = true;
                const scrollPercentage = message.percentage || 0;
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const targetScrollTop = scrollHeight * scrollPercentage;
                
                // Smooth scroll animation
                const startScrollTop = scrollContainer.pageYOffset || document.documentElement.scrollTop;
                const scrollDistance = targetScrollTop - startScrollTop;
                const animationDuration = 200; // ms
                const startTime = Date.now();
                
                console.log(`Sync scroll: target ${targetScrollTop}px (${(scrollPercentage * 100).toFixed(1)}%)`);
                
                function animateScroll() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / animationDuration, 1);
                    
                    // Use easing function for natural motion
                    const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
                    
                    scrollContainer.scrollTo(0, startScrollTop + (scrollDistance * easeProgress));
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateScroll);
                    } else {
                        // Reset flag after animation completes
                        setTimeout(() => {
                            isScrollingFromWebview = false;
                        }, 50);
                    }
                }
                
                requestAnimationFrame(animateScroll);
                break;

            case 'updateContent':
                // Update the markdown content
                const markdownContent = document.getElementById('markdown-content');
                if (markdownContent) {
                    markdownContent.innerHTML = message.content;
                    // Re-apply syntax highlighting if needed
                    applySyntaxHighlighting();
                }
                break;

            case 'highlightLine':
                // Highlight a specific line (for sync)
                highlightLine(message.line);
                break;
        }
    });

    // Apply syntax highlighting to code blocks
    function applySyntaxHighlighting() {
        // Shiki should have already applied highlighting, but we can add additional processing here
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block, index) => {
            // Add copy button or other enhancements
            addCopyButton(block.parentElement);
        });
    }

    // Add copy button to code blocks
    function addCopyButton(preElement) {
        if (!preElement || preElement.querySelector('.copy-button')) return;

        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
        });

        button.addEventListener('mouseleave', () => {
            button.style.opacity = '0.7';
        });

        button.addEventListener('click', async () => {
            const code = preElement.textContent || '';
            try {
                await navigator.clipboard.writeText(code);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                button.textContent = 'Failed';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        });

        preElement.style.position = 'relative';
        preElement.appendChild(button);
    }

    // Highlight a specific line
    function highlightLine(lineNumber) {
        // Remove previous highlights
        const previousHighlights = document.querySelectorAll('.line-highlight');
        previousHighlights.forEach(el => el.classList.remove('line-highlight'));

        // Find and highlight the line
        const elements = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote');
        const targetElement = elements[lineNumber];
        
        if (targetElement) {
            targetElement.classList.add('line-highlight');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
                targetElement.classList.remove('line-highlight');
            }, 2000);
        }
    }

    // Handle link clicks
    contentContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'A') {
            const href = target.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('http')) {
                // Handle relative links
                event.preventDefault();
                vscode.postMessage({
                    command: 'openLink',
                    href: href
                });
            }
        }
    });

    // Handle image clicks for zoom
    contentContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'IMG') {
            // You could implement image zoom functionality here
            console.log('Image clicked:', target.src);
        }
    });

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        applySyntaxHighlighting();
        
        // Send ready message to extension
        vscode.postMessage({
            command: 'ready'
        });
    });

})();