// 序号补全：解析当前行的序号模式，生成下一行序号前缀
// 支持的序号模式（参考 VS Code / Typora / Word 行为）：
//   1. 阿拉伯数字 + 点：1. → 2.（支持无空格：1.内容 → 2. ）
//   2. 阿拉伯数字 + 括号：1) → 2)
//   3. 圆圈数字：① → ②（① ~ ㊿，U+2460 ~ U+2473 + U+3251 ~ U+325F + U+32B1 ~ U+32BF）
//   4. 中文数字 + 分隔符（通配）：一、 / 一， / 一, / 一. / 一 （空格）
//      分隔符集合：、（顿号），（全角逗号），（半角逗号）.（点）空格
//      支持分隔符后跟空格（一、 ）或直接跟内容（一、内容）
//   5. "第" + 中文数字 + 分隔符（通配）：第一、 / 第一， / 第一, / 第一. / 第一 （空格）
//   6. "其" + 中文数字 + 分隔符（通配）：其一、 / 其一， / 其一, / 其一. / 其一 （空格）
//   7. 字母 + 点：a. → b.，A. → B.
//   8. 字母 + 括号：a) → b)，A) → B)
//   9. 项目符号：- / * / + → 同符号
//
// 设计要点：
//   - 返回 null 表示无匹配，调用方据此决定是否显示预览
//   - 序号前缀必须位于行首（允许前导空白），后跟空格或直接行尾
//   - 圆圈数字超过 ㊿ 时降级为"1."形式（避免无对应字符）
//   - 中文数字支持 一~九十九，超过后降级为"1."形式
//   - 中文数字的分隔符支持通配（、，,.空格），nextListPrefix 保留原始分隔符

/**
 * 解析当前行文本，提取序号前缀（如 "1. " / "① " / "- "）。
 * 若当前行不匹配任何已知序号模式，返回 null。
 *
 * @param lineText 当前行文本（不含换行符）
 * @returns 序号前缀字符串（含尾部空格），或 null
 */
export function parseListPrefix(lineText: string): string | null {
  // 去掉前导空白用于匹配，但保留前导空白用于返回完整前缀
  const trimmed = lineText.trimStart()
  if (trimmed === '') return null

  // 1a. 阿拉伯数字 + 点 + 空格：1. / 12.
  let m = trimmed.match(/^(\d+)(\.\s+)/)
  if (m) return m[0]
  // 1b. 阿拉伯数字 + 点 + 非数字非点字符（无空格）：2.内容 → 视为列表项
  //     排除小数（如 2.5）和多个点（如 2..），使用 lookahead 不消耗后续字符
  //     强制返回 "N. "（含空格），保持与 nextListPrefix 的格式一致
  m = trimmed.match(/^(\d+)\.(?=[^\d.\s])/)
  if (m) return m[0] + ' '

  // 2. 阿拉伯数字 + 括号 + 空格：1) / 12)
  m = trimmed.match(/^(\d+)(\)\s+)/)
  if (m) return m[0]

  // 3. 圆圈数字 + 空格：① / ⑫ / ㊿
  //    U+2460(①) ~ U+2473(⑳)，U+3251(㉑) ~ U+325F(㉟)，U+32B1(㊱) ~ U+32BF(㊿)
  m = trimmed.match(/^([\u2460-\u2473\u3251-\u325F\u32B1-\u32BF])(\s+)/)
  if (m) return m[0]

  // 4. 中文数字 + 分隔符（通配：、 ， , . 空格）
  //    分隔符集合：、（顿号），（全角逗号），（半角逗号）.（点）
  //    空格也可单独作为分隔符
  // 4a. 分隔符 + 空格：一、 / 一， / 一, / 一. / 一、 （含多空格）
  m = trimmed.match(/^([一二三四五六七八九十]+)([、，,.])(\s+)/)
  if (m) return m[0]
  // 4b. 分隔符 + 非分隔符非空格字符（无空格）：一、内容 → 一、 
  //     强制返回 "N、 "（含空格），保持与 nextListPrefix 的格式一致
  m = trimmed.match(/^([一二三四五六七八九十]+)([、，,.])(?=[^、，,.\s])/)
  if (m) return m[0] + ' '
  // 4c. 仅空格分隔：一 内容 → 一 （中文数字后直接跟空格）
  m = trimmed.match(/^([一二三四五六七八九十]+)(\s+)/)
  if (m) return m[0]

  // 5. "第" + 中文数字 + 分隔符（通配：、 ， , . 空格）
  // 5a. 分隔符 + 空格：第一、 / 第一， / 第一, / 第一. / 第一、 
  m = trimmed.match(/^(第)([一二三四五六七八九十]+)([、，,.])(\s+)/)
  if (m) return m[0]
  // 5b. 分隔符 + 非分隔符非空格字符（无空格）：第一、内容 → 第一、 
  m = trimmed.match(/^(第)([一二三四五六七八九十]+)([、，,.])(?=[^、，,.\s])/)
  if (m) return m[0] + ' '
  // 5c. 仅空格分隔：第一 内容 → 第一 
  m = trimmed.match(/^(第)([一二三四五六七八九十]+)(\s+)/)
  if (m) return m[0]

  // 6. "其" + 中文数字 + 分隔符（通配：、 ， , . 空格）
  // 6a. 分隔符 + 空格：其一、 / 其一， / 其一, / 其一. / 其一、 
  m = trimmed.match(/^(其)([一二三四五六七八九十]+)([、，,.])(\s+)/)
  if (m) return m[0]
  // 6b. 分隔符 + 非分隔符非空格字符（无空格）：其一、内容 → 其一、 
  m = trimmed.match(/^(其)([一二三四五六七八九十]+)([、，,.])(?=[^、，,.\s])/)
  if (m) return m[0] + ' '
  // 6c. 仅空格分隔：其一 内容 → 其一 
  m = trimmed.match(/^(其)([一二三四五六七八九十]+)(\s+)/)
  if (m) return m[0]

  // 7. 字母 + 点 + 空格：a. / A. / z.
  m = trimmed.match(/^([a-zA-Z])(\.\s+)/)
  if (m) return m[0]

  // 8. 字母 + 括号 + 空格：a) / A) / z)
  m = trimmed.match(/^([a-zA-Z])(\)\s+)/)
  if (m) return m[0]

  // 9. 项目符号 + 空格：- / * / +
  m = trimmed.match(/^([-*+])(\s+)/)
  if (m) return m[0]

  return null
}

/**
 * 根据当前行的序号前缀，生成下一行应有的序号前缀。
 * 若无法生成（如未知模式），返回 null。
 *
 * @param currentPrefix 当前行序号前缀（由 parseListPrefix 返回）
 * @returns 下一行序号前缀，或 null
 */
export function nextListPrefix(currentPrefix: string): string | null {
  // 1. 阿拉伯数字 + 点：1. → 2.
  let m = currentPrefix.match(/^(\d+)\.(\s+)$/)
  if (m) {
    const next = parseInt(m[1], 10) + 1
    return `${next}.${m[2]}`
  }

  // 2. 阿拉伯数字 + 括号：1) → 2)
  m = currentPrefix.match(/^(\d+)\)(\s+)$/)
  if (m) {
    const next = parseInt(m[1], 10) + 1
    return `${next})${m[2]}`
  }

  // 3. 圆圈数字：① → ②
  //    圆圈数字 Unicode 映射：
  //    U+2460(①)=1 ~ U+2473(⑳)=20
  //    U+3251(㉑)=21 ~ U+325F(㉟)=35
  //    U+32B1(㊱)=36 ~ U+32BF(㊿)=50
  m = currentPrefix.match(/^([\u2460-\u2473\u3251-\u325F\u32B1-\u32BF])(\s+)$/)
  if (m) {
    const code = m[1].charCodeAt(0)
    let n: number
    if (code >= 0x2460 && code <= 0x2473) n = code - 0x2460 + 1
    else if (code >= 0x3251 && code <= 0x325F) n = code - 0x3251 + 21
    else n = code - 0x32B1 + 36
    const next = n + 1
    if (next <= 20) return `${String.fromCharCode(0x2460 + next - 1)}${m[2]}`
    if (next <= 35) return `${String.fromCharCode(0x3251 + next - 21)}${m[2]}`
    if (next <= 50) return `${String.fromCharCode(0x32B1 + next - 36)}${m[2]}`
    // 超过 ㊿，降级为阿拉伯数字
    return `${next}. ${m[2]}`
  }

  // 4. 中文数字 + 分隔符（通配：、 ， , . 空格）
  //    保留原始分隔符，生成下一行序号
  // 4a. 分隔符 + 空格：一、 → 二、 / 一， → 二， / 一. → 二.
  m = currentPrefix.match(/^([一二三四五六七八九十]+)([、，,.])(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[1])
    if (next) return `${next}${m[2]}${m[3]}`
    return null
  }
  // 4b. 仅空格分隔：一 → 二 （中文数字 + 空格）
  m = currentPrefix.match(/^([一二三四五六七八九十]+)(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[1])
    if (next) return `${next}${m[2]}`
    return null
  }

  // 5. "第" + 中文数字 + 分隔符（通配）
  // 5a. 分隔符 + 空格：第一、 → 第二、 / 第一， → 第二，
  m = currentPrefix.match(/^(第)([一二三四五六七八九十]+)([、，,.])(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[2])
    if (next) return `${m[1]}${next}${m[3]}${m[4]}`
    return null
  }
  // 5b. 仅空格分隔：第一 → 第二
  m = currentPrefix.match(/^(第)([一二三四五六七八九十]+)(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[2])
    if (next) return `${m[1]}${next}${m[3]}`
    return null
  }

  // 6. "其" + 中文数字 + 分隔符（通配）
  // 6a. 分隔符 + 空格：其一、 → 其二、 / 其一， → 其二，
  m = currentPrefix.match(/^(其)([一二三四五六七八九十]+)([、，,.])(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[2])
    if (next) return `${m[1]}${next}${m[3]}${m[4]}`
    return null
  }
  // 6b. 仅空格分隔：其一 → 其二
  m = currentPrefix.match(/^(其)([一二三四五六七八九十]+)(\s+)$/)
  if (m) {
    const next = nextChineseNumber(m[2])
    if (next) return `${m[1]}${next}${m[3]}`
    return null
  }

  // 7. 字母 + 点：a. → b.，A. → B.
  m = currentPrefix.match(/^([a-zA-Z])\.(\s+)$/)
  if (m) {
    const ch = m[1]
    const next = nextLetter(ch)
    if (next) return `${next}.${m[2]}`
    return null
  }

  // 8. 字母 + 括号：a) → b)，A) → B)
  m = currentPrefix.match(/^([a-zA-Z])\)(\s+)$/)
  if (m) {
    const ch = m[1]
    const next = nextLetter(ch)
    if (next) return `${next})${m[2]}`
    return null
  }

  // 9. 项目符号：- → -，* → *，+ → +
  m = currentPrefix.match(/^([-*+])(\s+)$/)
  if (m) {
    return m[0]
  }

  return null
}

/**
 * 中文数字递增：一 → 二，九 → 十，十 → 十一，十九 → 二十，二十 → 二十一，九十九 → 一百
 * 支持范围：一 ~ 九十九
 * 超出范围返回 null
 */
function nextChineseNumber(current: string): string | null {
  const num = chineseToNumber(current)
  if (num === null || num < 1 || num >= 99) return null
  return numberToChinese(num + 1)
}

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 中文数字转阿拉伯数字：一 → 1，十 → 10，十一 → 11，二十 → 20，九十九 → 99
 * 仅支持 1 ~ 99
 */
function chineseToNumber(s: string): number | null {
  if (!s) return null

  // "十" 单独使用 = 10
  if (s === '十') return 10

  // "十X" = 10 + X（十一=11, 十五=15）
  if (s.length === 2 && s[0] === '十') {
    const ones = CN_DIGITS.indexOf(s[1])
    return ones >= 1 ? 10 + ones : null
  }

  // "X十" = X * 10（二十=20, 九十=90）
  if (s.length === 2 && s[1] === '十') {
    const tens = CN_DIGITS.indexOf(s[0])
    return tens >= 1 ? tens * 10 : null
  }

  // "X十Y" = X * 10 + Y（二十一=21, 九十九=99）
  if (s.length === 3 && s[1] === '十') {
    const tens = CN_DIGITS.indexOf(s[0])
    const ones = CN_DIGITS.indexOf(s[2])
    if (tens >= 1 && ones >= 0) return tens * 10 + ones
  }

  // 单数字 1~9
  if (s.length === 1) {
    const n = CN_DIGITS.indexOf(s)
    return n >= 1 ? n : null
  }

  return null
}

/**
 * 阿拉伯数字转中文数字：1 → 一，10 → 十，11 → 十一，20 → 二十，21 → 二十一，99 → 九十九
 * 仅支持 1 ~ 99
 */
function numberToChinese(n: number): string | null {
  if (n < 1 || n > 99) return null
  if (n === 10) return '十'
  if (n < 10) return CN_DIGITS[n]
  if (n < 20) return '十' + CN_DIGITS[n % 10]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (ones === 0) return CN_DIGITS[tens] + '十'
  return CN_DIGITS[tens] + '十' + CN_DIGITS[ones]
}

/**
 * 字母递增：a → b，z → null，A → B，Z → null
 */
function nextLetter(ch: string): string | null {
  const code = ch.charCodeAt(0)
  // 小写 a-z
  if (code >= 97 && code <= 122) {
    if (code === 122) return null // z 终止
    return String.fromCharCode(code + 1)
  }
  // 大写 A-Z
  if (code >= 65 && code <= 90) {
    if (code === 90) return null // Z 终止
    return String.fromCharCode(code + 1)
  }
  return null
}
