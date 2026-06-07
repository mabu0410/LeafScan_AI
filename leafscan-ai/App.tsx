import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useSettingsStore } from './src/stores/settingsStore';
import { useAuthStore } from './src/stores/authStore';
import { usePushNotificationSync } from './src/services/notifications';
import './src/i18n';
import { useI18nSync } from './src/i18n/useI18nSync';

function AppContent() {
    const darkMode = useSettingsStore(state => state.darkMode);
    const notificationsEnabled = useSettingsStore(state => state.notifications);
    const accessToken = useAuthStore(state => state.accessToken);
    useI18nSync();
    usePushNotificationSync(accessToken, notificationsEnabled);
    return (
        <View style={styles.appRoot}>
            <StatusBar hidden animated style={darkMode ? 'light' : 'dark'} />
            <AppNavigator />
            <View
                pointerEvents="none"
                style={[
                    styles.topLeftStatusMask,
                    { backgroundColor: darkMode ? '#0F1411' : '#FFFDF8' },
                ]}
            />
        </View>
    );
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    appRoot: {
        flex: 1,
    },
    topLeftStatusMask: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 54,
        height: 42,
        zIndex: 9999,
        elevation: 9999,
    },
});
