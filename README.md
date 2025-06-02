# Proyecto Final MQTT 

## Descripción del Proyecto

Este proyecto consiste en un sistema de monitorización y control de temperatura, humedad y LEDs utilizando placas ESP32, el sensor DHT22 y el protocolo MQTT. La información de temperatura y humedad es publicada por cada ESP32 a un broker MQTT, y una interfaz web muestra los datos en tiempo real y permite encender o apagar un LED LED conectado a cada ESP32.

Con la implementación de wildcards (`+` y `#`) en los tópicos MQTT, la interfaz web puede suscribirse de manera eficiente a múltiples dispositivos sin necesidad de modificar el código para cada nuevo ESP32.

## Requisitos del Sistema

### Hardware

* 1 o más placas **ESP32**
* Sensor **DHT22** (por cada ESP32)
* LED y resistencia de 220 Ω (por cada ESP32)
* Conexión WiFi

### Software

* **MicroPython** en las ESP32
* Biblioteca **umqtt.simple** para MQTT en MicroPython
* **Broker MQTT** (p.ej. `broker.emqx.io`)
* Navegador moderno con soporte WebSockets
* Librerías JavaScript: `mqtt.js`, `Chart.js`

## Instrucciones de Uso

1. **Clonar o descargar** este repositorio:

   ```bash
   git clone https://github.com/robertobrizuela/mqtt-wildcards.git
   cd mqtt-wildcards
   ```

2. **Configurar las ESP32**:

   * Edita `main.py` en MicroPython:

     ```python
     DEVICE_ID = "esp32_1"  # Cambiar para cada ESP32: esp32_2, esp32_3, ...
     BASE_TOPIC = "sensores"
     TOPIC_TEMP = f"{BASE_TOPIC}/{DEVICE_ID}/temperatura"
     TOPIC_HUM  = f"{BASE_TOPIC}/{DEVICE_ID}/humedad"
     TOPIC_LED  = f"{BASE_TOPIC}/{DEVICE_ID}/led"
     ```
   * Sube el script a la ESP32 y verifica en MQTTX que publique en `sensores/esp32_1/#`.

3. **Desplegar la interfaz web**:

   * Abre `index.html` en un servidor estático (GitHub Pages, Netlify, ...).
   * Asegúrate de que `script.js` y `style.css` estén accesibles.

4. **Visualizar y controlar**:

   * La página web se suscribirá automáticamente a `sensores/+/temperatura` y `sensores/#`.
   * Los datos de cada ESP32 aparecerán en tarjetas dinámicas.
   * Usa los botones `LED ON` / `LED OFF` de cada tarjeta para enviar comandos.

## Ejemplos de Uso

* **Simular un segundo ESP32** desde la consola del navegador:

  ```js
  const sim = mqtt.connect("wss://broker.emqx.io:8084/mqtt");
  sim.on("connect", () => {
    setInterval(() => {
      const d = { temperatura: 26 + Math.random()*4, humedad: 45 + Math.random()*10 };
      const payload = JSON.stringify(d);
      sim.publish("sensores/esp32_2/temperatura", payload);
      sim.publish("sensores/esp32_2/humedad", payload);
    }, 5000);
  });
  ```

* **Suscripción detallada** en MQTTX:

  * `sensores/+/temperatura` → recibe solo temperaturas de todos los ESP32.
  * `sensores/#` → recibe todos los eventos (temperatura, humedad y LED) de todos los ESP32.

## Detalles Técnicos

* **Wildcards MQTT**:

  * `+` sustituye un nivel de tópico: `sensores/+/temperatura` captura `sensores/esp32_1/temperatura`, `sensores/esp32_2/temperatura`, etc.
  * `#` sustituye múltiples niveles: `sensores/#` captura cualquier publicación bajo `sensores/`.

* **Interfaz Web**:

  * Utiliza **mqtt.js** para conectar vía WebSockets.
  * Renderiza datos en **Chart.js** y crea tarjetas dinámicas por `deviceId`.

## Ventajas de los wildcards

1. **Sin wildcards**: Se requería una suscripción por cada ESP32:

   ```text
   client.subscribe('sensores/esp32_1/temperatura');
   client.subscribe('sensores/esp32_2/temperatura');
   // ...
   ```

2. **Con wildcards**: Una sola suscripción cubre todos:

   ```text
   client.subscribe('sensores/+/temperatura');
   client.subscribe('sensores/#');
   ```

## Diagrama del funcionamiento:

   ![image](https://github.com/user-attachments/assets/991cb88b-4b39-4e37-ad01-12b9eb87fdb8)


