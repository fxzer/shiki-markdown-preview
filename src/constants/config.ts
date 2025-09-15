// Extension configuration constants
export const EXTENSION_CONFIG = {
  SECTION: 'shiki-markdown-preview',
  DEFAULT_THEME: 'vitesse-dark',
  DEFAULT_STATE_SAVE_INTERVAL: 5000, // 5 seconds
  DEFAULT_SCROLL_SYNC_ENABLED: true,
} as const

// VS Code configuration targets
export const CONFIG_TARGETS = {
  GLOBAL: 1, // vscode.ConfigurationTarget.Global
  WORKSPACE: 2, // vscode.ConfigurationTarget.Workspace
  WORKSPACE_FOLDER: 3, // vscode.ConfigurationTarget.WorkspaceFolder
} as const
