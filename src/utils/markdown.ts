import { marked } from 'marked'
import type { Block, BlockType } from '@/types'
import { generateId } from './id'
import hljs from 'highlight.js'

marked.setOptions({
  breaks: true,
  gfm: true
})

marked.use({
  renderer: {
    code(code: string, lang: string | undefined): string {
      const language = lang || ''
      if (language && hljs.getLanguage(language)) {
        try {
          return `<pre><code class="hljs language-${language}">${hljs.highlight(code, { language }).value}</code></pre>`
        } catch (__) {}
      }
      return `<pre><code class="hljs">${code}</code></pre>`
    }
  }
})

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string
}

export function htmlToMarkdown(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html
  return convertNodeToMarkdown(temp)
}

function convertNodeToMarkdown(node: Node): string {
  let result = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || ''
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tagName = el.tagName.toLowerCase()
      const inner = convertNodeToMarkdown(el)
      switch (tagName) {
        case 'h1': result += `# ${inner}\n\n`; break
        case 'h2': result += `## ${inner}\n\n`; break
        case 'h3': result += `### ${inner}\n\n`; break
        case 'h4': result += `#### ${inner}\n\n`; break
        case 'h5': result += `##### ${inner}\n\n`; break
        case 'h6': result += `###### ${inner}\n\n`; break
        case 'p': result += `${inner}\n\n`; break
        case 'strong': case 'b': result += `**${inner}**`; break
        case 'em': case 'i': result += `*${inner}*`; break
        case 'code': result += `\`${inner}\``; break
        case 'pre': result += `\`\`\`\n${inner}\n\`\`\`\n\n`; break
        case 'blockquote': result += `> ${inner}\n\n`; break
        case 'ul':
          el.querySelectorAll(':scope > li').forEach(li => {
            result += `- ${convertNodeToMarkdown(li)}\n`
          })
          result += '\n'
          break
        case 'ol':
          let i = 1
          el.querySelectorAll(':scope > li').forEach(li => {
            result += `${i}. ${convertNodeToMarkdown(li)}\n`
            i++
          })
          result += '\n'
          break
        case 'a': result += `[${inner}](${(el as HTMLAnchorElement).href})`; break
        case 'br': result += '\n'; break
        case 'hr': result += '---\n\n'; break
        default: result += inner
      }
    }
  })
  return result
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).join('\n\n')
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'h1': return `# ${block.content}`
    case 'h2': return `## ${block.content}`
    case 'h3': return `### ${block.content}`
    case 'h4': return `#### ${block.content}`
    case 'h5': return `##### ${block.content}`
    case 'h6': return `###### ${block.content}`
    case 'paragraph': return block.content
    case 'bulleted-list': return `- ${block.content}`
    case 'numbered-list': return `1. ${block.content}`
    case 'quote': return `> ${block.content}`
    case 'code': return `\`\`\`${block.language || ''}\n${block.content}\n\`\`\``
    case 'image': return `![${block.imageName || ''}](${block.imageData || ''})`
    case 'todo': return `- [${block.checked ? 'x' : ' '}] ${block.content}`
    case 'divider': return `---`
    case 'table':
      if (!block.tableData || block.tableData.length === 0) return ''
      const headerRow = block.tableData[0]
      const mdTable = [
        `| ${headerRow.map(c => c.content).join(' | ')} |`,
        `| ${headerRow.map(() => '---').join(' | ')} |`,
        ...block.tableData.slice(1).map(row =>
          `| ${row.map(c => c.content).join(' | ')} |`
        )
      ]
      return mdTable.join('\n')
    case 'attachment': return `[${block.attachmentName || 'attachment'}](${block.attachmentData || ''})`
    default: return block.content
  }
}

export function markdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  const lines = markdown.split('\n')
  let i = 0
  let inCodeBlock = false
  let codeContent = ''
  let codeLang = ''
  let inList = false
  let listType: 'bulleted' | 'numbered' | null = null
  let inBlockquote = false
  let quoteContent = ''
  let inTable = false
  let tableRows: string[][] = []

  while (i < lines.length) {
    const line = lines[i]

    if (inCodeBlock) {
      if (line.trim().startsWith('```')) {
        blocks.push(createBlock('code', codeContent.trim(), { language: codeLang }))
        inCodeBlock = false
        codeContent = ''
        codeLang = ''
      } else {
        codeContent += line + '\n'
      }
      i++
      continue
    }

    if (line.trim().startsWith('```')) {
      inCodeBlock = true
      codeLang = line.trim().slice(3).trim()
      i++
      continue
    }

    if (inTable) {
      if (line.trim().startsWith('|') && line.includes('---')) {
        i++
        continue
      }
      if (line.trim().startsWith('|')) {
        tableRows.push(line.trim().slice(1, -1).split('|').map(c => c.trim()))
        i++
        continue
      } else {
        if (tableRows.length > 0) {
          const tableData = tableRows.map((row, ri) =>
            row.map(cell => ({ content: cell, header: ri === 0 }))
          )
          blocks.push(createBlock('table', '', {
            tableData,
            tableWidths: tableData[0].map(() => 150)
          }))
        }
        inTable = false
        tableRows = []
      }
    }

    if (line.trim().startsWith('|') && !inTable) {
      inTable = true
      tableRows.push(line.trim().slice(1, -1).split('|').map(c => c.trim()))
      i++
      continue
    }

    if (inBlockquote) {
      if (line.trim().startsWith('>')) {
        quoteContent += ' ' + line.trim().slice(1).trim()
        i++
        continue
      } else {
        blocks.push(createBlock('quote', quoteContent.trim()))
        inBlockquote = false
        quoteContent = ''
      }
    }

    if (line.trim().startsWith('>') && !inBlockquote) {
      inBlockquote = true
      quoteContent = line.trim().slice(1).trim()
      i++
      continue
    }

    if (inList) {
      const bulletMatch = line.match(/^[-*]\s+(.+)$/)
      const todoMatch = line.match(/^[-*]\s+\[([ x])\]\s+(.+)$/)
      const numMatch = line.match(/^\d+\.\s+(.+)$/)

      if (todoMatch) {
        blocks.push(createBlock('todo', todoMatch[2], { checked: todoMatch[1] === 'x' }))
        i++
        continue
      } else if (bulletMatch && listType === 'bulleted') {
        blocks.push(createBlock('bulleted-list', bulletMatch[1]))
        i++
        continue
      } else if (numMatch && listType === 'numbered') {
        blocks.push(createBlock('numbered-list', numMatch[1]))
        i++
        continue
      } else {
        inList = false
        listType = null
      }
    }

    const todoMatch = line.match(/^[-*]\s+\[([ x])\]\s+(.+)$/)
    if (todoMatch) {
      blocks.push(createBlock('todo', todoMatch[2], { checked: todoMatch[1] === 'x' }))
      inList = true
      listType = 'bulleted'
      i++
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      blocks.push(createBlock('bulleted-list', bulletMatch[1]))
      inList = true
      listType = 'bulleted'
      i++
      continue
    }

    const numMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numMatch) {
      blocks.push(createBlock('numbered-list', numMatch[1]))
      inList = true
      listType = 'numbered'
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      const type = `h${level}` as BlockType
      blocks.push(createBlock(type, headingMatch[2]))
      i++
      continue
    }

    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      blocks.push(createBlock('divider', ''))
      i++
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      blocks.push(createBlock('image', '', {
        imageName: imageMatch[1],
        imageData: imageMatch[2]
      }))
      i++
      continue
    }

    const linkMatch = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch && linkMatch[2].startsWith('data:')) {
      blocks.push(createBlock('attachment', '', {
        attachmentName: linkMatch[1],
        attachmentData: linkMatch[2]
      }))
      i++
      continue
    }

    blocks.push(createBlock('paragraph', line.trim()))
    i++
  }

  if (inCodeBlock) {
    blocks.push(createBlock('code', codeContent.trim(), { language: codeLang }))
  }
  if (inBlockquote) {
    blocks.push(createBlock('quote', quoteContent.trim()))
  }
  if (inTable && tableRows.length > 0) {
    const tableData = tableRows.map((row, ri) =>
      row.map(cell => ({ content: cell, header: ri === 0 }))
    )
    blocks.push(createBlock('table', '', {
      tableData,
      tableWidths: tableData[0].map(() => 150)
    }))
  }

  return blocks
}

function createBlock(
  type: BlockType,
  content: string,
  extras: Partial<Block> = {}
): Block {
  const now = Date.now()
  return {
    id: generateId(),
    type,
    content,
    createdAt: now,
    updatedAt: now,
    ...extras
  }
}

export function blocksToPlainText(blocks: Block[]): string {
  return blocks.map(b => b.content).join(' ')
}
