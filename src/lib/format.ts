import type { i18n } from 'i18next'

/**
 * 字符串截断工具：取首行，超长则截断并加省略号
 * @param s 原始字符串（可能含多行）
 * @param len 最大长度
 * @returns 截断后的首行字符串
 */
export function truncate(s: string, len: number): string {
  const line = s.split('\n')[0]
  return line.length > len ? line.slice(0, len) + '...' : line
}

/**
 * 日期格式化：根据语言返回本地化日期字符串
 * @param iso ISO 8601 日期字符串
 * @param language 当前语言代码（'zh-CN' 或 'en'）
 * @returns 格式化后的日期字符串
 *   - zh-CN: "6月25日 14:30"
 *   - en: "6/25 14:30"
 */
export function formatDate(iso: string, language: string = 'zh-CN'): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  if (language === 'zh-CN') {
    return `${month}月${day}日 ${hours}:${minutes}`
  }
  return `${month}/${day} ${hours}:${minutes}`
}
