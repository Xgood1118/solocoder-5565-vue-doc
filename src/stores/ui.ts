import { defineStore } from 'pinia'
import type { Theme, KeyboardShortcut, Notification, Tag, SearchResult, Template } from '@/types'
import { generateId } from '@/utils/id'
import { getAllTags, saveTag, deleteTag, saveNotification, getNotifications, markNotificationRead } from '@/utils/idb'
import { getAllDocuments } from '@/utils/idb'
import { blocksToPlainText } from '@/utils/markdown'
import type { BlockType } from '@/types'

const THEMES: Theme[] = [
  {
    id: 'light',
    name: '明亮',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      '--text-primary': '#1e293b',
      '--text-secondary': '#64748b',
      '--text-muted': '#94a3b8',
      '--border': '#e2e8f0',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--danger': '#ef4444',
      '--code-bg': '#f1f5f9',
      '--quote-bg': '#f1f5f9',
      '--quote-border': '#cbd5e1'
    }
  },
  {
    id: 'dark',
    name: '暗黑',
    variables: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--border': '#334155',
      '--accent': '#60a5fa',
      '--accent-hover': '#3b82f6',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--code-bg': '#1e293b',
      '--quote-bg': '#1e293b',
      '--quote-border': '#475569'
    }
  },
  {
    id: 'eye-care',
    name: '护眼绿',
    variables: {
      '--bg-primary': '#f0f7ed',
      '--bg-secondary': '#e8f2e2',
      '--bg-tertiary': '#dce8d4',
      '--text-primary': '#1a2e1a',
      '--text-secondary': '#3d5a3d',
      '--text-muted': '#6b8e6b',
      '--border': '#b8d4a8',
      '--accent': '#4a7c4a',
      '--accent-hover': '#3d6b3d',
      '--success': '#5aa85a',
      '--warning': '#c4a35a',
      '--danger': '#c45a5a',
      '--code-bg': '#e8f2e2',
      '--quote-bg': '#e8f2e2',
      '--quote-border': '#a8c490'
    }
  },
  {
    id: 'classic',
    name: '经典白',
    variables: {
      '--bg-primary': '#fdfdfd',
      '--bg-secondary': '#f5f5f5',
      '--bg-tertiary': '#ececec',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#4a4a4a',
      '--text-muted': '#7a7a7a',
      '--border': '#d0d0d0',
      '--accent': '#1a1a1a',
      '--accent-hover': '#333333',
      '--success': '#4a8a4a',
      '--warning': '#c48a2a',
      '--danger': '#c44a4a',
      '--code-bg': '#f0f0f0',
      '--quote-bg': '#f5f5f5',
      '--quote-border': '#cccccc'
    }
  },
  {
    id: 'sepia',
    name: '护眼棕',
    variables: {
      '--bg-primary': '#fbf3e4',
      '--bg-secondary': '#f5ebd6',
      '--bg-tertiary': '#ede0c3',
      '--text-primary': '#433422',
      '--text-secondary': '#6b5a45',
      '--text-muted': '#998877',
      '--border': '#d4c4a8',
      '--accent': '#8b6914',
      '--accent-hover': '#735a10',
      '--success': '#5a8a4a',
      '--warning': '#c48a2a',
      '--danger': '#c45a5a',
      '--code-bg': '#f5ebd6',
      '--quote-bg': '#f5ebd6',
      '--quote-border': '#c4b090'
    }
  }
]

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'bold', name: '加粗', description: '将选中文字加粗', defaultKey: 'Ctrl+B', currentKey: 'Ctrl+B', action: 'bold' },
  { id: 'italic', name: '斜体', description: '将选中文字斜体', defaultKey: 'Ctrl+I', currentKey: 'Ctrl+I', action: 'italic' },
  { id: 'underline', name: '下划线', description: '给选中文字加下划线', defaultKey: 'Ctrl+U', currentKey: 'Ctrl+U', action: 'underline' },
  { id: 'h1', name: '一级标题', description: '将当前块转为一级标题', defaultKey: 'Ctrl+1', currentKey: 'Ctrl+1', action: 'h1' },
  { id: 'h2', name: '二级标题', description: '将当前块转为二级标题', defaultKey: 'Ctrl+2', currentKey: 'Ctrl+2', action: 'h2' },
  { id: 'h3', name: '三级标题', description: '将当前块转为三级标题', defaultKey: 'Ctrl+3', currentKey: 'Ctrl+3', action: 'h3' },
  { id: 'save', name: '保存', description: '手动保存文档', defaultKey: 'Ctrl+S', currentKey: 'Ctrl+S', action: 'save' },
  { id: 'undo', name: '撤销', description: '撤销上一步操作', defaultKey: 'Ctrl+Z', currentKey: 'Ctrl+Z', action: 'undo' },
  { id: 'redo', name: '重做', description: '重做上一步操作', defaultKey: 'Ctrl+Y', currentKey: 'Ctrl+Y', action: 'redo' },
  { id: 'search', name: '搜索', description: '打开全文搜索', defaultKey: 'Ctrl+F', currentKey: 'Ctrl+F', action: 'search' },
  { id: 'comment', name: '评论', description: '添加评论', defaultKey: 'Ctrl+Alt+M', currentKey: 'Ctrl+Alt+M', action: 'comment' },
  { id: 'new-doc', name: '新建文档', description: '创建新文档', defaultKey: 'Ctrl+N', currentKey: 'Ctrl+N', action: 'new-doc' },
  { id: 'toggle-mode', name: '切换编辑模式', description: '切换富文本/Markdown模式', defaultKey: 'Ctrl+Shift+M', currentKey: 'Ctrl+Shift+M', action: 'toggle-mode' },
  { id: 'escape', name: '退出', description: '关闭弹窗或取消选择', defaultKey: 'Escape', currentKey: 'Escape', action: 'escape' },
  { id: 'enter-block', name: '新建块', description: '在当前块后新建段落块', defaultKey: 'Enter', currentKey: 'Enter', action: 'enter-block' },
  { id: 'delete-block', name: '删除块', description: '删除当前空块', defaultKey: 'Backspace', currentKey: 'Backspace', action: 'delete-block' }
]

const TEMPLATES: Template[] = [
  {
    id: 'prd',
    name: 'PRD 需求文档',
    description: '产品需求文档模板，包含需求背景、目标、功能设计等',
    icon: '📋',
    blocks: []
  },
  {
    id: 'meeting-notes',
    name: '会议纪要',
    description: '会议记录模板，包含议题、参会人员、决议等',
    icon: '📝',
    blocks: []
  },
  {
    id: 'weekly-report',
    name: '周报模板',
    description: '个人周报模板，包含本周工作、下周计划等',
    icon: '📊',
    blocks: []
  },
  {
    id: 'tech-spec',
    name: '技术方案',
    description: '技术方案设计模板，包含架构设计、接口设计等',
    icon: '⚙️',
    blocks: []
  },
  {
    id: 'design-spec',
    name: '设计稿说明',
    description: '设计稿说明文档，包含设计理念、交互说明等',
    icon: '🎨',
    blocks: []
  },
  {
    id: 'okrs',
    name: 'OKR 规划',
    description: '目标与关键结果模板，用于季度/年度规划',
    icon: '🎯',
    blocks: []
  },
  {
    id: 'blank',
    name: '空白文档',
    description: '从空白开始创建文档',
    icon: '📄',
    blocks: []
  }
]

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentTheme: 'light' as string,
    themes: THEMES,
    shortcuts: [...DEFAULT_SHORTCUTS] as KeyboardShortcut[],
    notifications: [] as Notification[],
    tags: [] as Tag[],
    templates: TEMPLATES as Template[],
    searchQuery: '',
    searchResults: [] as SearchResult[],
    isSearching: false,
    sidebarOpen: true,
    rightPanelOpen: false,
    activePanel: 'comments' as 'comments' | 'versions' | 'share',
    modals: {
      newDoc: false,
      templatePicker: false,
      share: false,
      settings: false,
      notifications: false,
      search: false
    },
    selectedBlockId: null as string | null,
    showBlockMenu: false,
    blockMenuPosition: { x: 0, y: 0 } as { x: number; y: number },
    activeTab: 'dashboard' as string
  }),
  getters: {
    unreadNotificationsCount: (state): number => {
      return state.notifications.filter(n => !n.read).length
    },
    currentThemeVariables: (state): Record<string, string> => {
      const theme = state.themes.find(t => t.id === state.currentTheme)
      return theme?.variables || state.themes[0].variables
    },
    currentThemeObj: (state): Theme => {
      return state.themes.find(t => t.id === state.currentTheme) || state.themes[0]
    },
    availableThemes: (state): Theme[] => {
      return state.themes
    },
    shortcutConflicts: (state): { name: string; keys: string }[] => {
      const conflicts: { name: string; keys: string }[] = []
      const keyMap = new Map<string, string[]>()
      
      state.shortcuts.forEach(s => {
        if (s.currentKey) {
          const existing = keyMap.get(s.currentKey) || []
          existing.push(s.name)
          keyMap.set(s.currentKey, existing)
        }
      })
      
      keyMap.forEach((names, key) => {
        if (names.length > 1) {
          conflicts.push({ name: names.join(', '), keys: key })
        }
      })
      
      return conflicts
    }
  },
  actions: {
    initTheme() {
      const saved = localStorage.getItem('theme') || 'light'
      this.setTheme(saved)
    },
    setTheme(themeId: string) {
      this.currentTheme = themeId
      localStorage.setItem('theme', themeId)
      const theme = this.themes.find(t => t.id === themeId)
      if (theme) {
        const root = document.documentElement
        Object.entries(theme.variables).forEach(([key, value]) => {
          root.style.setProperty(key, value)
        })
      }
    },
    initShortcuts() {
      const saved = localStorage.getItem('shortcuts')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          this.shortcuts = parsed
        } catch (e) {
          this.shortcuts = [...DEFAULT_SHORTCUTS]
        }
      }
    },
    updateShortcut(shortcutId: string, newKey: string): { success: boolean; conflict?: string } {
      const existing = this.shortcuts.find(s => s.currentKey === newKey && s.id !== shortcutId)
      if (existing) {
        return { success: false, conflict: existing.name }
      }
      const shortcut = this.shortcuts.find(s => s.id === shortcutId)
      if (shortcut) {
        shortcut.currentKey = newKey
        localStorage.setItem('shortcuts', JSON.stringify(this.shortcuts))
      }
      return { success: true }
    },
    resetShortcut(shortcutId: string) {
      const shortcut = this.shortcuts.find(s => s.id === shortcutId)
      if (shortcut) {
        shortcut.currentKey = shortcut.defaultKey
        localStorage.setItem('shortcuts', JSON.stringify(this.shortcuts))
      }
    },
    resetAllShortcuts() {
      this.shortcuts = [...DEFAULT_SHORTCUTS]
      localStorage.removeItem('shortcuts')
    },
    resetShortcuts() {
      this.resetAllShortcuts()
    },
    getShortcutByAction(action: string): string | undefined {
      return this.shortcuts.find(s => s.action === action)?.currentKey
    },
    async loadTags() {
      this.tags = await getAllTags()
    },
    async addTag(name: string, color: string = '#3b82f6'): Promise<Tag> {
      const tag: Tag = { id: generateId(), name, color }
      await saveTag(tag)
      this.tags.push(tag)
      return tag
    },
    async removeTag(id: string) {
      await deleteTag(id)
      this.tags = this.tags.filter(t => t.id !== id)
    },
    async loadNotifications(userId: string) {
      this.notifications = await getNotifications(userId)
    },
    async addNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
      const notif: Notification = {
        ...notification,
        id: generateId(),
        read: false,
        createdAt: Date.now()
      }
      await saveNotification(notif)
      this.notifications.unshift(notif)
    },
    async markNotificationAsRead(id: string) {
      await markNotificationRead(id)
      const notif = this.notifications.find(n => n.id === id)
      if (notif) notif.read = true
    },
    async markAllNotificationsRead(userId: string) {
      for (const notif of this.notifications) {
        if (!notif.read) {
          await markNotificationRead(notif.id)
          notif.read = true
        }
      }
    },
    async searchDocuments(query: string): Promise<SearchResult[]> {
      if (!query.trim()) {
        this.searchResults = []
        return []
      }
      this.isSearching = true
      this.searchQuery = query
      const results: SearchResult[] = []
      const docs = await getAllDocuments()
      const q = query.toLowerCase()
      for (const doc of docs) {
        for (let i = 0; i < doc.blocks.length; i++) {
          const block = doc.blocks[i]
          const content = block.content.toLowerCase()
          const index = content.indexOf(q)
          if (index > -1) {
            const snippetStart = Math.max(0, index - 20)
            const snippetEnd = Math.min(block.content.length, index + query.length + 20)
            const snippet = (snippetStart > 0 ? '...' : '') +
              block.content.slice(snippetStart, snippetEnd) +
              (snippetEnd < block.content.length ? '...' : '')
            results.push({
              documentId: doc.id,
              documentTitle: doc.title,
              blockId: block.id,
              blockType: block.type,
              snippet,
              matchIndex: index
            })
          }
        }
      }
      this.searchResults = results
      this.isSearching = false
      return results
    },
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = []
      this.isSearching = false
    },
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    toggleRightPanel() {
      this.rightPanelOpen = !this.rightPanelOpen
    },
    setActivePanel(panel: 'comments' | 'versions' | 'share') {
      this.activePanel = panel
      this.rightPanelOpen = true
    },
    openModal(modal: keyof typeof this.modals) {
      this.modals[modal] = true
    },
    closeModal(modal: keyof typeof this.modals) {
      this.modals[modal] = false
    },
    toggleModal(modal: keyof typeof this.modals) {
      this.modals[modal] = !this.modals[modal]
    },
    closeAllModals() {
      Object.keys(this.modals).forEach(key => {
        this.modals[key as keyof typeof this.modals] = false
      })
    },
    setSelectedBlock(blockId: string | null) {
      this.selectedBlockId = blockId
    },
    openBlockMenu(x: number, y: number) {
      this.blockMenuPosition = { x, y }
      this.showBlockMenu = true
    },
    closeBlockMenu() {
      this.showBlockMenu = false
    },
    setActiveTab(tab: string) {
      this.activeTab = tab
    },
    getTemplateById(id: string): Template | undefined {
      return this.templates.find(t => t.id === id)
    },
    initTemplates() {
      this.templates = TEMPLATES.map(t => ({
        ...t,
        blocks: generateTemplateBlocks(t.id)
      }))
    }
  }
})

function generateTemplateBlocks(templateId: string) {
  const createBlock = (type: BlockType, content: string = '', extras: any = {}) => ({
    id: generateId(),
    type,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...extras
  })

  switch (templateId) {
    case 'prd':
      return [
        createBlock('h1', 'PRD - 产品需求文档'),
        createBlock('h2', '1. 需求背景'),
        createBlock('paragraph', '描述需求的背景和来源，为什么要做这个功能，解决什么问题。'),
        createBlock('h2', '2. 需求目标'),
        createBlock('bulleted-list', '目标1：量化指标'),
        createBlock('bulleted-list', '目标2：用户价值'),
        createBlock('h2', '3. 用户故事'),
        createBlock('quote', '作为 [用户角色]，我想要 [功能]，以便于 [价值]。'),
        createBlock('h2', '4. 功能设计'),
        createBlock('h3', '4.1 功能列表'),
        createBlock('table', '', {
          tableData: [
            [{ content: '功能点', header: true }, { content: '描述', header: true }, { content: '优先级', header: true }],
            [{ content: '功能1', header: false }, { content: '详细描述', header: false }, { content: 'P0', header: false }],
            [{ content: '功能2', header: false }, { content: '详细描述', header: false }, { content: 'P1', header: false }]
          ],
          tableWidths: [150, 300, 100]
        }),
        createBlock('h3', '4.2 交互流程'),
        createBlock('paragraph', '描述用户的操作路径和系统反馈。'),
        createBlock('h2', '5. 数据埋点'),
        createBlock('bulleted-list', '埋点1：页面曝光'),
        createBlock('bulleted-list', '埋点2：按钮点击'),
        createBlock('h2', '6. 非功能需求'),
        createBlock('bulleted-list', '性能要求：页面加载 < 2s'),
        createBlock('bulleted-list', '兼容性：Chrome 90+'),
        createBlock('h2', '7. 验收标准'),
        createBlock('todo', '功能完整可用', { checked: false }),
        createBlock('todo', 'UI 还原度 95%+', { checked: false }),
        createBlock('todo', '无重大 Bug', { checked: false })
      ]
    case 'meeting-notes':
      return [
        createBlock('h1', '会议纪要'),
        createBlock('h2', '基本信息'),
        createBlock('table', '', {
          tableData: [
            [{ content: '项目', header: true }, { content: '', header: false }],
            [{ content: '日期', header: true }, { content: '', header: false }],
            [{ content: '时间', header: true }, { content: '', header: false }],
            [{ content: '地点', header: true }, { content: '', header: false }],
            [{ content: '主持人', header: true }, { content: '', header: false }],
            [{ content: '参会人', header: true }, { content: '', header: false }]
          ],
          tableWidths: [120, 400]
        }),
        createBlock('h2', '会议议题'),
        createBlock('numbered-list', '议题1'),
        createBlock('numbered-list', '议题2'),
        createBlock('h2', '讨论内容'),
        createBlock('h3', '议题1'),
        createBlock('paragraph', '讨论内容摘要...'),
        createBlock('h3', '议题2'),
        createBlock('paragraph', '讨论内容摘要...'),
        createBlock('h2', '决议事项'),
        createBlock('table', '', {
          tableData: [
            [{ content: '事项', header: true }, { content: '负责人', header: true }, { content: '截止时间', header: true }, { content: '状态', header: true }],
            [{ content: '任务1', header: false }, { content: '', header: false }, { content: '', header: false }, { content: '进行中', header: false }]
          ],
          tableWidths: [250, 100, 150, 100]
        }),
        createBlock('h2', '待跟进'),
        createBlock('todo', '待办事项1', { checked: false }),
        createBlock('todo', '待办事项2', { checked: false })
      ]
    case 'weekly-report':
      return [
        createBlock('h1', '周报 - [姓名]'),
        createBlock('paragraph', '周期：YYYY年MM月DD日 ~ YYYY年MM月DD日'),
        createBlock('h2', '本周工作总结'),
        createBlock('bulleted-list', '完成了工作1'),
        createBlock('bulleted-list', '完成了工作2'),
        createBlock('bulleted-list', '完成了工作3'),
        createBlock('h2', '关键成果'),
        createBlock('table', '', {
          tableData: [
            [{ content: '指标', header: true }, { content: '目标', header: true }, { content: '实际', header: true }, { content: '完成率', header: true }],
            [{ content: '指标1', header: false }, { content: '100', header: false }, { content: '120', header: false }, { content: '120%', header: false }]
          ],
          tableWidths: [150, 100, 100, 100]
        }),
        createBlock('h2', '遇到的问题'),
        createBlock('paragraph', '描述本周遇到的问题和解决方案。'),
        createBlock('h2', '下周工作计划'),
        createBlock('todo', '计划1', { checked: false }),
        createBlock('todo', '计划2', { checked: false }),
        createBlock('todo', '计划3', { checked: false }),
        createBlock('h2', '需要协调的资源'),
        createBlock('quote', '需要其他同事或部门支持的事项。')
      ]
    case 'tech-spec':
      return [
        createBlock('h1', '技术方案设计文档'),
        createBlock('h2', '1. 概述'),
        createBlock('paragraph', '简述项目背景、目标和范围。'),
        createBlock('h2', '2. 架构设计'),
        createBlock('h3', '2.1 系统架构图'),
        createBlock('paragraph', '（此处插入架构图）'),
        createBlock('h3', '2.2 模块划分'),
        createBlock('bulleted-list', '模块1：职责描述'),
        createBlock('bulleted-list', '模块2：职责描述'),
        createBlock('h2', '3. 数据设计'),
        createBlock('h3', '3.1 数据库表结构'),
        createBlock('code', `CREATE TABLE example (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME
);`, { language: 'sql' }),
        createBlock('h3', '3.2 缓存设计'),
        createBlock('paragraph', '描述 Redis 缓存策略、Key 设计等。'),
        createBlock('h2', '4. 接口设计'),
        createBlock('h3', '4.1 REST API 列表'),
        createBlock('table', '', {
          tableData: [
            [{ content: '方法', header: true }, { content: '路径', header: true }, { content: '描述', header: true }, { content: '鉴权', header: true }],
            [{ content: 'GET', header: false }, { content: '/api/v1/users', header: false }, { content: '获取用户列表', header: false }, { content: '是', header: false }]
          ],
          tableWidths: [80, 200, 200, 80]
        }),
        createBlock('h2', '5. 时序图'),
        createBlock('paragraph', '（此处插入时序图）'),
        createBlock('h2', '6. 性能优化'),
        createBlock('bulleted-list', '优化点1：描述'),
        createBlock('bulleted-list', '优化点2：描述'),
        createBlock('h2', '7. 风险评估'),
        createBlock('table', '', {
          tableData: [
            [{ content: '风险点', header: true }, { content: '影响', header: true }, { content: '概率', header: true }, { content: '应对措施', header: true }],
            [{ content: '风险1', header: false }, { content: '高', header: false }, { content: '低', header: false }, { content: '措施', header: false }]
          ],
          tableWidths: [150, 80, 80, 200]
        })
      ]
    case 'design-spec':
      return [
        createBlock('h1', '设计稿说明'),
        createBlock('h2', '设计理念'),
        createBlock('paragraph', '阐述整体设计风格、设计原则和想要传递的品牌调性。'),
        createBlock('h2', '交互规范'),
        createBlock('h3', '页面布局'),
        createBlock('bulleted-list', '导航栏：高度 64px，固定在顶部'),
        createBlock('bulleted-list', '侧边栏：宽度 240px，可折叠'),
        createBlock('bulleted-list', '内容区：最大宽度 1200px，居中'),
        createBlock('h3', '颜色规范'),
        createBlock('table', '', {
          tableData: [
            [{ content: '用途', header: true }, { content: '色值', header: true }, { content: '示例', header: true }],
            [{ content: '主色调', header: false }, { content: '#3b82f6', header: false }, { content: '主按钮、链接', header: false }],
            [{ content: '成功色', header: false }, { content: '#10b981', header: false }, { content: '成功状态', header: false }],
            [{ content: '警告色', header: false }, { content: '#f59e0b', header: false }, { content: '警告提示', header: false }],
            [{ content: '错误色', header: false }, { content: '#ef4444', header: false }, { content: '错误提示', header: false }]
          ],
          tableWidths: [150, 120, 200]
        }),
        createBlock('h3', '字体规范'),
        createBlock('bulleted-list', '标题：PingFang SC, 600, 24px'),
        createBlock('bulleted-list', '正文：PingFang SC, 400, 14px'),
        createBlock('bulleted-list', '辅助文字：PingFang SC, 400, 12px'),
        createBlock('h2', '页面说明'),
        createBlock('h3', '页面1 - 首页'),
        createBlock('paragraph', '页面功能描述、关键交互说明。'),
        createBlock('h3', '页面2 - 列表页'),
        createBlock('paragraph', '页面功能描述、关键交互说明。'),
        createBlock('h2', '特殊状态'),
        createBlock('bulleted-list', '空状态：展示空状态插画和引导按钮'),
        createBlock('bulleted-list', '加载状态：展示骨架屏或 Loading 动画'),
        createBlock('bulleted-list', '错误状态：展示错误信息和重试按钮'),
        createBlock('h2', '响应式设计'),
        createBlock('bulleted-list', 'Desktop：> 1200px，三栏布局'),
        createBlock('bulleted-list', 'Tablet：768px ~ 1200px，两栏布局'),
        createBlock('bulleted-list', 'Mobile：< 768px，单栏布局')
      ]
    case 'okrs':
      return [
        createBlock('h1', 'OKR - [季度/年度]'),
        createBlock('h2', '周期'),
        createBlock('paragraph', 'YYYY年MM月DD日 ~ YYYY年MM月DD日'),
        createBlock('h2', 'Objective 1：[目标描述]'),
        createBlock('bulleted-list', 'KR1：关键结果1（XX% → XX%）'),
        createBlock('bulleted-list', 'KR2：关键结果2（XX → XX）'),
        createBlock('bulleted-list', 'KR3：关键结果3（XX → XX）'),
        createBlock('h3', '关键举措'),
        createBlock('todo', '举措1', { checked: false }),
        createBlock('todo', '举措2', { checked: false }),
        createBlock('h2', 'Objective 2：[目标描述]'),
        createBlock('bulleted-list', 'KR1：关键结果1'),
        createBlock('bulleted-list', 'KR2：关键结果2'),
        createBlock('h3', '关键举措'),
        createBlock('todo', '举措1', { checked: false }),
        createBlock('todo', '举措2', { checked: false }),
        createBlock('h2', '进度跟踪'),
        createBlock('table', '', {
          tableData: [
            [{ content: '目标', header: true }, { content: '关键结果', header: true }, { content: '当前值', header: true }, { content: '目标值', header: true }, { content: '完成度', header: true }],
            [{ content: 'O1', header: false }, { content: 'KR1', header: false }, { content: '', header: false }, { content: '', header: false }, { content: '0%', header: false }]
          ],
          tableWidths: [80, 200, 100, 100, 80]
        }),
        createBlock('h2', '需要支持'),
        createBlock('paragraph', '需要公司或其他部门提供的资源支持。')
      ]
    default:
      return [createBlock('paragraph', '')]
  }
}
