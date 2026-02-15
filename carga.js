

let codigoActual = null;
let html5QrCode;
const jsonUrl = "https://100.126.169.121/productos.json";
const apiUrl = "https://100.126.169.121/guardar_producto.php";


let productos = []; // variable global

// Cargar JSON al inicio
async function cargarProductos() {
  try {
    const res = await fetch("https://100.126.169.121/productos.json");
    const data = await res.json();
    productos = data.productos; // ahora tenemos todos los productos en memoria
    console.log("Productos cargados:", productos);
  } catch (err) {
    console.error("Error al cargar productos:", err);
  }
}

// Buscar producto localmente
function buscarProductoLocal(codigo) {
  const prod = productos.find(p => String(p.codigo).trim() === String(codigo).trim());
  const nombreInput = document.getElementById("nombre");
  const precioInput = document.getElementById("precio");
  const estado = document.getElementById("estado");

  if (prod) {
    nombreInput.value = prod.nombre;
    precioInput.value = prod.precio;
    estado.innerText = "Producto existente - Puede editarlo";
    estado.style.color = "orange";
  } else {
    nombreInput.value = "";
    precioInput.value = "";
    estado.innerText = "Producto nuevo";
    estado.style.color = "green";
  }
}

// Al iniciar la página
cargarProductos();

// ============================
// ESCANEAR CODIGO
// ============================
function iniciarEscaneo() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear(); // limpiar el lector
      startScan();          // iniciar nuevo escaneo
    }).catch(err => console.error("Error al reiniciar escáner:", err));
  } else {
    startScan();
  }
}

function startScan() {
  html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 280, height: 100 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_128
      ]
    },
    (decodedText) => {
      // Detener el escaneo después de leer un código
      html5QrCode.stop().then(() => html5QrCode.clear());
          playBeep();
      // Guardar código y buscar producto
      codigoActual = decodedText;
      document.getElementById("codigo").innerText = codigoActual;
      buscarProductoLocal(decodedText);
    }
  ).catch(err => {
    console.error(err);
    alert("Error al iniciar cámara");
  });
}


// ============================
// GUARDAR PRODUCTO
// ============================
function guardarProducto() {

  if (!codigoActual) {
    alert("Escaneá un código primero");
    return;
  }

  let nombre = document.getElementById("nombre").value;
  let precio = document.getElementById("precio").value;

  if (!nombre || !precio) {
    alert("Completá nombre y precio");
    return;
  }

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      codigo: codigoActual,
      nombre: nombre,
      precio: parseFloat(precio)
    })
  })
  .then(res => res.json())
  .then(data => {
    alert("Producto guardado en servidor ✅");
  })
  .catch(err => {
    console.error(err);
    alert("Error al guardar en servidor");
  });
}

// Beep al escanear producto
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}



