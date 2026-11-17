// Usa o app.json e só acrescenta o que depende de arquivo local.
// google-services.json (Firebase) liga os avisos no Android; sem ele o app funciona, só sem avisos.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  return {
    ...config,
    android: {
      ...config.android,
      ...(fs.existsSync(googleServices) ? { googleServicesFile: './google-services.json' } : {}),
    },
  };
};
