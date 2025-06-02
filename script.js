// --- Supabase setup ---
const SUPABASE_URL = 'https://jewkdyheholhvafarbhl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impld2tkeWhlaG9saHZhZmFyYmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjM5MjQsImV4cCI6MjA2Mjk5OTkyNH0.jVSQiC3yZ8xHqb4jaeiSlIEDG3TUwiR1MF9dJLWErvc';
const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


// -------------------------------
// Configuración de conexión MQTT
// -------------------------------
// -------------------------------
// Configuración de conexión MQTT
// -------------------------------
const broker = "wss://broker.emqx.io:8084/mqtt"; //
const BASE_TOPIC = "sensores"; //

const topicTempWildcard = `${BASE_TOPIC}/+/temperatura`; //
const topicAllWildcard = `${BASE_TOPIC}/#`; //

const client = mqtt.connect(broker); //

// Inicia monitoreo automáticamente al conectar
client.on("connect", () => { //
    console.log("Conectado al broker MQTT"); //
    client.subscribe(topicTempWildcard, (err) => { //
        if (!err) console.log("Suscrito a", topicTempWildcard); //
    });
    client.subscribe(topicAllWildcard, (err) => { //
        if (!err) console.log("Suscrito a", topicAllWildcard); //
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
        const tempSpan = container.querySelector(`#temperature-${deviceId}`); //
        const humSpan = container.querySelector(`#humidity-${deviceId}`); //

        if (tempSpan && obj.temperatura !== undefined) { //
            tempSpan.innerText = `${obj.temperatura.toFixed(1)} °C`; //
        }
        if (humSpan && obj.humedad !== undefined) { //
            humSpan.innerText = `${obj.humedad.toFixed(1)} %`; //
        }


        // 2) Inserta en Supabase
        const { data, error } = await clientSupabase //
            .from('measurements') //
            .insert([{ //
                created_at: new Date().toISOString(), // Asumo que el nombre de tu columna es 'created_at'
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

// -------------------------------
// FUNCIONES PARA CONSULTAR, MODIFICAR Y ELIMINAR REGISTROS DE SUPABASE
// -------------------------------

// Elementos HTML de la nueva sección
const loadRecordsBtn = document.getElementById('loadRecordsBtn'); //
const recordsTableBody = document.getElementById('recordsTableBody'); //
const noRecordsMessage = document.getElementById('noRecordsMessage'); //

const editIdInput = document.getElementById('editIdInput'); //
const editTempInput = document.getElementById('editTempInput'); //
const editHumInput = document.getElementById('editHumInput'); //
const updateRecordBtn = document.getElementById('updateRecordBtn'); //

// const deleteIdInput = document.getElementById('deleteIdInput'); //
// const deleteRecordBtn = document.getElementById('deleteRecordBtn'); //

// Función para cargar y mostrar todos los registros
async function loadAllRecords() { //
    console.log('Cargando registros de Supabase...'); //
    const { data, error } = await clientSupabase //
        .from('measurements') //
        .select('*') //
        .order('created_at', { ascending: false }); // Ordenar por fecha de creación descendente

    if (error) { //
        console.error('Error al cargar registros:', error); //
        recordsTableBody.innerHTML = '<tr><td colspan="6">Error al cargar registros.</td></tr>'; //
        noRecordsMessage.style.display = 'block'; //
    } else { //
        recordsTableBody.innerHTML = ''; // Limpiar tabla
        if (data.length === 0) { //
            noRecordsMessage.style.display = 'block'; //
        } else { //
            noRecordsMessage.style.display = 'none'; //
            data.forEach(record => { //
                const row = recordsTableBody.insertRow(); //
                row.insertCell(0).textContent = record.id; //
                row.insertCell(1).textContent = new Date(record.created_at).toLocaleString(); //
                row.insertCell(2).textContent = record.device_id; //
                row.insertCell(3).textContent = `${record.temperature} °C`; //
                row.insertCell(4).textContent = `${record.humidity} %`; //
                const actionsCell = row.insertCell(5); //
                
                // Botón de eliminar directo en la fila (opcional, para conveniencia)
                const deleteRowBtn = document.createElement('button'); //
                deleteRowBtn.textContent = 'Eliminar'; //
                deleteRowBtn.className = 'delete-row-btn'; // Para estilos
                deleteRowBtn.onclick = async () => { //
                    if (confirm(`¿Estás seguro de que quieres eliminar el registro con ID ${record.id}?`)) { //
                        await deleteRecord(record.id); //
                        loadAllRecords(); // Recargar tabla después de eliminar
                    }
                };
                actionsCell.appendChild(deleteRowBtn); //
            });
        }
    }
}

// Función para modificar un registro
async function updateRecord() { //
    const id = editIdInput.value; //
    const newTemp = parseFloat(editTempInput.value); //
    const newHum = parseFloat(editHumInput.value); //

    if (!id || isNaN(newTemp) || isNaN(newHum)) { //
        alert('Por favor, ingresa un ID, temperatura y humedad válidos para modificar.'); //
        return; //
    }

    console.log(`Modificando registro ${id} con Temp: ${newTemp}, Hum: ${newHum}`); //

    const { data, error } = await clientSupabase //
        .from('measurements') //
        .update({ temperature: newTemp, humidity: newHum }) //
        .eq('id', id); // 'eq' significa 'equals' (igual a)

    if (error) { //
        console.error('Error al modificar registro:', error); //
        alert('Error al modificar el registro: ' + error.message); //
    } else { //
        console.log('Registro modificado:', data); //
        alert('Registro modificado correctamente.'); //
        editIdInput.value = ''; //
        editTempInput.value = ''; //
        editHumInput.value = ''; //
        loadAllRecords(); // Recargar tabla después de modificar
    }
}

// Función para eliminar un registro
async function deleteRecord(idToDelete) { //
    const id = idToDelete || deleteIdInput.value; // Usa el ID pasado o el del input

    if (!id) { //
        alert('Por favor, ingresa un ID válido para eliminar.'); //
        return; //
    }

    if (!idToDelete && !confirm(`¿Estás seguro de que quieres eliminar el registro con ID ${id}?`)) { //
        return; // Si es confirmación manual, no eliminar si cancela
    }

    console.log(`Eliminando registro con ID: ${id}`); //

    const { data, error } = await clientSupabase //
        .from('measurements') //
        .delete() //
        .eq('id', id); //

    if (error) { //
        console.error('Error al eliminar registro:', error); //
        alert('Error al eliminar el registro: ' + error.message); //
    } else { //
        console.log('Registro eliminado:', data); //
        alert('Registro eliminado correctamente.'); //
        deleteIdInput.value = ''; //
        loadAllRecords(); // Recargar tabla después de eliminar
    }
}

// Asignar Event Listeners a los botones
loadRecordsBtn.addEventListener('click', loadAllRecords); //
updateRecordBtn.addEventListener('click', updateRecord); //
// deleteRecordBtn.addEventListener('click', deleteRecord); // ELIMINAR ESTA LÍNEA

// Cargar registros al iniciar la página
document.addEventListener('DOMContentLoaded', loadAllRecords); //