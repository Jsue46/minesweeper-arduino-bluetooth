import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ToastAndroid, LayoutAnimation, Platform, UIManager, SafeAreaView,
} from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { requestMultiple, openSettings, PERMISSIONS, RESULTS } from 'react-native-permissions';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GameScreen() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [board, setBoard] = useState<boolean[][]>(Array(4).fill(null).map(() => Array(4).fill(false)));
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [showDeviceList, setShowDeviceList] = useState<boolean>(false);

//npx react-native run-android


  const isMounted = useRef(true); 

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      RNBluetoothClassic.cancelDiscovery(); 
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return;
    const permissions = [
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ];
    const results = await requestMultiple(permissions);

    const denied: string[] = [], blocked: string[] = [];
    for (const key of permissions) {
      if (results[key] === RESULTS.BLOCKED) blocked.push(key);
      else if (results[key] !== RESULTS.GRANTED) denied.push(key);
    }
    if (blocked.length > 0) {
      openSettings();
      throw new Error('Permisos bloqueados permanentemente');
    }
    if (denied.length > 0) {
      throw new Error('Permisos denegados');
    }
  };

  const discoverDevices = async () => {
    if (discovering) return;
    try {
      setDiscovering(true);
      await requestPermissions();
      await RNBluetoothClassic.cancelDiscovery();
      const discovered = await RNBluetoothClassic.startDiscovery();

      if (isMounted.current) { // ✅ Solo actualizar si sigue montado
        setDevices(discovered);
      }
    } catch (error) {
      console.error('Error al descubrir dispositivos:', error);
    } finally {
      if (isMounted.current) { // ✅ Solo actualizar si sigue montado
        setDiscovering(false);
      }
    }
  };

  const toggleCell = async (row: number, col: number) => {
    console.log(`🟩 Celda tocada: fila ${row}, columna ${col}`);
  
    const newBoard = board.map((r, i) =>
      r.map((c, j) => (i === row && j === col ? !c : c))
    );
    setBoard(newBoard);
  
    if (connectedDevice) {
      try {
        const isConnected = await connectedDevice.isConnected();
        if (isConnected) {
          const message = `CLICK ${row} ${col}\n`;
          await connectedDevice.write(message);
  
          const available = await connectedDevice.available();
          if (available > 0) {
            const response = await connectedDevice.read();
            ToastAndroid.show(`Arduino: ${response.trim()}`, ToastAndroid.SHORT);
          }
        }
      } catch (err) {
        ToastAndroid.show('❌ Error en comunicación Bluetooth', ToastAndroid.SHORT);
        console.error(err);
      }
    }
  };

  const handleDeviceSelect = async (device: BluetoothDevice) => {
    try {
      const success = await device.connect();
      const connected = await device.isConnected();
      if (success && connected) {
        setConnectedDevice(device);
      }
    } catch (error) {
      console.error('Error al conectar:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Buscaminas</Text>

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => {
          LayoutAnimation.easeInEaseOut();
          setShowDeviceList(!showDeviceList);
          if (!showDeviceList) discoverDevices();
        }}
      >
        <Text style={styles.expandText}>{showDeviceList ? 'Ocultar dispositivos' : 'Seleccionar dispositivo Bluetooth'}</Text>
      </TouchableOpacity>

      {showDeviceList && (
        <View style={styles.deviceListContainer}>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.address}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.device,
                  connectedDevice?.address === item.address && { backgroundColor: '#00c853' },
                ]}
                onPress={() => handleDeviceSelect(item)}
              >
                <Text style={styles.deviceName}>{item.name ?? 'Desconocido'}</Text>
                <Text style={styles.deviceAddress}>{item.address}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.board}>
        {board.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((cell, j) => (
              <TouchableOpacity
                key={j}
                style={[styles.cell, cell && styles.cellActive]}
                onPress={() => toggleCell(i, j)}
              />
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, marginBottom: 20, color: '#fff', fontWeight: 'bold', textAlign: 'center', fontFamily: 'cursive' },
  board: { marginTop: 20, marginBottom: 40, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  cell: { width: 80, height: 80, backgroundColor: '#333', margin: 4, borderRadius: 8 },
  cellActive: { backgroundColor: '#00c853' },
  expandButton: { backgroundColor: '#3949ab', padding: 12, borderRadius: 8, marginBottom: 10 },
  expandText: { color: '#fff', textAlign: 'center' },
  deviceListContainer: { maxHeight: 200, marginBottom: 20 },
  device: { backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8, marginBottom: 8 },
  deviceName: { color: '#fff', fontSize: 16 },
  deviceAddress: { color: '#ccc', fontSize: 12 },
});