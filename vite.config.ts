import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    vue(),
    legacy(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './', /* ... */
  server: {
    host: true, // Permite acceso desde red local (importante para Capacitor)
    port: 5173, // Puerto por defecto de Vite
    strictPort: false, // Si el puerto está ocupado, usa otro
    open: false, // No abre el navegador automáticamente
    hmr: {
      overlay: true, // Muestra errores en pantalla
    },
    watch: {
      // Mejora la detección de cambios en archivos
      usePolling: false, // Cambia a `true` si tienes problemas en Windows
      interval: 100,
    },
  },
})
