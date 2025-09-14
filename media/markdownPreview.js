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

    // Scroll synchronization
    let isScrollingFromWebview = false;
    let scrollTimeout;

    // Handle scroll events to sync with editor
    contentContainer.addEventListener('scroll', () => {
        if (isScrollingFromWebview) {
            isScrollingFromWebview = false;
            return;
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrollTop = contentContainer.scrollTop;
            const scrollHeight = contentContainer.scrollHeight - contentContainer.clientHeight;
            const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
            
            // Find the current visible line
            const elements = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote');
            let currentLine = 0;
            
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const rect = element.getBoundingClientRect();
                const containerRect = contentContainer.getBoundingClientRect();
                
                if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
                    // Try to get line number from data attribute or estimate
                    currentLine = parseInt(element.getAttribute('data-line') || '0') || i;
                    break;
                }
            }

            // Send scroll information to extension
            vscode.postMessage({
                command: 'scroll',
                line: currentLine,
                percentage: scrollPercentage
            });
        }, 100);
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'syncScroll':
                // Sync scroll position from editor
                isScrollingFromWebview = true;
                const scrollPercentage = message.percentage || 0;
                const scrollHeight = contentContainer.scrollHeight - contentContainer.clientHeight;
                contentContainer.scrollTop = scrollHeight * scrollPercentage;
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