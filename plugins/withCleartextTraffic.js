const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
}

module.exports = withCleartextTraffic;
