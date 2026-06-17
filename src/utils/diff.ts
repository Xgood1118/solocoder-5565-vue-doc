import * as Diff from 'diff'
import type { Block } from '@/types'

export interface DiffResult {
  value: string
  added?: boolean
  removed?: boolean
}

export function diffStrings(oldStr: string, newStr: string): DiffResult[] {
  return Diff.diffChars(oldStr, newStr)
}

export function diffBlocks(oldBlocks: Block[], newBlocks: Block[]): string {
  const oldText = blocksToDiffText(oldBlocks)
  const newText = blocksToDiffText(newBlocks)
  const changes = Diff.diffLines(oldText, newText)
  
  let result = ''
  changes.forEach(part => {
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  '
    result += part.value.split('\n').filter(l => l).map(line => prefix + line).join('\n') + '\n'
  })
  
  return result
}

export function renderDiffHtml(oldStr: string, newStr: string): string {
  const changes = Diff.diffChars(oldStr, newStr)
  let html = ''
  changes.forEach(part => {
    if (part.added) {
      html += `<span class="diff-added">${escapeHtml(part.value)}</span>`
    } else if (part.removed) {
      html += `<span class="diff-removed">${escapeHtml(part.value)}</span>`
    } else {
      html += `<span>${escapeHtml(part.value)}</span>`
    }
  })
  return html
}

export function renderLineDiffHtml(oldStr: string, newStr: string): string {
  const changes = Diff.diffLines(oldStr, newStr)
  let html = ''
  changes.forEach(part => {
    const lines = part.value.split('\n').filter(l => l)
    lines.forEach(line => {
      if (part.added) {
        html += `<div class="diff-line diff-line-added">+ ${escapeHtml(line)}</div>`
      } else if (part.removed) {
        html += `<div class="diff-line diff-line-removed">- ${escapeHtml(line)}</div>`
      } else {
        html += `<div class="diff-line">  ${escapeHtml(line)}</div>`
      }
    })
  })
  return html
}

function blocksToDiffText(blocks: Block[]): string {
  return blocks.map(b => `[${b.type}] ${b.content}`).join('\n')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
