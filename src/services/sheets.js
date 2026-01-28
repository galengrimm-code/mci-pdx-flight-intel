const API_URL = 'https://script.google.com/macros/s/AKfycbz0n3JtUy2O7JGRe63nmymOWc9EBDprJTDBCx4g7CX8y5aM-sSscqJKecwj6W-N5hkuVA/exec'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class SheetsService {
  constructor() {
    this.apiUrl = API_URL
    this.cache = {}
  }

  getCached(key) {
    const cached = this.cache[key]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return null
  }

  setCache(key, data) {
    this.cache[key] = { data, timestamp: Date.now() }
  }

  clearCache(key) {
    if (key) {
      delete this.cache[key]
    } else {
      this.cache = {}
    }
  }

  setApiUrl(url) {
    this.apiUrl = url
    localStorage.setItem('APPS_SCRIPT_URL', url)
  }

  getApiUrl() {
    return this.apiUrl
  }

  isConfigured() {
    return true
  }

  async fetchSheet(tab) {
    const url = this.getApiUrl()
    if (!url) throw new Error('API URL not configured')
    const response = await fetch(`${url}?tab=${encodeURIComponent(tab)}`)
    if (!response.ok) throw new Error(`Failed to fetch ${tab}`)
    return await response.json()
  }

  async appendRow(tab, rowData) {
    const url = this.getApiUrl()
    if (!url) throw new Error('API URL not configured')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tab, rowData, action: 'append' })
    })
    if (!response.ok) throw new Error(`Failed to append to ${tab}`)
    return await response.json()
  }

  async updateRow(tab, id, rowData) {
    const url = this.getApiUrl()
    if (!url) throw new Error('API URL not configured')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tab, id, rowData, action: 'update' })
    })
    if (!response.ok) throw new Error(`Failed to update ${tab}`)
    return await response.json()
  }

  async deleteRow(tab, id) {
    const url = this.getApiUrl()
    if (!url) throw new Error('API URL not configured')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tab, id, action: 'delete' })
    })
    if (!response.ok) throw new Error(`Failed to delete from ${tab}`)
    return await response.json()
  }

  async getTrips(skipCache = false) {
    if (!skipCache) {
      const cached = this.getCached('trips')
      if (cached) return cached
    }
    const data = await this.fetchSheet('trips')
    const trips = this.parseRows(data.values, ['id', 'date', 'direction', 'flight_time', 'day_of_week', 'notes', 'total_time'])
    this.setCache('trips', trips)
    return trips
  }

  async addTrip(trip) {
    const row = [trip.id || this.generateId(), trip.date, trip.direction, trip.flight_time, trip.day_of_week, trip.notes || '', trip.total_time || '']
    const result = await this.appendRow('trips', row)
    this.clearCache('trips')
    return result
  }

  async updateTrip(trip) {
    const row = [trip.id, trip.date, trip.direction, trip.flight_time, trip.day_of_week, trip.notes || '', trip.total_time || '']
    const result = await this.updateRow('trips', trip.id, row)
    this.clearCache('trips')
    return result
  }

  async deleteTrip(id) {
    const result = await this.deleteRow('trips', id)
    this.clearCache('trips')
    return result
  }

  async getTimeSegments(tripId = null, skipCache = false) {
    if (!skipCache) {
      const cached = this.getCached('time_segments')
      if (cached) {
        return tripId ? cached.filter(s => s.trip_id === tripId) : cached
      }
    }
    const data = await this.fetchSheet('time_segments')
    const segments = this.parseRows(data.values, ['id', 'trip_id', 'segment_type', 'start_time', 'end_time', 'duration_minutes', 'notes'])
    this.setCache('time_segments', segments)
    return tripId ? segments.filter(s => s.trip_id === tripId) : segments
  }

  async addTimeSegment(segment) {
    const row = [segment.id || this.generateId(), segment.trip_id, segment.segment_type, segment.start_time || '', segment.end_time || '', segment.duration_minutes, segment.notes || '']
    const result = await this.appendRow('time_segments', row)
    this.clearCache('time_segments')
    return result
  }

  async getFlights(skipCache = false) {
    if (!skipCache) {
      const cached = this.getCached('flights')
      if (cached) return cached
    }
    const data = await this.fetchSheet('flights')
    const flights = this.parseRows(data.values, ['id', 'trip_id', 'airline', 'flight_number', 'route', 'departure_time', 'scheduled_arrival', 'actual_arrival', 'cash_price', 'miles_used', 'fees', 'booking_lead_days', 'status', 'delay_minutes', 'notes'])
    this.setCache('flights', flights)
    return flights
  }

  async addFlight(flight) {
    const row = [flight.id || this.generateId(), flight.trip_id || '', flight.airline, flight.flight_number || '', flight.route, flight.departure_time, flight.scheduled_arrival || '', flight.actual_arrival || '', flight.cash_price || '', flight.miles_used || '', flight.fees || '', flight.booking_lead_days || '', flight.status || 'scheduled', flight.delay_minutes || '', flight.notes || '']
    const result = await this.appendRow('flights', row)
    this.clearCache('flights')
    return result
  }

  async updateFlight(flight) {
    const row = [flight.id, flight.trip_id || '', flight.airline, flight.flight_number || '', flight.route, flight.departure_time, flight.scheduled_arrival || '', flight.actual_arrival || '', flight.cash_price || '', flight.miles_used || '', flight.fees || '', flight.booking_lead_days || '', flight.status || 'scheduled', flight.delay_minutes || '', flight.notes || '']
    const result = await this.updateRow('flights', flight.id, row)
    this.clearCache('flights')
    return result
  }

  async deleteFlight(id) {
    const result = await this.deleteRow('flights', id)
    this.clearCache('flights')
    return result
  }

  parseRows(values, headers) {
    if (!values || values.length < 2) return []
    return values.slice(1).map(row => {
      const obj = {}
      headers.forEach((header, i) => { obj[header] = row[i] || '' })
      return obj
    })
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const sheetsService = new SheetsService()
export default sheetsService
