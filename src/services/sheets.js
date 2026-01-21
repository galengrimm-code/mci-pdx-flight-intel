const API_URL = localStorage.getItem('APPS_SCRIPT_URL') || ''

class SheetsService {
  constructor() {
    this.apiUrl = API_URL
  }

  setApiUrl(url) {
    this.apiUrl = url
    localStorage.setItem('APPS_SCRIPT_URL', url)
  }

  getApiUrl() {
    return this.apiUrl || localStorage.getItem('APPS_SCRIPT_URL') || ''
  }

  isConfigured() {
    return !!this.getApiUrl()
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
      body: JSON.stringify({ tab, rowData })
    })
    if (!response.ok) throw new Error(`Failed to append to ${tab}`)
    return await response.json()
  }

  async getTrips() {
    const data = await this.fetchSheet('trips')
    return this.parseRows(data.values, ['id', 'date', 'direction', 'flight_time', 'day_of_week', 'notes', 'total_time'])
  }

  async addTrip(trip) {
    const row = [trip.id || this.generateId(), trip.date, trip.direction, trip.flight_time, trip.day_of_week, trip.notes || '', trip.total_time || '']
    return this.appendRow('trips', row)
  }

  async getTimeSegments(tripId = null) {
    const data = await this.fetchSheet('time_segments')
    const segments = this.parseRows(data.values, ['id', 'trip_id', 'segment_type', 'start_time', 'end_time', 'duration_minutes', 'notes'])
    return tripId ? segments.filter(s => s.trip_id === tripId) : segments
  }

  async addTimeSegment(segment) {
    const row = [segment.id || this.generateId(), segment.trip_id, segment.segment_type, segment.start_time || '', segment.end_time || '', segment.duration_minutes, segment.notes || '']
    return this.appendRow('time_segments', row)
  }

  async getFlights() {
    const data = await this.fetchSheet('flights')
    return this.parseRows(data.values, ['id', 'trip_id', 'airline', 'flight_number', 'route', 'departure_time', 'scheduled_arrival', 'actual_arrival', 'cash_price', 'miles_used', 'fees', 'booking_lead_days', 'status', 'delay_minutes', 'notes'])
  }

  async addFlight(flight) {
    const row = [flight.id || this.generateId(), flight.trip_id || '', flight.airline, flight.flight_number, flight.route, flight.departure_time, flight.scheduled_arrival || '', flight.actual_arrival || '', flight.cash_price || '', flight.miles_used || '', flight.fees || '', flight.booking_lead_days || '', flight.status || 'scheduled', flight.delay_minutes || '', flight.notes || '']
    return this.appendRow('flights', row)
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
