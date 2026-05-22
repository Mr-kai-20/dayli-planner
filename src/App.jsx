import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Konstanta ───────────────────────────────────────────────────────────────
const CATS = [
  { id: 'work',     label: 'Kerja',       color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  { id: 'personal', label: 'Pribadi',     color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  { id: 'health',   label: 'Kesehatan',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  { id: 'meeting',  label: 'Meeting',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  { id: 'study',    label: 'Belajar',     color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  { id: 'other',    label: 'Lainnya',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
]
const MONTHS    = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const DAYS_S    = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const STORAGE_KEY = 'dailyplanner_tasks_v2'
const EMPTY_FORM  = { title:'', startTime:'09:00', endTime:'10:00', category:'work', priority:'medium', notes:'', reminder:true, repeat:'none' }

const toMins  = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const cat     = id => CATS.find(c => c.id === id) || CATS[5]
const priHex  = p => p==='high'?'#f87171':p==='medium'?'#fbbf24':'#34d399'
const priTxt  = p => p==='high'?'Tinggi':p==='medium'?'Sedang':'Rendah'

// ─── Hook: Persistent Storage ─────────────────────────────────────────────────
function useStorage() {
  const save = useCallback((tasks) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)) } catch(e) {}
  }, [])
  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch(e) { return [] }
  }, [])
  return { save, load }
}

// ─── Hook: Notifikasi ──────────────────────────────────────────────────────────
function useNotifications(tasks) {
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const timers = useRef({})

  const requestPerm = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setPerm(p)
    return p
  }

  const scheduleAll = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout)
    timers.current = {}
    if (perm !== 'granted') return

    const todayKey = dateKey(new Date())
    tasks.forEach(task => {
      if (!task.reminder || task.done || task.date !== todayKey) return
      const [h, m] = task.startTime.split(':').map(Number)

      const fire = (offsetMins, title, body) => {
        const t = new Date()
        t.setHours(h, m + offsetMins, 0, 0)
        const diff = t - Date.now()
        if (diff > 0) {
          timers.current[`${task.id}-${offsetMins}`] = setTimeout(() => {
            try { new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', vibrate: [200, 100, 200] }) }
            catch(e) {}
          }, diff)
        }
      }

      fire(-15, `⏰ Segera: ${task.title}`, `Dimulai 15 menit lagi — ${task.startTime}`)
      fire(-5,  `🔔 ${task.title}`, `Dimulai dalam 5 menit!`)
      fire(0,   `▶️ Mulai sekarang: ${task.title}`, `${task.startTime} – ${task.endTime} · ${cat(task.category).label}`)
    })
  }, [tasks, perm])

  useEffect(() => {
    scheduleAll()
    return () => Object.values(timers.current).forEach(clearTimeout)
  }, [scheduleAll])

  return { perm, requestPerm }
}

// ─── Hook: PWA Install Prompt ──────────────────────────────────────────────────
function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    // Cek apakah sudah standalone (sudah install)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  return { prompt, installed, install }
}

// ─── Komponen utama ────────────────────────────────────────────────────────────
export default function App() {
  const { save, load } = useStorage()
  const [tasks, setTasks]   = useState(() => load())
  const [sel, setSel]       = useState(new Date())
  const [modal, setModal]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm]     = useState(EMPTY_FORM)
  const [tab, setTab]       = useState('timeline') // 'timeline' | 'stats'
  const [gcalStatus, setGcalStatus] = useState('disconnected') // fase 3

  const { perm, requestPerm } = useNotifications(tasks)
  const { prompt: installPrompt, installed, install } = useInstallPrompt()

  // Auto-save
  useEffect(() => { save(tasks) }, [tasks, save])

  // Data hari ini
  const now         = new Date()
  const todayTasks  = tasks.filter(t => t.date === dateKey(sel)).sort((a,b) => toMins(a.startTime)-toMins(b.startTime))
  const doneTasks   = todayTasks.filter(t => t.done)
  const pct         = todayTasks.length ? Math.round((doneTasks.length/todayTasks.length)*100) : 0

  // Week strip
  const weekStart = new Date(sel)
  weekStart.setDate(sel.getDate() - sel.getDay())
  const week = Array.from({length:7}, (_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d })

  // Form actions
  const openAdd  = () => { setEditId(null); setForm({...EMPTY_FORM, date: dateKey(sel)}); setModal(true) }
  const openEdit = t  => { setEditId(t.id); setForm({ title:t.title, startTime:t.startTime, endTime:t.endTime, category:t.category, priority:t.priority, notes:t.notes||'', reminder:t.reminder??true, repeat:t.repeat||'none' }); setModal(true) }
  const toggle   = id => setTasks(p => p.map(t => t.id===id ? {...t, done:!t.done} : t))
  const del      = id => { if (confirm('Hapus tugas ini?')) setTasks(p => p.filter(t => t.id!==id)) }

  const save_task = () => {
    if (!form.title.trim()) return
    if (editId) {
      setTasks(p => p.map(t => t.id===editId ? {...t,...form} : t))
    } else {
      setTasks(p => [...p, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, date: dateKey(sel), ...form, done: false, synced: false }])
    }
    setModal(false)
  }

  // Stats per kategori
  const statsByCat = CATS.map(c => ({
    ...c,
    count: tasks.filter(t => t.category===c.id).length,
    done:  tasks.filter(t => t.category===c.id && t.done).length,
  })).filter(c => c.count > 0)

  const hours = Array.from({length:18}, (_,i) => i+6)

  return (
    <div style={{fontFamily:"'Sora','Segoe UI',sans-serif", background:'#0d1117', color:'#e2e8f0', minHeight:'100vh', display:'flex', flexDirection:'column', maxWidth:680, margin:'0 auto'}}>

      {/* ── Install Banner ── */}
      {installPrompt && !installed && (
        <div style={{background:'#1a2332', borderBottom:'1px solid #1e293b', padding:'10px 16px', display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:20}}>📲</span>
          <span style={{flex:1, fontSize:12, color:'#94a3b8'}}>Install Daily Planner ke homescreen untuk akses cepat & offline</span>
          <button onClick={install} style={{background:'#818cf8', border:'none', color:'#fff', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap'}}>
            Install
          </button>
        </div>
      )}

      {/* ── Notif Banner ── */}
      {perm === 'default' && (
        <div style={{background:'#1a2332', borderBottom:'1px solid #1e293b', padding:'10px 16px', display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:20}}>🔔</span>
          <span style={{flex:1, fontSize:12, color:'#94a3b8'}}>Aktifkan notifikasi agar dapat pengingat jadwal otomatis</span>
          <button onClick={requestPerm} style={{background:'#1e293b', border:'1px solid #334155', color:'#818cf8', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700}}>
            Aktifkan
          </button>
        </div>
      )}

      {/* ── Google Calendar Banner (Fase 3 — belum aktif) ── */}
      {gcalStatus === 'disconnected' && (
        <div style={{background:'#0f1f10', borderBottom:'1px solid #1a3820', padding:'10px 16px', display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:20}}>📅</span>
          <span style={{flex:1, fontSize:12, color:'#4ade80'}}>Hubungkan Google Calendar untuk sync otomatis</span>
          <button
            onClick={() => alert('Fase 3: Google Calendar sync akan aktif setelah backend terhubung.\nLihat file SETUP_GUIDE.md untuk instruksi lengkap.')}
            style={{background:'#14532d', border:'1px solid #166534', color:'#4ade80', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700}}>
            Hubungkan
          </button>
        </div>
      )}

      {/* ── Topbar ── */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid #1e293b', position:'sticky', top:0, zIndex:30, background:'#0d1117'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <button onClick={() => { const d=new Date(sel); d.setDate(d.getDate()-1); setSel(d) }}
            style={{background:'#1e293b', border:'none', color:'#94a3b8', borderRadius:8, width:30, height:30, cursor:'pointer', fontSize:16}}>‹</button>
          <div>
            <div style={{fontSize:14, fontWeight:700, lineHeight:1.2}}>{DAYS_FULL[sel.getDay()]}, {sel.getDate()} {MONTHS[sel.getMonth()]}</div>
            {sel.toDateString()===now.toDateString() && <div style={{fontSize:11, color:'#818cf8', fontWeight:600}}>Hari ini</div>}
          </div>
          <button onClick={() => { const d=new Date(sel); d.setDate(d.getDate()+1); setSel(d) }}
            style={{background:'#1e293b', border:'none', color:'#94a3b8', borderRadius:8, width:30, height:30, cursor:'pointer', fontSize:16}}>›</button>
        </div>
        <div style={{display:'flex', gap:6}}>
          {sel.toDateString()!==now.toDateString() && (
            <button onClick={() => setSel(new Date())}
              style={{background:'#1e293b', border:'none', color:'#818cf8', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600}}>
              Hari ini
            </button>
          )}
          <button onClick={openAdd}
            style={{background:'#818cf8', border:'none', color:'#fff', borderRadius:10, padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:700}}>
            + Tambah
          </button>
        </div>
      </div>

      {/* ── Week Strip ── */}
      <div style={{display:'flex', gap:4, padding:'10px 16px', borderBottom:'1px solid #1e293b', overflowX:'auto'}}>
        {week.map((d,i) => {
          const k   = dateKey(d)
          const cnt = tasks.filter(t => t.date===k).length
          const isSel = d.toDateString()===sel.toDateString()
          const isToday = d.toDateString()===now.toDateString()
          return (
            <div key={i} onClick={() => setSel(new Date(d))}
              style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'6px 10px', borderRadius:10, cursor:'pointer', minWidth:42,
                background: isSel ? '#818cf8' : 'transparent',
                border: `1px solid ${isSel ? '#818cf8' : isToday ? '#818cf855' : 'transparent'}`}}>
              <span style={{fontSize:10, color: isSel?'#fff':'#475569', marginBottom:2}}>{DAYS_S[d.getDay()]}</span>
              <span style={{fontSize:14, fontWeight:700, color: isSel?'#fff': isToday?'#818cf8':'#94a3b8'}}>{d.getDate()}</span>
              <div style={{width:4, height:4, borderRadius:'50%', marginTop:3, background: cnt>0 ? (isSel?'#fff':'#818cf8') : 'transparent'}}></div>
            </div>
          )
        })}
      </div>

      {/* ── Stats Bar ── */}
      <div style={{display:'flex', gap:8, padding:'8px 16px', borderBottom:'1px solid #1e293b', flexWrap:'wrap', alignItems:'center'}}>
        <span style={{fontSize:12, color:'#475569'}}><span style={{color:'#818cf8', fontWeight:700}}>{todayTasks.length}</span> tugas</span>
        <span style={{fontSize:12, color:'#475569'}}><span style={{color:'#34d399', fontWeight:700}}>{doneTasks.length}</span> selesai</span>
        {todayTasks.length > 0 && (
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <div style={{width:70, height:4, background:'#1e293b', borderRadius:2}}>
              <div style={{width:`${pct}%`, height:'100%', background:'#34d399', borderRadius:2, transition:'width .3s'}}></div>
            </div>
            <span style={{fontSize:11, color:'#34d399', fontWeight:700}}>{pct}%</span>
          </div>
        )}
        <div style={{marginLeft:'auto', display:'flex', gap:2}}>
          {['timeline','stats'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{background: tab===t?'#1e293b':'transparent', border:'none', color: tab===t?'#e2e8f0':'#475569',
                borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600}}>
              {t==='timeline'?'Timeline':'Statistik'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{flex:1, overflowY:'auto', paddingBottom:80}}>

        {tab==='timeline' && (
          <>
            {todayTasks.length===0 && (
              <div style={{textAlign:'center', padding:'60px 20px', color:'#334155'}}>
                <div style={{fontSize:48, marginBottom:12}}>📅</div>
                <div style={{fontSize:16, fontWeight:600, color:'#475569', marginBottom:6}}>Belum ada jadwal</div>
                <div style={{fontSize:13}}>Tap <span style={{color:'#818cf8', fontWeight:700}}>+ Tambah</span> untuk mulai atur harimu</div>
              </div>
            )}
            {hours.map(h => {
              const hTasks = todayTasks.filter(t => parseInt(t.startTime)===h)
              const isNow  = sel.toDateString()===now.toDateString() && h===now.getHours()
              const nowPct = ((now.getMinutes()/60)*100).toFixed(0)
              return (
                <div key={h} style={{display:'flex', minHeight:56, borderTop:'1px solid #1a2332', position:'relative'}}>
                  <div style={{width:46, flexShrink:0, paddingTop:6, fontSize:11, color:'#334155', textAlign:'right', paddingRight:10}}>
                    {String(h).padStart(2,'0')}:00
                  </div>
                  <div style={{flex:1, paddingLeft:8, paddingRight:12, position:'relative'}}>
                    {isNow && (
                      <div style={{position:'absolute', top:`${nowPct}%`, left:0, right:0, height:1.5, background:'#f87171', zIndex:5}}>
                        <div style={{position:'absolute', left:-3, top:-3.5, width:8, height:8, borderRadius:'50%', background:'#f87171'}}></div>
                      </div>
                    )}
                    {hTasks.map(task => {
                      const c = cat(task.category)
                      return (
                        <div key={task.id}
                          onClick={() => openEdit(task)}
                          style={{borderRadius:10, padding:'8px 10px', marginBottom:4, cursor:'pointer',
                            background: task.done ? '#131f2e' : c.bg,
                            border: `1px solid ${task.done ? '#1e293b' : c.color+'44'}`,
                            opacity: task.done ? 0.65 : 1}}>
                          <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13, fontWeight:700, color: task.done?'#475569':c.color, textDecoration: task.done?'line-through':'none', marginBottom:3}}>
                                {task.title}
                              </div>
                              <div style={{display:'flex', flexWrap:'wrap', gap:6, fontSize:11, color:'#64748b', alignItems:'center'}}>
                                <span>⏱ {task.startTime}–{task.endTime}</span>
                                <span style={{background:c.color+'22', color:c.color, padding:'1px 7px', borderRadius:4, fontWeight:600}}>{c.label}</span>
                                <span style={{background:priHex(task.priority)+'22', color:priHex(task.priority), padding:'1px 7px', borderRadius:4, fontWeight:600}}>{priTxt(task.priority)}</span>
                                {task.reminder && <span style={{color:'#818cf8', fontSize:12}}>🔔</span>}
                                {task.synced && <span style={{color:'#34d399', fontSize:11}}>📅 GCal</span>}
                              </div>
                              {task.notes && <div style={{fontSize:11, color:'#475569', marginTop:4}}>{task.notes}</div>}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:4, flexShrink:0}}>
                              <button onClick={e=>{e.stopPropagation();toggle(task.id)}}
                                style={{background:task.done?'#34d399':'#1e293b', border:'none', color:task.done?'#fff':'#475569',
                                  borderRadius:6, width:26, height:26, cursor:'pointer', fontSize:11}}>
                                {task.done?'✓':'○'}
                              </button>
                              <button onClick={e=>{e.stopPropagation();del(task.id)}}
                                style={{background:'#1e293b', border:'none', color:'#475569', borderRadius:6, width:26, height:26, cursor:'pointer', fontSize:12}}>
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {tab==='stats' && (
          <div style={{padding:'16px'}}>
            <div style={{fontSize:13, color:'#64748b', marginBottom:12, fontWeight:600}}>Semua waktu</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20}}>
              {[
                { label:'Total tugas', value: tasks.length, color:'#818cf8' },
                { label:'Selesai', value: tasks.filter(t=>t.done).length, color:'#34d399' },
                { label:'Hari aktif', value: new Set(tasks.map(t=>t.date)).size, color:'#fbbf24' },
                { label:'Tinggi prioritas', value: tasks.filter(t=>t.priority==='high').length, color:'#f87171' },
              ].map(s => (
                <div key={s.label} style={{background:'#131f2e', borderRadius:10, padding:'14px', border:'1px solid #1e293b'}}>
                  <div style={{fontSize:11, color:'#475569', marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:28, fontWeight:700, color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{fontSize:13, color:'#64748b', marginBottom:10, fontWeight:600}}>Per kategori</div>
            {statsByCat.map(c => (
              <div key={c.id} style={{background:'#131f2e', borderRadius:10, padding:'12px 14px', marginBottom:8, border:'1px solid #1e293b'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                  <span style={{fontSize:13, fontWeight:600, color:c.color}}>{c.label}</span>
                  <span style={{fontSize:12, color:'#475569'}}>{c.done}/{c.count}</span>
                </div>
                <div style={{height:4, background:'#1e293b', borderRadius:2}}>
                  <div style={{width:`${c.count?Math.round(c.done/c.count*100):0}%`, height:'100%', background:c.color, borderRadius:2, transition:'width .3s'}}></div>
                </div>
              </div>
            ))}

            {statsByCat.length===0 && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'#334155'}}>
                <div style={{fontSize:13}}>Belum ada data statistik</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Tambah/Edit ── */}
      {modal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100}}
          onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={{background:'#111827', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:680, padding:'20px 20px 36px', maxHeight:'92vh', overflowY:'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
              <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{editId ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h3>
              <button onClick={() => setModal(false)} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:22}}>✕</button>
            </div>
            <p style={{fontSize:12, color:'#475569', margin:'0 0 16px'}}>{DAYS_FULL[sel.getDay()]}, {sel.getDate()} {MONTHS[sel.getMonth()]} {sel.getFullYear()}</p>

            {/* Judul */}
            <label style={{display:'block', fontSize:12, color:'#64748b', marginBottom:6}}>Judul tugas *</label>
            <input style={{width:'100%', background:'#1e293b', border:'1px solid #2d3f55', borderRadius:8, color:'#e2e8f0', padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box'}}
              placeholder="Contoh: Meeting tim produk..."
              value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} autoFocus />

            {/* Waktu */}
            <label style={{display:'block', fontSize:12, color:'#64748b', margin:'14px 0 6px'}}>Waktu</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <div style={{fontSize:11, color:'#64748b', marginBottom:4}}>Mulai</div>
                <input type="time" style={{width:'100%', background:'#1e293b', border:'1px solid #2d3f55', borderRadius:8, color:'#e2e8f0', padding:'9px 10px', fontSize:13, outline:'none', boxSizing:'border-box'}}
                  value={form.startTime} onChange={e => setForm(f=>({...f,startTime:e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:11, color:'#64748b', marginBottom:4}}>Selesai</div>
                <input type="time" style={{width:'100%', background:'#1e293b', border:'1px solid #2d3f55', borderRadius:8, color:'#e2e8f0', padding:'9px 10px', fontSize:13, outline:'none', boxSizing:'border-box'}}
                  value={form.endTime} onChange={e => setForm(f=>({...f,endTime:e.target.value}))} />
              </div>
            </div>

            {/* Kategori */}
            <label style={{display:'block', fontSize:12, color:'#64748b', margin:'14px 0 6px'}}>Kategori</label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
              {CATS.map(c => (
                <div key={c.id} onClick={() => setForm(f=>({...f,category:c.id}))}
                  style={{borderRadius:8, padding:'8px', textAlign:'center', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: form.category===c.id ? c.bg : '#1e293b',
                    border: `2px solid ${form.category===c.id ? c.color : 'transparent'}`,
                    color: form.category===c.id ? c.color : '#64748b'}}>
                  {c.label}
                </div>
              ))}
            </div>

            {/* Prioritas */}
            <label style={{display:'block', fontSize:12, color:'#64748b', margin:'14px 0 6px'}}>Prioritas</label>
            <div style={{display:'flex', gap:8}}>
              {['low','medium','high'].map(p => (
                <button key={p} onClick={() => setForm(f=>({...f,priority:p}))}
                  style={{flex:1, borderRadius:8, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer',
                    background: form.priority===p ? priHex(p)+'22' : '#1e293b',
                    border: `2px solid ${form.priority===p ? priHex(p) : 'transparent'}`,
                    color: form.priority===p ? priHex(p) : '#64748b'}}>
                  {priTxt(p)}
                </button>
              ))}
            </div>

            {/* Pengulangan */}
            <label style={{display:'block', fontSize:12, color:'#64748b', margin:'14px 0 6px'}}>Pengulangan</label>
            <select style={{width:'100%', background:'#1e293b', border:'1px solid #2d3f55', borderRadius:8, color:'#e2e8f0', padding:'9px 10px', fontSize:13, outline:'none', boxSizing:'border-box'}}
              value={form.repeat} onChange={e => setForm(f=>({...f,repeat:e.target.value}))}>
              <option value="none">Tidak berulang</option>
              <option value="daily">Setiap hari</option>
              <option value="weekdays">Hari kerja (Sen–Jum)</option>
              <option value="weekly">Setiap minggu</option>
              <option value="monthly">Setiap bulan</option>
            </select>

            {/* Catatan */}
            <label style={{display:'block', fontSize:12, color:'#64748b', margin:'14px 0 6px'}}>Catatan (opsional)</label>
            <textarea style={{width:'100%', background:'#1e293b', border:'1px solid #2d3f55', borderRadius:8, color:'#e2e8f0', padding:'9px 10px', fontSize:13, outline:'none', boxSizing:'border-box', height:64, resize:'vertical'}}
              placeholder="Tambah detail, link, atau pengingat..."
              value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />

            {/* Toggle Reminder */}
            <div style={{display:'flex', alignItems:'center', gap:10, marginTop:16, padding:'12px 14px', background:'#1e293b', borderRadius:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>🔔 Pengingat notifikasi</div>
                <div style={{fontSize:11, color:'#475569', marginTop:2}}>15 menit & 5 menit sebelum mulai</div>
              </div>
              <div onClick={() => setForm(f=>({...f,reminder:!f.reminder}))}
                style={{width:44, height:24, borderRadius:12, background:form.reminder?'#818cf8':'#334155', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0}}>
                <div style={{position:'absolute', top:3, left:form.reminder?22:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s'}}></div>
              </div>
            </div>

            {perm==='denied' && form.reminder && (
              <div style={{fontSize:11, color:'#f87171', marginTop:8, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8}}>
                ⚠️ Notifikasi diblokir. Buka Pengaturan Browser → Notifikasi → Izinkan situs ini.
              </div>
            )}

            <button onClick={save_task}
              style={{width:'100%', marginTop:18, background:'#818cf8', border:'none', color:'#fff', borderRadius:12, padding:'13px', cursor:'pointer', fontSize:14, fontWeight:700}}>
              {editId ? '💾 Simpan Perubahan' : '✅ Tambahkan ke Jadwal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
