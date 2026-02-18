let codigoActual = null; 
let html5QrCode;
const apiUrl = "/api/guardar_producto.php";
let timeoutBusqueda = null;
let guardando = false; // 🔹 FLAG para evitar doble envío

function procesarCodigo(codigoDetectado) {
  const codigo = codigoDetectado.trim();
  if (!codigo) return;
  if (codigo === codigoActual) return;

  codigoActual = codigo;
  playBeep();

  document.getElementById("codigo").innerText = codigoActual;
  buscarProductoServidor(codigoActual);

  const inputManual = document.getElementById("inputCodigoManual");
  if (inputManual) inputManual.value = "";
}

// ============================
// INICIAR ESCANEO
// ============================
function iniciarEscaneo() {
  if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 300, height: 100 }, formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
    (decodedText) => procesarCodigo(decodedText)
  ).catch(err => { 
    console.error(err); 
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
  const btnEliminar = document.getElementById("btnEliminar");

  try {
    const response = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.existe) {
      nombreInput.value = data.producto.nombre;
      precioInput.value = data.producto.precio;
      estado.innerText = "Producto existente en servidor - Puede editarlo";
      estado.style.color = "blue";
      btnEliminar.style.display = "block";
    } else {
      nombreInput.value = "";
      precioInput.value = "";
      estado.innerText = "Producto nuevo";
      estado.style.color = "green";
      btnEliminar.style.display = "none";
    }
    nombreInput.focus();
  } catch (err) {
    console.error("Error buscando producto en servidor:", err);
    estado.innerText = "Error al consultar servidor";
    estado.style.color = "red";
  }
}

// ============================
// GUARDAR PRODUCTO
// ============================
async function guardarProducto() {
  if (guardando) return; // 🔹 evitar doble submit
  guardando = true;

  if (!codigoActual) {
    const codigoManual = document.getElementById("inputCodigoManual").value.trim();
    if (!codigoManual) {
      mostrarToast("Ingresá o escaneá un código primero", "info");
      guardando = false;
      return;
    }
    codigoActual = codigoManual;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);

  if (!nombre || !precio) {
    mostrarToast("Completá nombre y precio", "info");
    guardando = false;
    return;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: codigoActual, nombre, precio })
    });
    const data = await res.json();

    if (data.success) {
      mostrarToast("Producto guardado en servidor ✅", "success");
      limpiarFormulario();
      if (html5QrCode) html5QrCode.clear();
      codigoActual = null;
    } else {
      mostrarToast("Error al guardar: " + (data.error || "desconocido"), "error");
    }
  } catch (err) {
    console.error(err);
    mostrarToast("Error al guardar en servidor", "error");
  } finally {
    guardando = false;
  }
}

// ============================
// ELIMINAR PRODUCTO
// ============================
function eliminarProducto() {
  if (!codigoActual) {
    mostrarToast("Ingresá o escaneá un código primero", "info");
    return;
  }

  Swal.fire({
    title: '¿Seguro que querés eliminar este producto?',
    text: "Esta acción no se puede deshacer",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/eliminar_producto.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: codigoActual })
        });
        const data = await res.json();

        if (data.success) {
          mostrarToast("Producto eliminado ✅", "success"); // 🔹 CORREGIDO
          limpiarFormulario();
          if (html5QrCode) html5QrCode.clear();
          codigoActual = null;
        } else {
          mostrarToast("Error al eliminar: " + (data.error || "desconocido"), "error");
        }
      } catch (err) {
        console.error(err);
        mostrarToast("Error al eliminar", "error");
      }
    }
  });
}

// ============================
// OTROS
// ============================
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}

function limpiarFormulario() {
  document.getElementById('nombre').value = '';
  document.getElementById('precio').value = '';
  document.getElementById('inputCodigoManual').value = '';
  document.getElementById('codigo').textContent = '';
  document.getElementById('estado').textContent = '';
  document.getElementById('btnEliminar').style.display = 'none';
}
