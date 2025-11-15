const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../capacitor.config.json');
const config = require(configPath);

const isDev = process.argv[2] === 'dev';

if (isDev) {
  config.server = {
    url: 'http://localhost:5173',
    cleartext: true
  };
  config.appName = 'Workout App (Dev)';
  console.log('✅ Configuración de desarrollo activada');
} else {
  delete config.server;
  config.appName = 'Workout App';
  console.log('✅ Configuración de producción activada');
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
