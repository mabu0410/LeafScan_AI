import 'react-native-gesture-handler';
import React from 'react';
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
        <>
            <StatusBar hidden animated style={darkMode ? 'light' : 'dark'} />
            <AppNavigator />
        </>
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
