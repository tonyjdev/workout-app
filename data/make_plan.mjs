// make_plan_v3.mjs
import { readFile, writeFile } from "fs/promises";

const SHOULDER_TO_LOWIMPACT = {
    "MILITARY_PRESS": "ROW_DB_BENT",
    "PIKE_PUSH_UPS": "PLANK_PULL",
    "VERT_PUSH": "PALLOF",
    "PRESS_DB_SHOULDER": "ROW_ISOPAUSE",
    "PRESS_DB_BENCH": "HIP_THRUST",
};

const LEG_POOL = ["SQUATS","HIP_THRUST","SIDE_LUNGES","SPLIT_SQUAT_LEFT","SPLIT_SQUAT_RIGHT","STEPUPS","RDL"];

function isLegId(id) {
    if (typeof id !== "string") return false;
    return ["SQUAT","LUNGE","STEP","HIP","RDL","DEADLIFT","GLUTE","THRUST","CALF"].some(tok => id.includes(tok));
}

function replaceInDay(day) {
    // 1) Reemplazo de hombros por variantes de menor impacto (sin cambiar estructura)
    for (const key of ["warmup","main","finisher","stretch"]) {
        if (Array.isArray(day[key])) {
            day[key].forEach(ex => {
                if (ex && typeof ex === "object" && ex.id && SHOULDER_TO_LOWIMPACT[ex.id]) {
                    ex.id = SHOULDER_TO_LOWIMPACT[ex.id];
                }
            });
        }
    }

    // 2) Aumentar volumen de pierna en bloque main (si hay < 2 ejercicios de pierna, añadir los que falten)
    if (Array.isArray(day.main)) {
        const mainIds = day.main.filter(e => e && typeof e === "object").map(e => e.id);
        const legCount = mainIds.filter(id => isLegId(id)).length;
        if (legCount < 2) {
            const needed = 2 - legCount;
            for (let i = 0; i < needed; i++) {
                const legId = LEG_POOL[i % LEG_POOL.length];
                day.main.push({
                    id: legId,
                    type: "reps",
                    sets: 3,
                    reps: 10,
                    rest: 45,
                    intensity: "high",
                    block: "main",
                });
            }
        }
    }

    // 3) Transición en finishers
    if (Array.isArray(day.finisher)) {
        day.finisher.forEach(ex => {
            if (ex && typeof ex === "object") ex.rest_next = 10;
        });
    }
}

function traverse(obj) {
    if (Array.isArray(obj)) {
        obj.forEach(traverse);
        return;
    }
    if (obj && typeof obj === "object") {
        // Día típico si contiene alguno de los bloques
        if (["warmup","main","stretch","finisher"].some(k => Array.isArray(obj[k]))) {
            replaceInDay(obj);
        }
        Object.values(obj).forEach(traverse);
    }
}

const src = process.argv[2] || "plan_v2.json";
const dst = process.argv[3] || "plan_v3.json";

const plan = JSON.parse(await readFile(src, "utf-8"));
const plan_v3 = structuredClone(plan);

traverse(plan_v3);

// Ajuste de título (no cambia nombres de sesiones)
if (typeof plan_v3.title === "string") {
    plan_v3.title = "Plan 12 semanas intensivo (v3)";
} else {
    plan_v3.meta ??= {};
    plan_v3.meta.title = "Plan 12 semanas intensivo (v3)";
}

await writeFile(dst, JSON.stringify(plan_v3, null, 2), "utf-8");
console.log(`✅ Generado ${dst}`);
