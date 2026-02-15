let codigoActual = null;
let html5QrCode;
const apiUrl = "https://100.126.169.121/guardar_producto.php";

// ============================
// INICIAR ESCANEO
// ============================
function iniciarEscaneo() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("qr-reader");
  }

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 280, height: 100 }, formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
    (decodedText) => {
      playBeep();
      codigoActual = decodedText.trim();
      document.getElementById("codigo").innerText = codigoActual;
      buscarProductoServidor(codigoActual);
      
      // Aquí podés decidir si querés detener después de cada escaneo:
      // html5QrCode.stop().then(() => html5QrCode.clear());
    }
  ).catch(err => { console.error(err); alert("Error al iniciar cámara"); });
}

// ============================
// DETENER ESCANEO (BOTÓN OPCIONAL)
// ============================
function detenerEscaneo() {
  if (html5QrCode) {
    html5QrCode.stop()
      .then(() => html5QrCode.clear())
      .catch(err => console.error("Error al detener escáner:", err));
  }
}

// ============================
// BUSCAR PRODUCTO EN SERVIDOR
// ============================
async function buscarProductoServidor(codigo) {
  const nombreInput = document.getElementById("nombre");
  const precioInput = document.getElementById("precio");
  const estado = document.getElementById("estado");

  try {
    const response = await fetch(`https://100.126.169.121/buscar_producto.php?codigo=${codigo}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.existe) {
      nombreInput.value = data.producto.nombre;
      precioInput.value = data.producto.precio;
      estado.innerText = "Producto existente en servidor - Puede editarlo";
      estado.style.color = "blue";
    } else {
      nombreInput.value = "";
      precioInput.value = "";
      estado.innerText = "Producto nuevo";
      estado.style.color = "green";
    }
  } catch (err) {
    console.error("Error buscando producto en servidor:", err);
    estado.innerText = "Error al consultar servidor";
    estado.style.color = "red";
  }
}

// ============================
// GUARDAR PRODUCTO
// ============================
function guardarProducto() {
  if (!codigoActual) { alert("Escaneá un código primero"); return; }

  const nombre = document.getElementById("nombre").value;
  const precio = document.getElementById("precio").value;

  if (!nombre || !precio) { alert("Completá nombre y precio"); return; }

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo: codigoActual, nombre, precio: parseFloat(precio) })
  })
  .then(res => res.json())
  .then(data => alert("Producto guardado en servidor ✅"))
  .catch(err => { console.error(err); alert("Error al guardar en servidor"); });
}

// ============================
// BEEP
// ============================
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}
