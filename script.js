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
// Configuración del gráfico con Chart.js (MODIFICADO)
// -------------------------------
const ctx = document.getElementById("tempChart").getContext("2d"); //

// Objeto para almacenar colores asignados a cada dispositivo
const deviceColors = {}; //

// Función para generar un color aleatorio distintivo
function getRandomColor() { //
    const letters = '0123456789ABCDEF'; //
    let color = '#'; //
    for (let i = 0; i < 6; i++) { //
        color += letters[Math.floor(Math.random() * 16)]; //
    }
    return color; //
}

const tempChart = new Chart(ctx, { //
    type: "line", //
    data: { //
        labels: [], // Las etiquetas de tiempo serán globales para todos los datasets
        datasets: [], // Aquí se añadirán dinámicamente los datasets de cada sensor
    },
    options: { //
        responsive: true, //
        maintainAspectRatio: false, //
        scales: { //
            x: { //
                type: 'time', // Usa escala de tiempo para el eje X
                time: { //
                    unit: 'second', // Muestra segundos
                    displayFormats: { //
                        second: 'HH:mm:ss' // Formato de hora, minuto, segundo
                    }
                },
                title: { //
                    display: true, //
                    text: "Tiempo" //
                }
            },
            y: { //
                title: { //
                    display: true, //
                    text: "Valores" //
                },
                beginAtZero: false, //
            },
        },
        plugins: { //
            tooltip: { //
                mode: 'index', // Muestra todos los valores en un punto dado
                intersect: false, // No requiere que el ratón esté directamente sobre un punto
            }
        }
    },
});

// La función updateChart ahora acepta deviceId, temp y hum
function updateChart(deviceId, temp, hum) { //
    // 1. Asegúrate de que el dataset para este dispositivo exista
    let tempDataset = tempChart.data.datasets.find(ds => ds.label === `Temperatura (${deviceId})`); //
    let humDataset = tempChart.data.datasets.find(ds => ds.label === `Humedad (${deviceId})`); //

    // Si no existen, créalos y asigna un color
    if (!tempDataset) { //
        const color = getRandomColor(); //
        deviceColors[deviceId] = color; // Guarda el color para consistencia

        tempDataset = { //
            label: `Temperatura (${deviceId})`, // Etiqueta única para este sensor
            borderColor: color, // Color de la línea
            backgroundColor: `${color}40`, // Color de fondo (más transparente)
            data: [], // Datos de temperatura
            fill: false, // No rellenar debajo de la línea
            yAxisID: 'y', // Asigna al eje Y principal
            parsing: false // Optimizamos el parsing si los datos ya están en el formato correcto
        };
        tempChart.data.datasets.push(tempDataset); // Añade el dataset al gráfico
    }

    if (!humDataset) { //
        // Puedes usar el mismo color base, o generar otro diferente si prefieres
        const color = deviceColors[deviceId] || getRandomColor(); // Reusa el color o genera uno nuevo
        // Opcional: Un color diferente para humedad, por ejemplo, más claro o con otro tono
        const humColor = `hsl(${Math.random() * 360}, 70%, 70%)`; // HSL para variedad

        humDataset = { //
            label: `Humedad (${deviceId})`, // Etiqueta única para este sensor
            borderColor: humColor, //
            backgroundColor: `${humColor}40`, //
            data: [], // Datos de humedad
            fill: false, //
            yAxisID: 'y', // Asigna al eje Y principal
            parsing: false //
        };
        tempChart.data.datasets.push(humDataset); //
    }

    // 2. Añade la nueva etiqueta de tiempo (solo una vez por actualización)
    const now = new Date(); //
    if (tempChart.data.labels.length === 0 || now.getSeconds() % 5 === 0) { // Añade una etiqueta cada 5 segundos para no sobrecargar
        tempChart.data.labels.push(now); //
    } else {
        // Si no añadimos nueva etiqueta, usa la última para alinear datos
        tempChart.data.labels.push(tempChart.data.labels[tempChart.data.labels.length - 1]); //
    }


    // 3. Añade los datos al dataset correspondiente
    tempDataset.data.push({ x: now, y: temp }); //
    humDataset.data.push({ x: now, y: hum }); //

    // 4. Limita la cantidad de puntos en el gráfico para no sobrecargar la memoria
    const MAX_DATA_POINTS = 60; // Mostrar los últimos 60 puntos (equivalente a 2 minutos si actualizas cada 2 segundos)
    if (tempDataset.data.length > MAX_DATA_POINTS) { //
        tempDataset.data.shift(); // Elimina el punto más antiguo
        humDataset.data.shift(); // Elimina el punto más antiguo
        tempChart.data.labels.shift(); // Elimina la etiqueta más antigua
    }

    // 5. Actualiza el gráfico
    tempChart.update(); //
}


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