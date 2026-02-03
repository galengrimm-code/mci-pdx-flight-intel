import { useState, useRef, useCallback, useEffect } from 'react'

export function useStopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTimestamp, setStartTimestamp] = useState(null)
  const intervalRef = useRef(null)
  const isRunningRef = useRef(false)
  const startTimestampRef = useRef(null)

  const start = useCallback(() => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    const now = Date.now()
    startTimestampRef.current = now
    setStartTimestamp(now)
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - now)
    }, 100)
  }, [])

  // Update elapsed time immediately when app returns from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunningRef.current && startTimestampRef.current) {
        setElapsedTime(Date.now() - startTimestampRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const stop = useCallback(() => {
    if (!isRunningRef.current) return null
    isRunningRef.current = false
    clearInterval(intervalRef.current)
    setIsRunning(false)
    // Calculate fresh elapsed time in case app was backgrounded
    const finalElapsed = startTimestampRef.current ? Date.now() - startTimestampRef.current : elapsedTime
    return {
      startTime: startTimestampRef.current ? new Date(startTimestampRef.current).toISOString() : null,
      endTime: new Date().toISOString(),
      durationMs: finalElapsed,
      durationMinutes: Math.round(finalElapsed / 60000 * 10) / 10
    }
  }, [elapsedTime])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    isRunningRef.current = false
    startTimestampRef.current = null
    setIsRunning(false)
    setElapsedTime(0)
    setStartTimestamp(null)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const formatTime = useCallback((ms = elapsedTime) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [elapsedTime])

  return { isRunning, elapsedTime, startTimestamp, start, stop, reset, formatTime }
}

export default useStopwatch
