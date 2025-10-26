# 🏋️ Workout App (Ionic + Vue + Capacitor)

Aplicación móvil para entrenamientos en casa, desarrollada con **Vue 3**, **Ionic Framework** y **Capacitor**.
El proyecto está optimizado para ejecutarse tanto en navegador (modo desarrollo) como en dispositivos Android/iOS mediante Capacitor.

---

## 📦 Tecnologías principales

- [Vue 3](https://vuejs.org/)
- [Ionic Framework](https://ionicframework.com/)
- [Capacitor](https://capacitorjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)

---

## ⚙️ Requisitos previos

Asegúrate de tener instalado:

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Ionic CLI**
  ```bash
  npm install -g @ionic/cli
  ```
- **Android Studio** (para compilar en Android)
- *(Opcional macOS)* Xcode (para compilar en iOS)

---

## 🚀 Creación del proyecto (solo una vez)

```bash
ionic start workout-app tabs --type=vue
cd workout-app
```

> La plantilla `tabs` se usa como base. Puedes sustituirla por `blank` si prefieres un proyecto vacío.

---

## 🧑‍💻 Entorno de desarrollo

### Instalar dependencias
```bash
npm install
```

### Ejecutar en navegador
```bash
ionic serve
```
> Abre [http://localhost:8100](http://localhost:8100)

### Ejecutar en dispositivo físico (modo live reload)
```bash
ionic capacitor run android -l --external
```
> Asegúrate de tener el dispositivo conectado por USB y con la depuración habilitada.

---

## 🧱 Estructura básica

```
src/
 ├─ assets/          → Imágenes, iconos y recursos estáticos
 ├─ components/      → Componentes reutilizables
 ├─ views/           → Pantallas principales
 ├─ router/          → Configuración de rutas
 ├─ store/           → Estado global (opcional)
 └─ main.ts          → Punto de entrada principal

capacitor.config.ts  → Configuración Capacitor
android/             → Proyecto nativo Android
ios/                 → Proyecto nativo iOS (si se añade)
```

---

## 📱 Capacitor

### Añadir plataformas
```bash
ionic capacitor add android
# (Opcional en macOS)
ionic capacitor add ios
```

### Sincronizar cambios
Cada vez que modifiques dependencias o hagas `npm install`:
```bash
ionic build
ionic capacitor sync
```

### Abrir el proyecto nativo
```bash
ionic capacitor open android
# o
ionic capacitor open ios
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
| Servir en navegador | `ionic serve` |
| Compilar versión web | `ionic build` |
| Sincronizar cambios con nativo | `ionic capacitor sync` |
| Abrir proyecto Android | `ionic capacitor open android` |
| Ejecutar con live reload | `ionic capacitor run android -l --external` |

---

## 🧰 Configuración recomendada para PhpStorm

1. **Plugins**
   - Vue.js
   - ESLint
   - Prettier
   - (Opcional) Tailwind CSS

2. **Run Configurations**
   - *Command:* `ionic`
   - *Arguments:* `serve`
   - *Browser:* Chrome (para depuración)

3. **Depuración**
   - Usa `chrome://inspect` para inspeccionar la WebView cuando ejecutes la app en Android con live reload.

---

## 🧪 Build de producción

1. Compila la versión final:
   ```bash
   ionic build
   ```
2. Copia los assets al proyecto nativo:
   ```bash
   ionic capacitor sync
   ```
3. Abre Android Studio y genera el APK:
   ```bash
   ionic capacitor open android
   ```
   - Desde Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**

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
  - Ejecuta `ionic capacitor sync android`.
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
   ionic capacitor open android
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

| Acción | Comando |
|--------|----------|
| Actualizar versión patch | `npm run release:patch` |
| Actualizar versión minor | `npm run release:minor` |
| Actualizar versión major | `npm run release:major` |
| Sincronizar manualmente versión Android | `npm run sync:android-version` |
| Abrir proyecto Android Studio | `ionic capacitor open android` |

---

> 🧠 Consejo: al mantener este flujo, la versión mostrada en la app y la del `package.json` siempre estarán sincronizadas automáticamente, evitando errores al subir builds a Play Store.

---

## 🧾 Licencia

Proyecto propiedad de **TonyJDev**.
Uso interno y experimental — 2025.

---

## 📚 Enlaces de referencia

- [Documentación Ionic + Vue](https://ionicframework.com/docs/vue/overview)
- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Plantillas Ionic CLI](https://ionicframework.com/docs/cli/commands/start)
