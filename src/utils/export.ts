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
  const zip = new JSZip()

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)

  zip.file('word/styles.xml', getDocxStyles())

  const documentXml = generateDocumentXml(blocks, title)
  zip.file('word/document.xml', documentXml)

  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  saveAs(content, `${title}.docx`)
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function generateDocumentXml(blocks: Block[], title: string): string {
  let body = ''

  body += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="56"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>`

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'h2':
        body += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'h3':
        body += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'h4':
      case 'h5':
      case 'h6':
        body += `<w:p><w:pPr><w:pStyle w:val="Heading4"/></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'paragraph':
        body += `<w:p><w:r><w:t xml:space="preserve">${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'bulleted-list':
        body += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'numbered-list':
        body += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'quote':
        body += `<w:p><w:pPr><w:ind w:left="720"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'code':
        body += `<w:p><w:pPr><w:shd w:val="clear" w:fill="F6F8FA"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      case 'todo': {
        const check = block.checked ? '☑' : '☐'
        body += `<w:p><w:r><w:t>${check} ${escapeXml(block.content)}</w:t></w:r></w:p>`
        break
      }
      case 'divider':
        body += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>`
        break
      case 'table':
        if (block.tableData && block.tableData.length > 0) {
          body += `<w:tbl><w:tblPr><w:tblBorders>`
          body += `<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>`
          body += `</w:tblBorders></w:tblPr>`
          for (const row of block.tableData) {
            body += `<w:tr>`
            for (const cell of row) {
              const boldPr = cell.header ? '<w:rPr><w:b/></w:rPr>' : ''
              body += `<w:tc><w:tcPr>${cell.header ? '<w:shd w:val="clear" w:fill="F6F8FA"/>' : ''}</w:tcPr><w:p><w:r>${boldPr}<w:t>${escapeXml(cell.content)}</w:t></w:r></w:p></w:tc>`
            }
            body += `</w:tr>`
          }
          body += `</w:tbl>`
        }
        break
      case 'image':
        body += `<w:p><w:r><w:t>[Image: ${escapeXml(block.imageName || block.imageAlt || '')}]</w:t></w:r></w:p>`
        break
      case 'attachment':
        body += `<w:p><w:r><w:t>[Attachment: ${escapeXml(block.attachmentName || '')}]</w:t></w:r></w:p>`
        break
      default:
        if (block.content) {
          body += `<w:p><w:r><w:t>${escapeXml(block.content)}</w:t></w:r></w:p>`
        }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`
}

function getDocxStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="480" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="360" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="374151"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="4B5563"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:pPr><w:spacing w:before="200" w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
  <w:numDef>
    <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
  </w:numDef>
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#x2022;"/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>
</w:styles>`
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
