import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import sheetsService from '../services/sheets'
import styles from './FlightEntry.module.css'

const AIRLINES = ['Alaska', 'Southwest', 'Delta', 'United', 'American', 'Frontier', 'Spirit']
const ROUTES = ['MCI to PDX', 'PDX to MCI']
const COMMON_LAYOVERS = ['SEA', 'DEN', 'PHX', 'LAX', 'SFO', 'ORD', 'DFW', 'SLC', 'MSP']

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date)) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (dateStr) => {
  if (!dateStr || !dateStr.includes('T')) return ''
  const date = new Date(dateStr)
  if (isNaN(date)) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function FlightEntry() {
  const [view, setView] = useState('add') // 'add' or 'history'
  const [formData, setFormData] = useState({
    airline: '', route: ROUTES[0], departureDate: '', departureTime: '',
    cashPrice: '', milesUsed: '', fees: '', milesEquivalent: '', cashEquivalent: '', bookingLeadDays: '', notes: '', tickets: '1', layover: ''
  })
  const [paymentType, setPaymentType] = useState('cash')
  const [tripType, setTripType] = useState('one-way')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // History state
  const [flights, setFlights] = useState([])
  const [loadingFlights, setLoadingFlights] = useState(false)
  const [editingFlight, setEditingFlight] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Calculate per-ticket price
  const ticketCount = parseInt(formData.tickets) || 1
  const perTicketCash = formData.cashPrice ? (parseFloat(formData.cashPrice) / ticketCount).toFixed(2) : null
  const perTicketMiles = formData.milesUsed ? Math.round(parseFloat(formData.milesUsed) / ticketCount) : null
  const perTicketFees = formData.fees ? (parseFloat(formData.fees) / ticketCount).toFixed(2) : null

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const departureDateTime = formData.departureDate && formData.departureTime ? `${formData.departureDate}T${formData.departureTime}` : formData.departureDate
      const comparisonNote = paymentType === 'cash'
        ? (formData.milesEquivalent ? `Miles equivalent: ${formData.milesEquivalent}` : '')
        : (formData.cashEquivalent ? `Cash equivalent: $${formData.cashEquivalent}` : '')
      const ticketsNote = ticketCount > 1 ? `${ticketCount} tickets` : ''
      const perTicketNote = ticketCount > 1 ? (paymentType === 'cash' ? `$${perTicketCash}/ticket` : `${perTicketMiles} miles/ticket`) : ''
      const layoverNote = formData.layover ? `Layover: ${formData.layover}` : ''
      const notesWithComparison = [tripType, ticketsNote, perTicketNote, layoverNote, comparisonNote, formData.notes].filter(Boolean).join(' | ')
      await sheetsService.addFlight({
        airline: formData.airline, flight_number: formData.layover || '', route: formData.route,
        departure_time: departureDateTime, cash_price: paymentType === 'cash' ? formData.cashPrice : '',
        miles_used: paymentType === 'miles' ? formData.milesUsed : '', fees: formData.fees,
        booking_lead_days: formData.bookingLeadDays, notes: notesWithComparison
      })
      setSaved(true)
    } catch (error) {
      console.error('Failed to save flight:', error)
      alert('Failed to save flight')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFormData({ airline: '', route: ROUTES[0], departureDate: '', departureTime: '', cashPrice: '', milesUsed: '', fees: '', milesEquivalent: '', cashEquivalent: '', bookingLeadDays: '', notes: '', tickets: '1', layover: '' })
    setPaymentType('cash')
    setTripType('one-way')
    setSaved(false)
  }

  const isValid = formData.airline && formData.route && formData.departureDate && formData.tickets && (paymentType === 'cash' ? formData.cashPrice : formData.milesUsed)

  // Load flights when switching to history view
  useEffect(() => {
    if (view === 'history') {
      loadFlights()
    }
  }, [view])

  const loadFlights = async () => {
    if (!sheetsService.isConfigured()) return
    setLoadingFlights(true)
    try {
      const data = await sheetsService.getFlights()
      data.sort((a, b) => new Date(b.departure_time) - new Date(a.departure_time))
      setFlights(data)
    } catch (error) {
      console.error('Failed to load flights:', error)
    } finally {
      setLoadingFlights(false)
    }
  }

  const handleEditFlight = (flight) => {
    setEditingFlight(flight.id)
    const [date, time] = (flight.departure_time || '').split('T')
    setEditForm({
      airline: flight.airline,
      route: flight.route,
      departureDate: date || '',
      departureTime: time || '',
      cashPrice: flight.cash_price,
      milesUsed: flight.miles_used,
      fees: flight.fees,
      layover: flight.flight_number || '',
      notes: flight.notes
    })
  }

  const handleCancelEdit = () => {
    setEditingFlight(null)
    setEditForm({})
  }

  const handleSaveEdit = async (flightId) => {
    setSavingEdit(true)
    try {
      const departureDateTime = editForm.departureDate && editForm.departureTime ? `${editForm.departureDate}T${editForm.departureTime}` : editForm.departureDate
      await sheetsService.updateFlight({
        id: flightId,
        airline: editForm.airline,
        flight_number: editForm.layover || '',
        route: editForm.route,
        departure_time: departureDateTime,
        cash_price: editForm.cashPrice,
        miles_used: editForm.milesUsed,
        fees: editForm.fees,
        notes: editForm.notes
      })
      setEditingFlight(null)
      await loadFlights()
    } catch (error) {
      console.error('Failed to update flight:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteFlight = async (flightId) => {
    if (!confirm('Delete this flight?')) return
    try {
      await sheetsService.deleteFlight(flightId)
      await loadFlights()
    } catch (error) {
      console.error('Failed to delete flight:', error)
    }
  }

  if (saved) {
    return (
      <div className={styles.container}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.successCard}>
          <span className={styles.successIcon}>✈</span>
          <h2>Flight Saved!</h2>
          <p>Your flight booking has been recorded.</p>
          <button onClick={handleReset} className={styles.primaryButton}>Add Another Flight</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Flights</h1>
        <p>Record and view flight bookings</p>
      </header>

      <div className={styles.viewToggle}>
        <button className={`${styles.viewButton} ${view === 'add' ? styles.active : ''}`} onClick={() => setView('add')}>➕ Add Flight</button>
        <button className={`${styles.viewButton} ${view === 'history' ? styles.active : ''}`} onClick={() => setView('history')}>📋 History</button>
      </div>

      {view === 'history' ? (
        <div className={styles.historyView}>
          {loadingFlights ? (
            <div className={styles.loading}>Loading flights...</div>
          ) : flights.length === 0 ? (
            <div className={styles.emptyState}>No flights recorded yet</div>
          ) : (
            <div className={styles.flightsList}>
              {flights.map(flight => (
                <div key={flight.id} className={`${styles.flightCard} ${flight.route?.startsWith('MCI') ? styles.mciCard : styles.pdxCard}`}>
                  {editingFlight === flight.id ? (
                    <div className={styles.editForm}>
                      <div className={styles.editRow}>
                        <select value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} className={styles.editSelect}>
                          {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={editForm.airline} onChange={(e) => setEditForm({ ...editForm, airline: e.target.value })} className={styles.editSelect}>
                          {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className={styles.editRow}>
                        <input type="date" value={editForm.departureDate} onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })} className={styles.editInput} />
                        <input type="text" value={editForm.layover} onChange={(e) => setEditForm({ ...editForm, layover: e.target.value.toUpperCase() })} className={styles.editInput} placeholder="Layover" maxLength={3} style={{ width: '80px' }} />
                      </div>
                      <div className={styles.editRow}>
                        <input type="number" value={editForm.cashPrice} onChange={(e) => setEditForm({ ...editForm, cashPrice: e.target.value })} className={styles.editInput} placeholder="Cash $" />
                        <input type="number" value={editForm.milesUsed} onChange={(e) => setEditForm({ ...editForm, milesUsed: e.target.value })} className={styles.editInput} placeholder="Miles" />
                        <input type="number" value={editForm.fees} onChange={(e) => setEditForm({ ...editForm, fees: e.target.value })} className={styles.editInput} placeholder="Fees $" />
                      </div>
                      <div className={styles.editActions}>
                        <button onClick={handleCancelEdit} className={styles.cancelButton}>Cancel</button>
                        <button onClick={() => handleSaveEdit(flight.id)} disabled={savingEdit} className={styles.saveButton}>{savingEdit ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.flightHeader}>
                        <span className={`${styles.flightRoute} ${flight.route?.startsWith('MCI') ? styles.mci : styles.pdx}`}>{flight.route}</span>
                        <span className={styles.flightAirline}>{flight.airline}</span>
                      </div>
                      <div className={styles.flightDetails}>
                        <span>📅 {formatDate(flight.departure_time)}{formatTime(flight.departure_time) && ` at ${formatTime(flight.departure_time)}`}</span>
                        {flight.flight_number && <span>✈️ via {flight.flight_number}</span>}
                        {flight.cash_price && <span>💵 ${flight.cash_price}</span>}
                        {flight.miles_used && <span>🎯 {parseInt(flight.miles_used).toLocaleString()} mi</span>}
                        {flight.fees && <span>+${flight.fees}</span>}
                      </div>
                      {flight.notes && <div className={styles.flightNotes}>{flight.notes}</div>}
                      <div className={styles.flightActions}>
                        <button onClick={() => handleEditFlight(flight)} className={styles.editButton}>Edit</button>
                        <button onClick={() => handleDeleteFlight(flight.id)} className={styles.deleteButton}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.routeSelector}>
          {ROUTES.map(route => {
            const isMci = route.startsWith('MCI')
            return (
              <button key={route} type="button" className={`${styles.routeButton} ${isMci ? styles.mci : styles.pdx} ${formData.route === route ? styles.active : ''}`} onClick={() => handleChange('route', route)}>{route}</button>
            )
          })}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Airline</label>
          <div className={styles.airlineGrid}>
            {AIRLINES.map(airline => (
              <button key={airline} type="button" className={`${styles.airlineButton} ${formData.airline === airline ? styles.active : ''}`} onClick={() => handleChange('airline', airline)}>{airline}</button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Departure Date</label>
            <input type="date" value={formData.departureDate} onChange={(e) => handleChange('departureDate', e.target.value)} className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Time</label>
            <input type="time" value={formData.departureTime} onChange={(e) => handleChange('departureTime', e.target.value)} className={styles.input} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Number of Tickets</label>
          <div className={styles.ticketTicker}>
            <button type="button" className={styles.tickerButton} onClick={() => handleChange('tickets', Math.max(1, ticketCount - 1).toString())}>−</button>
            <span className={styles.tickerValue}>{ticketCount}</span>
            <button type="button" className={styles.tickerButton} onClick={() => handleChange('tickets', Math.min(10, ticketCount + 1).toString())}>+</button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Payment</label>
          <div className={styles.paymentToggle}>
            <button type="button" className={`${styles.paymentButton} ${paymentType === 'cash' ? styles.active : ''}`} onClick={() => setPaymentType('cash')}>Cash</button>
            <button type="button" className={`${styles.paymentButton} ${paymentType === 'miles' ? styles.active : ''}`} onClick={() => setPaymentType('miles')}>Miles</button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Trip Type</label>
          <div className={styles.tripTypeToggle}>
            <button type="button" className={`${styles.tripTypeButton} ${tripType === 'one-way' ? styles.active : ''}`} onClick={() => setTripType('one-way')}>One Way</button>
            <button type="button" className={`${styles.tripTypeButton} ${tripType === 'round-trip' ? styles.active : ''}`} onClick={() => setTripType('round-trip')}>Round Trip</button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Layover (optional)</label>
          <div className={styles.layoverSelector}>
            <button type="button" className={`${styles.layoverButton} ${!formData.layover ? styles.active : ''}`} onClick={() => handleChange('layover', '')}>Direct</button>
            {COMMON_LAYOVERS.map(code => (
              <button key={code} type="button" className={`${styles.layoverButton} ${formData.layover === code ? styles.active : ''}`} onClick={() => handleChange('layover', code)}>{code}</button>
            ))}
          </div>
        </div>

        {paymentType === 'cash' ? (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Total Cash Price</label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.prefix}>$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={formData.cashPrice} onChange={(e) => handleChange('cashPrice', e.target.value)} className={styles.input} required />
              </div>
              {ticketCount > 1 && perTicketCash && (
                <div className={styles.perTicket}>${perTicketCash} per ticket</div>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Miles Equivalent (what it would cost in miles)</label>
              <input type="number" inputMode="numeric" placeholder="0" value={formData.milesEquivalent} onChange={(e) => handleChange('milesEquivalent', e.target.value)} className={styles.input} />
            </div>
          </>
        ) : (
          <>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Total Miles Used</label>
                <input type="number" inputMode="numeric" placeholder="0" value={formData.milesUsed} onChange={(e) => handleChange('milesUsed', e.target.value)} className={styles.input} required />
                {ticketCount > 1 && perTicketMiles && (
                  <div className={styles.perTicket}>{perTicketMiles.toLocaleString()} miles per ticket</div>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Total Fees</label>
                <div className={styles.inputWithPrefix}>
                  <span className={styles.prefix}>$</span>
                  <input type="number" inputMode="decimal" placeholder="5.60" value={formData.fees} onChange={(e) => handleChange('fees', e.target.value)} className={styles.input} />
                </div>
                {ticketCount > 1 && perTicketFees && (
                  <div className={styles.perTicket}>${perTicketFees} per ticket</div>
                )}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cash Equivalent (what it would cost in cash)</label>
              <div className={styles.inputWithPrefix}>
                <span className={styles.prefix}>$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={formData.cashEquivalent} onChange={(e) => handleChange('cashEquivalent', e.target.value)} className={styles.input} />
              </div>
            </div>
          </>
        )}

        <button type="submit" disabled={!isValid || saving} className={styles.primaryButton}>{saving ? 'Saving...' : 'Save Flight'}</button>
      </form>
      )}
    </div>
  )
}
