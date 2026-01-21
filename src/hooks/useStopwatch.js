import { useState, useRef, useCallback, useEffect } from 'react'

export function useStopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTimestamp, setStartTimestamp] = useState(null)
  const intervalRef = useRef(null)

  const start = useCallback(() => {
    if (isRunning) return
    const now = Date.now()
    setStartTimestamp(now)
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - now)
    }, 100)
  }, [isRunning])

  const stop = useCallback(() => {
    if (!isRunning) return
    clearInterval(intervalRef.current)
    setIsRunning(false)
    return {
      startTime: startTimestamp ? new Date(startTimestamp).toISOString() : null,
      endTime: new Date().toISOString(),
      durationMs: elapsedTime,
      durationMinutes: Math.round(elapsedTime / 60000 * 10) / 10
    }
  }, [isRunning, startTimestamp, elapsedTime])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
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
