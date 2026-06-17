import { defineStore } from 'pinia'
import type { Document, Block, DocumentVersion, ShareLink, SaveState, EditorMode } from '@/types'
import { generateId } from '@/utils/id'
import { saveDocument, getDocument, getAllDocuments, deleteDocument, saveVersion, getVersions, saveShareLink, getShareLinks, deleteShareLink, getShareLinkByToken } from '@/utils/idb'
import { blocksToMarkdown, markdownToBlocks } from '@/utils/markdown'

const AUTO_SAVE_INTERVAL = 5000
const SIMULATE_DELAY = 200

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    documents: [] as Document[],
    currentDocument: null as Document | null,
    currentMode: 'richtext' as EditorMode,
    saveState: { status: 'saved', lastSavedAt: null } as SaveState,
    versions: [] as DocumentVersion[],
    shareLinks: [] as ShareLink[],
    autoSaveTimer: null as number | null,
    hasUnsavedChanges: false,
    pendingEdits: 0,
    editHistory: [] as { blocks: Block[], timestamp: number }[],
    redoStack: [] as { blocks: Block[] }[],
    isLoading: false
  }),
  getters: {
    pendingTodosCount: (state): number => {
      if (!state.currentDocument) return 0
      return state.currentDocument.blocks.filter(
        b => b.type === 'todo' && !b.checked
      ).length
    },
    todayEditCount: (state): number => {
      return state.documents.reduce((sum, d) => sum + (d.editCountToday || 0), 0)
    },
    weekEditCount: (state): number => {
      return state.documents.reduce((sum, d) => sum + (d.editCountWeek || 0), 0)
    },
    activeDocumentsCount: (state): number => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      return state.documents.filter(d => d.lastOpenedAt > oneDayAgo).length
    }
  },
  actions: {
    async loadAllDocuments() {
      this.isLoading = true
      try {
        this.documents = await getAllDocuments()
      } finally {
        this.isLoading = false
      }
    },
    async loadDocument(id: string) {
      this.stopAutoSave()
      const doc = await getDocument(id)
      if (doc) {
        this.currentDocument = { ...doc, lastOpenedAt: Date.now() }
        this.saveState = { status: 'saved', lastSavedAt: doc.updatedAt }
        this.hasUnsavedChanges = false
        this.editHistory = [{ blocks: JSON.parse(JSON.stringify(doc.blocks)), timestamp: Date.now() }]
        this.redoStack = []
        this.startAutoSave()
        await this.loadVersions(id)
        await this.saveDocumentStats(doc)
      }
      return doc
    },
    async createDocument(title: string = '未命名文档', blocks: Block[] = [], tags: string[] = [], ownerId: string = 'user-1'): Promise<Document> {
      const now = Date.now()
      const doc: Document = {
        id: generateId(),
        title,
        blocks: blocks.length > 0 ? blocks : [this.createBlock('paragraph', '')],
        tags,
        permissions: [{ userId: ownerId, role: 'owner' }],
        ownerId,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        editCount: 0,
        editCountToday: 0,
        editCountWeek: 0
      }
      await saveDocument(doc)
      this.documents.unshift(doc)
      return doc
    },
    async deleteDocument(id: string) {
      await deleteDocument(id)
      this.documents = this.documents.filter(d => d.id !== id)
      if (this.currentDocument?.id === id) {
        this.currentDocument = null
        this.stopAutoSave()
      }
    },
    async updateTitle(title: string) {
      if (!this.currentDocument) return
      this.currentDocument.title = title
      this.currentDocument.updatedAt = Date.now()
      this.markUnsaved()
    },
    updateBlock(blockId: string, updates: Partial<Block>) {
      if (!this.currentDocument) return
      const block = this.currentDocument.blocks.find(b => b.id === blockId)
      if (block) {
        Object.assign(block, updates, { updatedAt: Date.now() })
        this.currentDocument.updatedAt = Date.now()
        this.markUnsaved()
        this.pushHistory()
      }
    },
    addBlock(afterBlockId: string | null, type: Block['type'] = 'paragraph', content: string = ''): Block | null {
      if (!this.currentDocument) return null
      const newBlock = this.createBlock(type, content)
      if (afterBlockId === null) {
        this.currentDocument.blocks.unshift(newBlock)
      } else {
        const index = this.currentDocument.blocks.findIndex(b => b.id === afterBlockId)
        this.currentDocument.blocks.splice(index + 1, 0, newBlock)
      }
      this.currentDocument.updatedAt = Date.now()
      this.markUnsaved()
      this.pushHistory()
      return newBlock
    },
    removeBlock(blockId: string) {
      if (!this.currentDocument) return
      if (this.currentDocument.blocks.length <= 1) return
      const index = this.currentDocument.blocks.findIndex(b => b.id === blockId)
      if (index > -1) {
        this.currentDocument.blocks.splice(index, 1)
        this.currentDocument.updatedAt = Date.now()
        this.markUnsaved()
        this.pushHistory()
      }
    },
    reorderBlocks(fromIndex: number, toIndex: number) {
      if (!this.currentDocument) return
      const blocks = this.currentDocument.blocks
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      this.currentDocument.updatedAt = Date.now()
      this.markUnsaved()
      this.pushHistory()
    },
    duplicateBlock(blockId: string): Block | null {
      if (!this.currentDocument) return null
      const block = this.currentDocument.blocks.find(b => b.id === blockId)
      if (!block) return null
      const newBlock = {
        ...JSON.parse(JSON.stringify(block)),
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const index = this.currentDocument.blocks.findIndex(b => b.id === blockId)
      this.currentDocument.blocks.splice(index + 1, 0, newBlock)
      this.currentDocument.updatedAt = Date.now()
      this.markUnsaved()
      this.pushHistory()
      return newBlock
    },
    changeBlockType(blockId: string, newType: Block['type']) {
      if (!this.currentDocument) return
      const block = this.currentDocument.blocks.find(b => b.id === blockId)
      if (block) {
        block.type = newType
        block.updatedAt = Date.now()
        if (newType === 'todo') block.checked = false
        if (newType === 'code') block.language = 'javascript'
        if (newType === 'table') {
          block.tableData = [
            [{ content: '列1', header: true }, { content: '列2', header: true }, { content: '列3', header: true }],
            [{ content: '内容1', header: false }, { content: '内容2', header: false }, { content: '内容3', header: false }]
          ]
          block.tableWidths = [150, 150, 150]
        }
        this.currentDocument.updatedAt = Date.now()
        this.markUnsaved()
        this.pushHistory()
      }
    },
    toggleEditorMode() {
      this.currentMode = this.currentMode === 'richtext' ? 'markdown' : 'richtext'
      if (this.currentDocument) {
        if (this.currentMode === 'markdown') {
          this.currentDocument.blocks.forEach(b => {
            if (!b.content && b.type !== 'divider' && b.type !== 'image' && b.type !== 'attachment') {
              const md = blocksToMarkdown([b])
              b.content = md
            }
          })
        } else {
          this.currentDocument.blocks.forEach(b => {
            if (b.type === 'paragraph' && b.content.startsWith('#')) {
              const blocks = markdownToBlocks(b.content)
              if (blocks.length > 0) {
                Object.assign(b, blocks[0])
                b.id = b.id
              }
            }
          })
        }
      }
    },
    setEditorMode(mode: EditorMode) {
      this.currentMode = mode
    },
    markUnsaved() {
      this.hasUnsavedChanges = true
      this.saveState.status = 'unsaved'
    },
    pushHistory() {
      if (!this.currentDocument) return
      this.pendingEdits++
      if (this.editHistory.length > 50) {
        this.editHistory.shift()
      }
      this.editHistory.push({
        blocks: JSON.parse(JSON.stringify(this.currentDocument.blocks)),
        timestamp: Date.now()
      })
      this.redoStack = []
    },
    undo() {
      if (!this.currentDocument || this.editHistory.length <= 1) return
      const current = this.editHistory.pop()
      if (current) {
        this.redoStack.push({ blocks: current.blocks })
      }
      const previous = this.editHistory[this.editHistory.length - 1]
      this.currentDocument.blocks = JSON.parse(JSON.stringify(previous.blocks))
      this.currentDocument.updatedAt = Date.now()
      this.markUnsaved()
    },
    redo() {
      if (!this.currentDocument || this.redoStack.length === 0) return
      const next = this.redoStack.pop()
      if (next) {
        this.currentDocument.blocks = JSON.parse(JSON.stringify(next.blocks))
        this.editHistory.push({
          blocks: JSON.parse(JSON.stringify(next.blocks)),
          timestamp: Date.now()
        })
        this.currentDocument.updatedAt = Date.now()
        this.markUnsaved()
      }
    },
    async save() {
      if (!this.currentDocument || !this.hasUnsavedChanges) return
      this.saveState.status = 'saving'
      await new Promise(resolve => setTimeout(resolve, SIMULATE_DELAY))
      try {
        this.currentDocument.editCount = (this.currentDocument.editCount || 0) + this.pendingEdits
        this.currentDocument.editCountToday = (this.currentDocument.editCountToday || 0) + this.pendingEdits
        this.currentDocument.editCountWeek = (this.currentDocument.editCountWeek || 0) + this.pendingEdits
        this.pendingEdits = 0
        await saveDocument(this.currentDocument)
        await this.saveVersionSnapshot()
        this.saveState = { status: 'saved', lastSavedAt: Date.now() }
        this.hasUnsavedChanges = false
      } catch (e) {
        this.saveState.status = 'error'
      }
    },
    async forceSave() {
      if (!this.currentDocument) return
      this.hasUnsavedChanges = true
      await this.save()
    },
    startAutoSave() {
      this.stopAutoSave()
      this.autoSaveTimer = window.setInterval(() => {
        if (this.hasUnsavedChanges) {
          this.save()
        }
      }, AUTO_SAVE_INTERVAL)
    },
    stopAutoSave() {
      if (this.autoSaveTimer !== null) {
        clearInterval(this.autoSaveTimer)
        this.autoSaveTimer = null
      }
    },
    async saveVersionSnapshot(message?: string) {
      if (!this.currentDocument) return
      const version: DocumentVersion = {
        id: generateId(),
        documentId: this.currentDocument.id,
        blocks: JSON.parse(JSON.stringify(this.currentDocument.blocks)),
        createdAt: Date.now(),
        createdBy: 'current-user',
        message
      }
      await saveVersion(version)
    },
    async loadVersions(documentId: string) {
      this.versions = await getVersions(documentId)
    },
    async restoreVersion(versionId: string) {
      const version = this.versions.find(v => v.id === versionId)
      if (!version || !this.currentDocument) return
      this.currentDocument.blocks = JSON.parse(JSON.stringify(version.blocks))
      this.currentDocument.updatedAt = Date.now()
      this.pushHistory()
      this.markUnsaved()
      await this.forceSave()
    },
    async createShareLink(documentId: string, role: 'viewer' | 'commenter' | 'editor' = 'viewer', expiresAt?: number, password?: string): Promise<ShareLink> {
      const link: ShareLink = {
        id: generateId(),
        documentId,
        token: generateId() + generateId(),
        role,
        expiresAt,
        password,
        createdAt: Date.now()
      }
      await saveShareLink(link)
      this.shareLinks = await getShareLinks(documentId)
      return link
    },
    async loadShareLinks(documentId: string) {
      this.shareLinks = await getShareLinks(documentId)
    },
    async removeShareLink(id: string) {
      await deleteShareLink(id)
      this.shareLinks = this.shareLinks.filter(l => l.id !== id)
    },
    async validateShareLink(token: string, password?: string): Promise<{ valid: boolean; documentId?: string; role?: string; error?: string }> {
      const link = await getShareLinkByToken(token)
      if (!link) return { valid: false, error: '链接不存在' }
      if (link.expiresAt && Date.now() > link.expiresAt) return { valid: false, error: '链接已过期' }
      if (link.password && password !== link.password) return { valid: false, error: '密码错误' }
      return { valid: true, documentId: link.documentId, role: link.role }
    },
    async saveDocumentStats(doc: Document) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)
      const docDate = new Date(doc.createdAt)
      if (docDate < today) doc.editCountToday = 0
      if (docDate < weekAgo) doc.editCountWeek = 0
      await saveDocument(doc)
    },
    setDocumentTags(documentId: string, tags: string[]) {
      const doc = this.documents.find(d => d.id === documentId)
      if (doc) {
        doc.tags = tags
        doc.updatedAt = Date.now()
        saveDocument(doc)
      }
      if (this.currentDocument?.id === documentId && this.currentDocument) {
        this.currentDocument.tags = tags
      }
    },
    createBlock(type: Block['type'], content: string = '', extras: Partial<Block> = {}): Block {
      const now = Date.now()
      return {
        id: generateId(),
        type,
        content,
        createdAt: now,
        updatedAt: now,
        ...extras
      }
    },
    closeDocument() {
      if (this.hasUnsavedChanges && this.currentDocument) {
        this.save()
      }
      this.stopAutoSave()
      this.currentDocument = null
      this.versions = []
      this.shareLinks = []
    }
  }
})
