

let codigoActual = null;
let html5QrCode;
const jsonUrl = "https://100.126.169.121/productos.json";
const apiUrl = "https://100.126.169.121/guardar_producto.php";

// ============================
// ESCANEAR CODIGO
// ============================
function iniciarEscaneo() {

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
  document.getElementById("codigo").value = decodedText;
  html5QrCode.stop();
  buscarProducto(decodedText);
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


// ============================
// BUSCAR PRODUCTO
// ============================
async function buscarProducto(codigo) {
  const response = await fetch(
    `https://100.126.169.121/buscar_producto.php?codigo=${codigo}`
  );

  const data = await response.json();

  const nombreInput = document.getElementById("nombre");
  const precioInput = document.getElementById("precio");
  const estado = document.getElementById("estado");

  if (data.existe) {
    nombreInput.value = data.producto.nombre;
    precioInput.value = data.producto.precio;
    estado.innerText = "Producto existente - Puede editarlo";
    estado.style.color = "orange";
  } else {
    nombreInput.value = "";
    precioInput.value = "";
    estado.innerText = "Producto nuevo";
    estado.style.color = "green";
  }
}

