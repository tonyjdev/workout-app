# Plantilla de prompt — Generador de planes (Workout App)

Usa esta plantilla para pedirme un `plan.json` **100% compatible** con tu app. Solo tendrás que copiarla, rellenar los huecos y enviármela en un mensaje.

---

## 1) Datos de usuario y objetivo

- **Objetivo principal**: _(p. ej., perder grasa abdominal, ganar fuerza/músculo, mejorar movilidad)_
- **Nivel / experiencia**: _(principiante | intermedio | avanzado)_
- **Limitaciones / lesiones**: _(opcional)_
- **Disponibilidad semanal**: _(días exactos, p. ej., L a V)_
- **Duración por día**: _(p. ej., 45–60 min)_
- **Semanas totales**: _(p. ej., 8 | 12)_
- **Material disponible**: _(mancuernas, bandas, colchoneta, banco…)_
- **Preferencias**: _(ejercicios a incluir/evitar; superseries; circuitos; etc.)_

## 2) Estructura de cada sesión (bloques)

1. **Calentamiento** (8–10 min) — `WU_*`, movilidad ligera, activación.
2. **Entrenamiento principal** (32–40 min) — básicos + accesorios por patrones (bisagra, sentadilla, empujes/ tracciones, core).
3. **Estiramientos** (5–8 min) — `ST_*` / movilidad dirigida.

> En el JSON, cada ejercicio llevará (como mínimo): `id`, `sets`, `type` (`"reps"` o `"time"`), y **`reps` o `seconds`**. Opcionales soportados por la app: `rest` (entre series), `rest_next` (entre ejercicios), `intensity`. También puedo incluir `rir`, `rpe`, `tempo`, `superset_id`, `block` (`warmup|main|stretch`) aunque tu app los ignora a nivel de cálculo.

## 3) Progresión e intensidad

- **Modelo**: _p. ej., 3 mesociclos + deloads (1–3 base, 4 deload, 5–7 progreso, 8 deload, 9–11 intensificación, 12 deload)_.
- **Básicos**: reducir repeticiones a lo largo de los mesociclos (12→10→8) y/o aumentar series en semanas de progreso.
- **Accesorios**: mantener 10–12 reps, 2–4 series según semana.
- **Aumento de carga**: subir peso si en la última serie el RIR ≥ 3 o el RPE ≤ 7.5.
- **Descansos sugeridos**: básicos 60–90s; accesorios 45–60s; core 30–45s. (Puedo plasmarlos con `rest` y `rest_next`).

## 4) Variaciones para evitar estancamiento

- **Frecuencia de cambio**: cada 4 semanas cambiar 1–2 accesorios por variantes del mismo patrón.
- **Regla**: mantener el patrón y el grupo muscular (ver catálogo por patrones más abajo).

## 5) Cardio opcional (si aplica)

- _(p. ej., natación 1–2 tardes/semana; no se incluye en JSON, solo se mencionará en `meta.description`)_

## 6) Requisitos de salida

- Responderé con:
  1. **Resumen breve** (≤120 palabras).
  2. **Bloque `JSON` válido** con:
     - `meta`: `{ image, level, goal, equipment[], muscles[], avg_minutes, doc_links[], description }`
     - `weeks[]`: `{ number, days[] }`
     - `days[]`: `{ dayNum (1=Lunes…7=Domingo), label, focus, exercises[] }`
     - `exercises[]`: `{ id, sets, type, reps|seconds, perSide? } + rest/rest_next/intensity (opc.)`

---

## Catálogo de ejercicios por patrón (IDs válidos)

### Bisagra de cadera (hinge)
- `HIP_HINGE` — Bisagra de cadera (RDL / good morning con banda)
- `RDL` — Peso muerto rumano

### Calentamiento / Movilidad (warmup_mobility)
- `WU_9090` — 90/90 cadera
- `WU_CATCAMEL` — Cat-Camel (movilidad columna)
- `WU_MARCH` — Marcha vigorosa / step march
- `WU_PULLAPART` — Band Pull-Apart

### Cargas isométricas (carry_isometric)
- `INT_FARMER_HOLD` — Farmer hold (isométrico)

### Core antiextensión (core_antiextension)
- `HOLLOW` — Hollow hold
- `PLANK_FRONT` — Plancha frontal

### Core antirotación (core_antirotation)
- `PALLOF` — Pallof press con banda
- `PLANK_PULL` — Plancha con arrastre (plank pull-through)

### Core estabilidad lateral (core_lateral_stability)
- `PLANK_SIDE` — Plancha lateral

### Empuje horizontal (horizontal_push)
- `HOR_PUSH` — Empuje horizontal (press o flexión baja)
- `PRESS_DB_BENCH` — Press mancuernas en banco

### Empuje vertical (vertical_push)
- `PRESS_DB_SHOULDER` — Press hombro sentado (mancuernas)
- `VERT_PUSH` — Pike push-up en banco / Press inclinado mancuernas

### Estiramientos / Movilidad (stretch_mobility)
- `MOB_HIP_ANKLE` — Movilidad cadera y tobillo (bloque)
- `ST_ADDUCTOR` — Estiramiento aductores/ingle
- `ST_ADD_COPEN_S` — Copenhagen mod. isométrica (suave)
- `ST_HAM` — Estiramiento isquiotibial
- `ST_HIPFLEX` — Estiramiento flexor de cadera (medio arrodillado)
- `ST_OPENBOOK` — Open book torácico
- `ST_PIRIFORMIS` — Estiramiento piriforme

### Gemelos (calf_raise)
- `CALF_RAISE` — Elevación de gemelos en escalón (unilateral)

### Locomoción bajo impacto (locomotion_low_impact)
- `INT_MARCH_LATERAL` — Marcha vigorosa / pasos laterales sin pivotar

### Otros (other)
- `BIRD_DOG` — Bird-dog
- `HIP_THRUST` — Hip thrust

### Sentadilla / Dominancia de rodilla (squat_knee_dominant)
- `INT_BOX_SQUAT` — Sentadilla a caja (intervalos)
- `QUAD_DOM` — Cuádriceps dominante (sentadilla caja o split corto)
- `SQ_BOX_GOBLET` — Sentadilla a caja (goblet)

### Subidas / Locomoción (step_up_locomotion)
- `INT_STEPUP` — Step-ups (intervalos)
- `STEPUPS` — Step-ups (fuerza)

### Tracción horizontal (horizontal_pull)
- `INT_ROW_BAND` — Remo con banda (intervalos)
- `ROW_DB_1ARM` — Remo a una mano en banco
- `ROW_DB_BENT` — Remo inclinado con mancuernas
- `ROW_ISOPAUSE` — Remo con pausa isométrica


---

### Mini-ejemplo (esqueleto)

```json
{
  "meta": {
    "image": "https://…",
    "level": "intermedio",
    "goal": "pérdida de grasa + fuerza",
    "equipment": ["mancuernas","banda","colchoneta"],
    "muscles": ["piernas","glúteos","espalda","pecho","hombro","core"],
    "avg_minutes": 50,
    "doc_links": [],
    "description": "L-V, 12 semanas con progresión y deloads; cardio opcional en tardes."
  },
  "weeks": [ {
    "number": 1,
    "days": [ {
      "dayNum": 1,
      "label": "Lunes",
      "focus": "Full body A",
      "exercises": [
        { "id": "WU_MARCH", "sets": 1, "type": "time", "seconds": 60, "block": "warmup" },
        { "id": "HIP_HINGE", "sets": 2, "type": "reps", "reps": 12, "block": "warmup" },
        { "id": "SQ_BOX_GOBLET", "sets": 3, "type": "reps", "reps": 12, "rest": 75, "intensity": "moderate", "block": "main" },
        { "id": "PRESS_DB_BENCH", "sets": 3, "type": "reps", "reps": 12, "rest": 75, "block": "main" },
        { "id": "ROW_DB_BENT", "sets": 3, "type": "reps", "reps": 12, "rest": 60, "block": "main" },
        { "id": "PLANK_FRONT", "sets": 3, "type": "time", "seconds": 40, "rest": 30, "block": "main" },
        { "id": "ST_HIPFLEX", "sets": 1, "type": "time", "seconds": 30, "block": "stretch" }
      ]
    } ]
  } ]
}
```

---

**Consejo**: si tienes dudas con algún patrón o no encuentras un ID concreto, dime el **patrón** y te propongo alternativas del catálogo automáticamente.