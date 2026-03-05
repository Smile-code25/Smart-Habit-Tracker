import { useState, useEffect } from 'react'
import './App.css'

const TODAY = () => new Date().toISOString().split('T')[0]

const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

const calcStreak = (history) => {
  let streak = 0
  const d = new Date()
  while (true) {
    const dateStr = d.toISOString().split('T')[0]
    if (history.includes(dateStr)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

const calcCompletion = (history) => {
  const days = getLast7Days()
  const completed = days.filter(d => history.includes(d)).length
  return Math.round((completed / 7) * 100)
}

function AnalyticsDashboard({ habits }) {
  const today = TODAY()
  const last7 = getLast7Days()

  const totalHabits = habits.length
  const completedToday = habits.filter(h => h.history.includes(today)).length

  const bestStreak = habits.length > 0
    ? Math.max(...habits.map(h => calcStreak(h.history)))
    : 0

  const weeklyCompletion = habits.length > 0
    ? Math.round(
        habits.reduce((sum, h) => {
          const daysHit = last7.filter(d => h.history.includes(d)).length
          return sum + (daysHit / 7) * 100
        }, 0) / habits.length
      )
    : 0

  const mostConsistent = habits.length > 0
    ? habits.reduce((best, h) => h.history.length > best.history.length ? h : best, habits[0])
    : null

  const stats = [
    { icon: '📋', label: 'Total Habits', value: totalHabits },
    { icon: '✅', label: 'Completed Today', value: `${completedToday} / ${totalHabits}` },
    { icon: '🔥', label: 'Best Streak', value: `${bestStreak} days` },
    { icon: '📊', label: 'Weekly Completion', value: `${weeklyCompletion}%` },
    { icon: '⭐', label: 'Most Consistent', value: mostConsistent ? mostConsistent.name : '—' },
  ]

  return (
    <section className="analytics-section">
      <h2 className="section-title">Habit Analytics</h2>
      <div className="analytics-grid">
        {stats.map((s, i) => (
          <div key={i} className="analytics-card">
            <span className="analytics-icon">{s.icon}</span>
            <span className="analytics-value">{s.value}</span>
            <span className="analytics-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function HabitHeatmap({ habits }) {
  const [tooltip, setTooltip] = useState(null)

  // Build last 30 days array (oldest → newest)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  // Count how many habits were completed per day
  const countMap = {}
  days.forEach(day => { countMap[day] = 0 })
  habits.forEach(habit => {
    habit.history.forEach(date => {
      if (countMap[date] !== undefined) countMap[date]++
    })
  })

  const getLevel = (count) => {
    if (count === 0) return 0
    if (count === 1) return 1
    if (count === 2) return 2
    return 3
  }

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  // Group into weeks (columns of 7) for a GitHub-style grid
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const totalCompleted = days.filter(d => countMap[d] > 0).length

  return (
    <section className="heatmap-section">
      <h2 className="section-title">Activity Heatmap
        <span className="heatmap-subtitle">Last 30 days · {totalCompleted} active days</span>
      </h2>

      <div className="heatmap-wrap">
        <div className="heatmap-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map((day, di) => {
                const count = countMap[day]
                const level = getLevel(count)
                const isToday = day === TODAY()
                return (
                  <div
                    key={di}
                    className={`heatmap-cell level-${level}${isToday ? ' heatmap-today' : ''}`}
                    onMouseEnter={e => {
                      const rect = e.target.getBoundingClientRect()
                      setTooltip({ day, count, x: rect.left, y: rect.top })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          {[0, 1, 2, 3].map(l => (
            <div key={l} className={`heatmap-cell level-${l}`} />
          ))}
          <span className="legend-label">More</span>
        </div>
      </div>

      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 40 }}
        >
          <strong>{formatLabel(tooltip.day)}</strong>
          <span>{tooltip.count === 0 ? 'No habits' : `${tooltip.count} habit${tooltip.count > 1 ? 's' : ''} completed`}</span>
        </div>
      )}
    </section>
  )
}

function HabitCard({ habit, onComplete, onEdit, onReset, onDelete }) {
  const days = getLast7Days()
  const completedToday = habit.history.includes(TODAY())
  const streak = calcStreak(habit.history)
  const completion = calcCompletion(habit.history)
  const [pulse, setPulse] = useState(false)

  const handleCheckIn = () => {
    if (completedToday) return
    setPulse(true)
    onComplete(habit.id)
    setTimeout(() => setPulse(false), 700)
  }

  return (
    <div className={`habit-card ${completedToday ? 'done' : ''} ${pulse ? 'pulse' : ''}`}>
      <div className="habit-header">
        <div className="habit-title-group">
          <span className="habit-name">{habit.name}</span>
          {habit.category && <span className="habit-category">{habit.category}</span>}
        </div>
        <div className="streak-badge">
          <span className="streak-fire">🔥</span>
          <span className="streak-num">{streak}</span>
        </div>
      </div>

      <div className="week-row">
        {days.map((day, i) => {
          const done = habit.history.includes(day)
          const label = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(day + 'T12:00:00').getDay()]
          return (
            <div key={i} className={`day-box ${done ? 'filled' : ''}`}>
              <span className="day-label">{label}</span>
              <div className="day-dot" />
            </div>
          )
        })}
      </div>

      <div className="habit-footer">
        <div className="completion-bar-wrap">
          <div className="completion-bar">
            <div className="completion-fill" style={{ width: `${completion}%` }} />
          </div>
          <span className="completion-text">{completion}% this week</span>
        </div>

        <div className="habit-actions">
          <button
            className={`btn btn-complete ${completedToday ? 'disabled' : ''}`}
            onClick={handleCheckIn}
            disabled={completedToday}
          >
            {completedToday ? '✓ Done' : 'Check In'}
          </button>
          <button className="btn btn-edit" onClick={() => onEdit(habit)}>Edit</button>
          <button className="btn btn-reset" onClick={() => onReset(habit.id)}>Reset</button>
          <button className="btn btn-delete" onClick={() => onDelete(habit.id)}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [habits, setHabits] = useState(() => {
    try {
      const saved = localStorage.getItem('smart-habits-v1')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('smart-habits-theme') === 'dark'
  })

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [editingHabit, setEditingHabit] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    localStorage.setItem('smart-habits-v1', JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    localStorage.setItem('smart-habits-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(prev => !prev)

  const handleAdd = () => {
    if (!formName.trim()) return
    const newHabit = {
      id: Date.now(),
      name: formName.trim(),
      category: formCategory.trim(),
      createdDate: TODAY(),
      history: []
    }
    setHabits(prev => [...prev, newHabit])
    setFormName('')
    setFormCategory('')
  }

  const handleComplete = (id) => {
    setHabits(prev => prev.map(h =>
      h.id === id
        ? { ...h, history: [...new Set([...h.history, TODAY()])] }
        : h
    ))
  }

  const handleEdit = (habit) => {
    setEditingHabit(habit.id)
    setEditName(habit.name)
  }

  const handleEditSave = (id) => {
    if (!editName.trim()) return
    setHabits(prev => prev.map(h =>
      h.id === id ? { ...h, name: editName.trim() } : h
    ))
    setEditingHabit(null)
    setEditName('')
  }

  const handleReset = (id) => {
    setHabits(prev => prev.map(h =>
      h.id === id ? { ...h, history: [], createdDate: TODAY() } : h
    ))
  }

  const handleDelete = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  const totalHabits = habits.length
  const completedToday = habits.filter(h => h.history.includes(TODAY())).length

  return (
    <div className={`app${darkMode ? ' dark-mode' : ''}`}>
      <div className="app-bg" />
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
      </div>
      <svg className="bg-mesh" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--ochre)" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" fill="url(#mg1)" />
        <circle cx="300" cy="300" r="200" fill="none" stroke="var(--ochre)" strokeOpacity="0.06" strokeWidth="1"/>
        <circle cx="300" cy="300" r="140" fill="none" stroke="var(--forest)" strokeOpacity="0.05" strokeWidth="1"/>
        <circle cx="300" cy="300" r="80"  fill="none" stroke="var(--ochre)" strokeOpacity="0.07" strokeWidth="0.5"/>
        <line x1="20" y1="300" x2="580" y2="300" stroke="var(--ochre)" strokeOpacity="0.04" strokeWidth="0.5"/>
        <line x1="300" y1="20" x2="300" y2="580" stroke="var(--forest)" strokeOpacity="0.04" strokeWidth="0.5"/>
        <line x1="80"  y1="80"  x2="520" y2="520" stroke="var(--ochre)" strokeOpacity="0.03" strokeWidth="0.5"/>
        <line x1="520" y1="80"  x2="80"  y2="520" stroke="var(--forest)" strokeOpacity="0.03" strokeWidth="0.5"/>
      </svg>

      <header className="app-header">
        <div className="header-icon">📋</div>
        <div>
          <h1 className="app-title">Smart Habit Tracker</h1>
          <p className="app-subtitle">Build streaks. Stay consistent.</p>
        </div>
        <div className="header-right">
          {totalHabits > 0 && (
            <div className="today-summary">
              <span className="today-num">{completedToday}/{totalHabits}</span>
              <span className="today-label">today</span>
            </div>
          )}
          <button className="btn btn-theme" onClick={toggleDarkMode}>
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      {habits.length > 0 && <AnalyticsDashboard habits={habits} />}
      {habits.length > 0 && <HabitHeatmap habits={habits} />}

      <section className="add-section">
        <h2 className="section-title">New Habit</h2>
        <div className="add-form">
          <input
            className="input"
            type="text"
            placeholder="Habit name (e.g. Morning Run)"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            className="input"
            type="text"
            placeholder="Category (optional)"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-add" onClick={handleAdd}>+ Add Habit</button>
        </div>
      </section>

      <section className="habits-section">
        {habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌱</div>
            <p>No habits yet. Add one above to get started!</p>
          </div>
        ) : (
          <div className="habit-list">
            {habits.map(habit => (
              <div key={habit.id}>
                {editingHabit === habit.id ? (
                  <div className="edit-inline">
                    <input
                      className="input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditSave(habit.id)}
                      autoFocus
                    />
                    <button className="btn btn-complete" onClick={() => handleEditSave(habit.id)}>Save</button>
                    <button className="btn btn-reset" onClick={() => setEditingHabit(null)}>Cancel</button>
                  </div>
                ) : (
                  <HabitCard
                    habit={habit}
                    onComplete={handleComplete}
                    onEdit={handleEdit}
                    onReset={handleReset}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}