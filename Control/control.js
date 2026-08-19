//=========================================
// VARIABLES
//=========================================
var pantallaConexion = document.getElementById("pantallaConexion");
var pantallaControl = document.getElementById("pantallaControl");
var codigo = document.getElementById("codigo");
var btnConectar = document.getElementById("btnConectar");
var btnCronometro = document.getElementById("btnCronometro");
var golAzul = document.getElementById("golAzul");
var golRojo = document.getElementById("golRojo");
var codigoPartido = "";
var pausado = false;
var bloqueado = false;
var codigoVerificado = false;
var verificacionTimer = null;
//=========================================
// SUPABASE
//=========================================
var heartbeatTimer = null;
var socketSupabase = null;
var supabaseConectado = false;
var SUPABASE_URL =
  "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";
//=========================================
// EVITAR DOBLE TOQUE
//=========================================
function ejecutarAccion(fn) {
  if (bloqueado) return;
  bloqueado = true;
  fn();
  setTimeout(function () {
    bloqueado = false;
  }, 200);
}
// =========================================
// 1. DESHABILITAR Y BLOQUEAR EL BOTÓN "ATRÁS" - PARA EVITAR ERRORES.
// =========================================
// Insertamos un estado falso en el historial del navegador
history.pushState(null, null, location.href);

window.onpopstate = function () {
  // Cada vez que intente ir atrás, lo volvemos a empujar al estado actual
  history.pushState(null, null, location.href);

  // Opcional: Podés avisarle al usuario
  alert("El botón 'Atrás' está desactivado durante el control del partido.");
};

// =========================================
// 2. BLOQUEAR LA "X", RECARGA O SALIDA ACCIDENTAL - PARA EVITAR ERRORES.
// =========================================
window.addEventListener("beforeunload", function (e) {
  // Si ya se verificó el código y está en el control, mostramos confirmación
  if (typeof codigoVerificado !== "undefined" && codigoVerificado) {
    // Cancelar el evento según el estándar de los navegadores
    e.preventDefault();

    // Para compatibilidad con navegadores viejos (iOS/Android)
    e.returnValue =
      "Se perderá la conexión con el cronómetro. ¿Seguro que querés salir?";
    return e.returnValue;
  }
});

//=========================================
// ENVIAR COMANDO
//=========================================
//=========================================
// ENVIAR COMANDO DE TIEMPO - CRONOMETRO - POR SUPABASE
//=========================================
function enviarComando(comando) {
  if (!supabaseConectado) {
    alert("SUPABASE NO CONECTADO");
    return;
  }
  var mensaje = {
    topic: "realtime:partido:" + codigoPartido,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "comando",
      payload: {
        comando: comando,
      },
    },
    ref: "2",
  };
  socketSupabase.send(JSON.stringify(mensaje));
}
//=========================================
// 2. ENVIAR COMANDO DE GOL (Marcadores Independientes) - POR SUPABASE
//=========================================
//=========================================
// CONTROL DE MARCADORES (INDEPENDIENTE)
//=========================================
var socketMarcador = null;
var heartbeatMarcadorTimer = null;

// Mantener viva la compuerta del marcador (Ping cada 30 segundos)
function iniciarHeartbeatMarcador() {
  if (heartbeatMarcadorTimer) clearInterval(heartbeatMarcadorTimer);

  heartbeatMarcadorTimer = setInterval(function () {
    if (socketMarcador && socketMarcador.readyState === WebSocket.OPEN) {
      var ping = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: "heartbeat_marcador",
      };
      socketMarcador.send(JSON.stringify(ping));
    }
  }, 30000);
}

function detenerHeartbeatMarcador() {
  if (heartbeatMarcadorTimer) {
    clearInterval(heartbeatMarcadorTimer);
    heartbeatMarcadorTimer = null;
  }
}

//=========================================
// ENVIAR COMANDO DE GOL
//=========================================
function enviarComandoGol(comando) {
  var SUPABASE_URL =
    "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";

  // Transmitir paquete al marcador
  function transmitirGol() {
    try {
      var mensaje = {
        topic: "realtime:partido:marcador",
        event: "broadcast",
        payload: {
          type: "broadcast",
          event: "comando",
          payload: {
            comando: comando,
          },
        },
        ref: "gol_ref",
      };
      socketMarcador.send(JSON.stringify(mensaje));
    } catch (err) {}
  }

  // 1. Si la compuerta ya está abierta, envía directamente
  if (socketMarcador && socketMarcador.readyState === WebSocket.OPEN) {
    transmitirGol();
    return;
  }

  // 2. Si no está conectada, abre la compuerta, activa el heartbeat y transmite
  try {
    socketMarcador = new WebSocket(SUPABASE_URL);

    socketMarcador.onopen = function () {
      var joinMsg = {
        topic: "realtime:partido:marcador",
        event: "phx_join",
        payload: {
          config: {
            broadcast: { ack: false, self: true },
            presence: { enabled: false },
            postgres_changes: [],
          },
        },
        ref: "join_gol",
        join_ref: "join_gol",
      };

      socketMarcador.send(JSON.stringify(joinMsg));

      // Inicia los latidos de mantenimiento para evitar el cierre por inactividad
      iniciarHeartbeatMarcador();

      // Transmite el gol 150ms después de unirse al canal
      setTimeout(function () {
        transmitirGol();
      }, 150);
    };

    socketMarcador.onclose = function () {
      detenerHeartbeatMarcador();
    };

    socketMarcador.onerror = function () {
      detenerHeartbeatMarcador();
    };
  } catch (e) {}
}

//=========================================
// ENVIAR VERIFICACION DE CODIGO
//=========================================
function enviarVerificacion() {
  var mensaje = {
    topic: "realtime:partido:" + codigoPartido,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "comando",
      payload: {
        comando: "verificar",
      },
    },
    ref: "2",
  };

  socketSupabase.send(JSON.stringify(mensaje));

  verificacionTimer = setTimeout(function () {
    if (!codigoVerificado) {
      alert("CÓDIGO INCORRECTO");

      socketSupabase.close();

      btnConectar.disabled = false;
      btnConectar.innerHTML = "CONECTAR";
    }
  }, 10000);
}

// //=========================================
// // CONECTAR CON SUPABASE - RTA DE GEMINI
// //=========================================
//=========================================
// CONECTAR CON SUPABASE (control.js)
//=========================================
function conectarSupabase() {
  try {
    socketSupabase = new WebSocket(SUPABASE_URL);

    socketSupabase.onopen = function () {
      var mensaje = {
        topic: "realtime:partido:" + codigoPartido,
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
    };

    socketSupabase.onmessage = function (evento) {
      try {
        var respuesta = JSON.parse(evento.data);

        // 1. SUPABASE ACEPTÓ EL CANAL
        if (
          respuesta.event == "phx_reply" &&
          respuesta.payload &&
          respuesta.payload.status == "ok"
        ) {
          supabaseConectado = true;
          enviarVerificacion();
          return;
        }

        // 2. FILTRAR Y PROCESAR ÚNICAMENTE LA RESPUESTA DEL IPAD
        if (
          respuesta.event == "broadcast" &&
          respuesta.payload &&
          respuesta.payload.payload
        ) {
          var payloadData = respuesta.payload.payload;

          // Ignorar comandos salientes del celular (como 'verificar')
          if (payloadData.comando === "verificar") {
            return;
          }

          // Solo evaluar si es una respuesta explícita del iPad
          if (
            payloadData.event === "respuesta" ||
            payloadData.respuesta === "codigo_ok" ||
            payloadData.codigo
          ) {
            var codigoDelIPad = payloadData.codigo || payloadData.respuesta;
            var ipadLimpio = String(codigoDelIPad).trim().toUpperCase();
            var celuLimpio = String(codigoPartido).trim().toUpperCase();

            // Validación del código
            if (
              ipadLimpio === celuLimpio ||
              payloadData.respuesta === "codigo_ok"
            ) {
              codigoVerificado = true;

              if (verificacionTimer) {
                clearTimeout(verificacionTimer);
              }

              // MENSAJE ÚNICO DE ÉXITO
              alert("CONECTADO CON ÉXITO");

              pantallaConexion.style.display = "none";
              pantallaControl.style.display = "block";

              // Configurar control listo para iniciar
              pausado = true;
              btnCronometro.innerHTML = "INICIAR / REANUDAR";
              btnCronometro.style.background = "#2e7d32";
            }
          }
        }
      } catch (e) {
        console.log("MENSAJE SUPABASE:", evento.data);
      }
    };

    socketSupabase.onerror = function () {
      supabaseConectado = false;
    };

    socketSupabase.onclose = function () {
      supabaseConectado = false;
    };
  } catch (e) {}
}
// //=========================================
// // CONECTAR CON SUPABASE
// //=========================================
// function conectarSupabase() {
//   try {
//     socketSupabase = new WebSocket(SUPABASE_URL);
//     socketSupabase.onopen = function () {
//       var mensaje = {
//         topic: "realtime:partido:" + codigoPartido,
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
//     };
//     socketSupabase.onmessage = function (evento) {
//       var respuesta;

//       try {
//         respuesta = JSON.parse(evento.data);

//         //=========================================
//         // 1. SUPABASE ACEPTÓ EL CANAL
//         //=========================================

//         if (
//           respuesta.event == "phx_reply" &&
//           respuesta.payload &&
//           respuesta.payload.status == "ok"
//         ) {
//           supabaseConectado = true;

//           enviarVerificacion();
//         }

//         //=========================================
//         // 2. RESPUESTA DEL IPAD
//         //=========================================

//         if (
//           respuesta.event == "broadcast" &&
//           respuesta.payload &&
//           respuesta.payload.payload &&
//           respuesta.payload.payload.codigo
//         ) {
//           var codigoDelIPad = respuesta.payload.payload.codigo;

//           var codigoDelCelular = codigoPartido;

//           //=========================================
//           // COMPARAR SOLAMENTE LOS DOS CODIGOS
//           //=========================================

//           if (codigoDelIPad == codigoDelCelular) {
//             alert("No entra al if");
//             alert(
//               `"Codigo del ipad:" & codigoDelIPad & "Codigo del celu:" & codigoDelCelular`,
//             );
//             codigoVerificado = true;

//             clearTimeout(verificacionTimer);

//             pantallaConexion.style.display = "none";
//             pantallaControl.style.display = "block";

//             pausado = false;

//             btnCronometro.innerHTML = "PAUSAR";
//             btnCronometro.style.background = "#d32f2f";
//           }
//         }
//       } catch (e) {
//         console.log("MENSAJE SUPABASE:", evento.data);
//       }
//     };
//     socketSupabase.onerror = function () {
//       supabaseConectado = false;
//     };
//     socketSupabase.onclose = function () {
//       supabaseConectado = false;
//     };
//   } catch (e) {}
// }
//=========================================
// PAUSAR CRONÓMETRO
//=========================================
function pausarCronometro() {
  if (pausado) return;
  pausado = true;
  btnCronometro.innerHTML = "REANUDAR";
  btnCronometro.style.background = "#2e7d32";
  enviarComando("pausar");
}
//=========================================
// REANUDAR CRONÓMETRO
//=========================================
function reanudarCronometro() {
  if (!pausado) return;
  pausado = false;
  btnCronometro.innerHTML = "PAUSAR";
  btnCronometro.style.background = "#d32f2f";
  enviarComando("reanudar");
}
//=========================================
// CONECTAR
//=========================================
btnConectar.onclick = function () {
  codigoPartido = codigo.value.toUpperCase().trim();
  if (codigoPartido.length != 3) {
    alert("Ingrese un código válido");
    return;
  }
  btnConectar.disabled = true;
  btnConectar.innerHTML = "CONECTANDO...";
  conectarSupabase();
};
//=========================================
// BOTÓN PRINCIPAL
//=========================================
btnCronometro.onclick = function () {
  ejecutarAccion(function () {
    if (pausado) {
      reanudarCronometro();
    } else {
      pausarCronometro();
    }
  });
};
//=========================================
// GOL AZUL
//=========================================
golAzul.onclick = function () {
  ejecutarAccion(function () {
    enviarComandoGol("golAzul");
    alert("GOL AZUL");
    pausarCronometro();
  });
};
//=========================================
// GOL ROJO
//=========================================
golRojo.onclick = function () {
  ejecutarAccion(function () {
    enviarComandoGol("golRojo");
    alert("GOL ROJO");
    pausarCronometro();
  });
};
