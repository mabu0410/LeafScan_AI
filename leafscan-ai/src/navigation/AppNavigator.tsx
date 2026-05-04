import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ScanScreen from '../screens/ScanScreen';
import ResultScreen from '../screens/ResultScreen';
import DiseaseDetailScreen from '../screens/DiseaseDetailScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import AddPlantScreen from '../screens/AddPlantScreen';
import EditPlantScreen from '../screens/EditPlantScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const isFirstLaunch = useAuthStore(state => state.isFirstLaunch);
    const isLoggedIn = useAuthStore(state => state.isLoggedIn);
    const refreshProfile = useAuthStore(state => state.refreshProfile);

    React.useEffect(() => {
        if (isLoggedIn) {
            refreshProfile().catch(() => undefined);
        }
    }, [isLoggedIn, refreshProfile]);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isLoggedIn ? (
                    <>
                        {isFirstLaunch && (
                            <Stack.Screen name="Splash" component={SplashScreen} />
                        )}
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
                        <Stack.Screen name="Scan" component={ScanScreen} />
                        <Stack.Screen name="Result" component={ResultScreen} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                        <Stack.Screen name="DiseaseDetail" component={DiseaseDetailScreen} />
                        <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
                        <Stack.Screen name="AddPlant" component={AddPlantScreen} />
                        <Stack.Screen name="EditPlant" component={EditPlantScreen} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                        <Stack.Screen name="Search" component={SearchScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
