import type { Collaborator, CursorPosition, Selection, Block, User } from '@/types'
import { generateId } from './id'

const COLLAB_CHANNEL = 'solo-doc-collab'

let broadcastChannel: BroadcastChannel | null = null

function safePost(data: any) {
  if (!broadcastChannel) return
  broadcastChannel.postMessage(JSON.parse(JSON.stringify(data)))
}
let tabId: string = generateId()
let currentUser: User | null = null
let currentDocumentId: string | null = null
let collaborators: Map<string, Collaborator> = new Map()

export function initCollaboration(user: User, documentId: string) {
  currentUser = user
  currentDocumentId = documentId

  if (broadcastChannel) {
    broadcastChannel.close()
  }

  broadcastChannel = new BroadcastChannel(`${COLLAB_CHANNEL}-${documentId}`)

  broadcastChannel.onmessage = (event) => {
    const message = event.data
    handleCollabMessage(message)
  }

  sendPresence()

  window.addEventListener('beforeunload', () => {
    sendLeave()
    broadcastChannel?.close()
  })
}

export function leaveCollaboration() {
  sendLeave()
  if (broadcastChannel) {
    broadcastChannel.close()
    broadcastChannel = null
  }
  collaborators.clear()
}

function handleCollabMessage(message: any) {
  if (!currentUser || message.fromTabId === tabId) return

  switch (message.type) {
    case 'presence':
      handlePresence(message)
      break
    case 'leave':
      handleLeave(message.tabId)
      break
    case 'cursor':
      handleCursorUpdate(message)
      break
    case 'selection':
      handleSelectionUpdate(message)
      break
    case 'block-update':
      handleBlockUpdate(message)
      break
    case 'blocks-reorder':
      handleBlocksReorder(message)
      break
    case 'block-create':
      handleBlockCreate(message)
      break
    case 'block-delete':
      handleBlockDelete(message)
      break
    case 'request-presence':
      sendPresence()
      break
  }
}

function handlePresence(message: any) {
  if (!currentUser) return
  const collab: Collaborator = {
    tabId: message.fromTabId,
    user: message.user,
    documentId: message.documentId,
    cursorPosition: message.cursorPosition,
    selection: message.selection,
    lastSeen: Date.now()
  }
  collaborators.set(message.fromTabId, collab)
  notifyCollaboratorsChanged()
}

function handleLeave(leaveTabId: string) {
  collaborators.delete(leaveTabId)
  notifyCollaboratorsChanged()
}

function handleCursorUpdate(message: any) {
  const collab = collaborators.get(message.fromTabId)
  if (collab) {
    collab.cursorPosition = message.cursorPosition
    collab.lastSeen = Date.now()
    notifyCollaboratorsChanged()
  }
}

function handleSelectionUpdate(message: any) {
  const collab = collaborators.get(message.fromTabId)
  if (collab) {
    collab.selection = message.selection
    collab.lastSeen = Date.now()
    notifyCollaboratorsChanged()
  }
}

function handleBlockUpdate(message: any) {
  onBlockUpdate?.(message.blockId, message.block, message.fromTabId)
}

function handleBlocksReorder(message: any) {
  onBlocksReorder?.(message.fromIndex, message.toIndex, message.fromTabId)
}

function handleBlockCreate(message: any) {
  onBlockCreate?.(message.block, message.afterBlockId, message.fromTabId)
}

function handleBlockDelete(message: any) {
  onBlockDelete?.(message.blockId, message.fromTabId)
}

function notifyCollaboratorsChanged() {
  if (onCollaboratorsChanged) {
    onCollaboratorsChanged(Array.from(collaborators.values()))
  }
}

export function getCollaborators(): Collaborator[] {
  return Array.from(collaborators.values())
}

export function sendCursorPosition(position: CursorPosition | null) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'cursor',
    fromTabId: tabId,
    documentId: currentDocumentId,
    cursorPosition: position
  })
}

export function sendSelection(selection: Selection | null) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'selection',
    fromTabId: tabId,
    documentId: currentDocumentId,
    selection: selection
  })
}

export function sendBlockUpdate(blockId: string, block: Partial<Block>) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'block-update',
    fromTabId: tabId,
    documentId: currentDocumentId,
    blockId,
    block
  })
}

export function sendBlocksReorder(fromIndex: number, toIndex: number) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'blocks-reorder',
    fromTabId: tabId,
    documentId: currentDocumentId,
    fromIndex,
    toIndex
  })
}

export function sendBlockCreate(block: Block, afterBlockId: string | null) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'block-create',
    fromTabId: tabId,
    documentId: currentDocumentId,
    block,
    afterBlockId
  })
}

export function sendBlockDelete(blockId: string) {
  if (!broadcastChannel || !currentUser) return
  safePost({
    type: 'block-delete',
    fromTabId: tabId,
    documentId: currentDocumentId,
    blockId
  })
}

function sendPresence() {
  if (!broadcastChannel || !currentUser || !currentDocumentId) return
  safePost({
    type: 'presence',
    fromTabId: tabId,
    user: currentUser,
    documentId: currentDocumentId,
    cursorPosition: null,
    selection: null
  })
  safePost({
    type: 'request-presence',
    fromTabId: tabId
  })
}

function sendLeave() {
  if (!broadcastChannel || !currentDocumentId) return
  safePost({
    type: 'leave',
    fromTabId: tabId,
    documentId: currentDocumentId
  })
}

type BlockUpdateHandler = (blockId: string, block: Partial<Block>, fromTabId: string) => void
type BlocksReorderHandler = (fromIndex: number, toIndex: number, fromTabId: string) => void
type BlockCreateHandler = (block: Block, afterBlockId: string | null, fromTabId: string) => void
type BlockDeleteHandler = (blockId: string, fromTabId: string) => void
type CollaboratorsChangedHandler = (collaborators: Collaborator[]) => void

let onBlockUpdate: BlockUpdateHandler | null = null
let onBlocksReorder: BlocksReorderHandler | null = null
let onBlockCreate: BlockCreateHandler | null = null
let onBlockDelete: BlockDeleteHandler | null = null
let onCollaboratorsChanged: CollaboratorsChangedHandler | null = null

export function setOnBlockUpdate(handler: BlockUpdateHandler | null) {
  onBlockUpdate = handler
}

export function setOnBlocksReorder(handler: BlocksReorderHandler | null) {
  onBlocksReorder = handler
}

export function setOnBlockCreate(handler: BlockCreateHandler | null) {
  onBlockCreate = handler
}

export function setOnBlockDelete(handler: BlockDeleteHandler | null) {
  onBlockDelete = handler
}

export function setOnCollaboratorsChanged(handler: CollaboratorsChangedHandler | null) {
  onCollaboratorsChanged = handler
}

export function getCurrentTabId(): string {
  return tabId
}
