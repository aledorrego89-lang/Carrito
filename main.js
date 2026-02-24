let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const totalItemsSpan = document.getElementById('total-items');
const qrReaderDiv = document.getElementById("scanner-container");
const searchInput = document.getElementById('search-cart');
const statusDiv = document.getElementById('status');

const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalQty = document.getElementById('modal-qty');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const acceptBtn = document.getElementById('accept-product');
const cartSection = document.getElementById("cart-section");
const scanButton = document.getElementById('scan-products');
const superMode = document.getElementById('super-mode');

let html5QrCode;
let currentProduct = null;
let currentProductIndex = null;
let lastScanned = null;
let lastScanTime = 0;
let isProcessing = false;
let nombreLocal = "MI TIENDA";
let toastActivo = false;

/* ============================
   INIT
============================ */

document.addEventListener("DOMContentLoaded", async () => {
    actualizarTextoBoton();
    await verificarLocal();
    renderCart();
});

superMode.addEventListener("change", actualizarTextoBoton);

/* ============================
   FUNCION PRINCIPAL (USB + CAMARA)
============================ */

async function procesarCodigo(codigo) {

    if (isProcessing) return;

    codigo = codigo.trim().replace(/\D/g, "");
    if (codigo.length < 8 || codigo.length > 14) return;

    const now = Date.now();
    if (codigo === lastScanned && (now - lastScanTime < 1500)) return;

    isProcessing = true;
    lastScanned = codigo;
    lastScanTime = now;

    try {

        playBeep();
        clearError();

        const res = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data || !data.existe || !data.producto) {
            mostrarToast("Producto no encontrado: " + codigo, "warning");
            if (navigator.vibrate) navigator.vibrate(120);
            return;
        }

        currentProduct = data.producto;
        currentProductIndex = null;

        if (superMode.checked) {

            const existingIndex = cart.findIndex(p => p.nombre === currentProduct.nombre);

            if (existingIndex !== -1) {
                cart[existingIndex].cantidad += 1;
                const actualizado = cart.splice(existingIndex, 1)[0];
                cart.unshift(actualizado);
            } else {
                cart.unshift({
                    nombre: currentProduct.nombre,
                    precio: currentProduct.precio,
                    cantidad: 1
                });
            }

            renderCart(searchInput.value, 0);

        } else {

            modalTitle.textContent = currentProduct.nombre;
            modalPrice.textContent = `Precio: $${currentProduct.precio}`;
            modalQty.value = 1;
            productModal.show();
        }

    } catch (err) {
        showError("Error al consultar servidor: " + err.message);
    } finally {
        setTimeout(() => {
            isProcessing = false;
        }, 700);
    }
}

/* ============================
   SCANNER CAMARA
============================ */

async function scanQR() {

    clearError();
    qrReaderDiv.style.display = "block";

    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch (e) {}
        html5QrCode.clear();
    }

    html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 100 } },
        async (decodedText) => {

            await html5QrCode.pause();
            await procesarCodigo(decodedText);

            setTimeout(async () => {
                try { await html5QrCode.resume(); } catch (e) {}
            }, 700);
        }
    ).catch(err => {
        console.error(err);
        qrReaderDiv.style.display = "none";
        showError("Error al iniciar el escáner");
    });
}

scanButton.addEventListener('click', scanQR);

/* ============================
   LECTOR USB
============================ */

let usbBuffer = "";
let usbTimer = null;

document.addEventListener("keydown", (e) => {

    // ignorar si escribe en input
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
        }, 30); // 30ms distingue scanner de humano
    }
});

/* ============================
   CARRITO
============================ */

function renderCart(filter = "", highlightIndex = null) {

    cartList.innerHTML = "";
    let total = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {

        if (!item.nombre.toLowerCase().includes(filter.toLowerCase())) return;

        const li = document.createElement('li');
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        if (index === highlightIndex) {
            li.classList.add("flash-effect");
        }

        li.innerHTML = `
        <div>${item.nombre} x ${item.cantidad} - $${item.precio * item.cantidad}</div>
        <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">🗑️</button>
        `;

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

    cartSection.classList.toggle("d-none", cart.length === 0);
}

/* ============================
   MODAL
============================ */

decreaseBtn.addEventListener("click", () => {
    modalQty.value = Math.max(1, parseInt(modalQty.value) - 1);
});

increaseBtn.addEventListener("click", () => {
    modalQty.value = Math.max(1, parseInt(modalQty.value) + 1);
});

acceptBtn.onclick = (e) => {

    e.preventDefault();
    if (!currentProduct) return;

    const cantidad = parseInt(modalQty.value) || 1;

    cart.unshift({
        nombre: currentProduct.nombre,
        precio: currentProduct.precio,
        cantidad
    });

    renderCart();

    currentProduct = null;
    productModal.hide();
};

/* ============================
   UI
============================ */

function actualizarTextoBoton() {
    if (superMode.checked) {
        scanButton.textContent = "Escanear productos";
        scanButton.classList.replace("btn-primary", "btn-success");
    } else {
        scanButton.textContent = "Buscar precio";
        scanButton.classList.replace("btn-success", "btn-primary");
    }
}

function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

function mostrarToast(mensaje, tipo = "info") {

    if (toastActivo) return;
    toastActivo = true;

    let color = "#f3f321";
    if (tipo === "success") color = "#4CAF50";
    if (tipo === "error") color = "#f44336";

    Toastify({
        text: mensaje,
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: color,
        style: { color: "#000", fontWeight: "bold" },
        callback: function () { toastActivo = false; }
    }).showToast();
}

function showError(msg) {
    const errorBox = document.getElementById('error-box');
    errorBox.textContent = msg;
    errorBox.classList.remove('d-none');
}

function clearError() {
    const errorBox = document.getElementById('error-box');
    errorBox.textContent = "";
    errorBox.classList.add('d-none');
}

async function verificarLocal() {
    try {
        const res = await fetch(`/api/status_local.php?t=${Date.now()}`);
        const data = await res.json();
        nombreLocal = data.mensaje;
        statusDiv.textContent = `Conectado a ${data.mensaje} ✔️`;
    } catch {
        statusDiv.textContent = "Error de conexión ❌";
    }
}