// Assina o APK/AAB de produção com a chave do Ministre (fora do Git).
// Lê C:\Android\keys\ministre-keystore.properties (ou o caminho em MINISTRE_SIGNING).
// Sem esse arquivo, o build continua com a chave de teste (debug) do Expo.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// ministre-release-signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(MARK)) return cfg;

    const props = `
${MARK}
def ministreSigning = new Properties()
def ministreSigningFile = file(System.getenv('MINISTRE_SIGNING') ?: 'C:/Android/keys/ministre-keystore.properties')
if (ministreSigningFile.exists()) { ministreSigningFile.withInputStream { ministreSigning.load(it) } }
`;
    g = g.replace(/^android\s*\{/m, (m) => `${props}\n${m}`);

    g = g.replace(/signingConfigs\s*\{/, (m) => `${m}
        release {
            if (ministreSigning['MINISTRE_KEYSTORE']) {
                storeFile file(ministreSigning['MINISTRE_KEYSTORE'])
                storePassword ministreSigning['MINISTRE_KEYSTORE_PASSWORD']
                keyAlias ministreSigning['MINISTRE_KEY_ALIAS']
                keyPassword ministreSigning['MINISTRE_KEYSTORE_PASSWORD']
            }
        }`);

    // Só o bloco "release" de buildTypes troca a chave de teste pela do Ministre.
    g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, `$1signingConfig ministreSigning['MINISTRE_KEYSTORE'] ? signingConfigs.release : signingConfigs.debug`);

    cfg.modResults.contents = g;
    return cfg;
  });
};
