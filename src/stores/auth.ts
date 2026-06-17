import { defineStore } from 'pinia'
import type { User, PermissionRole } from '@/types'
import { generateId } from '@/utils/id'
import md5 from 'md5'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]

const DEFAULT_USERS: User[] = [
  { id: 'user-1', name: '张三', avatar: '', color: COLORS[0], role: 'owner' },
  { id: 'user-2', name: '李四', avatar: '', color: COLORS[1], role: 'editor' },
  { id: 'user-3', name: '王五', avatar: '', color: COLORS[2], role: 'commenter' },
  { id: 'user-4', name: '赵六', avatar: '', color: COLORS[3], role: 'viewer' },
  { id: 'user-5', name: '产品经理', avatar: '', color: COLORS[4], role: 'editor' },
  { id: 'user-6', name: '设计师', avatar: '', color: COLORS[5], role: 'editor' },
  { id: 'user-7', name: '运营同学', avatar: '', color: COLORS[6], role: 'commenter' },
  { id: 'user-8', name: '技术负责人', avatar: '', color: COLORS[7], role: 'editor' }
]

function getAvatar(name: string): string {
  const hash = md5(name)
  const colorIndex = Math.abs(parseInt(hash.slice(0, 8), 16)) % 8
  const bgColor = COLORS[colorIndex]
  const initial = name.charAt(0)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="${bgColor}" rx="20"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="18">${initial}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

DEFAULT_USERS.forEach(u => {
  u.avatar = getAvatar(u.name)
})

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    allUsers: DEFAULT_USERS
  }),
  getters: {
    isLoggedIn: (state) => state.currentUser !== null,
    canEdit: (state) => state.currentUser?.role === 'owner' || state.currentUser?.role === 'editor',
    canComment: (state) => ['owner', 'editor', 'commenter'].includes(state.currentUser?.role || ''),
    isOwner: (state) => state.currentUser?.role === 'owner'
  },
  actions: {
    loginAs(userId: string) {
      const user = this.allUsers.find(u => u.id === userId) || this.allUsers[0]
      this.currentUser = user
      localStorage.setItem('currentUserId', userId)
    },
    logout() {
      this.currentUser = null
      localStorage.removeItem('currentUserId')
    },
    restoreSession() {
      const savedUserId = localStorage.getItem('currentUserId')
      if (savedUserId) {
        const user = this.allUsers.find(u => u.id === savedUserId)
        if (user) {
          this.currentUser = user
        }
      }
    },
    getUserById(userId: string): User | undefined {
      return this.allUsers.find(u => u.id === userId)
    },
    searchUsers(query: string): User[] {
      if (!query) return this.allUsers
      const q = query.toLowerCase()
      return this.allUsers.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      )
    },
    setUserRole(userId: string, role: PermissionRole) {
      const user = this.allUsers.find(u => u.id === userId)
      if (user) {
        user.role = role
      }
    }
  }
})
