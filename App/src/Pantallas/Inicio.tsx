import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import ExitApp from 'react-native-exit-app';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Inicio: undefined;
  Jugar: undefined;
  Información: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Inicio'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const handleExitApp = () => {
    Alert.alert(
      '¿Salir de la aplicación?',
      'Esta acción cerrará la aplicación completamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', onPress: () => ExitApp.exitApp() },
      ]
    );
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}> Buscaminas </Text>

      <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate('Jugar')}>
        <Text style={styles.buttonText}>Jugar 🎮</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Información')}>
        <Text style={styles.buttonText}> Información 👤</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonDanger} onPress={handleExitApp}>
        <Text style={styles.buttonText}> Salir ❌ </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 20 },
    title: { fontSize: 28, color: '#ffffff', fontWeight: 'bold',fontFamily: 'serif', textAlign: 'center', marginBottom: 40 },
    buttonPrimary: {
      backgroundColor: '#1e88e5',
      padding: 16,
      borderRadius: 12,
      marginVertical: 10,
      alignItems: 'center',
      ...Platform.select({ android: { elevation: 6 }, ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 } }),
    },
    buttonSecondary: {
      backgroundColor: '#1e88e5',
      padding: 16,
      borderRadius: 12,
      marginVertical: 10,
      alignItems: 'center',
    },
    buttonDanger: {
      backgroundColor: '#1e88e5',
      padding: 16,
      borderRadius: 12,
      marginVertical: 10,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 18 },
  });