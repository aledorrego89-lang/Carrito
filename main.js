let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const totalItemsSpan = document.getElementById('total-items');
const qrReaderDiv = document.getElementById("scanner-container");
const searchInput = document.getElementById('search-cart');
const statusDiv = document.getElementById('status');

// Modal Bootstrap
const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalQty = document.getElementById('modal-qty');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const acceptBtn = document.getElementById('accept-product');

let html5QrCode;
let lastScanned = null;
let currentProduct = null;
let currentProductIndex = null;
let linternaEncendida = false;
let trackLinterna = null;
let nombreLocal = "MI TIENDA";
// ============================
// Inicialización
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    await verificarLocal();
    renderCart();
});

// ============================
// Verificar conexión con el local
// ============================
async function verificarLocal() {
    statusDiv.textContent = "Conectando al local...";
    try {
        const res = await fetch(`/api/status_local.php?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
         nombreLocal = data.mensaje;
        statusDiv.textContent = `Conectado a ${data.mensaje} ✔️`;
    } catch (err) {
        console.error(err);
        statusDiv.textContent = "Error de conexión ❌";
    }
}

// ============================
// Renderizar carrito
// ============================
function renderCart(filter = "") {
    cartList.innerHTML = "";
    let total = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {
        if (!item.nombre.toLowerCase().includes(filter.toLowerCase())) return;

        const li = document.createElement('li');
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
            <div>${item.nombre} x ${item.cantidad} - $${item.precio * item.cantidad}</div>
            <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">🗑️</button>
        `;

        li.onclick = (e) => {
            if (e.target.classList.contains('remove-btn')) return;
            currentProductIndex = index;
            currentProduct = item;
            modalTitle.textContent = item.nombre;
            modalPrice.textContent = `Precio: $${item.precio}`;
            modalQty.value = item.cantidad;
            productModal.show();
        };

        li.querySelector('.remove-btn').onclick = (e) => {
            e.stopPropagation();
            cart.splice(index, 1);
            renderCart(searchInput.value);
        };

        cartList.appendChild(li);
        total += item.precio * item.cantidad;
        totalItems += item.cantidad;
    });

    totalSpan.textContent = total;
    totalItemsSpan.textContent = totalItems;
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ============================
// Filtrar productos
// ============================
searchInput.addEventListener('input', () => renderCart(searchInput.value));

// ============================
// Vaciar carrito
// ============================
document.getElementById('clear-cart').addEventListener('click', () => {
    if (!cart.length) return;
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Se vaciará todo el carrito",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(result => {
        if (result.isConfirmed) {
            cart = [];
            localStorage.removeItem('cart');
            renderCart();
        }
    });
});

// ============================
// Botones del modal (solo una vez)
// ============================
decreaseBtn.onclick = () => { modalQty.value = Math.max(1, parseInt(modalQty.value) - 1); };
increaseBtn.onclick = () => { modalQty.value = Math.max(1, parseInt(modalQty.value) + 1); };

acceptBtn.onclick = (e) => {
    e.preventDefault();
    if (!currentProduct) return;

    const cantidad = parseInt(modalQty.value) || 1;

    if (currentProductIndex !== null) {
        cart[currentProductIndex].cantidad = cantidad;
    } else {
        cart.push({ nombre: currentProduct.nombre, precio: currentProduct.precio, cantidad });
    }

    renderCart(searchInput.value);

    currentProduct = null;
    currentProductIndex = null;
    lastScanned = null;
    productModal.hide();
};

// ============================
// Escanear QR
// ============================

const superMode = document.getElementById('super-mode');
let lastScanTime = 0;

async function scanQR() {

    clearError();
    qrReaderDiv.style.display = "block";

    // Detener scanner anterior si existe
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e){}
        html5QrCode.clear();
        html5QrCode = null;
    }

    html5QrCode = new Html5Qrcode("qr-reader");

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
async (decodedText) => {

    const codigo = decodedText.trim();
    const now = Date.now();

    if (codigo === lastScanned && (now - lastScanTime < 1000)) return;

    lastScanned = codigo;
    lastScanTime = now;

    playBeep();
    clearError();

    try {
        const res = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data.existe) {
            showError("Producto no encontrado: " + codigo);
            return;
        }

        currentProduct = data.producto;
        currentProductIndex = null;

        if (superMode && superMode.checked) {

            // 🟢 MODO SUPER (scanner sigue abierto)

            const existingIndex = cart.findIndex(p => p.nombre === currentProduct.nombre);

if (existingIndex !== -1) {

    // 🔥 1. Incrementar cantidad
    cart[existingIndex].cantidad += 1;

    // 🔥 2. Sacarlo de su posición actual
    const productoActualizado = cart.splice(existingIndex, 1)[0];

    // 🔥 3. Insertarlo al inicio del array
    cart.unshift(productoActualizado);

} else {

    // 🔥 Nuevo producto → agregarlo arriba directamente
    cart.unshift({
        nombre: currentProduct.nombre,
        precio: currentProduct.precio,
        cantidad: 1
    });

}


            renderCart(searchInput.value);

        } else {

            // 🔵 MODO NORMAL (cerrar scanner y abrir modal)

            try { await html5QrCode.stop(); } catch(e){}
            html5QrCode.clear();
            qrReaderDiv.style.display = "none";

            modalTitle.textContent = currentProduct.nombre;
            modalPrice.textContent = `Precio: $${currentProduct.precio}`;
            modalQty.value = 1;
            productModal.show();
        }

    } catch (err) {
        showError("Error al consultar servidor: " + err.message);
    }
}

    ).catch(err => {
        console.error(err);
        qrReaderDiv.style.display = "none";
        showError("Error al iniciar el escáner");
    });
}

// Botón escanear
document.getElementById('scan-products')
    .addEventListener('click', scanQR);


// ============================
// Beep
// ============================
function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}


// ============================
// LINTERNA
// ============================


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



document.getElementById("btnTicket").addEventListener("click", generarTicket);

function generarTicket() {
    if (!cart.length) {
        Swal.fire("El carrito está vacío");
        return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 200] // tamaño tipo ticket térmico
    });

    let y = 10;

    doc.setFontSize(12);
doc.text(nombreLocal.toUpperCase(), 40, y, { align: "center" });    y += 6;

    doc.setFontSize(8);
    doc.text(new Date().toLocaleString(), 40, y, { align: "center" });
    y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    let total = 0;

    cart.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        doc.text(`${item.nombre}`, 5, y);
        y += 4;

        doc.text(`${item.cantidad} x $${item.precio}`, 5, y);
        doc.text(`$${subtotal}`, 75, y, { align: "right" });
        y += 6;
    });

    doc.line(5, y, 75, y);
    y += 6;

    doc.setFontSize(12);
    doc.text(`TOTAL: $${total}`, 75, y, { align: "right" });

    // Descargar automáticamente
    doc.save("ticket.pdf");

    // Vaciar carrito después de generar ticket
    cart = [];
    localStorage.removeItem("cart");
    renderCart();
}


// ============================
// Manejo errores
// ============================
const errorBox = document.getElementById('error-box');
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('d-none'); }
function clearError() { errorBox.textContent = ""; errorBox.classList.add('d-none'); }


