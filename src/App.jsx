import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './screens/Dashboard'
import TripLogger from './screens/TripLogger'
import FlightEntry from './screens/FlightEntry'
import Analytics from './screens/Analytics'
import MilesCalculator from './screens/MilesCalculator'
import Settings from './screens/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="trip" element={<TripLogger />} />
        <Route path="flight" element={<FlightEntry />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="miles" element={<MilesCalculator />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
