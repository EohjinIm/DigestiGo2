import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatUI from './Screens/ChatUI';
import Tracker from './Screens/Tracker';
import Report from './Screens/Report';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="Chat" component={ChatUI} screenOptions={{
                    headerShown: false,
                }}/>
                <Stack.Screen name="Tracker" component={Tracker} />
                <Stack.Screen name="Report" component={Report} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}