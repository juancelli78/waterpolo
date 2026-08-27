// =========================================
// CRONÓMETRO WATERPOLO
// Versión 2.0
// =========================================
//=========================================
// CONFIGURACIÓN (valores por defecto)
//=========================================
var DURACION_CUARTOS = [8 * 60, 8 * 60, 8 * 60, 8 * 60];
var DESCANSOS = [2 * 60, 3 * 60, 2 * 60];
var TOTAL_PERIODOS = 4;
//=========================================
// VARIABLES DEL PARTIDO
//=========================================
var periodo = 1;
var enDescanso = false;
var tiempo = DURACION_CUARTOS[0];
var corriendo = false;
var ultimoTick = 0;
var codigo = "";
//=========================================
// CODIGO
//=========================================
var codigoPartido = document.getElementById("codigoPartido");
//=========================================
// ELEMENTOS HTML
//=========================================
var pantallaConfiguracion = document.getElementById("pantallaConfiguracion");
var pantallaCronometro = document.getElementById("pantallaCronometro");
var botonIniciar = document.getElementById("btnIniciar");
var mm = document.getElementById("mm");
var ss = document.getElementById("ss");
var cronometro = document.getElementById("cronometro");
var periodoTexto = document.getElementById("periodo");
var estado = document.getElementById("estado");
//=========================================
// MARCADOR
//=========================================
var golesAzul = 0;
var golesRojo = 0;
var divGolAzul = document.getElementById("golAzul"); // Elementos HTML si los tienes en pantalla
var divGolRojo = document.getElementById("golRojo");
//=========================================
// INPUTS
//=========================================
var inputCuartos = [
  document.getElementById("q1"),
  document.getElementById("q2"),
  document.getElementById("q3"),
  document.getElementById("q4")
];
var inputDescansos = [
  document.getElementById("d1"),
  document.getElementById("d2"),
  document.getElementById("d3")
];
//=========================================
// FUNCIONES AUXILIARES
//=========================================
function dos(numero) {
  if (numero < 10) {
    return "0" + numero;
  }
  return "" + numero;
}
//=========================================
// BUZZER
//=========================================
var buzzer = new Audio("Buzzer.mp3");
buzzer.preload = "auto";
//lo cambie 27.08.2026
function prepararBuzzer() {
  try {
    buzzer.load();
    buzzer.play();
    buzzer.pause();
    buzzer.currentTime = 0;
  } catch (e) {
    // Evita que un fallo de audio congele la app en iOS 9
  }
}
function sonarBuzzer() {
  buzzer.currentTime = 0; // Comenzar siempre desde el principio.
  buzzer.play();
}
//=========================================
// CODIGO => generar codigo.
//=========================================
function generarCodigo() {
  var caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var codigo = "";
  for (var i = 0; i < 3; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}
//=========================================
// CARGAR CONFIGURACIÓN
//=========================================
function cargarConfiguracion() {
  // CUARTOS
  for (var i = 0; i < 4; i++) {
    var valor = parseInt(inputCuartos[i].value);
    if (isNaN(valor) || valor < 1) {
      valor = 1;
    }
    DURACION_CUARTOS[i] = valor * 60;
  }
  // DESCANSOS
  for (var i = 0; i < 3; i++) {
    var valor = parseInt(inputDescansos[i].value);
    if (isNaN(valor) || valor < 0) {
      valor = 0;
    }
    DESCANSOS[i] = valor * 60;
  }
  // REINICIAR VARIABLES
  periodo = 1;
  enDescanso = false;
  tiempo = DURACION_CUARTOS[0];
  corriendo = false;
  ultimoTick = 0;
}
var codigo = generarCodigo();
codigoPartido.innerHTML = codigo;
//=========================================
// VERIFICAR CODIGO
//=========================================
function enviarRespuestaCodigo() {
  var respuesta = {
    topic: "realtime:partido:" + codigo,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "respuesta",
      payload: {
        respuesta: "codigo_ok"
      }
    },
    ref: "3"
  };
  if (socketSupabase && socketSupabase.readyState == 1) {
    socketSupabase.send(JSON.stringify(respuesta));
  }
}
//=========================================
// COMENZAR PARTIDO
//=========================================
function comenzarPartido() {
  cargarConfiguracion();
  pantallaConfiguracion.style.display = "none";
  pantallaCronometro.style.display = "block";
  estado.innerHTML = "TOCAR PARA INICIAR";
  corriendo = false;
  ultimoTick = Date.now();
  estado.innerHTML = "ESPERANDO AL CONTROL....";
  prepararBuzzer();
  actualizarPantalla();
}
//=========================================
// BOTÓN INICIAR
//=========================================
botonIniciar.onclick = comenzarPartido;
//=========================================
// ACTUALIZAR PANTALLA
//=========================================
function actualizarPantalla() {
  var minutos = Math.floor(tiempo / 60);
  var segundos = tiempo % 60;
  mm.innerHTML = dos(minutos);
  ss.innerHTML = dos(segundos);
  cronometro.className = "";
  if (enDescanso) {
    cronometro.className = "descanso";
    if (periodo == 2) {
      periodoTexto.innerHTML = "DESCANSO";
    } else if (periodo == 3) {
      periodoTexto.innerHTML = "ENTRETIEMPO";
    } else if (periodo == 4) {
      periodoTexto.innerHTML = "DESCANSO";
    }
  } else {
    periodoTexto.innerHTML = "PERÍODO " + periodo;
    if (tiempo <= 30) {
      cronometro.className = "rojo";
    }
  }
}
//=========================================
// PASAR A LA SIGUIENTE ETAPA
//=========================================
function siguienteEtapa() {
  //=====================================
  // TERMINÓ UN DESCANSO
  //=====================================
  if (enDescanso) {
    sonarBuzzer();
    enDescanso = false;
    tiempo = DURACION_CUARTOS[periodo - 1];
    actualizarPantalla();
    return;
  }
  //=====================================
  // TERMINÓ UN PERÍODO
  //=====================================
  if (periodo == TOTAL_PERIODOS) {
    corriendo = false;
    mm.innerHTML = "00";
    ss.innerHTML = "00";
    cronometro.className = "fin";
    periodoTexto.innerHTML = "";
    estado.innerHTML = "FIN DEL PARTIDO";
    return;
  }
  //=====================================
  // COMIENZA UN DESCANSO
  //=====================================
  sonarBuzzer();
  enDescanso = true;
  tiempo = DESCANSOS[periodo - 1];
  periodo++;
  actualizarPantalla();
}
//=========================================
// INICIAR / PAUSAR
//=========================================
function iniciarPausar() {
  corriendo = !corriendo;
  if (corriendo) {
    estado.innerHTML = "TOCAR PARA PAUSAR";
    ultimoTick = Date.now();
  } else {
    estado.innerHTML = "TOCAR PARA REANUDAR";
  }
}
//=========================================
// LOOP PRINCIPAL
//=========================================
function loop() {
  if (corriendo) {
    var ahora = Date.now();
    var diferencia = ahora - ultimoTick;
    if (diferencia >= 1000) {
      var segundosTranscurridos = Math.floor(diferencia / 1000);
      ultimoTick += segundosTranscurridos * 1000;
      tiempo -= segundosTranscurridos;
      if (tiempo <= 0) {
        tiempo = 0;
        actualizarPantalla();
        siguienteEtapa();
      } else {
        actualizarPantalla();
      }
    }
  }
  setTimeout(loop, 50);
}
//=========================================
// EVENTOS => el verdadero problema
//=========================================
// Mouse (PC)
// document.body.addEventListener(
//   "click",
//   function () {
//     if (pantallaCronometro.style.display == "block") {
//       iniciarPausar();
//     }
//   },
//   false,
// );
// Touch (iPad / iPhone)
// document.body.addEventListener(
//   "touchstart",
//   function (e) {
//     if (pantallaCronometro.style.display == "block") {
//       e.preventDefault();
//       iniciarPausar();
//       alert("Pare el cronometro");
//     }
//   },
//   false,
// );
// canalPartido = codigo;
//=========================================
// EVENTOS => el verdadero problema. Los cambie por esto
//=========================================
pantallaCronometro.onclick = iniciarPausar;
//=========================================
// INICIALIZACIÓN
//=========================================
actualizarPantalla();
loop();
//=========================================
// SUPABASE - WEBSOCKET
// ETAPA 2A
// COMPATIBLE CON iOS 9
//=========================================
// var socket;
// var socketSupabase = null;
// var canalPartido = "";
// var SUPABASE_URL =
//   "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";
// function conectarSupabase() {
//   try {
//     alert("1 - ANTES DE CREAR SOCKET");
//     socketSupabase = new WebSocket(SUPABASE_URL);
//     alert("2 - SOCKET CREADO");
//     socketSupabase.onopen = function () {
//       alert("3 - SUPABASE CONECTADO");
//     };
//     socketSupabase.onmessage = function (evento) {
//       alert("4 - MENSAJE");
//     };
//     socketSupabase.onerror = function () {
//       alert("5 - ERROR");
//     };
//     socketSupabase.onclose = function () {
//       alert("6 - CERRADO");
//     };
//   } catch (e) {
//     alert("7 - EXCEPCION: " + e.message);
//   }
// }
// =========================================
// PRUEBA SUPABASE - iOS 9 => que SI funciona en C:\Users\Juan B\Desktop\Cronometro WP\Cronometro\Prueba\Prueba => lo probe solo y funca!
// =========================================
var socketSupabase = null;
var heartbeatTimer = null;
var reconnectTimer = null;
var supabaseConectado = false;
//=========================================
// HEARTBEAT SUPABASE
// INICIO. Mantener conexión activa - ANTES DE CONECTAR (DA LO MISMO)
//=========================================
function iniciarHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  heartbeatTimer = setInterval(function () {
    if (socketSupabase && socketSupabase.readyState == 1) {
      var heartbeat = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: "heartbeat"
      };
      socketSupabase.send(JSON.stringify(heartbeat));
    }
  }, 20000);
}
//=========================================
// HEARTBEAT SUPABASE
// FIN : Mantener conexión activa - ANTES DE CONECTAR (DA LO MISMO)
//=========================================
// function conectarSupabase() {
//   try {
//     socketSupabase = new WebSocket(
//       "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0",
//     );
//     socketSupabase.onopen = function () {
//       var mensaje = {
//         topic: "realtime:partido:" + codigo,
//         event: "phx_join",
//         payload: {
//           config: {
//             broadcast: {
//               ack: false,
//               self: true,
//             },
//             presence: {
//               enabled: false,
//             },
//             postgres_changes: [],
//           },
//         },
//         ref: "1",
//         join_ref: "1",
//       };
//       socketSupabase.send(JSON.stringify(mensaje));
//       iniciarHeartbeat(); // ACA VA PARA QUE SE MANTEGA AL MENOS 25 SEGUNDOS.
//     };
//     socketSupabase.onmessage = function (evento) {
//       //=========================================
//       // VERIFICAR EL CODIGO INTRODUCIDO
//       //=========================================
//       // if (comando == "verificar") {
//       //   enviarRespuestaCodigo();
//       //   return;
//       // }
//       var mensaje;
//       try {
//         mensaje = JSON.parse(evento.data);
//       } catch (e) {
//         return;
//       }
//       //=========================================
//       // RESPUESTA DE SUPABASE AL CONECTAR
//       //=========================================
//       if (
//         mensaje.event == "phx_reply" &&
//         mensaje.payload &&
//         mensaje.payload.status == "ok"
//       ) {
//         return;
//       }
//       //=========================================
//       // COMANDO RECIBIDO DEL CONTROL
//       //=========================================
//       if (
//         mensaje.event == "broadcast" &&
//         mensaje.payload &&
//         mensaje.payload.payload
//       ) {
//         var comando = mensaje.payload.payload.comando;
//         /*INICIO. agregar temporalmente*/
//         if (comando == "verificar") {
//           var respuesta = {
//             topic: "realtime:partido:" + codigo,
//             event: "broadcast",
//             payload: {
//               type: "broadcast",
//               event: "respuesta",
//               payload: {
//                 respuesta: "codigo_ok",
//                 // codigo: codigo,
//               },
//             },
//             ref: "3",
//           };
//           socketSupabase.send(JSON.stringify(respuesta));
//           alert("RESPUESTA ENVIADA: " + codigo);
//           return;
//         }
//         /*FIN. de agregar temporalmente*/
//         //=======================================
//         // PAUSAR
//         //=======================================
//         if (comando == "pausar") {
//           corriendo = false;
//           estado.innerHTML = "TOCAR PARA REANUDAR";
//           return;
//         }
//         //=======================================
//         // REANUDAR
//         //=======================================
//         if (comando == "reanudar") {
//           corriendo = true;
//           ultimoTick = Date.now();
//           estado.innerHTML = "TOCAR PARA PAUSAR";
//           return;
//         }
//       }
//     };
//     socketSupabase.onerror = function () {};
//     /*
//                                             Supabase se cae (on.close)
//                                               ↓
//                                         espera 3 segundos
//                                               ↓
//                                         vuelve a conectar
//                                               ↓
//                                         vuelve a hacer phx_join
//                                               ↓
//                                         vuelve a iniciar heartbeat*/
//     socketSupabase.onclose = function () {
//       supabaseConectado = false;
//       if (heartbeatTimer) {
//         clearInterval(heartbeatTimer);
//         heartbeatTimer = null;
//       }
//       if (reconnectTimer) {
//         clearTimeout(reconnectTimer);
//       }
//       reconnectTimer = setTimeout(function () {
//         conectarSupabase();
//       }, 3000);
//     };
//     // socketSupabase.onclose = function () {
//     //   alert("6 - SUPABASE CERRADO");
//     // };
//   } catch (e) {
//     // alert("7 - EXCEPCION");
//     // alert(e.message);
//   }
// }
/*Se ejecuta supabase*/
//=========================================
// CONECTAR SUPABASE - GEMINI
//=========================================
// =========================================
// SUPABASE WEBSOCKET - app26.js (iPad)
// =========================================
function conectarSupabase() {
  try {
    socketSupabase = new WebSocket(
      "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0"
    );
    socketSupabase.onopen = function () {
      var mensaje = {
        topic: "realtime:partido:" + codigo,
        event: "phx_join",
        payload: {
          config: {
            broadcast: { ack: false, self: true },
            presence: { enabled: false },
            postgres_changes: []
          }
        },
        ref: "1",
        join_ref: "1"
      };
      socketSupabase.send(JSON.stringify(mensaje));
      iniciarHeartbeat();
    };
    socketSupabase.onmessage = function (evento) {
      var mensaje;
      try {
        mensaje = JSON.parse(evento.data);
      } catch (e) {
        return;
      }
      if (
        mensaje.event == "phx_reply" &&
        mensaje.payload &&
        mensaje.payload.status == "ok"
      ) {
        return;
      }
      if (
        mensaje.event == "broadcast" &&
        mensaje.payload &&
        mensaje.payload.payload
      ) {
        var comando = mensaje.payload.payload.comando;
        // 1. SOLICITUD DE VERIFICACIÓN
        if (comando == "verificar") {
          var respuesta = {
            topic: "realtime:partido:" + codigo,
            event: "broadcast",
            payload: {
              type: "broadcast",
              event: "respuesta",
              payload: {
                respuesta: "codigo_ok",
                codigo: codigo // 👈 AQUÍ SE ENVÍA EL CÓDIGO REAL DEL IPAD
              }
            },
            ref: "3"
          };
          socketSupabase.send(JSON.stringify(respuesta));
          return;
        }
        // 2. PAUSAR
        if (comando == "pausar") {
          corriendo = false;
          estado.innerHTML = "PAUSADO DESDE CONTROL";
          return;
        }
        // 3. REANUDAR (INICIA / CONTINÚA EL PARTIDO)
        if (comando == "reanudar") {
          corriendo = true;
          ultimoTick = Date.now();
          estado.innerHTML = "EN JUEGO";
          return;
        }
      }
      // 4. GOL AZUL
      if (comando == "golAzul") {
        golesAzul++;
        corriendo = false; // Pausa el cronómetro al haber un gol
        estado.innerHTML = "¡GOL AZUL!";
        if (divGolAzul) divGolAzul.innerHTML = golesAzul;
        return;
      }
      // 5. GOL ROJO
      if (comando == "golRojo") {
        golesRojo++;
        corriendo = false; // Pausa el cronómetro al haber un gol
        estado.innerHTML = "¡GOL ROJO!";
        if (divGolRojo) divGolRojo.innerHTML = golesRojo;
        return;
      }
    };
    socketSupabase.onerror = function () {};
    socketSupabase.onclose = function () {
      supabaseConectado = false;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(function () {
        conectarSupabase();
      }, 3000);
    };
  } catch (e) {}
}
conectarSupabase();
