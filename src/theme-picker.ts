import * as vscode from 'vscode';
import { bundledThemes } from 'shiki';
import { ConfigService } from './config-service';
import { MarkdownPreviewPanel } from './markdown-preview';

/**
 * 主题快速选择项接口
 */
interface ThemeQuickPickItem extends vscode.QuickPickItem {
  theme: string;
}

/**
 * 显示主题选择器
 */
export async function showThemePicker(provider: MarkdownPreviewPanel): Promise<void> {
  // 获取所有可用主题并动态分组排序
  const themePromises = Object.values(bundledThemes).map(importer => importer());
  const loadedThemes = await Promise.all(themePromises);
  const allThemeData = loadedThemes.map(t => t.default);

  const lightThemes: { label: string, theme: string }[] = [];
  const darkThemes: { label: string, theme: string }[] = [];

  allThemeData.forEach((t) => {
    const themeInfo = { label: (t.displayName as string) || (t.name as string), theme: t.name as string };
    if (t.type === 'light') {
      lightThemes.push(themeInfo);
    }
    else if (t.type === 'dark') {
      darkThemes.push(themeInfo);
    }
  });

  lightThemes.sort((a, b) => a.label.localeCompare(b.label));
  darkThemes.sort((a, b) => a.label.localeCompare(b.label));

  const themes: ThemeQuickPickItem[] = [
    { label: 'LIGHT THEMES', theme: '', kind: vscode.QuickPickItemKind.Separator as any },
    ...lightThemes,
    { label: 'DARK THEMES', theme: '', kind: vscode.QuickPickItemKind.Separator as any },
    ...darkThemes,
  ] as ThemeQuickPickItem[];

  const configService = new ConfigService();
  const currentThemeValue = configService.getCurrentTheme() || 'github-light';

  // 找到当前主题的索引
  const currentIndex = themes.findIndex(t => t.theme === currentThemeValue);
  if (currentIndex !== -1) {
    themes[currentIndex].picked = true;
  }

  // 创建 QuickPick 实例以获得更多控制
  const quickPick = vscode.window.createQuickPick<ThemeQuickPickItem>();
  quickPick.title = '选择主题 (使用方向键预览，回车确认)';
  quickPick.placeholder = `从 ${themes.length} 个可用主题中选择`;
  quickPick.items = themes;
  quickPick.canSelectMany = false;
  quickPick.matchOnDescription = true;

  // 设置初始选中项
  if (currentIndex !== -1) {
    quickPick.activeItems = [themes[currentIndex]];
  }

  let isPreviewMode = true;
  const originalTheme = currentThemeValue;
  let debounceTimer: NodeJS.Timeout | undefined;
  const DEBOUNCE_DELAY = 300;

  // 监听活动项变化（键盘导航时触发）
  quickPick.onDidChangeActive(async (items) => {
    if (items.length > 0 && isPreviewMode) {
      const selectedTheme = items[0].theme;
      console.log(`预览主题: ${selectedTheme}`);

      // 清除之前的防抖计时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 设置防抖计时器
      debounceTimer = setTimeout(async () => {
        try {
          // 确保预览窗口已打开
          const activeEditor = vscode.window.activeTextEditor;
          // 如果有预览窗口，实时预览主题，但不保存到配置
          if (MarkdownPreviewPanel.currentPanel) {
            // 实时预览主题，但不保存到配置
            await provider.updateTheme(selectedTheme);
          }
          else if (activeEditor && activeEditor.document.fileName.endsWith('.md')) {
            // 如果没有预览窗口，先打开它
            const extensionUri = (provider as any)._extensionUri;
            MarkdownPreviewPanel.createOrShow(extensionUri, activeEditor.document);
            // 等待预览窗口创建完成
            await new Promise(resolve => setTimeout(resolve, 100));

            // 实时预览主题，但不保存到配置
            const currentPanel = MarkdownPreviewPanel.currentPanel;
            if (currentPanel) {
              await (currentPanel as MarkdownPreviewPanel).updateTheme(selectedTheme);
            }
          }
          else {
            vscode.window.showWarningMessage('请先打开一个 Markdown 文件');
          }
        }
        catch (error) {
          console.error('Error updating theme preview:', error);
        }
        finally {
          debounceTimer = undefined;
        }
      }, DEBOUNCE_DELAY);
    }
  });

  // 监听接受事件（回车或点击）
  quickPick.onDidAccept(async () => {
    const selectedItem = quickPick.selectedItems[0] || quickPick.activeItems[0];
    if (selectedItem) {
      // 使用配置服务更新主题
      await configService.updateConfig('currentTheme', selectedItem.theme, vscode.ConfigurationTarget.Global);
      await provider.updateTheme(selectedItem.theme);
      vscode.window.showInformationMessage(`主题已更改为: ${selectedItem.theme}`);
    }
    isPreviewMode = false;
    quickPick.hide();
  });

  // 监听隐藏事件（ESC 或点击外部）
  quickPick.onDidHide(() => {
    // 清理防抖计时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }

    if (isPreviewMode) {
      // 如果是取消操作，恢复原始主题
      provider.updateTheme(originalTheme as string);
    }
    quickPick.dispose();
  });

  quickPick.show();
}
