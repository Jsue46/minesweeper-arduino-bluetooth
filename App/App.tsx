import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/Pantallas/Inicio';
import GameScreen from './src/Pantallas/Juego';
import Informacion from './src/Pantallas/Informacion';

const Stack = createNativeStackNavigator();

// 🖤 Tema personalizado para NavigationContainer (fondo oscuro)
const MyDarkTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#121212',
    card: '#1f1f1f',
    text: '#ffffff',
    border: '#272727',
    primary: '#ffffff',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={MyDarkTheme}>
      <Stack.Navigator
        initialRouteName="Inicio"
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1f1f1f', // fondo del header
          },
          headerTintColor: '#ffffff', // color del texto y flecha del header
          headerTitleStyle: {
            fontWeight: 'bold',
            fontFamily: 'sans-serif-condensed',
            fontSize: 20,
          },
          contentStyle: {
            backgroundColor: '#121212', // fondo de las pantallas
          },
        }}
      >
        <Stack.Screen name="Inicio" component={HomeScreen} options={{ title: 'Menú Principal' }} />
        <Stack.Screen name="Jugar" component={GameScreen} options={{ title: 'Buscaminas' }} />
        <Stack.Screen name="Información" component={Informacion} options={{ title: 'Información' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
