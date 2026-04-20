// src/components/AdminPanel.jsx
// Owner: invite/remove users. Admin: view telemetry aggregates.

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, BarChart3, Users, Shield } from 'lucide-react'
import { addAllowedUser, removeAllowedUser, listAllowedUsers, readTelemetryEvents } from '../config/supabase'
import useStore from '../store/useStore'

export default function AdminPanel() {
  const userRole = useStore(s => s.userRole)
  const [users, setUsers] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('enhanced')
  const [msg, setMsg] = useState('')
  const [telemetry, setTelemetry] = useState([])
  const [tab, setTab] = useState('users')

  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin' || isOwner

  useEffect(() => {
    if (isAdmin) {
      listAllowedUsers().then(setUsers)
      readTelemetryEvents(200).then(setTelemetry)
    }
  }, [isAdmin])

  const handleInvite = async () => {
    if (!newEmail.trim()) return
    const { error } = await addAllowedUser(newEmail.trim(), newRole)
    if (error) {
      setMsg(`Error: ${error}`)
    } else {
      setMsg(`Invited ${newEmail.trim()} as ${newRole}`)
      setNewEmail('')
      listAllowedUsers().then(setUsers)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const handleRemove = async (email) => {
    const { error } = await removeAllowedUser(email)
    if (!error) {
      setUsers(prev => prev.filter(u => u.email !== email))
    }
  }

  if (!isAdmin) return null

  // Telemetry aggregates
  const eventCounts = {}
  telemetry.forEach(e => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
  })
  const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Shield size={14} style={{ color: 'var(--color-purple)' }} />
        Admin Panel
      </h3>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'users', label: 'Users', icon: <Users size={12} /> },
          { id: 'telemetry', label: 'Telemetry', icon: <BarChart3 size={12} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: tab === t.id ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: tab === t.id ? '#fff' : 'var(--color-dim)',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-2">
          {isOwner && (
            <div className="flex gap-2">
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="flex-1 p-2 rounded-lg text-xs outline-none"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="Email to invite..." />
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="p-2 rounded-lg text-xs outline-none"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                <option value="enhanced">Enhanced</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleInvite} className="px-3 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                style={{ background: 'var(--color-accent)' }}>
                <UserPlus size={12} /> Invite
              </button>
            </div>
          )}
          {msg && <p className="text-xs" style={{ color: 'var(--color-green)' }}>{msg}</p>}

          {users.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>No invited users yet.</p>
          ) : (
            <div className="space-y-1">
              {users.map(u => (
                <div key={u.email} className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs"
                  style={{ background: 'var(--color-card2)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text)' }}>{u.email}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: u.role === 'admin' ? 'rgba(124,58,237,0.15)' : 'rgba(68,138,255,0.15)',
                        color: u.role === 'admin' ? 'var(--color-purple)' : 'var(--color-blue)' }}>
                      {u.role}
                    </span>
                  </div>
                  {isOwner && (
                    <button onClick={() => handleRemove(u.email)} style={{ color: 'var(--color-red)' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Telemetry tab */}
      {tab === 'telemetry' && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{telemetry.length} events recorded</p>
          {sortedEvents.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>No telemetry data yet.</p>
          ) : (
            <div className="space-y-1">
              {sortedEvents.slice(0, 15).map(([event, count]) => (
                <div key={event} className="flex items-center justify-between text-xs py-1">
                  <span className="font-mono" style={{ color: 'var(--color-text)' }}>{event}</span>
                  <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
