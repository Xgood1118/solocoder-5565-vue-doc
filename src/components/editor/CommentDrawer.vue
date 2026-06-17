<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { generateId } from '@/utils/id'
import type { Comment, CommentReply, Block, User } from '@/types'
import MentionPicker from './MentionPicker.vue'

const props = defineProps<{
  block: Block | null
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const newComment = ref('')
const replyingTo = ref<string | null>(null)
const replyContent = ref('')
const showMentionPicker = ref(false)
const mentionPosition = ref({ x: 0, y: 0 })
const mentionSearchQuery = ref('')
const mentionInputRef = ref<HTMLTextAreaElement | null>(null)
const mentionPickerRef = ref<InstanceType<typeof MentionPicker> | null>(null)

const blockComments = computed(() => {
  if (!props.block) return []
  return props.block.comments || []
})

const activeComments = computed(() => {
  return blockComments.value.filter(c => !c.resolved)
})

const resolvedComments = computed(() => {
  return blockComments.value.filter(c => c.resolved)
})

const showResolved = ref(false)

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN')
}

const handleInput = (e: Event, isReply: boolean = false) => {
  const target = e.target as HTMLTextAreaElement
  const content = target.value
  const cursorPos = target.selectionStart
  
  const atIndex = content.lastIndexOf('@', cursorPos - 1)
  if (atIndex !== -1 && (atIndex === 0 || content[atIndex - 1] === ' ' || content[atIndex - 1] === '\n')) {
    const query = content.slice(atIndex + 1, cursorPos)
    if (!query.includes(' ')) {
      mentionSearchQuery.value = query
      const rect = target.getBoundingClientRect()
      mentionPosition.value = {
        x: rect.left + 10,
        y: rect.bottom + 5
      }
      showMentionPicker.value = true
      return
    }
  }
  showMentionPicker.value = false
}

const handleMentionSelect = (user: User) => {
  const target = mentionInputRef.value
  if (!target) return
  
  const content = isReplying.value ? replyContent.value : newComment.value
  const cursorPos = target.selectionStart
  const atIndex = content.lastIndexOf('@', cursorPos - 1)
  
  if (atIndex !== -1) {
    const newContent = content.slice(0, atIndex) + `@${user.name} ` + content.slice(cursorPos)
    if (isReplying.value) {
      replyContent.value = newContent
    } else {
      newComment.value = newContent
    }
    nextTick(() => {
      const newPos = atIndex + user.name.length + 2
      target.selectionStart = target.selectionEnd = newPos
      target.focus()
    })
  }
  showMentionPicker.value = false
}

const isReplying = computed(() => replyingTo.value !== null)

watch(showMentionPicker, (newVal) => {
  if (!newVal) {
    mentionSearchQuery.value = ''
  }
})

const extractMentions = (content: string): string[] => {
  const matches = content.match(/@(\S+)/g)
  return matches ? matches.map(m => m.slice(1)) : []
}

const addComment = async () => {
  if (!newComment.value.trim() || !props.block || !authStore.currentUser) return
  
  const mentions = extractMentions(newComment.value)
  const comment: Comment = {
    id: generateId(),
    blockId: props.block.id,
    author: authStore.currentUser,
    content: newComment.value,
    resolved: false,
    replies: [],
    createdAt: Date.now(),
    mentions
  }
  
  const comments = [...(props.block.comments || []), comment]
  documentsStore.updateBlock(props.block.id, { comments })
  
  for (const mention of mentions) {
    const user = authStore.allUsers.find(u => u.name === mention)
    if (user) {
      await uiStore.addNotification({
        userId: user.id,
        type: 'mention',
        documentId: documentsStore.currentDocument?.id || '',
        documentTitle: documentsStore.currentDocument?.title || '',
        message: `${authStore.currentUser.name} 在评论中 @ 了你`,
        link: `/doc/${documentsStore.currentDocument?.id}#${props.block.id}`
      })
    }
  }
  
  newComment.value = ''
}

const addReply = async (commentId: string) => {
  if (!replyContent.value.trim() || !props.block || !authStore.currentUser) return
  
  const mentions = extractMentions(replyContent.value)
  const reply: CommentReply = {
    id: generateId(),
    author: authStore.currentUser,
    content: replyContent.value,
    createdAt: Date.now(),
    mentions
  }
  
  const comments = props.block.comments?.map(c => {
    if (c.id === commentId) {
      return { ...c, replies: [...c.replies, reply] }
    }
    return c
  }) || []
  
  documentsStore.updateBlock(props.block.id, { comments })
  
  for (const mention of mentions) {
    const user = authStore.allUsers.find(u => u.name === mention)
    if (user) {
      await uiStore.addNotification({
        userId: user.id,
        type: 'mention',
        documentId: documentsStore.currentDocument?.id || '',
        documentTitle: documentsStore.currentDocument?.title || '',
        message: `${authStore.currentUser.name} 在评论回复中 @ 了你`,
        link: `/doc/${documentsStore.currentDocument?.id}#${props.block.id}`
      })
    }
  }
  
  replyContent.value = ''
  replyingTo.value = null
}

const resolveComment = (commentId: string) => {
  if (!props.block) return
  
  const comments = props.block.comments?.map(c => {
    if (c.id === commentId) {
      return { ...c, resolved: true }
    }
    return c
  }) || []
  
  documentsStore.updateBlock(props.block.id, { comments })
}

const reopenComment = (commentId: string) => {
  if (!props.block) return
  
  const comments = props.block.comments?.map(c => {
    if (c.id === commentId) {
      return { ...c, resolved: false }
    }
    return c
  }) || []
  
  documentsStore.updateBlock(props.block.id, { comments })
}

const startReply = (commentId: string) => {
  replyingTo.value = commentId
  replyContent.value = ''
  nextTick(() => {
    const replyInput = document.querySelector(`.reply-input-${commentId}`) as HTMLTextAreaElement
    replyInput?.focus()
  })
}

const cancelReply = () => {
  replyingTo.value = null
  replyContent.value = ''
}

const handleKeydown = (e: KeyboardEvent) => {
  if (showMentionPicker.value && mentionPickerRef.value) {
    mentionPickerRef.value.handleKeydown(e)
  }
}
</script>

<template>
  <div v-if="show && block" class="comment-drawer">
    <div class="drawer-header">
      <h3>评论</h3>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>
    
    <div class="drawer-content">
      <div v-if="!authStore.canComment" class="no-permission">
        你没有评论权限
      </div>
      
      <template v-else>
        <div class="comment-input-wrapper">
          <img 
            v-if="authStore.currentUser" 
            :src="authStore.currentUser.avatar" 
            class="comment-avatar" 
          />
          <div class="comment-input-area">
            <textarea
              ref="mentionInputRef"
              v-model="newComment"
              class="comment-input"
              placeholder="添加评论... 输入 @ 提及同事"
              rows="3"
              @input="handleInput($event, false)"
              @keydown="handleKeydown"
            />
            <div class="comment-actions">
              <span class="hint">Ctrl+Enter 发送</span>
              <button 
                class="send-btn" 
                :disabled="!newComment.trim()"
                @click="addComment"
              >
                发送
              </button>
            </div>
          </div>
        </div>
        
        <div class="comments-list">
          <div v-if="activeComments.length === 0 && resolvedComments.length === 0" class="no-comments">
            暂无评论，来发表第一条评论吧
          </div>
          
          <div v-for="comment in activeComments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <img :src="comment.author.avatar" class="comment-avatar small" />
              <div class="comment-meta">
                <span class="comment-author">{{ comment.author.name }}</span>
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
              </div>
              <button 
                v-if="authStore.canEdit"
                class="resolve-btn"
                @click="resolveComment(comment.id)"
                title="标记为已解决"
              >
                ✓
              </button>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
            
            <div v-if="comment.replies.length > 0" class="replies-list">
              <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                <img :src="reply.author.avatar" class="comment-avatar tiny" />
                <div class="reply-content">
                  <span class="reply-author">{{ reply.author.name }}</span>
                  <span class="reply-text">{{ reply.content }}</span>
                  <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="replyingTo === comment.id" class="reply-input-wrapper">
              <textarea
                :class="`reply-input reply-input-${comment.id}`"
                v-model="replyContent"
                placeholder="回复评论..."
                rows="2"
                @input="(e) => { mentionInputRef = e.target as any; handleInput(e, true); }"
                @keydown="handleKeydown"
              />
              <div class="reply-actions">
                <button class="cancel-btn" @click="cancelReply">取消</button>
                <button 
                  class="send-btn small" 
                  :disabled="!replyContent.trim()"
                  @click="addReply(comment.id)"
                >
                  回复
                </button>
              </div>
            </div>
            
            <button 
              v-if="replyingTo !== comment.id && authStore.canComment"
              class="reply-btn"
              @click="startReply(comment.id)"
            >
              回复
            </button>
          </div>
          
          <div v-if="resolvedComments.length > 0" class="resolved-section">
            <button 
              class="toggle-resolved"
              @click="showResolved = !showResolved"
            >
              {{ showResolved ? '▼' : '▶' }} 已解决 ({{ resolvedComments.length }})
            </button>
            
            <div v-show="showResolved" class="resolved-list">
              <div v-for="comment in resolvedComments" :key="comment.id" class="comment-item resolved">
                <div class="comment-header">
                  <img :src="comment.author.avatar" class="comment-avatar small" />
                  <div class="comment-meta">
                    <span class="comment-author">{{ comment.author.name }}</span>
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                  </div>
                  <button 
                    class="resolve-btn resolved"
                    @click="reopenComment(comment.id)"
                    title="重新打开"
                  >
                    ↺
                  </button>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                
                <div v-if="comment.replies.length > 0" class="replies-list">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <img :src="reply.author.avatar" class="comment-avatar tiny" />
                    <div class="reply-content">
                      <span class="reply-author">{{ reply.author.name }}</span>
                      <span class="reply-text">{{ reply.content }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <MentionPicker
      ref="mentionPickerRef"
      :show="showMentionPicker"
      :position="mentionPosition"
      :search-query="mentionSearchQuery"
      @select="handleMentionSelect"
      @close="showMentionPicker = false"
    />
  </div>
</template>

<style scoped>
.comment-drawer {
  width: 360px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.drawer-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.no-permission {
  text-align: center;
  color: var(--text-tertiary);
  padding: 40px 20px;
}

.comment-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.comment-avatar.small {
  width: 32px;
  height: 32px;
}

.comment-avatar.tiny {
  width: 24px;
  height: 24px;
}

.comment-input-area {
  flex: 1;
}

.comment-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.comment-input:focus {
  outline: none;
  border-color: var(--accent);
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.send-btn {
  padding: 6px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn.small {
  padding: 4px 12px;
  font-size: 0.8rem;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.no-comments {
  text-align: center;
  color: var(--text-tertiary);
  padding: 40px 20px;
  font-size: 0.9rem;
}

.comment-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  transition: opacity 0.2s ease;
}

.comment-item.resolved {
  opacity: 0.6;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.comment-author {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.comment-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.resolve-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--success);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}

.resolve-btn:hover {
  opacity: 0.8;
}

.resolve-btn.resolved {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.comment-content {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin-left: 40px;
  white-space: pre-wrap;
  word-break: break-word;
}

.replies-list {
  margin-top: 12px;
  margin-left: 40px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.reply-content {
  flex: 1;
  font-size: 0.85rem;
}

.reply-author {
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 6px;
}

.reply-text {
  color: var(--text-primary);
}

.reply-time {
  display: block;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.reply-input-wrapper {
  margin-top: 12px;
  margin-left: 40px;
}

.reply-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
  resize: vertical;
  font-family: inherit;
}

.reply-input:focus {
  outline: none;
  border-color: var(--accent);
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.cancel-btn {
  padding: 4px 12px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.cancel-btn:hover {
  background: var(--bg-tertiary);
}

.reply-btn {
  margin-top: 8px;
  margin-left: 40px;
  padding: 4px 10px;
  background: transparent;
  color: var(--accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.15s ease;
}

.reply-btn:hover {
  background: var(--bg-tertiary);
}

.resolved-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.toggle-resolved {
  width: 100%;
  text-align: left;
  padding: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.toggle-resolved:hover {
  background: var(--bg-secondary);
}

.resolved-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
