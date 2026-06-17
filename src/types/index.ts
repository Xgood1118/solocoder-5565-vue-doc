export type BlockType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'paragraph' | 'bulleted-list' | 'numbered-list' | 'quote' | 'code' | 'image' | 'table' | 'todo' | 'attachment' | 'divider'

export interface Block {
  id: string
  type: BlockType
  content: string
  language?: string
  checked?: boolean
  imageData?: string
  imageName?: string
  imageAlt?: string
  imageCaption?: string
  attachmentData?: string
  attachmentName?: string
  attachmentSize?: number
  tableData?: TableCell[][]
  tableWidths?: number[]
  items?: string[]
  url?: string
  alt?: string
  caption?: string
  filename?: string
  size?: number
  comments?: Comment[]
  createdAt: number
  updatedAt: number
}

export interface TableCell {
  content: string
  header?: boolean
}

export interface Comment {
  id: string
  blockId: string
  lineIndex?: number
  author: User
  content: string
  resolved: boolean
  replies: CommentReply[]
  createdAt: number
  mentions: string[]
}

export interface CommentReply {
  id: string
  author: User
  content: string
  createdAt: number
  mentions: string[]
}

export interface User {
  id: string
  name: string
  avatar: string
  color: string
  role: PermissionRole
}

export type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer'

export interface DocumentPermission {
  userId: string
  role: PermissionRole
}

export interface ShareLink {
  id: string
  documentId: string
  token: string
  role: PermissionRole
  expiresAt?: number
  password?: string
  createdAt: number
}

export interface DocumentVersion {
  id: string
  documentId: string
  blocks: Block[]
  createdAt: number
  createdBy: string
  message?: string
}

export interface Document {
  id: string
  title: string
  blocks: Block[]
  tags: string[]
  permissions: DocumentPermission[]
  ownerId: string
  createdAt: number
  updatedAt: number
  lastOpenedAt: number
  editCount: number
  editCountToday: number
  editCountWeek: number
  expiresAt?: number
  shareRole?: PermissionRole
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Notification {
  id: string
  userId: string
  type: 'mention' | 'comment' | 'share' | 'version' | 'edit' | 'resolve'
  documentId: string
  documentTitle: string
  message: string
  read: boolean
  createdAt: number
  link?: string
}

export interface Collaborator {
  tabId: string
  user: User
  documentId: string
  cursorPosition: CursorPosition | null
  selection: Selection | null
  lastSeen: number
}

export interface CursorPosition {
  blockId: string
  offset: number
}

export interface Selection {
  start: CursorPosition
  end: CursorPosition
}

export interface Theme {
  id: string
  name: string
  variables: Record<string, string>
}

export interface KeyboardShortcut {
  id: string
  name: string
  description: string
  defaultKey: string
  currentKey: string
  action: string
  keys?: string[]
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  blocks: Block[]
}

export interface SearchResult {
  documentId: string
  documentTitle: string
  blockId: string
  blockType: BlockType
  snippet: string
  matchIndex: number
  title?: string
  matches?: number
}

export type EditorMode = 'richtext' | 'markdown'

export interface SaveState {
  status: 'saved' | 'saving' | 'unsaved' | 'error'
  lastSavedAt: number | null
}
