import type { Block } from '@/types'
import { blocksToMarkdown, markdownToHtml } from './markdown'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

export async function exportMarkdown(blocks: Block[], title: string): Promise<void> {
  const md = blocksToMarkdown(blocks)
  const blob = new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `${title}.md`)
}

export async function exportHtml(blocks: Block[], title: string, embedImages: boolean = true): Promise<void> {
  const md = blocksToMarkdown(blocks)
  let html = markdownToHtml(md)

  if (!embedImages) {
    const zip = new JSZip()
    const imgFolder = zip.folder(`${title}-images`)
    let imgIndex = 0

    html = html.replace(/<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g, (match, ext, base64) => {
      const imgName = `image-${++imgIndex}.${ext}`
      if (imgFolder) {
        imgFolder.file(imgName, base64, { base64: true })
      }
      return `<img src="${title}-images/${imgName}" />`
    })

    const fullHtml = generateFullHtml(title, html)
    zip.file(`${title}.html`, fullHtml)

    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${title}.zip`)
  } else {
    const fullHtml = generateFullHtml(title, html)
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    saveAs(blob, `${title}.html`)
  }
}

export async function exportDocx(blocks: Block[], title: string): Promise<void> {
  const html = markdownToHtml(blocksToMarkdown(blocks))
  const fullHtml = generateFullHtml(title, html)
  
  const content = [
    'MIME-Version: 1.0',
    'Content-Type: application/msword; charset=utf-8',
    '',
    fullHtml
  ].join('\n')

  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' })
  saveAs(blob, `${title}.doc`)
}

export async function exportPdf(blocks: Block[], title: string): Promise<void> {
  const md = blocksToMarkdown(blocks)
  const htmlContent = markdownToHtml(md)
  const fullHtml = generateFullHtml(title, htmlContent)

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('请允许弹窗以导出 PDF')
    return
  }

  printWindow.document.write(fullHtml)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.print()
  }, 500)
}

function generateFullHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p { margin: 16px 0; }
    blockquote {
      padding: 0 1em;
      border-left: 4px solid #dfe2e5;
      color: #6a737d;
      margin: 16px 0;
    }
    code {
      background: rgba(27, 31, 35, 0.05);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 3px;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; }
    table {
      border-collapse: collapse;
      margin: 16px 0;
    }
    table th, table td {
      border: 1px solid #dfe2e5;
      padding: 6px 13px;
    }
    table th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }
    ul, ol { padding-left: 2em; }
    hr {
      border: none;
      border-top: 1px solid #e1e4e8;
      margin: 24px 0;
    }
    @media print {
      body { padding: 0; }
      h1 { page-break-before: always; }
      h1:first-child { page-break-before: avoid; }
      pre, blockquote { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`
}

export async function importMarkdown(content: string): Promise<Block[]> {
  const { markdownToBlocks } = await import('./markdown')
  return markdownToBlocks(content)
}
