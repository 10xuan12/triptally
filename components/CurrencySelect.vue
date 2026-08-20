<script setup lang="ts">
// Minimal searchable currency select — no extra dependency, just a text
// input that filters `options` (an ISO code list sourced dynamically from
// the exchange-rate service, never hardcoded, per BUILD_BRIEF Stage 3).
const props = defineProps<{
  modelValue: string
  options: string[]
  label: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const query = ref('')
const open = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toUpperCase()
  const list = q
    ? props.options.filter(code => code.toUpperCase().includes(q))
    : props.options
  return list.slice(0, 12)
})

function openSelect() {
  open.value = true
  nextTick(() => inputEl.value?.focus())
}

function select(code: string) {
  emit('update:modelValue', code)
  query.value = ''
  open.value = false
}

// Typing a code and pressing Enter, or typing then tapping away, reads as
// "I selected it" to a user — but until now only clicking a rendered <li>
// ever called select(), so the typed text never reached modelValue and the
// field silently reverted to its placeholder. Commit an unambiguous typed
// value: an exact code match, or the single option left after filtering.
function commitQuery() {
  const q = query.value.trim().toUpperCase()
  if (!q) return
  const exact = props.options.find(code => code.toUpperCase() === q)
  const candidate = exact ?? (filtered.value.length === 1 ? filtered.value[0] : null)
  if (candidate) select(candidate)
}

function onBlur() {
  // Delay so a tap on an option registers before the list closes.
  setTimeout(() => {
    commitQuery()
    open.value = false
  }, 150)
}
</script>

<template>
  <div class="relative">
    <label class="font-body text-xs font-medium text-muted block mb-1">{{ label }}</label>

    <button
      v-if="!open"
      type="button"
      class="w-full font-mono text-left border border-line rounded-lg px-3 py-2.5 bg-card text-ink"
      @click="openSelect"
    >
      {{ modelValue || placeholder || $t('currencySelect.placeholder') }}
    </button>

    <input
      v-else
      ref="inputEl"
      v-model="query"
      type="text"
      inputmode="text"
      autocapitalize="characters"
      :placeholder="modelValue || placeholder || $t('currencySelect.searchPlaceholder')"
      class="w-full font-mono border border-pine rounded-lg px-3 py-2.5 bg-card text-ink outline-none"
      @keydown.enter.prevent="commitQuery"
      @blur="onBlur"
    >

    <ul
      v-if="open && filtered.length"
      class="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-card border border-line rounded-lg shadow-lg"
    >
      <li v-for="code in filtered" :key="code">
        <button
          type="button"
          class="w-full text-left font-mono text-sm px-3 py-2 active:bg-paper"
          @mousedown.prevent="select(code)"
        >
          {{ code }}
        </button>
      </li>
    </ul>
  </div>
</template>
