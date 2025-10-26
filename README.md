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

## 🧾 Licencia

Proyecto propiedad de **TonyJDev**.  
Uso interno y experimental — 2025.

---

## 📚 Enlaces de referencia

- [Documentación Ionic + Vue](https://ionicframework.com/docs/vue/overview)
- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Plantillas Ionic CLI](https://ionicframework.com/docs/cli/commands/start)
