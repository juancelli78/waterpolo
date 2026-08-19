// //=========================================
// // SUPABASE
// //=========================================
// var canalPartido = "A7F"; /*temporal*/
// var SUPABASE_URL = "https://ggxizsrunwmzznnuaufg.supabase.co";
// var SUPABASE_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc";
// var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// //=========================================
// // EQUIPO
// //=========================================
// var equipo = document.body.className;
// var codigoPartido = "";
// var canal = null;
// var contador = 0;
// var inicioX = 0;
// var inicioY = 0;
// var movio = false;
// var fueTouch = false;
// var numero = document.getElementById("contador");
// //=========================================
// // INICIO.  CONECTAR MARCADOR A SUPABASE
// //=========================================

// function conectarMarcador() {
//   canal = supabase.channel(
//     "partido-" + canalPartido,
//   ); /*reemplazar por codigoPartido*/

//   canal
//     .on("broadcast", { event: "comando" }, function (mensaje) {
//       var comando = mensaje.payload.comando;

//       if (equipo == "azul" && comando == "golAzul") {
//         contador++;
//         actualizar();
//       }

//       if (equipo == "rojo" && comando == "golRojo") {
//         contador++;
//         actualizar();
//       }
//     })
//     .subscribe(function (status) {
//       console.log("Marcador:", status);
//     });
// }

// conectarMarcador();

// //=========================================
// //FIN.  CONECTAR MARCADOR A SUPABASE
// //=========================================

// actualizar();
// function actualizar() {
//   numero.innerHTML = contador;
// }
// //===========================
// function touchStart(e) {
//   fueTouch = true;
//   movio = false;
//   inicioX = e.touches[0].clientX;
//   inicioY = e.touches[0].clientY;
// }
// //===========================
// function touchMove(e) {
//   var dx = e.touches[0].clientX - inicioX;
//   if (Math.abs(dx) > 40) {
//     movio = true;
//   }
// }
// //===========================
// function touchEnd(e) {
//   if (movio) {
//     var finX = e.changedTouches[0].clientX;
//     var dx = finX - inicioX;
//     if (dx > 40) {
//       if (contador > 0) {
//         contador--;
//         actualizar();
//       }
//       return;
//     }
//   }
//   contador++;
//   actualizar();
// }
// //===========================
// // Sólo para PC
// //===========================
// function clickDesktop() {
//   if (fueTouch) {
//     fueTouch = false;
//     return;
//   }
//   contador++;
//   actualizar();
// }

//=========================================
// MARCADOR DIRECTO (marcador.js) - VERSION GEMINI
//=========================================
//=========================================
// CONFIGURACIÓN Y VARIABLES (COMPATIBLE CON iOS 9.0)
//=========================================
var equipo = document.body.className;
var contador = 0;
var numero = document.getElementById("contador");
var socketSupabase = null;
var heartbeatTimer = null;

// Gestos táctiles
var inicioX = 0;
var inicioY = 0;
var movio = false;
var fueTouch = false;

var SUPABASE_URL =
  "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";

//=========================================
// 1. ACTUALIZAR PANTALLA
//=========================================
function actualizar() {
  if (numero) {
    numero.innerHTML = String(contador);
  }
}

//=========================================
// 2. GESTOS TÁCTILES (SUMAR Y RESTAR)
//=========================================
function touchStart(e) {
  fueTouch = true;
  movio = false;
  if (e.touches && e.touches[0]) {
    inicioX = e.touches[0].clientX;
    inicioY = e.touches[0].clientY;
  }
}

function touchMove(e) {
  if (e.touches && e.touches[0]) {
    var dx = e.touches[0].clientX - inicioX;
    var dy = e.touches[0].clientY - inicioY;

    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      movio = true;
    }
  }
}

function touchEnd(e) {
  if (movio) {
    if (e.changedTouches && e.changedTouches[0]) {
      var finX = e.changedTouches[0].clientX;
      var finY = e.changedTouches[0].clientY;
      var dx = finX - inicioX;
      var dy = finY - inicioY;

      // Deslizar para restar
      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
        if (contador > 0) {
          contador--;
          actualizar();
        }
        return;
      }
    }
  }

  // Toque simple para sumar
  contador++;
  actualizar();
}

function clickDesktop() {
  if (fueTouch) {
    fueTouch = false;
    return;
  }
  contador++;
  actualizar();
}

//=========================================
// 3. HEARTBEAT (MANTENER COMPUERTA ABIERTA)
//=========================================
function iniciarHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(function () {
    if (socketSupabase && socketSupabase.readyState === 1) {
      // 1 = WebSocket.OPEN
      var ping = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: "heartbeat",
      };
      socketSupabase.send(JSON.stringify(ping));
    }
  }, 30000);
}

function detenerHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

//=========================================
// 4. CONEXIÓN WEBSOCKET (SUPABASE)
//=========================================
function conectarWebSocket() {
  try {
    socketSupabase = new WebSocket(SUPABASE_URL);

    socketSupabase.onopen = function () {
      var mensaje = {
        topic: "realtime:partido:marcador",
        event: "phx_join",
        payload: {
          config: {
            broadcast: { ack: false, self: true },
            presence: { enabled: false },
            postgres_changes: [],
          },
        },
        ref: "1",
        join_ref: "1",
      };
      socketSupabase.send(JSON.stringify(mensaje));
      iniciarHeartbeat();
    };

    socketSupabase.onmessage = function (evento) {
      try {
        var mensaje = JSON.parse(evento.data);

        if (
          mensaje.event === "broadcast" &&
          mensaje.payload &&
          mensaje.payload.payload
        ) {
          var comando = mensaje.payload.payload.comando;

          if (equipo === "rojo" && comando === "golRojo") {
            contador++;
            actualizar();
          }

          if (equipo === "azul" && comando === "golAzul") {
            contador++;
            actualizar();
          }
        }
      } catch (e) {}
    };

    socketSupabase.onclose = function () {
      detenerHeartbeat();
      setTimeout(conectarWebSocket, 2000);
    };

    socketSupabase.onerror = function () {
      detenerHeartbeat();
    };
  } catch (e) {}
}

//=========================================
// INICIALIZACIÓN
//=========================================
actualizar();
conectarWebSocket();
