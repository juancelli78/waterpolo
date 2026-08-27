/* =========================================
   LINKS DEL SISTEMA
========================================= */
const links = {
  cronometro: "https://juancelli78.github.io/waterpolo/Cronometro/",
  control: "https://juancelli78.github.io/waterpolo/Control/",
  marcadorA:
    "https://juancelli78.github.io/waterpolo/Marcador/contador%20A.html",
  marcadorB:
    "https://juancelli78.github.io/waterpolo/Marcador/contador%20B.html"
};
/* =========================================
   ASIGNAR LINKS
========================================= */
document.querySelector(".zona-cronometro").href = links.cronometro || "#";
document.querySelector(".zona-control").href = links.control || "#";
document.querySelector(".zona-marcador-a").href = links.marcadorA || "#";
document.querySelector(".zona-marcador-b").href = links.marcadorB || "#";


/* =========================================
   VIDEOS EN VERTICAL O HORIZONTAL
========================================= */
function actualizarVideo() {
  var video = document.getElementById("videoFondo");

  if (window.innerWidth > window.innerHeight) {
    video.src = "VideosBienvenida/1_ios.mp4";
  } else {
    video.src = "VideosBienvenida/2_ios.mp4";
  }

  video.load();

  video.play();
}

actualizarVideo();

window.addEventListener("resize", actualizarVideo);

