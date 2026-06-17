<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import hljs from 'highlight.js'
import { useDocumentsStore } from '@/stores/documents'
import type { Block } from '@/types'

const props = defineProps<{
  block: Block
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [content: string]
}>()

const documentsStore = useDocumentsStore()
const codeRef = ref<HTMLElement | null>(null)
const showLanguageMenu = ref(false)

const languages = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css',
  'json', 'yaml', 'markdown', 'bash', 'plaintext'
]

const highlightedCode = computed(() => {
  try {
    const lang = props.block.language || 'javascript'
    if (lang === 'plaintext') return props.block.content || ''
    const result = hljs.highlight(props.block.content || '', { language: lang })
    return result.value
  } catch (e) {
    return props.block.content || ''
  }
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLElement
  const content = target.innerText
  emit('update', content)
}

const changeLanguage = (lang: string) => {
  documentsStore.updateBlock(props.block.id, { language: lang })
  showLanguageMenu.value = false
}

const copyCode = () => {
  navigator.clipboard.writeText(props.block.content || '')
}

onMounted(() => {
  if (codeRef.value && props.editable) {
    codeRef.value.focus()
  }
})
</script>

<template>
  <div class="code-block">
    <div class="code-header">
      <div class="language-selector" @click.stop>
        <button class="lang-btn" @click="showLanguageMenu = !showLanguageMenu">
          {{ block.language || 'javascript' }}
          <span class="arrow">▼</span>
        </button>
        
        <div v-if="showLanguageMenu" class="lang-menu">
          <button
            v-for="lang in languages"
            :key="lang"
            class="lang-item"
            :class="{ active: block.language === lang }"
            @click="changeLanguage(lang)"
          >
            {{ lang }}
          </button>
        </div>
      </div>
      
      <button class="copy-btn" @click="copyCode" title="复制代码">
        📋 复制
      </button>
    </div>
    
    <div class="code-content">
      <pre v-if="!editable"><code v-html="highlightedCode"></code></pre>
      <div
        v-else
        ref="codeRef"
        class="code-editor"
        contenteditable="true"
        spellcheck="false"
        @input="handleInput"
        @blur="handleInput"
      >{{ block.content || '' }}</div>
    </div>
    
    <div 
      class="click-outside" 
      v-if="showLanguageMenu"
      @click="showLanguageMenu = false"
    ></div>
  </div>
</template>

<style scoped>
.code-block {
  position: relative;
  margin: 0.5rem 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
}

.language-selector {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: 'Fira Code', monospace;
}

.arrow {
  font-size: 0.6rem;
  opacity: 0.7;
}

.lang-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 6px;
  padding: 0.25rem;
  min-width: 140px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.lang-item {
  display: block;
  width: 100%;
  padding: 0.375rem 0.625rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  font-family: 'Fira Code', monospace;
}

.lang-item:hover,
.lang-item.active {
  background: #3a3a3a;
  color: #569cd6;
}

.copy-btn {
  padding: 0.25rem 0.625rem;
  background: transparent;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: #3a3a3a;
}

.code-content {
  padding: 1rem;
  overflow-x: auto;
}

.code-content pre {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #d4d4d4;
}

.code-content code {
  font-family: inherit;
  background: transparent;
  padding: 0;
}

.code-editor {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
  outline: none;
  min-height: 60px;
}

.code-editor:empty:before {
  content: '// 在此输入代码...';
  color: #666;
}

.click-outside {
  position: fixed;
  inset: 0;
  z-index: 99;
}

:deep(.hljs-keyword) { color: #569cd6; }
:deep(.hljs-string) { color: #ce9178; }
:deep(.hljs-number) { color: #b5cea8; }
:deep(.hljs-function) { color: #dcdcaa; }
:deep(.hljs-comment) { color: #6a9955; font-style: italic; }
:deep(.hljs-variable) { color: #9cdcfe; }
:deep(.hljs-attr) { color: #9cdcfe; }
:deep(.hljs-tag) { color: #569cd6; }
:deep(.hljs-name) { color: #569cd6; }
:deep(.hljs-built_in) { color: #4ec9b0; }
:deep(.hljs-type) { color: #4ec9b0; }
:deep(.hljs-title) { color: #dcdcaa; }
:deep(.hljs-params) { color: #9cdcfe; }
:deep(.hljs-literal) { color: #569cd6; }
</style>
