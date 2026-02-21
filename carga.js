let codigoActual = null;
let html5QrCode;
const apiUrl = "/api/guardar_producto.php";
// let timeoutBusqueda = null;
let linternaEncendida = false;
let toastActivo = false;

let productos = []; // Se llenará desde el servidor

    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const loginContainer = document.getElementById('loginContainer');
    const mainContent = document.getElementById('mainContent');

//SPINNER

function showSpinner() {
    const spinner = document.getElementById("spinnerOverlay");
    console.log("showSpinner llamado, spinner:", spinner);
    if (spinner) {
        spinner.style.display = "flex";
        console.log("Spinner estilo actual:", spinner.style.display);
    } else {
        console.warn("No se encontró el spinnerOverlay en el DOM");
    }
}

function hideSpinner() {
    const spinner = document.getElementById("spinnerOverlay");
    console.log("hideSpinner llamado, spinner:", spinner);
    if (spinner) {
        spinner.style.display = "none";
        console.log("Spinner oculto, estilo actual:", spinner.style.display);
    }
}




// ============================
// TOAST
// ============================
function mostrarToast(mensaje, tipo = "info") {
    if (toastActivo) return; // ya hay un toast mostrando
    toastActivo = true;

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
        style: { color: "#000", fontWeight: "bold" },
        onClick: function(){},  // opcional
        callback: function(){ toastActivo = false; } // se libera al cerrar
    }).showToast();
}



// ============================
// LOGIN
// ============================
async function loginUsuario() {
    const valor = passwordInput.value.trim();
    mostrarToast("Iniciando sesion", "success"); // mostrar spinner
    setTimeout(() => console.log("Spinner debería ser visible ahora"), 0);
    console.log("Spinner debería verse ahora");

    try {
        const res = await fetch("/api/login.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: valor })
        });

        if (res.ok) {
            loginContainer.style.display = 'none';
            mainContent.style.display = 'block';
        } else {
            loginError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (err) {
        console.error(err);
        mostrarToast("Error de conexión", "error");
    } finally {
        hideSpinner();
    }
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
async function buscarProductoServidor(codigo, focoEn = "nombre") {
    const nombreInput = document.getElementById("nombre");
    const precioInput = document.getElementById("precio");
    const estado = document.getElementById("estado");
    const btnEliminar = document.getElementById("btnEliminar");
 showSpinner();
    try {
        const response = await fetch(
            `/api/buscar_producto.php?codigo=${codigo}`
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
hideSpinner();
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
        hideSpinner();
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
 showSpinner();
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
         hideSpinner();
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
             hideSpinner();
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


async function buscarProductosServidor(nombre) {
    showSpinner();

    try {
        const res = await fetch(`/api/listar_productos.php?nombre=${encodeURIComponent(nombre)}&limit=50`);
        if (!res.ok) throw new Error("Error servidor");

        const data = await res.json();
        mostrarProductos(data);

    } catch (err) {
        console.error("Error buscando productos:", err);
        mostrarToast("Error al buscar productos", "error");
    } finally {
        hideSpinner();
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


document.addEventListener("DOMContentLoaded", function () {

    // ============================
    // Cargar productos del servidor
    // ============================
    async function cargarProductos() {
         showSpinner();
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

    // ============================
        // Botón Listar productos
    // ============================



// document.getElementById("btnListarProductos").addEventListener("click", async function () {

//     const contenedor = document.getElementById("contenidoListado");
//  showSpinner();
//     if (contenedor.style.display === "none") {
//         contenedor.style.display = "block";
//         await cargarProductos();
//          hideSpinner();
//         this.textContent = "Ocultar productos";
//     } else {
//         contenedor.style.display = "none";
//         this.textContent = "Listar productos";
//         hideSpinner();
//     }

// });
document.getElementById("btnListarProductos").addEventListener("click", async function () {
    const contenedor = document.getElementById("contenidoListado");

    if (contenedor.style.display === "none") {
        contenedor.style.display = "block";
        this.textContent = "Ocultar productos";
    } else {
        contenedor.style.display = "none";
        this.textContent = "Listar productos";
    }
});

let timeoutBusqueda = null;

document.getElementById("filtroNombre").addEventListener("keyup", function() {

    clearTimeout(timeoutBusqueda);

    const texto = this.value.trim();

    // Evitar buscar si tiene menos de 2 letras
    if (texto.length < 2) {
        mostrarProductos([]); 
        return;
    }

    timeoutBusqueda = setTimeout(() => {
        buscarProductosServidor(texto);
    }, 300);
});
    // ============================
    // Filtrar productos
    // ============================
// function filtrarProductos() {
//     const nombre = document.getElementById("filtroNombre").value.toLowerCase();
//     const codigo = document.getElementById("filtroCodigo").value.toLowerCase();
//     const precioFiltro = document.getElementById("filtroPrecio").value; // string

//     const filtrados = productos.filter(p => {
//         const matchNombre = p.nombre.toLowerCase().includes(nombre);
//         const matchCodigo = p.codigo.toLowerCase().includes(codigo);

//         let matchPrecio = true;
//         if (precioFiltro) {
//             // Convertimos el precio del producto a string y buscamos coincidencia parcial
//             matchPrecio = p.precio.toString().startsWith(precioFiltro);
//         }

//         return matchNombre && matchCodigo && matchPrecio;
//     });

//     mostrarProductos(filtrados);
// }

// ============================
// FOCUS INPUT CÓDIGO CON F3
// ============================

document.addEventListener("keydown", function(e) {
    if (e.key === "F3") {
        e.preventDefault(); // evita la búsqueda del navegador en cualquier caso
        const inputCodigo = document.getElementById("inputCodigoManual");
        if (inputCodigo) {
            inputCodigo.focus();
            inputCodigo.select(); // opcional: selecciona el contenido
        }
    }
});


//filtrado

function buscarFiltrado() {
    clearTimeout(timeoutBusqueda);

    const nombre = document.getElementById("filtroNombre").value.trim();
    const precio = document.getElementById("filtroPrecio").value.trim();
    const codigo = document.getElementById("filtroCodigo").value.trim();

    // No buscar si todos los campos están vacíos
    if (!nombre && !precio && !codigo) {
        mostrarProductos([]); // limpia la tabla
        return;
    }

    timeoutBusqueda = setTimeout(async () => {
        showSpinner();
        try {
            const params = new URLSearchParams();
            if (nombre) params.append("nombre", nombre);
            if (precio) params.append("precio", precio);
            if (codigo) params.append("codigo", codigo);
            params.append("limit", 50);

            const res = await fetch(`/api/listar_productos.php?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            mostrarProductos(data);
        } catch (err) {
            console.error("Error buscando productos:", err);
            mostrarToast("Error al buscar productos", "error");
        } finally {
            hideSpinner();
        }
    }, 300); // delay para no saturar el servidor
}

// Eventos para los filtros
document.getElementById("filtroNombre").addEventListener("keyup", buscarFiltrado);
document.getElementById("filtroPrecio").addEventListener("keyup", buscarFiltrado);
document.getElementById("filtroCodigo").addEventListener("keyup", buscarFiltrado);


    // ============================
    // Eventos de filtros
    // ============================
    // document.getElementById("filtroNombre").addEventListener("keyup", filtrarProductos);
    // document.getElementById("filtroCodigo").addEventListener("keyup", filtrarProductos);
    // document.getElementById("filtroPrecio").addEventListener("keyup", filtrarProductos);

    // ============================
    // Exportar a Excel
    // ============================
document.getElementById("btnExportExcel").addEventListener("click", async () => {
    showSpinner();
    try {
        // Si querés traer la lista actual del servidor:
        const res = await fetch("/api/listar_productos.php");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const productos = await res.json();

        if (!productos.length) {
            mostrarToast("No hay productos para exportar", "info");
            return;
        }

        // Crear hoja Excel
        const ws = XLSX.utils.json_to_sheet(productos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Productos");

        // Descargar archivo Excel
        XLSX.writeFile(wb, "productos.xlsx");

    } catch (err) {
        console.error("Error exportando Excel:", err);
        mostrarToast("Error al exportar Excel", "error");
    } finally {
        hideSpinner(); // ⬅️ siempre ocultar spinner
    }
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
         showSpinner();
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


//**************** EXEL *********************************

// btnExportExcel.addEventListener("click", async () => {
//      showSpinner();
//     try {
//         const res = await fetch("/api/listar_productos.php");
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const productos = await res.json();

//         if (!productos.length) {
//             mostrarToast("No hay productos para exportar", "info");
//             return;
//         }

//         // Convertimos JSON a hoja
//         const ws = XLSX.utils.json_to_sheet(productos);

//         // Generamos CSV directamente
//         const csv = XLSX.utils.sheet_to_csv(ws);

//         // Creamos blob descargable
//         const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

//         const link = document.createElement("a");
//         link.href = URL.createObjectURL(blob);
//         link.download = "productos.csv";
//         link.click();

//     } catch (err) {
//         console.error("Error exportando CSV:", err);
//         mostrarToast("Error al exportar CSV", "error");
//     }
// });

// document.getElementById("btnImportExcel").addEventListener("click", () => {
//     document.getElementById("inputImportExcel").click();
// });

// ============================
// IMPORTAR EXCEL
// ============================
document.getElementById("inputExcel").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showSpinner();

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(sheet);

        if (!excelData.length) {
            mostrarToast("El archivo está vacío", "info");
            hideSpinner();
            return;
        }

        // Map de productos actuales
        const productosMap = {};
        productos.forEach(p => productosMap[p.codigo] = p);

        const insertados = [];
        const actualizados = [];
        const eliminados = [];

        // Comparar Excel con productos existentes
        excelData.forEach(row => {
            const codigo = row.codigo?.toString().trim();
            if (!codigo) return;

            const nombre = row.nombre?.toString().trim() || "";
            const precio = parseFloat(row.precio) || 0;

            if (productosMap[codigo]) {
                // Existe → verificar cambios
                if (productosMap[codigo].nombre !== nombre || parseFloat(productosMap[codigo].precio) !== precio) {
                    actualizados.push({ codigo, nombre, precio });
                }
                delete productosMap[codigo]; // lo marcamos como procesado
            } else {
                insertados.push({ codigo, nombre, precio });
            }
        });

        // Productos que quedaron en productosMap → eliminar
        Object.keys(productosMap).forEach(codigo => {
            eliminados.push({ codigo });
        });

        // Enviar todo en un solo request
        const res = await fetch("/api/importar_productos.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ insertados, actualizados, eliminados })
        });

        const result = await res.json();

        if (result.success) {
            const resumenDiv = document.getElementById("resumenImport");
            resumenDiv.innerHTML = `
                <p>✅ Filas insertadas: ${insertados.length}</p>
                <p>✏️ Filas actualizadas: ${actualizados.length}</p>
                <p>🗑 Filas eliminadas: ${eliminados.length}</p>
            `;
            mostrarToast("Importación completada ✅", "success");
            await cargarProductos(); // recargar tabla
        } else {
            mostrarToast("Error al importar: " + (result.error || "desconocido"), "error");
        }

    } catch (err) {
        console.error(err);
        mostrarToast("Error al procesar Excel", "error");
    } finally {
        hideSpinner();
        e.target.value = ""; // limpiar input
    }
});

// ============================
// LECTOR USB - CARGA
// ============================

let usbBuffer = "";
let usbTimer = null;

document.addEventListener("keydown", (e) => {

    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

    if (e.key === "Enter") {
        if (usbBuffer.length > 5) {
            procesarCodigo(usbBuffer);
        }
        usbBuffer = "";
        return;
    }

    if (/^\d$/.test(e.key)) {
        usbBuffer += e.key;

        clearTimeout(usbTimer);
        usbTimer = setTimeout(() => {
            usbBuffer = "";
        }, 100);
    }
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

    // Click del botón
loginBtn.addEventListener('click', loginUsuario);

passwordInput.addEventListener('keyup', (e) => {
    if(e.key === 'Enter') {
        e.preventDefault();  // ⬅️ importante
        loginUsuario();
    }
});


});