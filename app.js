/* StriveFit – Full App (compact, with improved Home) */
(() => {
    const $ = (s, c = document) => c.querySelector(s)
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s))
    const JSON_PLAN_URL = './data/plan.json'
    const JSON_EX_DICT_URL = './data/exercises.json'

    const state = {
        view: 'home',
        training: {
            substate: 'list',
            currentWeek: 1,
            currentDay: 1,
            currentExerciseIndex: 0,
            currentSet: 1,
            countdownLeft: 15,
            timedLeft: 0,
            restLeft: 0,
            timerPaused: false
        },
        plan: null,
        exDict: new Map(),
        stats: JSON.parse(localStorage.getItem('sf_stats') || '{}'),
        settings: JSON.parse(localStorage.getItem('sf_settings') || '{}'),
        userPlans: JSON.parse(localStorage.getItem('sf_plans') || '[]'),
        currentPlanId: localStorage.getItem('sf_current_plan') || 'builtin',
        audio: {}
    }

    function saveSettings () { localStorage.setItem('sf_settings', JSON.stringify(state.settings)) }

    function saveUserPlans () { localStorage.setItem('sf_plans', JSON.stringify(state.userPlans)) }

    function saveCurrentPlanId (id) {
        state.currentPlanId = id
        localStorage.setItem('sf_current_plan', id)
    }

    function isBuiltinHidden () { return localStorage.getItem('sf_builtin_hidden') === '1' }

    function setBuiltinHidden (val) {
        if (val) {
            localStorage.setItem('sf_builtin_hidden', '1')
        } else {
            localStorage.removeItem('sf_builtin_hidden')
        }
        }

    // sounds
    function mkAudio (src, vol = 1) {
        const a = new Audio()
        a.src = src
        a.preload = 'auto'
        a.volume = vol
        a.onerror = () => { }
        return a
    }

    function loadAudio () {
        state.audio.whistle = mkAudio('./assets/whistle.wav', .8)
        state.audio.beep = mkAudio('./assets/beep.wav', .6)
        state.audio.applause = mkAudio('./assets/applause.wav', .7)
    }

    function play (a) {
        try {
            if (a) {
                a.currentTime = 0
                a.play?.()
            }
        } catch (_) { }
    }

    // TTS
    function speak (t) {
        if (!state.settings?.voiceEnabled) return
        if (!('speechSynthesis' in window)) return
        // corta cualquier frase en curso antes de hablar
        window.speechSynthesis.cancel()

        const u = new SpeechSynthesisUtterance(t)
        u.lang = 'es-ES'

        // intenta voz masculina/femenina si existe
        const voices = window.speechSynthesis.getVoices?.() || []
        if (state.settings.voiceGender === 'male') {
            const v = voices.find(v => /es/i.test(v.lang) && /male|hombre|mascul/i.test(v.name))
            if (v) u.voice = v
        } else {
            const v = voices.find(v => /es/i.test(v.lang) && /female|mujer|femen/i.test(v.name))
            if (v) u.voice = v
        }
        window.speechSynthesis.speak(u)
    }

    // schema helpers
    const stepId = s => s?.exercise_id ?? s?.id ?? s?.exerciseId ?? s?.code ?? null
    const stepTime = s => (s?.time ?? s?.seconds ?? null)
    const stepReps = s => {
        const r = s?.reps
        if (typeof r === 'number') return r
        if (typeof r === 'string') {
            const m = r.match(/\d+/)
            return m ? Number(m[0]) : null
        }
        return null
    }
    const stepSets = s => Number(s?.sets ?? 1) || 1

    function stepDisplayName (s, i = 0) {
        const sid = stepId(s)
        const ex = sid != null ? (state.exDict.get(String(sid)) || state.exDict.get(sid)) : null
        return ex?.name || s?.name || (sid != null ? String(sid) : `Ejercicio ${i + 1}`)
    }

    function normalizePlan (pl) {
        if (!pl || !Array.isArray(pl.weeks)) return defaultPlan()
        pl.weeks.forEach(w => {
            w.days = Array.isArray(w.days) ? w.days : []
            w.days.forEach(d => {
                d.exercises = Array.isArray(d.exercises) ? d.exercises : []
                d.exercises = d.exercises.map(x => ({
                    ...x,
                    id: x.id ?? x.exercise_id ?? x.exerciseId ?? x.code ?? x.name ?? null,
                    sets: stepSets(x),
                    seconds: stepTime(x) ?? (typeof x?.duration === 'number' ? x.duration : null),
                    reps: stepReps(x)
                }))
            })
        })
        return pl
    }

    function buildDict (list) {
        const m = new Map();
        (list || []).forEach(x => {
            const ids = [x.exercise_id, x.id, x.code].filter(Boolean)
            ids.forEach(k => m.set(String(k), { ...x, id: x.id ?? x.exercise_id ?? x.code }))
        })
        return m
    }

    function mergePlanNamesIntoDict () {
        try {
            (state.plan?.weeks || []).forEach(w => (w.days || []).forEach(d => (d.exercises || []).forEach(s => {
                const sid = stepId(s)
                if (sid != null && !state.exDict.has(String(sid))) state.exDict.set(String(sid), {
                    id: String(sid),
                    name: s.name || String(sid)
                })
            })))
        } catch (_) { }
    }

    function defaultPlan () {
        return {
            weeks: [{
                days: [{
                    rest: false,
                    exercises: [{ id: 'PUSHUP', reps: 12, sets: 3 }, { id: 'PLANK', seconds: 40, sets: 2 }, {
                        id: 'SQUAT',
                        reps: 10,
                        sets: 2
                    }]
                }, { rest: true, exercises: [] }, { rest: false, exercises: [{ id: 'PUSHUP', reps: 10, sets: 3 }] }]
            }]
        }
    }

    const MOTOS = ['Un poco cada día suma mucho.', 'Tu cuerpo te está viendo: háblale con hechos.', 'La constancia vence al talento.', 'Hoy cuenta. Mañana agradecerás este momento.', 'Respira, aprieta, progresa.', 'No perfecto, pero sí presente.', 'Fuerte es el hábito, no el impulso.']
    const dailyMotto = () => MOTOS[Math.floor(Date.now() / 86400000) % MOTOS.length]

    async function bootstrap () {
        try {
            const [rawPlan, dict] = await Promise.all([fetch(JSON_PLAN_URL).then(r => r.ok ? r.json() : Promise.reject('plan')), fetch(JSON_EX_DICT_URL).then(r => r.ok ? r.json() : Promise.reject('dict'))])
            state.plan = normalizePlan(rawPlan)
            state.exDict = buildDict(dict?.exercises || [])
            mergePlanNamesIntoDict()
        } catch (_) {
            state.plan = defaultPlan()
            state.exDict = new Map([['PUSHUP', { id: 'PUSHUP', name: 'Flexiones' }], ['PLANK', {
                id: 'PLANK',
                name: 'Plancha'
            }], ['SQUAT', { id: 'SQUAT', name: 'Sentadilla' }]])
        }
        state.settings = Object.assign({
            voiceEnabled: true,
            voiceGender: 'female',
            countdownSpokenSeconds: [10, 5, 3],
            speakExerciseName: true,
            restBetweenSets: null,
            restBetweenExercises: null
        }, state.settings || {})
        loadAudio()
        render()

        // Tema
        initTheme()
        document.querySelector('[data-action="toggle-theme"]')?.addEventListener('click', toggleTheme)

    }

    // ---------- Home (improved)
    function viewHome () {
        return `
      ${renderWeekMini()}
      ${renderChallenges()}
    `
    }

    function renderHero () {
        return `<section class="mb-3">
      <div class="hero">
        <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop" alt="Entrena">
        <div class="overlay"></div>
        <div class="motto">${dailyMotto()}</div>
      </div>
    </section>`
    }

    // ── Auxiliar: ¿está completado ese día?
    function isDayCompleted (wi, di) {
        return isDayCompletedFor(getCurrentPlanId(), wi, di)

        // const d = state.plan?.weeks?.[weekIdx]?.days?.[dayIdx];
        // if (d?.completed) return true;
        // const key = `${weekIdx + 1}-${dayIdx + 1}`;
        // return !!state?.stats?.daysCompleted?.[key];
    }

    // ── Auxiliar: icono para el estado del día
    function dayIcon (day, completed) {
        if (day?.rest) return '<i class="bi bi-cup-hot"></i>'               // descanso
        if (completed) return '<i class="bi bi-check-circle-fill"></i>'   // hecho
        return '<i class="bi bi-circle"></i>'                               // pendiente
    }

    // ── Auxiliar: pinta un “pill” de día (para HOME)
    function homeDayPill (day, dayNumber, completed, today1) {
        const base = 'day-pill text-center p-2 rounded bg-body-tertiary'
        const cls = day?.rest ? `${base} day-rest` : (completed ? `${base} day-done` : base)
        const icon = iconForDay(day, { completed, index1: dayNumber, today1 })

        return `
            <div class="${cls}">
              <div class="day-number">${dayNumber}</div>
              <div class="day-icon">${icon}</div>
            </div>`
    }

    // Info del plan activo (nombre y data)
    function getActivePlanInfo () {
        if (state.currentPlanId === 'builtin') {
            return { id: 'builtin', name: 'Plan por defecto', data: defaultPlan() }
        }
        const p = (state.userPlans || []).find(x => x.id === state.currentPlanId)
        return p ? { id: p.id, name: p.name, data: normalizePlan(p.data) } : {
            id: 'builtin',
            name: 'Plan por defecto',
            data: defaultPlan()
        }
    }

    function activePlanMeta () {
        const m = state.plan?.meta || getActivePlanInfo().data?.meta || {}
        return {
            title: getActivePlanInfo().name || 'Entrenamiento',
            image: m.image || 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?q=80&w=1600&auto=format&fit=crop',
            level: m.level || '—',
            goal: m.goal || '—',
            muscles: m.muscles || [],
            equipment: m.equipment || [],
            avg_minutes: m.avg_minutes ?? null,
            doc_links: m.doc_links || [],
            description: m.description || ''
        }
    }

    function renderPlanMetaHeader () {
        const m = activePlanMeta()
        const { planPct } = planProgress(state.plan) // usa tu helper de progreso global
        const pct = getPlanProgressPct()

        return `
    <div class="card plan-card plan-cover mb-3" style="--cover: url('${m.image}')">
      <div class="card-body">
        <h4 class="mb-3">${m.title}</h4>

        <div class="progress-thick mb-3">
          <span class="progress-bar" style="width: ${pct}%"></span>
          <div class="progress-label">${pct}%</div>
        </div>

        <div class="row row-cols-3 g-2 mb-2">
          <div class="col"><div class="stat-tile"><div class="big">${m.avg_minutes ?? estimatePlanAvgMinutes()}</div><div class="small">min/día</div></div></div>
          <div class="col"><div class="stat-tile"><div class="big text-capitalize">${m.level}</div><div class="small">nivel</div></div></div>
          <div class="col"><div class="stat-tile"><div class="big">${(m.muscles || []).length || '—'}</div><div class="small">grupos</div></div></div>
        </div>

        <div class="d-grid mt-2">
          <button class="btn btn-light text-dark btn-sm" data-action="show-plan-details"><i class="bi bi-info-circle me-1"></i>Ver detalles</button>
        </div>
      </div>
    </div>`
    }

    function renderDayMetaHeader () {
        const info = getActivePlanInfo()
        const { day } = dayContext()
        const ex0 = day?.exercises?.[0] || null
        const firstName = ex0 ? stepDisplayName(ex0, 0) : info.name

        // URL segura para CSS var(--cover)
        const fallback = activePlanMeta().image
        const raw = ex0 ? exerciseImageFor(ex0, firstName) : fallback
        const safe = String(raw || fallback).replace(/["\\)]/g, '\\$&') // escapa comillas y paréntesis
        const coverStyle = `--cover: url("${safe}")`

        const minutes = estimateDayMinutes(day)
        const exCount = (day?.exercises || []).length

        return `
    <div class="card plan-card plan-cover mb-3" style='${coverStyle}'>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <h5 class="mb-0">${info.name}</h5>
          <span class="badge text-bg-secondary">Día ${state.training.currentDay}</span>
        </div>

        <div class="row row-cols-3 g-2 mt-2">
          <div class="col"><div class="stat-tile"><div class="big">${minutes}</div><div class="small">min</div></div></div>
          <div class="col"><div class="stat-tile"><div class="big">${exCount}</div><div class="small">ejercicios</div></div></div>
          <div class="col"><div class="stat-tile"><div class="big">${state.training.currentWeek}</div><div class="small">semana</div></div></div>
        </div>

        <div class="d-grid mt-2">
          <button class="btn btn-light text-dark btn-sm" data-action="show-plan-details">
            <i class="bi bi-info-circle me-1"></i>Ver detalles del plan
          </button>
        </div>
      </div>
    </div>`
    }

    function estimatePlanAvgMinutes () {
        const days = (state.plan?.weeks || []).flatMap(w => w.days || [])
        if (!days.length) return 0
        const sum = days.reduce((acc, d) => acc + estimateDayMinutes(d), 0)
        return Math.round(sum / days.length)
    }

    // Cálculo de "completados/total" SOLO sobre días de entrenamiento (excluye descansos)
    function weekCompletionCounts (planData) {
        const first7 = (planData?.weeks?.[0]?.days || []).slice(0, 7)
        const total = first7.filter(d => !d?.rest).length
        const completed = first7.reduce((acc, d, idx) => acc + (!d?.rest && isDayCompleted(0, idx) ? 1 : 0), 0)
        return { completed, total }
    }

    // --- helpers de semana e iconos ---
    const WEEK_LEN = 7;

    // Rellena a 7 días; los faltantes se consideran descanso
        function padWeekTo7(days = []) {
            const out = (days || []).slice(0, WEEK_LEN);
            while (out.length < WEEK_LEN) out.push({ rest: true, exercises: [] });
            return out;
        }

    // Hoy (1=Lunes ... 7=Domingo)
        function todayIndex1to7() {
            const dow0 = new Date().getDay();          // 0=Dom..6=Sab
            return ((dow0 + 6) % 7) + 1;               // 1=Lun..7=Dom
        }

    // Icono según reglas
        function iconForDay(day, { completed, index1, today1 }) {
            if (day?.rest) return '<i class="bi bi-battery-half"></i>';          // 🔋 descanso
            if (completed)  return '<i class="bi bi-check-circle-fill"></i>';    // ✔️ completado
            if (index1 === today1) return '<span aria-hidden="true">🏋️</span>';  // 🏋️ hoy con entreno
            if (index1 < today1) return '<i class="bi bi-dash-circle"></i>';     // ⛔ pasado sin entrenar
            return '<i class="bi bi-circle"></i>';                               // ○ futuro sin completar
        }

    // ── Nuevo render: dos filas 1–4 y 5–7 + trofeo
    function renderWeekMini () {
        const planInfo = getActivePlanInfo()
        const { completed, total } = weekCompletionCounts(planInfo.data)

        const week = state.plan?.weeks?.[0]?.days || []
        const first7 = padWeekTo7(week)

        // trofeo "lit" si TODOS (incluidos descansos) están hechos
        const allDone = first7.length
            ? first7.every((d, idx) => d?.rest ? true : isDayCompleted(0, idx))
            : false

        const top = first7.slice(0, 4)
            .map((d, i) => homeDayPill(d, i + 1, isDayCompleted(0, i))).join('')

        const bottomDays = first7.slice(4, 7)
            .map((d, i) => homeDayPill(d, i + 5, isDayCompleted(0, i + 4))).join('')

        const trophyCls = `day-pill text-center p-2 rounded bg-body-tertiary day-trophy${allDone ? ' lit' : ''}`
        const trophy = `
            <div class="${trophyCls}">
              <div class="day-number">&nbsp;</div>
              <div class="day-icon"><i class="bi bi-trophy"></i></div>
            </div>`

        // cabecera con nombre del plan y "completados/total"
        const header = `
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="fw-semibold">${planInfo.name}</div>
              <div class="text-secondary">${completed}/${total}</div>
            </div>`

        return `
            <section class="mb-3">
              ${header}
              <div class="week-grid">${top}</div>
              <div class="week-grid mt-2" style="grid-template-columns: repeat(4, 1fr);">
                ${bottomDays}${trophy}
              </div>
            </section>`
    }

    function renderChallenges () {
        const hdr = `<div class="d-flex justify-content-between align-items-center mb-2">
    <h5 class="mb-0">Challenge</h5>
    <button class="btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addPlanModal"><i class="bi bi-plus-lg"></i></button>
  </div>`

        const user = (state.userPlans || []).map(p => ({ id: p.id, name: p.name, data: p.data }))
        const includeBuiltin = !isBuiltinHidden() || user.length === 0 // si no hay planes, forzamos builtin

        const cards = (includeBuiltin ? [{ id: 'builtin', name: 'Plan por defecto', data: defaultPlan() }] : [])
            .concat(user)
            .map(info => renderPlanCard(info))
            .join('')

        return `<section>${hdr}${cards || '<div class="text-secondary small">No hay entrenamientos aún. Pulsa + para añadir uno.</div>'}</section>`
    }

    function planStats (pl) {
        const weeks = pl?.weeks || []
        const days = weeks.flatMap(w => w.days || [])
        const totalDays = days.length || 1
        const done = 0
        const avgMin = Math.max(1, Math.round(days.slice(0, Math.min(days.length, 7)).reduce((acc, d) => {
            const secs = (d.exercises || []).reduce((s, ex) => {
                const sets = ex.sets || 1
                const per = (stepTime(ex) != null) ? stepTime(ex) : ((stepReps(ex) != null) ? stepReps(ex) * 2 : 30)
                return s + per * sets
            }, 0)
            return acc + (secs / 60)
        }, 0) / Math.max(1, Math.min(days.length, 7))))
        const nextDay = Math.max(1, days.findIndex(d => !d.rest) >= 0 ? (days.findIndex(d => !d.rest) + 1) : 1)
        return { totalDays, done, avgMin, nextDay }
    }

    function renderPlanCard (info) {
        const { totalDays, done, avgMin, nextDay } = planStats(info.data)
        const pct = Math.round((done / totalDays) * 100)
        const active = (state.currentPlanId === info.id)
        const cover = planCoverFor(info)

        const canDelete = info.id === 'builtin' ? (state.userPlans || []).length > 0 : true
        const trashBtn = canDelete
            ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-plan" data-plan="${info.id}" title="Borrar"><i class="bi bi-trash"></i></button>`
            : ''

        const activateBtn = active
            ? '<span class="badge text-bg-success">Activo</span>'
            : `<button class="btn btn-sm btn-outline-light" data-action="use-plan" data-plan="${info.id}">
         <i class="bi bi-check2-circle me-1"></i>Activar
       </button>`

        const startBtn = active
            ? `<div class="d-grid">
         <button class="btn btn-light text-dark btn-lg" data-action="start-from-card" data-plan="${info.id}">
           <i class="bi bi-play-fill me-1"></i>Start
         </button>
       </div>`
            : ''

        const startRow = `
    <div class="btn-split mt-2">
    <button class="btn btn-reset-plan btn-20" title="Reiniciar progreso"
            data-action="reset-plan" data-plan="${info.id}">
      <i class="bi bi-arrow-counterclockwise"></i>
    </button>
    ${active ? `
      <button class="btn btn-light text-dark btn-lg btn-80" data-action="start-from-card" data-plan="${info.id}">
        <i class="bi bi-play-fill me-1"></i>Start
      </button>` : `
      <button class="btn btn-outline-light btn-lg btn-80" data-action="use-plan" data-plan="${info.id}">
        <i class="bi bi-check2-circle me-1"></i>Activar
      </button>`
        }
    </div>`

        return `<div class="card plan-card plan-cover mb-3" style="--cover: url('${cover}')">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">${info.name}</h5>
          <div class="d-flex gap-2 align-items-center">
            ${active ? '<span class="badge text-bg-success">Activo</span>' :
            `<button class="btn btn-sm btn-outline-light" data-action="use-plan" data-plan="${info.id}">
                 <i class="bi bi-check2-circle me-1"></i>Activar
               </button>`}
            ${/* papelera (con modal) */''}
            ${(info.id === 'builtin' ? (state.userPlans || []).length > 0 : true)
            ? `<button class="btn btn-sm btn-outline-danger" data-action="prompt-delete-plan" data-plan="${info.id}" data-plan-name="${info.name}">
                     <i class="bi bi-trash"></i>
                   </button>` : ''}
          </div>
        </div>
    
        <div class="meta mt-2">~${avgMin} min/día • Próximo día: <strong>${nextDay}</strong></div>
        <div class="progress my-3"><div class="progress-bar" style="width:${pct}%"></div></div>
    
        ${startRow}
      </div>
    </div>`

    }

    function planCoverFor (info) {
        // Si tu JSON trae imagen: info.data?.meta?.image o info.image
        const fromMeta = info?.data?.meta?.image || info?.image
        if (fromMeta) return fromMeta

        // Fallbacks por nombre (rápidos y vistosos)
        const n = (info?.name || '').toLowerCase()
        if (n.includes('full body')) return 'https://images.unsplash.com/photo-1534367610401-9f51f18b7135?q=80&w=1600&auto=format&fit=crop'
        if (n.includes('hiit')) return 'https://images.unsplash.com/photo-1521805103424-d8f8430e8937?q=80&w=1600&auto=format&fit=crop'
        if (n.includes('core') || n.includes('abs'))
            return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1600&auto=format&fit=crop'
        // genérico
        return 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?q=80&w=1600&auto=format&fit=crop'
    }

    // ---------- Render & views
    function render () {
        const host = $('#appContent')
        if (!host) return
        $$('#bottomNav .nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === state.view))
        if (state.view === 'home') host.innerHTML = viewHome()
        else if (state.view === 'training') host.innerHTML = viewTraining()
        else if (state.view === 'progress') host.innerHTML = `<div class="alert alert-secondary">Resumen próximamente.</div>`
        else if (state.view === 'settings') host.innerHTML = viewSettings()
        bindEvents()
    }

    function viewSettings () {
        const s = state.settings = Object.assign({
            voiceEnabled: true,
            voiceGender: 'female',
            countdownSpokenSeconds: [10, 5, 3],
            speakExerciseName: true,
            restBetweenSets: null,
            restBetweenExercises: null
        }, state.settings || {})
        const seconds = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
        const checks = seconds.map(sec => {
            const checked = s.countdownSpokenSeconds.includes(sec) ? 'checked' : ''
            return `<div class="form-check form-check-inline mb-2">
        <input class="form-check-input" type="checkbox" value="${sec}" id="sec${sec}" ${checked}>
        <label class="form-check-label" for="sec${sec}">${sec}s</label>
      </div>`
        }).join('')
        return `
      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Voz</h5>
        <div class="form-check form-switch mb-2">
          <input class="form-check-input" type="checkbox" id="voiceEnabled" ${s.voiceEnabled ? 'checked' : ''}>
          <label class="form-check-label" for="voiceEnabled">Activar voz</label>
        </div>
        <div class="mb-2">
          <label class="form-label">Voz</label>
          <select class="form-select" id="voiceGender">
            <option value="female" ${s.voiceGender === 'female' ? 'selected' : ''}>Femenina</option>
            <option value="male" ${s.voiceGender === 'male' ? 'selected' : ''}>Masculina</option>
          </select>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="speakExerciseName" ${s.speakExerciseName ? 'checked' : ''}>
          <label class="form-check-label" for="speakExerciseName">Decir el nombre del ejercicio</label>
        </div>
        <div class="mb-2">
          <label class="form-label">Avisos hablados en cuenta atrás</label><br>${checks}
        </div>
      </div></div>

      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Tiempos de descanso</h5>
        <div class="row g-3">
          <div class="col-6">
            <label class="form-label">Entre series (s)</label>
            <input type="number" min="0" class="form-control" id="restBetweenSets" value="${s.restBetweenSets ?? ''}">
          </div>
          <div class="col-6">
            <label class="form-label">Entre ejercicios (s)</label>
            <input type="number" min="0" class="form-control" id="restBetweenExercises" value="${s.restBetweenExercises ?? ''}">
          </div>
        </div>
      </div></div>

      <div class="bottom-cta d-grid gap-2">
        <button class="btn btn-primary btn-lg" data-action="save-settings"><i class="bi bi-save me-2"></i>Guardar</button>
      </div>`
    }

    function bindEvents () {
        // bottom nav
        // NAV inferior: activar pestaña y navegar
        $$('#bottomNav .nav-link').forEach(btn => {
            btn.onclick = () => {
                // estado visual activo
                $$('#bottomNav .nav-link').forEach(b => b.classList.remove('active'))
                btn.classList.add('active')

                // cambiar vista
                state.view = btn.dataset.view
                render()
            }
        })

        // page-level
        $$('#appContent [data-view]').forEach(el => el.onclick = () => {
            state.view = el.dataset.view
            render()
        })

        // modal upload
        $('[data-action="upload-plan"]')?.addEventListener('click', uploadPlanFromFile)

        // plan activation
        $$('#appContent [data-action="use-plan"]').forEach(b => b.onclick = () => usePlan(b.dataset.plan))
        $$('#appContent [data-action="start-from-card"]').forEach(b => b.onclick = () => {
            const id = b.dataset.plan
            if (id && id !== 'builtin') {
                const p = (state.userPlans || []).find(x => x.id === id)
                if (p) {
                    state.plan = normalizePlan(p.data)
                    saveCurrentPlanId(id)
                    mergePlanNamesIntoDict()
                }
            }
            if (id === 'builtin') {
                saveCurrentPlanId('builtin')
                state.plan = defaultPlan()
                mergePlanNamesIntoDict()
            }
            state.view = 'training'
            render()
        })
        // Borrar plan
        $$('#appContent [data-action="delete-plan"]').forEach(b => {
            b.onclick = () => deletePlan(b.dataset.plan)
        })

        $('[data-action="show-plan-details"]')?.addEventListener('click', showPlanDetails)

        // settings
        $('[data-action="save-settings"]')?.addEventListener('click', () => {
            state.settings.voiceEnabled = !!$('#voiceEnabled')?.checked
            state.settings.voiceGender = $('#voiceGender')?.value || 'female'
            state.settings.speakExerciseName = !!$('#speakExerciseName')?.checked
            const secs = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
            state.settings.countdownSpokenSeconds = secs.filter(n => $('#sec' + n)?.checked)
            const a = Number($('#restBetweenSets')?.value)
            state.settings.restBetweenSets = (Number.isFinite(a) && a >= 0) ? a : null
            const b = Number($('#restBetweenExercises')?.value)
            state.settings.restBetweenExercises = (Number.isFinite(b) && b >= 0) ? b : null
            saveSettings()
            const btn = $('[data-action="save-settings"]')
            if (btn) {
                btn.disabled = true
                btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Guardado'
                setTimeout(() => {
                    btn.disabled = false
                    btn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar'
                }, 1200)
            }
        })
        // catalog button
        $('[data-action="open-catalog"]')?.addEventListener('click', renderCatalogOffcanvas)
        $$('#appContent [data-action="pick-day"]').forEach(b => {
            b.onclick = () => {
                state.training.currentWeek = Number(b.dataset.week)
                state.training.currentDay = Number(b.dataset.day)
                state.training.substate = 'day'
                render()
            }
        })

        $('[data-action="go-today"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            const next = computeNextDayToDo()
            state.training.currentWeek = next.week
            state.training.currentDay = next.day
            state.training.substate = 'day'
            render()
        })

        // DAY LIST
        $('[data-action="back-to-list"]')?.addEventListener('click', () => {
            state.training.substate = 'list'
            render()
        })
        $('[data-action="start-training"]')?.addEventListener('click', () => {
            state.training.substate = 'countdown'
            state.training.countdownLeft = 15
            render()
            updateNavVisibility()
            runCountdown()
        })

        // COUNTDOWN
        $('[data-action="cancel-to-day"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            clearInterval(timerId)
            state.training.substate = 'day'
            updateNavVisibility()
            render()
        })

        // EXERCISE
        $$('#appContent [data-action="help-ex"]').forEach(btn => {
            btn.addEventListener('click', () => showExerciseHelpById(btn.dataset.exerciseId))
        })
        // Exercise
        $('[data-action="prev-ex"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            prevExercise()
        })
        $('[data-action="next-ex"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            nextExercise()
        })
        $('[data-action="complete-set"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            completeSet()
        })
        $('[data-action="finish-now"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            completeExercise()
        })

        $('[data-action="end-rest"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            endRest()
        })

        // Rest
        $('[data-action="extend-rest"]')?.addEventListener('click', () => {
            state.training.restLeft += 10
            const n = $('#restNum')
            if (n) n.textContent = state.training.restLeft
        })
        $('[data-action="end-rest"]')?.addEventListener('click', endRest)

        // Countdown / navegación
        $('[data-action="skip-countdown"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            clearInterval(timerId)
            startExercise()
        })

        // FINISH
        $('[data-action="finish-now"]')?.addEventListener('click', jumpToFinished)
        $('[data-action="finish-session"]')?.addEventListener('click', () => {
            stopAllTimersAndVoice()
            state.training = subTrainingInitial()
            state.view = 'training'
            render()
            updateNavVisibility()
        })

        // Abrir modal reset
        $$('#appContent [data-action="reset-plan"]').forEach(b => {
            b.onclick = () => {
                const id = b.dataset.plan
                const name = (state.userPlans || []).find(p => p.id === id)?.name || (id === 'builtin' ? 'Plan por defecto' : id)
                $('#resetPlanName').textContent = name
                $('#confirmResetPlanBtn').dataset.plan = id
                const m = window.bootstrap.Modal.getOrCreateInstance('#resetPlanModal')
                m.show()
            }
        })

        // Confirmar reset
        $('#confirmResetPlanBtn')?.addEventListener('click', (ev) => {
            const id = ev.currentTarget.dataset.plan
            performResetPlanProgress(id)
            window.bootstrap.Modal.getInstance('#resetPlanModal')?.hide()
            render()
        })

        // Abrir modal borrar
        $$('#appContent [data-action="prompt-delete-plan"]').forEach(b => {
            b.onclick = () => {
                const id = b.dataset.plan
                const name = b.dataset.planName || id
                $('#deletePlanName').textContent = name
                $('#confirmDeletePlanBtn').dataset.plan = id
                const m = window.bootstrap.Modal.getOrCreateInstance('#deletePlanModal')
                m.show()
            }
        })

// Confirmar borrado
        $('#confirmDeletePlanBtn')?.addEventListener('click', (ev) => {
            const id = ev.currentTarget.dataset.plan
            deletePlan(id)  // tu función real de borrado (la que ya tenías)
            window.bootstrap.Modal.getInstance('#deletePlanModal')?.hide()
            render()
        })

    }

    function renderCatalogOffcanvas () {
        const all = Array.from(state.exDict?.values?.() || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        const help = $('#helpContent')
        if (!all.length) { help.innerHTML = '<p class="text-secondary">No hay entradas en el catálogo.</p>' } else {
            const accId = 'catalogAcc'
            const items = all.map((ex, idx) => {
                const headId = `exHead${idx}`, colId = `exColl${idx}`
                const muscles = [...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])].join(', ')
                const tags = (ex.tags || []).join(' ')
                const haystack = `${(ex.name || '').toLowerCase()} ${muscles.toLowerCase()} ${tags.toLowerCase()}`
                const video = ex.video ? embedVideoHTML(ex.video, ex.name || ex.id) : '';
                const cues = Array.isArray(ex.cues) && ex.cues.length ? `<ul class="small mb-2">${ex.cues.map(c => `<li>${c}</li>`).join('')}</ul>` : ''
                return `<div class="accordion-item" data-haystack="${haystack}">
                    <h2 class="accordion-header" id="${headId}">
                      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${colId}" aria-expanded="false" aria-controls="${colId}">
                        ${ex.name || ex.id}
                      </button>
                    </h2>
                    <div id="${colId}" class="accordion-collapse collapse" aria-labelledby="${headId}" data-bs-parent="#${accId}">
                      <div class="accordion-body">
                        ${ex.description ? `<p class="mb-2">${ex.description}</p>` : ''}
                        ${cues}
                        ${video}
                      </div>
                    </div>
                  </div>`
            }).join('')

            help.innerHTML = `
      <div class="mb-3">
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="search" class="form-control" id="catalogSearch" placeholder="Buscar por nombre, músculo o etiqueta...">
          <button class="btn btn-outline-secondary" type="button" id="catalogClear"><i class="bi bi-x-circle"></i></button>
        </div>
      </div>
      <div class="accordion" id="${accId}">${items}</div>`

            const inp = $('#catalogSearch')
            const clearBtn = $('#catalogClear')
            const doFilter = () => {
                const q = (inp.value || '').trim().toLowerCase()
                $$('#helpContent .accordion-item').forEach(it => {
                    const hay = it.dataset.haystack || ''
                    it.style.display = (!q || hay.includes(q)) ? '' : 'none'
                })
            }
            inp?.addEventListener('input', doFilter)
            clearBtn?.addEventListener('click', () => {
                inp.value = ''
                doFilter()
                inp.focus()
            })
        }
        const oc = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp')
        oc?.show?.()
    }

    // uploads
    function uploadPlanFromFile () {
        const file = $('#planFileInput')?.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result)
                if (!data?.weeks) throw new Error('Estructura inválida')
                const id = 'user-' + Date.now()
                const name = file.name.replace(/\.json$/i, '') || ('Plan ' + new Date().toISOString().slice(0, 10))
                state.userPlans.push({ id, name, data })
                saveUserPlans()
                render()
            } catch (e) { alert('No se pudo leer el JSON: ' + e.message) }
        }
        reader.readAsText(file)
    }

    function usePlan (id) {
        if (id === 'builtin') {
            saveCurrentPlanId('builtin')
            state.plan = defaultPlan()
            mergePlanNamesIntoDict()
            render()
            return
        }
        const p = (state.userPlans || []).find(x => x.id === id)
        if (!p) return
        state.plan = normalizePlan(p.data)
        saveCurrentPlanId(id)
        mergePlanNamesIntoDict()
        render()
    }

    /* ===========================
   *  TRAIN – VISTAS Y ESTADOS
   * =========================== */

    // ---- Router de Training
    function viewTraining () {
        const s = state.training
        if (s.substate === 'list') return viewTrainingPlanList()
        if (s.substate === 'day') return viewTrainingDayList()
        if (s.substate === 'countdown') return viewTrainingCountdown()
        if (s.substate === 'exercise') return viewTrainingExercise()
        if (s.substate === 'rest') return viewTrainingRest()
        if (s.substate === 'finished') return viewTrainingFinished()
        return viewTrainingPlanList()
    }

    /* ---------- 1) LISTADO DEL PLAN (semanas + progreso) ---------- */
    function viewTrainingPlanList () {
        const info = getActivePlanInfo()
        const pdata = info.data
        const { planPct } = planProgress(pdata)

        const weeksHTML = (pdata.weeks || []).map((w, wi) => {
            const { weekPct, totalDays, doneDays } = weekProgress(pdata, wi)
            // grid 1..4 / 5..7 con trofeo
            const days = padWeekTo7(w.days || [])
            const today1 = todayIndex1to7()

            const top = days.slice(0, 4).map((d, i) => renderWeekDayPill(wi, i, d, today1)).join('')
            const bottom = days.slice(4, 7).map((d, i) => renderWeekDayPill(wi, i + 4, d, today1)).join('')

            const trophy = `<div class="day-pill text-center p-2 rounded bg-body-tertiary ${weekCompleted(wi) ? 'day-trophy lit' : 'day-trophy'}">
                <div class="day-number">&nbsp;</div><div class="day-icon"><i class="bi bi-trophy"></i></div></div>`

            return `<div class="card mb-3">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <h5 class="mb-0">Week ${wi + 1}</h5>
                  <div class="fw-semibold">${doneDays}/${totalDays}</div>
                </div>
                <div class="progress mb-2 progress-mini"><div class="progress-bar" style="width:${weekPct}%"></div></div>
                <div class="week-grid">${top}</div>
                <div class="week-grid mt-2" style="grid-template-columns: repeat(4, 1fr);">
                  ${bottom}${trophy}
                </div>
              </div>
            </div>`
        }).join('')
        const headerMeta = renderPlanMetaHeader()

        return `
    ${headerMeta}
    ${weeksHTML}

    <div class="bottom-cta mt-3">
      <button class="btn btn-lg btn-primary w-100 btn-tall" data-action="go-today">
        <i class="bi bi-lightning-charge me-1"></i>GO
      </button>
    </div>`
    }

    function renderWeekDayPill (weekIdx, dayIdx, d, today1) {
        const completed = isDayCompleted(weekIdx, dayIdx)
        const base = 'day-pill text-center p-2 rounded bg-body-tertiary'
        const cls = d?.rest ? `${base} day-rest` : (completed ? `${base} day-done` : base)
        const icon = d?.rest ? 'bi-cup-hot' : (completed ? 'bi-check-circle-fill' : 'bi-circle')
        const iconHTML = iconForDay(d, { completed, index1: dayIdx + 1, today1 })
        const num = dayIdx + 1
        const disabled = completed ? 'disabled' : ''
        return `<button class="${cls} w-100"
            data-action="pick-day" data-week="${weekIdx + 1}" data-day="${dayIdx + 1}" ${disabled}>
            <div class="day-number">${num}</div>
            <div class="day-icon">${iconHTML}</i></div>
          </button>`
    }

    function weekCompleted (weekIdx) {
        const days = state.plan?.weeks?.[weekIdx]?.days || []
        const first7 = days.slice(0, 7)
        return first7.every((d, di) => d?.rest ? true : isDayCompleted(weekIdx, di))
    }

    function planProgress (pl) {
        const weeks = pl?.weeks || []
        let total = 0, done = 0
        weeks.forEach((w, wi) => {
            const d = w.days || []
            d.slice(0, 7).forEach((day, di) => {
                if (day?.rest) {
                    total++
                    done++
                } else {
                    total++
                    if (isDayCompleted(wi, di)) done++
                }
            })
        })
        const planPct = total ? (done / total) * 100 : 0
        return { total, done, planPct }
    }

    function weekProgress (pl, wi) {
        const days = pl?.weeks?.[wi]?.days || []
        const first7 = days.slice(0, 7)
        const totalDays = first7.length
        const doneDays = first7.reduce((acc, d, di) => {
            return acc + (d?.rest ? 1 : (isDayCompleted(wi, di) ? 1 : 0))
        }, 0)
        const weekPct = totalDays ? (doneDays / totalDays) * 100 : 0
        return { totalDays, doneDays, weekPct }
    }

    /* ---------- 2) LISTADO DE EJERCICIOS DEL DÍA ---------- */
    function viewTrainingDayList () {
        const { day } = dayContext()
        if (!day) return `<div class="alert alert-warning">No se encontró el día.</div>`

        const totalExercises = day.exercises.length
        const estMinutes = estimateDayMinutes(day)

        const items = day.exercises.map((x, i) => {
            const dose = (stepTime(x) != null) ? `${stepTime(x)}s` : `${stepReps(x) ?? '—'} reps`
            const display = stepDisplayName(x, i)
            const id = stepId(x)
            return `<li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <span class="fw-semibold">${i + 1}. ${display}</span>
        ${id != null ? `<button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${id}"><i class="bi bi-info-circle"></i></button>` : ''}
        <div class="small text-secondary">${dose} • ${stepSets(x)} serie(s)</div>
      </div>
      <i class="bi bi-chevron-right opacity-50"></i>
    </li>`
        }).join('')

        const info = getActivePlanInfo()
        const headerDay = renderDayMetaHeader()

        return headerDay + `
    <ul class="list-group mb-3">${items}</ul>
    <div class="row g-2 bottom-cta">
      <div class="col-3 d-grid">
        <button class="btn btn-secondary btn-tall" data-action="back-to-list">
          <i class="bi bi-arrow-left me-1"></i>Back
        </button>
      </div>
      <div class="col-9 d-grid">
        <button class="btn btn-primary btn-lg btn-tall" data-action="start-training">
          <i class="bi bi-play-fill me-1"></i>Start
        </button>
      </div>
    </div>`
    }

    /* ---------- 3) COUNTDOWN INICIAL ---------- */
    function viewTrainingCountdown () {
        const ctx = currentExerciseCtx()
        const exName = stepDisplayName(ctx.step, ctx.index)
        return `
    <div class="ratio ratio-16x9 mb-3 bg-body-tertiary rounded d-flex align-items-center justify-content-center">
      <span class="display-6">Ready to go!</span>
    </div>
    <h5 class="mb-1">${exName}</h5>
    <div class="text-secondary mb-3">Comienza en...</div>
    <div class="countdown display-3 fw-bold mb-3 text-center" id="countdownNum">${state.training.countdownLeft}</div>

    <div class="row g-2 bottom-cta">
      <div class="col-6 d-grid">
        <button class="btn btn-outline-secondary btn-tall" data-action="cancel-to-day"><i class="bi bi-x-lg me-1"></i>Cancelar</button>
      </div>
      <div class="col-6 d-grid">
        <button class="btn btn-primary btn-tall" data-action="skip-countdown"><i class="bi bi-fast-forward-fill me-1"></i>Ir al ejercicio</button>
      </div>
    </div>`
    }

    /* ---------- 4) EJERCICIO EN CURSO ---------- */
    function viewTrainingExercise () {
        const ctx = currentExerciseCtx()
        const ex = ctx.step
        const isTimed = stepTime(ex) != null
        const name = stepDisplayName(ex, ctx.index)
        const total = ctx.total
        const completed = ctx.index
        const setInfo = `${state.training.currentSet}/${ex.sets || 1}`
        const progressPct = Math.round((completed / total) * 100)

        const exInfo = state.exDict.get(String(stepId(ex))) || null;
        const videoHtml = exInfo?.video ? embedVideoHTML(exInfo.video, name) : '';
        const topMedia = `<div class="exercise-media mb-3">
          ${videoHtml || `<img src="${exerciseImageFor(ex, name)}" class="object-fit-contain w-100 h-100 rounded" alt="${name}">`}
        </div>`;


        const timerBlock = isTimed
            ? `<div class="d-flex align-items-center justify-content-center gap-2">
                 <button class="btn btn-outline-light btn-sm" data-action="${state.training.timerPaused ? 'resume-timer' : 'pause-timer'}">
                   <i class="bi ${state.training.timerPaused ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
                 </button>
                 <div class="timer-large" id="timedLeftNum">${state.training.timedLeft || stepTime(ex)}</div>
               </div>`
            : `<div class="reps-large">x${stepReps(ex) ?? '—'}</div>`

        return `
    ${topMedia}

    <div class="d-flex justify-content-between align-items-start mb-2">
      <div>
        <h5 class="mb-1">${name}
          <button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${stepId(ex)}"><i class="bi bi-info-circle"></i></button>
        </h5>
        <div class="text-secondary">Serie ${setInfo}</div>
      </div>
      <div class="text-end">
        <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
        <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
      </div>
    </div>

    <div class="small text-secondary mb-1">Completado ${completed}/${total} ejercicios</div>
    <div class="progress progress-mini mb-3"><div class="progress-bar" style="width:${progressPct}%"></div></div>

    <div class="timer-area mb-3">${timerBlock}</div>

    <div class="d-grid gap-2 mb-3">
      <button class="btn btn-success btn-tall" data-action="complete-set"><i class="bi bi-check2-circle me-1"></i>Completar serie</button>
    </div>

    <div class="row g-2 bottom-cta">
      <div class="col-6 d-grid">
        <button class="btn btn-outline-secondary btn-tall" data-action="cancel-to-day"><i class="bi bi-x-lg me-1"></i>Cancelar</button>
      </div>
      <div class="col-6 d-grid">
        <button class="btn btn-outline-danger btn-tall" data-action="finish-now"><i class="bi bi-flag-fill me-1"></i>Finalizar</button>
      </div>
    </div>`
    }

    /* ---------- 5) DESCANSO ---------- */
    function viewTrainingRest () {
        const ctx = currentExerciseCtx()
        const reason = state.training.restReason // 'between-sets' | 'between-exercises'
        const showSame = reason === 'between-sets'
        const nextStep = showSame ? ctx.step : (ctx.day.exercises[ctx.index + 1] || null)
        const nextName = nextStep ? stepDisplayName(nextStep, showSame ? ctx.index : ctx.index + 1) : '—'

        const total = ctx.total
        const completed = ctx.index + (showSame ? 0 : 1)
        const progressPct = Math.round((completed / total) * 100)
        const sets = stepSets(nextStep)

        const image = exerciseImageFor(nextStep || {}, nextName)

        return `
    <div class="exercise-screen">
        <div class="exercise-media mb-3">
          <img src="${image}" class="object-fit-contain w-100 h-100 rounded" alt="${nextName}">
        </div>
    
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h5 class="mb-1">${showSame ? 'Descanso entre series' : 'Siguiente: ' + nextName}
              ${nextStep ? `<button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${stepId(nextStep)}"><i class="bi bi-info-circle"></i></button>` : ''}
            </h5>
            <div class="text-secondary">
              ${stepTime(nextStep) != null ? `${stepTime(nextStep)}s` : (stepReps(nextStep) ?? '—') + ' reps'} ${sets ? `• ${sets} serie(s)` : ''}
            </div>
          </div>
          <div class="text-end">
            <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
            <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
          </div>
        </div>
    </div>

    <div class="small text-secondary mb-1">Completado ${completed}/${total} ejercicios</div>
    <div class="progress progress-mini mb-3"><div class="progress-bar" style="width:${progressPct}%"></div></div>

    <div class="timer-area mb-3"><div class="countdown display-5 fw-bold text-center" id="restNum">${state.training.restLeft}</div></div>

    <div class="d-grid gap-2 mb-3">
      <button class="btn btn-outline-secondary btn-tall" data-action="extend-rest"><i class="bi bi-plus-circle me-1"></i>+10s</button>
      <button class="btn btn-primary btn-tall" data-action="end-rest"><i class="bi bi-skip-forward-fill me-1"></i>Terminar descanso</button>
    </div>

    <div class="row g-2 bottom-cta">
      <div class="col-12 d-grid">
        <button class="btn btn-outline-danger btn-tall" data-action="cancel-to-day"><i class="bi bi-x-lg me-1"></i>Cancelar y volver</button>
      </div>
    </div>`
    }

    /* ---------- 6) ENTRENAMIENTO FINALIZADO ---------- */
    function viewTrainingFinished () {
        const { kcal, minutes } = estimateSession()
        const exCount = dayContext().day.exercises.length

        return `
    <div class="ratio ratio-16x9 mb-3">
      <img class="rounded object-fit-cover" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop" alt="¡Buen trabajo!">
    </div>
    <h4 class="mb-1">¡Entrenamiento completado!</h4>
    <p class="text-secondary mb-3">Gran trabajo, sigue la racha 💪</p>

    <div class="row row-cols-3 g-3 mb-3">
      <div class="col">${statCard('bi-list-check', 'Ejercicios', exCount)}</div>
      <div class="col">${statCard('bi-stopwatch', 'Tiempo', minutes + 'm')}</div>
      <div class="col">${statCard('bi-fire', 'Kcal', Math.round(kcal))}</div>
    </div>

    <div class="bottom-cta">
      <button class="btn btn-lg btn-success w-100 btn-tall" data-action="finish-session">
        <i class="bi bi-check2-circle me-1"></i>Volver al plan
      </button>
    </div>`
    }

    /* ====== helpers de flujo (si ya los tienes, mantén tu versión; si no, añade estos) ====== */
    function subTrainingInitial () {
        return {
            substate: 'list',
            currentWeek: 1, currentDay: 1,
            currentExerciseIndex: 0, currentSet: 1,
            countdownLeft: 15, timedLeft: 0, restLeft: 0, timerPaused: false,
            restReason: null,
            nextSet: null,
            startedAt: null, finishedAt: null
        }
    }

    let timerId = null

    function runCountdown () {
        clearInterval(timerId)
        play(state.audio.whistle)
        timerId = setInterval(() => {
            state.training.countdownLeft--
            const n = $('#countdownNum')
            if (n) n.textContent = state.training.countdownLeft
            if (state.settings.countdownSpokenSeconds?.includes?.(state.training.countdownLeft)) {
                play(state.audio.beep)
                speak(String(state.training.countdownLeft))
            }
            if (state.training.countdownLeft <= 0) {
                clearInterval(timerId)
                startExercise()
            }
        }, 1000)
    }

    function dayContext () {
        const w = state.plan.weeks[state.training.currentWeek - 1]
        const day = w.days[state.training.currentDay - 1]
        return { w, day }
    }

    function currentExerciseCtx () {
        const { day } = dayContext()
        const idx = state.training.currentExerciseIndex
        const step = day.exercises[idx]
        const total = day.exercises.length
        const next = (idx + 1 < total) ? { step: day.exercises[idx + 1] } : null
        return { day, step, index: idx, total, next }
    }

    function startExercise () {
        stopVoice() // corta lo anterior
        state.training.substate = 'exercise'
        state.training.timerPaused = false
        state.training.restReason = null
        const ctx = currentExerciseCtx()
        if (state.settings.speakExerciseName) {
            const n = stepDisplayName(ctx.step, ctx.index)
            const t = stepTime(ctx.step)
            const r = stepReps(ctx.step)
            const dose = doseSpeech(ctx.step)
            speak(`Inicia: ${n}${dose ? ', ' + dose : ''}`)
            // speak(`Inicia: ${n}${t != null ? ' - ' + t + ' segundos' : (r != null ? ' - ' + r + ' repeticiones' : '')}`);
        }
        state.training.timedLeft = stepTime(ctx.step) ?? 0
        render()
        if (stepTime(ctx.step) != null) runTimedSet()
    }

    function runTimedSet () {
        clearInterval(timerId)
        timerId = setInterval(() => {
            if (state.training.timerPaused) return
            state.training.timedLeft--
            const node = $('#timedLeftNum')
            if (node) node.textContent = Math.max(0, state.training.timedLeft)
            if (state.settings.countdownSpokenSeconds?.includes?.(state.training.timedLeft)) {
                play(state.audio.beep)
                speak(String(state.training.timedLeft))
            }
            if (state.training.timedLeft <= 0) {
                clearInterval(timerId)
                completeSet()
            }
        }, 1000)
    }

    function getRestBetweenSets (step) {
        const cfg = state.settings.restBetweenSets
        return (typeof cfg === 'number' && cfg >= 0) ? cfg : (step.rest || 20)
    }

    function getRestBetweenExercises (step) {
        const cfg = state.settings.restBetweenExercises
        const fb = step.rest_next || step.rest || 30
        return (typeof cfg === 'number' && cfg >= 0) ? cfg : fb
    }

    function completeSet () {
        const ctx = currentExerciseCtx()
        const totalSets = ctx.step.sets || 1

        if (state.training.currentSet < totalSets) {
            state.training.nextSet = state.training.currentSet + 1
            state.training.substate = 'rest'
            state.training.restReason = 'between-sets'
            state.training.restLeft = getRestBetweenSets(ctx.step)
            render()
            speak?.(`Descanso de ${state.training.restLeft} segundos`)
            runRest()
            return
        }
        completeExercise()
    }

    function completeExercise () {
        const ctx = currentExerciseCtx()
        const hasNext = (ctx.index + 1 < ctx.total)

        if (hasNext) {
            state.training.substate = 'rest'
            state.training.restReason = 'between-exercises'
            state.training.restLeft = getRestBetweenExercises(ctx.step)
            render()
            const nx = stepDisplayName(currentExerciseCtx().day.exercises[ctx.index + 1], ctx.index + 1)
            speak(`Descanso de ${state.training.restLeft} segundos. Próximo ejercicio ${nx}`)
            runRest()
        } else {
            // Al terminar el último ejercicio del día:
            state.training.substate = 'finished'
            state.training.finishedAt = Date.now()

            // ⬇️ Marca el día como completado para el PLAN ACTUAL
            const pid = getCurrentPlanId()
            markDayCompletedFor(pid, state.training.currentWeek - 1, state.training.currentDay - 1)

            // (mantén tus acumuladores de stats si los tienes)
            const { kcal, minutes } = estimateSession()
            state.stats.trainingsDone = (state.stats.trainingsDone || 0) + 1
            state.stats.minutesTrained = (state.stats.minutesTrained || 0) + minutes
            state.stats.kcalBurned = (state.stats.kcalBurned || 0) + Math.round(kcal)

            // sonido, render...
            play?.(state.audio?.applause)
            render()
        }
    }

    function runRest () {
        stopVoice() // corta lo anterior
        clearInterval(timerId)
        timerId = setInterval(() => {
            state.training.restLeft--
            const node = $('#restNum')
            if (node) node.textContent = state.training.restLeft
            if (state.training.restLeft <= 0) {
                clearInterval(timerId)
                endRest()
            }
        }, 1000)
    }

    function endRest () {
        const reason = state.training.restReason
        if (reason === 'between-sets') {
            // Aplicar el avance de serie ahora (una sola vez)
            if (state.training.nextSet != null) {
                state.training.currentSet = state.training.nextSet
                state.training.nextSet = null
            } else {
                state.training.currentSet = (state.training.currentSet || 1) + 1 // fallback
            }
            startExercise()
        } else if (reason === 'between-exercises') {
            // Avanzar al siguiente ejercicio y reset de set
            state.training.currentExerciseIndex++
            state.training.currentSet = 1
            startExercise()
        } else {
            // Fallback por si acaso
            startExercise()
        }
    }

    function prevExercise () {
        if (state.training.currentExerciseIndex > 0) {
            state.training.currentExerciseIndex--
            state.training.currentSet = 1
            startExercise()
        }
    }

    function nextExercise () {
        const ctx = currentExerciseCtx()
        if (ctx.index + 1 < ctx.total) {
            state.training.currentExerciseIndex++
            state.training.currentSet = 1
            startExercise()
        }
    }

    function jumpToFinished () {
        clearInterval(timerId)
        completeExercise()
    }

    function estimateDayMinutes (day) {
        let seconds = 0;
        (day.exercises || []).forEach(s => {
            const sets = s.sets || 1
            const tPer = (stepTime(s) != null) ? stepTime(s) : ((stepReps(s) != null) ? stepReps(s) * 2 : 30)
            seconds += tPer * sets + getRestBetweenSets(s) * (sets - 1) + getRestBetweenExercises(s)
        })
        return Math.max(1, Math.round(seconds / 60))
    }

    function estimateSession () {
        const { day } = dayContext()
        let seconds = 0, kcal = 0;
        (day.exercises || []).forEach(s => {
            const sets = s.sets || 1
            const tPer = (stepTime(s) != null) ? stepTime(s) : ((stepReps(s) != null) ? stepReps(s) * 2 : 30)
            seconds += tPer * sets
            const met = (s.intensity === 'high' ? 8 : s.intensity === 'low' ? 3 : 5)
            kcal += (met * 70 / 60) * (tPer * sets / 60)
        })
        const minutes = Math.max(1, Math.round(seconds / 60))
        return { minutes, kcal }
    }

    function exerciseImageFor (step, name) {
        // si tu catálogo tiene "image", úsala
        const sid = stepId(step)
        const ex = sid != null ? state.exDict.get(String(sid)) : null
        if (ex?.image) return ex.image
        // fallback por nombre
        const n = (name || '').toLowerCase()
        // if (n.includes('jump')) return 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?q=80&w=1200&auto=format&fit=crop';
        // if (n.includes('push')) return 'https://images.unsplash.com/photo-1527933053326-89d1746b76f8?q=80&w=1200&auto=format&fit=crop';
        return 'https://images.unsplash.com/photo-1526404079164-3c7f7b6a8ee8?q=80&w=1200&auto=format&fit=crop'
    }

    // --- Helpers para incrustar vídeo YouTube ---
    function youTubeIdFromUrl (url) {
        try {
            const u = new URL(url);
            const host = u.hostname.replace(/^www\./, '');
            if (host === 'youtu.be') {
                // https://youtu.be/VIDEOID
                return u.pathname.slice(1).split('/')[0] || null;
            }
            if (host.endsWith('youtube.com')) {
                // https://www.youtube.com/watch?v=VIDEOID
                if (u.searchParams.get('v')) return u.searchParams.get('v');
                // https://www.youtube.com/shorts/VIDEOID
                const parts = u.pathname.split('/').filter(Boolean);
                if (parts[0] === 'shorts' && parts[1]) return parts[1];
            }
        } catch (_) { /* noop */ }
        return null;
    }

    function embedVideoHTML (url, title = 'Vídeo') {
        const id = youTubeIdFromUrl(url);
        if (!id) return '';
        const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
        return `
    <div class="ratio ratio-16x9">
      <iframe
        src="${src}"
        title="${title}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>`;
    }


    function statCard (icon, label, value) {
        return `<div class="card p-3 text-center h-100">
            <i class="bi ${icon} mb-1"></i>
            <div class="fw-bold">${value}</div>
            <div class="small text-secondary">${label}</div>
          </div>`
    }

    function computeNextDayToDo () {
        const weeks = state.plan?.weeks || []
        const pid = getCurrentPlanId()
        for (let wi = 0; wi < weeks.length; wi++) {
            const days = weeks[wi]?.days || []
            for (let di = 0; di < Math.min(7, days.length); di++) {
                const d = days[di]
                // const key = `${wi + 1}-${di + 1}`
                // const done = d?.completed || state.stats?.daysCompleted?.[key]
                const done = d?.rest ? true : isDayCompletedFor(pid, wi, di)
                if (!d?.rest && !done) return { week: wi + 1, day: di + 1 }
            }
        }
        return { week: 1, day: 1 } // fallback
    }

    function showExerciseHelpById (exId) {
        const ex = state.exDict.get(String(exId))
        const help = $('#helpContent')
        if (!ex) {
            help.innerHTML = `<p class="text-secondary mb-0">No hay información para este ejercicio.</p>`
        } else {
            const muscles = [
                ex.primary_muscles?.length ? `<div class="small">Primarios: <strong>${ex.primary_muscles.join(', ')}</strong></div>` : '',
                ex.secondary_muscles?.length ? `<div class="small">Secundarios: <strong>${ex.secondary_muscles.join(', ')}</strong></div>` : ''
            ].join('')
            const cues = Array.isArray(ex.cues) && ex.cues.length ? `<ul class="small mb-2">${ex.cues.map(c => `<li>${c}</li>`).join('')}</ul>` : ''
            const video = ex.video ? embedVideoHTML(ex.video, ex.name || ex.id) : '';
            help.innerHTML = `
              <h5 class="mb-2">${ex.name || exId}</h5>
              ${muscles}
              ${ex.description ? `<p class="mb-2">${ex.description}</p>` : ''}
              ${cues}
              ${video}
            `
        }
        const oc = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp')
        oc?.show?.()
    }

    function stopVoice () {
        try { if ('speechSynthesis' in window) window.speechSynthesis.cancel() } catch (_) { }
    }

    function stopAllTimersAndVoice () {
        try { clearInterval(timerId) } catch (_) { }
        timerId = null
        stopVoice()
    }

    function deletePlan (id) {
        // Confirmación simple
        if (!confirm('¿Borrar este entrenamiento? Esta acción no se puede deshacer.')) return

        // Borrar BUILTIN (solo si hay otros)
        if (id === 'builtin') {
            if ((state.userPlans || []).length === 0) return // nada que hacer
            setBuiltinHidden(true)

            // Si el activo era builtin, cambia a primer plan de usuario
            if (state.currentPlanId === 'builtin') {
                const p = state.userPlans[0]
                state.plan = normalizePlan(p.data)
                saveCurrentPlanId(p.id)
                mergePlanNamesIntoDict()
            }
            render()
            return
        }

        // Borrar plan de usuario
        const idx = (state.userPlans || []).findIndex(p => p.id === id)
        if (idx < 0) return

        const wasActive = state.currentPlanId === id
        state.userPlans.splice(idx, 1)
        saveUserPlans()

        if ((state.userPlans || []).length === 0) {
            // Si no queda ninguno, reactivamos el builtin
            setBuiltinHidden(false)
            saveCurrentPlanId('builtin')
            state.plan = defaultPlan()
            mergePlanNamesIntoDict()
        } else if (wasActive) {
            // Si borraste el activo: intenta ir a builtin si no está oculto, si no, al primero restante
            if (!isBuiltinHidden()) {
                saveCurrentPlanId('builtin')
                state.plan = defaultPlan()
                mergePlanNamesIntoDict()
            } else {
                const p = state.userPlans[0]
                state.plan = normalizePlan(p.data)
                saveCurrentPlanId(p.id)
                mergePlanNamesIntoDict()
            }
        }
        render()
    }

    // ================================
    // MODO OSCURO / CLARO
    // ================================

    const THEME_KEY = 'sf_theme' // 'light' | 'dark'

    function applyTheme (theme) {
        const html = document.documentElement
        html.setAttribute('data-bs-theme', theme)
        localStorage.setItem(THEME_KEY, theme)

        // Actualiza el icono del botón
        const btn = document.querySelector('[data-action="toggle-theme"]')
        if (btn) {
            const icon = btn.querySelector('i') || document.createElement('i')
            icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars'
            if (!btn.contains(icon)) btn.appendChild(icon)
            // Ajusta estilo del botón según tema para mantener contraste
            btn.classList.remove('btn-outline-dark', 'btn-outline-light')
            btn.classList.add(theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark')
        }
    }

    function initTheme () {
        // Si hay un valor guardado, úsalo; si no, usa el que tenga <html data-bs-theme="..."> o 'dark'
        const saved = localStorage.getItem(THEME_KEY)
        const initial = saved || document.documentElement.getAttribute('data-bs-theme') || 'dark'
        applyTheme(initial)
    }

    function toggleTheme () {
        const current = document.documentElement.getAttribute('data-bs-theme') || 'dark'
        applyTheme(current === 'dark' ? 'light' : 'dark')
    }

    // AD BANNER
    function setAdsEnabled (enabled) {
        const el = document.getElementById('adBanner')
        if (!el) return
        el.hidden = !enabled
        // Si lo ocultas, reducimos el padding y el offset de CTAs automáticamente
        document.documentElement.style.setProperty('--ad-h', enabled ? '60px' : '0px')
    }

    // ===== ORIENTACIÓN: overlay + intento de bloqueo =====
    function isLandscape () {
        // prefer orientation API, fallback a tamaño
        const o = (screen.orientation && screen.orientation.type) || ''
        if (o.includes('landscape')) return true
        return window.innerWidth > window.innerHeight
    }

    function updateOrientationOverlay () {
        const el = document.getElementById('orientationOverlay')
        if (!el) return
        el.style.display = isLandscape() ? 'flex' : 'none'
    }

    async function tryLockPortrait () {
        // Requiere gesto del usuario y, en la mayoría de navegadores, fullscreen
        try {
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                await document.documentElement.requestFullscreen()
            }
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('portrait')
            }
        } catch (e) {
            // Algunos navegadores/iOS no lo permiten: nos quedamos con el overlay como fallback
            // console.debug('Orientation lock not available:', e);
        } finally {
            updateOrientationOverlay()
        }
    }

    function initOrientationGuard () {
        // Mostrar/ocultar overlay en cambios
        ['orientationchange', 'resize'].forEach(evt => window.addEventListener(evt, updateOrientationOverlay, { passive: true }))
        updateOrientationOverlay()

        // Botón del overlay para intentar el lock
        document.getElementById('tryLockBtn')?.addEventListener('click', tryLockPortrait)

        // También intentamos fijar tras el primer gesto de usuario en la app
        const oneTime = () => {
            tryLockPortrait()
            window.removeEventListener('click', oneTime)
            window.removeEventListener('touchstart', oneTime)
        }
        window.addEventListener('click', oneTime, { once: true })
        window.addEventListener('touchstart', oneTime, { once: true })
    }

    function showPlanDetails () {
        const m = activePlanMeta()
        const help = $('#helpContent')
        const chips = (arr, icon) => (arr || []).map(x => `<span class="badge text-bg-secondary me-1 mb-1"><i class="bi ${icon} me-1"></i>${x}</span>`).join('') || '<span class="text-secondary">—</span>'
        const links = (m.doc_links || []).map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label || l.url}</a></li>`).join('') || '<li class="text-secondary">—</li>'

        help.innerHTML = `
    <h5 class="mb-2">${m.title}</h5>
    <p class="mb-2">${m.description || 'Sin descripción.'}</p>
    <div class="mb-2"><strong>Objetivo:</strong> ${m.goal || '—'}</div>
    <div class="mb-2"><strong>Nivel:</strong> ${m.level || '—'}</div>
    <div class="mb-2"><strong>Tiempo medio:</strong> ${(m.avg_minutes ?? estimatePlanAvgMinutes())} min/día</div>
    <div class="mb-2"><strong>Músculos:</strong><div class="mt-1">${chips(m.muscles, 'bi-bullseye')}</div></div>
    <div class="mb-2"><strong>Material:</strong><div class="mt-1">${chips(m.equipment, 'bi-tools')}</div></div>
    <div class="mb-2"><strong>Enlaces:</strong><ul class="mt-1">${links}</ul></div>
  `
        const oc = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp')
        oc?.show?.()
    }

    function getPlanProgressPct () {
        const weeks = state.plan?.weeks || []
        let total = 0, done = 0
        weeks.forEach((w, wi) => {
            (w.days || []).slice(0, 7).forEach((d, di) => {
                total += 1
                const completed = d?.rest ? true : isDayCompleted(wi, di)
                if (completed) done += 1
            })
        })
        return total ? Math.round(done / total * 100) : 0
    }

    function doseSpeech (step) {
        if (stepTime(step) != null) return `${stepTime(step)} segundos`
        const r = stepReps(step)
        return (r != null) ? `${r} repeticiones` : ''
    }

    function setTrainingNavHidden (hidden) {
        const html = document.documentElement
        if (hidden) html.classList.add('nav-hidden')
        else html.classList.remove('nav-hidden')
    }

    function updateNavVisibility () {
        const activeStates = new Set(['countdown', 'exercise', 'rest', 'finished'])
        const hide = (state.view === 'training' && activeStates.has(state.training?.substate))
        setTrainingNavHidden(hide)
    }

    // Estructura: state.stats.planProgress = { [planId]: { "W-D": true, ... } }
    function ensurePlanProgress () {
        if (!state.stats) state.stats = {}
        if (!state.stats.planProgress) state.stats.planProgress = {}
        return state.stats.planProgress
    }

    function getCurrentPlanId () { return state.currentPlanId || 'builtin' }

    function isDayCompletedFor (planId, wi, di) {
        const pp = ensurePlanProgress()
        const key = `${wi + 1}-${di + 1}`
        return !!pp[planId]?.[key]
    }

    function markDayCompletedFor (planId, wi, di) {
        const pp = ensurePlanProgress()
        pp[planId] = pp[planId] || {}
        pp[planId][`${wi + 1}-${di + 1}`] = true
        localStorage.setItem('sf_stats', JSON.stringify(state.stats))
    }

    // Cambia tus usos de daysCompleted para que llamen a estas helpers por plan actual (si aún no lo hiciste)

    function performResetPlanProgress (planId) {
        const pp = ensurePlanProgress()
        delete pp[planId]
        localStorage.setItem('sf_stats', JSON.stringify(state.stats))
    }

    // Llama a esto en tu bootstrap (después de render inicial)
    // initOrientationGuard();

    // Ejemplo: activar siempre al iniciar (ajústalo a tu lógica real)
    window.addEventListener('load', () => {
        setAdsEnabled(true)
        bootstrap()
    })

    // Boot
    // window.addEventListener('load', bootstrap);
})();
