<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block, TableCell } from '@/types'

const props = defineProps<{
  block: Block
  editable?: boolean
}>()

const documentsStore = useDocumentsStore()
const tableRef = ref<HTMLTableElement | null>(null)
const resizingCol = ref<number | null>(null)
const startX = ref(0)
const startWidth = ref(0)
const colWidths = ref<number[]>([])

const tableData = ref<string[][]>(
  props.block.tableData 
    ? props.block.tableData.map(row => row.map(cell => cell.content))
    : [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]
)

const getTableDataForUpdate = (): TableCell[][] => {
  return tableData.value.map((row, ri) =>
    row.map((content, ci) => ({
      content,
      header: ri === 0 || ci === 0
    }))
  )
}

onMounted(() => {
  if (tableRef.value) {
    const ths = tableRef.value.querySelectorAll('th, td:first-child')
    colWidths.value = Array.from(ths).map(th => th.clientWidth)
  }
})

const startResize = (e: MouseEvent, colIndex: number) => {
  if (!props.editable) return
  resizingCol.value = colIndex
  startX.value = e.clientX
  const th = (e.target as HTMLElement).parentElement as HTMLElement
  startWidth.value = th.clientWidth
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const onResize = (e: MouseEvent) => {
  if (resizingCol.value === null) return
  const diff = e.clientX - startX.value
  const newWidth = Math.max(50, startWidth.value + diff)
  colWidths.value[resizingCol.value] = newWidth
}

const stopResize = () => {
  resizingCol.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const handleCellInput = (rowIdx: number, colIdx: number, e: Event) => {
  const target = e.target as HTMLElement
  tableData.value[rowIdx][colIdx] = target.innerText
  documentsStore.updateBlock(props.block.id, { tableData: getTableDataForUpdate() })
}

const addRow = () => {
  const cols = tableData.value[0]?.length || 3
  tableData.value.push(new Array(cols).fill(''))
  documentsStore.updateBlock(props.block.id, { tableData: getTableDataForUpdate() })
}

const addColumn = () => {
  tableData.value.forEach(row => row.push(''))
  documentsStore.updateBlock(props.block.id, { tableData: getTableDataForUpdate() })
}

const deleteRow = (rowIdx: number) => {
  if (tableData.value.length <= 1) return
  tableData.value.splice(rowIdx, 1)
  documentsStore.updateBlock(props.block.id, { tableData: getTableDataForUpdate() })
}

const deleteColumn = (colIdx: number) => {
  if (tableData.value[0]?.length <= 1) return
  tableData.value.forEach(row => row.splice(colIdx, 1))
  colWidths.value.splice(colIdx, 1)
  documentsStore.updateBlock(props.block.id, { tableData: getTableDataForUpdate() })
}
</script>

<template>
  <div class="table-block">
    <div class="table-wrapper" v-if="editable">
      <div class="table-controls">
        <button class="control-btn" @click="addRow" title="添加行">
          ➕ 行
        </button>
        <button class="control-btn" @click="addColumn" title="添加列">
          ➕ 列
        </button>
      </div>
    </div>

    <div class="table-container">
      <table ref="tableRef">
        <tbody>
          <tr v-for="(row, rowIdx) in tableData" :key="rowIdx">
            <td
              v-for="(cell, colIdx) in row"
              :key="colIdx"
              :style="{ width: colWidths[colIdx] + 'px', minWidth: '50px' }"
              :contenteditable="editable"
              @input="handleCellInput(rowIdx, colIdx, $event)"
              @blur="handleCellInput(rowIdx, colIdx, $event)"
            >
              {{ cell || (editable ? '' : '&nbsp;') }}
              
              <div
                v-if="editable && colIdx < row.length - 1"
                class="resize-handle"
                @mousedown="startResize($event, colIdx)"
              ></div>
              
              <div v-if="editable" class="cell-actions">
                <button class="cell-btn" @click.stop="deleteRow(rowIdx)" title="删除行">
                  🗑️ 行
                </button>
                <button class="cell-btn" @click.stop="deleteColumn(colIdx)" title="删除列">
                  🗑️ 列
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-block {
  margin: 0.5rem 0;
}

.table-wrapper {
  position: relative;
}

.table-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.control-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.control-btn:hover {
  background: var(--primary-100);
  color: var(--primary-600);
  border-color: var(--primary-300);
}

.table-container {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

td {
  position: relative;
  border: 1px solid var(--border-color);
  padding: 0.5rem 0.75rem;
  min-height: 40px;
  vertical-align: top;
  color: var(--text-primary);
  transition: background 0.15s ease;
}

td[contenteditable="true"] {
  outline: none;
}

td[contenteditable="true"]:focus {
  background: var(--primary-50);
}

td:first-child {
  font-weight: 500;
  background: var(--bg-tertiary);
}

tr:first-child td {
  background: var(--bg-tertiary);
  font-weight: 600;
}

.resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
}

.resize-handle:hover {
  background: var(--primary-400);
}

.cell-actions {
  position: absolute;
  top: 2px;
  right: 2px;
  display: none;
  gap: 2px;
}

td:hover .cell-actions {
  display: flex;
}

.cell-btn {
  padding: 1px 4px;
  font-size: 0.65rem;
  background: var(--danger-50);
  border: 1px solid var(--danger-200);
  border-radius: 2px;
  color: var(--danger-600);
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.15s ease;
}

.cell-btn:hover {
  opacity: 1;
}
</style>
