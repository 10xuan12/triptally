<script setup lang="ts">
import type { BackupPayload } from '~/utils/backup'

const { t, locale, setLocale } = useI18n()
const { trips, replaceTrips } = useTrips()
const { expenses, replaceExpenses } = useExpenses()

// Same convention as everywhere else in this app: no cookies, no backend —
// the chosen language lives in localStorage right alongside trips/expenses.
// plugins/i18n-persist.client.ts reads this key back on next launch.
const LOCALE_STORAGE_KEY = 'locale'

function selectLocale(code: 'zh-TW' | 'en') {
  setLocale(code)
  localStorage.setItem(LOCALE_STORAGE_KEY, code)
}

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
  exportMessage.value = t('settings.exportSuccess', { trips: trips.value.length, expenses: expenses.value.length })
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
    importError.value = t('settings.importInvalidJson')
    return
  }

  // Validate shape BEFORE touching anything — an import must never
  // partially apply or write coerced/invalid data.
  if (!isValidBackup(parsed)) {
    importError.value = t('settings.importInvalidShape')
    return
  }

  // eslint-disable-next-line no-alert -- deliberate native dialog per BUILD_BRIEF Stage 6
  const confirmed = window.confirm(t('settings.importConfirm'))
  if (!confirmed) return

  replaceTrips(parsed.trips)
  replaceExpenses(parsed.expenses)
  importSuccess.value = t('settings.importSuccess', { trips: parsed.trips.length, expenses: parsed.expenses.length })
}
</script>

<template>
  <div class="px-5 pt-8 pb-12">
    <header class="flex items-center gap-3 mb-8">
      <NuxtLink to="/" :aria-label="$t('common.back')" class="text-ink text-2xl leading-none">
        &larr;
      </NuxtLink>
      <p class="font-display text-lg font-semibold text-ink">{{ $t('settings.title') }}</p>
    </header>

    <!-- Language switcher — applies immediately (setLocale) and persists
         to localStorage so it's remembered on next launch, independent
         of whatever the browser itself is set to. -->
    <section class="mb-8">
      <p class="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2.5">{{ $t('settings.languageSection') }}</p>
      <div class="flex border border-line rounded-input overflow-hidden">
        <button
          type="button"
          class="flex-1 font-body text-sm py-3"
          :class="locale === 'zh-TW' ? 'bg-pine text-white font-semibold' : 'bg-card text-ink font-medium'"
          @click="selectLocale('zh-TW')"
        >
          {{ $t('settings.languageZh') }}
        </button>
        <button
          type="button"
          class="flex-1 font-body text-sm py-3"
          :class="locale === 'en' ? 'bg-pine text-white font-semibold' : 'bg-card text-ink font-medium'"
          @click="selectLocale('en')"
        >
          {{ $t('settings.languageEn') }}
        </button>
      </div>
    </section>

    <section>
      <p class="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-2.5">{{ $t('settings.backupSection') }}</p>
      <p class="font-body text-xs text-muted mb-4">
        {{ $t('settings.backupDescription') }}
      </p>

      <div class="bg-card border border-line rounded-xl overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-line text-left"
          @click="exportBackup"
        >
          <span class="font-body text-[15px] font-medium text-ink">{{ $t('settings.exportTitle') }}</span>
          <span class="font-mono text-xs text-muted shrink-0">
            {{ $t('settings.exportSummary', { trips: trips.length, expenses: expenses.length }) }}
          </span>
        </button>
        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
          @click="triggerFileSelect"
        >
          <span class="font-body text-[15px] font-medium text-ink">{{ $t('settings.importTitle') }}</span>
          <span class="font-body text-base font-semibold text-muted">›</span>
        </button>
        <input
          ref="fileInputEl"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="handleFileChange"
        >
      </div>
      <p v-if="exportMessage" class="font-body text-xs text-pine text-center mt-3" role="status">
        {{ exportMessage }}
      </p>
      <p v-if="importSuccess" class="font-body text-xs text-pine text-center mt-3" role="status">
        {{ importSuccess }}
      </p>
      <p v-if="importError" class="font-body text-xs text-danger text-center mt-3" role="status">
        {{ importError }}
      </p>
    </section>
  </div>
</template>
