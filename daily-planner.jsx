import { useState, useEffect, useRef } from "react";

const CATS = [
  { id: "work", label: "Kerja", color: "#818cf8", light: "#1e1b4b22" },
  { id: "personal", label: "Pribadi", color: "#34d399", light: "#064e3b22" },
  { id: "health", label: "Kesehatan", color: "#fbbf24", light: "#78350f22" },
  { id: "meeting", label: "Meeting", color: "#f87171", light: "#450a0a22" },
  { id: "study", label: "Belajar", color: "#c084fc", light: "#2e106522" },
  { id: "other", label: "Lainnya", color: "#94a3b8", light: "#1e293b22" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
const DAYS_FULL = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const DAYS_SHORT = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

const toMins = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fmt = (h,m) => `${String(h).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`;
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const cat = id => CATS.find(c => c.id === id) || CATS[5];
const priColor = p => p==="high"?"#f87171":p==="medium"?"#fbbf24":"#34d399";
const priLabel = p => p==="high"?"Tinggi":p==="medium"?"Sedang":"Rendah";

const EMPTY_FORM = { title:"", startTime:"09:00", endTime:"10:00", category:"work", priority:"medium", notes:"", reminder:true };

const S = {
  root: { fontFamily:"'Sora', 'Segoe UI', sans-serif", background:"#0d1117", color:"#e2e8f0", minHeight:"100vh", display:"flex", flexDirection:"column" },
  topbar: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #1e293b", background:"#0d1117", position:"sticky", top:0, zIndex:30 },
  dateNav: { display:"flex", alignItems:"center", gap:8 },
  navBtn: { background:"#1e293b", border:"none", color:"#94a3b8", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" },
  todayBtn: { background:"#1e293b", border:"none", color:"#818cf8", borderRadius:8, padding:"4px 12px", cursor:"pointer", fontSize:12, fontWeight:600 },
  addBtn: { background:"#818cf8", border:"none", color:"#fff", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6 },
  weekBar: { display:"flex", gap:4, padding:"10px 20px", borderBottom:"1px solid #1e293b", overflowX:"auto" },
  weekDay: { display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 10px", borderRadius:10, cursor:"pointer", minWidth:44, border:"1px solid transparent", transition:"all 0.15s" },
  statsBar: { display:"flex", gap:12, padding:"10px 20px", borderBottom:"1px solid #1e293b", flexWrap:"wrap" },
  statChip: { background:"#1e293b", borderRadius:8, padding:"5px 12px", fontSize:12, color:"#94a3b8", display:"flex", alignItems:"center", gap:5 },
  timeline: { flex:1, overflowY:"auto", padding:"0 20px 80px" },
  hourRow: { display:"flex", minHeight:60, borderTop:"1px solid #1a2332", position:"relative" },
  hourLabel: { width:48, flexShrink:0, paddingTop:6, fontSize:11, color:"#334155", userSelect:"none", textAlign:"right", paddingRight:12 },
  tasksArea: { flex:1, position:"relative", paddingLeft:8 },
  taskCard: { borderRadius:10, padding:"8px 12px", marginBottom:4, cursor:"pointer", position:"relative", border:"1px solid transparent", transition:"all 0.15s" },
  taskTitle: { fontSize:13, fontWeight:600, marginBottom:2 },
  taskMeta: { fontSize:11, opacity:0.7, display:"flex", gap:8, alignItems:"center" },
  badge: { borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:600 },
  modal: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 },
  sheet: { background:"#111827", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:680, padding:"20px 24px 32px", maxHeight:"90vh", overflowY:"auto" },
  label: { display:"block", fontSize:12, color:"#64748b", marginBottom:6, marginTop:16 },
  input: { width:"100%", background:"#1e293b", border:"1px solid #2d3f55", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:13, boxSizing:"border-box", outline:"none" },
  row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  catGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 },
  catBtn: { borderRadius:8, padding:"8px 4px", fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"center", border:"2px solid transparent", transition:"all 0.15s" },
  priRow: { display:"flex", gap:8 },
  priBtn: { flex:1, borderRadius:8, padding:"8px", fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"center", border:"2px solid transparent", background:"#1e293b", color:"#94a3b8", transition:"all 0.15s" },
  saveBtn: { width:"100%", marginTop:20, background:"#818cf8", border:"none", color:"#fff", borderRadius:10, padding:"12px", cursor:"pointer", fontSize:14, fontWeight:700 },
  notifBanner: { background:"#1e293b", borderBottom:"1px solid #2d3f55", padding:"10px 20px", display:"flex", alignItems:"center", gap:10, fontSize:12 },
  empty: { textAlign:"center", color:"#334155", padding:"40px 20px" },
  fab: { position:"fixed", bottom:24, right:24, background:"#818cf8", border:"none", color:"#fff", width:54, height:54, borderRadius:"50%", fontSize:24, cursor:"pointer", boxShadow:"0 4px 20px #818cf844", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [sel, setSel] = useState(new Date());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [perm, setPerm] = useState("default");
  const [loaded, setLoaded] = useState(false);
  const timers = useRef({});

  const now = new Date();
  const weekDates = Array.from({length:7}, (_,i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    return d;
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("dp_tasks");
        if (r) setTasks(JSON.parse(r.value));
      } catch(e) {}
      setLoaded(true);
    })();
    if ("Notification" in window) {
      setPerm(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => setPerm(p));
      }
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("dp_tasks", JSON.stringify(tasks)).catch(()=>{});
  }, [tasks, loaded]);

  useEffect(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    if (perm !== "granted") return;
    const today = dateKey(new Date());
    tasks.forEach(task => {
      if (!task.reminder || task.done || task.date !== today) return;
      const scheduleNotif = (offset, title, body) => {
        const [h,m] = task.startTime.split(":").map(Number);
        const t = new Date(); t.setHours(h, m + offset, 0, 0);
        const diff = t - Date.now();
        if (diff > 0) {
          timers.current[`${task.id}-${offset}`] = setTimeout(() => {
            try { new Notification(title, { body, icon: "https://via.placeholder.com/64/818cf8/ffffff?text=📅" }); } catch(e) {}
          }, diff);
        }
      };
      scheduleNotif(-10, `🔔 ${task.title}`, `Dimulai dalam 10 menit — ${task.startTime}`);
      scheduleNotif(0, `⏰ ${task.title}`, `Sekarang waktunya! ${task.startTime} - ${task.endTime}`);
    });
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, [tasks, perm]);

  const todayTasks = tasks.filter(t => t.date === dateKey(sel)).sort((a,b) => toMins(a.startTime) - toMins(b.startTime));
  const done = todayTasks.filter(t => t.done).length;

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (task) => { setEditId(task.id); setForm({ title:task.title, startTime:task.startTime, endTime:task.endTime, category:task.category, priority:task.priority, notes:task.notes||"", reminder:task.reminder??true }); setModal(true); };

  const save = () => {
    if (!form.title.trim()) return;
    if (editId) {
      setTasks(p => p.map(t => t.id === editId ? { ...t, ...form } : t));
    } else {
      setTasks(p => [...p, { id: Date.now().toString(), date: dateKey(sel), ...form, done: false }]);
    }
    setModal(false);
  };

  const del = id => setTasks(p => p.filter(t => t.id !== id));
  const toggle = id => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const hours = Array.from({length:18}, (_,i) => i + 6);

  const getTasksForHour = h => todayTasks.filter(t => {
    const startH = parseInt(t.startTime.split(":")[0]);
    return startH === h;
  });

  const isSelToday = sel.toDateString() === now.toDateString();
  const currentHour = now.getHours();
  const currentMins = now.getMinutes();
  const currentPct = ((currentMins / 60) * 100).toFixed(0);

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet" />

      {perm !== "granted" && perm !== "denied" && (
        <div style={S.notifBanner}>
          <span style={{fontSize:16}}>🔔</span>
          <span style={{flex:1, color:"#94a3b8"}}>Aktifkan notifikasi agar bisa mendapat pengingat jadwal tepat waktu.</span>
          <button onClick={() => Notification.requestPermission().then(p => setPerm(p))}
            style={{background:"#818cf8", border:"none", color:"#fff", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:600}}>
            Aktifkan
          </button>
        </div>
      )}

      <div style={S.topbar}>
        <div style={S.dateNav}>
          <button style={S.navBtn} onClick={() => { const d=new Date(sel); d.setDate(d.getDate()-1); setSel(d); }}>‹</button>
          <div>
            <div style={{fontSize:15, fontWeight:700, color:"#e2e8f0", lineHeight:1.2}}>
              {DAYS_FULL[sel.getDay()]}, {sel.getDate()} {MONTHS[sel.getMonth()]} {sel.getFullYear()}
            </div>
            {isSelToday && <div style={{fontSize:11, color:"#818cf8", fontWeight:600}}>Hari ini</div>}
          </div>
          <button style={S.navBtn} onClick={() => { const d=new Date(sel); d.setDate(d.getDate()+1); setSel(d); }}>›</button>
        </div>
        <div style={{display:"flex", gap:8}}>
          {!isSelToday && <button style={S.todayBtn} onClick={() => setSel(new Date())}>Hari ini</button>}
          <button style={S.addBtn} onClick={openAdd}>
            <span style={{fontSize:18, lineHeight:1}}>+</span> Tambah
          </button>
        </div>
      </div>

      <div style={S.weekBar}>
        {weekDates.map((d, i) => {
          const k = dateKey(d);
          const cnt = tasks.filter(t => t.date === k).length;
          const isSel = d.toDateString() === sel.toDateString();
          const isNow = d.toDateString() === now.toDateString();
          return (
            <div key={i} style={{...S.weekDay, background: isSel ? "#818cf8" : "transparent", borderColor: isNow && !isSel ? "#818cf855" : "transparent"}}
              onClick={() => setSel(new Date(d))}>
              <span style={{fontSize:10, color: isSel ? "#fff" : "#475569", marginBottom:2}}>{DAYS_SHORT[d.getDay()]}</span>
              <span style={{fontSize:14, fontWeight:700, color: isSel ? "#fff" : isNow ? "#818cf8" : "#94a3b8"}}>{d.getDate()}</span>
              {cnt > 0 && <div style={{width:5, height:5, borderRadius:"50%", background: isSel ? "#fff" : "#818cf8", marginTop:3}}></div>}
              {cnt === 0 && <div style={{width:5, height:5}}></div>}
            </div>
          );
        })}
      </div>

      <div style={S.statsBar}>
        <div style={S.statChip}>
          <span style={{color:"#818cf8", fontWeight:700}}>{todayTasks.length}</span> tugas hari ini
        </div>
        <div style={S.statChip}>
          <span style={{color:"#34d399", fontWeight:700}}>{done}</span> selesai
        </div>
        {todayTasks.length > 0 && (
          <div style={S.statChip}>
            <div style={{width:60, height:5, background:"#1e293b", borderRadius:3, overflow:"hidden"}}>
              <div style={{width:`${Math.round((done/todayTasks.length)*100)}%`, height:"100%", background:"#34d399", borderRadius:3, transition:"width 0.3s"}}></div>
            </div>
            <span style={{color:"#34d399", fontWeight:700}}>{Math.round((done/todayTasks.length)*100)}%</span>
          </div>
        )}
        {perm === "granted" && <div style={{...S.statChip, color:"#34d399"}}>🔔 Notifikasi aktif</div>}
        {perm === "denied" && <div style={{...S.statChip, color:"#f87171"}}>🔕 Notifikasi diblokir</div>}
      </div>

      <div style={S.timeline}>
        {todayTasks.length === 0 && (
          <div style={S.empty}>
            <div style={{fontSize:40, marginBottom:12}}>📅</div>
            <div style={{fontSize:16, fontWeight:600, color:"#475569", marginBottom:6}}>Belum ada jadwal</div>
            <div style={{fontSize:13, color:"#334155"}}>Tap tombol <strong style={{color:"#818cf8"}}>+ Tambah</strong> untuk mulai mengatur harimu</div>
          </div>
        )}
        {hours.map(h => {
          const hTasks = getTasksForHour(h);
          const showLine = isSelToday && h === currentHour;
          return (
            <div key={h} style={S.hourRow}>
              <div style={S.hourLabel}>{fmt(h)}</div>
              <div style={{...S.tasksArea, position:"relative"}}>
                {showLine && (
                  <div style={{position:"absolute", top:`${currentPct}%`, left:0, right:0, height:2, background:"#f87171", zIndex:5, borderRadius:1}}>
                    <div style={{position:"absolute", left:-4, top:-4, width:10, height:10, borderRadius:"50%", background:"#f87171"}}></div>
                  </div>
                )}
                {hTasks.map(task => {
                  const c = cat(task.category);
                  return (
                    <div key={task.id}
                      style={{...S.taskCard, background: task.done ? "#1a2332" : c.light, borderColor: task.done ? "#1e293b" : c.color + "44", opacity: task.done ? 0.6 : 1}}
                      onClick={() => openEdit(task)}>
                      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{...S.taskTitle, color: task.done ? "#475569" : c.color, textDecoration: task.done ? "line-through" : "none"}}>
                            {task.title}
                          </div>
                          <div style={S.taskMeta}>
                            <span>⏱ {task.startTime}–{task.endTime}</span>
                            <span style={{...S.badge, background: c.color + "22", color: c.color}}>{c.label}</span>
                            <span style={{...S.badge, background: priColor(task.priority) + "22", color: priColor(task.priority)}}>
                              {priLabel(task.priority)}
                            </span>
                            {task.reminder && <span title="Pengingat aktif" style={{color:"#818cf8"}}>🔔</span>}
                          </div>
                          {task.notes && <div style={{fontSize:11, color:"#475569", marginTop:4}}>{task.notes}</div>}
                        </div>
                        <div style={{display:"flex", flexDirection:"column", gap:4}}>
                          <button onClick={e => { e.stopPropagation(); toggle(task.id); }}
                            style={{background: task.done ? "#34d399" : "#1e293b", border:"none", color: task.done ? "#fff" : "#475569", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center"}}>
                            {task.done ? "✓" : "○"}
                          </button>
                          <button onClick={e => { e.stopPropagation(); del(task.id); }}
                            style={{background:"#1e293b", border:"none", color:"#475569", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center"}}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={S.sheet}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
              <h3 style={{margin:0, fontSize:16, color:"#e2e8f0"}}>{editId ? "Edit Tugas" : "Tambah Tugas Baru"}</h3>
              <button onClick={() => setModal(false)} style={{background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:20, padding:4}}>✕</button>
            </div>
            <div style={{fontSize:12, color:"#475569", marginBottom:4}}>
              {DAYS_FULL[sel.getDay()]}, {sel.getDate()} {MONTHS[sel.getMonth()]} {sel.getFullYear()}
            </div>

            <label style={S.label}>Judul Tugas *</label>
            <input style={S.input} placeholder="Cth: Meeting tim marketing..." value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />

            <label style={S.label}>Waktu</label>
            <div style={S.row2}>
              <div>
                <div style={{fontSize:11, color:"#64748b", marginBottom:4}}>Mulai</div>
                <input type="time" style={S.input} value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:11, color:"#64748b", marginBottom:4}}>Selesai</div>
                <input type="time" style={S.input} value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))} />
              </div>
            </div>

            <label style={S.label}>Kategori</label>
            <div style={S.catGrid}>
              {CATS.map(c => (
                <div key={c.id} style={{...S.catBtn, background: form.category === c.id ? c.color + "33" : "#1e293b", borderColor: form.category === c.id ? c.color : "transparent", color: form.category === c.id ? c.color : "#64748b"}}
                  onClick={() => setForm(f => ({...f, category: c.id}))}>
                  {c.label}
                </div>
              ))}
            </div>

            <label style={S.label}>Prioritas</label>
            <div style={S.priRow}>
              {["low","medium","high"].map(p => (
                <button key={p} style={{...S.priBtn, borderColor: form.priority === p ? priColor(p) : "transparent", color: form.priority === p ? priColor(p) : "#64748b", background: form.priority === p ? priColor(p) + "22" : "#1e293b"}}
                  onClick={() => setForm(f => ({...f, priority: p}))}>
                  {priLabel(p)}
                </button>
              ))}
            </div>

            <label style={S.label}>Catatan (opsional)</label>
            <textarea style={{...S.input, height:64, resize:"vertical"}} placeholder="Tambahkan detail..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />

            <div style={{display:"flex", alignItems:"center", gap:10, marginTop:16, padding:"12px 14px", background:"#1e293b", borderRadius:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13, color:"#e2e8f0", fontWeight:600}}>🔔 Pengingat Notifikasi</div>
                <div style={{fontSize:11, color:"#475569", marginTop:2}}>Notifikasi 10 menit sebelum & saat mulai</div>
              </div>
              <div onClick={() => setForm(f => ({...f, reminder: !f.reminder}))}
                style={{width:42, height:24, borderRadius:12, background: form.reminder ? "#818cf8" : "#334155", cursor:"pointer", position:"relative", transition:"background 0.2s"}}>
                <div style={{position:"absolute", top:3, left: form.reminder ? 20 : 3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s"}}></div>
              </div>
            </div>

            {perm === "denied" && form.reminder && (
              <div style={{fontSize:11, color:"#f87171", marginTop:8, padding:"8px 12px", background:"#450a0a33", borderRadius:6}}>
                ⚠️ Notifikasi diblokir di browser. Aktifkan melalui pengaturan browser untuk mendapat pengingat.
              </div>
            )}

            <button style={S.saveBtn} onClick={save}>
              {editId ? "Simpan Perubahan" : "Tambahkan ke Jadwal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
