// viewmodels/MqttViewModel.js

// Este archivo es el **ViewModel** del patrón MVVM.
// Aquí se encapsula la lógica de conexión MQTT y el estado de sensores.
// Expone los datos y estados que necesita la vista, manteniendo separadas las responsabilidades.

import { useState, useEffect } from 'react';
import { Client } from 'paho-mqtt';

/**
 * Hook ViewModel para gestionar MQTT
 * @param {string} brokerUrl – URL del broker (e.g. 'wss://...')
 * @param {string} topic     – tópico al que suscribirse
 */
export function useMqttViewModel(brokerUrl, topic) {
  const [status, setStatus] = useState('Intentando conectar…');
  const [temperatura, setTemperatura] = useState(null);
  const [humedad, setHumedad] = useState(null);

  useEffect(() => {
    const clientId = 'expo_' + Math.random().toString(16).substr(2, 8);
    const client = new Client(brokerUrl, clientId);

    client.onMessageArrived = (msg) => {
      try {
        const { temperatura, humedad } = JSON.parse(msg.payloadString);
        setTemperatura(temperatura);
        setHumedad(humedad);
        setStatus('Datos recibidos');
      } catch {
        setStatus('JSON inválido');
      }
    };

    client.onConnectionLost = () => setStatus('Conexión perdida');

    client.connect({
      onSuccess: () => {
        setStatus(`Estás suscrito a ${topic}`);
        client.subscribe(topic);
      },
      onFailure: (err) => setStatus(`Error: ${err.errorMessage}`),
      useSSL: true,
      keepAliveInterval: 30,
      mqttVersion: 4,
      reconnect: true,
    });

    return () => {
      if (client.isConnected()) client.disconnect();
    };
  }, [brokerUrl, topic]);

  return { status, temperatura, humedad };
}
