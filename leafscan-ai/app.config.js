const appJson = require('./app.json');

const DEFAULT_EAS_PROJECT_ID = '7e273065-e019-40c2-87f6-6f4cd5e4f5b8';
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || DEFAULT_EAS_PROJECT_ID;

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra || {}),
    eas: {
      ...((appJson.expo.extra && appJson.expo.extra.eas) || {}),
      ...(projectId ? { projectId } : {}),
    },
  },
});
