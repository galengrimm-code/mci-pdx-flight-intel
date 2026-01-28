import React, { useState } from 'react'
import { motion } from 'framer-motion'
import sheetsService from '../services/sheets'
import styles from './FlightEntry.module.css'

const AIRLINES = ['Alaska', 'Southwest', 'Delta', 'United', 'American', 'Frontier', 'Spirit']
const ROUTES = ['MCI to PDX', 'PDX to MCI']

export default function FlightEntry() {
  const [formData, setFormData] = useState({
    airline: '', route: ROUTES[0], departureDate: '', departureTime: '',
    cashPrice: '', milesUsed: '', fees: '', milesEquivalent: '', cashEquivalent: '', bookingLeadDays: '', notes: '', tickets: '1'
  })
  const [paymentType, setPaymentType] = useState('cash')
  const [tripType, setTripType] = useState('one-way')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      const notesWithComparison = [tripType, ticketsNote, perTicketNote, comparisonNote, formData.notes].filter(Boolean).join(' | ')
      await sheetsService.addFlight({
        airline: formData.airline, flight_number: '', route: formData.route,
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
    setFormData({ airline: '', route: ROUTES[0], departureDate: '', departureTime: '', cashPrice: '', milesUsed: '', fees: '', milesEquivalent: '', cashEquivalent: '', bookingLeadDays: '', notes: '', tickets: '1' })
    setPaymentType('cash')
    setTripType('one-way')
    setSaved(false)
  }

  const isValid = formData.airline && formData.route && formData.departureDate && formData.tickets && (paymentType === 'cash' ? formData.cashPrice : formData.milesUsed)

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
        <h1>Add Flight</h1>
        <p>Record a flight booking</p>
      </header>

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
          <div className={styles.ticketSelector}>
            {[1, 2, 3, 4].map(num => (
              <button key={num} type="button" className={`${styles.ticketButton} ${parseInt(formData.tickets) === num ? styles.active : ''}`} onClick={() => handleChange('tickets', num.toString())}>{num}</button>
            ))}
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
    </div>
  )
}
