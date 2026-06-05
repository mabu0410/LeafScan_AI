import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomTabParamList } from '../types';
import { theme } from '../theme/theme';
import { BottomNavigation, BottomTabIcon } from '../components/home/BottomNavigation';

import HomeScreen from '../screens/HomeScreen';
import MyGardenScreen from '../screens/MyGardenScreen';
import ScanScreen from '../screens/ScanScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: route.name === 'ScanTab' ? styles.hiddenTabBar : styles.tabBar,
                tabBarActiveTintColor: theme.colors.tabActive,
                tabBarInactiveTintColor: theme.colors.tabInactive,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarItemStyle: styles.tabItem,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Garden') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'ScanTab') {
                        iconName = 'camera';
                    } else if (route.name === 'MarketplaceTab') {
                        iconName = focused ? 'storefront' : 'storefront-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return (
                        <BottomTabIcon
                            focused={focused}
                            iconName={iconName}
                            size={size}
                            color={color}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
            <Tab.Screen name="Garden" component={MyGardenScreen} options={{ tabBarLabel: t('tabs.garden') }} />
            <Tab.Screen
                name="ScanTab"
                component={ScanScreen}
                options={{
                    tabBarLabel: () => null,
                    tabBarButton: (props) => (
                        <BottomNavigation onPress={() => props.onPress?.(undefined as any)} />
                    ),
                }}
            />
            <Tab.Screen name="MarketplaceTab" component={MarketplaceScreen} options={{ tabBarLabel: t('tabs.marketplace') }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabs.profile') }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    hiddenTabBar: {
        display: 'none',
    },
    tabBar: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 10,
        height: 78,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: 'rgba(213, 221, 216, 0.92)',
        paddingBottom: 10,
        paddingTop: 10,
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 12,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    tabItem: {
        paddingTop: 2,
    },
});
