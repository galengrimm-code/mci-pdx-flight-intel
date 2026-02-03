import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStopwatch } from '../hooks/useStopwatch'
import sheetsService from '../services/sheets'
import styles from './TripLogger.module.css'

const SEGMENTS = [
  { id: 'house_to_airport', label: 'House to Airport', icon: '🏠' },
  { id: 'terminal_to_parking', label: 'Terminal to Parking', icon: '🅿️' },
  { id: 'parking_to_security', label: 'Parking/Rental to Security', icon: '🚶' },
  { id: 'security_to_gate', label: 'Security to Gate', icon: '🔒' },
]

const PRIMARY_AIRPORTS = ['MCI', 'PDX']
const SECONDARY_AIRPORTS = ['PHX', 'MCO']
const ALL_AIRPORTS = [...PRIMARY_AIRPORTS, ...SECONDARY_AIRPORTS]

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  // Handle both "2025-07-15" and "2025-07-15T05:00:00.000Z" formats
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const date = new Date(dateOnly + 'T12:00:00')
  if (isNaN(date)) return dateStr
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`
}

export default function TripLogger() {
  const navigate = useNavigate()
  const [view, setView] = useState('log') // 'log' or 'history'
  const [mode, setMode] = useState('stopwatch')
  const [direction, setDirection] = useState(PRIMARY_AIRPORTS[0])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [completedSegments, setCompletedSegments] = useState([])
  const [tripStarted, setTripStarted] = useState(false)
  const [saving, setSaving] = useState(false)
  const stopwatch = useStopwatch()
  const [manualTimes, setManualTimes] = useState(SEGMENTS.reduce((acc, seg) => ({ ...acc, [seg.id]: { hours: '', minutes: '' } }), {}))
  const [departureTime, setDepartureTime] = useState('')
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0])
  const [sheetError, setSheetError] = useState(null)

  // History state
  const [trips, setTrips] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const currentSegment = SEGMENTS[currentSegmentIndex]
  const isLastSegment = currentSegmentIndex === SEGMENTS.length - 1
  const allSegmentsComplete = currentSegmentIndex >= SEGMENTS.length

  const handleStartTrip = () => {
    setTripStarted(true)
    if (mode === 'stopwatch') stopwatch.start()
  }

  const handleNextSegment = () => {
    if (mode === 'stopwatch') {
      const timing = stopwatch.stop()
      if (!timing) return
      setCompletedSegments(prev => [...prev, { ...currentSegment, ...timing }])
      if (!isLastSegment) {
        setCurrentSegmentIndex(prev => prev + 1)
        stopwatch.reset()
        setTimeout(() => stopwatch.start(), 100)
      } else {
        setCurrentSegmentIndex(prev => prev + 1)
      }
    }
  }

  const getManualMinutes = (segId) => {
    const time = manualTimes[segId]
    return (parseFloat(time.hours) || 0) * 60 + (parseFloat(time.minutes) || 0)
  }

  const handleSaveTrip = async () => {
    if (!sheetsService.isConfigured()) {
      setSheetError('Google Sheet not connected. Please configure in Settings.')
      return
    }
    setSheetError(null)
    setSaving(true)
    try {
      const tripId = sheetsService.generateId()
      const selectedDate = new Date(tripDate + 'T12:00:00')
      const dateStr = tripDate
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
      const segments = mode === 'stopwatch' ? completedSegments : SEGMENTS.map(seg => ({ ...seg, durationMinutes: getManualMinutes(seg.id) })).filter(seg => seg.durationMinutes > 0)
      const totalTime = segments.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0)

      await sheetsService.addTrip({ id: tripId, date: dateStr, direction, flight_time: departureTime, day_of_week: dayOfWeek, notes: '', total_time: totalTime.toFixed(1) })
      for (const segment of segments) {
        await sheetsService.addTimeSegment({ trip_id: tripId, segment_type: segment.id, start_time: segment.startTime || '', end_time: segment.endTime || '', duration_minutes: segment.durationMinutes.toFixed(1), notes: '' })
      }
      navigate('/')
    } catch (error) {
      console.error('Failed to save trip:', error)
      setSheetError('Failed to save trip. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTripStarted(false)
    setCurrentSegmentIndex(0)
    setCompletedSegments([])
    setSheetError(null)
    setDepartureTime('')
    setTripDate(new Date().toISOString().split('T')[0])
    stopwatch.reset()
    setManualTimes(SEGMENTS.reduce((acc, seg) => ({ ...acc, [seg.id]: { hours: '', minutes: '' } }), {}))
  }

  // Load trips when switching to history view
  useEffect(() => {
    if (view === 'history') {
      loadTrips()
    }
  }, [view])

  const loadTrips = async () => {
    if (!sheetsService.isConfigured()) {
      setSheetError('Google Sheet not connected. Please configure in Settings.')
      return
    }
    setLoadingTrips(true)
    try {
      const data = await sheetsService.getTrips()
      // Sort by date descending
      data.sort((a, b) => new Date(b.date) - new Date(a.date))
      setTrips(data)
    } catch (error) {
      console.error('Failed to load trips:', error)
      setSheetError('Failed to load trips')
    } finally {
      setLoadingTrips(false)
    }
  }

  const handleEditTrip = (trip) => {
    setEditingTrip(trip.id)
    setEditForm({
      date: trip.date,
      direction: trip.direction,
      flight_time: trip.flight_time,
      total_time: trip.total_time,
      notes: trip.notes || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingTrip(null)
    setEditForm({})
  }

  const handleSaveEdit = async (tripId) => {
    setSavingEdit(true)
    try {
      const selectedDate = new Date(editForm.date + 'T12:00:00')
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
      await sheetsService.updateTrip({
        id: tripId,
        date: editForm.date,
        direction: editForm.direction,
        flight_time: editForm.flight_time,
        day_of_week: dayOfWeek,
        total_time: editForm.total_time,
        notes: editForm.notes
      })
      setEditingTrip(null)
      await loadTrips()
    } catch (error) {
      console.error('Failed to update trip:', error)
      setSheetError('Failed to update trip')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Delete this trip?')) return
    try {
      await sheetsService.deleteTrip(tripId)
      await loadTrips()
    } catch (error) {
      console.error('Failed to delete trip:', error)
      setSheetError('Failed to delete trip')
    }
  }

  return (
    <div className={styles.container}>
      {sheetError && (
        <div className={styles.errorBanner}>
          <span>⚠️</span>
          <span>{sheetError}</span>
          <button onClick={() => setSheetError(null)}>✕</button>
        </div>
      )}
      <header className={styles.header}>
        <h1>Trip Logger</h1>
        <p>Track your door-to-gate time</p>
      </header>

      <div className={styles.viewToggle}>
        <button className={`${styles.viewButton} ${view === 'log' ? styles.active : ''}`} onClick={() => setView('log')} disabled={tripStarted}>➕ Log Trip</button>
        <button className={`${styles.viewButton} ${view === 'history' ? styles.active : ''}`} onClick={() => setView('history')} disabled={tripStarted}>📋 History</button>
      </div>

      {view === 'history' ? (
        <div className={styles.historyView}>
          {loadingTrips ? (
            <div className={styles.loading}>Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className={styles.emptyState}>No trips recorded yet</div>
          ) : (
            <div className={styles.tripsList}>
              {trips.map(trip => (
                <div key={trip.id} className={styles.tripCard}>
                  {editingTrip === trip.id ? (
                    <div className={styles.editForm}>
                      <div className={styles.editRow}>
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={styles.editInput} />
                        <select value={editForm.direction} onChange={(e) => setEditForm({ ...editForm, direction: e.target.value })} className={styles.editSelect}>
                          {ALL_AIRPORTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className={styles.editRow}>
                        <input type="time" value={editForm.flight_time} onChange={(e) => setEditForm({ ...editForm, flight_time: e.target.value })} className={styles.editInput} placeholder="Flight time" />
                        <input type="number" value={editForm.total_time} onChange={(e) => setEditForm({ ...editForm, total_time: e.target.value })} className={styles.editInput} placeholder="Total min" />
                      </div>
                      <input type="text" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={styles.editInput} placeholder="Notes" style={{ width: '100%' }} />
                      <div className={styles.editActions}>
                        <button onClick={handleCancelEdit} className={styles.cancelButton}>Cancel</button>
                        <button onClick={() => handleSaveEdit(trip.id)} disabled={savingEdit} className={styles.saveButton}>{savingEdit ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.tripHeader}>
                        <span className={styles.tripDate}>{formatDate(trip.date)}</span>
                        <span className={`${styles.tripDirection} ${styles[trip.direction?.toLowerCase()]}`}>{trip.direction}</span>
                      </div>
                      <div className={styles.tripDetails}>
                        <span>✈️ {trip.flight_time || '—'}</span>
                        <span>⏱ {trip.total_time} min</span>
                        <span>{trip.day_of_week}</span>
                      </div>
                      {trip.notes && <div className={styles.tripNotes}>{trip.notes}</div>}
                      <div className={styles.tripActions}>
                        <button onClick={() => handleEditTrip(trip)} className={styles.editButton}>Edit</button>
                        <button onClick={() => handleDeleteTrip(trip.id)} className={styles.deleteButton}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.modeToggle}>
            <button className={`${styles.modeButton} ${mode === 'stopwatch' ? styles.active : ''}`} onClick={() => setMode('stopwatch')} disabled={tripStarted}>⏱ Stopwatch</button>
            <button className={`${styles.modeButton} ${mode === 'manual' ? styles.active : ''}`} onClick={() => setMode('manual')} disabled={tripStarted}>✏️ Manual</button>
          </div>

      <div className={styles.airportSelector}>
        <div className={styles.primaryAirports}>
          {PRIMARY_AIRPORTS.map(dir => (
            <button key={dir} className={`${styles.directionButton} ${styles[dir.toLowerCase()]} ${direction === dir ? styles.active : ''}`} onClick={() => setDirection(dir)} disabled={tripStarted}>{dir}</button>
          ))}
        </div>
        <div className={styles.secondaryAirports}>
          {SECONDARY_AIRPORTS.map(dir => (
            <button key={dir} className={`${styles.directionButton} ${styles.secondary} ${direction === dir ? styles.active : ''}`} onClick={() => setDirection(dir)} disabled={tripStarted}>{dir}</button>
          ))}
        </div>
      </div>

      <div className={styles.dateSelector}>
        <label className={styles.dateLabel}>📅 Trip Date</label>
        <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className={styles.dateInput} disabled={tripStarted} />
      </div>

      {mode === 'stopwatch' ? (
        <div className={styles.stopwatchMode}>
          {!tripStarted ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleStartTrip} className={styles.startButton}>Start Trip</motion.button>
          ) : (
            <>
              <div className={styles.segmentsList}>
                <AnimatePresence>
                  {completedSegments.map((seg, i) => (
                    <motion.div key={seg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={styles.completedSegment}>
                      <span className={styles.segmentIcon}>{SEGMENTS[i].icon}</span>
                      <span className={styles.segmentLabel}>{SEGMENTS[i].label}</span>
                      <span className={styles.segmentTime}>{seg.durationMinutes.toFixed(1)}m</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {!allSegmentsComplete && (
                <motion.div key={currentSegment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.currentSegment}>
                  <div className={styles.segmentHeader}>
                    <span className={styles.currentIcon}>{currentSegment.icon}</span>
                    <span className={styles.currentLabel}>{currentSegment.label}</span>
                  </div>
                  <div className={styles.stopwatchDisplay}>
                    <span className={`${styles.time} ${stopwatch.isRunning ? styles.running : ''}`}>{stopwatch.formatTime()}</span>
                  </div>
                  <button onClick={handleNextSegment} className={styles.nextButton}>{isLastSegment ? 'Complete Trip' : 'Next Segment'}</button>
                </motion.div>
              )}

              {allSegmentsComplete && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.tripComplete}>
                  <h2>Trip Complete!</h2>
                  <div className={styles.totalTime}>
                    <span className={styles.totalLabel}>Total Time</span>
                    <span className={styles.totalValue}>{completedSegments.reduce((sum, seg) => sum + seg.durationMinutes, 0).toFixed(1)} min</span>
                  </div>
                  <div className={styles.departureTimeField}>
                    <label className={styles.departureLabel}>✈️ Flight Departure Time</label>
                    <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className={styles.departureInput} />
                  </div>
                  <div className={styles.actionButtons}>
                    <button onClick={handleSaveTrip} disabled={saving} className={styles.primaryButton}>{saving ? 'Saving...' : 'Save Trip'}</button>
                    <button onClick={handleReset} className={styles.secondaryButton}>Discard</button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={styles.manualMode}>
          <div className={styles.manualSegments}>
            {SEGMENTS.map(segment => (
              <div key={segment.id} className={styles.manualSegment}>
                <div className={styles.manualSegmentLabel}>
                  <span>{segment.icon}</span>
                  <span>{segment.label}</span>
                </div>
                <div className={styles.manualInputGroup}>
                  <div className={styles.manualInput}>
                    <input type="number" inputMode="numeric" placeholder="0" value={manualTimes[segment.id].hours} onChange={(e) => setManualTimes(prev => ({ ...prev, [segment.id]: { ...prev[segment.id], hours: e.target.value } }))} />
                    <span className={styles.inputSuffix}>hr</span>
                  </div>
                  <div className={styles.manualInput}>
                    <input type="number" inputMode="numeric" placeholder="0" value={manualTimes[segment.id].minutes} onChange={(e) => setManualTimes(prev => ({ ...prev, [segment.id]: { ...prev[segment.id], minutes: e.target.value } }))} />
                    <span className={styles.inputSuffix}>min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.departureTimeField}>
            <label className={styles.departureLabel}>✈️ Flight Departure Time</label>
            <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className={styles.departureInput} />
          </div>
          <div className={styles.manualTotal}>
            <span>Total</span>
            <span className={styles.manualTotalValue}>{Object.keys(manualTimes).reduce((sum, segId) => sum + getManualMinutes(segId), 0).toFixed(1)} min</span>
          </div>
          <button onClick={handleSaveTrip} disabled={saving || Object.values(manualTimes).every(v => !v.hours && !v.minutes)} className={styles.primaryButton}>{saving ? 'Saving...' : 'Save Trip'}</button>
        </div>
      )}
        </>
      )}
    </div>
  )
}
