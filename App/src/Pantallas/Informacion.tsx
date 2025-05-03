import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

export default function Informacion() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}> Acerca de la Aplicación</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📱 Nombre:</Text>
        <Text style={styles.sectionText}>Buscaminas </Text>

        <Text style={styles.sectionTitle}>👨‍💻 Desarrollador:</Text>
        <Text style={styles.sectionText}>G7_ORGA_S1</Text>

        <Text style={styles.sectionTitle}>🧩 Descripción:</Text>
        <Text style={styles.sectionText}>
          Esta aplicación permite jugar una versión personalizada de Buscaminas conectándose vía Bluetooth al módulo HC-05, facilitando la interacción entre hardware (Arduino) y software móvil.
        </Text>

        <Text style={styles.sectionTitle}>📅 Versión:</Text>
        <Text style={styles.sectionText}>1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const baseShadow = Platform.select({
  ios: {
    shadowColor: '#ffff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  android: {
    elevation: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    fontFamily: 'cursive',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 20,
    ...baseShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    color: '#ffffff',
    marginTop: 10,
  },
  sectionText: {
    fontSize: 15,
    fontFamily: 'sans-serif',
    color: '#bdbdbd',
    marginBottom: 5,
  },
});