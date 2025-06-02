// Esta práctica utiliza el patrón MVVM (Model-View-ViewModel) para separar responsabilidades:
// Este archivo representa la **Vista (View)** del patrón MVVM.
// Su única responsabilidad es mostrar la interfaz de usuario y reaccionar a los datos.
// Obtiene el estado y los datos desde el ViewModel (`useMqttViewModel`), sin manejar la lógica de negocio.

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useMqttViewModel } from './viewmodels/MqttViewModel';

export default function App() {
  const { status, temperatura, humedad } = useMqttViewModel(
    'wss://broker.emqx.io:8084/mqtt', // Cambiamos la dirección del Broker por la nuestra
    'sensores/esp32_1/temperatura'
    // Cambiamos el tópico en cuestión por el de los datos estructurados para los distintos esp32.
  );

  return (
    <LinearGradient
      colors={['#0f2027', '#203a43', '#2c5364']} //cambiamos los colores a más oscuros y contrastados
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.centerContainer}>
        <BlurView intensity={100} tint="dark" style={styles.card}>
          {' '}
          // aqui se cambió del modo "light" al "dark" para un fondo oscuro con
          mas opacidad.
          <Text style={styles.status}>{status}</Text>
          {temperatura != null && humedad != null ? (
            <>
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="thermometer"
                  size={36}
                  color="#ff6b6b"
                />{' '}
                // se aumentó el tamaño de los iconos y se les agregó un color.
                <Text style={styles.reading}>{temperatura}°C</Text>
              </View>
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="water-percent"
                  size={36}
                  color="#1dd1a1"
                />{' '}
                // se aumentó el tamaño de los iconos y se les agregó color
                <Text style={styles.reading}>{humedad}%</Text>
              </View>
            </>
          ) : (
            <Text style={styles.message}>Esperando datos…</Text>
          )}
        </BlurView>
      </View>
    </LinearGradient>
  );
}
// Cambiado el fondo a un color sólido oscuro en lugar del gradiente original.
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#121212', // antes solo estaba el flex: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '90%',
    padding: 30,
    borderRadius: 28,
    backgroundColor: 'rgba(30,30,30,0.7)', //fondo oscuro traslúcido
    alignItems: 'center',
    // Añadido efecto de sombra más marcado
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 }, //antes no tenia sombra
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  status: {
    fontSize: 20,
    fontWeight: '700', //más negrita
    marginBottom: 20, //más separación
    color: '#ffffffcc',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10, //máss espacio entre filas
  },
  reading: {
    fontSize: 32,
    marginLeft: 10,
    color: '#ffffff', //mismo color pero con valor explicito
    fontWeight: '600', // un poco más marcado
  },
  message: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#aaa', //cambiado a un gris más elegante
    marginTop: 10,
  },
});
