let codigoActual = null;
let html5QrCode;
const apiUrl = "/api/guardar_producto.php";
let timeoutBusqueda = null;
let linternaEncendida = false;

// ============================
// TOAST
// ============================
function mostrarToast(mensaje, tipo = "info") {
    let color = "#f3f321"; // amarillo por defecto

    if (tipo === "success") color = "#4CAF50";
    else if (tipo === "error") color = "#f44336";

    Toastify({
        text: mensaje,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: color,
        stopOnFocus: true,
        style: {
            color: "#000",
            fontWeight: "bold"
        }
    }).showToast();
}


// ============================
// PROCESAR CÓDIGO
// ============================
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
        {
            fps: 10,
            qrbox: { width: 300, height: 100 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.CODE_128
            ]
        },
        (decodedText) => {
            procesarCodigo(decodedText);
        }
    ).then(async () => {
        // Intentamos aplicar zoom 2x al track
        try {
            const track = html5QrCode.getState().stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
                const zoomValor = Math.min(2, capabilities.zoom.max);
                await track.applyConstraints({ advanced: [{ zoom: zoomValor }] });
                console.log(`Zoom aplicado: ${zoomValor}x`);
            } else {
                console.log("Tu cámara no soporta zoom");
            }
        } catch (err) {
            console.error("Error aplicando zoom:", err);
        }
    }).catch(err => {
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
async function buscarProductoServidor(codigo, focoEn = "nombre") {
    const nombreInput = document.getElementById("nombre");
    const precioInput = document.getElementById("precio");
    const estado = document.getElementById("estado");
    const btnEliminar = document.getElementById("btnEliminar");

    try {
        const response = await fetch(
            `/api/buscar_producto.php?codigo=${codigo}`
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.existe) {
            nombreInput.value = data.producto.nombre;
            precioInput.value = data.producto.precio;
            estado.innerText = "Producto existente en servidor - Puede editarlo";
            estado.style.color = "blue";
            nombreInput.focus();
            btnEliminar.style.display = "block";
        } else {
            nombreInput.value = "";
            precioInput.value = "";
            estado.innerText = "Producto nuevo";
            estado.style.color = "green";
            nombreInput.focus();
            btnEliminar.style.display = "none";
        }

                // Hacer foco según parámetro
        if (focoEn === "nombre") {
            nombreInput.focus();
            nombreInput.select();
        } else if (focoEn === "precio") {
            precioInput.focus();
            precioInput.select();
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
let guardando = false; // evita doble envío

async function guardarProducto() {
    if (guardando) return; // ya estamos guardando
    guardando = true;

    try {
        // Validar código
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
        const precio = document.getElementById("precio").value.trim();

        if (!nombre || !precio) {
            mostrarToast("Completá nombre y precio", "info");
            guardando = false;
            return;
        }

        // Llamada al servidor
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigo: codigoActual,
                nombre,
                precio: parseFloat(precio)
            })
        });

        // Validar que sea JSON
        let data;
        try {
            data = await res.json();
        } catch {
            mostrarToast("Error: respuesta inválida del servidor", "error");
            guardando = false;
            return;
        }

        // Mostrar toast según éxito o error
        if (data.success === true) {
            codigoActual = null;
            limpiarFormulario();
            mostrarToast("Producto guardado en servidor ✅", "success");
            if (html5QrCode) html5QrCode.clear();
        } else {
            mostrarToast("Error al guardar: " + (data.error || "Desconocido"), "error");
        }

    } catch (err) {
        console.error(err);
       mostrarToast("Error al guardar en servidor", "error");
    } finally {
        guardando = false; // liberamos para el próximo envío
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
        title: "¿Seguro que querés eliminar este producto?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        reverseButtons: true
    }).then((result) => {

        if (!result.isConfirmed) return;

        fetch("/api/eliminar_producto.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codigo: codigoActual })
        })
        .then(res => res.json())
        .then(data => {
            // Validamos que la API indique éxito
            if (data.success) {
                mostrarToast("Producto eliminado ✅", "success");
                limpiarFormulario();
                codigoActual = null;
            } else {
                mostrarToast("Error al eliminar: " + (data.error || "Desconocido"), "error");
            }
        })
        .catch(err => {
            console.error(err);
            mostrarToast("Error al eliminar en servidor", "error");
        });
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

// ============================
// LIMPIEZA
// ============================
function cancelarProducto() {
    limpiarFormulario();
    codigoActual = null;

    if (html5QrCode) {
        html5QrCode.stop()
            .then(() => html5QrCode.clear())
            .catch(err => console.error("Error al detener escáner:", err));
    }
}

function limpiarFormulario() {
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("inputCodigoManual").value = "";
    document.getElementById("codigo").textContent = "";
    document.getElementById("estado").textContent = "";
    document.getElementById("btnEliminar").style.display = "none";
}


// ============================
// Lista y busqueda de productos
// ============================

let productos = []; // Se llenará desde el servidor

document.addEventListener("DOMContentLoaded", function () {

    // ============================
    // Cargar productos del servidor
    // ============================
    async function cargarProductos() {
        try {
            const res = await fetch("/api/listar_productos.php");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            productos = await res.json();
            mostrarProductos(productos);
        } catch (err) {
            console.error("Error cargando productos:", err);
        }
    }

    // ============================
    // Mostrar productos en la tabla
    // ============================
function mostrarProductos(lista) {
    const tbody = document.querySelector("#tablaProductos tbody");
    tbody.innerHTML = "";

    lista.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${p.nombre}</td><td>${p.precio}</td><td>${p.codigo}</td>`;

        // Al hacer click en la fila, se carga el producto en el formulario
        tr.style.cursor = "pointer";
tr.addEventListener("click", () => {
    codigoActual = p.codigo;                          // Seteamos el código actual
    document.getElementById("inputCodigoManual").value = p.codigo; // <-- cargamos input manual
    buscarProductoServidor(p.codigo, "precio");       // Carga nombre, precio y da foco a precio

    // Hacer scroll al formulario
    document.getElementById("nombre").scrollIntoView({ behavior: "smooth", block: "center" });
});


        tbody.appendChild(tr);
    });
}



     // Botón Listar productos
    document.getElementById("btnListarProductos").addEventListener("click", cargarProductos);


    // ============================
    // Filtrar productos
    // ============================
    function filtrarProductos() {
        const nombre = document.getElementById("filtroNombre").value.toLowerCase();
        const codigo = document.getElementById("filtroCodigo").value.toLowerCase();
        const precio = document.getElementById("filtroPrecio").value.toLowerCase();

        const filtrados = productos.filter(p =>
            p.nombre.toLowerCase().includes(nombre) &&
            p.codigo.toLowerCase().includes(codigo) &&
            p.precio.toString().includes(precio)
        );

        mostrarProductos(filtrados);
    }

    // ============================
    // Eventos de filtros
    // ============================
    document.getElementById("filtroNombre").addEventListener("keyup", filtrarProductos);
    document.getElementById("filtroCodigo").addEventListener("keyup", filtrarProductos);
    document.getElementById("filtroPrecio").addEventListener("keyup", filtrarProductos);

    // ============================
    // Exportar a Excel
    // ============================
    document.getElementById("btnExportExcel").addEventListener("click", () => {
        const ws = XLSX.utils.json_to_sheet(productos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Productos");
        XLSX.writeFile(wb, "productos.xlsx");
    });

    // ============================
    // Cargar productos al inicio
    // ============================
    //cargarProductos();
});




// ============================
// LINTERNA
// ============================
let trackLinterna = null;

document.getElementById("btnLinterna").addEventListener("click", async () => {
    if (!trackLinterna) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            trackLinterna = stream.getVideoTracks()[0];
        } catch (err) {
            console.error(err);
            mostrarToast("No se pudo acceder a la cámara", "error");
            return;
        }
    }

    const capabilities = trackLinterna.getCapabilities();
    if (!capabilities.torch) {
        mostrarToast("Tu cámara no soporta linterna", "info");
        return;
    }

    linternaEncendida = !linternaEncendida;

    trackLinterna.applyConstraints({
        advanced: [{ torch: linternaEncendida }]
    }).catch(err => {
        console.error("Error al cambiar linterna:", err);
        mostrarToast("No se pudo activar linterna", "error");
    });

    mostrarToast(linternaEncendida ? "Linterna ON" : "Linterna OFF", "success");
});




document.getElementById("btnExportExcel").addEventListener("click", () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "productos.xlsx");
});



// ============================
// EVENTOS
// ============================
document.addEventListener("DOMContentLoaded", function () {

    const inputManual = document.getElementById("inputCodigoManual");
    const nombreInput = document.getElementById("nombre");
    const precioInput = document.getElementById("precio");
    const btnProcesar = document.getElementById("btnProcesarCodigo");

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

    nombreInput.addEventListener("keyup", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            precioInput.focus();
            precioInput.select();
        }
    });

    precioInput.addEventListener("keyup", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            guardarProducto();
        }
    });

});
