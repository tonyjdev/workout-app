// Stubs por defecto para el navegador
let KeepAwake = { keepAwake: async () => {}, allowSleep: async () => {} };
let StatusBar = { hide: async () => {}, show: async () => {} };
let App = { addListener: () => ({ remove() {} }) };

// Inicializa plugins solo si estamos en plataforma nativa de Capacitor
(async () => {
    try {
        const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
            ? window.Capacitor.isNativePlatform()
            : window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web');

        if (isNative) {
            ({ KeepAwake } = await import('@capacitor-community/keep-awake'));
            ({ StatusBar } = await import('@capacitor/status-bar'));
            ({ App } = await import('@capacitor/app'));
            await StatusBar.hide();
        }
    } catch (e) {
        console.log('Capacitor plugins no inicializados (modo web):', e);
    }
})();

// --- Detección de plataforma ---
const isCapacitorNative = !!(window.Capacitor && (
    (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web')
));

let WebTTS = { available: false, voices: [] };
let NativeTTS = { available: false, speak: null, getLanguages: null };

async function initTTS() {
    // Intento Web Speech
    if ('speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined') {
        WebTTS.available = true;
        WebTTS.voices = await waitForVoices(1500); // polling corto
    }

    // Intento nativo si estamos en app
    if (isCapacitorNative) {
        try {
            const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
            NativeTTS.available = true;
            NativeTTS.speak = (opts) => TextToSpeech.speak(opts);
            // Algunos builds exponen getSupportedLanguages(); si no existe, caemos a lista fija útil
            NativeTTS.getLanguages = TextToSpeech.getSupportedLanguages
                ? async () => (await TextToSpeech.getSupportedLanguages()).languages
                : async () => ['es-ES','en-US','fr-FR','de-DE','it-IT','pt-PT'];
        } catch (e) {
            console.log('TTS nativo no disponible:', e);
        }
    }

    await populateVoiceSelect();
}

// Al arrancar tu app (en app.js)
(function markNativeIfNeeded(){
    const isNative = !!(window.Capacitor && (
        (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web')
    ));
    if (isNative) document.documentElement.classList.add('native-app');
})();

// Espera hasta que getVoices() devuelva algo o expire
function waitForVoices(timeoutMs = 1500) {
    return new Promise(resolve => {
        const start = performance.now();
        const check = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length) return resolve(voices);
            if (performance.now() - start > timeoutMs) return resolve([]);
            setTimeout(check, 100);
        };
        // En algunos navegadores, llamar a getVoices una vez “desbloquea” el cargado
        window.speechSynthesis.getVoices();
        check();
    });
}

// Llena el <select id="voiceSelect"> con voces web o idiomas nativos
async function populateVoiceSelect() {
    const sel = document.getElementById('voiceSelect');
    if (!sel) return;

    sel.innerHTML = ''; // limpia "cargando voces..."

    if (WebTTS.available && WebTTS.voices.length) {
        // Web: listar voces reales
        WebTTS.voices
            .sort((a,b) => (a.lang||'').localeCompare(b.lang||'') || (a.name||'').localeCompare(b.name||''))
            .forEach(v => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ type:'web', name: v.name, lang: v.lang });
                opt.textContent = `${v.name} — ${v.lang}`;
                sel.appendChild(opt);
            });
    } else if (NativeTTS.available) {
        // App: listar idiomas (Android no da voces JS en WebView)
        const langs = await NativeTTS.getLanguages();
        langs.sort().forEach(lang => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ type:'native', lang });
            opt.textContent = `Voz del sistema — ${lang}`;
            sel.appendChild(opt);
        });
    } else {
        // Último recurso: una opción por defecto en web sin soporte
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ type:'none' });
        opt.textContent = 'TTS no disponible';
        sel.appendChild(opt);
        sel.disabled = true;
    }
}

// Llama a init al arrancar la UI
initTTS();


/* Workout – Full App (compact, with improved Home) */
(() => {
    const $ = (s, c = document) => c.querySelector(s)
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s))
    const JSON_PLAN_URL = './data/plan.json'
    const JSON_EX_DICT_URL = './data/exercises.json'
    // Ruta base para imágenes de ejercicios (relativas al index.html)
    const EX_IMG_BASE = 'assets/images/exercises/';
    const WHISTLE_SRC = 'assets/fx/whistle.wav';
    const DING_SRC = 'assets/fx/whistle.wav';
    const APPLAUSE_SRC = 'assets/fx/applause.wav';

    const DEFAULT_TTS = { enabled: false, voice: null, rate: 1, speakSeconds: [3,2,1] };
    const DEFAULT_OPTS = { countdownSeconds: 3, restBetweenSets: 60, restBetweenExercises: 90 };

    const UI_BLOCK_ORDER = ['warmup', 'main', 'finisher', 'stretch'];

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
        settingsUI: {
            substate: 'menu' // 'menu' | 'voice' | 'training' | 'data'
        },
        plan: null,
        exDict: new Map(),
        stats: JSON.parse(localStorage.getItem('sf_stats') || '{}'),
        settings: JSON.parse(localStorage.getItem('sf_settings') || '{}'),
        userPlans: JSON.parse(localStorage.getItem('sf_plans') || '[]'),
        currentPlanId: localStorage.getItem('sf_current_plan') || 'builtin',
        audio: {}
    }
    let trainingInProgress = false;

    ensureSettingsHydrated();

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
        state.audio.ding = mkAudio('./assets/fx/ding.wav', .5)
        state.audio.whistle = mkAudio('./assets/fx/whistle.wav', .8)
        state.audio.applause = mkAudio('./assets/fx/applause.wav', .8)
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
    function isTTSEnabled() {
        let ttsEnabled = !!(state.tts?.enabled ?? state.settings?.voiceEnabled)
        console.log("Comprobando TTS: ", ttsEnabled);
        return ttsEnabled;
    }

    function playWhistle(){
        try{
            state.audio = state.audio || {};
            if (!state.audio.whistle){
                state.audio.whistle = new Audio(WHISTLE_SRC);
                state.audio.whistle.preload = 'auto';
            }
            const a = state.audio.whistle;
            a.currentTime = 0;
            a.play().catch(()=>{ /* evitar warning si el navegador bloquea */ });
        }catch{}
    }

    function playDing(){
        try{
            state.audio = state.audio || {};
            if (!state.audio.ding){
                state.audio.ding = new Audio(DING_SRC);
                state.audio.ding.preload = 'auto';
            }
            const a = state.audio.ding;
            a.currentTime = 0;
            a.play().catch(()=>{ /* evitar warning si el navegador bloquea */ });
        }catch{}
    }

    function playApplause(){
        try{
            state.audio = state.audio || {};
            if (!state.audio.applause){
                state.audio.applause = new Audio(APPLAUSE_SRC);
                state.audio.applause.preload = 'auto';
            }
            const a = state.audio.applause;
            a.currentTime = 0;
            a.play().catch(()=>{ /* evitar warning si el navegador bloquea */ });
        }catch{}
    }

    // --- Confetti (sin librerías) --------------------------------------------
    function ensureConfettiStyles(){
        if (document.getElementById('sfConfettiStyles')) return;
        const css = `
  @keyframes sf-fall {
    0%   { transform: translate3d(var(--x,0), -10vh, 0) rotate(var(--r,0)); opacity: 1; }
    100% { transform: translate3d(calc(var(--x,0) + var(--dx,0)), 110vh, 0) rotate(calc(var(--r,0) + var(--dr,360deg))); opacity: 1; }
  }
  .sf-confetti-layer {
    position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 9999;
  }
  .sf-confetti-piece {
    position: absolute; top: -10vh; left: 0;
    width: var(--w,8px); height: var(--h,14px);
    background: var(--c,#f00);
    border-radius: 2px;
    animation: sf-fall var(--t, 1200ms) linear forwards;
    will-change: transform;
  }`;
        const st = document.createElement('style');
        st.id = 'sfConfettiStyles';
        st.textContent = css;
        document.head.appendChild(st);
    }

    function launchConfetti({pieces=160, duration=1600} = {}){
        ensureConfettiStyles();
        // Evita múltiples capas a la vez
        const old = document.getElementById('sfConfettiLayer');
        if (old) old.remove();

        const layer = document.createElement('div');
        layer.id = 'sfConfettiLayer';
        layer.className = 'sf-confetti-layer';
        document.body.appendChild(layer);

        const colors = ['#ff4757','#ffa502','#fffa65','#2ed573','#1e90ff','#a29bfe','#ff6b81'];
        const rnd = (a,b)=>Math.random()*(b-a)+a;

        for (let i=0;i<pieces;i++){
            const el = document.createElement('div');
            el.className = 'sf-confetti-piece';

            const c = colors[i % colors.length];
            const x = `${Math.round(rnd(0, 100))}vw`;      // inicio horizontal
            const dx = `${Math.round(rnd(-20, 20))}vw`;    // deriva horizontal
            const t = `${Math.round(rnd(900, 1800))}ms`;   // tiempo de caída
            const w = `${Math.round(rnd(6,10))}px`;
            const h = `${Math.round(rnd(10,16))}px`;
            const r = `${Math.round(rnd(-90, 90))}deg`;
            const dr= `${Math.round(rnd(180, 720))}deg`;

            el.style.setProperty('--c', c);
            el.style.setProperty('--x', x);
            el.style.setProperty('--dx', dx);
            el.style.setProperty('--t', t);
            el.style.setProperty('--w', w);
            el.style.setProperty('--h', h);
            el.style.setProperty('--r', r);
            el.style.setProperty('--dr', dr);

            // Pequeño delay para que no caigan todos a la vez
            el.style.animationDelay = `${Math.round(rnd(0, 400))}ms`;

            layer.appendChild(el);
        }

        // Limpieza
        setTimeout(() => { try{ layer.remove(); }catch{} }, duration + 800);
    }

    // Reemplaza tu speak() por esta versión
    async function speak(t) {
        if (!isTTSEnabled()) return;

        // ¿Estamos dentro de la app (Capacitor)?
        const isNative = !!(window.Capacitor && (
            typeof window.Capacitor.isNativePlatform === 'function'
                ? window.Capacitor.isNativePlatform()
                : (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web')
        ));

        // Preferencia de idioma / parámetros desde tu estado (con defaults)
        const lang  = (state.tts && state.tts.lang) || 'es-ES';
        const rate  = Math.min(2, Math.max(0.5, Number(state.tts?.rate)  || 1));
        const pitch = Math.min(2, Math.max(0.5, Number(state.tts?.pitch) || 1));
        const volume = 1.0;

        // Ruta nativa (Capacitor): usa el TTS del sistema
        if (isNative) {
            try {
                const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
                await TextToSpeech.speak({
                    text: String(t),
                    lang,
                    rate,
                    pitch,
                    volume,
                    // Evita pausar música en algunos dispositivos:
                    category: 'ambient'
                });
                return;
            } catch (e) {
                console.log('Fallo TTS nativo, intento Web Speech…', e);
                // si falla el nativo, continuamos y probamos Web Speech abajo
            }
        }

        // Ruta Web Speech (navegador / fallback)
        if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;

        // Corta cualquier frase en curso antes de hablar
        try { window.speechSynthesis.cancel(); } catch {}

        const u = new SpeechSynthesisUtterance(String(t));
        u.lang  = lang;
        u.rate  = rate;
        u.pitch = pitch;

        // Intentar obtener voces (con polling corto porque voiceschanged a veces no salta)
        const voices = await getVoicesWithPolling(1200);

        // 1) Si tienes un <select id="voiceSelect">, respetarlo:
        const chosen = getSelectedVoiceChoice(); // {type:'web', name, lang} | null
        if (chosen && voices.length) {
            const v = voices.find(v => v.name === chosen.name && v.lang === chosen.lang);
            if (v) u.voice = v;
        } else if (voices.length) {
            // 2) Tu lógica original por género en español
            if (state.settings?.voiceGender === 'male') {
                const v = voices.find(v => /es/i.test(v.lang) && /male|hombre|mascul/i.test(v.name));
                if (v) u.voice = v;
            } else {
                const v = voices.find(v => /es/i.test(v.lang) && /female|mujer|femen/i.test(v.name));
                if (v) u.voice = v;
            }
            // 3) Fallback: cualquier voz que coincida con el lang
            if (!u.voice) {
                const v = voices.find(v => v.lang === lang) || voices.find(v => /^es/i.test(v.lang));
                if (v) u.voice = v;
            }
        }

        window.speechSynthesis.speak(u);
    }

// --- Helpers ---

// Polling compacto para getVoices() (por si no dispara voiceschanged)
    function getVoicesWithPolling(timeoutMs = 1200) {
        return new Promise(resolve => {
            if (!('speechSynthesis' in window)) return resolve([]);
            const start = performance.now();
            const tick = () => {
                const list = window.speechSynthesis.getVoices?.() || [];
                if (list.length) return resolve(list);
                if (performance.now() - start > timeoutMs) return resolve([]);
                setTimeout(tick, 100);
            };
            // Llamada inicial que a veces “desbloquea” la carga
            try { window.speechSynthesis.getVoices?.(); } catch {}
            tick();
        });
    }

    // Lee la opción elegida en tu <select id="voiceSelect"> si existe (formato JSON en value)
    function getSelectedVoiceChoice() {
        const sel = document.getElementById('voiceSelect');
        if (!sel || !sel.value) return null;
        try {
            const parsed = JSON.parse(sel.value);
            // esperamos { type:'web', name, lang } en modo web, y { type:'native', lang } en app (que aquí no usamos)
            return parsed && parsed.type === 'web' ? parsed : null;
        } catch {
            return null;
        }
    }


    function ttsDoseFor(step){
        const secs = stepTime(step);
        if (secs != null) return `${secs} segundos`;
        const reps = stepReps(step);
        return (reps != null) ? `${reps} repeticiones` : '';
    }

    function ttsAnnounceNext(prefixText, step, idx){
        if (!state?.tts?.enabled) return;
        const name = stepDisplayName(step, idx);
        speak(prefixText);
        speak(`Siguiente ejercicio: ${name}`);
        const dose = ttsDoseFor(step);
        if (dose) speak(dose);
    }


    // schema helpers
    const stepId = s => s?.exercise_id ?? s?.id ?? s?.exerciseId ?? s?.code ?? null

    // ==== Estimador de duración ===============================================
    const ESTIMATE_DEFAULTS = {
        secondsPerRep: 2,          // aprox. 2s por repetición
        restPerSet: 45,            // descanso entre series si no se define en step.rest
        restBetweenExercises: 30   // descanso entre ejercicios si no se define en step.rest_next
    };

    function stepTime (s) { // robusto a strings "40s", "1:00", etc.
        if (typeof s?.seconds === 'number') return s.seconds;
        if (s?.time != null) {
            const secs = parseSeconds(s.time);
            if (secs != null) return secs;
        }
        return null;
    }

    function parseSeconds (val) {
        if (val == null) return null;
        if (typeof val === 'number' && Number.isFinite(val)) return Math.round(val);
        const s = String(val).trim().toLowerCase();

        const mmss = s.match(/^(\d+):(\d{1,2})$/); // 1:00
        if (mmss) return (+mmss[1] * 60) + (+mmss[2]);

        const mix = s.match(/(?:(\d+)\s*m(?:in)?)\s*(?:(\d+)\s*s)?/); // 1m30s / 2min 15s
        if (mix && (mix[1] || mix[2])) return (+mix[1] || 0) * 60 + (+mix[2] || 0);

        const unit = s.match(/^(\d+(?:\.\d+)?)(\s*(?:s|sec|secs|m|″|”))?$/); // 40s / 1m / 40″
        if (unit) {
            const n = parseFloat(unit[1]); const u = (unit[2] || '').trim();
            if (!u || u.startsWith('s') || u === '″' || u === '”') return Math.round(n);
            if (u === 'm') return Math.round(n * 60);
        }
        const num = s.match(/^\d+$/);
        if (num) return parseInt(s, 10);
        return null;
    }

    function stepEstimatedSeconds(step){
        const sets = +step.sets || 1;
        let work = 0;

        if ((step.type || '').toLowerCase() === 'time') {
            const perSet = stepTime(step);
            work = perSet * sets;
        } else {
            const repsRaw = (typeof step.reps === 'number') ? step.reps : (parseInt(String(step.reps||'').match(/\d+/)?.[0] || '0', 10));
            let perSet = repsRaw * ESTIMATE_DEFAULTS.secondsPerRep;
            if (step.perSide) perSet *= 2;
            work = perSet * sets;
        }

        const restBetweenSets = (typeof step.rest === 'number' ? step.rest : ESTIMATE_DEFAULTS.restPerSet) * Math.max(0, sets - 1);
        return work + restBetweenSets;
    }

    function estimateDaySeconds(day){
        const exs = day.exercises || [];
        let total = 0;
        for (let i = 0; i < exs.length; i++) {
            total += stepEstimatedSeconds(exs[i]);
            if (i < exs.length - 1) {
                const rn = (typeof exs[i].rest_next === 'number' ? exs[i].rest_next : ESTIMATE_DEFAULTS.restBetweenExercises);
                total += rn;
            }
        }
        return total;
    }

    function estimateDaySecondsByBlock(day){
        const exs = day.exercises || [];
        const sum = { warmup: 0, main: 0, finisher: 0, stretch: 0 };

        for (let i = 0; i < exs.length; i++) {
            const x = exs[i];
            const blk = exerciseBlock(x);              // 'warmup' | 'main' | 'stretch'
            sum[blk] += stepEstimatedSeconds(x);       // tiempo de trabajo + descansos entre series

            // Atribuimos el descanso entre ejercicios al bloque actual
            if (i < exs.length - 1) {
                const rn = (typeof x.rest_next === 'number' ? x.rest_next : ESTIMATE_DEFAULTS.restBetweenExercises);
                sum[blk] += rn;
            }
        }
        return sum;
    }


    function fmtMinutes(sec){ return Math.max(1, Math.round(sec / 60)); }

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

    const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPE[ch])
    const escapeAttr = escapeHtml

    function stepDisplayName (s, i = 0) {
        const sid = stepId(s)
        const ex = sid != null ? (state.exDict.get(String(sid)) || state.exDict.get(sid)) : null
        return ex?.name || s?.name || (sid != null ? String(sid) : `Ejercicio ${i + 1}`)
    }

    function normalizePlan (raw) {
        // Clon superficial para no mutar el original
        const plan = { ...raw }
        const weeks = Array.isArray(raw.weeks) ? raw.weeks : []

        plan.weeks = weeks.map((w, wi) => {
            const number = w.number != null ? w.number : (wi + 1)
            const days = Array.isArray(w.days) ? w.days : []

            const normDays = days.map((d) => {
                // --- Construcción de ejercicios del día, incluyendo FINISHER y orden deseado ---
                let exercises = [];

                // 1) Recolecta por bloque
                const buf = { warmup: [], main: [], stretch: [], finisher: [] };

                if (Array.isArray(d.blocks)) {
                    for (const block of d.blocks) {
                        const btype = String(block?.block || block?.type || 'main').toLowerCase();
                        const items = Array.isArray(block?.items) ? block.items : [];
                        const target =
                            btype === 'warmup'  ? buf.warmup  :
                                btype === 'stretch' ? buf.stretch :
                                    buf.main; // por defecto, todo lo no warmup/stretch va a main
                        for (const it of items) {
                            target.push(normalizeExerciseItem(it, btype));
                        }
                    }
                } else {
                    const items = Array.isArray(d.exercises) ? d.exercises : [];
                    for (const it of items) {
                        buf.main.push(normalizeExerciseItem(it, null));
                    }
                }

                // 2) Añade el bloque 'finisher' (array aparte en el plan v2)
                if (Array.isArray(d.finisher) && d.finisher.length) {
                    for (const it of d.finisher) {
                        buf.finisher.push(normalizeExerciseItem(it, 'finisher'));
                    }
                }

                // 3) Orden final: warmup → main → finisher → stretch (finisher ANTES de estiramiento)
                exercises = [...buf.warmup, ...buf.main, ...buf.finisher, ...buf.stretch];

                // Construimos el día normalizado
                const dayNum = d.dayNum != null ? d.dayNum : d.day || d.number
                return {
                    ...d,
                    dayNum: dayNum,            // mantiene el original o lo infiere
                    exercises,                 // <- la app espera esto
                    blocks: undefined          // <- limpiamos bloques para el resto de la app
                }
            })

            return { number, days: normDays }
        })

        return plan
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
        state.settings = initializeSettings()
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
        const label = DOW_ABBR[(dayNumber - 1) % 7]

        return `
            <div class="${cls}">
              <div class="day-number">${label}</div>
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
            title: m.title || getActivePlanInfo().name || 'Entrenamiento',
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
    <div class="card plan-card plan-cover mb-3" style="--cover: url('${m.image}')" data-label="${m.title}">
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
        const meta = activePlanMeta()
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
            <div class="card plan-card plan-cover mb-3" style='${coverStyle}' data-label="${meta.title}">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <h5 class="mb-0">${meta.title}</h5>
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
    const DOW_ABBR = ['LUN','MAR','MIE','JUE','VIE','SAB','DOM'];

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
        const m = planInfo.data?.meta || {}

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
              <div class="fw-semibold">${m.title}</div>
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

        const list = (includeBuiltin ? [{ id: 'builtin', name: 'Plan por defecto', data: defaultPlan() }] : [])
            .concat(user)
        const ordered = sortPlanInfosActiveFirst(list)

        const cards = ordered
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
        const m = info.data?.meta || {}

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
          <h5 class="mb-0">${m.title || info.name}</h5>
          <div class="d-flex gap-2 align-items-center">
            ${active ? '<span class="badge text-bg-success">Activo</span>' :
            `<button class="btn btn-sm btn-outline-light" data-action="use-plan" data-plan="${info.id}">
                 <i class="bi bi-check2-circle me-1"></i>Activar
               </button>`}
            ${/* papelera (con modal) */''}
            ${(info.id === 'builtin' ? (state.userPlans || []).length > 0 : true)
            ? `<button class="btn btn-sm btn-outline-danger" data-action="prompt-delete-plan" data-plan="${info.id}" data-plan-name="${m.title || info.name}">
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
        else if (state.view === 'progress') host.innerHTML = viewReport()
        else if (state.view === 'settings') host.innerHTML = viewSettings()
        console.log('render', state.view)
        bindEvents()
        updateNavVisibility();
        updateTopBack();
        updateAppContentFill();
    }

    function viewReport () {
        const { minutes, kcal, days } = statsTotalsFromLog()
        const streak = currentStreak()

        const minsH = Math.floor(minutes / 60)
        const minsR = minutes % 60

        const series = buildDailySeries(14)
        const maxMin = Math.max(30, ...series.map(d=>d.minutes))
        const maxKcal = Math.max(100, ...series.map(d=>d.kcal))

        const minutesBars = renderMiniBars(series.map(x=>x.minutes), maxMin, { suffix: 'm' })
        const kcalBars    = renderMiniBars(series.map(x=>x.kcal),    maxKcal, { suffix: '' })

        const labels = renderMiniLabels(series.map(x => {
            const dt = parseYMD(x.date);
            return ['D','L','M','X','J','V','S'][dt.getDay()];
        }))

        return `
    <section class="mb-3">
      <div class="row row-cols-2 row-cols-md-4 g-2">
        <div class="col">${statCard('bi-stopwatch', 'Tiempo total', `${minsH}h ${minsR}m`)}</div>
        <div class="col">${statCard('bi-calendar-check', 'Días entrenados', days)}</div>
        <div class="col">${statCard('bi-fire', 'Calorías', kcal)}</div>
        <div class="col">${statCard('bi-lightning', 'Racha', `${streak} d`)}</div>
      </div>
    </section>

    <section class="mb-3">
      <div class="card">
        <div class="card-body">
          <h6 class="mb-2">Minutos por día (últimos 14 días)</h6>
          ${minutesBars}
          ${labels}
        </div>
      </div>
    </section>

    <section class="mb-3">
      <div class="card">
        <div class="card-body">
          <h6 class="mb-2">Calorías por día (últimos 14 días)</h6>
          ${kcalBars}
          ${labels}
        </div>
      </div>
    </section>
  `
    }

    // Mini-barras responsivas sin librerías (CSS grid)
    function renderMiniBars(values, maxValue, { suffix = '' } = {}) {
        const bars = values.map(v => {
            const h = Math.round((v / (maxValue || 1)) * 100)
            const tip = v ? `<span class="bar-tip">${v}${suffix}</span>` : ''
            return `<div class="bar" style="height:${h}%">${tip}</div>`
        }).join('')
        return `<div class="mini-bars" role="img" aria-label="Gráfico de barras">${bars}</div>`
    }

    function renderMiniLabels(labels) {
        const html = labels.map(l => `<div class="lbl">${l}</div>`).join('')
        return `<div class="mini-labels">${html}</div>`
    }

    function viewSettings(){
        switch(state.settingsUI?.substate){
            case 'voice':    return viewSettingsVoice();
            case 'training': return viewSettingsTraining();
            case 'data':     return viewSettingsData();
            default:         return viewSettingsMenu();
        }
    }

    function viewSettingsMenu(){
        return `
    <div class="card card-body">
      <h5 class="mb-3">Configuración</h5>
      <div class="list-group">
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-action="open-settings-voice">
          <span><i class="bi bi-soundwave me-2"></i>Opciones de voz (TTS)</span>
          <i class="bi bi-chevron-right"></i>
        </button>
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-action="open-settings-training">
          <span><i class="bi bi-activity me-2"></i>Configuración de entrenamiento</span>
          <i class="bi bi-chevron-right"></i>
        </button>
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-action="open-settings-data">
          <span><i class="bi bi-upload me-2"></i>Exportar/Importar progreso</span>
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
    }

    function viewSettingsVoice(){
        const s = state.tts || {};
        return `
            <div class="card card-body">
              <h5 class="mb-3">Opciones de voz (TTS)</h5>
        
              <div class="mb-3 form-check">
                <input class="form-check-input" type="checkbox" id="ttsEnabled" ${s.enabled ? 'checked' : ''}>
                <label class="form-check-label" for="ttsEnabled">Activar voz</label>
              </div>
        
              <div class="mb-3">
                <label class="form-label" for="ttsVoice">Voz</label>
                <select class="form-select" id="ttsVoice">${renderVoiceOptions(s.voice)}</select>
              </div>
        
              <div class="mb-3">
                <label class="form-label" for="ttsRate">Velocidad</label>
                <input type="range" min="0.5" max="2" step="0.05" id="ttsRate" class="form-range" value="${s.rate ?? 1}">
              </div>
              
              <div class="mb-3">
                  <label class="form-label">Segundos a anunciar en cuenta atrás</label>
                  <div id="ttsSpeakGrid" class="d-flex flex-wrap gap-2">
                    ${
                        Array.from({length:10}, (_,i)=>i+1).map(sec => `
                        <label class="form-check form-check-inline mb-1">
                          <input class="form-check-input" type="checkbox" value="${sec}"
                                 ${ (state.tts?.speakSeconds||[]).includes(sec) ? 'checked' : '' }>
                          <span class="form-check-label">${sec}s</span>
                        </label>
                      `).join('')
                    }
                  </div>
                </div>

        
              <div class="d-grid gap-2">
                <button class="btn btn-primary" id="btnSaveVoice"><i class="bi bi-save2 me-1"></i>Guardar</button>
              </div>
            </div>
          `;
    }

    function viewSettingsTraining(){
        const o = state.options || {};
        return `
            <div class="card card-body">
              <h5 class="mb-3">Configuración de entrenamiento</h5>
        
              <div class="mb-3">
                <label class="form-label" for="countdownSeconds">Cuenta atrás (s)</label>
                <input type="number" min="0" id="countdownSeconds" class="form-control" value="${o.countdownSeconds ?? 3}">
              </div>
        
              <div class="mb-3">
                <label class="form-label" for="restBetweenSets">Descanso entre series (s)</label>
                <input type="number" min="0" id="restBetweenSets" class="form-control" value="${o.restBetweenSets ?? 60}">
              </div>
        
              <div class="mb-3">
                <label class="form-label" for="restBetweenExercises">Descanso entre ejercicios (s)</label>
                <input type="number" min="0" id="restBetweenExercises" class="form-control" value="${o.restBetweenExercises ?? 90}">
              </div>
        
              <div class="d-grid gap-2">
                <button class="btn btn-primary" id="btnSaveTraining"><i class="bi bi-save2 me-1"></i>Guardar</button>
              </div>
            </div>
          `;
    }

    function viewSettingsData(){
        return `
            <div class="card card-body">
              <h5 class="mb-3">Exportar/Importar progreso</h5>
        
              <div class="d-grid gap-2 mb-3">
                <button class="btn btn-outline-secondary" id="btnExportProgress">
                  <i class="bi bi-download me-1"></i>Exportar JSON
                </button>
              </div>
        
              <div class="mb-3">
                <label class="form-label" for="importFile">Importar desde JSON</label>
                <input type="file" id="importFile" class="form-control" accept=".json,application/json">
              </div>
        
              <div class="d-grid gap-2">
                <button class="btn btn-primary" id="btnImportProgress">
                  <i class="bi bi-upload me-1"></i>Importar
                </button>
              </div>
            </div>
          `;
    }

    function bindEvents () {
        // bottom nav
        // NAV inferior: activar pestaña y navegar
        $$('#bottomNav .nav-link').forEach(btn => {
            btn.onclick = () => {
                // estado visual activo
                $$('#bottomNav .nav-link').forEach(b => b.classList.remove('active'))
                btn.classList.add('active')

                const nextView = btn.dataset.view;
                if (nextView === 'training') {
                    // Siempre arrancamos en la lista de semanas
                    state.training.substate = 'list';
                }

                // cuando el usuario pulsa el tab "Settings"
                if (nextView === 'settings') {
                    state.settingsUI.substate = 'menu';
                }

                // cambiar vista
                state.view = nextView
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
            activatePlan(b.dataset.plan, true)
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

            // Anuncios de inicio de entrenamiento
            if (isTTSEnabled()) {
                const ctx  = currentExerciseCtx();
                const step = ctx.step;
                const name = stepDisplayName(step, ctx.index);

                let dose = '';
                if (stepTime(step) != null) {
                    dose = `${stepTime(step)} segundos`;
                } else if (stepReps(step) != null) {
                    dose = `${stepReps(step)} repeticiones`;
                }

                const msg = dose
                    ? `Prepárate. ¡Vamos a darlo todo!. Siguiente ejercicio ${name}, ${dose}`
                    : `Prepárate. ¡Ánimo que tu puedes!. Siguiente ejercicio ${name}`;

                speak(msg);
            }

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
        // Pause / Resume para ejercicios cronometrados y descansos
        $('[data-action="pause-timer"]')?.addEventListener('click', () => { state.training.timerPaused = true; render() })
        $('[data-action="resume-timer"]')?.addEventListener('click', () => { state.training.timerPaused = false; render() })

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

        // Parar medios al cerrar cualquier Offcanvas (y Modal por si acaso)
        document.addEventListener('hidden.bs.offcanvas', (ev) => {
            const root = ev.target;
            // <video>: pausa y resetea
            root.querySelectorAll('video').forEach(v => {
                try { v.pause(); v.currentTime = 0; } catch {}
            });
            // <iframe> (YouTube/Vimeo): intenta API; si no, recarga src para cortar audio
            root.querySelectorAll('iframe').forEach(f => {
                try {
                    // YouTube IFrame API (si el embed tiene enablejsapi=1)
                    f.contentWindow?.postMessage?.('{"event":"command","func":"stopVideo","args":""}', '*');
                    f.contentWindow?.postMessage?.('{"method":"pause"}', '*'); // Vimeo fallback
                } catch {}
                // Corte duro por si la API no está disponible
                const src = f.getAttribute('src');
                if (src) f.setAttribute('src', src);
            });
        });

        // (Opcional) también para modales si muestras vídeos ahí
        document.addEventListener('hidden.bs.modal', (ev) => {
            const root = ev.target;
            root.querySelectorAll('video').forEach(v => { try { v.pause(); v.currentTime = 0; } catch {} });
            root.querySelectorAll('iframe').forEach(f => {
                try {
                    f.contentWindow?.postMessage?.('{"event":"command","func":"stopVideo","args":""}', '*');
                    f.contentWindow?.postMessage?.('{"method":"pause"}', '*');
                } catch {}
                const src = f.getAttribute('src');
                if (src) f.setAttribute('src', src);
            });
        });

        const backBtn = document.getElementById('navBackBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                stopAllTimersAndVoice?.();

                if (state.view === 'settings') {
                    // Desde cualquier subpantalla -> volver al menú de settings
                    state.settingsUI.substate = 'menu';
                    render(); updateNavVisibility(); updateTopBack(); updateAppContentFill?.();
                    return;
                }

                const sub = state.training?.substate || 'list';

                // Entrenamiento activo → vuelve a Day
                if (sub === 'countdown' || sub === 'exercise' || sub === 'rest') {
                    state.training.substate = 'day';
                }
                // En Day → vuelve a Weeks
                else if (sub === 'day') {
                    state.training.substate = 'list';
                }
                // En Finished → resetea a Weeks del plan
                else if (sub === 'finished') {
                    state.training = subTrainingInitial();
                    state.view = 'training';
                }
                // Cualquier otro caso → Weeks
                else {
                    state.training.substate = 'list';
                }

                render();
                updateNavVisibility();
                updateTopBack();
                updateAppContentFill?.();
            };
        }

        // Abrir subpantallas de settings
        $('[data-action="open-settings-voice"]')?.addEventListener('click', () => { state.settingsUI.substate='voice'; render(); updateTopBack(); });
        $('[data-action="open-settings-training"]')?.addEventListener('click', () => { state.settingsUI.substate='training'; render(); updateTopBack(); });
        $('[data-action="open-settings-data"]')?.addEventListener('click', () => { state.settingsUI.substate='data'; render(); updateTopBack(); });

// Guardar VOZ
        $('#btnSaveVoice')?.addEventListener('click', () => {
            const enabled = $('#ttsEnabled')?.checked ?? false;
            const voiceValue = $('#ttsVoice')?.value ?? null; // voiceURI o name
            const rate    = parseFloat($('#ttsRate')?.value ?? 1);
            const speakSeconds = Array
                .from(document.querySelectorAll('#ttsSpeakGrid input:checked'))
                .map(i => parseInt(i.value,10))
                .filter(n => Number.isInteger(n) && n >= 1 && n <= 10)
                .sort((a,b)=>a-b);

            state.tts = { ...(state.tts||{}), enabled, voice: voiceValue, rate, speakSeconds };
            persistOptions?.();
            toast?.('Guardado', 'Se han guardado las opciones de voz', 'success');
        });

// Guardar ENTRENAMIENTO
        $('#btnSaveTraining')?.addEventListener('click', () => {
            const countdownSeconds   = parseInt($('#countdownSeconds')?.value || '0', 10);
            const restBetweenSets    = parseInt($('#restBetweenSets')?.value || '0', 10);
            const restBetweenExercises = parseInt($('#restBetweenExercises')?.value || '0', 10);
            state.options = { ...(state.options||{}), countdownSeconds, restBetweenSets, restBetweenExercises };
            persistOptions?.();
            toast?.('Guardado', 'Se han guardado las opciones de entrenamiento');
        });

        (function wireVoicesChanged(){
            if (typeof speechSynthesis === 'undefined') return;

            const refreshVoicesSelect = () => {
                const sel = document.getElementById('ttsVoice');
                if (!sel) return; // aún no estamos en la subpantalla de voz
                sel.innerHTML = renderVoiceOptions(state.tts?.voice);
            };

            // Llamada inicial (por si ya están disponibles)
            try { refreshVoicesSelect(); } catch{}

            // Y cuando el navegador notifique cambios de voces:
            speechSynthesis.onvoiceschanged = refreshVoicesSelect;
        })();

        // ---- Exportar / Importar progreso (subpantalla Settings > Data) ----
        (() => {
            const btnExport = document.getElementById('btnExportProgress');
            const btnImport = document.getElementById('btnImportProgress');
            const fileInput = document.getElementById('importFile');

            // Exportar (un solo handler)
            if (btnExport) {
                btnExport.onclick = () => {
                    if (typeof exportProgress === 'function')      exportProgress();
                    else if (typeof exportProgressJSON === 'function') exportProgressJSON();
                };
            }

            // Importar: abre selector
            if (btnImport) {
                btnImport.onclick = () => fileInput?.click();
            }

            // Cuando el usuario elige archivo
            if (fileInput) {
                fileInput.onchange = async (ev) => {
                    try {
                        if (!ev.target?.files?.length) return;

                        if (typeof importProgressFromFile === 'function') {
                            const res = importProgressFromFile(ev);
                            if (res && typeof res.then === 'function') await res;
                        } else if (typeof importProgress === 'function') {
                            const res = importProgress(ev.target);
                            if (res && typeof res.then === 'function') await res;
                        } else {
                            throw new Error('No existe función de importación (importProgressFromFile/importProgress)');
                        }

                        // toast?.('Importado', 'Se ha importado el progreso correctamente');
                        render();
                    } catch (err) {
                        console.error(err);
                        toast?.('Error', 'No se pudo importar el progreso');
                    } finally {
                        ev.target.value = ''; // permite reimportar el mismo archivo
                    }
                };
            }
        })();

        scrollToTopAfterRender()
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
        const fileInput = $('#planFileInput')
        const file = fileInput?.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result)
                if (!data?.weeks) throw new Error('Estructura inválida: falta "weeks"')

                const id = 'user-' + Date.now()
                const name = file.name.replace(/\.json$/i, '') || ('Plan ' + new Date().toISOString().slice(0, 10))

                state.userPlans.push({ id, name, data })
                saveUserPlans()
                render()

                // 1) Limpiar input de fichero
                if (fileInput) fileInput.value = ''

                // 2) Cerrar modal de carga (si existe)
                try {
                    const addModal = window.bootstrap?.Modal?.getOrCreateInstance?.('#addPlanModal')
                    addModal?.hide()
                } catch {}

                // 3) Mostrar modal de confirmación (crear si no existe)
                let ok = document.getElementById('uploadOkModal')
                if (!ok) {
                    const wrapper = document.createElement('div')
                    wrapper.innerHTML = `
        <div class="modal fade" id="uploadOkModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Plan cargado</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Entendido</button>
              </div>
            </div>
          </div>
        </div>`
                    document.body.appendChild(wrapper.firstElementChild)
                    ok = document.getElementById('uploadOkModal')
                }
                const body = ok.querySelector('.modal-body')
                if (body) body.textContent = `El fichero “${name}” se ha cargado correctamente.`
                window.bootstrap?.Modal?.getOrCreateInstance?.(ok)?.show()

            } catch (e) {
                alert('No se pudo leer el JSON: ' + e.message)
            }
        }
        reader.readAsText(file)
    }


    function usePlan (id) {
        activatePlan(id)
    }

    function activatePlan(id, changeView = false) {
        if (id === 'builtin') {
            saveCurrentPlanId('builtin')
            state.plan = defaultPlan()
            mergePlanNamesIntoDict()
        } else {
            const p = (state.userPlans || []).find(x => x.id === id)
            if (!p) return
            state.plan = normalizePlan(p.data)
            saveCurrentPlanId(id)
            mergePlanNamesIntoDict()
        }
        if (changeView) state.view = 'training'
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
              <button class="btn btn-lg btn-danger w-100 btn-tall" data-action="go-today">
                <i class="bi bi-lightning-charge me-1"></i>GO
              </button>
            </div>`
    }

    function renderWeekDayPill (weekIdx, dayIdx, d, today1) {
        const completed = isDayCompleted(weekIdx, dayIdx)
        const base = 'day-pill text-center p-2 rounded bg-body-tertiary'
        const cls = d?.rest ? `${base} day-rest` : (completed ? `${base} day-done` : base)
        // const iconHTML = iconForDay(d, { completed, index1: dayIdx + 1, today1 })
        // const num = dayIdx + 1
        const idx1 = dayIdx + 1
        const label = DOW_ABBR[(idx1 - 1) % 7]
        const iconHTML = iconForDay(d, { completed, index1: idx1, today1 })
        const disabled = completed ? 'disabled' : ''
        return `<button class="${cls} w-100"
            data-action="pick-day" data-week="${weekIdx + 1}" data-day="${dayIdx + 1}" ${disabled}>
            <div class="day-number">${label}</div>
            <div class="day-icon">${iconHTML}</div>
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

        let prevBlk = null
        const itemsHTML = day.exercises.map((x, i) => {
            const id = stepId(x)
            const display = stepDisplayName(x, i + 1)
            const dose = (stepTime(x) != null) ? `${stepTime(x)}s` : `${stepReps(x) ?? '—'} reps`
            const blk = exerciseBlock(x)

            const sectionHeader = (blk !== prevBlk)
                ? `<li class="list-group-item ex-section ex-sec-${blk}">
                   <span class="ex-section-dot ex-${blk}"></span>
                   <span class="fw-semibold">${blockLabel(blk)}</span>
                 </li>`
                : ''
            prevBlk = blk

            const badge = `<span class="badge ex-badge ex-badge-${blk} ms-2">${blockLabel(blk)}</span>`
            const active = isActiveDayExerciseByIndex(i);
            const nowPill = active ? `<span class="ex-now-pill">Ahora</span>` : "";

            return `
              ${sectionHeader}
              <li class="list-group-item ex-item ex-${blk} d-flex justify-content-between align-items-center${active ? ' is-active' : ''}">
                <div class="ex-left">
                  <span class="fw-semibold">${i + 1}. ${display}</span>${badge} ${nowPill}
                  <div class="small text-secondary">${dose} • ${stepSets(x)} serie(s)</div>
                </div>
            
                ${id != null
                            ? `<button class="btn btn-link right-info-btn" data-action="help-ex" data-exercise-id="${id}" aria-label="Info ${display}">
                       <i class="bi bi-info-circle"></i>
                     </button>`
                            : `<span class="opacity-0" style="width:1.6rem"></span>`}
              </li>`
        }).join('')

        const estMin = fmtMinutes(estimateDaySeconds(day));
        const within = (estMin >= 45 && estMin <= 60);
        const title = within ? 'Estimación de duración' : 'Fuera del objetivo 45–60 min';
        const badgeCls = within ? 'badge-est ok' : 'badge-est warn';
        const estBadge = `
            <div class="d-flex justify-content-end mb-2">
              <span class="badge ${badgeCls}" title="${title}">≈ ${estMin} min</span>
            </div>`;

        const byBlk = estimateDaySecondsByBlock(day);
        const toMin = (s) => Math.max(0, Math.round(s / 60));
        const parts = UI_BLOCK_ORDER
            .filter(b => (byBlk[b] || 0) > 0)
            .map(b => `${blockLabel(b)} ${toMin(byBlk[b])}′`);
        const breakdown = parts.length
            ? `<div class="est-breakdown small text-secondary">${parts.join(' • ')}</div>`
            : '';

        return headerDay + `
          ${estBadge}
          ${breakdown}
          <ul class="list-group list-group-flush ex-list mb-3">${itemsHTML}</ul>
          <div class="bottom-cta">
            <button class="btn btn-danger btn-lg w-100 btn-tall" data-action="start-training">
              <i class="bi bi-play-fill me-1"></i>Start
            </button>
          </div>`;
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
            <div class="bottom-cta">
              <button class="btn btn-primary btn-tall w-100" data-action="skip-countdown">
                <i class="bi bi-fast-forward-fill me-1"></i>Ir al ejercicio
              </button>
            </div>`;
    }


    /* ---------- 4) EJERCICIO EN CURSO ---------- */
    /* ---------- 4) EJERCICIO EN CURSO (estructura unificada) ---------- */
    function viewTrainingExercise () {
        const ctx = currentExerciseCtx();
        const ex  = ctx.step;
        const isTimed = stepTime(ex) != null;
        const name = stepDisplayName(ex, ctx.index);
        const blk  = exerciseBlock(ex);       // 'warmup' | 'main' | 'stretch'

        const total = ctx.total;
        const completed = ctx.index;
        const setInfo = `${state.training.currentSet}/${ex.sets || 1}`;
        const progressPct = Math.round((completed / total) * 100);

        // MEDIA (prioriza imagen; si no, vídeo; si no, fallback)
        const exInfo = state.exDict.get(String(stepId(ex))) || null;
        const imgs = exerciseImages(exInfo);
        let topMedia = '';
        if (imgs.length) {
            topMedia = `
      <div class="ex-hero">
        <img src="${imgs[0]}" alt="${name}">
        <div class="ex-hero-arrows">
          <button class="btn btn-dark" data-action="prev-ex" aria-label="Ejercicio anterior"><i class="bi bi-chevron-left"></i></button>
          <button class="btn btn-dark" data-action="next-ex" aria-label="Siguiente ejercicio"><i class="bi bi-chevron-right"></i></button>
        </div>
      </div>`;
        } else if (exInfo?.video) {
            topMedia = `
      <div class="ex-hero">
        ${embedVideoHTML(exInfo.video, name)}
        <div class="ex-hero-arrows">
          <button class="btn btn-dark" data-action="prev-ex" aria-label="Ejercicio anterior"><i class="bi bi-chevron-left"></i></button>
          <button class="btn btn-dark" data-action="next-ex" aria-label="Siguiente ejercicio"><i class="bi bi-chevron-right"></i></button>
        </div>
      </div>`;
        } else {
            topMedia = `
      <div class="ex-hero">
        <img src="${exerciseImageFor(ex, name)}" alt="${name}">
        <div class="ex-hero-arrows">
          <button class="btn btn-dark" data-action="prev-ex" aria-label="Ejercicio anterior"><i class="bi bi-chevron-left"></i></button>
          <button class="btn btn-dark" data-action="next-ex" aria-label="Siguiente ejercicio"><i class="bi bi-chevron-right"></i></button>
        </div>
      </div>`;
        }

        // TIMER o REPS
        const timerBlock = isTimed
            ? `<div class="d-flex align-items-center justify-content-center gap-2">
         <button class="btn btn-outline-light btn-sm" data-action="${state.training.timerPaused ? 'resume-timer' : 'pause-timer'}">
           <i class="bi ${state.training.timerPaused ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
         </button>
         <div class="timer-large" id="timedLeftNum">${state.training.timedLeft || stepTime(ex)}</div>
       </div>`
            : `<div class="reps-large">x${stepReps(ex) ?? '—'}</div>`;

        // PLANTILLA UNIFICADA
        return `
    <div class="exercise-screen">

      ${topMedia}

      <!-- NOMBRE (franja de color por bloque) -->
      <div class="ex-strip ex-strip-${blk}">
        <div class="pe-2"><h5>${name}</h5></div>
        <button class="btn btn-link right-info-btn ms-2"
                data-action="help-ex" data-exercise-id="${stepId(ex)}"
                aria-label="Info ${name}">
          <i class="bi bi-info-circle"></i>
        </button>
      </div>

      <!-- SERIE (fuera del bloque de nombre) -->
      <div class="ex-meta-line">Serie ${setInfo}</div>

      <!-- PROGRESO DEL DÍA (igual que antes) -->
      <div class="small text-secondary mb-1">Completado ${completed}/${total} ejercicios</div>
      <div class="progress progress-mini mb-1"><div class="progress-bar" style="width:${progressPct}%"></div></div>

      <!-- CONTADOR/REPS (zona flexible que ocupa el hueco) -->
      <div class="timer-area">${timerBlock}</div>

      <!-- BOTONES pegados abajo -->
      <div class="bottom-actions">
        <div class="btn-row">
          <button class="btn btn-outline-danger btn-tall btn-25" data-action="finish-now">Completar ejercicio</button>
          <button class="btn btn-success btn-tall btn-75" data-action="complete-set"><i class="bi bi-check2-circle me-1"></i>Completar serie</button>
        </div>
      </div>

    </div>`;
    }


    /* ---------- 5) DESCANSO ---------- */
    function viewTrainingRest () {
        const ctx = currentExerciseCtx();
        const reason = state.training.restReason; // 'between-sets' | 'between-exercises'
        const showSame = reason === 'between-sets';
        const nextStep = showSame ? ctx.step : (ctx.day.exercises[ctx.index + 1] || null);
        const nextName = nextStep ? stepDisplayName(nextStep, showSame ? ctx.index : ctx.index + 1) : '—';
        const blk = exerciseBlock(nextStep || ctx.step);

        const total = ctx.total;
        const completed = ctx.index + (showSame ? 0 : 1);
        const progressPct = Math.round((completed / total) * 100);
        const sets = stepSets(nextStep);

        const image = exerciseImageFor(nextStep || {}, nextName);

        return `
            <div class="exercise-screen">
        
              <!-- MEDIA con flechas overlay -->
              <div class="ex-hero">
                <img src="${image}" alt="${nextName}">
                <div class="ex-hero-arrows">
                  <button class="btn btn-dark" data-action="prev-ex" aria-label="Ejercicio anterior"><i class="bi bi-chevron-left"></i></button>
                  <button class="btn btn-dark" data-action="next-ex" aria-label="Siguiente ejercicio"><i class="bi bi-chevron-right"></i></button>
                </div>
              </div>
        
              <!-- NOMBRE (franja por bloque) -->
              <div class="ex-strip ex-strip-${blk}">
                <div class="pe-2"><h5>Siguiente: ${nextName}</h5></div>
                ${nextStep ? `
                  <button class="btn btn-link right-info-btn ms-2"
                          data-action="help-ex" data-exercise-id="${stepId(nextStep)}"
                          aria-label="Info ${nextName}">
                    <i class="bi bi-info-circle"></i>
                  </button>` : ''}
              </div>
        
              <!-- LÍNEA DE DOSIS (reps/tiempo y series), FUERA del bloque nombre -->
              <div class="ex-meta-line">
                ${stepTime(nextStep) != null ? `${stepTime(nextStep)} s` : (stepReps(nextStep) ?? '—') + ' reps'}
                ${sets ? `• ${sets} serie(s)` : ''}
              </div>
        
              <!-- PROGRESO (igual) -->
              <div class="small text-secondary mb-1">Completado ${completed}/${total} ejercicios</div>
              <div class="progress progress-mini mb-1"><div class="progress-bar" style="width:${progressPct}%"></div></div>
        
              <!-- CONTADOR (zona flexible) -->
              <div class="timer-area">
                <div class="d-flex align-items-center justify-content-center gap-2">
                  <button class="btn btn-outline-light btn-sm" data-action="${state.training.timerPaused ? 'resume-timer' : 'pause-timer'}">
                    <i class="bi ${state.training.timerPaused ? 'bi-play-fill' : 'bi-pause-fill'}"></i>
                  </button>
                  <div class="countdown display-5 fw-bold text-center" id="restNum">${state.training.restLeft}</div>
                </div>
              </div>
        
              <!-- BOTONES pegados abajo -->
              <div class="bottom-actions">
                <div class="btn-row">
                  <button class="btn btn-outline-secondary btn-tall btn-25" data-action="extend-rest"><i class="bi bi-plus-circle me-1"></i>+10s</button>
                  <button class="btn btn-primary btn-tall btn-75" data-action="end-rest"><i class="bi bi-skip-forward-fill me-1"></i>Terminar descanso</button>
                </div>
              </div>
        
            </div>`;
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
        timerId = setInterval(() => {
            state.training.countdownLeft--
            const n = $('#countdownNum')
            if (n) n.textContent = state.training.countdownLeft

            const sec = state.training.countdownLeft;
            if (state.tts?.enabled && state.tts?.speakSeconds?.includes(sec)) speak(String(sec));

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

    function isActiveDayExercise(blk, idx){
        // Si no hay sesión o no estamos en un subestado “de entrenamiento”, no marcamos nada
        if (!state?.training) return false;
        const sub = state.training.substate;
        // subestados en los que tiene sentido marcar el vigente aunque estemos viendo la lista del día
        const showIn = ['day','countdown','exercise','rest','paused'];
        if (!showIn.includes(sub)) return false;

        // Usa el contexto actual del ejercicio
        const ctx = currentExerciseCtx && currentExerciseCtx();
        if (!ctx) return false;

        // ctx.block y ctx.index son las referencias actuales del ejercicio
        return ctx.block === blk && ctx.index === idx;
    }


    function startExercise () {
        stopVoice() // corta lo anterior
        state.training.substate = 'exercise'
        state.training.timerPaused = false
        state.training.restReason = null
        state.training._halfSpoken = false;
        const ctx = currentExerciseCtx()
        if (state.settings.speakExerciseName) {
            const n = stepDisplayName(ctx.step, ctx.index)
            const t = stepTime(ctx.step)
            const r = stepReps(ctx.step)
            const dose = doseSpeech(ctx.step)
            speak(`Inicia: ${n}${dose ? ', ' + dose : ''}`)
        }
        state.training.timedLeft = stepTime(ctx.step) ?? 0
        playWhistle()
        render()
        if (stepTime(ctx.step) != null) runTimedSet()
        updateNavVisibility()
    }

    function runTimedSet () {
        clearInterval(timerId);

        // total del ejercicio actual (quedará cerrado en la función del intervalo)
        const total = stepTime(currentExerciseCtx().step) ?? 0;

        timerId = setInterval(() => {
            if (state.training.timerPaused) return;

            state.training.timedLeft--;
            const left = state.training.timedLeft;

            const node = $('#timedLeftNum');
            if (node) node.textContent = Math.max(0, left);

            // Anuncio de mitad de tiempo (una sola vez)
            if (state?.tts?.enabled && total && !state.training._halfSpoken) {
                if (left === Math.floor(total / 2)) {
                    speak('Vas por la mitad');
                    state.training._halfSpoken = true;
                }
            }

            // Anunciar segundos seleccionados (1–10)
            if (state.tts?.enabled && state.tts?.speakSeconds?.includes(left)) {
                speak(String(left));
            }

            if (left <= 0) {
                clearInterval(timerId);
                completeSet();
            }
        }, 1000);
    }


    function getRestBetweenSets (step) {
        // 1) Descanso definido en el ejercicio (respeta 0 y formatos tipo "30s", "1:00")
        if (typeof step?.rest === 'number') return step.rest;
        if (step?.rest != null) {
            const secs = parseSeconds(step.rest);
            if (secs != null) return secs; // incluye 0
        }

        // 2) Configuración (si está establecida)
        const cfg = state.settings?.restBetweenSets;
        if (typeof cfg === 'number' && cfg >= 0) return cfg;

        // 3) Fallback final
        return 20;
    }

    function getRestBetweenExercises (step) {
        // 1) Prioridad: rest_next (si existe). Si no, rest del ejercicio.
        if (typeof step?.rest_next === 'number') return step.rest_next;
        if (step?.rest_next != null) {
            const s = parseSeconds(step.rest_next);
            if (s != null) return s; // incluye 0
        }
        if (typeof step?.rest === 'number') return step.rest;
        if (step?.rest != null) {
            const s = parseSeconds(step.rest);
            if (s != null) return s; // incluye 0
        }

        // 2) Configuración (si está establecida)
        const cfg = state.settings?.restBetweenExercises;
        if (typeof cfg === 'number' && cfg >= 0) return cfg;

        // 3) Fallback final
        return 30;
    }


    function completeSet () {
        const ctx = currentExerciseCtx()
        const totalSets = ctx.step.sets || 1

        if (state.training.currentSet < totalSets) {
            state.training.nextSet = state.training.currentSet + 1
            state.training.substate = 'rest'
            state.training.restReason = 'between-sets'
            state.training.restLeft = getRestBetweenSets(ctx.step)
            state.training.timerPaused = false
            render()
            updateNavVisibility()
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
            state.training.timerPaused = false
            render()
            runRest()
        } else {
            // Al terminar el último ejercicio del día:
            state.training.substate = 'finished'
            state.training.finishedAt = Date.now()

            updateNavVisibility()

            // Marca el día como completado para el PLAN ACTUAL
            const pid = getCurrentPlanId()
            markDayCompletedFor(pid, state.training.currentWeek - 1, state.training.currentDay - 1)

            // (mantén tus acumuladores de stats si los tienes)
            const { kcal, minutes } = estimateSession()
            state.stats.trainingsDone = (state.stats.trainingsDone || 0) + 1
            state.stats.minutesTrained = (state.stats.minutesTrained || 0) + minutes
            state.stats.kcalBurned = (state.stats.kcalBurned || 0) + Math.round(kcal)

            // NUEVO: añadir entrada al log diario
            ensureStats()
            state.stats.trainingLog.push({
                date: todayYYYYMMDD(),          // ya tienes helper todayYYYYMMDD()
                minutes: minutes,
                kcal: Math.round(kcal),
                planId: pid,
                week: state.training.currentWeek,
                day:  state.training.currentDay
            })
            saveStats()

            // sonido, render...
            playApplause()
            render()
            updateNavVisibility()
            setTimeout(() => launchConfetti({ pieces: 200, duration: 2500 }), 0);
        }
    }

    function runRest () {
        stopVoice() // corta lo anterior
        clearInterval(timerId)

        // Decir la frase de descanso aquí
        try {
          if (isTTSEnabled()) {
                const ctx = currentExerciseCtx();
                const showSame = state.training.restReason === 'between-sets';
                const nextStep = showSame ? ctx.step : (ctx.day.exercises[ctx.index + 1] || null);
                const nextName = nextStep ? stepDisplayName(nextStep, showSame ? ctx.index : ctx.index + 1) : '—';
                // incluir reason en la clave para distinguir descansos distintos en el mismo índice
                    const restKey = `r-${state.training?.currentWeek}-${state.training?.currentDay}-${ctx.index}-${state.training?.restReason}`;
                if (state.training._lastRestKey !== restKey) {
                      let dose = '';
                      if (nextStep) {
                            const secs = stepTime(nextStep);
                            const reps = stepReps(nextStep);
                            dose = secs != null ? `${secs} segundos` : (reps != null ? `${reps} repeticiones` : '');
                          }
                      const msg = nextStep
                        ? `Tómate un descanso. Siguiente ejercicio ${nextName}${dose ? ', ' + dose : ''}`
                            : `Tómate un descanso`;
                      speak(msg);
                      playDing();
                      state.training._lastRestKey = restKey;
                    }
              }
        } catch {}

        timerId = setInterval(() => {
            if (state.training.timerPaused) return
            state.training.restLeft--

            const sec = state.training.restLeft;
            if (state.tts?.enabled && state.tts?.speakSeconds?.includes(sec)) speak(String(sec));

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

    function isLikelyImageUrl (src) {
        if (typeof src !== 'string') return false
        const trimmed = src.trim()
        if (!trimmed) return false
        if (trimmed.startsWith('data:image/')) return true
        const clean = trimmed.split('?')[0].split('#')[0]
        return /\.(png|jpe?g|webp|gif|svg)$/i.test(clean)
    }

    function exerciseImages (ex) {
        if (!ex) return []
        const seen = new Set()
        const list = []
        const push = (src, requireCheck = true) => {
            if (typeof src !== 'string') return
            const trimmed = src.trim()
            if (!trimmed) return
            if (requireCheck && !isLikelyImageUrl(trimmed)) return

            // --- RESOLVER DE RUTA: si no es absoluta ni data:, anteponer EX_IMG_BASE ---
            let resolved = trimmed
            const isAbsolute = /^(?:[a-z]+:)?\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:')
            if (!isAbsolute) {
                resolved = EX_IMG_BASE + trimmed.replace(/^\.?\//, '')
            }
            // ---------------------------------------------------------------------------

            if (seen.has(resolved)) return
            seen.add(resolved)
            list.push(resolved)
        }
        if (typeof ex.image === 'string') push(ex.image, false)
        if (Array.isArray(ex.images)) ex.images.forEach(src => push(src, true))
        return list
    }

    function exerciseImageFor (step, name) {
        const sid = stepId(step)
        const ex = sid != null ? state.exDict.get(String(sid)) : null
        const images = exerciseImages(ex)
        if (images.length) return images[0]
        const n = (name || '').toLowerCase()
        // if (n.includes('jump')) return 'https://images.unsplash.com/photo-1554344728-77cf90d9ed26?q=80&w=1200&auto=format&fit=crop'
        // if (n.includes('push')) return 'https://images.unsplash.com/photo-1527933053326-89d1746b76f8?q=80&w=1200&auto=format&fit=crop'
        return 'https://images.unsplash.com/photo-1526404079164-3c7f7b6a8ee8?q=80&w=1200&auto=format&fit=crop'
    }

    function renderExerciseGallery (ex, title) {
        const images = exerciseImages(ex)
        if (!images.length) return ''
        const displayTitle = title || (ex?.name ?? 'Ejercicio')
        if (images.length === 1) {
            const src = escapeAttr(images[0])
            const alt = escapeAttr(displayTitle)
            return `<div class="exercise-gallery mb-3"><img src="${src}" class="img-fluid rounded border" loading="lazy" alt="${alt}"></div>`
        }
        const items = images.map((src, idx) => {
            const safeSrc = escapeAttr(src)
            const safeAlt = escapeAttr(`${displayTitle} paso ${idx + 1}`)
            return `<img src="${safeSrc}" class="rounded border" loading="lazy" alt="${safeAlt}" style="height:140px;width:auto;flex:0 0 auto;">`
        }).join('')
        return `<div class="exercise-gallery mb-3"><div class="d-flex gap-2 overflow-auto pb-1">${items}</div></div>`
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
            const gallery = renderExerciseGallery(ex, ex.name || exId)
            const video = ex.video ? embedVideoHTML(ex.video, ex.name || ex.id) : '';
            help.innerHTML = `
              <h5 class="mb-2">${ex.name || exId}</h5>
              ${muscles}
              ${ex.description ? `<p class="mb-2">${ex.description}</p>` : ''}
              ${cues}
              ${gallery}
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

        try {
            if (hidden) {
                KeepAwake.keepAwake().catch(()=>{});
                trainingInProgress = true;
            } else {
                KeepAwake.allowSleep().catch(()=>{});
                trainingInProgress = false;
            }
        } catch {}
    }

    function updateNavVisibility () {
        const activeStates = new Set(['countdown', 'exercise', 'rest', 'finished'])
        const hide = (state.view === 'training' && activeStates.has(state.training?.substate))
        setTrainingNavHidden(hide)
    }

    function updateAppContentFill(){
        // SOLO en pantallas de ejercicio en curso o descanso
        const active = (state.view === 'training') && ['exercise','rest'].includes(state.training?.substate);
        document.documentElement.classList.toggle('training-fill', active);
    }


    function shouldShowTopBack(){
        const t = state.training?.substate;
        const isTrainingBack = state.view === 'training' && ['day','countdown','exercise','rest','finished'].includes(t);
        const isSettingsBack = state.view === 'settings' && state.settingsUI?.substate !== 'menu';
        return isTrainingBack || isSettingsBack;
    }

    function updateTopBack(){
        const btn = document.getElementById('navBackBtn');
        if (!btn) return;
        const show = shouldShowTopBack();

        if (show) {
            // mostrar y forzar un reflow antes de añadir .show => dispara la transición
            btn.classList.remove('d-none');
            btn.classList.remove('show');
            // fuerza reflow
            void btn.offsetWidth;
            btn.classList.add('show');
        } else {
            // ocultar con transición suave y, al terminar, sacar del flujo
            btn.classList.remove('show');
            setTimeout(() => btn.classList.add('d-none'), 250);
        }
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

    function isActiveDayExerciseByIndex(idx){
        if (!state?.training) return false;
        const sub = state.training.substate;
        // Estados en los que tiene sentido mostrar el vigente
        if (!['day','countdown','exercise','rest','finished'].includes(sub)) return false;
        return state.training.currentExerciseIndex === idx;
    }


    // Cambia tus usos de daysCompleted para que llamen a estas helpers por plan actual (si aún no lo hiciste)

    function performResetPlanProgress (planId) {
        const pp = ensurePlanProgress()
        delete pp[planId]
        localStorage.setItem('sf_stats', JSON.stringify(state.stats))
    }

    function initializeSettings() {
        return Object.assign({
            voiceEnabled: true,
            voiceGender: 'female',
            countdownSpokenSeconds: [10, 5, 3],
            speakExerciseName: true,
            restBetweenSets: null,
            restBetweenExercises: null
        }, state.settings || {})
    }

    // --- Bloques: warmup | main | stretch ---------------------------------
    function exerciseBlock (s) {
        const b = (s?.block || '').toLowerCase()
        if (b === 'warmup' || b === 'main' || b === 'stretch' || b === 'finisher') return b

        // Inferencia para retrocompatibilidad
        const sid = stepId(s)
        const idStr = (sid != null ? String(sid) : '').toUpperCase()
        const ex = sid != null ? (state.exDict.get(String(sid)) || state.exDict.get(sid)) : null
        const pat = (ex?.movement_pattern || ex?.pattern || '').toLowerCase()

        if (idStr.startsWith('WU_') || pat.includes('warmup')) return 'warmup'
        if (idStr.startsWith('ST_') || pat.includes('stretch')) return 'stretch'
        return 'main'
    }

    function blockLabel (b) {
        return b === 'warmup'   ? 'Calentamiento'
             : b === 'stretch'  ? 'Estiramiento'
             : b === 'finisher' ? 'Finisher'
             :                    'Entrenamiento';
    }

    // === [ADD] cerca de exerciseBlock()/blockLabel() ===
    function blockOrder (b) {
        switch ((b || '').toLowerCase()) {
            case 'finisher':  return 0;
            case 'warmup':    return 1;
            case 'main':      return 2;
            case 'stretch':   return 3;
            default:          return 2; // trata lo desconocido como 'main'
        }
    }

    // Fuerza a que el navegador no restaure la posición del scroll en navegación
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    /** Sube al top de la página y, si existe, del contenedor principal */
    function scrollToTopNow() {
        // ventana
        try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) {}
        const el = document.querySelector('#appMain, #app, main, .app-content, .container-fluid');
        if (el) el.scrollTop = 0;
    }

    /** Sube al top justo DESPUÉS de renderizar el nuevo contenido */
    function scrollToTopAfterRender() {
        // doble RAF para asegurar layout aplicado antes de mover el scroll
        requestAnimationFrame(() => requestAnimationFrame(scrollToTopNow));
    }

// --- Normalización de un ejercicio suelto (mantiene campos y añade block/seconds)
    function normalizeExerciseItem (step, fallbackBlock) {
        const out = { ...step }

        // seconds a partir de 'time' (string)
        if (out.seconds == null && out.time != null) {
            const secs = parseSeconds(out.time)
            if (secs != null) out.seconds = secs
        }

        // bloque: lo que venga prevalece; si no, inferimos por id o usamos el del bloque padre
        if (!out.block) {
            const id = String(out.id || '').toUpperCase()
            if (id.startsWith('WU_')) out.block = 'warmup'
            else if (id.startsWith('ST_')) out.block = 'stretch'
            else out.block = (fallbackBlock || 'main')
        }

        return out
    }

    function planKey(p) {
        // clave robusta para comparar el plan activo con los listados
        return (p?.meta?.id || p?.meta?.slug || p?.meta?.name || p?.id || '').toString().trim().toLowerCase();
    }

    function sortPlanInfosActiveFirst(infos){
        const activeId = state.currentPlanId || 'builtin';
        return [ ...(infos || []) ].sort((a, b) => {
            const aIs = a?.id === activeId;
            const bIs = b?.id === activeId;
            return aIs === bIs ? 0 : (aIs ? -1 : 1);
        });
    }

    function downloadBlob (data, filename, type = 'application/json') {
        try {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.rel = 'noopener';
            // Si el navegador no soporta "download", abrimos en una pestaña (Safari/iOS)
            const supportsDownload = 'download' in HTMLAnchorElement.prototype;

            if (!supportsDownload) {
                // fallback: abrir en pestaña. En iOS aparecerá el menú de compartir/guardar.
                window.open(url, '_blank', 'noopener');
                // revocar un poco más tarde para dar tiempo a cargar
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                return;
            }

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('downloadBlob error:', e);
            try {
                // Ultra-fallback: data URL (puede ser pesado para archivos grandes)
                const base64 = btoa(unescape(encodeURIComponent(String(data))));
                const href = `data:${type};base64,${base64}`;
                const a = document.createElement('a');
                a.href = href;
                a.download = filename;
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (e2) {
                alert('No se pudo iniciar la descarga del progreso.');
            }
        }
    }


    function todayYYYYMMDD () {
        const d = new Date()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${d.getFullYear()}-${mm}-${dd}`
    }

    function exportProgressJSON () {
        const info = getActivePlanInfo();
        if (!info) {
            alert('No hay plan activo.');
            return;
        }

        // Días completados (usa tu helper isDayCompleted)
        const weeks = info.data?.weeks || [];
        const done = [];
        for (let w = 0; w < weeks.length; w++) {
            const days = weeks[w]?.days || [];
            for (let d = 0; d < days.length; d++) {
                if (isDayCompleted(w, d)) done.push([w + 1, d + 1]); // base-1 solo por legibilidad
            }
        }

        // Posición actual (usa las claves reales del estado)
        const t = state.training || {};
        const pos = {
            currentWeek: t.currentWeek ?? null,
            currentDay: t.currentDay ?? null,
            currentExerciseIndex: t.currentExerciseIndex ?? null,
            currentSet: t.currentSet ?? null,
            substate: t.substate ?? null
        };

        const payload = {
            schema: 'progress.v1',
            savedAt: new Date().toISOString(),
            plan: { id: info.id, name: info.name },
            progress: { doneDays: done, position: pos }
        };

        const json = JSON.stringify(payload, null, 2);
        const fname = `progreso_${(info.name || info.id || 'plan')}_${todayYYYYMMDD()}.json`.replace(/\s+/g, '_');
        downloadBlob(json, fname);
    }


    function importProgressFromFile (ev) {
        console.log('Importando progreso desde archivo...', ev);
        const file = ev?.target?.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result)
                if (!data || data.schema !== 'progress.v1') throw new Error('Formato de progreso no reconocido')

                const current = getActivePlanInfo()
                if (!current) throw new Error('No hay plan activo para aplicar el progreso')

                // Aviso si el progreso es de otro plan (se puede aplicar igualmente)
                if (data.plan?.id && data.plan.id !== current.id) {
                    console.warn('El progreso proviene de otro plan:', data.plan, ' ≠ ', current)
                }

                // 1) Restaurar días completados
                const done = Array.isArray(data.progress?.doneDays) ? data.progress.doneDays : []
                for (const entry of done) {
                    const [w1, d1] = entry
                    if (Number.isInteger(w1) && Number.isInteger(d1)) {
                        // tus helpers trabajan en base-0
                        markDayCompletedFor(getCurrentPlanId(), w1 - 1, d1 - 1);
                    }
                }

                // 2) Restaurar posición actual (opcional)
                const p = data.progress?.position || {};
                if (p && typeof p === 'object') {
                    state.training = state.training || {};
                    if (Number.isInteger(p.currentWeek))         state.training.currentWeek = p.currentWeek;
                    if (Number.isInteger(p.currentDay))          state.training.currentDay  = p.currentDay;
                    if (Number.isInteger(p.currentExerciseIndex)) state.training.currentExerciseIndex = p.currentExerciseIndex;
                    if (Number.isInteger(p.currentSet))          state.training.currentSet  = p.currentSet;
                    if (typeof p.substate === 'string')          state.training.substate    = p.substate;
                }

                // Persistir y refrescar UI
                saveUserPlans?.()  // si tu persistencia de progreso va acoplada aquí
                render()

                // feedback
                toast?.('Importado', 'Progreso importado correctamente.', 'success');
            } catch (e) {
                console.error(e)
                toast?.('Error', 'No se pudo importar el progreso: ' + e.message, 'danger', 3000);
            } finally {
                ev.target.value = '' // limpiar input
            }
        }
        reader.readAsText(file)
    }

// --- Helpers de stats / fechas ---
    function ensureStats () {
        if (!state.stats) state.stats = {}
        if (!Array.isArray(state.stats.trainingLog)) state.stats.trainingLog = []
        if (typeof state.stats.trainingsDone !== 'number') state.stats.trainingsDone = 0
        if (typeof state.stats.minutesTrained !== 'number') state.stats.minutesTrained = 0
        if (typeof state.stats.kcalBurned !== 'number') state.stats.kcalBurned = 0
        return state.stats
    }
    function saveStats () {
        localStorage.setItem('sf_stats', JSON.stringify(state.stats))
    }
    function ymd (d = new Date()) {
        const mm = String(d.getMonth()+1).padStart(2,'0')
        const dd = String(d.getDate()).padStart(2,'0')
        return `${d.getFullYear()}-${mm}-${dd}`
    }
    function parseYMD (s) {
        const [Y,M,D] = (s||'').split('-').map(Number)
        if (!Y || !M || !D) return null
        return new Date(Y, M-1, D)
    }
    function addDays(date, delta){ const d=new Date(date); d.setDate(d.getDate()+delta); return d }

// Serie diaria (últimos n días) agregada por fecha
    function buildDailySeries(n = 14) {
        ensureStats()
        const today = new Date()
        const days = []
        for (let i = n-1; i >= 0; i--) {
            const d = ymd(addDays(today, -i))
            days.push({ date: d, minutes: 0, kcal: 0 })
        }
        const idxByDate = Object.fromEntries(days.map((x, i) => [x.date, i]))
        for (const e of state.stats.trainingLog || []) {
            const i = idxByDate[e.date]
            if (i != null) {
                days[i].minutes += Math.max(0, Math.round(e.minutes || 0))
                days[i].kcal    += Math.max(0, Math.round(e.kcal    || 0))
            }
        }
        return days
    }

// Racha actual (días consecutivos entrenando hacia atrás desde hoy)
    function currentStreak () {
        ensureStats()
        const set = new Set((state.stats.trainingLog||[]).map(e => e.date))
        let streak = 0
        let d = new Date()
        while (set.has(ymd(d))) { streak++; d = addDays(d, -1) }
        return streak
    }

// Totales útiles (recalcula por si acaso)
    function statsTotalsFromLog () {
        ensureStats()
        const log = state.stats.trainingLog || []
        const minutes = log.reduce((a,b)=>a+(b.minutes||0),0)
        const kcal    = log.reduce((a,b)=>a+(b.kcal||0),0)
        const days    = new Set(log.map(e=>e.date)).size
        return { minutes, kcal, days }
    }

    function renderVoiceOptions(selectedValue){
        try{
            const list = (typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices)
                ? speechSynthesis.getVoices()
                : [];

            if (!list || list.length === 0){
                // Mostramos un placeholder mientras se disparan las voces
                return `<option value="">(Cargando voces…)</option>`;
            }

            // Usaremos voiceURI si existe; si no, name (para persistencia)
            return list.map(v => {
                const value = v.voiceURI || v.name;
                const isSel = selectedValue ? (selectedValue === value || selectedValue === v.name) : v.default;
                const label = `${v.name} (${v.lang})${v.default ? ' — predeterminada' : ''}`;
                return `<option value="${value.replace(/"/g,'&quot;')}"`
                    + (isSel ? ' selected' : '')
                    + `>${label.replace(/</g,'&lt;')}</option>`;
            }).join('');
        }catch(e){
            return `<option value="">(No hay voces disponibles)</option>`;
        }
    }

    /** Sincroniza state.tts y state.options desde state.settings (persistido). */
    function ensureSettingsHydrated(){
        const s = state.settings || {};
        state.tts = { ...DEFAULT_TTS, ...(s.tts || {}), ...(state.tts || {}) };
        state.options = { ...DEFAULT_OPTS, ...(s.options || {}), ...(state.options || {}) };
    }

    /** Persiste en localStorage fusionando lo que haya en state.settings con lo editado en UI. */
    function persistOptions(){
        const merged = {
            ...(state.settings || {}),
            tts: { ...(state.settings?.tts || {}), ...(state.tts || {}) },
            options: { ...(state.settings?.options || {}), ...(state.options || {}) }
        };
        state.settings = merged;
        try {
            localStorage.setItem('sf_settings', JSON.stringify(merged));
        } catch (e) {
            console.warn('No se pudieron guardar las opciones en localStorage:', e);
        }
    }

    // --- Toast helper (Bootstrap 5 con fallback a alert) -----------------------
    function ensureToastContainer(){
        if (document.getElementById('sfToasts')) return;
        const box = document.createElement('div');
        box.id = 'sfToasts';
        box.className = 'toast-container p-3';
        // esquina inferior: puedes cambiar a top-0 start-50 translate-middle-x si prefieres arriba
        box.style.position = 'fixed';
        box.style.right = '0';
        box.style.bottom = '0';
        box.style.zIndex = '1080';
        document.body.appendChild(box);
    }

    function toast(title = 'Info', message = '', variant = 'success', delay = 1800){
        try{
            ensureToastContainer();
            const container = document.getElementById('sfToasts');

            const el = document.createElement('div');
            el.className = `toast text-bg-${variant}`;
            el.role = 'status';
            el.ariaLive = 'polite';
            el.ariaAtomic = 'true';
            el.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
      ${message ? `<div class="toast-body">${message}</div>` : '' }
    `;
            container.appendChild(el);

            const ToastCtor = window.bootstrap?.Toast;
            if (ToastCtor){
                const t = new ToastCtor(el, { delay, autohide: true });
                t.show();
                el.addEventListener('hidden.bs.toast', () => { try { el.remove(); } catch {} });
            } else {
                // Fallback si no está Bootstrap: usar alert y limpiar el nodo
                setTimeout(() => { try { el.remove(); } catch {} }, Math.max(1000, delay));
                alert((title || '') + (message ? '\n' + message : ''));
            }
        }catch(e){
            // Último fallback
            alert((title || 'Hecho') + (message ? '\n' + message : ''));
        }
    }


    // 3) Llama esto cuando el usuario pulse "Start" (o equivalente)
    async function onTrainingStart() {
        trainingInProgress = true;
        try { await KeepAwake.keepAwake(); } catch {}
    }

    // 4) Llama esto cuando termines o canceles el entreno
    async function onTrainingEnd() {
        trainingInProgress = false;
        try { await KeepAwake.allowSleep(); } catch {}
    }

    // 5) Si la app pasa a segundo plano, permitir dormir; si vuelve y sigues entrenando, reactivar
    App.addListener('appStateChange', async ({ isActive }) => {
        try {
            if (isActive) {
                if (trainingInProgress) await KeepAwake.keepAwake();
            } else {
                await KeepAwake.allowSleep();
            }
        } catch {}
    });

    // 6) Fallback web por si ejecutas en navegador
    document.addEventListener('visibilitychange', async () => {
        try {
            if (document.hidden) {
                await KeepAwake.allowSleep();
            } else if (trainingInProgress) {
                await KeepAwake.keepAwake();
            }
        } catch {}
    });

    // (Opcional) por si el usuario cierra la vista actual
    window.addEventListener('beforeunload', () => {
        KeepAwake.allowSleep().catch(() => {});
    });

    // Llama a esto en tu bootstrap (después de render inicial)
    initOrientationGuard();

    // Ejemplo: activar siempre al iniciar (ajústalo a tu lógica real)
    window.addEventListener('load', () => {
        setAdsEnabled(false)
        bootstrap()
    })

    // Boot
    // window.addEventListener('load', bootstrap);

    window.addEventListener('hashchange', () => {
        scrollToTopAfterRender();
    });
    window.addEventListener('popstate', () => {
        scrollToTopAfterRender();
    });

})();
