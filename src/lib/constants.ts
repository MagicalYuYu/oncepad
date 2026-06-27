import type { NoteColor } from '../types'

// 默认快捷键（与 main.ts 保持同步）
// v1.1.0：唤出窗口改为 Alt+Q（单手可触），新建/复制默认为空（用户按需配置）
export const DEFAULT_TOGGLE_SHORTCUT = 'Alt+Q'
export const DEFAULT_NEW_SHORTCUT = ''
export const DEFAULT_COPY_SHORTCUT = ''

// 笔记颜色配置：值与对应十六进制色值
export const NOTE_COLORS: NoteColor[] = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple']
export const COLOR_HEX: Record<NoteColor, string> = {
  default: 'transparent',
  red: '#f38ba8',
  orange: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  blue: '#89b4fa',
  purple: '#cba6f7',
}
