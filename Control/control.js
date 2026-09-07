//======================================================
// CONTROL - WATERPOLO
// Compatible con iOS 9 / Safari antiguo
// Supabase Realtime por WebSocket
//======================================================
//======================================================
// ELEMENTOS HTML
//======================================================
var pantallaConexion = document.getElementById("pantallaConexion");
var pantallaControl = document.getElementById("pantallaControl");
var codigo = document.getElementById("codigo");
var btnConectar = document.getElementById("btnConectar");
var btnCronometro = document.getElementById("btnCronometro");
var golAzul = document.getElementById("golAzul");
var golRojo = document.getElementById("golRojo");
//======================================================
// VARIABLES GENERALES
//======================================================
var codigoPartido = "";
var pausado = false;
var bloqueado = false;
var codigoVerificado = false;
var verificacionTimer = null;
//======================================================
// SUPABASE
//======================================================
var SUPABASE_URL =
  "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";
//======================================================
// CONEXIÓN PRINCIPAL - CRONÓMETRO
//======================================================
var socketSupabase = null;
var supabaseConectado = false;
var conectandoSupabase = false;
var heartbeatTimer = null;
var heartbeatTimeout = null;
var heartbeatNumero = 0;
var reconnectTimer = null;
//======================================================
// CONEXIÓN INDEPENDIENTE - MARCADOR
//======================================================
var socketMarcador = null;
var marcadorConectado = false;
var conectandoMarcador = false;
var heartbeatMarcadorTimer = null;
var heartbeatMarcadorTimeout = null;
var heartbeatMarcadorNumero = 0;
var reconnectMarcadorTimer = null;
var golPendiente = null;
//======================================================
// EVITAR DOBLE TOQUE
//======================================================
function ejecutarAccion(fn) {
  if (bloqueado) {
    return;
  }
  bloqueado = true;
  fn();
  setTimeout(function () {
    bloqueado = false;
  }, 200);
}
//======================================================
// BLOQUEAR BOTÓN ATRÁS
//======================================================
history.pushState(null, null, location.href);
window.onpopstate = function () {
  history.pushState(null, null, location.href);
  alert("El botón 'Atrás' está desactivado durante el control del partido.");
};
//======================================================
// BLOQUEAR SALIDA / RECARGA
//======================================================
window.addEventListener("beforeunload", function (e) {
  if (codigoVerificado) {
    e.preventDefault();
    e.returnValue =
      "Se perderá la conexión con el cronómetro. ¿Seguro que querés salir?";
    return e.returnValue;
  }
});
//======================================================
// HEARTBEAT - CRONÓMETRO
//======================================================
function iniciarHeartbeat() {
  detenerHeartbeat();
  heartbeatTimer = setInterval(function () {
    if (
      socketSupabase &&
      socketSupabase.readyState === WebSocket.OPEN &&
      supabaseConectado
    ) {
      heartbeatNumero++;
      var refHeartbeat = "hb_" + heartbeatNumero;
      var mensaje = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: refHeartbeat
      };
      try {
        socketSupabase.send(JSON.stringify(mensaje));
        if (heartbeatTimeout) {
          clearTimeout(heartbeatTimeout);
        }
        heartbeatTimeout = setTimeout(function () {
          // No llegó respuesta al heartbeat.
          // Consideramos que la conexión murió.
          if (socketSupabase && socketSupabase.readyState === WebSocket.OPEN) {
            try {
              socketSupabase.close();
            } catch (e) {}
          }
        }, 10000);
      } catch (e) {
        try {
          socketSupabase.close();
        } catch (err) {}
      }
    }
  }, 20000);
}
//======================================================
// DETENER HEARTBEAT - CRONÓMETRO
//======================================================
function detenerHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
}
//======================================================
// PROGRAMAR RECONEXIÓN - CRONÓMETRO
//======================================================
function programarReconectar() {
  if (reconnectTimer) {
    return;
  }
  if (!codigoPartido) {
    return;
  }
  reconnectTimer = setTimeout(function () {
    reconnectTimer = null;
    conectarSupabase();
  }, 3000);
}
//======================================================
// CONECTAR CON SUPABASE - CRONÓMETRO
//======================================================
function conectarSupabase() {
  if (!codigoPartido) {
    return;
  }
  if (conectandoSupabase) {
    return;
  }
  if (socketSupabase && socketSupabase.readyState === WebSocket.OPEN) {
    return;
  }
  conectandoSupabase = true;
  var socket = null;
  try {
    socket = new WebSocket(SUPABASE_URL);
    socketSupabase = socket;
  } catch (e) {
    conectandoSupabase = false;
    programarReconectar();
    return;
  }
  //====================================================
  // SOCKET ABIERTO
  //====================================================
  socket.onopen = function () {
    if (socket !== socketSupabase) {
      return;
    }
    conectandoSupabase = false;
    var mensaje = {
      topic: "realtime:partido:" + codigoPartido,
      event: "phx_join",
      payload: {
        config: {
          broadcast: {
            ack: false,
            self: true
          },
          presence: {
            enabled: false
          },
          postgres_changes: []
        }
      },
      ref: "join_1",
      join_ref: "join_1"
    };
    try {
      socket.send(JSON.stringify(mensaje));
    } catch (e) {
      try {
        socket.close();
      } catch (err) {}
    }
  };
  //====================================================
  // MENSAJES
  //====================================================
  socket.onmessage = function (evento) {
    if (socket !== socketSupabase) {
      return;
    }
    var respuesta;
    try {
      respuesta = JSON.parse(evento.data);
    } catch (e) {
      return;
    }
    //==================================================
    // RESPUESTA DEL HEARTBEAT
    //==================================================
    if (
      respuesta.event == "phx_reply" &&
      respuesta.ref &&
      String(respuesta.ref).indexOf("hb_") === 0
    ) {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
      return;
    }
    //==================================================
    // SUPABASE ACEPTÓ EL CANAL
    //==================================================
    if (
      respuesta.event == "phx_reply" &&
      respuesta.payload &&
      respuesta.payload.status == "ok"
    ) {
      supabaseConectado = true;
      iniciarHeartbeat();
      enviarVerificacion();
      return;
    }
    //==================================================
    // RESPUESTA DEL CRONÓMETRO / IPAD
    //==================================================
    if (
      respuesta.event == "broadcast" &&
      respuesta.payload &&
      respuesta.payload.payload
    ) {
      var payloadData = respuesta.payload.payload;
      // Ignorar nuestro propio "verificar"
      if (payloadData.comando === "verificar") {
        return;
      }
      //================================================
      // VALIDAR RESPUESTA DEL IPAD
      //================================================
      if (
        payloadData.event === "respuesta" ||
        payloadData.respuesta === "codigo_ok" ||
        payloadData.codigo
      ) {
        var codigoDelIPad = payloadData.codigo || payloadData.respuesta;
        var ipadLimpio = String(codigoDelIPad).trim().toUpperCase();
        var celuLimpio = String(codigoPartido).trim().toUpperCase();
        if (
          ipadLimpio === celuLimpio ||
          payloadData.respuesta === "codigo_ok"
        ) {
          codigoVerificado = true;
          if (verificacionTimer) {
            clearTimeout(verificacionTimer);
            verificacionTimer = null;
          }
          // Solo mostrar el mensaje la primera vez.
          if (pantallaConexion.style.display !== "none") {
            alert("CONECTADO CON ÉXITO");
          }
          pantallaConexion.style.display = "none";
          pantallaControl.style.display = "block";
          // El cronómetro empieza pausado.
          pausado = true;
          btnCronometro.innerHTML = "INICIAR / REANUDAR";
          btnCronometro.style.background = "#2e7d32";
        }
      }
    }
  };
  //====================================================
  // ERROR
  //====================================================
  socket.onerror = function () {
    if (socket !== socketSupabase) {
      return;
    }
    supabaseConectado = false;
  };
  //====================================================
  // CIERRE
  //====================================================
  socket.onclose = function () {
    if (socket !== socketSupabase) {
      return;
    }
    supabaseConectado = false;
    conectandoSupabase = false;
    detenerHeartbeat();
    // Si todavía no validamos el código,
    // no reconectar automáticamente.
    if (!codigoVerificado) {
      return;
    }
    // Si ya estábamos controlando el partido,
    // reconectar automáticamente.
    programarReconectar();
  };
}
//======================================================
// ENVIAR VERIFICACIÓN DE CÓDIGO
//======================================================
function enviarVerificacion() {
  if (!socketSupabase || socketSupabase.readyState !== WebSocket.OPEN) {
    return;
  }
  var mensaje = {
    topic: "realtime:partido:" + codigoPartido,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "comando",
      payload: {
        comando: "verificar"
      }
    },
    ref: "verificar"
  };
  try {
    socketSupabase.send(JSON.stringify(mensaje));
  } catch (e) {
    return;
  }
  // Solo iniciar temporizador si todavía
  // no verificamos el código.
  if (!codigoVerificado) {
    if (verificacionTimer) {
      clearTimeout(verificacionTimer);
    }
    verificacionTimer = setTimeout(function () {
      if (!codigoVerificado) {
        alert("CÓDIGO INCORRECTO");
        try {
          if (socketSupabase) {
            socketSupabase.close();
          }
        } catch (e) {}
        btnConectar.disabled = false;
        btnConectar.innerHTML = "CONECTAR";
        supabaseConectado = false;
      }
    }, 10000);
  }
}
//======================================================
// ENVIAR COMANDO AL CRONÓMETRO
//======================================================
function enviarComando(comando) {
  if (
    !supabaseConectado ||
    !socketSupabase ||
    socketSupabase.readyState !== WebSocket.OPEN
  ) {
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
        comando: comando
      }
    },
    ref: "comando"
  };
  try {
    socketSupabase.send(JSON.stringify(mensaje));
  } catch (e) {
    supabaseConectado = false;
    try {
      socketSupabase.close();
    } catch (err) {}
  }
}
//======================================================
// HEARTBEAT - MARCADOR
//======================================================
function iniciarHeartbeatMarcador() {
  detenerHeartbeatMarcador();
  heartbeatMarcadorTimer = setInterval(function () {
    if (
      socketMarcador &&
      socketMarcador.readyState === WebSocket.OPEN &&
      marcadorConectado
    ) {
      heartbeatMarcadorNumero++;
      var refHeartbeat = "hb_m_" + heartbeatMarcadorNumero;
      var mensaje = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: refHeartbeat
      };
      try {
        socketMarcador.send(JSON.stringify(mensaje));
        if (heartbeatMarcadorTimeout) {
          clearTimeout(heartbeatMarcadorTimeout);
        }
        heartbeatMarcadorTimeout = setTimeout(function () {
          if (socketMarcador && socketMarcador.readyState === WebSocket.OPEN) {
            try {
              socketMarcador.close();
            } catch (e) {}
          }
        }, 10000);
      } catch (e) {
        try {
          socketMarcador.close();
        } catch (err) {}
      }
    }
  }, 20000);
}
//======================================================
// DETENER HEARTBEAT - MARCADOR
//======================================================
function detenerHeartbeatMarcador() {
  if (heartbeatMarcadorTimer) {
    clearInterval(heartbeatMarcadorTimer);
    heartbeatMarcadorTimer = null;
  }
  if (heartbeatMarcadorTimeout) {
    clearTimeout(heartbeatMarcadorTimeout);
    heartbeatMarcadorTimeout = null;
  }
}
//======================================================
// RECONEXIÓN - MARCADOR
//======================================================
function programarReconectarMarcador() {
  if (reconnectMarcadorTimer) {
    return;
  }
  reconnectMarcadorTimer = setTimeout(function () {
    reconnectMarcadorTimer = null;
    conectarMarcador();
  }, 3000);
}
//======================================================
// CONECTAR MARCADOR
//======================================================
function conectarMarcador() {
  if (conectandoMarcador) {
    return;
  }
  if (socketMarcador && socketMarcador.readyState === WebSocket.OPEN) {
    return;
  }
  conectandoMarcador = true;
  var socket = null;
  try {
    socket = new WebSocket(SUPABASE_URL);
    socketMarcador = socket;
  } catch (e) {
    conectandoMarcador = false;
    programarReconectarMarcador();
    return;
  }
  //====================================================
  // MARCADOR - OPEN
  //====================================================
  socket.onopen = function () {
    if (socket !== socketMarcador) {
      return;
    }
    conectandoMarcador = false;
    var mensaje = {
      topic: "realtime:partido:marcador",
      event: "phx_join",
      payload: {
        config: {
          broadcast: {
            ack: false,
            self: true
          },
          presence: {
            enabled: false
          },
          postgres_changes: []
        }
      },
      ref: "join_marcador",
      join_ref: "join_marcador"
    };
    try {
      socket.send(JSON.stringify(mensaje));
    } catch (e) {
      try {
        socket.close();
      } catch (err) {}
    }
  };
  //====================================================
  // MARCADOR - MESSAGE
  //====================================================
  socket.onmessage = function (evento) {
    if (socket !== socketMarcador) {
      return;
    }
    var respuesta;
    try {
      respuesta = JSON.parse(evento.data);
    } catch (e) {
      return;
    }
    //==================================================
    // HEARTBEAT
    //==================================================
    if (
      respuesta.event == "phx_reply" &&
      respuesta.ref &&
      String(respuesta.ref).indexOf("hb_m_") === 0
    ) {
      if (heartbeatMarcadorTimeout) {
        clearTimeout(heartbeatMarcadorTimeout);
        heartbeatMarcadorTimeout = null;
      }
      return;
    }
    //==================================================
    // CANAL ACEPTADO
    //==================================================
    if (
      respuesta.event == "phx_reply" &&
      respuesta.payload &&
      respuesta.payload.status == "ok"
    ) {
      marcadorConectado = true;
      iniciarHeartbeatMarcador();
      // Si había un gol esperando,
      // enviarlo ahora.
      if (golPendiente) {
        transmitirGol(golPendiente);
        golPendiente = null;
      }
    }
  };
  //====================================================
  // MARCADOR - ERROR
  //====================================================
  socket.onerror = function () {
    if (socket !== socketMarcador) {
      return;
    }
    marcadorConectado = false;
  };
  //====================================================
  // MARCADOR - CLOSE
  //====================================================
  socket.onclose = function () {
    if (socket !== socketMarcador) {
      return;
    }
    marcadorConectado = false;
    conectandoMarcador = false;
    detenerHeartbeatMarcador();
    // El marcador se mantiene intentando reconectar.
    programarReconectarMarcador();
  };
}
//======================================================
// TRANSMITIR GOL AL MARCADOR
//======================================================
function transmitirGol(comando) {
  if (
    !socketMarcador ||
    socketMarcador.readyState !== WebSocket.OPEN ||
    !marcadorConectado
  ) {
    golPendiente = comando;
    conectarMarcador();
    return;
  }
  var mensaje = {
    topic: "realtime:partido:marcador",
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "comando",
      payload: {
        comando: comando
      }
    },
    ref: "gol"
  };
  try {
    socketMarcador.send(JSON.stringify(mensaje));
  } catch (e) {
    golPendiente = comando;
    marcadorConectado = false;
    try {
      socketMarcador.close();
    } catch (err) {}
  }
}
//======================================================
// ENVIAR COMANDO DE GOL
//======================================================
function enviarComandoGol(comando) {
  // Si el marcador está conectado,
  // enviar directamente.
  if (
    socketMarcador &&
    socketMarcador.readyState === WebSocket.OPEN &&
    marcadorConectado
  ) {
    transmitirGol(comando);
    return;
  }
  // Si no está conectado,
  // guardar el gol y conectar.
  golPendiente = comando;
  conectarMarcador();
}
//======================================================
// PAUSAR CRONÓMETRO
//======================================================
function pausarCronometro() {
  if (pausado) {
    return;
  }
  pausado = true;
  btnCronometro.innerHTML = "REANUDAR";
  btnCronometro.style.background = "#2e7d32";
  enviarComando("pausar");
}
//======================================================
// REANUDAR CRONÓMETRO
//======================================================
function reanudarCronometro() {
  if (!pausado) {
    return;
  }
  pausado = false;
  btnCronometro.innerHTML = "PAUSAR";
  btnCronometro.style.background = "#d32f2f";
  enviarComando("reanudar");
}
//======================================================
// BOTÓN CONECTAR
//======================================================
btnConectar.onclick = function () {
  codigoPartido = codigo.value.toUpperCase().trim();
  if (codigoPartido.length != 3) {
    alert("Ingrese un código válido");
    return;
  }
  btnConectar.disabled = true;
  btnConectar.innerHTML = "CONECTANDO...";
  codigoVerificado = false;
  supabaseConectado = false;
  conectarSupabase();
};
//======================================================
// BOTÓN PRINCIPAL
//======================================================
btnCronometro.onclick = function () {
  ejecutarAccion(function () {
    if (pausado) {
      reanudarCronometro();
    } else {
      pausarCronometro();
    }
  });
};
//======================================================
// GOL AZUL
//======================================================
golAzul.onclick = function () {
  ejecutarAccion(function () {
    enviarComandoGol("golAzul");
    alert("GOL AZUL");
    pausarCronometro();
  });
};
//======================================================
// GOL ROJO
//======================================================
golRojo.onclick = function () {
  ejecutarAccion(function () {
    enviarComandoGol("golRojo");
    alert("GOL ROJO");
    pausarCronometro();
  });
};
