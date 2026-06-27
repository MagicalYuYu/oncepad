import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// 配置 markdown-it：启用 GFM（GitHub Flavored Markdown）和换行符转 <br>
// 同时通过自定义 render rule 在每个 HTML 元素上添加 data-source-line 属性
// 用于编辑/预览模式切换时的精确行号映射（业界标准方案，VSCode/Markdown Preview Enhanced 均使用此方案）
const md = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
})

// 自定义 render rule：为每个块级元素添加 data-source-line 属性
// markdown-it 的 Token.map 属性记录了 token 对应的源码行号范围 [startLine, endLine]
const originalRenderRules = { ...md.renderer.rules }

// 需要添加 data-source-line 的块级元素类型
const blockTypes = ['paragraph_open', 'heading_open', 'bullet_list_open', 'ordered_list_open',
  'list_item_open', 'blockquote_open', 'fence', 'code_block', 'hr', 'table_open', 'thead_open',
  'tbody_open', 'tr_open', 'td_open', 'th_open']

blockTypes.forEach(type => {
  const original = originalRenderRules[type]
  md.renderer.rules[type] = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.map) {
      // token.map = [startLine, endLine]，记录源码行号（0-based）
      token.attrSet('data-source-line', String(token.map[0] + 1))
    }
    if (original) {
      return original(tokens, idx, options, env, self)
    }
    return self.renderToken(tokens, idx, options)
  }
})

// 渲染 Markdown 为净化后的 HTML（使用 DOMPurify 防 XSS）
// 每个 HTML 元素都带有 data-source-line 属性，记录对应的源码行号
export function renderMarkdown(text: string): string {
  const html = md.render(text)
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-source-line'] })
}

// 检测文本是否包含 Markdown 语法特征
// 用于决定是否显示模式切换按钮：仅当内容确实包含 MD 语法时才显示阅读模式按钮
// 检测规则覆盖常见 MD 语法：标题、代码块、列表、引用、水平线、表格、粗体、行内代码、链接、图片
export function detectMarkdownSyntax(text: string): boolean {
  if (!text || !text.trim()) return false
  const lines = text.split('\n')
  for (const line of lines) {
    // 标题：# ~ ######
    if (/^#{1,6}\s/.test(line)) return true
    // 代码块：``` 或 ~~~
    if (/^(```|~~~)/.test(line)) return true
    // 无序列表：- * + 后跟空格
    if (/^[-*+]\s/.test(line)) return true
    // 有序列表：数字. 后跟空格
    if (/^\d+\.\s/.test(line)) return true
    // 引用：> 后跟空格
    if (/^>\s/.test(line)) return true
    // 水平线：--- *** ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) return true
    // 表格行：| ... |
    if (/^\|.*\|$/.test(line.trim())) return true
  }
  // 行内格式检测（跨行）
  // 粗体：**text** 或 __text__
  if (/\*\*[^*]+\*\*/.test(text) || /__[^_]+__/.test(text)) return true
  // 行内代码：`code`
  if (/`[^`]+`/.test(text)) return true
  // 链接：[text](url)
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) return true
  // 图片：![alt](url)
  if (/!\[[^\]]*\]\([^)]+\)/.test(text)) return true
  return false
}
