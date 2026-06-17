<script setup lang="ts">
import { ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'

const uiStore = useUiStore()
const { themes, currentTheme, shortcuts } = storeToRefs(uiStore)

const activeTab = ref<'appearance' | 'shortcuts'>('appearance')
const editingShortcut = ref<string | null>(null)
const recordingKey = ref(false)
const conflictMessage = ref('')

function setTheme(themeId: string) {
  uiStore.setTheme(themeId)
}

function startEditShortcut(id: string) {
  editingShortcut.value = id
  recordingKey.value = true
  conflictMessage.value = ''
}

function handleKeyDown(event: KeyboardEvent, shortcutId: string) {
  if (!recordingKey.value || editingShortcut.value !== shortcutId) return
  event.preventDefault()

  const keys: string[] = []
  if (event.ctrlKey || event.metaKey) keys.push('Ctrl')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')

  const specialKeys = ['Control', 'Shift', 'Alt', 'Meta', ' ', 'Enter', 'Escape', 'Backspace', 'Delete']
  if (!specialKeys.includes(event.key)) {
    keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key)
  }

  if (keys.length > 0 && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
    const keyCombo = keys.join('+')
    const result = uiStore.updateShortcut(shortcutId, keyCombo)
    if (!result.success) {
      conflictMessage.value = `与「${result.conflict}」冲突`
    } else {
      conflictMessage.value = ''
      editingShortcut.value = null
      recordingKey.value = false
    }
  }
}

function cancelEdit() {
  editingShortcut.value = null
  recordingKey.value = false
  conflictMessage.value = ''
}

function resetShortcut(id: string) {
  uiStore.resetShortcut(id)
}

function resetAllShortcuts() {
  if (confirm('确定要重置所有快捷键为默认值吗？')) {
    uiStore.resetAllShortcuts()
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="uiStore.closeModal('settings')">
    <div class="settings-modal animate-slide-up">
      <div class="modal-header">
        <h2 class="modal-title">设置</h2>
        <button class="close-btn" @click="uiStore.closeModal('settings')">✕</button>
      </div>
      <div class="modal-body">
        <div class="settings-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'appearance' }"
            @click="activeTab = 'appearance'"
          >
            🎨 外观
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'shortcuts' }"
            @click="activeTab = 'shortcuts'"
          >
            ⌨️ 快捷键
          </button>
        </div>
        <div v-show="activeTab === 'appearance'" class="settings-content">
          <div class="setting-section">
            <label class="section-label">主题设置</label>
            <p class="section-desc">选择你喜欢的配色方案</p>
            <div class="themes-grid">
              <button
                v-for="theme in themes"
                :key="theme.id"
                class="theme-card"
                :class="{ active: currentTheme === theme.id }"
                @click="setTheme(theme.id)"
              >
                <div class="theme-preview">
                  <span
                    class="preview-dot"
                    v-for="(colorKey, index) in ['--accent', '--success', '--warning', '--danger']"
                    :key="colorKey"
                    :style="{
                      backgroundColor: theme.variables[colorKey as string]
                    }"
                  />
                </div>
                <span class="theme-name">{{ theme.name }}</span>
                <span v-if="currentTheme === theme.id" class="active-check">✓</span>
              </button>
            </div>
          </div>
          <div class="setting-section">
            <label class="section-label">关于</label>
            <div class="about-info">
              <p><strong>SoloDoc</strong> v1.0.0</p>
              <p>轻量级浏览器内协作文档工具</p>
              <p class="tech-info">Vue 3 + Vite + Pinia + IndexedDB</p>
            </div>
          </div>
        </div>
        <div v-show="activeTab === 'shortcuts'" class="settings-content">
          <div class="shortcuts-header">
            <p class="section-desc">点击快捷键进行修改，按 Esc 取消</p>
            <button class="reset-all-btn" @click="resetAllShortcuts">
              重置全部
            </button>
          </div>
          <div class="shortcuts-list">
            <div
              v-for="shortcut in shortcuts"
              :key="shortcut.id"
              class="shortcut-item"
            >
              <div class="shortcut-info">
                <span class="shortcut-name">{{ shortcut.name }}</span>
                <span class="shortcut-desc">{{ shortcut.description }}</span>
              </div>
              <div class="shortcut-input-wrap">
                <button
                  v-if="editingShortcut !== shortcut.id"
                  class="shortcut-key"
                  @click="startEditShortcut(shortcut.id)"
                >
                  {{ shortcut.currentKey }}
                </button>
                <input
                  v-else
                  type="text"
                  class="shortcut-input"
                  placeholder="按下新快捷键..."
                  @keydown="handleKeyDown($event, shortcut.id)"
                  @blur="cancelEdit"
                  autofocus
                />
                <button
                  v-if="shortcut.currentKey !== shortcut.defaultKey"
                  class="reset-btn"
                  @click="resetShortcut(shortcut.id)"
                  title="重置为默认"
                >
                  ↺
                </button>
              </div>
              <div v-if="conflictMessage && editingShortcut === shortcut.id" class="conflict-error">
                {{ conflictMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.settings-modal {
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  background-color: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 14px;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
}

.tab-btn {
  padding: 14px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.settings-content {
  padding: 24px;
}

.setting-section {
  margin-bottom: 32px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background-color: var(--bg-secondary);
  transition: all 0.2s;
  position: relative;
}

.theme-card:hover {
  border-color: var(--accent);
}

.theme-card.active {
  border-color: var(--accent);
  background-color: var(--accent) + '08';
}

.theme-preview {
  display: flex;
  gap: 6px;
}

.preview-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.theme-name {
  font-size: 13px;
  color: var(--text-primary);
}

.active-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--accent);
  font-size: 14px;
  font-weight: bold;
}

.about-info {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.about-info strong {
  color: var(--text-primary);
}

.tech-info {
  color: var(--text-muted);
  font-size: 12px;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.reset-all-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--danger);
  border: 1px solid var(--danger) + '40';
  border-radius: 4px;
}

.reset-all-btn:hover {
  background-color: var(--danger) + '10';
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.15s;
}

.shortcut-item:hover {
  background-color: var(--bg-secondary);
}

.shortcut-info {
  flex: 1;
  min-width: 0;
}

.shortcut-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.shortcut-desc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
}

.shortcut-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-key {
  padding: 6px 14px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
}

.shortcut-key:hover {
  border-color: var(--accent);
}

.shortcut-input {
  width: 160px;
  font-family: monospace;
  font-size: 12px;
  text-align: center;
  border-color: var(--accent);
}

.reset-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 14px;
}

.reset-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--accent);
}

.conflict-error {
  width: 100%;
  margin-top: 4px;
  padding-left: calc(50% + 8px);
  font-size: 11px;
  color: var(--danger);
}
</style>
