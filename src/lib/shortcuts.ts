// 快捷键工具函数

/**
 * 匹配键盘事件是否匹配指定的快捷键字符串
 * @param e React 键盘事件
 * @param shortcut 快捷键字符串，如 'Control+J'、'Control+Shift+C'
 */
export function matchShortcut(e: React.KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false
  const parts = shortcut.split('+')
  if (parts.length < 2) return false
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)

  const expectMeta = modifiers.includes('Command') || modifiers.includes('Meta')
  const expectCtrl = modifiers.includes('Control')
  const expectAlt = modifiers.includes('Alt')
  const expectShift = modifiers.includes('Shift')

  if (!!e.metaKey !== expectMeta) return false
  if (!!e.ctrlKey !== expectCtrl) return false
  if (!!e.altKey !== expectAlt) return false
  if (!!e.shiftKey !== expectShift) return false

  const eventKey = e.key.length === 1 ? e.key.toUpperCase() : e.key
  return eventKey === key
}

/**
 * 格式化快捷键字符串用于显示
 * Mac 上将 Command 显示为 Cmd，Control 显示为 Ctrl
 * 其他平台将 Control 显示为 Ctrl
 */
export function formatShortcut(s: string): string {
  if (!s) return ''
  if (typeof navigator !== 'undefined' && navigator.platform.includes('Mac')) {
    return s.replace(/Command/g, 'Cmd').replace(/Control/g, 'Ctrl')
  }
  return s.replace(/Control/g, 'Ctrl')
}

/**
 * 规范化快捷键字符串：将两个快捷键字符串规范化为可比较的形式
 * 用于冲突检测——修饰键顺序不同但组合相同的快捷键视为冲突
 * 例如 'Control+Shift+C' 和 'Shift+Control+C' 规范化后相同
 */
export function normalizeShortcut(shortcut: string): string {
  if (!shortcut) return ''
  const parts = shortcut.split('+')
  if (parts.length < 2) return shortcut
  const key = parts[parts.length - 1].toUpperCase()
  // 修饰键按固定顺序排列：Control > Alt > Shift > Command/Meta
  const modifiers = parts.slice(0, -1)
  const order = { Control: 0, Alt: 1, Shift: 2, Command: 3, Meta: 3, Super: 3 }
  const sortedModifiers = modifiers.sort((a, b) => (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99))
  return [...sortedModifiers, key].join('+')
}

/**
 * 检测快捷键冲突
 * @param newShortcut 新设置的快捷键
 * @param existingShortcuts 已存在的快捷键列表（不含 newShortcut 对应的项）
 * @returns 冲突的快捷键字符串，无冲突返回 null
 */
export function detectShortcutConflict(
  newShortcut: string,
  existingShortcuts: string[]
): string | null {
  if (!newShortcut) return null
  const normalizedNew = normalizeShortcut(newShortcut)
  for (const existing of existingShortcuts) {
    if (!existing) continue
    if (normalizeShortcut(existing) === normalizedNew) {
      return existing
    }
  }
  return null
}

