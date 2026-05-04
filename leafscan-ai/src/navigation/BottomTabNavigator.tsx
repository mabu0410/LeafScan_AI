import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList } from '../types';
import { theme } from '../theme/theme';
import { BottomNavigation, BottomTabIcon } from '../components/home/BottomNavigation';

import HomeScreen from '../screens/HomeScreen';
import MyGardenScreen from '../screens/MyGardenScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: theme.colors.tabActive,
                tabBarInactiveTintColor: theme.colors.tabInactive,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Garden') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'ScanTab') {
                        iconName = 'camera';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'time' : 'time-outline';
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
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
            <Tab.Screen name="Garden" component={MyGardenScreen} options={{ tabBarLabel: 'Vườn' }} />
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
            <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'Lịch sử' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 80,
        backgroundColor: theme.colors.tabBg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: 20,
        paddingTop: 8,
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
});
