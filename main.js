let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const qrReaderDiv = document.getElementById("scanner-container");
const apiUrl = "/api/guardar_producto.php";

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

// ============================
// MOSTRAR NOMBRE DEL NEGOCIO AL INICIAR
// ============================
async function verificarLocal(statusDiv) {
    statusDiv.textContent = "Conectando al local...";

    try {
        const url = `/api/status_local.php?t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        statusDiv.textContent = `Conectado a ${data.mensaje} ✔️`;
    } catch (err) {
        console.error("No se pudo conectar con la Raspi:", err);
        statusDiv.textContent = "Error de conexión ❌";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const statusDiv = document.getElementById('status');
    verificarLocal(statusDiv);
});

// ============================
// RENDER CARRITO
// ============================
function renderCart() {
    cartList.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        li.innerHTML = `
            <div>${item.nombre} x ${item.cantidad} - $${item.precio * item.cantidad}</div>
            <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">🗑️</button>
        `;

        cartList.appendChild(li);
        total += item.precio * item.cantidad;
    });

    totalSpan.textContent = total;
    localStorage.setItem('cart', JSON.stringify(cart));

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            cart.splice(idx, 1);
            renderCart();
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = "Producto eliminado";
        });
    });
}

// ============================
// BOTÓN VACÍAR CARRITO
// ============================
document.getElementById('clear-cart').addEventListener('click', () => {
    if (cart.length === 0) return;

    Swal.fire({
        title: '¿Estás seguro?',
        text: "Se vaciará todo el carrito",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            localStorage.removeItem('cart');
            renderCart();
            mostrarToast("Carrito vacío", "info");
        }
    });
});

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
// ERRORES
// ============================
const errorBox = document.getElementById('error-box');
function showError(message) { errorBox.textContent = message; errorBox.classList.remove('d-none'); }
function clearError() { errorBox.textContent = ""; errorBox.classList.add('d-none'); }

// ============================
// ESCANEAR Y CONSULTAR AL SERVIDOR
// ============================
async function scanQRServer() {
    qrReaderDiv.style.display = "block";

    if (html5QrCode) html5QrCode.clear();

    html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 100 }, formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
        async (decodedText) => {
            const codigo = decodedText.trim();

            if (codigo === lastScanned) return;
            lastScanned = codigo;

            html5QrCode.stop().then(() => html5QrCode.clear());
            qrReaderDiv.style.display = "none";
            playBeep();
            clearError();

            // Limpiar modal antes de cargar datos
            modalTitle.textContent = "Cargando...";
            modalPrice.textContent = "";
            modalQty.value = 1;

            try {
                const response = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                if (!data.existe) {
                    showError("Producto no encontrado: " + codigo);
                    return;
                }

                // Guardamos producto globalmente
                currentProduct = data.producto;
                modalTitle.textContent = currentProduct.nombre;
                modalPrice.textContent = `Precio: $${currentProduct.precio}`;
                modalQty.value = 1;

                productModal.show();
            } catch (err) {
                console.error(err);
                showError("Error al consultar servidor: " + err.message);
            }
        }
    ).then(() => {
        const line = document.createElement("div");
        line.className = "scan-line-green";
        document.getElementById("qr-reader").appendChild(line);
    }).catch(err => {
        console.error(err);
        qrReaderDiv.style.display = "none";
        showError("Error al iniciar el escáner");
    });
}

// ============================
// BOTÓN ESCANEAR
// ============================
document.getElementById('scan-products').addEventListener('click', () => {
    qrReaderDiv.style.display = "block";
    scanQRServer();
});

// ============================
// BOTONES DEL MODAL
// ============================
decreaseBtn.addEventListener('click', () => {
    if (modalQty.value > 1) modalQty.value--;
});

increaseBtn.addEventListener('click', () => {
    modalQty.value++;
});

acceptBtn.addEventListener('click', (event) => {
    event.preventDefault(); // evita recargar la página
    if (!currentProduct) return;

    const cantidad = parseInt(modalQty.value) || 1;
    cart.push({ nombre: currentProduct.nombre, precio: currentProduct.precio, cantidad });
    renderCart();
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = `Producto agregado: ${currentProduct.nombre} x${cantidad}`;
    productModal.hide();
    currentProduct = null;
    lastScanned = null;
});

// ============================
// INICIALIZAR
// ============================
renderCart();
