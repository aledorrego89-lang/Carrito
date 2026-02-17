let codigoActual = null;
let html5QrCode;
const apiUrl = "/api/guardar_producto.php";
let timeoutBusqueda = null;


function procesarCodigo(codigoDetectado) {
  const codigo = codigoDetectado.trim();

  if (!codigo) return;
  if (codigo === codigoActual) return;

  codigoActual = codigo;
  playBeep();

  document.getElementById("codigo").innerText = codigoActual;
  buscarProductoServidor(codigoActual);

  // Limpiar input manual
  const inputManual = document.getElementById("inputCodigoManual");
  if (inputManual) inputManual.value = "";
}

// ============================
// INICIAR ESCANEO
// ============================
function iniciarEscaneo() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("qr-reader");
  }

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 300, height: 100 }, formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
    (decodedText) => {


      // Evitar procesar el mismo código varias veces seguidas
procesarCodigo(decodedText);


    }
  ).catch(err => { console.error(err); 
    mostrarToast("Error al iniciar cámara", "error");
});
}

// ============================
// DETENER ESCANEO
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
    const response = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

   const btnEliminar = document.getElementById("btnEliminar");

if (data.existe) {
  nombreInput.value = data.producto.nombre;
  precioInput.value = data.producto.precio;
  estado.innerText = "Producto existente en servidor - Puede editarlo";
  estado.style.color = "blue";
 nombreInput.focus();
  btnEliminar.style.display = "block"; // mostrar botón
} else {
  nombreInput.value = "";
  precioInput.value = "";
  estado.innerText = "Producto nuevo";
  estado.style.color = "green";
 nombreInput.focus();
  btnEliminar.style.display = "none"; // ocultar botón
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
  if (!codigoActual) {
  const codigoManual = document.getElementById("inputCodigoManual").value.trim();
  if (!codigoManual) {
mostrarToast("Ingresá o escaneá un código primero", "info");    return;
  }
  codigoActual = codigoManual; // 🔥 lo asignamos automáticamente
}


  const nombre = document.getElementById("nombre").value;
  const precio = document.getElementById("precio").value;

  if (!nombre || !precio) { 
    
    mostrarToast("Completá nombre y precio", "info");
    return; }

fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo: codigoActual, nombre, precio: parseFloat(precio) })
})
.then(async res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Intentar parsear JSON solo si es correcto
    let data;
    try {
        data = await res.json();
    } catch(e) {
        console.warn("Respuesta no es JSON, pero todo bien");
        data = {}; // fallback
    }

    // Limpiar y mostrar éxito
    codigoActual = null;
    limpiarFormulario();
    mostrarToast("Producto guardado en servidor ✅", "success");

    if (html5QrCode) html5QrCode.clear();
})
.catch(err => {
    console.error(err);
    mostrarToast("Error al guardar en servidor", "error");
});

}



function eliminarProducto() {
  if (!codigoActual) {
    mostrarToast("Ingresá o escaneá un código primero", "info");
    return;
  }

  // Confirmación elegante
  Swal.fire({
    title: '¿Seguro que querés eliminar este producto?',
    text: "Esta acción no se puede deshacer",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33', // rojo
    cancelButtonColor: '#3085d6', // azul
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      // 🔹 Aquí empieza la promesa de eliminación
      fetch("/api/eliminar_producto.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoActual })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          mostrarToast("Producto eliminado ✅", "success");
        } else {
          mostrarToast("Error: " + (data.error || "Desconocido"), "error");
          return;
        }

        // Limpiar todo
        document.getElementById("nombre").value = "";
        document.getElementById("precio").value = "";
        document.getElementById("codigo").innerText = "";
        document.getElementById("estado").innerText = "";
        document.getElementById("btnEliminar").style.display = "none";

        codigoActual = null;
   //     document.getElementById("inputCodigoManual").focus();
      })
      .catch(err => {
        console.error(err);
        mostrarToast("Error al eliminar", "error");
      });
      // 🔹 Cierra la promesa correctamente
    }
  });
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

function cancelarProducto() {
    // Limpiar todos los campos
    document.getElementById('nombre').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('inputCodigoManual').value = '';
    document.getElementById('codigo').textContent = '';
    document.getElementById('estado').textContent = '';

    // Ocultar botón eliminar si estaba visible
    document.getElementById('btnEliminar').style.display = 'none';

      codigoActual = null;

    // DETENER ESCANEO si está activo
    if (html5QrCode) {
        html5QrCode.stop()
            .then(() => html5QrCode.clear())
            .catch(err => console.error("Error al detener escáner:", err));
    }
}

function limpiarFormulario() {
    document.getElementById('nombre').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('inputCodigoManual').value = '';
    document.getElementById('codigo').textContent = '';
    document.getElementById('estado').textContent = '';
    document.getElementById('btnEliminar').style.display = 'none';
}


function mostrarToast(mensaje, tipo = "info") {
    let color = "#f3f321"; // azul por defecto (info)

    if (tipo === "success") color = "#4CAF50";
    else if (tipo === "error") color = "#f44336";

    Toastify({
        text: mensaje,
        duration: 3000,           // tiempo en ms
        close: true,              // botón de cerrar
        gravity: "top",        // top o bottom
        position: "center",        // left, center, right
        backgroundColor: color,
        stopOnFocus: true  ,       // pausa el toast si pasás el mouse
          style: {
            color: "#000",        // texto negro
            fontWeight: "bold"
        }
    }).showToast();
}


document.addEventListener("DOMContentLoaded", function () {

  const inputManual = document.getElementById("inputCodigoManual");
  const nombreInput = document.getElementById("nombre");
  const precioInput = document.getElementById("precio");
   const btnProcesar = document.getElementById("btnProcesarCodigo");

  // ENTER EN CÓDIGO
  inputManual.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarCodigo(this.value);
    }
  });

  btnProcesar.addEventListener("click", function () {
  const codigo = inputManual.value.trim();
  if (!codigo) return;

  procesarCodigo(codigo);
});

  // ENTER EN NOMBRE → PASA A PRECIO
  nombreInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      precioInput.focus();
      precioInput.select();
    }
  });

  // ENTER EN PRECIO → GUARDA
  precioInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      guardarProducto();
    }
  });

});
