import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStopwatch } from '../hooks/useStopwatch'
import sheetsService from '../services/sheets'
import styles from './TripLogger.module.css'

const SEGMENTS = [
  { id: 'house_to_airport', label: 'House to Airport', icon: '🏠' },
  { id: 'terminal_to_parking', label: 'Terminal to Parking', icon: '🅿️' },
  { id: 'parking_to_security', label: 'Parking to Security', icon: '🚶' },
  { id: 'security_to_gate', label: 'Security to Gate', icon: '🔒' },
  { id: 'boarding_buffer', label: 'Boarding Buffer', icon: '⏳' },
]

const DIRECTIONS = ['MCI', 'PDX']

export default function TripLogger() {
  const [mode, setMode] = useState('stopwatch')
  const [direction, setDirection] = useState(DIRECTIONS[0])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [completedSegments, setCompletedSegments] = useState([])
  const [tripStarted, setTripStarted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const stopwatch = useStopwatch()
  const [manualTimes, setManualTimes] = useState(SEGMENTS.reduce((acc, seg) => ({ ...acc, [seg.id]: { hours: '', minutes: '' } }), {}))
  const [sheetError, setSheetError] = useState(null)

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
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]
      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })
      const segments = mode === 'stopwatch' ? completedSegments : SEGMENTS.map(seg => ({ ...seg, durationMinutes: getManualMinutes(seg.id) })).filter(seg => seg.durationMinutes > 0)
      const totalTime = segments.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0)

      await sheetsService.addTrip({ id: tripId, date: dateStr, direction, flight_time: '', day_of_week: dayOfWeek, notes: '', total_time: totalTime.toFixed(1) })
      for (const segment of segments) {
        await sheetsService.addTimeSegment({ trip_id: tripId, segment_type: segment.id, start_time: segment.startTime || '', end_time: segment.endTime || '', duration_minutes: segment.durationMinutes.toFixed(1), notes: '' })
      }
      setSaved(true)
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
    setSaved(false)
    setSheetError(null)
    stopwatch.reset()
    setManualTimes(SEGMENTS.reduce((acc, seg) => ({ ...acc, [seg.id]: { hours: '', minutes: '' } }), {}))
  }

  if (saved) {
    return (
      <div className={styles.container}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.successCard}>
          <span className={styles.successIcon}>✓</span>
          <h2>Trip Saved!</h2>
          <p>Your trip data has been recorded.</p>
          <button onClick={handleReset} className={styles.primaryButton}>Log Another Trip</button>
        </motion.div>
      </div>
    )
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

      <div className={styles.modeToggle}>
        <button className={`${styles.modeButton} ${mode === 'stopwatch' ? styles.active : ''}`} onClick={() => setMode('stopwatch')} disabled={tripStarted}>⏱ Stopwatch</button>
        <button className={`${styles.modeButton} ${mode === 'manual' ? styles.active : ''}`} onClick={() => setMode('manual')} disabled={tripStarted}>✏️ Manual</button>
      </div>

      <div className={styles.directionSelector}>
        {DIRECTIONS.map(dir => (
          <button key={dir} className={`${styles.directionButton} ${direction === dir ? styles.active : ''}`} onClick={() => setDirection(dir)} disabled={tripStarted}>{dir}</button>
        ))}
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
          <div className={styles.manualTotal}>
            <span>Total</span>
            <span className={styles.manualTotalValue}>{Object.keys(manualTimes).reduce((sum, segId) => sum + getManualMinutes(segId), 0).toFixed(1)} min</span>
          </div>
          <button onClick={handleSaveTrip} disabled={saving || Object.values(manualTimes).every(v => !v.hours && !v.minutes)} className={styles.primaryButton}>{saving ? 'Saving...' : 'Save Trip'}</button>
        </div>
      )}
    </div>
  )
}
