// --- Supabase setup ---
const SUPABASE_URL    = 'https://jewkdyheholhvafarbhl.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impld2tkeWhlaG9saHZhZmFyYmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjM5MjQsImV4cCI6MjA2Mjk5OTkyNH0.jVSQiC3yZ8xHqb4jaeiSlIEDG3TUwiR1MF9dJLWErvc';
const clientSupabase      = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


// -------------------------------
// Configuración de conexión
// -------------------------------
const broker     = "wss://broker.emqx.io:8084/mqtt"; // Broker MQTT público
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
            <p>Humedad:      <span class="humedad">–</span> %</p>
            <button class="on" data-command="on">LED ON</button>
            <button class="off" data-command="off">LED OFF</button>
            <hr>
        `;
        document.getElementById("sensores-container").appendChild(container);

        // AÑADIR EVENT LISTENERS AQUÍ
        const onButton = container.querySelector('button.on');
        const offButton = container.querySelector('button.off');

        onButton.addEventListener('click', () => sendCommand(deviceId, 'on'));
        offButton.addEventListener('click', () => sendCommand(deviceId, 'off'));
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

    //Evitamos procesar mensajes de ambiente u otros valores no deseados
    if (!deviceId || deviceId.trim() === "" || deviceId === "ambiente") return;


    if (dataType === "temperatura" || dataType === "humedad") {
        let obj;
        try {
            obj = JSON.parse(payload);
        } catch (e){
            console.warn("Payload inválido JSON:", payload);
            return;
        }

        // Asegúrate de que ambos valores existen para pasarlos al updateChart
        const tempValue = obj.temperatura;
        const humValue = obj.humedad;

        if (typeof tempValue !== "number" && typeof humValue !== "number") {
             console.warn(`Valores de temperatura/humedad inválidos para ${deviceId}: Temp: ${tempValue}, Hum: ${humValue}`);
             return;
        }

        const container = getDeviceContainer(deviceId);

        // 1) Actualiza la User Interface
        if (dataType === "temperatura" && typeof tempValue === "number") {
            container.querySelector(`.temperatura`).innerText = tempValue.toFixed(1);
        }
        if (dataType === "humedad" && typeof humValue === "number") {
            container.querySelector(`.humedad`).innerText = humValue.toFixed(1);
        }

        // Solo actualiza el gráfico si tienes ambos datos, o ajusta updateChart para manejar un solo valor
        // Para simplificar, asumiremos que los mensajes de temperatura y humedad
        // pueden llegar de forma independiente y que el gráfico espera ambos
        // Si siempre vienen juntos en el mismo JSON, esta parte está bien.
        // Si llegan por separado, necesitarías almacenar el último valor de cada uno.
        // Por ahora, pasamos los valores disponibles.
        updateChart(tempValue, humValue);


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
        // Si el ESP32 publica el estado del LED, puedes usarlo aquí para actualizar
        // visualmente el botón, por ejemplo, cambiando su clase o texto.
        // const button = getDeviceContainer(deviceId).querySelector(`.led-button[data-device-id="${deviceId}"][data-command="${payload}"]`);
        // if (button) { /* actualiza el botón */ }
    }
});

// -------------------------------
// Enviar comando al LED (AHORA ES UNA FUNCIÓN DEL MÓDULO)
// -------------------------------
function sendCommand(deviceId, command) {
    const topicLed = `${BASE_TOPIC}/${deviceId}/led`;
    client.publish(topicLed, command);
    console.log(`Comando '${command}' enviado a ${topicLed}`);
}