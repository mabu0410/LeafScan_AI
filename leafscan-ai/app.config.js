const appJson = require('./app.json');

const DEFAULT_EAS_PROJECT_ID = '7e273065-e019-40c2-87f6-6f4cd5e4f5b8';
const GOOGLE_SIGN_IN_PLUGIN = '@react-native-google-signin/google-signin';
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || DEFAULT_EAS_PROJECT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const googleIosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
  (googleIosClientId.endsWith('.apps.googleusercontent.com')
    ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
    : '');

function getPluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function withGoogleSignInPlugin(plugins = []) {
  if (plugins.some(plugin => getPluginName(plugin) === GOOGLE_SIGN_IN_PLUGIN)) {
    return plugins;
  }

  if (!googleIosUrlScheme) {
    return plugins;
  }

  return [
    ...plugins,
    [
      GOOGLE_SIGN_IN_PLUGIN,
      {
        iosUrlScheme: googleIosUrlScheme,
      },
    ],
  ];
}

module.exports = ({ config }) => {
  const expoConfig = {
    ...config,
    ...appJson.expo,
  };

  return {
    ...expoConfig,
    plugins: withGoogleSignInPlugin(expoConfig.plugins),
    extra: {
      ...(appJson.expo.extra || {}),
      eas: {
        ...((appJson.expo.extra && appJson.expo.extra.eas) || {}),
        ...(projectId ? { projectId } : {}),
      },
    },
  };
};
