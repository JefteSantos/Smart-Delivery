const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// EXCLUSÃO: Impede o Metro de tentar processar pastas de teste e arquivos .test. / .spec.
// Isso resolve o erro "Unable to resolve module console" causado pelo @testing-library sendo descoberto indevidamente.
config.resolver.blockList = [
  /.*\/__tests__\/.*/,
  /.*\.test\..*/,
  /.*\.spec\..*/
];

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
