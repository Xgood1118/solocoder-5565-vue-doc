import { openDB, IDBPDatabase } from 'idb'
import type { Document, DocumentVersion, Tag, Notification, ShareLink } from '@/types'

const DB_NAME = 'solo-doc-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' })
        docStore.createIndex('updatedAt', 'updatedAt')
        docStore.createIndex('ownerId', 'ownerId')
      }

      if (!db.objectStoreNames.contains('versions')) {
        const verStore = db.createObjectStore('versions', { keyPath: 'id' })
        verStore.createIndex('documentId', 'documentId')
        verStore.createIndex('createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('notifications')) {
        const notifStore = db.createObjectStore('notifications', { keyPath: 'id' })
        notifStore.createIndex('userId', 'userId')
        notifStore.createIndex('createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains('shareLinks')) {
        const shareStore = db.createObjectStore('shareLinks', { keyPath: 'id' })
        shareStore.createIndex('documentId', 'documentId')
        shareStore.createIndex('token', 'token')
      }
    }
  })

  return dbInstance
}

export async function saveDocument(doc: Document): Promise<void> {
  const db = await getDB()
  await db.put('documents', doc)
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDB()
  return db.get('documents', id)
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB()
  return db.getAllFromIndex('documents', 'updatedAt')
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('documents', id)
  const tx = db.transaction('versions', 'readwrite')
  const versions = await tx.store.index('documentId').getAll(id)
  for (const v of versions) {
    await tx.store.delete(v.id)
  }
  await tx.done
}

export async function saveVersion(version: DocumentVersion): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('versions', 'readwrite')
  const allVersions = await tx.store.index('documentId').getAll(version.documentId)
  allVersions.sort((a, b) => b.createdAt - a.createdAt)
  if (allVersions.length >= 50) {
    const toDelete = allVersions.slice(49)
    for (const v of toDelete) {
      await tx.store.delete(v.id)
    }
  }
  await tx.store.put(version)
  await tx.done
}

export async function getVersions(documentId: string): Promise<DocumentVersion[]> {
  const db = await getDB()
  const versions = await db.getAllFromIndex('versions', 'documentId', documentId)
  return versions.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getVersion(id: string): Promise<DocumentVersion | undefined> {
  const db = await getDB()
  return db.get('versions', id)
}

export async function saveTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB()
  return db.getAll('tags')
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tags', id)
}

export async function saveNotification(notification: Notification): Promise<void> {
  const db = await getDB()
  await db.put('notifications', notification)
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const db = await getDB()
  const notifs = await db.getAllFromIndex('notifications', 'userId', userId)
  return notifs.sort((a, b) => b.createdAt - a.createdAt)
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = await getDB()
  const notif = await db.get('notifications', id)
  if (notif) {
    notif.read = true
    await db.put('notifications', notif)
  }
}

export async function saveShareLink(link: ShareLink): Promise<void> {
  const db = await getDB()
  await db.put('shareLinks', link)
}

export async function getShareLinkByToken(token: string): Promise<ShareLink | undefined> {
  const db = await getDB()
  const links = await db.getAllFromIndex('shareLinks', 'token', token)
  return links[0]
}

export async function getShareLinks(documentId: string): Promise<ShareLink[]> {
  const db = await getDB()
  return db.getAllFromIndex('shareLinks', 'documentId', documentId)
}

export async function deleteShareLink(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('shareLinks', id)
}

export async function validateShareLink(token: string, password?: string): Promise<{
  success: boolean
  error?: string
  data?: ShareLink
}> {
  const link = await getShareLinkByToken(token)
  if (!link) {
    return { success: false, error: '分享链接不存在' }
  }
  if (link.expiresAt && Date.now() > link.expiresAt) {
    return { success: false, error: '分享链接已过期' }
  }
  if (link.password && link.password !== password) {
    return { success: false, error: '密码错误' }
  }
  return { success: true, data: link }
}
