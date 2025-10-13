# Workout App (Capacitor • Android)

Aplicación web empaquetada como **APK** para uso personal (sin tiendas).  
Stack: **HTML/CSS/JS (Bootstrap)** + **Capacitor** (Android). **Sin backend**.

---

## Requisitos

- **Windows 11**
- **Node.js** ≥ 18 y npm ≥ 9  
  > Comprueba con: `node -v` y `npm -v`
- **Android Studio** (SDK + Platform-Tools)  
  Descarga: https://developer.android.com/studio
- **Java** (incluido con Android Studio en la JDK embebida)
- **Dispositivo Android** con **Opciones de desarrollador** y **Depuración por USB** activadas (o emulador)

> Opcional: **ADB** en PATH para instalar el APK por consola (`adb devices`, `adb install ...`)

---

## 1) Clonar el proyecto

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
```

> Verifica que existen `package.json`, `capacitor.config.*`, carpeta `android/` y la carpeta de estáticos `dist/` (o el script que la genera).

---

## 2) Instalar dependencias

```bash
npm install
```

Si el registro npm hubiera sido cambiado por otra herramienta, restáuralo:
```bash
npm config set registry https://registry.npmjs.org/
```

---

## 3) Desarrollo en navegador (opcional)

- Abre `index.html` (o ejecuta tu servidor local tipo `npm run dev` si existe).
- Si usas **imports ES** en `app.js`, carga el script como **módulo**:

```html
<script type="module" src="app.js"></script>
```

> El proyecto está preparado para que en navegador los plugins de Capacitor hagan *no-op* (no fallan) y en APK carguen los reales.

---

## 4) Build web (archivos estáticos)

Genera el contenido web a **`dist/`**.  
Si no tienes un bundler, asegúrate de copiar **index.html**, **JS/CSS**, imágenes y **JSON** (catálogo y plan) a `dist/`.

Ejemplos:
```bash
# si tienes un script de build
npm run build

# si no, crea dist/ y copia tus archivos estáticos allí
# (ajusta rutas relativas en index.html a ./app.js, ./app.css, etc.)
```

---

## 5) Sincronizar Capacitor (Android)

Instala plataformas y sincroniza:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
# si es la primera vez en esta máquina:
npx cap sync
# en cambios posteriores:
npx cap copy
```

Abrir Android Studio (dos opciones):

- **Recomendada**: abrir manualmente `android/` desde Android Studio (**Open > android**).
- O desde consola (requiere resolver la ruta de Android Studio en Windows):
  ```powershell
  # Si es necesario, especifica la ruta (ejemplo típico):
  setx CAPACITOR_ANDROID_STUDIO_PATH "C:\Program Files\Android\Android Studio\bin\studio64.exe"
  npx cap open android
  ```

En Android Studio, instala en **SDK Manager**:
- **Android SDK Platform** API 34/35
- **Android SDK Build-Tools**
- **Android SDK Platform-Tools**

---

## 6) Generar APK

### 6.1 APK de **debug** (rápido)
En Android Studio:
- **Build → Build APK(s)**  
  Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6.2 APK de **release (firmado)**

**Opción A (asistente Android Studio)**  
1. **Build → Generate Signed Bundle/APK…**  
2. Elige **APK** → **Next**  
3. **Key store**:  
   - **Create new…** si no tienes uno (guárdalo **fuera** del repo)  
   - Completa **Key alias** y contraseñas
4. **Signature versions**: marca **V1** y **V2**  
5. **Finish**

**Ruta de salida** (firmado):
```
android/app/build/outputs/apk/release/app-release.apk
```

> Si aparece `app-release-unsigned.apk`, no se instalará. Vuelve a firmar con el asistente o configura firma en Gradle.

**Opción B (CLI/Gradle)**  
Configura firma en `android/app/build.gradle(.kts)` con variables de entorno y ejecuta:
```bash
cd android
.\gradlew assembleRelease
```

---

## 7) Instalar el APK en el móvil

### A) Vía **ADB**
1. Conecta el móvil por USB (depuración activada):
   ```bash
   adb devices
   ```
   Debe aparecer tu dispositivo como `device`.
2. Instala:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
   (O el debug: `.../apk/debug/app-debug.apk`)

### B) Vía **copia manual**
- Copia el APK al teléfono y ábrelo desde el gestor de archivos.  
- En Android 13+, habilita **Instalar apps desconocidas** para el origen (Files/Chrome/etc.).

---

## 8) Versionado de la app

- Edita **`versionCode`** (entero, debe **subir siempre**) y **`versionName`** en:
  ```
  android/app/build.gradle(.kts)
  ```
- Cada release debe incrementar `versionCode` o Android rechazará la instalación sobre la versión anterior.

---

## 9) Configuración de icono y splash

En Android Studio:
- **App > res > mipmap-*/** → **Right click > New > Image Asset** para iconos.
- Splash: usa **Theme/SplashScreen** (Android 12+) o assets específicos según tu plantilla.

---

## 10) Plugins utilizados

- **Status bar**: `@capacitor/status-bar`
- **Mantener pantalla encendida**: `@capacitor-community/keep-awake`
- (Opcional) **Notificaciones locales**: `@capacitor/local-notifications`
- (Opcional) **Sistema de archivos/Compartir exportaciones**: `@capacitor/filesystem`, `@capacitor/share`

Instalar/sincronizar:
```bash
npm i @capacitor/status-bar @capacitor-community/keep-awake
# opcionales:
npm i @capacitor/local-notifications @capacitor/filesystem @capacitor/share
npx cap sync android
```

---

## 11) Flujo de “pantalla siempre encendida”

La app activa **KeepAwake** cuando se oculta el **menú inferior** (inicio de entreno) y lo desactiva cuando se vuelve a mostrar (fin/cancelación).  
Esto se gestiona en `setTrainingNavHidden()` y se fuerza en ciertos cambios de estado con `updateNavVisibility()`.

> En navegador, los plugins hacen *no-op*; en APK funcionan.

---

## 12) Estructura de proyecto (resumen)

```
root/
├─ dist/                     # build estático de la web (index.html, css/js, imágenes, JSON)
├─ android/                  # proyecto nativo Android (versionar)
├─ package.json
├─ capacitor.config.ts|json
└─ src/ (opcional)           # si usas bundler, aquí tu fuente
```

---

## 13) Troubleshooting

- **`npm ERR! 404 @capacitor/keep-awake`**  
  Usa el paquete correcto: `@capacitor-community/keep-awake`.

- **`npx cap open android`** no abre Android Studio  
  Define la ruta (ejemplo típico en Windows):
  ```powershell
  setx CAPACITOR_ANDROID_STUDIO_PATH "C:\Program Files\Android\Android Studio\bin\studio64.exe"
  ```

- **`import declarations may only appear at top level` en navegador**  
  Carga `app.js` con `<script type="module">` o usa imports dinámicos con *stubs* en modo web.

- **No se genera APK release firmado**  
  Usa el asistente **Generate Signed Bundle/APK** y guarda la **keystore** fuera del repo.

- **No instala sobre una versión previa**  
  Aumenta `versionCode`.

- **Pantalla se apaga durante entreno**  
  Revisa que el menú esté oculto (clase `nav-hidden`) y que `setTrainingNavHidden()` llame a `KeepAwake.keepAwake()`/`allowSleep()`.

---

## 14) Seguridad / Git

- **Versiona** `android/` completo **excepto** artefactos de build (`android/*/build/`, `.gradle/`, `.idea/`, etc.).  
- **No subas** la **keystore** (`.jks`) ni contraseñas.  
- `.gitignore` recomendado incluye: `node_modules/`, `dist/`, `android/.gradle/`, `android/.idea/`, `android/app/build/`, `*.jks`, etc.

---

## 15) Comandos útiles

```bash
# Sincronizar cambios web con Android
npx cap copy

# Sincronizar + actualizar plugins
npx cap sync android

# Abrir Android Studio
npx cap open android

# Generar APK de release por CLI (si la firma está configurada en Gradle)
cd android && .\gradlew assembleRelease

# Instalar por ADB
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 16) Contacto / Contribuir

1. Clona, crea rama, realiza cambios.
2. Asegúrate de poder **compilar APK** (debug) antes del PR.
3. No incluyas keystores ni datos sensibles en los commits.
