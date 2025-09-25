/* StriveFit – Full App (restored training + settings + sounds) */
(() => {
  // ---------- Tiny helpers
  const $ = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));
  const JSON_PLAN_URL = './data/plan.json';
  const JSON_EX_DICT_URL = './data/exercises.json';

  // ---------- State
  const state = {
    view: 'home',
    training: {
      substate: 'list', // list | day | countdown | exercise | rest | finished
      currentWeek: 1, currentDay: 1,
      currentExerciseIndex: 0,
      currentSet: 1,
      countdownLeft: 15,
      timedLeft: 0,
      restLeft: 0,
      timerPaused: false,
      startedAt: null, finishedAt: null
    },
    plan: null,
    exDict: new Map(),
    stats: loadStats(),
    settings: loadSettings(),
    userPlans: loadUserPlans(),
    currentPlanId: loadCurrentPlanId(),
    audio: {}
  };

  // ---------- Persistence
  function loadStats(){
    try{
      const s = JSON.parse(localStorage.getItem('sf_stats')||'{}');
      return {
        trainingsDone: +s.trainingsDone||0,
        minutesTrained: +s.minutesTrained||0,
        kcalBurned: +s.kcalBurned||0,
        weight: s.weight || {initial:null,last:null},
        waistWeekly: Array.isArray(s.waistWeekly)? s.waistWeekly : [],
        daysCompleted: s.daysCompleted || {},
      };
    }catch{ return { trainingsDone:0, minutesTrained:0, kcalBurned:0, weight:{initial:null,last:null}, waistWeekly:[], daysCompleted:{} }; }
  }
  function saveStats(){ localStorage.setItem('sf_stats', JSON.stringify(state.stats)); }
  function loadSettings(){
    try{
      const s = JSON.parse(localStorage.getItem('sf_settings')||'{}');
      return {
        voiceEnabled: typeof s.voiceEnabled==='boolean'? s.voiceEnabled : true,
        voiceGender: s.voiceGender || 'female',
        countdownSpokenSeconds: Array.isArray(s.countdownSpokenSeconds)? s.countdownSpokenSeconds : [10,5,3],
        speakExerciseName: typeof s.speakExerciseName==='boolean'? s.speakExerciseName : true,
        restBetweenSets: (typeof s.restBetweenSets==='number'&&s.restBetweenSets>=0)? s.restBetweenSets : null,
        restBetweenExercises: (typeof s.restBetweenExercises==='number'&&s.restBetweenExercises>=0)? s.restBetweenExercises : null,
      };
    }catch{ return { voiceEnabled:true, voiceGender:'female', countdownSpokenSeconds:[10,5,3], speakExerciseName:true, restBetweenSets:null, restBetweenExercises:null }; }
  }
  function saveSettings(){ localStorage.setItem('sf_settings', JSON.stringify(state.settings)); }
  function loadUserPlans(){ try{ const arr=JSON.parse(localStorage.getItem('sf_plans')||'[]'); return Array.isArray(arr)?arr:[]; }catch{return[]} }
  function saveUserPlans(){ localStorage.setItem('sf_plans', JSON.stringify(state.userPlans)); }
  function loadCurrentPlanId(){ return localStorage.getItem('sf_current_plan') || 'builtin'; }
  function saveCurrentPlanId(id){ state.currentPlanId=id; localStorage.setItem('sf_current_plan', id); }

  // ---------- Sounds (safe)
  function loadAudio(){
    state.audio.whistle = mkAudio('./assets/whistle.wav', 0.8);
    state.audio.applause = mkAudio('./assets/applause.wav', 0.7);
    state.audio.beep = mkAudio('./assets/beep.wav', 0.6);
  }
  function mkAudio(src, volume=1){ const a=new Audio(); a.src=src; a.preload='auto'; a.volume=volume; a.onerror=()=>{}; return a; }
  function play(a){ try{ if(a){ a.currentTime=0; a.play?.(); } }catch(_){} }

  // ---------- TTS
  function voiceByGender(g='female'){
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const es = voices.filter(v=>/^es[-_]/i.test(v.lang));
    const preferred = es.find(v=> g==='female' ? /female|mujer|fem/i.test(v.name) : /male|hombre|masc/i.test(v.name));
    return preferred || es[0] || voices[0] || null;
  }
  function speak(text){
    if (!state.settings.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang='es-ES';
    const v = voiceByGender(state.settings.voiceGender); if (v) u.voice=v;
    u.pitch = state.settings.voiceGender==='female'? 1.15 : 0.95; u.rate=1; window.speechSynthesis.speak(u);
  }

  // ---------- Plan / dict normalization
  const stepId = s => s?.exercise_id ?? s?.id ?? s?.exerciseId ?? s?.code ?? null;
  const stepTime = s => (s?.time ?? s?.seconds ?? null);
  const stepReps = s => {
    const r = s?.reps;
    if (typeof r==='number') return r;
    if (typeof r==='string'){ const m=r.match(/\d+/); return m?Number(m[0]):null; }
    return null;
  };
  const stepSets = s => Number(s?.sets ?? 1) || 1;
  function stepDisplayName(s, i=0){
    const sid = stepId(s);
    const ex = (sid!=null)? (state.exDict.get(String(sid)) || state.exDict.get(sid)) : null;
    return ex?.name || s?.name || (sid!=null? String(sid) : `Ejercicio ${i+1}`);
  }

  function normalizePlan(pl){
    if (!pl || !Array.isArray(pl.weeks)) return defaultPlan();
    pl.weeks.forEach(w=>{
      w.days = Array.isArray(w.days)? w.days : [];
      w.days.forEach(d=>{
        d.exercises = Array.isArray(d.exercises)? d.exercises : [];
        d.exercises = d.exercises.map(x=>({
          ...x,
          id: x.id ?? x.exercise_id ?? x.exerciseId ?? x.code ?? x.name ?? null,
          sets: stepSets(x),
          seconds: stepTime(x) ?? (typeof x?.duration==='number'? x.duration : null),
          reps: stepReps(x)
        }));
      });
    });
    return pl;
  }
  function buildDict(list){
    const m = new Map();
    (list||[]).forEach(x=>{
      const ids = [x.exercise_id, x.id, x.code].filter(v=>v!=null);
      ids.forEach(k=> m.set(String(k), { ...x, id: x.id ?? x.exercise_id ?? x.code }));
    });
    return m;
  }
  function mergePlanNamesIntoDict(){
    try{
      (state.plan?.weeks||[]).forEach(w=> (w.days||[]).forEach(d=> (d.exercises||[]).forEach(s=>{
        const sid = stepId(s);
        if (sid!=null && !state.exDict.has(String(sid))) state.exDict.set(String(sid), { id:String(sid), name:s.name||String(sid) });
      })));
    }catch(_){}
  }
  function defaultPlan(){
    return { weeks:[{ days:[
      { rest:false, exercises:[ {id:'PUSHUP', reps:12, sets:3}, {id:'PLANK', seconds:40, sets:2}, {id:'SQUAT', reps:10, sets:2} ] },
      { rest:true, exercises:[] },
      { rest:false, exercises:[ {id:'PUSHUP', reps:10, sets:3} ] },
    ] } ] };
  }

  // ---------- UI text
  const MOTOS = ['Un poco cada día suma mucho.','Tu cuerpo te está viendo: háblale con hechos.','La constancia vence al talento.','Hoy cuenta. Mañana agradecerás este momento.','Respira, aprieta, progresa.','No perfecto, pero sí presente.','Fuerte es el hábito, no el impulso.'];
  const dailyMotto = ()=>MOTOS[Math.floor(Date.now()/86400000)%MOTOS.length];

  // ---------- Bootstrap
  async function bootstrap(){
    try{
      const [rawPlan, dict] = await Promise.all([
        fetch(JSON_PLAN_URL).then(r=>r.ok?r.json():Promise.reject('plan')),
        fetch(JSON_EX_DICT_URL).then(r=>r.ok?r.json():Promise.reject('dict'))
      ]);
      state.plan = normalizePlan(rawPlan);
      state.exDict = buildDict(dict?.exercises||[]);
      mergePlanNamesIntoDict();
    }catch(_){
      state.plan = defaultPlan();
      state.exDict = new Map([ ['PUSHUP',{id:'PUSHUP',name:'Flexiones'}], ['PLANK',{id:'PLANK',name:'Plancha'}], ['SQUAT',{id:'SQUAT',name:'Sentadilla'}] ]);
    }
    loadAudio();
    render();
  }

  // ---------- Render
  function render(){
    const host = $('#appContent'); if (!host) return;
    $$('#bottomNav .nav-link').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
    if (state.view==='home') host.innerHTML = viewHome();
    else if (state.view==='training') host.innerHTML = viewTraining();
    else if (state.view==='progress') host.innerHTML = `<div class="alert alert-secondary">Resumen próximamente.</div>`;
    else if (state.view==='settings') host.innerHTML = viewSettings();
    bindEvents();
  }

  function viewHome(){
    const weekDays=['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
    const marks = weekDays.map(l=>`<div class="text-center p-2 rounded bg-body-tertiary"><div class="fw-semibold">${l}</div><i class="bi bi-dash-circle text-secondary"></i></div>`).join('');
    return `
      <section class="mb-3">
        <div class="hero">
          <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop" alt="Entrena">
          <div class="overlay"></div>
          <div class="motto">${dailyMotto()}</div>
        </div>
      </section>
      <section class="mb-3"><div class="week-grid two-rows">${marks}</div></section>
      <section class="card mt-3">
        <div class="card-body">
          <h5 class="card-title">Entrenamientos</h5>
          <div class="mb-2 small text-secondary">Carga archivos JSON de entrenamiento. Se guardan y podrás elegir cuál usar.</div>
          <div class="input-group mb-3">
            <input class="form-control" type="file" id="planFileInput" accept="application/json">
            <button class="btn btn-outline-primary" data-action="upload-plan">Cargar</button>
          </div>
          <div>${renderPlansList()}</div>
        </div>
      </section>`;
  }
  function renderPlansList(){
    const items = [{id:'builtin', name:'Plan por defecto'}].concat((state.userPlans||[]).map(p=>({id:p.id, name:p.name})));
    return `<ul class="list-group">
      ${items.map(p=>`<li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${p.name}${p.id===state.currentPlanId ? ' <span class="badge text-bg-success ms-2">Activo</span>' : ''}</span>
        <div class="d-flex gap-2">
          ${p.id!=='builtin' ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-plan" data-plan="${p.id}"><i class="bi bi-trash"></i></button>`:''}
          ${p.id!==state.currentPlanId ? `<button class="btn btn-sm btn-primary" data-action="use-plan" data-plan="${p.id}">Usar</button>`:''}
        </div>
      </li>`).join('')}
    </ul>`;
  }

  // ---------- Training views
  function viewTraining(){
    const s = state.training;
    if (s.substate==='list') return viewTrainingList();
    if (s.substate==='day') return viewTrainingDay();
    if (s.substate==='countdown') return viewTrainingCountdown();
    if (s.substate==='exercise') return viewTrainingExercise();
    if (s.substate==='rest') return viewTrainingRest();
    if (s.substate==='finished') return viewTrainingFinished();
    return viewTrainingList();
  }
  function viewTrainingList(){
    const weeks = state.plan?.weeks || [];
    if (!weeks.length){
      return `<div class="alert alert-secondary">
        <div class="mb-2">No hay un plan de entrenamiento activo.</div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" data-action="use-builtin-plan">Usar plan por defecto</button>
          <a class="btn btn-outline-light" data-view="home">Ir a Start para cargar un plan</a>
        </div>
      </div>`;
    }
    const cards = weeks.map((w, wi)=>{
      const daysGrid = renderDaysGrid(w.days||[], wi+1);
      return `<div class="card mb-3"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0">Semana ${wi+1}</h5>
        </div>${daysGrid}
      </div></div>`;
    }).join('');
    return `${cards}
      <div class="bottom-cta mt-3"><button class="btn btn-lg btn-primary w-100 btn-tall" data-action="go-today"><i class="bi bi-lightning-charge me-1"></i>GO</button></div>`;
  }
  function renderDaysGrid(days, weekNumber){
    const top = (days.slice(0,4)||[]).map((d,di)=> dayPill(d,weekNumber,di+1)).join('');
    const bottom = (days.slice(4)||[]).map((d,di)=> dayPill(d,weekNumber,di+5)).join('');
    return `<div class="week-grid">${top}</div>
      <div class="week-grid mt-2" style="grid-template-columns: repeat(3, 1fr);">${bottom}</div>`;
  }
  function dayPill(day, weekNumber, dayNumber){
    const disabled = day?.completed ? 'disabled' : '';
    const rest = day?.rest ? '<i class="bi bi-cup-hot me-1"></i>Descanso' : `Día ${dayNumber}`;
    const badge = day?.completed ? '<span class="badge text-bg-success ms-2">Hecho</span>': '';
    return `<button class="btn btn-outline-secondary" data-action="pick-day" data-week="${weekNumber}" data-day="${dayNumber}" ${disabled}>${rest}${badge}</button>`;
  }
  function viewTrainingDay(){
    const w = state.plan?.weeks?.[state.training.currentWeek-1];
    const d = w?.days?.[state.training.currentDay-1];
    if (!d) return '<div class="alert alert-warning">No se ha encontrado el día en el plan activo.</div>';
    const items = (d.exercises||[]).map((x,i)=>{
      const dose = (stepTime(x)!=null) ? `${stepTime(x)}s` : `${stepReps(x)??'—'} reps`;
      const display = stepDisplayName(x, i);
      const id = stepId(x);
      return `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-semibold">${i+1}. ${display}</span>
          ${id!=null? `<button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${id}"><i class="bi bi-info-circle"></i></button>`:''}
          <div class="small text-secondary">${dose} • ${stepSets(x)} serie(s)</div>
        </div>
        <i class="bi bi-play-circle"></i>
      </li>`;
    }).join('');
    return `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">Día ${state.training.currentDay} · Semana ${state.training.currentWeek}</h5>
        <div class="text-end small text-secondary"><i class="bi bi-list-check me-1"></i> ${(d.exercises||[]).length} ejercicios</div>
      </div>
      <ul class="list-group mb-3">${items}</ul>
      <div class="row g-2 bottom-cta">
        <div class="col-3 d-grid">
          <button class="btn btn-secondary btn-tall" data-action="back-to-list"><i class="bi bi-arrow-left me-1"></i>Back</button>
        </div>
        <div class="col-9 d-grid">
          <button class="btn btn-lg btn-primary btn-tall" data-action="start-training"><i class="bi bi-play-fill me-1"></i>Start</button>
        </div>
      </div>`;
  }
  function viewTrainingCountdown(){
    return `<div class="text-center py-5">
      <div class="mb-4"><div class="exercise-media"><i class="bi bi-hourglass-split fs-1"></i></div></div>
      <p class="text-secondary">Comienza en...</p>
      <div class="countdown" id="countdownNum">${state.training.countdownLeft}</div>
    </div>`;
  }
  function viewTrainingExercise(){
    const ctx = currentExerciseCtx();
    const exName = stepDisplayName(ctx.step, ctx.index);
    const isTimed = stepTime(ctx.step)!=null;
    const total = ctx.total;
    const completed = ctx.index;
    const setInfo = `${state.training.currentSet}/${ctx.step.sets||1}`;
    const progressPct = Math.round((completed/total)*100);
    const timerBlock = isTimed
      ? `<button class="btn btn-outline-light btn-sm me-2" data-action="${state.training.timerPaused?'resume-timer':'pause-timer'}"><i class="bi ${state.training.timerPaused?'bi-play-fill':'bi-pause-fill'}"></i></button>
         <div class="timer-large" id="timedLeftNum">${state.training.timedLeft || stepTime(ctx.step)}</div>`
      : `<span class="text-secondary">—</span>`;
    return `
      <div class="mb-3"><div class="exercise-media">${isTimed? `<span class="timer-large" id="timedLeftNum">${state.training.timedLeft || stepTime(ctx.step)}</span>` : `<span>Vídeo</span>`}</div></div>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="mb-1">${exName}
            <button class="btn btn-link btn-sm p-0 ms-2" data-action="help-ex" data-exercise-id="${stepId(ctx.step)}"><i class="bi bi-info-circle"></i></button>
          </h5>
          <div class="text-secondary">Serie ${setInfo}</div>
        </div>
        <div class="text-end">
          <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
          <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
        </div>
      </div>
      <div class="mb-2 small text-secondary">Completado ${completed}/${total} ejercicios</div>
      <div class="progress progress-mini mb-3"><div class="progress-bar" style="width:${progressPct}%"></div></div>
      <div class="timer-area mb-3">${timerBlock}</div>
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
    const stillSame = state.training.currentSet <= sets;
    const nextName = stillSame ? stepDisplayName(ctx.step, ctx.index) : (ctx.next? stepDisplayName(ctx.next.step, ctx.index+1) : '—');
    const total = ctx.total;
    const completed = ctx.index + (stillSame?0:1);
    const progressPct = Math.round((completed/total)*100);
    return `
      <div class="mb-3"><div class="exercise-media">
        <img src="https://images.unsplash.com/photo-1526404079164-3c7f7b6a8ee8?q=80&w=1200&auto=format&fit=crop" alt="Descanso">
      </div></div>
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="mb-1">${stillSame ? 'Recupera entre series' : 'Descanso entre ejercicios'}</h5>
          <div class="text-secondary">Siguiente: <strong>${nextName}</strong></div>
        </div>
        <div class="text-end">
          <button class="btn btn-outline-secondary btn-sm me-2" data-action="prev-ex"><i class="bi bi-skip-start"></i></button>
          <button class="btn btn-outline-primary btn-sm" data-action="next-ex"><i class="bi bi-skip-end"></i></button>
        </div>
      </div>
      <div class="mb-2 small text-secondary">Completado ${completed}/${total} ejercicios</div>
      <div class="progress progress-mini mb-3"><div class="progress-bar" style="width:${progressPct}%"></div></div>
      <div class="timer-area mb-3"><div class="countdown" id="restNum">${state.training.restLeft}</div></div>
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
    try{ play(state.audio.applause); }catch(_){}
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
      <div class="bottom-cta"><button class="btn btn-lg btn-success w-100 btn-tall" data-action="finish-session">Done</button></div>`;
  }
  function statCard(icon,label,value){
    return `<div class="card stat-card p-3 h-100"><div class="d-flex align-items-center gap-3">
      <i class="${icon}"></i><div><div class="small text-secondary">${label}</div><div class="fw-bold">${value}</div></div>
    </div></div>`;
  }

  // ---------- Training logic
  let timerId = null;
  function bindEvents(){
    // bottom nav
    $$('#bottomNav .nav-link').forEach(b=> b.onclick=()=>{ state.view=b.dataset.view; render(); });
    // any data-view link inside content
    $$('#appContent [data-view]').forEach(el=> el.onclick=()=>{ state.view=el.dataset.view; render(); });

    // catalog button in top bar (index.html should have it)
    $('[data-action="open-catalog"]')?.addEventListener('click', renderCatalogOffcanvas);

    // upload / plans
    $('[data-action="upload-plan"]')?.addEventListener('click', uploadPlanFromFile);
    $$('#appContent [data-action="use-plan"]').forEach(b=> b.onclick=()=> usePlan(b.dataset.plan));
    $$('#appContent [data-action="delete-plan"]').forEach(b=> b.onclick=()=> deletePlan(b.dataset.plan));

    // training list -> pick day
    $$('#appContent [data-action="pick-day"]').forEach(btn=>{
      btn.onclick=()=>{ state.training.currentWeek=Number(btn.dataset.week); state.training.currentDay=Number(btn.dataset.day); state.training.substate='day'; render(); };
    });
    // GO
    $('[data-action="go-today"]')?.addEventListener('click', ()=>{ state.view='training'; state.training.currentWeek=1; state.training.currentDay=1; state.training.substate='day'; render(); });

    // day actions
    $('[data-action="start-training"]')?.addEventListener('click', ()=>{ state.training.substate='countdown'; state.training.countdownLeft=15; render(); runCountdown(); });
    $('[data-action="back-to-list"]')?.addEventListener('click', ()=>{ state.training.substate='list'; render(); });

    // exercise actions
    $('[data-action="prev-ex"]')?.addEventListener('click', prevExercise);
    $('[data-action="next-ex"]')?.addEventListener('click', nextExercise);
    $('[data-action="complete-set"]')?.addEventListener('click', completeSet);
    $('[data-action="pause-timer"]')?.addEventListener('click', ()=>{ state.training.timerPaused=true; render(); });
    $('[data-action="resume-timer"]')?.addEventListener('click', ()=>{ state.training.timerPaused=false; render(); });
    $$('#appContent [data-action="finish-now"]').forEach(b=> b.addEventListener('click', jumpToFinished));

    // rest
    $('[data-action="extend-rest"]')?.addEventListener('click', ()=>{ state.training.restLeft+=10; const n=$('#restNum'); if(n) n.textContent=state.training.restLeft; });
    $('[data-action="end-rest"]')?.addEventListener('click', endRest);

    // finished
    $('[data-action="finish-session"]')?.addEventListener('click', ()=>{ state.view='home'; state.training.substate='list'; state.training.currentExerciseIndex=0; state.training.currentSet=1; render(); });

    // help offcanvas
    $$('#appContent [data-action="help-ex"]').forEach(b=> b.onclick = showExerciseHelp);

    // settings
    $('[data-action="save-settings"]')?.addEventListener('click', saveSettingsFromUI);
    $('[data-action="reset-progress"]')?.addEventListener('click', resetProgress);
    $('[data-action="clear-measurements"]')?.addEventListener('click', clearMeasurements);
  }

  function runCountdown(){
    clearInterval(timerId);
    play(state.audio.whistle);
    timerId = setInterval(()=>{
      state.training.countdownLeft--;
      const n=$('#countdownNum'); if(n) n.textContent=state.training.countdownLeft;
      if (state.settings.countdownSpokenSeconds.includes(state.training.countdownLeft)){ play(state.audio.beep); speak(String(state.training.countdownLeft)); }
      if (state.training.countdownLeft<=0){ clearInterval(timerId); startExercise(); }
    },1000);
  }
  function dayContext(){ const w=state.plan.weeks[state.training.currentWeek-1]; const day=w.days[state.training.currentDay-1]; return {w,day}; }
  function currentExerciseCtx(){
    const { day } = dayContext();
    const idx = state.training.currentExerciseIndex;
    const step = day.exercises[idx];
    const total = day.exercises.length;
    const next = (idx+1<total) ? { step: day.exercises[idx+1] } : null;
    return { day, step, index: idx, total, next };
  }
  function startExercise(){
    state.training.substate='exercise';
    state.training.startedAt = state.training.startedAt || Date.now();
    state.training.timerPaused=false;
    render();
    const ctx = currentExerciseCtx();
    if (state.settings.speakExerciseName){ const name = stepDisplayName(ctx.step, ctx.index); const t=stepTime(ctx.step); const r=stepReps(ctx.step); speak(`Inicia: ${name}${t!=null? ' - '+t+' segundos' : (r!=null? ' - '+r+' repeticiones' : '')}`); }
    if (stepTime(ctx.step)!=null){ state.training.timedLeft=stepTime(ctx.step); runTimedSet(); }
  }
  function runTimedSet(){
    clearInterval(timerId);
    timerId=setInterval(()=>{
      if (state.training.timerPaused) return;
      state.training.timedLeft--;
      const node=$('#timedLeftNum'); if (node) node.textContent=Math.max(0,state.training.timedLeft);
      if (state.settings.countdownSpokenSeconds.includes(state.training.timedLeft)){ play(state.audio.beep); speak(String(state.training.timedLeft)); }
      if (state.training.timedLeft<=0){ clearInterval(timerId); completeSet(); }
    },1000);
  }
  function getRestBetweenSets(step){ const cfg=state.settings.restBetweenSets; return (typeof cfg==='number'&&cfg>=0)? cfg : (step.rest||20); }
  function getRestBetweenExercises(step){ const cfg=state.settings.restBetweenExercises; const fb=step.rest_next||step.rest||30; return (typeof cfg==='number'&&cfg>=0)? cfg : fb; }
  function completeSet(){
    const ctx=currentExerciseCtx();
    const totalSets = ctx.step.sets||1;
    if (state.training.currentSet < totalSets){
      state.training.currentSet++;
      state.training.substate='rest'; state.training.restLeft = getRestBetweenSets(ctx.step);
      render(); speak(`Descanso de ${state.training.restLeft} segundos`); runRest(); return;
    }
    completeExercise();
  }
  function completeExercise(){
    const ctx=currentExerciseCtx();
    if (ctx.index+1 < ctx.total){
      state.training.currentExerciseIndex++; state.training.currentSet=1;
      state.training.substate='rest'; state.training.restLeft = getRestBetweenExercises(ctx.step);
      render(); speak(`Descanso de ${state.training.restLeft} segundos. Próximo ejercicio ${stepDisplayName(currentExerciseCtx().step, ctx.index+1)}`); runRest();
    }else{
      state.training.substate='finished'; state.training.finishedAt=Date.now();
      const { kcal, minutes } = estimateSession();
      state.stats.trainingsDone += 1; state.stats.minutesTrained += minutes; state.stats.kcalBurned += Math.round(kcal); saveStats();
      render(); play(state.audio.applause);
    }
  }
  function runRest(){
    clearInterval(timerId);
    timerId=setInterval(()=>{
      state.training.restLeft--;
      const node=$('#restNum'); if(node) node.textContent=state.training.restLeft;
      if (state.training.restLeft<=0){ clearInterval(timerId); endRest(); }
    },1000);
  }
  function endRest(){ startExercise(); }
  function prevExercise(){ if (state.training.currentExerciseIndex>0){ state.training.currentExerciseIndex--; state.training.currentSet=1; startExercise(); } }
  function nextExercise(){ const ctx=currentExerciseCtx(); if (ctx.index+1<ctx.total){ state.training.currentExerciseIndex++; state.training.currentSet=1; startExercise(); } }
  function estimateSession(){
    const { day } = dayContext(); let seconds=0, kcal=0;
    (day.exercises||[]).forEach(s=>{ const sets=s.sets||1; const tPer=(stepTime(s)!=null)? stepTime(s): ((stepReps(s)!=null)? stepReps(s)*2 : 30); seconds += tPer*sets + getRestBetweenSets(s)*(sets-1) + getRestBetweenExercises(s); const met=(s.intensity==='high'?8:s.intensity==='low'?3:5); kcal += (met*70/60)*(tPer*sets/60); });
    const minutes=Math.max(1,Math.round(seconds/60)); return { minutes, kcal };
  }
  function jumpToFinished(){ clearInterval(timerId); state.training.substate='finished'; state.training.finishedAt=Date.now(); const { kcal, minutes }=estimateSession(); state.stats.trainingsDone+=1; state.stats.minutesTrained+=minutes; state.stats.kcalBurned+=Math.round(kcal); saveStats(); render(); play(state.audio.applause); }

  // ---------- Offcanvas help + Catalog
  function showExerciseHelp(ev){
    const id = ev.currentTarget.dataset.exerciseId;
    const ex = state.exDict?.get(String(id));
    const help = $('#helpContent');
    if (ex){
      help.innerHTML = `<h6 class="mb-2">${ex.name||id}</h6>
        ${ex.tags? `<div class="small text-secondary mb-1">${(ex.tags||[]).join(' · ')}</div>`:''}
        <p>${ex.description||'Descripción no disponible.'}</p>
        ${ex.primary_muscles? `<p class="small text-secondary">Primarios: <strong>${ex.primary_muscles.join(', ')}</strong></p>`:''}
        ${ex.secondary_muscles? `<p class="small text-secondary">Secundarios: <strong>${ex.secondary_muscles.join(', ')}</strong></p>`:''}
        ${Array.isArray(ex.cues)&&ex.cues.length? `<ul class="small mb-2">${ex.cues.map(c=>`<li>${c}</li>`).join('')}</ul>`:''}
        ${ex.video? `<a class="btn btn-sm btn-outline-light" href="${ex.video}" target="_blank" rel="noopener"><i class="bi bi-youtube me-1"></i>Ver vídeo</a>`:''}`;
    } else { help.textContent='No hay información disponible.'; }
    const oc = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp'); if (oc?.show) oc.show();
  }
  function renderCatalogOffcanvas(){
    const entries = Array.from(state.exDict?.values?.()||[]).sort((a,b)=> (a.name||'').localeCompare(b.name||''));
    const help = $('#helpContent');
    if (!entries.length){ help.innerHTML='<p class="text-secondary">No hay entradas en el catálogo.</p>'; }
    else{
      const accId='catalogAcc';
      const items = entries.map((ex,idx)=>{
        const headId=`exHead${idx}`, colId=`exColl${idx}`;
        const tags = Array.isArray(ex.tags)&&ex.tags.length ? `<div class="small text-secondary mb-2">${ex.tags.join(' · ')}</div>`:'';
        const muscles = `${ex.primary_muscles? `<div class="small">Primarios: <strong>${ex.primary_muscles.join(', ')}</strong></div>`:''}${ex.secondary_muscles? `<div class="small">Secundarios: <strong>${ex.secondary_muscles.join(', ')}</strong></div>`:''}`;
        const cues = Array.isArray(ex.cues)&&ex.cues.length ? `<ul class="small mb-2">${ex.cues.map(c=>`<li>${c}</li>`).join('')}</ul>`:'';
        const link = ex.video? `<a href="${ex.video}" class="btn btn-sm btn-outline-light" target="_blank" rel="noopener"><i class="bi bi-youtube me-1"></i>Vídeo</a>`:'';
        return `<div class="accordion-item">
          <h2 class="accordion-header" id="${headId}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${colId}" aria-expanded="false" aria-controls="${colId}">${ex.name || ex.id}</button>
          </h2>
          <div id="${colId}" class="accordion-collapse collapse" aria-labelledby="${headId}" data-bs-parent="#${accId}">
            <div class="accordion-body">${tags}${muscles}${cues}${ex.description? `<p class="mb-2">${ex.description}</p>`:''}${link}</div>
          </div>
        </div>`;
      }).join('');
      help.innerHTML = `<h5 class="mb-3">Catálogo de ejercicios</h5><div class="accordion" id="${accId}">${items}</div>`;
    }
    const oc = window.bootstrap?.Offcanvas?.getOrCreateInstance?.('#appHelp'); if (oc?.show) oc.show();
  }

  // ---------- Settings view + handlers
  function viewSettings(){
    const s = state.settings;
    const seconds=[10,9,8,7,6,5,4,3,2,1];
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
        <button class="btn btn-outline-warning" data-action="reset-progress"><i class="bi bi-arrow-counterclockwise me-2"></i>Reestablecer progreso</button>
        <button class="btn btn-outline-danger" data-action="clear-measurements"><i class="bi bi-trash me-2"></i>Borrar mediciones</button>
      </div>`;
  }
  function saveSettingsFromUI(){
    const s = state.settings;
    s.voiceEnabled = !!$('#voiceEnabled')?.checked;
    s.voiceGender = $('#voiceGender')?.value || 'female';
    s.speakExerciseName = !!$('#speakExerciseName')?.checked;
    const secs=[10,9,8,7,6,5,4,3,2,1]; s.countdownSpokenSeconds = secs.filter(n=> $('#sec'+n)?.checked );
    const a=Number($('#restBetweenSets')?.value); s.restBetweenSets = (Number.isFinite(a)&&a>=0)? a : null;
    const b=Number($('#restBetweenExercises')?.value); s.restBetweenExercises = (Number.isFinite(b)&&b>=0)? b : null;
    saveSettings();
    const btn=$('[data-action="save-settings"]'); if(btn){ btn.disabled=true; btn.innerHTML='<i class="bi bi-check2-circle me-2"></i>Guardado'; setTimeout(()=>{ btn.disabled=false; btn.innerHTML='<i class="bi bi-save me-2"></i>Guardar'; },1200); }
  }
  function resetProgress(){ if(!confirm('Esto reestablecerá el progreso. Las mediciones NO se borran.')) return; state.stats.trainingsDone=0; state.stats.minutesTrained=0; state.stats.kcalBurned=0; state.stats.daysCompleted={}; saveStats(); alert('Progreso reestablecido.'); }
  function clearMeasurements(){ if(!confirm('Esto borrará las mediciones de peso y cintura. El progreso NO se borrará.')) return; state.stats.weight={initial:null,last:null}; state.stats.waistWeekly=[]; saveStats(); alert('Mediciones borradas.'); }

  // ---------- Uploads / Plans
  function uploadPlanFromFile(){
    const file = $('#planFileInput')?.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if (!data?.weeks) throw new Error('Estructura inválida');
        const id='user-'+Date.now(); const name=file.name.replace(/\.json$/i,'')||('Plan '+new Date().toISOString().slice(0,10));
        state.userPlans.push({id,name,data}); saveUserPlans();
        state.plan = normalizePlan(data); mergePlanNamesIntoDict(); render();
      }catch(e){ alert('No se pudo leer el JSON: '+ e.message); }
    };
    reader.readAsText(file);
  }
  function usePlan(id){
    if (id==='builtin'){ saveCurrentPlanId('builtin'); state.plan = defaultPlan(); mergePlanNamesIntoDict(); render(); return; }
    const p = state.userPlans.find(x=>x.id===id); if (!p) return;
    state.plan = normalizePlan(p.data); saveCurrentPlanId(id); mergePlanNamesIntoDict(); render();
  }
  function deletePlan(id){
    const i = state.userPlans.findIndex(x=>x.id===id); if (i<0) return;
    if (!confirm('¿Eliminar este plan cargado?')) return;
    state.userPlans.splice(i,1); saveUserPlans();
    if (state.currentPlanId===id){ saveCurrentPlanId('builtin'); state.plan=defaultPlan(); }
    render();
  }

  window.addEventListener('load', bootstrap);
})();