import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import sheetsService from '../services/sheets'
import styles from './Settings.module.css'

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setApiUrl(sheetsService.getApiUrl())
  }, [])

  const handleSave = () => {
    sheetsService.setApiUrl(apiUrl.trim())
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      sheetsService.setApiUrl(apiUrl.trim())
      await sheetsService.getTrips()
      setTestResult({ success: true, message: 'Connected successfully!' })
    } catch (error) {
      setTestResult({ success: false, message: error.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Configure your app</p>
      </header>

      <section className={styles.section}>
        <h2>Google Sheets Connection</h2>
        <div className={styles.field}>
          <label className={styles.label}>Apps Script URL</label>
          <textarea
            placeholder="https://script.google.com/macros/s/xxx/exec"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className={styles.textarea}
            rows={3}
          />
          <p className={styles.hint}>Paste the Web app URL from your Google Apps Script deployment</p>
        </div>

        <div className={styles.buttons}>
          <button onClick={handleTest} disabled={!apiUrl || testing} className={styles.secondaryButton}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={!apiUrl} className={styles.primaryButton}>
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {testResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`${styles.testResult} ${testResult.success ? styles.success : styles.error}`}>
            {testResult.success ? '✓' : '✗'} {testResult.message}
          </motion.div>
        )}
      </section>

      <section className={styles.section}>
        <h2>Setup Instructions</h2>
        <ol className={styles.instructions}>
          <li>Create a new Google Sheet</li>
          <li>Go to Extensions then Apps Script</li>
          <li>Delete any existing code</li>
          <li>Paste the code from GOOGLE_APPS_SCRIPT.js</li>
          <li>Click Run then setupSheet to create tabs</li>
          <li>Click Deploy then New deployment</li>
          <li>Type: Web app</li>
          <li>Execute as: Me</li>
          <li>Who has access: Anyone</li>
          <li>Click Deploy and copy the URL</li>
          <li>Paste the URL above and save</li>
        </ol>
      </section>
    </div>
  )
}
