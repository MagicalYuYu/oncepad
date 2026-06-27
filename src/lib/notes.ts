import type { NoteIndexEntry } from '../types'

// 笔记排序方式：updated=按更新时间，title=按标题，color=按颜色
export type SortBy = 'updated' | 'title' | 'color'

// 草稿过期时间：3 天
export const DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000
// 即将过期阈值：24 小时
export const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000

// 笔记列表排序：置顶优先，再按更新时间（倒序）/ 标题 / 颜色
export function sortNotes(list: NoteIndexEntry[], sortBy: SortBy): NoteIndexEntry[] {
  const sorted = [...list]
  if (sortBy === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  } else if (sortBy === 'color') {
    const order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'default']
    sorted.sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color))
  } else {
    sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
  // 置顶笔记始终排在最前（无论选择何种排序方式）
  sorted.sort((a, b) => (b.pinned === true ? 1 : 0) - (a.pinned === true ? 1 : 0))
  return sorted
}

// 判断草稿是否即将过期（24 小时内）
export function isExpiringSoon(entry: NoteIndexEntry): boolean {
  if (entry.type !== 'draft' || !entry.expiresAt) return false
  const expires = new Date(entry.expiresAt).getTime()
  const now = Date.now()
  return expires - now < EXPIRING_SOON_MS && expires > now
}
