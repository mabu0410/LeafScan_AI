import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';

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
import HistoryScreen from '../screens/HistoryScreen';
import UpgradePlanScreen from '../screens/UpgradePlanScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import PartnerStoreScreen from '../screens/PartnerStoreScreen';
import PartnerProductDetailScreen from '../screens/PartnerProductDetailScreen';
import PartnerChannelScreen from '../screens/PartnerChannelScreen';
import AdminModerationScreen from '../screens/AdminModerationScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const isLoggedIn = useAuthStore(state => state.isLoggedIn);
    const userRole = useAuthStore(state => state.user?.role);
    const refreshProfile = useAuthStore(state => state.refreshProfile);
    const isPartner = userRole === 'partner' || userRole === 'dealer';

    React.useEffect(() => {
        if (isLoggedIn) {
            refreshProfile().catch(() => undefined);
        }
    }, [isLoggedIn, refreshProfile]);

    return (
        <NavigationContainer>
            <Stack.Navigator
                key={isLoggedIn ? `app-${isPartner ? 'partner' : 'farmer'}` : 'auth'}
                initialRouteName={!isLoggedIn ? 'Onboarding' : isPartner ? 'PartnerChannel' : 'MainTabs'}
                screenOptions={{ headerShown: false }}
            >
                {!isLoggedIn ? (
                    <>
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
                        <Stack.Screen name="History" component={HistoryScreen} />
                        <Stack.Screen name="UpgradePlan" component={UpgradePlanScreen} />
                        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
                        <Stack.Screen name="PartnerStore" component={PartnerStoreScreen} />
                        <Stack.Screen name="PartnerProductDetail" component={PartnerProductDetailScreen} />
                        <Stack.Screen name="PartnerChannel" component={PartnerChannelScreen} />
                        <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
                        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
