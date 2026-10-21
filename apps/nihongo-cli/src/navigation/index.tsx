import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import VocabScreen from '../screens/VocabScreen';
import ReviewScreen from '../screens/ReviewScreen';
import LoginScreen from '../screens/LoginScreen';
import PremiumScreen from '../screens/PremiumScreen';
import type {RootStackParamList, MainTabParamList} from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {borderTopColor: '#e5e7eb'},
        headerStyle: {backgroundColor: '#dc2626'},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '700'},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Vocab"
        component={VocabScreen}
        options={{
          title: 'Từ vựng',
          tabBarLabel: 'Từ vựng',
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          title: 'Ôn tập SRS',
          tabBarLabel: 'Ôn tập',
          tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>🔁</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Đăng nhập',
            headerStyle: {backgroundColor: '#dc2626'},
            headerTintColor: '#fff',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{
            title: 'Nâng cấp Premium',
            headerStyle: {backgroundColor: '#dc2626'},
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
