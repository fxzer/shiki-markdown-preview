/**
 * 主题元数据接口
 */
export interface ThemeMetadata {
  name: string // 主题名称
  displayName: string // 显示名称
  type: 'light' | 'dark' // 主题类型：亮色或暗色
}

/**
 * 分组后的主题数据
 */
export interface GroupedThemes {
  light: ThemeMetadata[] // 亮色主题列表
  dark: ThemeMetadata[] // 暗色主题列表
  all: ThemeMetadata[] // 所有主题列表
}

/**
 * 主题缓存接口（简化版，移除过期时间）
 */
export interface ThemeCache {
  metadata: Map<string, ThemeMetadata> // 主题元数据映射
  grouped: GroupedThemes // 分组后的主题数据
  loaded: boolean // 是否已加载完成
}
