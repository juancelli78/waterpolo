//=========================================
// MARCADOR DIRECTO
// VERSION COMPATIBLE CON iOS 9.0
//=========================================

//=========================================
// CONFIGURACIÓN Y VARIABLES
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

//=========================================
// SUPABASE
//=========================================

var SUPABASE_URL =
  "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";

//=========================================
// COLORES
//=========================================

function cambiarFondo(color) {
  document.body.style.backgroundColor = color;
}

function cambiarNumero(color) {
  numero.style.color = color;
}

//=========================================
// EVITAR QUE LOS CONTROLES SUMEN PUNTO
//=========================================

function detenerClickMarcador(e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
  }

  fueTouch = true;
}

//=========================================
// ACTUALIZAR PANTALLA
//=========================================

function actualizar() {
  if (numero) {
    numero.innerHTML = String(contador);
  }
}

//=========================================
// GESTOS TÁCTILES
// SUMAR Y RESTAR
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
  /*
   * Si el toque comenzó sobre los controles
   * no hacemos nada con el marcador.
   */

  if (e && e.target) {
    var elemento = e.target;

    while (elemento && elemento !== document.body) {
      if (elemento.id === "controlesColor") {
        fueTouch = false;

        return;
      }

      elemento = elemento.parentNode;
    }
  }

  //=======================================
  // DESLIZAMIENTO
  //=======================================

  if (movio) {
    if (e.changedTouches && e.changedTouches[0]) {
      var finX = e.changedTouches[0].clientX;

      var finY = e.changedTouches[0].clientY;

      var dx = finX - inicioX;

      var dy = finY - inicioY;

      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
        if (contador > 0) {
          contador--;

          actualizar();
        }

        fueTouch = false;

        return;
      }
    }
  }

  //=======================================
  // TOQUE SIMPLE = SUMAR
  //=======================================

  contador++;

  actualizar();

  fueTouch = false;
}

//=========================================
// CLICK PARA PC
//=========================================

function clickDesktop(e) {
  /*
   * Si se hizo click sobre los controles
   * no modificar el marcador.
   */

  if (e && e.target) {
    var elemento = e.target;

    while (elemento && elemento !== document.body) {
      if (elemento.id === "controlesColor") {
        return;
      }

      elemento = elemento.parentNode;
    }
  }

  if (fueTouch) {
    fueTouch = false;

    return;
  }

  contador++;

  actualizar();
}

//=========================================
// HEARTBEAT
//=========================================

function iniciarHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(
    function () {
      if (socketSupabase && socketSupabase.readyState === 1) {
        var ping = {
          topic: "phoenix",

          event: "heartbeat",

          payload: {},

          ref: "heartbeat"
        };

        socketSupabase.send(JSON.stringify(ping));
      }
    },

    30000
  );
}

function detenerHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);

    heartbeatTimer = null;
  }
}

//=========================================
// CONEXIÓN WEBSOCKET
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

        ref: "1",

        join_ref: "1"
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
