/* StriveFit — vanilla JS + Bootstrap 5 (v4 with Settings) */
(() => {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // --- Datos (JSON) ---------------------------------------------------------
  const JSON_PLAN_URL = './data/plan.json';
  const JSON_EX_DICT_URL = './data/exercises.json';

  const state = {
    view: 'home',
    training: {
      substate: 'list',       // 'list' | 'day' | 'countdown' | 'exercise' | 'rest' | 'finished'
      currentWeek: 1,
      currentDay: 1,
      currentExerciseIndex: 0,
      currentSet: 1,
      restLeft: 0,
      countdownLeft: 15,
      timedLeft: 0,           // segundos restantes en ejercicios a tiempo
      timerPaused: false,
      startedAt: null,
      finishedAt: null,
    },
    plan: null,
    exDict: null,
    stats: loadStats(),
    settings: loadSettings(),
    audio: {},
  };

  // --- Audio (hooks opcionales) --------------------------------------------
  function loadAudio(){
    state.audio.whistle = tryMakeAudio('./assets/whistle.wav', 0.8);
    state.audio.applause = tryMakeAudio('./assets/applause.wav', 0.7);
    state.audio.beep = tryMakeAudio('./assets/beep.wav', 0.6);
  }
  function tryMakeAudio(src, volume=1){
    const a = new Audio(); a.src = src; a.preload = 'auto'; a.volume = volume;
    a.addEventListener('error', ()=>{/*silencio elegante*/});
    return a;
  }

  // --- Persistencia ---------------------------------------------------------
  function loadStats() {
    try {
      const raw = localStorage.getItem('sf_stats');
      const parsed = raw ? JSON.parse(raw) : {};
      return ensureStatsShape(parsed);
    } catch {
      return ensureStatsShape({});
    }
  }
  function ensureStatsShape(s = {}){
    return {
      trainingsDone: Number(s.trainingsDone) || 0,
      minutesTrained: Number(s.minutesTrained) || 0,
      kcalBurned:   Number(s.kcalBurned)   || 0,
      weight: { initial: s?.weight?.initial ?? null, last: s?.weight?.last ?? null },
      waistWeekly: Array.isArray(s?.waistWeekly) ? s.waistWeekly : [],
      daysCompleted: (s && typeof s.daysCompleted === 'object' && s.daysCompleted) ? s.daysCompleted : {},
    };
  }
  function saveStats() { localStorage.setItem('sf_stats', JSON.stringify(state.stats)); }

  function loadSettings(){
    try{
      const raw = localStorage.getItem('sf_settings');
      const s = raw ? JSON.parse(raw) : {};
      return ensureSettingsShape(s);
    }catch{ return ensureSettingsShape({}); }
  }
  function ensureSettingsShape(s={}){
    return {
      voiceEnabled: (typeof s.voiceEnabled==='boolean') ? s.voiceEnabled : true,
      voiceGender: (typeof s.voiceGender==='string') ? s.voiceGender : 'female', // 'female' | 'male'
      countdownSpokenSeconds: Array.isArray(s.countdownSpokenSeconds) ? s.countdownSpokenSeconds : [10,5,3],
      speakExerciseName: (typeof s.speakExerciseName==='boolean') ? s.speakExerciseName : true,
      restBetweenSets: (typeof s.restBetweenSets==='number' && s.restBetweenSets>=0) ? s.restBetweenSets : null,
      restBetweenExercises: (typeof s.restBetweenExercises==='number' && s.restBetweenExercises>=0) ? s.restBetweenExercises : null,
    };
  }
  function saveSettings(){ localStorage.setItem('sf_settings', JSON.stringify(state.settings)); }

  // --- Formatos y fechas ----------------------------------------------------
  const fmt = { time(mins) { return `${mins} min`; }, kcal(n) { return `${Math.round(n)} kcal`; } };
  function todayInfo() { const d=new Date(); const dow=(d.getDay()+6)%7; const days=['L','M','X','J','V','S','D']; return { d, dow, label: days[dow] }; }
  function dayKey(date=new Date()) { const d=new Date(date); const week=getISOWeek(d); const dow=((d.getDay()+6)%7)+1; return `${d.getFullYear()}-${String(week).padStart(2,'0')}-${dow}`; }
  function getISOWeek(date){
    const tmp=new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum=(tmp.getUTCDay()+6)%7; tmp.setUTCDate(tmp.getUTCDate()-dayNum+3);
    const firstThursday=new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
    return 1+Math.round(((tmp-firstThursday)/86400000 -3 + (firstThursday.getUTCDay()+6)%7)/7);
  }

  // --- Voz (Web Speech) -----------------------------------------------------
  function selectVoiceByGender(gender='female'){
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const esVoices = voices.filter(v => /(^es|\\bes-)/i.test(v.lang));
    const match = esVoices.find(v => (gender==='female' ? /female|mujer|femenina/i : /male|hombre|masculina/i).test(v.name)) || esVoices[0] || voices[0];
    return match || null;
  }
  function say(text){
    if (!state.settings.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const v = selectVoiceByGender(state.settings.voiceGender);
    if (v) u.voice = v;
    u.pitch = state.settings.voiceGender==='female' ? 1.2 : 0.95;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }
  function formatDose(step){
    if (step?.time) return `${step.time} segundos`;
    if (step?.reps) return `${step.reps} repeticiones`;
    return `ejercicio`;
  }
  function announceNextExercise(ctx, when='proximo'){
    if (!state.settings.speakExerciseName && when!=='inicio') return;
    const dose = formatDose(ctx.step);
    const name = state.settings.speakExerciseName ? (ctx.ex?.name || 'ejercicio') : '';
    const prefix = when==='inicio' ? 'Inicia' : 'Próximo ejercicio';
    say(`${prefix}: ${name}${name?', ':''}${dose}`);
  }

  // --- Bootstrap de datos ---------------------------------------------------
  const MOTOS = ['Un poco cada día suma mucho.', 'Tu cuerpo te está viendo: háblale con hechos.', 'La constancia vence al talento.', 'Hoy cuenta. Mañana agradecerás este momento.', 'Respira, aprieta, progresa.', 'No perfecto, pero sí presente.', 'Fuerte es el hábito, no el impulso.'];
  function dailyMotto(){ const i=Math.floor(Date.now()/86400000)%MOTOS.length; return MOTOS[i]; }

  async function bootstrap() {
    try {
      const [plan, exDict] = await Promise.all([
        fetch(JSON_PLAN_URL).then(r=>r.json()).catch(()=>demoPlan),
        fetch(JSON_EX_DICT_URL).then(r=>r.json()).catch(()=>demoExDict),
      ]);
      state.plan = mapPlanFromJson(plan);
      state.exDict = mapExerciseDictFromJson(exDict);
    } catch (e) {
      console.warn('Fallo cargando JSON, usando demo:', e);
      state.plan = mapPlanFromJson(demoPlan);
      state.exDict = mapExerciseDictFromJson(demoExDict);
    }
    loadAudio();
    saveStats(); // normaliza persistencia
    render();
  }
  function mapPlanFromJson(json) { return json; }
  function mapExerciseDictFromJson(json) {
    const m = new Map();
    json.exercises.forEach(x=>m.set(x.exercise_id, x));
    return m;
  }

  // --- Render de vistas -----------------------------------------------------
  function render() {
    const host = $('#appContent');
    if (!host) return;
    const { view } = state;
    $$('#bottomNav .nav-link').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
    if (view === 'home') host.innerHTML = viewHome();
    if (view === 'training') host.innerHTML = viewTraining();
    if (view === 'progress') host.innerHTML = viewProgress();
    if (view === 'settings') host.innerHTML = viewSettings();
    bindEvents();
  }

  // HOME
  function viewHome() {
    const t = todayInfo();
    const weekDays = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
    const dayMarks = weekDays.map((label, i)=>{
      const done = state.stats.daysCompleted[dayKey(shiftToDow(i))];
      const icon = done ? 'bi-check-circle-fill text-success' : 'bi-dash-circle text-secondary';
      const today = (i===t.dow) ? 'border border-warning-subtle' : '';
      return `<div class="text-center p-2 rounded bg-body-tertiary ${today}">
        <div class="fw-semibold">${label}</div>
        <i class="bi ${icon}"></i>
      </div>`;
    }).join('');

    const wInit = state.stats.weight.initial;
    const wLast = state.stats.weight.last;
    const wDiff = (wInit!=null && wLast!=null) ? (wLast - wInit) : 0;
    const waistDiff = diffWaist();

    return `
      <section class="mb-3">
        <div class="hero">
          <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop" alt="Entrena">
          <div class="overlay"></div>
          <div class="motto">${dailyMotto()}</div>
        </div>
      </section>

      <section class="mb-3">
        <div class="week-grid two-rows">${dayMarks}</div>
      </section>

      <section class="row g-3">
        ${statCard('bi-activity','Entrenamientos', state.stats.trainingsDone)}
        ${statCard('bi-stopwatch','Minutos', state.stats.minutesTrained)}
        ${statCard('bi-fire','Kcal', state.stats.kcalBurned)}
        ${statCard('bi-scales','Peso', weightLabel(wInit,wLast,wDiff))}
        ${statCard('bi-rulers','Cintura', waistLabel(waistDiff))}
      </section>
    `;
  }
  function shiftToDow(i){ const d=new Date(); const todayDow=(d.getDay()+6)%7; const shift=i-todayDow; const nd=new Date(); nd.setDate(d.getDate()+shift); return nd; }
  function statCard(icon, label, value){
    return `<div class="col-6"><div class="card stat-card p-3 h-100"><div class="d-flex align-items-center gap-3">
      <i class="${icon}"></i><div><div class="small text-secondary">${label}</div><div class="fw-bold">${typeof value==='number'? value : value}</div></div>
    </div></div></div>`;
  }
  function weightLabel(init,last,diff){ if (init==null && last==null) return '—'; if (init!=null && last==null) return `${init} kg (inicial)`; return `${last} kg (${diff>=0?'+':''}${diff.toFixed(1)} vs inicial)`; }
  function diffWaist(){ const arr = state?.stats?.waistWeekly || []; if (!arr.length) return null; const first=arr[0].cm, last=arr[arr.length-1].cm; return last-first; }
  function waistLabel(d){ if (d==null) return '—'; const s=d>0?'+':''; return `${s}${d.toFixed(1)} cm vs inicio`; }

  // TRAINING
  function viewTraining(){
    const st = state.training;
    if (st.substate==='list') return viewTrainingList();
    if (st.substate==='day') return viewTrainingDay();
    if (st.substate==='countdown') return viewTrainingCountdown();
    if (st.substate==='exercise') return viewTrainingExercise();
    if (st.substate==='rest') return viewTrainingRest();
    if (st.substate==='finished') return viewTrainingFinished();
    return '<p>Estado desconocido.</p>';
  }
  function viewTrainingList(){
    const weeks = state.plan?.weeks || [];
    const cards = weeks.map((w, wi)=>{
      const completedDays = w.days.filter(d=>d.completed).length;
      const progress = Math.round((completedDays / w.days.length) * 100);
      const daysGrid = renderDaysGrid(w.days, wi+1);
      return `<div class="card mb-3"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">Semana ${wi+1}</h5>
            <div class="w-50"><div class="progress progress-mini" role="progressbar">
              <div class="progress-bar" style="width:${progress}%"></div>
            </div></div>
          </div>${daysGrid}
      </div></div>`;
    }).join('');
    return `${cards}
      <div class="bottom-cta mt-3">
        <button class="btn btn-lg btn-primary w-100 btn-tall" data-action="go-today">GO</button>
      </div>`;
  }
  function renderDaysGrid(days, weekNumber){
    const top = days.slice(0,4).map((d,di)=> dayPill(d,weekNumber,di+1)).join('');
    const bottom = days.slice(4).map((d,di)=> dayPill(d,weekNumber,di+5)).join('');
    return `<div class="week-grid">${top}</div><div class="week-grid mt-2" style="grid-template-columns: repeat(3, 1fr);">${bottom}</div>`;
  }
  function dayPill(day, weekNumber, dayNumber){
    const disabled = day.completed ? 'disabled' : '';
    const rest = day.rest ? '<i class="bi bi-cup-hot me-1"></i>Descanso' : `Día ${dayNumber}`;
    const badge = day.completed ? '<span class="badge text-bg-success ms-2">Hecho</span>': '';
    return `<button class="btn btn-outline-secondary" data-action="pick-day" data-week="${weekNumber}" data-day="${dayNumber}" ${disabled}>${rest}${badge}</button>`;
  }
  function viewTrainingDay(){
    const { currentWeek, currentDay } = state.training;
    const w = state.plan.weeks[currentWeek-1];
    const d = w.days[currentDay-1];
    const items = d.exercises.map((x,i)=>{
      const ex = state.exDict.get(x.exercise_id) || { name: x.exercise_id };
      const dose = x.time ? `${x.time}s` : `${x.reps} reps`;
      return `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-semibold">${i+1}. ${ex.name}</span>
          <button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${x.exercise_id}"><i class="bi bi-info-circle"></i></button>
          <div class="small text-secondary">${dose} • ${x.sets||1} serie(s)</div>
        </div>
        <i class="bi bi-play-circle"></i>
      </li>`;
    }).join('');
    return `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">Día ${currentDay} · Semana ${currentWeek}</h5>
        <div class="text-end small text-secondary">
          <div><i class="bi bi-stopwatch me-1"></i> ${fmt.time(d.estimated_minutes)}</div>
          <div><i class="bi bi-list-check me-1"></i> ${d.exercises.length} ejercicios</div>
        </div>
      </div>
      <ul class="list-group mb-3">${items}</ul>
      <div class="bottom-cta d-grid">
        <button class="btn btn-lg btn-primary w-100 btn-tall" data-action="start-training">Start</button>
      </div>`;
  }
  function viewTrainingCountdown(){
    return `
      <div class="text-center py-5">
        <div class="mb-4"><div class="exercise-media d-flex align-items-center justify-content-center">
          <i class="bi bi-hourglass-split fs-1"></i>
        </div></div>
        <p class="text-secondary">Comienza en...</p>
        <div class="countdown" id="countdownNum">${state.training.countdownLeft}</div>
      </div>`;
  }
  function viewTrainingExercise(){
    const ctx = currentExerciseCtx();
    const ex = ctx.ex;
    const isTimed = !!ctx.step.time;
    const total = ctx.total;
    const completed = ctx.index; // ejercicios completados antes del actual
    const setInfo = `${state.training.currentSet}/${ctx.step.sets||1}`;
    const progressPct = Math.round((ctx.index / total) * 100);
    return `
      <div class="mb-3"><div class="exercise-media d-flex align-items-center justify-content-center">
        ${isTimed ? `<span class="timer-large" id="timedLeftNum">${state.training.timedLeft || ctx.step.time}</span>` : `<span>Vídeo</span>`}
      </div></div>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="mb-1">${ex.name}
            <button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${ctx.step.exercise_id}"><i class="bi bi-info-circle"></i></button>
          </h5>
          <div class="text-secondary">Serie ${setInfo}</div>
        </div>
        <div class="text-end">
          <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
          <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
        </div>
      </div>
      <div class="mb-2 small text-secondary">Completado ${completed}/${total} ejercicios</div>
      <div class="progress progress-mini mb-3" role="progressbar"><div class="progress-bar" style="width:${progressPct}%"></div></div>
      <div class="timer-area mb-3">
        ${isTimed ? `
          <button class="btn btn-outline-light btn-sm me-2" data-action="${state.training.timerPaused ? 'resume-timer' : 'pause-timer'}">
            <i class="bi ${state.training.timerPaused ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
          </button>
          <div class="timer-large" id="timedLeftNum">${state.training.timedLeft || ctx.step.time}</div>`
        : `<span class="text-secondary">—</span>`}
      </div>
      <div class="d-grid gap-2 mb-3">
        <button class="btn btn-success btn-lgx btn-tall" data-action="complete-set">Completar serie</button>
      </div>
      <div class="bottom-actions d-grid">
        <button class="btn btn-outline-danger btn-lgx btn-tall" data-action="finish-now">Finalizar entrenamiento</button>
      </div>`;
  }
  function viewTrainingRest(){
    const ctx = currentExerciseCtx();
    const sets = ctx.step.sets || 1;
    const stillSameExercise = state.training.currentSet <= sets;
    const nextName = stillSameExercise ? ctx.ex.name : (ctx.next?.ex?.name || '—');
    const restLeft = state.training.restLeft;
    const total = ctx.total;
    const completed = ctx.index + (stillSameExercise ? 0 : 1);
    const progressPct = Math.round((completed / total) * 100);
    return `
      <div class="mb-3"><div class="exercise-media">
        <img src="https://images.unsplash.com/photo-1526404079164-3c7f7b6a8ee8?q=80&w=1200&auto=format&fit=crop" alt="Descanso">
      </div></div>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="mb-1">${stillSameExercise ? 'Recupera entre series' : 'Descanso entre ejercicios'}</h5>
          <div class="text-secondary">Siguiente: <strong>${nextName}</strong></div>
        </div>
        <div class="text-end">
          <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
          <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
        </div>
      </div>
      <div class="mb-2 small text-secondary">Completado ${completed}/${total} ejercicios</div>
      <div class="progress progress-mini mb-3" role="progressbar"><div class="progress-bar" style="width:${progressPct}%"></div></div>
      <div class="timer-area mb-3"><div class="countdown" id="restNum">${restLeft}</div></div>
      <div class="d-grid gap-2 mb-3">
        <button class="btn btn-outline-secondary btn-lgx btn-tall" data-action="extend-rest">+10s</button>
        <button class="btn btn-primary btn-lgx btn-tall" data-action="end-rest">Finalizar descanso</button>
      </div>
      <div class="bottom-actions d-grid">
        <button class="btn btn-outline-danger btn-lgx btn-tall" data-action="finish-now">Finalizar entrenamiento</button>
      </div>`;
  }
  function viewTrainingFinished(){
    const { kcal, minutes } = estimateSession();
    const key = dayKey();
    state.stats.daysCompleted[key] = true; saveStats();
    const weekDays = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
    const marks = weekDays.map((label, i)=>{
      const done = state.stats.daysCompleted[dayKey(shiftToDow(i))];
      const icon = done ? 'bi-check-circle-fill text-success' : 'bi-dash-circle text-secondary';
      return `<div class="text-center p-2 rounded bg-body-tertiary"><div class="fw-semibold">${label}</div><i class="bi ${icon}"></i></div>`;
    }).join('');
    setTimeout(()=>{ triggerConfetti(); try{ state.audio.applause?.play(); }catch(e){} }, 100);
    const exCount = dayContext().day.exercises.length;
    return `
      <div class="text-center">
        <div class="ratio ratio-16x9 mb-3">
          <img src="https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop" class="object-fit-cover rounded" alt="¡Buen trabajo!"/>
        </div>
        <h4>¡Entrenamiento completado!</h4><p class="text-secondary">Sigue así, la constancia se nota.</p>
      </div>
      <div class="row row-cols-3 g-3 mb-3">
        <div class="col">${statCard('bi-list-check','Ejercicios', exCount)}</div>
        <div class="col">${statCard('bi-fire','Kcal', Math.round(kcal))}</div>
        <div class="col">${statCard('bi-stopwatch','Tiempo', minutes)}</div>
      </div>
      <section class="mb-3"><div class="week-grid two-rows">${marks}</div></section>
      <div class="bottom-cta"><button class="btn btn-lg btn-success w-100 btn-tall" data-action="finish-session">Done</button></div>`;
  }

  // PROGRESS
  function viewProgress(){
    const s = state.stats;
    const waist = s.waistWeekly.map(x=>`<li class="list-group-item d-flex justify-content-between"><span>${x.date}</span><span>${x.cm} cm</span></li>`).join('') || '<li class="list-group-item">Sin datos</li>';
    return `
      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Resumen</h5>
        <div class="row g-3">
          ${statCard('bi-activity','Entrenamientos', s.trainingsDone)}
          ${statCard('bi-stopwatch','Minutos', s.minutesTrained)}
          ${statCard('bi-fire','Kcal', s.kcalBurned)}
        </div>
      </div></div>
      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Peso</h5>
        <div class="d-flex gap-3 align-items-center"><div class="flex-grow-1">
          <div class="input-group">
            <span class="input-group-text">kg</span>
            <input type="number" step="0.1" class="form-control" id="weightInput" placeholder="Añade tu peso">
            <button class="btn btn-outline-primary" data-action="save-weight">Guardar</button>
          </div>
          <div class="small text-secondary mt-2">Inicial: ${s.weight.initial??'—'} · Último: ${s.weight.last??'—'}</div>
        </div></div>
      </div></div>
      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Perímetro de cintura</h5>
        <div class="input-group mb-2">
          <span class="input-group-text">cm</span>
          <input type="number" step="0.1" class="form-control" id="waistInput" placeholder="Añade perímetro de cintura">
          <button class="btn btn-outline-primary" data-action="save-waist">Guardar</button>
        </div>
        <ul class="list-group">${waist}</ul>
      </div></div>`;
  }

  // SETTINGS
  function viewSettings(){
    const s = state.settings;
    const seconds = [10,9,8,7,6,5,4,3,2,1];
    const checks = seconds.map(sec=>{
      const checked = s.countdownSpokenSeconds.includes(sec) ? 'checked' : '';
      return `<div class="form-check form-check-inline mb-2">
        <input class="form-check-input" type="checkbox" value="${sec}" id="sec${sec}" ${checked}>
        <label class="form-check-label" for="sec${sec}">${sec}s</label>
      </div>`;
    }).join('');
    return `
      <div class="card mb-3"><div class="card-body">
        <h5 class="card-title">Voz</h5>
        <div class="form-check form-switch mb-2">
          <input class="form-check-input" type="checkbox" id="voiceEnabled" ${s.voiceEnabled?'checked':''}>
          <label class="form-check-label" for="voiceEnabled">Activar voz</label>
        </div>
        <div class="mb-2">
          <label class="form-label">Voz</label>
          <select class="form-select" id="voiceGender">
            <option value="female" ${s.voiceGender==='female'?'selected':''}>Femenina</option>
            <option value="male" ${s.voiceGender==='male'?'selected':''}>Masculina</option>
          </select>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="speakExerciseName" ${s.speakExerciseName?'checked':''}>
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
            <input type="number" min="0" class="form-control" id="restBetweenSets" placeholder="p.ej. 20" value="${s.restBetweenSets ?? ''}">
          </div>
          <div class="col-6">
            <label class="form-label">Entre ejercicios (s)</label>
            <input type="number" min="0" class="form-control" id="restBetweenExercises" placeholder="p.ej. 30" value="${s.restBetweenExercises ?? ''}">
          </div>
        </div>
      </div></div>
      <div class="bottom-cta d-grid"><button class="btn btn-primary btn-lg" data-action="save-settings">Guardar</button></div>`;
  }

  // --- Lógica de entrenamiento ---------------------------------------------
  let timers = { id: null };

  function bindEvents(){
    // bottom nav
    $$('#bottomNav .nav-link').forEach(b=>{ b.onclick = () => { state.view = b.dataset.view; render(); }; });
    // lista semanas/días
    $('[data-action="go-today"]')?.addEventListener('click', ()=>{ state.training.currentWeek = 1; state.training.currentDay = 1; state.training.substate = 'day'; render(); });
    $$('#appContent [data-action="pick-day"]').forEach(btn=>{ btn.onclick = () => { state.training.currentWeek = Number(btn.dataset.week); state.training.currentDay = Number(btn.dataset.day); state.training.substate = 'day'; render(); }; });
    // info de ejercicio → offcanvas
    $$('#appContent [data-action="help-ex"]').forEach(b=> b.onclick = showExerciseHelp);
    // comenzar
    $('[data-action="start-training"]')?.addEventListener('click', ()=>{ state.training.substate = 'countdown'; state.training.countdownLeft = 15; render(); runCountdown(); });
    // ejercicio
    $('[data-action="prev-ex"]')?.addEventListener('click', prevExercise);
    $('[data-action="next-ex"]')?.addEventListener('click', nextExercise);
    $('[data-action="complete-set"]')?.addEventListener('click', completeSet);
    $('[data-action="pause-timer"]')?.addEventListener('click', pauseTimer);
    $('[data-action="resume-timer"]')?.addEventListener('click', resumeTimer);
    $$('#appContent [data-action="finish-now"]').forEach(b => b.addEventListener('click', jumpToFinished));
    // descanso
    $('[data-action="extend-rest"]')?.addEventListener('click', extendRest);
    $('[data-action="end-rest"]')?.addEventListener('click', endRest);
    // finalizar
    $('[data-action="finish-session"]')?.addEventListener('click', ()=>{ state.view='home'; state.training.substate='list'; state.training.currentExerciseIndex=0; render(); });
    // progreso
    $('[data-action="save-weight"]')?.addEventListener('click', saveWeight);
    $('[data-action="save-waist"]')?.addEventListener('click', saveWaist);
    // settings
    $('[data-action="save-settings"]')?.addEventListener('click', saveSettingsFromUI);
  }

  function dayContext(){ const w = state.plan.weeks[state.training.currentWeek-1]; const day = w.days[state.training.currentDay-1]; return { w, day }; }
  function currentExerciseCtx(){
    const { day } = dayContext();
    const idx = state.training.currentExerciseIndex;
    const step = day.exercises[idx];
    const ex = state.exDict.get(step.exercise_id) || { name: step.exercise_id };
    const total = day.exercises.length;
    let next=null; if (idx+1 < total){ const nx = day.exercises[idx+1]; next = { step: nx, ex: state.exDict.get(nx.exercise_id)||{name:nx.exercise_id} }; }
    return { day, step, ex, index: idx, total, next };
  }

  // Cuenta atrás de inicio
  function runCountdown(){
    clearInterval(timers.id);
    timers.id = setInterval(()=>{
      const n = --state.training.countdownLeft;
      const node = $('#countdownNum'); if (node) node.textContent = n;
      if (n<=0){ clearInterval(timers.id); try{ state.audio.whistle?.play(); }catch(e){}; startExercise(); }
    }, 1000);
  }

  // Arrancar ejercicio (prepara timer si procede)
  function startExercise(){
    state.training.substate = 'exercise';
    state.training.startedAt = state.training.startedAt || Date.now();
    state.training.timerPaused = false;
    render();
    const ctx = currentExerciseCtx();
    try { announceNextExercise(ctx, 'inicio'); } catch(e) {}
    if (ctx.step.time){ state.training.timedLeft = ctx.step.time; runTimedSet(); }
  }

  // Timer por tiempo
  function runTimedSet(){
    clearInterval(timers.id);
    timers.id = setInterval(()=>{
      if (state.training.timerPaused) return;
      const n = --state.training.timedLeft;
      const node = $('#timedLeftNum'); if (node) node.textContent = Math.max(0,n);
      if (state.settings.countdownSpokenSeconds.includes(n)) { try{ state.audio.beep?.play(); }catch(e){}; say(String(n)); }
      if (n<=0){ clearInterval(timers.id); completeSet(); }
    },1000);
  }
  function pauseTimer(){ state.training.timerPaused = true; render(); }
  function resumeTimer(){ state.training.timerPaused = false; render(); }

  // Rest helpers (override por configuración)
  function getRestBetweenSets(step){ const cfg=state.settings.restBetweenSets; return (typeof cfg==='number'&&cfg>=0) ? cfg : (step.rest || 20); }
  function getRestBetweenExercises(step){ const cfg=state.settings.restBetweenExercises; const fallback = step.rest_next || step.rest || 30; return (typeof cfg==='number'&&cfg>=0) ? cfg : fallback; }

  // Completar la serie actual
  function completeSet(){
    const ctx = currentExerciseCtx();
    const totalSets = ctx.step.sets || 1;
    if (state.training.currentSet < totalSets){
      state.training.currentSet++;
      state.training.substate = 'rest';
      state.training.restLeft = getRestBetweenSets(ctx.step);
      render();
      try { announceNextExercise(currentExerciseCtx(), 'proximo'); } catch(e) {}
      runRest();
      return;
    }
    completeExercise();
  }

  // Completar ejercicio y pasar al siguiente/fin
  function completeExercise(){
    const ctx = currentExerciseCtx();
    if (ctx.index+1 < ctx.total){
      state.training.currentExerciseIndex++;
      state.training.currentSet = 1;
      state.training.substate = 'rest';
      state.training.restLeft = getRestBetweenExercises(ctx.step);
      render();
      try { announceNextExercise(currentExerciseCtx(), 'proximo'); } catch(e) {}
      runRest();
    } else {
      state.training.substate = 'finished';
      state.training.finishedAt = Date.now();
      const { kcal, minutes } = estimateSession();
      state.stats.trainingsDone += 1;
      state.stats.minutesTrained += minutes;
      state.stats.kcalBurned += Math.round(kcal);
      saveStats();
      render();
    }
  }

  // Descanso
  function runRest(){
    clearInterval(timers.id);
    timers.id = setInterval(()=>{
      const n = --state.training.restLeft;
      const node = $('#restNum'); if (node) node.textContent = n;
      if (n<=0){ clearInterval(timers.id); endRest(); }
    },1000);
  }
  function extendRest(){ state.training.restLeft += 10; const n=$('#restNum'); if(n) n.textContent=state.training.restLeft; }
  function endRest(){ startExercise(); }
  function prevExercise(){ if (state.training.currentExerciseIndex>0){ state.training.currentExerciseIndex--; state.training.currentSet=1; startExercise(); } }
  function nextExercise(){ const ctx=currentExerciseCtx(); if (ctx.index+1<ctx.total){ state.training.currentExerciseIndex++; state.training.currentSet=1; startExercise(); } }

  function estimateSession(){
    const { day } = dayContext(); let seconds = 0; let kcal = 0;
    day.exercises.forEach(s=>{
      const sets = s.sets||1;
      const tPerSet = s.time ? s.time : (s.reps? s.reps*2 : 30);
      seconds += tPerSet*sets + (getRestBetweenSets(s))*(sets-1) + (getRestBetweenExercises(s));
      const intensity = s.intensity || 'moderate';
      const met = intensity==='high' ? 8 : intensity==='low' ? 3 : 5;
      kcal += (met * 70 / 60) * (tPerSet*sets/60);
    });
    const minutes = Math.max(1, Math.round(seconds/60));
    return { minutes, kcal };
  }

  // Offcanvas ayuda
  function showExerciseHelp(ev){
    const id = ev.currentTarget.dataset.exerciseId;
    const ex = state.exDict.get(id);
    const help = $('#helpContent');
    if (ex){
      help.innerHTML = `<h6 class="mb-2">${ex.name}</h6>
        <p class="small text-secondary mb-2">Grupos musculares: <strong>${(ex.muscles||[]).join(', ')||'—'}</strong></p>
        <p>${ex.description||'Descripción no disponible.'}</p>
        ${ex.cues? `<ul class="small">${ex.cues.map(c=>`<li>${c}</li>`).join('')}</ul>`: ''}
        ${ex.links? `<div class="small">Referencias: ${ex.links.map(h=>`<a href="${h}" target="_blank" rel="noopener">enlace</a>`).join(' · ')}</div>`: ''}`;
    } else { help.textContent = 'No hay información disponible.'; }
    const canvas = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp');
    if (canvas && canvas.show) canvas.show();
  }

  // Guardado de métricas
  function saveWeight(){ const v = Number($('#weightInput').value); if (!isFinite(v)) return; const w = state.stats.weight; if (w.initial==null) w.initial = v; w.last = v; saveStats(); render(); }
  function saveWaist(){ const v = Number($('#waistInput').value); if (!isFinite(v)) return; state.stats.waistWeekly.push({ date: new Date().toISOString().slice(0,10), cm: v }); saveStats(); render(); }

  // Guardado de settings
  function saveSettingsFromUI(){
    const s = state.settings;
    s.voiceEnabled = !!$('#voiceEnabled')?.checked;
    s.voiceGender = $('#voiceGender')?.value || 'female';
    s.speakExerciseName = !!$('#speakExerciseName')?.checked;
    const seconds = [10,9,8,7,6,5,4,3,2,1];
    s.countdownSpokenSeconds = seconds.filter(sec => $('#sec'+sec)?.checked);
    const rbs = Number($('#restBetweenSets')?.value); s.restBetweenSets = Number.isFinite(rbs) && rbs>=0 ? rbs : null;
    const rbe = Number($('#restBetweenExercises')?.value); s.restBetweenExercises = Number.isFinite(rbe) && rbe>=0 ? rbe : null;
    saveSettings(); render();
  }

  // Confeti
  function triggerConfetti(){
    const canvas = $('#confettiCanvas'); const ctx = canvas.getContext('2d');
    const W = canvas.width = window.innerWidth; const H = canvas.height = window.innerHeight; const N = 120;
    const parts = Array.from({length:N},()=>({
      x: Math.random()*W, y: -20, r: 3+Math.random()*4, vx: -2+Math.random()*4, vy: 2+Math.random()*3, a: Math.random()*Math.PI, va: -0.1+Math.random()*0.2
    }));
    let t=0, stop=false;
    function step(){ if (stop) return; t++; ctx.clearRect(0,0,W,H);
      parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.a+=p.va; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.fillStyle = `hsl(${(p.x/W)*360},90%,60%)`; ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2); ctx.restore(); });
      if (t<240) requestAnimationFrame(step); else { stop=true; ctx.clearRect(0,0,W,H); }
    }
    step();
  }

  // Saltar a finalizado
  function jumpToFinished(){ clearInterval(timers.id); state.training.substate = 'finished'; state.training.finishedAt = Date.now(); const { kcal, minutes } = estimateSession(); state.stats.trainingsDone += 1; state.stats.minutesTrained += minutes; state.stats.kcalBurned += Math.round(kcal); saveStats(); render(); }

  // DEMO DATA
  const demoPlan = { weeks: [ { days: [
    { rest:false, estimated_minutes: 25, completed:false, exercises:[
      { exercise_id:'PUSHUP', reps:12, sets:3, rest:20, intensity:'moderate' },
      { exercise_id:'PLANK', time:40, sets:2, rest:30, intensity:'low' },
      { exercise_id:'SQUAT', reps:10, sets:2, rest:25, intensity:'moderate' },
    ]},
    { rest:false, estimated_minutes: 22, completed:false, exercises:[
      { exercise_id:'ROW', reps:12, sets:3, rest:20, intensity:'moderate' },
      { exercise_id:'SIDE_PLANK', time:30, sets:2, rest:30, intensity:'low' },
    ]},
    { rest:true, estimated_minutes: 0, completed:false, exercises:[] },
    { rest:false, estimated_minutes: 20, completed:false, exercises:[
      { exercise_id:'HIP_HINGE', reps:12, sets:3, rest:20, intensity:'moderate' },
    ]},
    { rest:false, estimated_minutes: 25, completed:false, exercises:[
      { exercise_id:'LUNGE', reps:10, sets:3, rest:25, intensity:'moderate' },
      { exercise_id:'PLANK', time:30, sets:2, rest:30, intensity:'low' },
    ]},
    { rest:true, estimated_minutes: 0, completed:false, exercises:[] },
    { rest:false, estimated_minutes: 18, completed:false, exercises:[
      { exercise_id:'PUSHUP', reps:10, sets:3, rest:20, intensity:'moderate' },
    ]},
  ] } ] };
  const demoExDict = { exercises: [
    { exercise_id:'PUSHUP', name:'Flexiones', muscles:['pecho','tríceps','core'], description:'Apoya manos bajo hombros. Cuerpo en tabla.', cues:['Codos a ~45°','Core firme','Respira'], links:[] },
    { exercise_id:'PLANK', name:'Plancha', muscles:['core'], description:'Mantén cuerpo alineado en antebrazos.', cues:['No hundas lumbares','Respira'], links:[] },
    { exercise_id:'SQUAT', name:'Sentadilla', muscles:['piernas','glúteos'], description:'Baja cadera atrás, pecho alto.', cues:['Rodillas siguen punta de pies'], links:[] },
    { exercise_id:'ROW', name:'Remo inclinado', muscles:['espalda','bíceps'], description:'Tira de codos atrás.', cues:[], links:[] },
    { exercise_id:'SIDE_PLANK', name:'Plancha lateral', muscles:['core'], description:'Apoya antebrazo, cuerpo recto.', cues:[], links:[] },
    { exercise_id:'HIP_HINGE', name:'Bisagra de cadera', muscles:['isquios','glúteo'], description:'Charniere cadera manteniendo espalda neutra.', cues:[], links:[] },
    { exercise_id:'LUNGE', name:'Zancadas', muscles:['piernas','glúteos'], description:'Paso amplio, rodilla atrás al suelo.', cues:[], links:[] },
  ] };

  window.addEventListener('load', ()=>{
    const h = (location.hash||'').replace('#','');
    if (['home','training','progress','settings'].includes(h)) state.view = h;
    bootstrap();
  });
})();
