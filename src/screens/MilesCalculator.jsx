import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import styles from './MilesCalculator.module.css'

export default function MilesCalculator() {
  const [cashPrice, setCashPrice] = useState('')
  const [milesRequired, setMilesRequired] = useState('')
  const [fees, setFees] = useState('')

  const calculation = useMemo(() => {
    const cash = parseFloat(cashPrice) || 0
    const miles = parseFloat(milesRequired) || 0
    const feeAmount = parseFloat(fees) || 0
    if (miles === 0) return null

    const cashValue = cash - feeAmount
    const centsPerMile = (cashValue / miles) * 100
    const dollarsPerThousand = cashValue / (miles / 1000)

    let rating, ratingColor
    if (centsPerMile >= 2) { rating = 'Excellent'; ratingColor = 'cyan' }
    else if (centsPerMile >= 1.5) { rating = 'Good'; ratingColor = 'amber' }
    else if (centsPerMile >= 1) { rating = 'Fair'; ratingColor = 'blue' }
    else { rating = 'Poor'; ratingColor = 'red' }

    return { centsPerMile: centsPerMile.toFixed(2), dollarsPerThousand: dollarsPerThousand.toFixed(2), rating, ratingColor, netCashValue: cashValue.toFixed(2) }
  }, [cashPrice, milesRequired, fees])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Miles Calculator</h1>
        <p>Evaluate your redemption value</p>
      </header>

      <div className={styles.calculator}>
        <div className={styles.field}>
          <label className={styles.label}>Cash Price (same flight)</label>
          <div className={styles.inputWithPrefix}>
            <span className={styles.prefix}>$</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} className={styles.input} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Miles Required</label>
          <input type="number" inputMode="numeric" placeholder="0" value={milesRequired} onChange={(e) => setMilesRequired(e.target.value)} className={styles.input} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Taxes and Fees</label>
          <div className={styles.inputWithPrefix}>
            <span className={styles.prefix}>$</span>
            <input type="number" inputMode="decimal" placeholder="5.60" value={fees} onChange={(e) => setFees(e.target.value)} className={styles.input} />
          </div>
        </div>
      </div>

      {calculation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.results}>
          <div className={`${styles.ratingBadge} ${styles[calculation.ratingColor]}`}>{calculation.rating} Redemption</div>
          <div className={styles.mainValue}>
            <span className={styles.valueNumber}>{calculation.centsPerMile}</span>
            <span className={styles.valueUnit}>cents/mile</span>
          </div>
          <div className={styles.breakdown}>
            <div className={styles.breakdownRow}>
              <span>Per 1,000 miles</span>
              <span className={styles.breakdownValue}>${calculation.dollarsPerThousand}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>Net cash value</span>
              <span className={styles.breakdownValue}>${calculation.netCashValue}</span>
            </div>
          </div>
          <div className={styles.thresholds}>
            <div className={`${styles.threshold} ${styles.cyan}`}><span>2.0+</span><span>Excellent</span></div>
            <div className={`${styles.threshold} ${styles.amber}`}><span>1.5-2.0</span><span>Good</span></div>
            <div className={`${styles.threshold} ${styles.blue}`}><span>1.0-1.5</span><span>Fair</span></div>
            <div className={`${styles.threshold} ${styles.red}`}><span>Under 1.0</span><span>Poor</span></div>
          </div>
        </motion.div>
      )}

      {!calculation && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>◎</span>
          <p>Enter values above to calculate your miles value</p>
        </div>
      )}
    </div>
  )
}
