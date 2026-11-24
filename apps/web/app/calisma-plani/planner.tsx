'use client';

import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { activities, COLORS, DAYS, emptyPlan, eventProblem, ICON_LABELS, ICONS, LEVELS, readPlan, saveEvent, STORAGE_KEY, timeLabel, timeSlots, type Activity, type PlanEvent, type StudyPlan } from '../../lib/study-plan';
import { downloadPlan } from '../../lib/study-plan-export';
import UiIcon from '../ui-icon';

function Icon({ name }: { name: string }) { return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name] || ICONS.star}/></svg>; }
type Editor = { event: PlanEvent; existing: boolean; library: boolean };
type Drag = { kind: 'activity'; activity: Activity } | { kind: 'event'; id: string };
const TIMES = timeSlots();
export default function Planner() {
  const [plan, setPlan] = useState<StudyPlan>(emptyPlan);
  const [ready, setReady] = useState(false), [storageBlocked, setStorageBlocked] = useState(false);
  const [notice, setNotice] = useState(''), [saved, setSaved] = useState(false);
  const [day, setDay] = useState(0), [selected, setSelected] = useState<Activity | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null), [formError, setFormError] = useState('');
  const [drag, setDrag] = useState<Drag | null>(null), [target, setTarget] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false), [downloadOpen, setDownloadOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), dragRef = useRef<Drag | null>(null);
  const resizeRef = useRef<{ id: string; y: number; duration: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; duration: number } | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setPlan(readPlan(raw)); }
    catch { setStorageBlocked(true); setNotice('Kayıtlı plan okunamadı veya tarayıcı kayda izin vermiyor. Mevcut kayıt korunuyor; indirme kullanabilirsiniz.'); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    setSaved(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); setSaved(true); } catch { setNotice('Otomatik kayıt yapılamadı. Planınızı indirin; bu sekmede çalışmaya devam edebilirsiniz.'); }
  }, [plan, ready, storageBlocked]);
  useEffect(() => {
    if (!editor || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current.showModal();
    return () => { previous?.focus(); };
  }, [!!editor]);
  const library = [...(plan.level ? activities(plan.level) : []), ...plan.custom];
  function commit(event: PlanEvent) {
    const problem = eventProblem(event, plan.events);
    if (problem) { setNotice(problem); return false; }
    setPlan(p => saveEvent(p, event)); setNotice(`${event.name} · ${DAYS[event.day]} ${timeLabel(event.start)} olarak kaydedildi.`); return true;
  }
  function openEditor(event?: PlanEvent, atDay = day, start = plan.start, asLibrary = false) {
    const activity = selected || library[0] || { id: '', name: '', icon: 'star', color: COLORS[0] };
    setFormError('');
    setEditor({ event: event || { ...activity, id: crypto.randomUUID(), name: asLibrary ? '' : activity.name, day: atDay, start, duration: 30 }, existing: !!event, library: asLibrary });
  }
  function startDrag(event: DragEvent, value: Drag) {
    dragRef.current = value; setDrag(value);
    event.dataTransfer.effectAllowed = value.kind === 'event' ? 'move' : 'copy';
    event.dataTransfer.setData('text/plain', 'kurumsal-study-card');
  }
  function stopDrag() { dragRef.current = null; setDrag(null); setTarget(null); }
  function dropped(atDay: number, start: number) {
    const value = dragRef.current;
    if (value) {
      const previous = value.kind === 'event' ? plan.events.find(e => e.id === value.id) : null;
      const event = value.kind === 'activity' ? { ...value.activity, id: crypto.randomUUID(), day: atDay, start, duration: 30 } : previous ? { ...previous, day: atDay, start } : null;
      if (event) commit(event);
    }
    stopDrag();
  }
  function changeDraft(value: Partial<PlanEvent>) { setEditor(e => e ? { ...e, event: { ...e.event, ...value } } : null); setFormError(''); }
  function submitEditor() {
    if (!editor) return;
    if (editor.library) {
      const problem = eventProblem(editor.event, []);
      if (problem) { setFormError(problem); return; }
      if (plan.custom.length >= 200) { setFormError('En fazla 200 özel etkinlik ekleyebilirsiniz.'); return; }
      const { id, name, color, icon } = editor.event;
      const custom = { id, name: name.trim(), color, icon };
      setPlan(p => ({ ...p, custom: [...p.custom, custom] })); setSelected(custom);
    } else {
      const problem = eventProblem(editor.event, plan.events);
      if (problem) { setFormError(problem); return; }
      commit(editor.event);
    }
    setEditor(null);
  }
  async function download(format: 'pdf' | 'jpg' | 'xlsx') {
    setExporting(true); setNotice('Çıktınız hazırlanıyor…');
    try { await downloadPlan(plan, format); setNotice(`${format.toLocaleUpperCase('tr-TR')} dosyası hazırlandı.`); setDownloadOpen(false); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'İndirme yapılamadı. Tekrar deneyin.'); }
    finally { setExporting(false); }
  }
  if (!ready) return <p className="study-loading" role="status">Planlayıcı açılıyor…</p>;
  return <>
    <section className="study-heading"><div><p className="study-eyebrow">ZAMANIN SANA AİT</p><h1>Çalışmaya da, hayata da yer aç.</h1><p>Derslerini yerleştir, molalarını unutma. Sana uyan bir hafta tasarla.</p></div><span className="study-privacy"><UiIcon name="check"/> Giriş gerekmez · Planın bu tarayıcıda</span></section>
    {!plan.level ? <section className="study-levels" aria-labelledby="level-heading"><h2 id="level-heading">Nereden başlayalım?</h2><p>Seviyeni seç; ders kartlarını senin için hazırlayalım.</p><div>{LEVELS.map((level, i) => <button key={level} style={{ '--enter-delay': `${i * 75}ms`, '--level-color': COLORS[i] } as CSSProperties} onClick={() => setPlan(p => ({ ...p, level }))}><Icon name={['book', 'globe', 'science', 'star'][i]}/><strong>{level}</strong><span>{['Keşfet, öğren, oyna.', 'Dengeli bir ritim kur.', 'Hedeflerine zaman ayır.', 'Kendi kartlarınla başla.'][i]}</span></button>)}</div></section> : <section className="study-workspace" aria-label="Haftalık planlayıcı">
      <div className="study-toolbar"><label className="study-plan-name">Planın adı<input aria-label="Planın adı" maxLength={100} value={plan.name} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))}/></label><span className="study-save" role="status">{storageBlocked ? 'Kayıt kullanılamıyor' : saved ? 'Bu tarayıcıya kaydedildi' : 'Kaydediliyor…'}</span><div className="study-download"><button className="button button-navy" disabled={exporting} aria-expanded={downloadOpen} aria-controls="study-download-options" onClick={() => setDownloadOpen(v => !v)}><UiIcon name="download"/>{exporting ? 'Hazırlanıyor…' : 'İndir'}</button>{downloadOpen && <div id="study-download-options"><button disabled={exporting} onClick={() => void download('pdf')}>Yatay A4 PDF</button><button disabled={exporting} onClick={() => void download('jpg')}>JPG görsel</button><button disabled={exporting} onClick={() => void download('xlsx')}>Düzenlenebilir Excel (.xlsx)</button></div>}</div></div>
      <div className="study-body"><aside className="study-library" aria-label="Etkinlik kartları"><div className="study-library-top"><h2>Etkinlikler</h2><select aria-label="Eğitim seviyesi" value={plan.level} onChange={e => { setPlan(p => ({ ...p, level: e.target.value as StudyPlan['level'] })); setSelected(null); }}>{LEVELS.map(level => <option key={level}>{level}</option>)}</select></div><p>Kartı sürükle veya seçip takvimde boş bir saate dokun.</p><div className="study-activities">{library.map(activity => <div className="study-activity-wrap" key={activity.id}><button className="study-activity" draggable onDragStart={e => startDrag(e, { kind: 'activity', activity })} onDragEnd={stopDrag} aria-pressed={selected?.id === activity.id} onClick={() => setSelected(activity)} style={{ '--card-color': activity.color } as CSSProperties}><Icon name={activity.icon}/><span>{activity.name}</span><span className="study-grip" aria-hidden="true">⠿</span></button>{plan.custom.some(a => a.id === activity.id) && <button className="study-custom-remove" aria-label={`${activity.name} kartını kaldır`} onClick={() => { setPlan(p => ({ ...p, custom: p.custom.filter(a => a.id !== activity.id) })); if (selected?.id === activity.id) setSelected(null); }}><UiIcon name="close"/></button>}</div>)}</div><button className="study-add-custom" onClick={() => openEditor(undefined, day, plan.start, true)}><UiIcon name="add"/>Kendi etkinliğini ekle</button></aside>
      <div className="study-calendar-area"><div className="study-calendar-settings"><div><h2>Bir haftan, bir bakışta.</h2><p>30 dakikalık dilimler · Kartlara dokunarak düzenle.</p></div><div className="study-time-range"><label>Başlangıç<select aria-label="Görünen başlangıç saati" value={plan.start} onChange={e => setPlan(p => ({ ...p, start: +e.target.value }))}>{TIMES.filter(t => t < plan.end).map(t => <option value={t} key={t}>{timeLabel(t)}</option>)}</select></label><label>Bitiş<select aria-label="Görünen bitiş saati" value={plan.end} onChange={e => setPlan(p => ({ ...p, end: +e.target.value }))}>{[...TIMES, 1440].filter(t => t > plan.start).map(t => <option value={t} key={t}>{timeLabel(t)}</option>)}</select></label></div></div>
        <div className="study-day-tabs" role="tablist" aria-label="Gün seç">{DAYS.map((label, i) => <button key={label} id={`day-tab-${i}`} role="tab" aria-selected={day === i} aria-controls={`study-day-${i}`} onClick={() => setDay(i)}>{label}</button>)}</div>
        {plan.events.some(e => e.start < plan.start || e.start + e.duration > plan.end) && <p className="study-out-of-range">Görünen saatlerin dışında da etkinliklerin var. İndirilen plana tüm etkinlikler dahil edilir.</p>}
        <div className={`study-calendar ${drag ? 'study-dragging' : ''}`}><div className="study-time-column"><div className="study-day-heading">Saat</div>{timeSlots(plan.start, plan.end).map(t => <div className="study-time-label" key={t}>{timeLabel(t)}</div>)}</div>
          {DAYS.map((label, atDay) => <section className={`study-day ${day === atDay ? 'study-day-selected' : ''}`} id={`study-day-${atDay}`} aria-label={label} key={label}><h3 className="study-day-heading">{label}</h3><div className="study-day-slots" onDragOver={ev => { if (!dragRef.current) return; ev.preventDefault(); const slot = Math.max(plan.start, Math.min(plan.end - 30, plan.start + Math.floor((ev.clientY - ev.currentTarget.getBoundingClientRect().top) / 44) * 30)); setTarget(`${atDay}-${slot}`); }} onDrop={ev => { ev.preventDefault(); const slot = Math.max(plan.start, Math.min(plan.end - 30, plan.start + Math.floor((ev.clientY - ev.currentTarget.getBoundingClientRect().top) / 44) * 30)); dropped(atDay, slot); }}>{timeSlots(plan.start, plan.end).map(start => {
            const key = `${atDay}-${start}`;
            return <button key={start} className={`study-slot ${target === key ? 'study-slot-target' : ''}`} aria-label={`${label} ${timeLabel(start)} etkinlik ekle`} onClick={() => openEditor(undefined, atDay, start)} onDragOver={e => { if (dragRef.current) { e.preventDefault(); setTarget(key); } }} onDragLeave={() => setTarget(v => v === key ? null : v)} onDrop={e => { e.preventDefault(); e.stopPropagation(); dropped(atDay, start); }}>{target === key ? timeLabel(start) : ''}</button>;
          })}{plan.events.filter(e => e.day === atDay && e.start < plan.end && e.start + e.duration > plan.start).map(e => {
            const shownStart = Math.max(e.start, plan.start), duration = resize?.id === e.id ? resize.duration : e.duration;
            const visibleEnd = Math.min(e.start + duration, plan.end);
            return <div key={e.id} className="study-event" style={{ top: `${(shownStart - plan.start) / 30 * 44}px`, height: `${(visibleEnd - shownStart) / 30 * 44 - 3}px`, '--card-color': e.color } as CSSProperties}>
              <button className="study-event-content" draggable onDragStart={ev => startDrag(ev, { kind: 'event', id: e.id })} onDragEnd={stopDrag} onClick={() => openEditor(e)} aria-label={`${e.name}, ${label}, ${timeLabel(e.start)}–${timeLabel(e.start + e.duration)}, düzenle`}><Icon name={e.icon}/><span><strong>{e.name}</strong>{duration >= 60 && <small>{timeLabel(e.start)}–{timeLabel(e.start + duration)}</small>}</span></button>
              <button className="study-resize" aria-label={`${e.name} süresini değiştir`} onClick={ev => { if (ev.detail === 0) openEditor(e); }} onPointerDown={ev => { if (ev.pointerType === 'touch') return; ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); resizeRef.current = { id: e.id, y: ev.clientY, duration: e.duration }; setResize({ id: e.id, duration: e.duration }); }} onPointerMove={ev => { const r = resizeRef.current; if (r?.id === e.id) setResize({ id: e.id, duration: Math.min(1440 - e.start, Math.max(30, r.duration + Math.round((ev.clientY - r.y) / 44) * 30)) }); }} onPointerUp={ev => { const r = resizeRef.current; if (!r || r.id !== e.id) return; const next = Math.min(1440 - e.start, Math.max(30, r.duration + Math.round((ev.clientY - r.y) / 44) * 30)); resizeRef.current = null; setResize(null); commit({ ...e, duration: next }); }} onPointerCancel={() => { resizeRef.current = null; setResize(null); }}><span/></button>
            </div>;
          })}</div></section>)}
        </div>
      </div></div>
    </section>}
    <p className="study-notice" role="status" aria-live="polite">{notice || 'Dengeli bir plan, küçük adımlarla başlar.'}</p>
    {editor && <dialog ref={dialog} className="study-dialog" aria-labelledby="study-editor-title" onCancel={() => setEditor(null)} onClick={e => { if (e.target === e.currentTarget) setEditor(null); }}><form onSubmit={e => { e.preventDefault(); submitEditor(); }}><div className="study-dialog-heading"><h2 id="study-editor-title">{editor.library ? 'Kendi etkinliğin' : editor.existing ? 'Etkinliği düzenle' : 'Etkinlik ekle'}</h2><button type="button" aria-label="Kapat" onClick={() => setEditor(null)}><UiIcon name="close"/></button></div>
      {!editor.library && <label>Hazır kart<select aria-label="Hazır etkinlik" value="" onChange={e => { const a = library.find(a => a.id === e.target.value); if (a) changeDraft({ name: a.name, color: a.color, icon: a.icon }); }}><option value="">Bir kart seç veya aşağıya adını yaz</option>{library.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>}
      <label>Etkinlik adı<input aria-label="Etkinlik adı" autoFocus required maxLength={100} value={editor.event.name} onChange={e => changeDraft({ name: e.target.value })}/></label>
      <div className="study-editor-style"><label>Renk<input aria-label="Renk" type="color" value={editor.event.color} onChange={e => changeDraft({ color: e.target.value })}/></label><label>Simge<select aria-label="Simge" value={editor.event.icon} onChange={e => changeDraft({ icon: e.target.value })}>{Object.keys(ICONS).map((icon, i) => <option key={icon} value={icon}>{ICON_LABELS[i]}</option>)}</select></label><span className="study-style-preview" style={{ color: editor.event.color }}><Icon name={editor.event.icon}/></span></div>
      {!editor.library && <div className="study-editor-time"><label>Gün<select aria-label="Gün" value={editor.event.day} onChange={e => changeDraft({ day: +e.target.value })}>{DAYS.map((label, i) => <option value={i} key={label}>{label}</option>)}</select></label><label>Başlangıç<select aria-label="Başlangıç" value={editor.event.start} onChange={e => changeDraft({ start: +e.target.value })}>{TIMES.map(t => <option key={t} value={t}>{timeLabel(t)}</option>)}</select></label><label>Süre<select aria-label="Süre" value={editor.event.duration} onChange={e => changeDraft({ duration: +e.target.value })}>{timeSlots(30, 1470).map(t => <option key={t} value={t}>{t < 60 ? `${t} dakika` : `${Math.floor(t / 60)} saat${t % 60 ? ' 30 dakika' : ''}`}</option>)}</select></label></div>}
      {formError && <p className="study-form-error" role="alert">{formError}</p>}
      <div className="study-editor-actions">{editor.existing && <button type="button" className="study-delete" onClick={() => { setPlan(p => ({ ...p, events: p.events.filter(e => e.id !== editor.event.id) })); setNotice('Etkinlik silindi.'); setEditor(null); }}>Etkinliği sil</button>}<button type="button" onClick={() => setEditor(null)}>Vazgeç</button><button type="submit" className="button button-navy">Kaydet</button></div>
    </form></dialog>}
  </>;
}
