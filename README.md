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

## 🧾 Licencia

Proyecto propiedad de **TonyJDev**.
Uso interno y experimental — 2025.

---

## 📚 Enlaces de referencia

- [Documentación Vue 3](https://vuejs.org/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Guía Vite + Vue](https://vitejs.dev/guide/)
