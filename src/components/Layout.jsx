import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Layout.module.css'

const navItems = [
  { path: '/', icon: '◈', label: 'Home' },
  { path: '/trip', icon: '⏱', label: 'Trip' },
  { path: '/flight', icon: '✈', label: 'Flight' },
  { path: '/miles', icon: '◎', label: 'Miles' },
  { path: '/settings', icon: '⚙', label: 'Setup' },
]

export default function Layout() {
  const location = useLocation()
  
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={styles.content}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
