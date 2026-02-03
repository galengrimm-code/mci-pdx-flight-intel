import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import sheetsService from '../services/sheets'
import styles from './Analytics.module.css'

const SEGMENT_LABELS = {
  'house_to_airport': 'House to Airport',
  'terminal_to_parking': 'Terminal to Parking',
  'parking_to_security': 'Parking/Rental to Curb',
  'security_to_gate': 'Curb to Gate',
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ trips: [], segments: [], flights: [] })
  const [activeTab, setActiveTab] = useState('time')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [trips, segments, flights] = await Promise.all([
        sheetsService.getTrips().catch(() => []),
        sheetsService.getTimeSegments().catch(() => []),
        sheetsService.getFlights().catch(() => [])
      ])
      setData({ trips, segments, flights })
    } finally {
      setLoading(false)
    }
  }

  const tripTimeStats = useMemo(() => {
    const calcStats = (trips) => {
      const times = trips.map(t => parseFloat(t.total_time)).filter(t => !isNaN(t))
      if (times.length === 0) return null
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const sorted = [...times].sort((a, b) => a - b)
      return { avg, min: sorted[0], max: sorted[sorted.length - 1], count: times.length }
    }
    const mciTrips = data.trips.filter(t => t.direction === 'MCI')
    const pdxTrips = data.trips.filter(t => t.direction === 'PDX')
    return {
      mci: calcStats(mciTrips),
      pdx: calcStats(pdxTrips)
    }
  }, [data.trips])

  const segmentStatsByAirport = useMemo(() => {
    const calcSegmentStats = (trips) => {
      const tripIds = new Set(trips.map(t => t.id))
      const relevantSegments = data.segments.filter(s => tripIds.has(s.trip_id))
      const byType = {}
      relevantSegments.forEach(seg => {
        const type = seg.segment_type
        if (!byType[type]) byType[type] = []
        const mins = parseFloat(seg.duration_minutes)
        if (!isNaN(mins)) byType[type].push(mins)
      })
      return Object.entries(byType).map(([type, times]) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        const sorted = [...times].sort((a, b) => a - b)
        return { type, avg, min: sorted[0], max: sorted[sorted.length - 1], count: times.length }
      })
    }
    const mciTrips = data.trips.filter(t => t.direction === 'MCI')
    const pdxTrips = data.trips.filter(t => t.direction === 'PDX')
    return {
      mci: calcSegmentStats(mciTrips),
      pdx: calcSegmentStats(pdxTrips)
    }
  }, [data.trips, data.segments])

  const flightStats = useMemo(() => {
    const cashFlights = data.flights.filter(f => f.cash_price)
    const cashPrices = cashFlights.map(f => parseFloat(f.cash_price)).filter(p => !isNaN(p))
    const avgCash = cashPrices.length > 0 ? cashPrices.reduce((a, b) => a + b, 0) / cashPrices.length : 0
    const sortedCash = [...cashPrices].sort((a, b) => a - b)
    return {
      totalFlights: data.flights.length,
      cashFlights: cashFlights.length,
      milesFlights: data.flights.filter(f => f.miles_used).length,
      avgCash,
      p25: sortedCash[Math.floor(sortedCash.length * 0.25)] || 0,
      p50: sortedCash[Math.floor(sortedCash.length * 0.5)] || 0
    }
  }, [data.flights])

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading analytics...</div></div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analytics</h1>
        <p>Your travel patterns</p>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'time' ? styles.active : ''}`} onClick={() => setActiveTab('time')}>Time</button>
        <button className={`${styles.tab} ${activeTab === 'flights' ? styles.active : ''}`} onClick={() => setActiveTab('flights')}>Flights</button>
      </div>

      {activeTab === 'time' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
          <div className={styles.airportCards}>
            {tripTimeStats.mci && (
              <div className={`${styles.summaryCard} ${styles.mciCard}`}>
                <h3 className={styles.mciHeader}>MCI</h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.mci.avg.toFixed(0)}</span><span className={styles.summaryLabel}>Avg (min)</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.mci.min.toFixed(0)}</span><span className={styles.summaryLabel}>Best</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.mci.max.toFixed(0)}</span><span className={styles.summaryLabel}>Worst</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.mci.count}</span><span className={styles.summaryLabel}>Trips</span></div>
                </div>
              </div>
            )}
            {tripTimeStats.pdx && (
              <div className={`${styles.summaryCard} ${styles.pdxCard}`}>
                <h3 className={styles.pdxHeader}>PDX</h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.pdx.avg.toFixed(0)}</span><span className={styles.summaryLabel}>Avg (min)</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.pdx.min.toFixed(0)}</span><span className={styles.summaryLabel}>Best</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.pdx.max.toFixed(0)}</span><span className={styles.summaryLabel}>Worst</span></div>
                  <div className={styles.summaryItem}><span className={styles.summaryValue}>{tripTimeStats.pdx.count}</span><span className={styles.summaryLabel}>Trips</span></div>
                </div>
              </div>
            )}
          </div>

          {(!tripTimeStats.mci && !tripTimeStats.pdx) && (
            <div className={styles.empty}>No trip data yet. Start logging trips!</div>
          )}

          {(segmentStatsByAirport.mci.length > 0 || segmentStatsByAirport.pdx.length > 0) && (
            <>
              {segmentStatsByAirport.mci.length > 0 && (
                <>
                  <h3 className={`${styles.sectionTitle} ${styles.mciHeader}`}>MCI Segments</h3>
                  <div className={styles.segmentList}>
                    {segmentStatsByAirport.mci.map(stat => (
                      <div key={stat.type} className={`${styles.segmentCard} ${styles.mciSegment}`}>
                        <div className={styles.segmentHeader}>
                          <span className={styles.segmentType}>{SEGMENT_LABELS[stat.type] || stat.type.replace(/_/g, ' ')}</span>
                          <span className={styles.segmentCount}>{stat.count} samples</span>
                        </div>
                        <div className={styles.segmentStats}>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.avg.toFixed(1)}</span><span className={styles.statLabel}>avg</span></div>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.min.toFixed(1)}</span><span className={styles.statLabel}>min</span></div>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.max.toFixed(1)}</span><span className={styles.statLabel}>max</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {segmentStatsByAirport.pdx.length > 0 && (
                <>
                  <h3 className={`${styles.sectionTitle} ${styles.pdxHeader}`}>PDX Segments</h3>
                  <div className={styles.segmentList}>
                    {segmentStatsByAirport.pdx.map(stat => (
                      <div key={stat.type} className={`${styles.segmentCard} ${styles.pdxSegment}`}>
                        <div className={styles.segmentHeader}>
                          <span className={styles.segmentType}>{SEGMENT_LABELS[stat.type] || stat.type.replace(/_/g, ' ')}</span>
                          <span className={styles.segmentCount}>{stat.count} samples</span>
                        </div>
                        <div className={styles.segmentStats}>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.avg.toFixed(1)}</span><span className={styles.statLabel}>avg</span></div>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.min.toFixed(1)}</span><span className={styles.statLabel}>min</span></div>
                          <div className={styles.segmentStat}><span className={styles.statValue}>{stat.max.toFixed(1)}</span><span className={styles.statLabel}>max</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'flights' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabContent}>
          <div className={styles.summaryCard}>
            <h3>Flight Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}><span className={styles.summaryValue}>{flightStats.totalFlights}</span><span className={styles.summaryLabel}>Total</span></div>
              <div className={styles.summaryItem}><span className={styles.summaryValue}>{flightStats.cashFlights}</span><span className={styles.summaryLabel}>Cash</span></div>
              <div className={styles.summaryItem}><span className={styles.summaryValue}>{flightStats.milesFlights}</span><span className={styles.summaryLabel}>Miles</span></div>
            </div>
          </div>
          {flightStats.avgCash > 0 && (
            <div className={styles.priceCard}>
              <h3>Cash Price Analysis</h3>
              <div className={styles.priceGrid}>
                <div className={styles.priceItem}><span className={styles.priceLabel}>Average</span><span className={styles.priceValue}>${flightStats.avgCash.toFixed(0)}</span></div>
                <div className={styles.priceItem}><span className={styles.priceLabel}>25th %ile</span><span className={styles.priceValue}>${flightStats.p25.toFixed(0)}</span></div>
              </div>
              <p className={styles.insight}>Flights under ${flightStats.p25.toFixed(0)} are a good deal.</p>
            </div>
          )}
          {flightStats.totalFlights === 0 && <div className={styles.empty}>No flight data yet. Start adding flights!</div>}
        </motion.div>
      )}
    </div>
  )
}
