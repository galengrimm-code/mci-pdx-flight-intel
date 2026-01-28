import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import sheetsService from '../services/sheets'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTrips: 0, avgLeadTime: 0, avgMilesValue: 0, lastTrip: null, mciAvgTime: 0, pdxAvgTime: 0 })
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    const isConfigured = sheetsService.isConfigured()
    setConfigured(isConfigured)
    if (isConfigured) loadStats()
    else setLoading(false)
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      const [trips, flights] = await Promise.all([
        sheetsService.getTrips().catch(() => []),
        sheetsService.getFlights().catch(() => [])
      ])
      const totalTrips = trips.length
      const tripTimes = trips.filter(t => t.total_time).map(t => parseFloat(t.total_time))
      const avgLeadTime = tripTimes.length > 0 ? Math.round(tripTimes.reduce((a, b) => a + b, 0) / tripTimes.length) : 0

      // Calculate MCI and PDX averages separately
      const mciTrips = trips.filter(t => t.direction === 'MCI' && t.total_time).map(t => parseFloat(t.total_time))
      const pdxTrips = trips.filter(t => t.direction === 'PDX' && t.total_time).map(t => parseFloat(t.total_time))
      const mciAvgTime = mciTrips.length > 0 ? Math.round(mciTrips.reduce((a, b) => a + b, 0) / mciTrips.length) : 0
      const pdxAvgTime = pdxTrips.length > 0 ? Math.round(pdxTrips.reduce((a, b) => a + b, 0) / pdxTrips.length) : 0

      const milesFlights = flights.filter(f => f.miles_used && f.cash_price)
      const milesValues = milesFlights.map(f => ((parseFloat(f.cash_price) - parseFloat(f.fees || 0)) / parseFloat(f.miles_used)) * 100)
      const avgMilesValue = milesValues.length > 0 ? (milesValues.reduce((a, b) => a + b, 0) / milesValues.length).toFixed(2) : 0
      const lastTrip = trips.length > 0 ? trips[trips.length - 1] : null
      setStats({ totalTrips, avgLeadTime, avgMilesValue, lastTrip, mciAvgTime, pdxAvgTime })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { path: '/trip', icon: '⏱', label: 'Log Trip Time', color: 'cyan' },
    { path: '/flight', icon: '✈', label: 'Add Flight', color: 'amber' },
    { path: '/miles', icon: '◎', label: 'Miles Calculator', color: 'blue' },
    { path: '/analytics', icon: '◩', label: 'View Analytics', color: 'purple' },
  ]

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={styles.route}>
          <span className={styles.airport}>MCI</span>
          <span className={styles.arrow}>⇄</span>
          <span className={styles.airport}>PDX</span>
        </motion.div>
        <p className={styles.subtitle}>Flight Intelligence</p>
      </header>

      {!configured && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.setupBanner}>
          <span className={styles.setupIcon}>⚙</span>
          <div>
            <strong>Setup Required</strong>
            <p>Connect your Google Sheet to get started</p>
          </div>
          <Link to="/settings" className={styles.setupLink}>Setup</Link>
        </motion.div>
      )}

      {configured && (
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{loading ? '—' : stats.totalTrips}</span>
            <span className={styles.statLabel}>Total Trips</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.mci}`}>{loading ? '—' : `${stats.mciAvgTime}m`}</span>
            <span className={styles.statLabel}>MCI Avg Time</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.pdx}`}>{loading ? '—' : `${stats.pdxAvgTime}m`}</span>
            <span className={styles.statLabel}>PDX Avg Time</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.accent}`}>{loading ? '—' : `${stats.avgMilesValue}¢`}</span>
            <span className={styles.statLabel}>Avg Miles Value</span>
          </div>
        </section>
      )}

      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path} className={`${styles.actionCard} ${styles[action.color]}`}>
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionLabel}>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
