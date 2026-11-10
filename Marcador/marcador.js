// =========================================
// CONFIGURACION SUPABASE
// =========================================
var SUPABASE_URL =
  "wss://ggxizsrunwmzznnuaufg.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneGl6c3J1bndtenpubnVhdWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDE0NzMsImV4cCI6MjEwMTQ3NzQ3M30.YBDJTHR-RcckirDpUdA63OfFA9JT571tPLxSAAoRSuc&vsn=1.0.0";
// =========================================
// VARIABLES
// =========================================
var equipo = document.body.className;
var codigoPartido = "";
var socketMarcador = null;
var heartbeatTimer = null;
var reconexionTimer = null;
var contador = 0;
var numero = document.getElementById("contador");
var codigoVisible = document.getElementById("codigoVisible");
var estadoConexion = document.getElementById("estadoConexion");
var ingresoCodigo = document.getElementById("ingresoCodigo");
var codigoInput = document.getElementById("codigoInput");
var btnConectar = document.getElementById("btnConectar");
var mensajeCodigo = document.getElementById("mensajeCodigo");
// =========================================
// VARIABLES DE TOQUE Y DESLIZAMIENTO
// =========================================
var inicioX = 0;
var inicioY = 0;
var movio = false;
var fueTouch = false;
var toqueEnPaleta = false;
// =========================================
// SELECTOR DE COLORES
// =========================================
var btnPaleta = document.getElementById("btnPaleta");
var panelColores = document.getElementById("panelColores");
// Cada equipo guarda sus propios colores.
var claveColores = "waterpolo_colores_" + equipo;
var colorFondoActual = "";
var colorNumeroActual = "#ffffff";
// =========================================
// APLICAR COLORES
// =========================================
function aplicarColores() {
  if (colorFondoActual) {
    document.body.style.backgroundColor = colorFondoActual;
  }
  numero.style.color = colorNumeroActual;
}
// =========================================
// GUARDAR COLORES
// =========================================
function guardarColores() {
  try {
    var preferencias = {
      fondo: colorFondoActual,
      numero: colorNumeroActual
    };
    localStorage.setItem(claveColores, JSON.stringify(preferencias));
  } catch (e) {
    // Si el navegador no permite guardar,
    // los colores siguen funcionando durante la sesión.
  }
}
// =========================================
// RECUPERAR COLORES
// =========================================
function recuperarColores() {
  try {
    var guardado = localStorage.getItem(claveColores);
    if (guardado) {
      var preferencias = JSON.parse(guardado);
      if (preferencias.fondo && /^#[0-9A-Fa-f]{6}$/.test(preferencias.fondo)) {
        colorFondoActual = preferencias.fondo;
      }
      if (
        preferencias.numero &&
        /^#[0-9A-Fa-f]{6}$/.test(preferencias.numero)
      ) {
        colorNumeroActual = preferencias.numero;
      }
    }
  } catch (e) {
    // Utilizar colores originales.
  }
  aplicarColores();
}
// =========================================
// CAMBIAR COLOR
// =========================================
function cambiarColor(tipo, color) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return;
  }
  if (tipo === "fondo") {
    colorFondoActual = color;
  }
  if (tipo === "numero") {
    colorNumeroActual = color;
  }
  aplicarColores();
  guardarColores();
}
// =========================================
// ACTIVAR SELECTOR DE COLORES
// =========================================
function iniciarSelectorColores() {
  if (!btnPaleta || !panelColores) {
    return;
  }
  recuperarColores();
  btnPaleta.addEventListener("click", function (e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (panelColores.className.indexOf("abierto") === -1) {
      panelColores.className += " abierto";
    } else {
      panelColores.className = panelColores.className.replace("abierto", "");
    }
  });
  var botonesColor = panelColores.getElementsByTagName("button");
  for (var i = 0; i < botonesColor.length; i++) {
    botonesColor[i].addEventListener("click", function (e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      var tipo = this.getAttribute("data-tipo");
      var color = this.getAttribute("data-color");
      cambiarColor(tipo, color);
    });
  }
}
// =========================================
// INICIAR SELECTOR
// =========================================
iniciarSelectorColores();
// =========================================
// OBTENER CODIGO DE LA URL
// Ejemplo: ?codigo=A7K
// =========================================
function obtenerCodigoURL() {
  var parametros = window.location.search;
  var resultado = parametros.match(/[?&]codigo=([^&]+)/i);
  if (resultado && resultado[1]) {
    return decodeURIComponent(resultado[1]).toUpperCase();
  }
  return "";
}
// =========================================
// VALIDAR CODIGO
// =========================================
function validarCodigo(codigo) {
  return /^[A-Z0-9]{3}$/.test(codigo);
}
// =========================================
// MOSTRAR IDENTIFICACION
// =========================================
function mostrarCodigo() {
  codigoVisible.innerHTML = codigoPartido;
}
// =========================================
// ESTADO DE CONEXION
// =========================================
function cambiarEstado(texto) {
  estadoConexion.innerHTML = texto;
}
// =========================================
// CONECTAR MARCADOR A SU PARTIDO
// =========================================
function conectarMarcador() {
  if (!codigoPartido) {
    return;
  }
  // Evitar conexiones duplicadas
  if (socketMarcador && socketMarcador.readyState !== WebSocket.CLOSED) {
    return;
  }
  cambiarEstado("CONECTANDO...");
  try {
    socketMarcador = new WebSocket(SUPABASE_URL);
    socketMarcador.onopen = function () {
      // Canal individual del partido
      var joinMsg = {
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
        ref: "join_marcador",
        join_ref: "join_marcador"
      };
      socketMarcador.send(JSON.stringify(joinMsg));
      cambiarEstado("CONECTANDO AL PARTIDO");
      iniciarHeartbeat();
    };
    // =====================================
    // RECIBIR MENSAJES DEL CONTROL REMOTO
    // =====================================
    socketMarcador.onmessage = function (evento) {
      try {
        var respuesta = JSON.parse(evento.data);
        if (
          respuesta.event === "broadcast" &&
          respuesta.payload &&
          respuesta.payload.payload
        ) {
          var comando = respuesta.payload.payload.comando;
          // MARCADOR AZUL
          if (equipo === "azul" && comando === "golAzul") {
            contador++;
            actualizar();
          }
          // MARCADOR ROJO
          if (equipo === "rojo" && comando === "golRojo") {
            contador++;
            actualizar();
          }
        }
        // Confirmacion de conexion al canal
        if (
          respuesta.event === "phx_reply" &&
          respuesta.payload &&
          respuesta.payload.status === "ok"
        ) {
          cambiarEstado("CONECTADO");
        }
      } catch (error) {
        console.log("Error al recibir mensaje:", error);
      }
    };
    // =====================================
    // CIERRE DE CONEXION
    // =====================================
    socketMarcador.onclose = function () {
      detenerHeartbeat();
      cambiarEstado("DESCONECTADO");
      programarReconexion();
    };
    socketMarcador.onerror = function () {
      cambiarEstado("ERROR DE CONEXION");
    };
  } catch (error) {
    cambiarEstado("ERROR");
    console.log(error);
    programarReconexion();
  }
}
// =========================================
// HEARTBEAT
// MANTENER CONEXION ACTIVA
// =========================================
function iniciarHeartbeat() {
  detenerHeartbeat();
  heartbeatTimer = setInterval(function () {
    if (socketMarcador && socketMarcador.readyState === WebSocket.OPEN) {
      var ping = {
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: "heartbeat_marcador"
      };
      socketMarcador.send(JSON.stringify(ping));
    }
  }, 30000);
}
// =========================================
// DETENER HEARTBEAT
// =========================================
function detenerHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
// =========================================
// RECONEXION AUTOMATICA
// =========================================
function programarReconexion() {
  if (reconexionTimer) {
    return;
  }
  reconexionTimer = setTimeout(function () {
    reconexionTimer = null;
    socketMarcador = null;
    conectarMarcador();
  }, 3000);
}
// =========================================
// ACTUALIZAR NUMERO
// =========================================
function actualizar() {
  numero.innerHTML = contador;
}
// =========================================
// INGRESAR CODIGO MANUALMENTE
// =========================================
function confirmarCodigo() {
  var codigo = codigoInput.value.toUpperCase().trim();
  if (!validarCodigo(codigo)) {
    mensajeCodigo.innerHTML = "INGRESÁ UN CÓDIGO VÁLIDO DE 3 CARACTERES";
    return;
  }
  codigoPartido = codigo;
  mostrarCodigo();
  ingresoCodigo.style.display = "none";
  // Agregar código a la dirección de la página
  if (window.history && window.history.replaceState) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + "?codigo=" + codigoPartido
    );
  }
  conectarMarcador();
}
// =========================================
// BOTON CONECTAR
// =========================================
btnConectar.addEventListener("click", confirmarCodigo);
// =========================================
// INICIAR MARCADOR
// =========================================
function iniciarMarcador() {
  actualizar();
  var codigoURL = obtenerCodigoURL();
  if (validarCodigo(codigoURL)) {
    codigoPartido = codigoURL;
    mostrarCodigo();
    ingresoCodigo.style.display = "none";
    conectarMarcador();
  } else {
    ingresoCodigo.style.display = "block";
    cambiarEstado("ESPERANDO CODIGO");
  }
}
iniciarMarcador();
// =========================================
// DETECTAR FORMULARIO
// =========================================
function esFormulario(elemento) {
  while (elemento && elemento !== document.body) {
    if (elemento.id === "ingresoCodigo") {
      return true;
    }
    elemento = elemento.parentNode;
  }
  return false;
}
// =========================================
// DETECTAR SELECTOR DE COLORES
// =========================================
function esControlColor(elemento) {
  while (elemento && elemento !== document.body) {
    if (elemento.id === "controlesColor") {
      return true;
    }
    elemento = elemento.parentNode;
  }
  return false;
}
// =========================================
// INICIO DEL TOQUE
// =========================================
document.body.addEventListener(
  "touchstart",
  function (e) {
    if (esFormulario(e.target)) {
      return;
    }
    if (esControlColor(e.target)) {
      fueTouch = false;
      toqueEnPaleta = true;
      return;
    }
    toqueEnPaleta = false;
    fueTouch = true;
    movio = false;
    inicioX = e.touches[0].clientX;
    inicioY = e.touches[0].clientY;
  },
  false
);
// =========================================
// MOVIMIENTO DEL DEDO
// =========================================
document.body.addEventListener(
  "touchmove",
  function (e) {
    if (esFormulario(e.target) || toqueEnPaleta) {
      return;
    }
    var dx = e.touches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) {
      movio = true;
    }
  },
  false
);
// =========================================
// FINAL DEL TOQUE
// =========================================
document.body.addEventListener(
  "touchend",
  function (e) {
    if (esFormulario(e.target)) {
      return;
    }
    if (toqueEnPaleta || esControlColor(e.target)) {
      toqueEnPaleta = false;
      fueTouch = false;
      return;
    }
    if (movio) {
      var finX = e.changedTouches[0].clientX;
      var dx = finX - inicioX;
      // DESLIZAR HACIA LA DERECHA: RESTAR GOL
      if (dx > 40) {
        if (contador > 0) {
          contador--;
          actualizar();
        }
        return;
      }
    }
    // TOQUE NORMAL: SUMAR GOL
    contador++;
    actualizar();
  },
  false
);
// =========================================
// CLICK DE ESCRITORIO
// =========================================
document.body.addEventListener(
  "click",
  function (e) {
    if (esFormulario(e.target)) {
      return;
    }
    // No contar los toques sobre la paleta.
    if (esControlColor(e.target)) {
      fueTouch = false;
      return;
    }
    // Evitar duplicar el toque en celulares
    if (fueTouch) {
      fueTouch = false;
      return;
    }
    contador++;
    actualizar();
  },
  false
);
