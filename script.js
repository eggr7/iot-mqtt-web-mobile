// --- Supabase setup ---
import { SUPABASE_URL, SUPABASE_ANON } from './config.js';

const clientSupabase      = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


// -------------------------------
// Configuración de conexión
// -------------------------------
const broker     = "wss://broker.emqx.io:8084/mqtt";
const BASE_TOPIC = "sensores";

const topicTempWildcard = `${BASE_TOPIC}/+/temperatura`;
const topicAllWildcard  = `${BASE_TOPIC}/#`;

const client = mqtt.connect(broker);

// Inicia monitoreo automáticamente al conectar
client.on("connect", () => {
    console.log("Conectado al broker MQTT");
    client.subscribe(topicTempWildcard, (err) => {
        if (!err) console.log("Suscrito a", topicTempWildcard);
    });
    client.subscribe(topicAllWildcard, (err) => {
        if (!err) console.log("Suscrito a", topicAllWildcard);
    });
});

// -------------------------------
// Configuración del gráfico con Chart.js
// -------------------------------
const ctx = document.getElementById("tempChart").getContext("2d");
const data = {
    labels: [],
    datasets: [
        {
            label: "Temperatura (°C)",
            borderColor: "#FFA500",
            backgroundColor: "rgba(255,165,0,0.2)",
            data: [],
            fill: true,
        },
        {
            label: "Humedad (%)",
            borderColor: "#00BFFF",
            backgroundColor: "rgba(0,191,255,0.2)",
            data: [],
            fill: true,
        },
    ],
};
const tempChart = new Chart(ctx, {
    type: "line",
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { title: { display: true, text: "Tiempo" } },
            y: { title: { display: true, text: "Valores" }, beginAtZero: false },
        },
    },
});

function updateChart(temp, hum) {
    if (data.labels.length > 10) {
        data.labels.shift();
        data.datasets[0].data.shift();
        data.datasets[1].data.shift();
    }
    data.labels.push(new Date().toLocaleTimeString());
    data.datasets[0].data.push(temp);
    data.datasets[1].data.push(hum);
    tempChart.update();
}

// -------------------------------
// Crear contenedor dinámico para cada ESP32
// -------------------------------
function getDeviceContainer(deviceId) {
    // Quitar mensaje inicial si existe
    const mensaje = document.getElementById("sin-sensores");
    if (mensaje) mensaje.remove();

    let container = document.getElementById(deviceId);
    if (!container) {
        container = document.createElement("div");
        container.id = deviceId;
        container.className = "data-container";
        container.innerHTML = `
            <h3>Dispositivo: ${deviceId}</h3>
            <p>Temperatura: <span class="temperatura">–</span> °C</p>
            <p>Humedad:     <span class="humedad">–</span> %</p>
            <button class="on" onclick="sendCommand('${deviceId}', 'on')">LED ON</button>
            <button class="off" onclick="sendCommand('${deviceId}', 'off')">LED OFF</button>
            <hr>
        `;
        document.getElementById("sensores-container").appendChild(container);
    }
    return container;
}

// -------------------------------
// Recibir datos MQTT
// -------------------------------
client.on("message", async (topic, message) => {
  const parts    = topic.split("/");
  const deviceId = parts[1];
  const dataType = parts[2];
  const payload  = message.toString();

  const container = getDeviceContainer(deviceId);

  if (dataType === "temperatura" || dataType === "humedad") {
    const obj   = JSON.parse(payload);
    const value = obj[dataType];

    // 1) Actualiza la User Interface
    container.querySelector(`.${dataType}`).innerText = value.toFixed(1);
    updateChart(obj.temperatura, obj.humedad);

    // 2) Inserta en Supabase
    const { data, error } = await clientSupabase
      .from('measurements')       // Nombre de nuestra tabla en Supabase
      .insert([{
        timestamp: new Date().toISOString(),
        temperature: obj.temperatura,
        humidity:    obj.humedad,
        device_id:   deviceId
      }]);

    if (error) {
      console.error('Error al insertar en Supabase:', error);
    } else {
      console.log('Guardado en Supabase:', data);
    }
  }
  else if (dataType === "led") {
    console.log(`Estado LED de ${deviceId}: ${payload}`);
  }
});

// -------------------------------
// Enviar comando al LED
// -------------------------------
function sendCommand(deviceId, command) {
    const topicLed = `${BASE_TOPIC}/${deviceId}/led`;
    client.publish(topicLed, command);
    console.log(`Comando '${command}' enviado a ${topicLed}`);
}
    