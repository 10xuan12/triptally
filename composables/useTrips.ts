import type { Trip } from '~/types'

// Single localStorage key holding all trips as one JSON array, per
// BUILD_BRIEF Stage 3. Never read/written directly from a component.
const STORAGE_KEY = 'trips'

function readTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeTrips(trips: Trip[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch {
    // Storage full/unavailable — the in-memory list is still usable this
    // session, it just won't survive a reload.
  }
}

export interface CreateTripInput {
  name: string
  tripCurrency: string
  homeCurrency: string
  startDate?: string
  endDate?: string
  budget?: number
}

// Deliberately excludes tripCurrency/homeCurrency — every expense already
// logged against this trip has its amountHome frozen against those two
// currencies (see BUILD_BRIEF's historical-rate rule). Changing either
// after the fact would silently invalidate every past conversion without
// actually recalculating anything, so it's not offered as an edit at all.
export interface UpdateTripInput {
  name?: string
  startDate?: string
  endDate?: string
  budget?: number
}

/**
 * Trips CRUD backed by the `trips` localStorage key. Uses Nuxt's
 * useState so every component calling useTrips() shares one reactive
 * list — creating a trip anywhere updates the list everywhere immediately,
 * no prop drilling or manual refresh needed.
 */
export function useTrips() {
  const trips = useState<Trip[]>('trips', () => [])
  const hydrated = useState('tripsHydrated', () => false)

  // localStorage only exists client-side; hydrate once per app load.
  if (import.meta.client && !hydrated.value) {
    trips.value = readTrips()
    hydrated.value = true
  }

  function getTrips(): Trip[] {
    return trips.value
  }

  function createTrip(input: CreateTripInput): Trip {
    const trip: Trip = {
      id: generateId(),
      name: input.name.trim(),
      tripCurrency: input.tripCurrency,
      homeCurrency: input.homeCurrency,
      startDate: input.startDate || undefined,
      endDate: input.endDate || undefined,
      budget: input.budget,
      createdAt: new Date().toISOString()
    }
    trips.value = [trip, ...trips.value]
    writeTrips(trips.value)
    return trip
  }

  // Deleting a trip cascades to every expense logged against it — an
  // expense whose tripId points nowhere is orphaned data with no owning
  // trip to ever display it again, so it's removed here rather than left
  // stranded in the `expenses` store.
  function deleteTrip(id: string): void {
    trips.value = trips.value.filter(t => t.id !== id)
    writeTrips(trips.value)

    const { expenses, replaceExpenses } = useExpenses()
    replaceExpenses(expenses.value.filter(e => e.tripId !== id))
  }

  // Wholesale replace — backs Settings' 匯入備份 (Stage 6). Caller is
  // responsible for validating shape and confirming with the user before
  // calling this; it does no validation itself and overwrites unconditionally.
  function replaceTrips(newTrips: Trip[]): void {
    trips.value = newTrips
    writeTrips(trips.value)
  }

  /**
   * Edits an existing trip's name/dates/budget. `tripCurrency` and
   * `homeCurrency` are not parameters here at all — see UpdateTripInput.
   */
  function updateTrip(id: string, updates: UpdateTripInput): Trip | null {
    const index = trips.value.findIndex(t => t.id === id)
    if (index === -1) return null
    const existing = trips.value[index]

    const name = updates.name !== undefined ? updates.name.trim() : existing.name
    const startDate = 'startDate' in updates ? (updates.startDate || undefined) : existing.startDate
    const endDate = 'endDate' in updates ? (updates.endDate || undefined) : existing.endDate
    const budget = 'budget' in updates ? updates.budget : existing.budget

    const updated: Trip = {
      id: existing.id,
      name,
      tripCurrency: existing.tripCurrency, // immutable post-creation
      homeCurrency: existing.homeCurrency, // immutable post-creation
      startDate,
      endDate,
      budget,
      createdAt: existing.createdAt
    }

    const next = [...trips.value]
    next[index] = updated
    trips.value = next
    writeTrips(trips.value)
    return updated
  }

  return { trips, getTrips, createTrip, deleteTrip, replaceTrips, updateTrip }
}
