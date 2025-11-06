# Ciclo de scripts de desarrollo

## 1. Entorno de desarrollo
- `npm run dev`: levanta Vite con hot reload para trabajar la aplicacion en modo navegador.
- `npm run cap:dev`: sincroniza Capacitor en modo `dev`, copia los artefactos web al proyecto nativo y abre Android Studio para depuracion en emulador o dispositivo.

## 2. Compilacion y verificacion de fallos
- `npm run lint`: ejecuta ESLint sobre todo el codigo para detectar problemas de estilo y errores frecuentes.
- `npm run test:unit`: lanza la suite de Vitest para asegurar la validez de los componentes y stores.
- `npm run test:e2e`: corre Cypress en modo headless para validar los flujos criticos de extremo a extremo.
- `npm run build`: realiza una compilacion de Vite (apoyada por `vue-tsc`) que expone errores de tipado y fallos de bundling.

## 3. Compilacion para pruebas en Android
- `npm run android:dev`: configura variables de entorno en modo `dev`, sincroniza los recursos web con el proyecto nativo y abre Android Studio con la build lista para instalar en dispositivos de prueba.

## 4. Versionado semantico
- `npm run release:patch`: incrementa la version de `package.json` en el tercer digito, sincroniza la version Android y ejecuta `cap sync`.
- `npm run release:minor`: incrementa la version en el segundo digito, sincroniza Android y sincroniza Capacitor.
- `npm run release:major`: incrementa el primer digito de version y alinea la configuracion de Android.
- `npm run tag:current`: genera el tag anotado `vX.Y.Z` segun la version actual si aun no existe.

> Revisa el changelog y confirma el commit generado por `release:*`. Si solo necesitas etiquetar la version actual sin cambiar la base, ejecuta `npm run tag:current` antes de continuar.

## 5. Generar y subir build para Android
- `npm run android`: automatiza el ciclo de version de build (`build-info.json`), actualiza `.env`, sincroniza Capacitor, hace commit y tag, y abre Android Studio para generar y subir el artefacto a la Play Console.

## 6. Compilacion para produccion web
- `npm run build`: genera la build optimizada para el deploy web.
- `npm run preview`: sirve la build optimizada localmente para una verificacion rapida antes del despliegue definitivo.
