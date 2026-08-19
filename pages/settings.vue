<script setup lang="ts">
import type { BackupPayload } from '~/utils/backup'

const { trips, replaceTrips } = useTrips()
const { expenses, replaceExpenses } = useExpenses()

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// --- 匯出備份 ---
const exportMessage = ref('')

function exportBackup() {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    trips: trips.value,
    expenses: expenses.value
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `triptally-backup-${todayISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  exportMessage.value = `已匯出 ${trips.value.length} 個行程、${expenses.value.length} 筆花費紀錄`
}

// --- 匯入備份 ---
const fileInputEl = ref<HTMLInputElement | null>(null)
const importError = ref('')
const importSuccess = ref('')

function triggerFileSelect() {
  importError.value = ''
  importSuccess.value = ''
  fileInputEl.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // reset so picking the same file again still fires 'change'
  if (!file) return

  importError.value = ''
  importSuccess.value = ''

  let parsed: unknown
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch {
    importError.value = '無法讀取這個檔案，不是有效的 JSON 格式。'
    return
  }

  // Validate shape BEFORE touching anything — an import must never
  // partially apply or write coerced/invalid data.
  if (!isValidBackup(parsed)) {
    importError.value = '檔案內容格式不符，未進行任何匯入。'
    return
  }

  // eslint-disable-next-line no-alert -- deliberate native dialog per BUILD_BRIEF Stage 6
  const confirmed = window.confirm('這會覆蓋目前所有資料，確定要匯入嗎？')
  if (!confirmed) return

  replaceTrips(parsed.trips)
  replaceExpenses(parsed.expenses)
  importSuccess.value = `已匯入 ${parsed.trips.length} 個行程、${parsed.expenses.length} 筆花費紀錄`
}
</script>

<template>
  <div class="px-5 pt-8 pb-12">
    <header class="flex items-center gap-3 mb-8">
      <NuxtLink to="/" aria-label="返回" class="text-ink text-2xl leading-none">
        &larr;
      </NuxtLink>
      <p class="font-display text-lg font-semibold text-ink">設定</p>
    </header>

    <section>
      <p class="font-body text-xs font-medium text-muted mb-1">備份與還原</p>
      <p class="font-body text-xs text-muted mb-4">
        所有資料只存在這台裝置的瀏覽器裡，沒有雲端同步。建議定期匯出備份，換裝置或清除瀏覽器資料前尤其重要。
      </p>

      <div class="ticket p-5 pt-5 mb-4">
        <p class="font-body text-sm font-medium text-ink mb-1">匯出備份</p>
        <p class="font-mono text-xs text-muted mb-4">
          {{ trips.length }} 個行程 · {{ expenses.length }} 筆花費紀錄
        </p>
        <button
          type="button"
          class="w-full font-body text-sm font-semibold text-white bg-pine rounded-lg py-3"
          @click="exportBackup"
        >
          下載備份檔（JSON）
        </button>
        <p v-if="exportMessage" class="font-body text-xs text-pine text-center mt-3" role="status">
          {{ exportMessage }}
        </p>
      </div>

      <div class="ticket p-5 pt-5">
        <p class="font-body text-sm font-medium text-ink mb-1">匯入備份</p>
        <p class="font-mono text-xs text-muted mb-4">
          會覆蓋目前裝置上的所有行程與花費紀錄
        </p>
        <button
          type="button"
          class="w-full font-body text-sm font-semibold text-ink border border-line rounded-lg py-3"
          @click="triggerFileSelect"
        >
          選擇備份檔並匯入
        </button>
        <input
          ref="fileInputEl"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="handleFileChange"
        >
        <p v-if="importSuccess" class="font-body text-xs text-pine text-center mt-3" role="status">
          {{ importSuccess }}
        </p>
        <p v-if="importError" class="font-body text-xs text-danger text-center mt-3" role="status">
          {{ importError }}
        </p>
      </div>
    </section>
  </div>
</template>
