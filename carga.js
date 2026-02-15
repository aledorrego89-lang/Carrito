

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
      codigoActual = decodedText;
      document.getElementById("codigo").innerText = decodedText;
      html5QrCode.stop();
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
function buscarProducto() {

  let codigo = document.getElementById("buscarCodigo").value;

  fetch(jsonUrl)
    .then(res => res.json())
    .then(productos => {

      if (productos[codigo]) {

        document.getElementById("resultado").innerHTML =
          "Nombre: " + productos[codigo].nombre +
          "<br>Precio: $" + productos[codigo].precio;

        codigoActual = codigo;
        document.getElementById("codigo").innerText = codigo;
        document.getElementById("nombre").value = productos[codigo].nombre;
        document.getElementById("precio").value = productos[codigo].precio;

      } else {
        document.getElementById("resultado").innerText = "Producto no encontrado";
      }

    });
}
