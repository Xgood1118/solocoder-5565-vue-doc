<script setup lang="ts">
import { computed } from 'vue'
import { renderDiffHtml } from '@/utils/diff'
import type { DocumentVersion } from '@/types'

const props = defineProps<{
  versionA: DocumentVersion
  versionB: DocumentVersion
}>()

const diffContent = computed(() => {
  const contentA = JSON.stringify(props.versionA.blocks, null, 2)
  const contentB = JSON.stringify(props.versionB.blocks, null, 2)
  return renderDiffHtml(contentA, contentB)
})

const diffStats = computed(() => {
  const contentA = JSON.stringify(props.versionA.blocks, null, 2)
  const contentB = JSON.stringify(props.versionB.blocks, null, 2)
  return {
    additions: Math.max(0, contentB.length - contentA.length),
    deletions: Math.max(0, contentA.length - contentB.length)
  }
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="diff-viewer">
    <div class="diff-header">
      <div class="version-info">
        <span class="version-label version-old">旧版本</span>
        <span class="version-date">{{ formatDate(versionA.createdAt.toString()) }}</span>
      </div>
      <div class="diff-icon">VS</div>
      <div class="version-info">
        <span class="version-label version-new">新版本</span>
        <span class="version-date">{{ formatDate(versionB.createdAt.toString()) }}</span>
      </div>
    </div>
    
    <div class="diff-stats">
      <span class="stat-add">+ {{ diffStats.additions }} 新增</span>
      <span class="stat-remove">- {{ diffStats.deletions }} 删除</span>
    </div>

    <div class="diff-content" v-html="diffContent"></div>
  </div>
</template>

<style scoped>
.diff-viewer {
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
  flex: 1;
}

.version-label {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  align-self: center;
}

.version-old {
  background: var(--danger-100);
  color: var(--danger-600);
}

.version-new {
  background: var(--success-100);
  color: var(--success-600);
}

.version-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.diff-icon {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-tertiary);
  padding: 0.5rem;
}

.diff-stats {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.stat-add {
  color: var(--success-600);
  font-size: 0.85rem;
  font-weight: 500;
}

.stat-remove {
  color: var(--danger-600);
  font-size: 0.85rem;
  font-weight: 500;
}

.diff-content {
  padding: 1rem 1.5rem;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-content :deep(.diff-add) {
  background: var(--success-100);
  color: var(--success-700);
  padding: 0 2px;
  border-radius: 2px;
}

.diff-content :deep(.diff-remove) {
  background: var(--danger-100);
  color: var(--danger-700);
  text-decoration: line-through;
  padding: 0 2px;
  border-radius: 2px;
}

.diff-content :deep(.diff-line-add) {
  background: color-mix(in srgb, var(--success-500) 10%, transparent);
  display: block;
  margin: 2px 0;
  padding: 2px 4px;
  border-radius: 2px;
}

.diff-content :deep(.diff-line-remove) {
  background: color-mix(in srgb, var(--danger-500) 10%, transparent);
  display: block;
  margin: 2px 0;
  padding: 2px 4px;
  border-radius: 2px;
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
