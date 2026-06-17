import { http, HttpResponse, delay } from 'msw'
import type { Document, DocumentVersion, User, Notification, ShareLink, Block } from '@/types'
import { generateId } from '@/utils/id'
import * as idb from '@/utils/idb'

const SIMULATED_DELAY = 200

export const handlers = [
  http.get('/api/documents', async () => {
    await delay(SIMULATED_DELAY)
    const docs = await idb.getAllDocuments()
    return HttpResponse.json({ data: docs, success: true })
  }),

  http.get('/api/documents/:id', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    const doc = await idb.getDocument(params.id as string)
    if (!doc) {
      return HttpResponse.json({ error: 'Document not found', success: false }, { status: 404 })
    }
    return HttpResponse.json({ data: doc, success: true })
  }),

  http.post('/api/documents', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as Partial<Document>
    const now = Date.now()
    const doc: Document = {
      id: generateId(),
      title: body.title || '未命名文档',
      blocks: body.blocks || [{
        id: generateId(),
        type: 'paragraph',
        content: '',
        createdAt: now,
        updatedAt: now
      }],
      tags: body.tags || [],
      permissions: body.permissions || [{ userId: 'user-1', role: 'owner' }],
      ownerId: body.ownerId || 'user-1',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      editCount: 0,
      editCountToday: 0,
      editCountWeek: 0
    }
    await idb.saveDocument(doc)
    return HttpResponse.json({ data: doc, success: true })
  }),

  http.put('/api/documents/:id', async ({ params, request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as Partial<Document>
    const existing = await idb.getDocument(params.id as string)
    if (!existing) {
      return HttpResponse.json({ error: 'Document not found', success: false }, { status: 404 })
    }
    const updated: Document = {
      ...existing,
      ...body,
      updatedAt: Date.now()
    }
    await idb.saveDocument(updated)
    return HttpResponse.json({ data: updated, success: true })
  }),

  http.delete('/api/documents/:id', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    await idb.deleteDocument(params.id as string)
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/documents/:id/versions', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    const versions = await idb.getVersions(params.id as string)
    return HttpResponse.json({ data: versions, success: true })
  }),

  http.post('/api/documents/:id/versions', async ({ params, request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as { blocks: Block[]; message?: string }
    const version: DocumentVersion = {
      id: generateId(),
      documentId: params.id as string,
      blocks: JSON.parse(JSON.stringify(body.blocks)),
      createdAt: Date.now(),
      createdBy: 'user-1',
      message: body.message
    }
    await idb.saveVersion(version)
    return HttpResponse.json({ data: version, success: true })
  }),

  http.post('/api/documents/:id/restore/:versionId', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    const version = await idb.getVersion(params.versionId as string)
    const doc = await idb.getDocument(params.id as string)
    if (!version || !doc) {
      return HttpResponse.json({ error: 'Not found', success: false }, { status: 404 })
    }
    const updated: Document = {
      ...doc,
      blocks: JSON.parse(JSON.stringify(version.blocks)),
      updatedAt: Date.now()
    }
    await idb.saveDocument(updated)
    return HttpResponse.json({ data: updated, success: true })
  }),

  http.get('/api/users', async () => {
    await delay(SIMULATED_DELAY)
    const users: User[] = [
      { id: 'user-1', name: '张三', avatar: '', color: '#3b82f6', role: 'owner' },
      { id: 'user-2', name: '李四', avatar: '', color: '#ef4444', role: 'editor' },
      { id: 'user-3', name: '王五', avatar: '', color: '#10b981', role: 'commenter' },
      { id: 'user-4', name: '赵六', avatar: '', color: '#f59e0b', role: 'viewer' }
    ]
    return HttpResponse.json({ data: users, success: true })
  }),

  http.get('/api/users/search', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || ''
    const allUsers: User[] = [
      { id: 'user-1', name: '张三', avatar: '', color: '#3b82f6', role: 'owner' },
      { id: 'user-2', name: '李四', avatar: '', color: '#ef4444', role: 'editor' },
      { id: 'user-3', name: '王五', avatar: '', color: '#10b981', role: 'commenter' },
      { id: 'user-4', name: '赵六', avatar: '', color: '#f59e0b', role: 'viewer' },
      { id: 'user-5', name: '产品经理', avatar: '', color: '#8b5cf6', role: 'editor' },
      { id: 'user-6', name: '设计师', avatar: '', color: '#ec4899', role: 'editor' },
      { id: 'user-7', name: '运营同学', avatar: '', color: '#06b6d4', role: 'commenter' },
      { id: 'user-8', name: '技术负责人', avatar: '', color: '#84cc16', role: 'editor' }
    ]
    const filtered = q
      ? allUsers.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.id.includes(q))
      : allUsers
    return HttpResponse.json({ data: filtered, success: true })
  }),

  http.get('/api/notifications', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || 'user-1'
    const notifs = await idb.getNotifications(userId)
    return HttpResponse.json({ data: notifs, success: true })
  }),

  http.put('/api/notifications/:id/read', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    await idb.markNotificationRead(params.id as string)
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/documents/:id/share', async ({ params, request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as {
      role: 'viewer' | 'commenter' | 'editor'
      expiresAt?: number
      password?: string
    }
    const link: ShareLink = {
      id: generateId(),
      documentId: params.id as string,
      token: generateId() + generateId(),
      role: body.role,
      expiresAt: body.expiresAt,
      password: body.password,
      createdAt: Date.now()
    }
    await idb.saveShareLink(link)
    return HttpResponse.json({ data: link, success: true })
  }),

  http.get('/api/documents/:id/share', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    const links = await idb.getShareLinks(params.id as string)
    return HttpResponse.json({ data: links, success: true })
  }),

  http.delete('/api/share/:id', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    await idb.deleteShareLink(params.id as string)
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/share/validate', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as { token: string; password?: string }
    const result = await idb.validateShareLink(body.token, body.password)
    return HttpResponse.json(result)
  }),

  http.get('/api/tags', async () => {
    await delay(SIMULATED_DELAY)
    const tags = await idb.getAllTags()
    return HttpResponse.json({ data: tags, success: true })
  }),

  http.post('/api/tags', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as { name: string; color: string }
    const tag = { id: generateId(), name: body.name, color: body.color || '#3b82f6' }
    await idb.saveTag(tag)
    return HttpResponse.json({ data: tag, success: true })
  }),

  http.delete('/api/tags/:id', async ({ params }) => {
    await delay(SIMULATED_DELAY)
    await idb.deleteTag(params.id as string)
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/search', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || ''
    const docs = await idb.getAllDocuments()
    const results: any[] = []
    const query = q.toLowerCase()
    for (const doc of docs) {
      for (const block of doc.blocks) {
        const content = block.content.toLowerCase()
        const index = content.indexOf(query)
        if (index > -1) {
          const snippetStart = Math.max(0, index - 20)
          const snippetEnd = Math.min(block.content.length, index + q.length + 20)
          results.push({
            documentId: doc.id,
            documentTitle: doc.title,
            blockId: block.id,
            blockType: block.type,
            snippet: block.content.slice(snippetStart, snippetEnd),
            matchIndex: index
          })
        }
      }
    }
    return HttpResponse.json({ data: results, success: true })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    await delay(SIMULATED_DELAY)
    const body = await request.json() as { userId: string }
    const users: User[] = [
      { id: 'user-1', name: '张三', avatar: '', color: '#3b82f6', role: 'owner' },
      { id: 'user-2', name: '李四', avatar: '', color: '#ef4444', role: 'editor' },
      { id: 'user-3', name: '王五', avatar: '', color: '#10b981', role: 'commenter' },
      { id: 'user-4', name: '赵六', avatar: '', color: '#f59e0b', role: 'viewer' }
    ]
    const user = users.find(u => u.id === body.userId) || users[0]
    return HttpResponse.json({ data: user, success: true })
  })
]
