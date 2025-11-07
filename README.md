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

# Guia de versionado y publicacion

A continuacion se describe el flujo para cambiar la version de la aplicacion, mantener sincronizado el proyecto Android y preparar builds listas para distribuir.

---

## Scripts definidos en package.json

Estas tablas resumen cada script disponible y su proposito principal.

### Basicos

| Script | Que hace | Notas |
|--------|----------|-------|
| `npm run dev` | Arranca Vite en modo desarrollo con recarga rapida. | Expone la app en http://localhost:5173. |
| `npm run build` | Valida los tipos con `vue-tsc` y genera la build de produccion con Vite. | Falla si hay errores de TypeScript. |
| `npm run preview` | Sirve la carpeta `dist` con Vite para revisar una build local. | Util para comprobar la salida antes de publicarla. |
| `npm run lint` | Ejecuta ESLint sobre todo el proyecto. | Usa la configuracion definida en `.eslintrc`. |
| `npm run test:unit` | Ejecuta la suite de Vitest. | Corre en un entorno jsdom. |
| `npm run test:e2e` | Lanza los tests end-to-end de Cypress. | Necesita los binarios de Cypress instalados. |

### Version y sincronizacion Android

| Script | Que hace | Notas |
|--------|----------|-------|
| `npm run sync:android-version` | Lee `package.json` y `build-info.json`, calcula `versionName` y `versionCode` y actualiza `android/app/build.gradle(.kts)`. | `versionName` se define como `base.build` y `versionCode` usa `major*1_000_000 + minor*10_000 + patch*100 + build`. |
| `npm run release:patch` | Ejecuta `npm version patch`, reinicia `build-info.json`, sincroniza Android y corre `npx capacitor sync android`. | Requiere el repositorio limpio; genera el tag `vX.Y.Z`. |
| `npm run release:minor` | Igual que el anterior pero incrementa el segmento `minor`. | Usa cuando agregues funcionalidades compatibles. |
| `npm run release:major` | Igual que el anterior pero incrementa el segmento `major`. | Usa ante cambios incompatibles. |
| `npm run reset:build-info` | Actualiza `build-info.json` con la version SemVer actual y reinicia el contador en 0. | Lo invocan automaticamente los scripts `release:*`. |
| `npm run tag:current` | Crea un tag anotado `vX.Y.Z` segun la version de `package.json`. | No hace push; ejecuta `git push --tags` si necesitas publicarlo. |
| `npm run android` | Ejecuta `scripts/android-release.mjs`: valida que Git este limpio, incrementa `build-info.json`, actualiza `VITE_APP_VERSION`, sincroniza Android, genera la build web, corre `npx cap sync android`, crea un commit `chore: android build vX.Y.Z`, hace push y abre Android Studio. | Automatiza el build incremental para publicar en Play Store. |

### Configuracion de entorno Android

| Script | Que hace | Notas |
|--------|----------|-------|
| `npm run cap:dev` | Ajusta `capacitor.config.json` a modo dev (`http://localhost:5173`), copia los assets con `cap copy` y abre Android Studio. | Facilita probar con live reload. |
| `npm run cap:build` | Configura modo produccion, ejecuta `npm run build`, `cap copy`, `cap sync` y abre Android Studio. | Util para revisar una build nativa sin automatizar versionado. |
| `npm run android:dev` | Alias de `npm run cap:dev`. | Se mantiene por compatibilidad con flujos anteriores. |
| `npm run android:build` | Alias de `npm run cap:build`. | Igual que el anterior pero con prefijo Android. |

---

## Sincronizacion con Android

- `npm run sync:android-version` localiza `android/app/build.gradle` o `build.gradle.kts` y actualiza `versionName` y `versionCode` si ya existen o los inserta dentro de `defaultConfig`.
- El archivo `build-info.json` guarda la version base (`base`) y el contador `build`. `npm run release:*` reinicia el build en 0 cuando cambia la version base. Si la version base no cambia, `npm run android` incrementa `build`; en caso contrario lo reinicia en 1.
- `npm run android` genera `versionName = <version-base>.<build>` y `versionCode = major*1_000_000 + minor*10_000 + patch*100 + build` y deja constancia en `.env` mediante `VITE_APP_VERSION`.

---

## Requisitos antes de versionar

- Asegurate de que el repositorio este sin cambios pendientes; los scripts abortan si `git status` muestra archivos modificados.
- Configura el remoto `origin` y tus credenciales de Git: `npm run android` realiza `git push` y `git push --tags` automaticamente.
- Ejecuta los comandos desde la raiz del proyecto con el SDK de Android instalado (Android Studio y herramientas de linea de comandos).

---

## Publicacion final (Android)

1. Ejecuta `npm run release:<tipo>` (`patch`, `minor` o `major`) si necesitas incrementar la version base SemVer.
2. Lanza `npm run android` para incrementar el numero de build, generar la build web, sincronizar Capacitor y abrir el proyecto en Android Studio.
3. En Android Studio ve a **Build > Build Bundle(s)/APK(s) > Build APK(s)** (o genera un AAB) y prueba la app en un dispositivo real antes de publicar.

---

## Subir cambios a Git

- Los comandos `npm run release:*` crean automaticamente un commit `vX.Y.Z` y el tag correspondiente.
- `npm run tag:current` genera el tag anotado `vX.Y.Z` segun la version actual si aun no existe.
- `npm run android` empaqueta los cambios, crea un commit `chore: android build vX.Y.Z` y ejecuta `git push` junto con `git push --tags`. Revisa `git status` por si necesitas repetir el comando tras algun fallo.

---

## Resumen rapido

| Accion | Comando |
|--------|---------|
| Incrementar la version base (patch/minor/major) | `npm run release:<tipo>` |
| Crear un tag anotado para la version actual | `npm run tag:current` |
| Reiniciar el contador de build tras cambiar SemVer | `npm run reset:build-info` |
| Sincronizar manualmente versionName/versionCode | `npm run sync:android-version` |
| Generar un build Android con numero incremental | `npm run android` |
| Abrir Android Studio apuntando al servidor local | `npm run cap:dev` |
| Preparar Android Studio con build de produccion | `npm run cap:build` |

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
