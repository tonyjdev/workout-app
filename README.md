# 🏋️ Workout App (Vue + Bootstrap + Capacitor)

Aplicación móvil para entrenamientos en casa, desarrollada con **Vue 3**, **Bootstrap 5** y **Capacitor**.
El proyecto está optimizado para ejecutarse tanto en navegador (modo desarrollo) como en dispositivos Android/iOS mediante Capacitor.

---

## 📦 Tecnologías principales

- [Vue 3](https://vuejs.org/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Capacitor](https://capacitorjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)

---

## ⚙️ Requisitos previos

Asegúrate de tener instalado:

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Android Studio** (para compilar en Android)
- *(Opcional macOS)* Xcode (para compilar en iOS)

---

## 🚀 Puesta en marcha del proyecto

### Instalar dependencias
```bash
npm install
```

### Ejecutar en navegador (modo desarrollo)
```bash
npm run dev
```
> Abre [http://localhost:5173](http://localhost:5173)

---

## 📱 Compilación con Capacitor

### 1. Compilar la app web
```bash
npm run build
```
Esto genera la carpeta `dist/`, que contiene la versión lista para empaquetar.

### 2. Sincronizar con Capacitor
```bash
npx cap sync android
```

### 3. Abrir en Android Studio
```bash
npx cap open android
```

> ⚡ Nota: si solo modificas código web (HTML/JS/CSS) y no añades plugins nuevos, puedes usar:
> ```bash
> npx cap copy android
> ```

### 4. Ejecutar directamente desde CLI
```bash
npx cap run android
```

### 5. Modo live reload (opcional)
Para probar cambios instantáneamente desde tu red local:
```bash
npx cap run android -l --external
```
Y en `capacitor.config.json` añade:
```json
"server": {
  "url": "http://TU_IP_LOCAL:5173",
  "cleartext": true
}
```

---

## 🧱 Estructura básica del proyecto

```
src/
 ├─ assets/          → Imágenes, iconos y recursos estáticos
 ├─ components/      → Componentes reutilizables (BaseButton, BaseModal, etc.)
 ├─ views/           → Pantallas principales (Playground, Home, etc.)
 ├─ router/          → Configuración de rutas
 ├─ store/           → Estado global (Pinia)
 └─ main.ts          → Punto de entrada principal

capacitor.config.json  → Configuración de Capacitor
android/               → Proyecto nativo Android
dist/                  → Build web generado por Vite
```

---

## 🔌 Plugins recomendados

| Plugin | Descripción | Instalación |
|--------|--------------|--------------|
| **@capacitor/status-bar** | Control de la barra superior | `npm i @capacitor/status-bar && npx cap sync` |
| **@capacitor/local-notifications** | Notificaciones locales | `npm i @capacitor/local-notifications && npx cap sync` |
| **@capacitor-community/keep-awake** | Mantener pantalla encendida | `npm i @capacitor-community/keep-awake && npx cap sync` |
| **@hugotomazi/capacitor-navigation-bar** | Ocultar barra inferior (Android) | `npm i @hugotomazi/capacitor-navigation-bar && npx cap sync` |

---

## 🧩 Comandos útiles

| Acción | Comando |
|--------|----------|
| Ejecutar en navegador | `npm run dev` |
| Compilar versión web | `npm run build` |
| Sincronizar con Capacitor | `npx cap sync android` |
| Copiar archivos web al proyecto nativo | `npx cap copy android` |
| Abrir Android Studio | `npx cap open android` |
| Ejecutar en dispositivo | `npx cap run android` |
| Modo Live Reload | `npx cap run android -l --external` |

---

## 🧰 Configuración recomendada para PhpStorm / VSCode

1. **Plugins sugeridos**
  - Vue.js
  - ESLint
  - Prettier
  - (Opcional) Tailwind CSS o Bootstrap 5 snippets

2. **Configuración de ejecución**
  - *Command:* `npm`
  - *Arguments:* `run dev`
  - *Browser:* Chrome (para depuración)

3. **Depuración Android**
  - Usa `chrome://inspect` para inspeccionar la WebView cuando ejecutes la app con live reload.

---

## 🧪 Build de producción

1. Compila la versión final:
   ```bash
   npm run build
   ```
2. Sincroniza los assets con Capacitor:
   ```bash
   npx cap sync android
   ```
3. Abre Android Studio y genera el APK:
   ```bash
   npx cap open android
   ```
  - En Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**

---

# 🚀 Guía de versionado y publicación

A continuación se explica cómo actualizar la versión de la aplicación, sincronizar la versión en Android y generar los commits/tags correspondientes.

---

## 🧩 Flujo general

El versionado sigue las reglas **SemVer** (`major.minor.patch`) y se gestiona con los comandos:

| Tipo de cambio | Comando | Genera tag | Ejemplo resultante |
|----------------|----------|-------------|---------------------|
| **Patch** (corrección menor) | `npm run release:patch` | ❌ No | `1.0.0 → 1.0.1` |
| **Minor** (nueva funcionalidad compatible) | `npm run release:minor` | ✅ Sí | `1.0.1 → 1.1.0` |
| **Major** (cambios incompatibles) | `npm run release:major` | ✅ Sí | `1.1.0 → 2.0.0` |

---

## ⚙️ Qué hace cada comando

### `npm run release:patch`
1. Verifica que el repositorio esté **limpio** (`git status` sin cambios pendientes).
2. Incrementa la versión **en `package.json`** (`npm version patch --no-git-tag-version`).
3. Ejecuta el hook `version`:
  - Sincroniza versión Android (`versionName` y `versionCode`).
  - Ejecuta `npm capacitor sync android`.
  - Añade los cambios al commit (`git add -A`).
4. Realiza un **commit automático**:
   ```
   chore(release): vX.Y.Z
   ```

> No se crea tag. Se usa para correcciones o cambios internos menores.

---

### `npm run release:minor` y `npm run release:major`
1. Verifican que el repositorio esté limpio.
2. Incrementan la versión (`npm version minor|major`).
3. Ejecutan el hook `version` (igual que en patch).
4. **npm crea automáticamente:**
  - Commit: `vX.Y.Z`
  - Tag git: `vX.Y.Z`

> Usa estos comandos cuando publiques una versión significativa o un cambio de funcionalidad importante.

---

## 🔢 Sincronización con Android

Durante el proceso:
- Se actualiza automáticamente el `versionName` y `versionCode` en
  `android/app/build.gradle` o `build.gradle.kts`.
- El código de versión (`versionCode`) se calcula como:
  ```
  major * 10000 + minor * 100 + patch
  ```
  Ejemplo: `1.2.3 → versionCode = 10203`.

---

## 🧼 Requisitos antes de versionar

- Todos los cambios deben estar **commiteados**:
  ```bash
  git add -A && git commit -m "chore: cambios previos"
  ```
- No debe haber archivos sin seguimiento ni modificados.
- Ejecutar los comandos desde la raíz del proyecto.

Si aparece el mensaje:
```
✖ Git working directory not clean.
```
Haz commit o stash antes de lanzar el comando.

---

## 🏁 Publicación final (Android)

1. Genera la nueva versión con uno de los comandos anteriores.
2. Abre el proyecto en Android Studio:
   ```bash
   npm capacitor open android
   ```
3. En Android Studio:
   **Build → Build Bundle(s)/APK(s) → Build APK(s)**
   (o genera un **AAB** si lo vas a subir a Play Store).
4. Prueba la app en un dispositivo real antes de publicar.

---

## 🏷️ Subir cambios a Git

Después de crear una versión:
```bash
git push
git push --tags
```
Esto sube tanto el commit como el tag (si lo hubiera).

---

## ✅ Resumen rápido

| Acción | Comando                        |
|--------|--------------------------------|
| Actualizar versión patch | `npm run release:patch`        |
| Actualizar versión minor | `npm run release:minor`        |
| Actualizar versión major | `npm run release:major`        |
| Sincronizar manualmente versión Android | `npm run sync:android-version` |
| Abrir proyecto Android Studio | `npm capacitor open android`   |

---

> 🧠 Consejo: al mantener este flujo, la versión mostrada en la app y la del `package.json` siempre estarán sincronizadas automáticamente, evitando errores al subir builds a Play Store.

---

## 🧾 Licencia

Proyecto propiedad de **TonyJDev**.
Uso interno y experimental — 2025.

---

## 📚 Enlaces de referencia

- [Documentación Vue 3](https://vuejs.org/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Guía Vite + Vue](https://vitejs.dev/guide/)
