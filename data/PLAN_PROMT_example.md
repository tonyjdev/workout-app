# Plantilla de prompt — Generador de planes (Workout App)

Usa esta plantilla para pedirme un `plan.json` **100% compatible** con tu app. Solo tendrás que copiarla, rellenar los huecos y enviármela en un mensaje.
Además del PROMT, adjuntar tanto el archivo `plan.json` actual como el archivo `exercises.json` (con todos los ejercicios).

---

## 1) Datos de usuario y objetivo

- **Objetivo principal**: perder grasa abdominal (lo más importante), ganar fuerza/músculo, mejorar movilidad.
- **Nivel / experiencia**: avanzado
- **Limitaciones / lesiones**: algunas molestias en las vértebras lumbares debido a una microfisura
- **Disponibilidad semanal**: de lunes a viernes
- **Duración por día**: 45 min
- **Semanas totales**: 12
- **Material disponible**: mancuernas, bandas elásticas, colchoneta, banco, barra de dominadas 
- **Preferencias**: ninguna

## 2) Estructura de cada sesión (bloques)

1. **Calentamiento** (8–10 min) — movilidad ligera, activación.
2. **Entrenamiento principal** (32–40 min) — básicos + accesorios por patrones (bisagra, sentadilla, empujes/ tracciones, core).
3. **Estiramientos** (5–8 min) — movilidad dirigida.

> En el JSON, cada ejercicio llevará (como mínimo): `id`, `sets`, `type` (`"reps"` o `"time"`), y **`reps` o `seconds`**. Opcionales soportados por la app: `rest` (entre series), `rest_next` (entre ejercicios), `intensity`. También puedo incluir `rir`, `rpe`, `tempo`, `superset_id`, `block` (`warmup|main|stretch`) aunque tu app los ignora a nivel de cálculo.

## 3) Progresión e intensidad

- **Modelo**: 3 mesociclos + deloads (1–3 base, 4 deload, 5–7 progreso, 8 deload, 9–11 intensificación, 12 deload)_.
- **Básicos**: reducir repeticiones a lo largo de los mesociclos (12→10→8) y/o aumentar series en semanas de progreso.
- **Accesorios**: mantener 10–12 reps, 2–4 series según semana.
- **Aumento de carga**: subir peso si en la última serie el RIR ≥ 3 o el RPE ≤ 7.5.
- **Descansos sugeridos**: básicos 60–90s; accesorios 45–60s; core 30–45s.

## 4) Variaciones para evitar estancamiento

- **Frecuencia de cambio**: cada 4 semanas cambiar 1–2 accesorios por variantes del mismo patrón.
- **Regla**: mantener el patrón y el grupo muscular.

## 5) Cardio opcional (si aplica)

- natación 1–2 tardes/semana; no se incluye en JSON, solo se mencionará en `meta.description`.

**Consejo 1**: si tienes dudas con algún patrón o no encuentras un ID concreto, dime el **patrón** y te propongo alternativas del catálogo automáticamente.
**Consejo 2**: si tienes alguna duda sobre la estructura del plan o de los ejercicios, no dudes en preguntarme.
