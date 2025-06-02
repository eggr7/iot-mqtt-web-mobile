// --- Supabase setup ---
const SUPABASE_URL    = 'https://jewkdyheholhvafarbhl.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impld2tkeWhlaG9saHZhZmFyYmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjM5MjQsImV4cCI6MjA2Mjk5OTkyNH0.jVSQiC3yZ8xHqb4jaeiSlIEDG3TUwiR1MF9dJLWErvc';
const clientSupabase      = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


// -------------------------------
// Configuración de conexión MQTT
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
// Crear contenedor dinámico para cada ESP32
// -------------------------------
function getDeviceContainer(deviceId) { //
    // Quitar mensaje inicial si existe
    const mensaje = document.getElementById("sin-sensores"); //
    if (mensaje) mensaje.remove(); //

    let container = document.getElementById(deviceId); //
    if (!container) { //
        container = document.createElement("div"); //
        container.id = deviceId; //
        container.className = "data-container"; //
        container.innerHTML = `
            <h3>Dispositivo: <span id="display-device-id-${deviceId}">${deviceId}</span></h3>
            <p>Temperatura: <span class="temperatura-value" id="temperature-${deviceId}">--</span></p>
            <p>Humedad:      <span class="humedad-value" id="humidity-${deviceId}">--</span></p>
            <button class="led-button" data-device-id="${deviceId}" data-command="on">LED ON</button>
            <button class="led-button" data-device-id="${deviceId}" data-command="off">LED OFF</button>
            <hr>
        `; //
        document.getElementById("sensores-container").appendChild(container); //

        // AQUI ES DONDE AÑADIMOS LOS EVENT LISTENERS
        const buttons = container.querySelectorAll('.led-button'); //
        buttons.forEach(button => { //
            button.addEventListener('click', function() { //
                const deviceId = this.dataset.deviceId; //
                const command = this.dataset.command; //
                sendCommand(deviceId, command); //
            });
        });
    }
    return container; //
}

// -------------------------------
// Recibir datos MQTT
// -------------------------------
client.on("message", async (topic, message) => { //
    const parts = topic.split("/"); //
    const deviceId = parts[1]; //
    const dataType = parts[2]; //
    const payload = message.toString(); //

    //Evitamos procesar mensajes de ambiente u otros valores no deseados
    if (!deviceId || deviceId.trim() === "" || deviceId === "ambiente") return; //


    if (dataType === "temperatura" || dataType === "humedad") { //
        let obj; //
        try { //
            obj = JSON.parse(payload); //
        } catch (e) { //
            console.warn("Payload inválido JSON:", payload); //
            return; //
        }

        const value = obj[dataType]; //
        if (typeof value !== "number") return; //
        const container = getDeviceContainer(deviceId); //

        // 1) Actualiza la User Interface
        // Usa IDs únicos para los spans de temperatura y humedad
        const tempSpan = container.querySelector(`#temperature-${deviceId}`); //
        const humSpan = container.querySelector(`#humidity-${deviceId}`); //

        if (tempSpan && obj.temperatura !== undefined) { //
            tempSpan.innerText = `${obj.temperatura.toFixed(1)} °C`; //
        }
        if (humSpan && obj.humedad !== undefined) { //
            humSpan.innerText = `${obj.humedad.toFixed(1)} %`; //
        }


        // 2) Actualiza el gráfico con los datos de este dispositivo
        // Solo llamar a updateChart si ambos valores están disponibles en el mismo payload (como en tu ESP32)
        if (obj.temperatura !== undefined && obj.humedad !== undefined) { //
            updateChart(deviceId, obj.temperatura, obj.humedad); //
        }


        // 3) Inserta en Supabase
        const { data, error } = await clientSupabase //
            .from('measurements') // Nombre de nuestra tabla en Supabase
            .insert([{ //
                timestamp: new Date().toISOString(), //
                temperature: obj.temperatura, //
                humidity: obj.humedad, //
                device_id: deviceId //
            }]); //

        if (error) { //
            console.error('Error al insertar en Supabase:', error); //
        } else { //
            console.log('Guardado en Supabase:', data); //
        }
    } else if (dataType === "led") { //
        console.log(`Estado LED de ${deviceId}: ${payload}`); //
    }
});

// -------------------------------
// Enviar comando al LED
// -------------------------------
function sendCommand(deviceId, command) { //
    const topicLed = `${BASE_TOPIC}/${deviceId}/led`; //
    client.publish(topicLed, command); //
    console.log(`Comando '${command}' enviado a ${topicLed}`); //
}