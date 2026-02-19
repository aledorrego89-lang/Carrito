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

        // CLICK PARA EDITAR
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) return;
            currentProduct = item;
            modalTitle.textContent = item.nombre;
            modalPrice.textContent = `Precio: $${item.precio}`;
            modalQty.value = item.cantidad;
            productModal.show();
        });

        cartList.appendChild(li);
        total += item.precio * item.cantidad;
        totalItems += item.cantidad;
    });

    totalSpan.textContent = total;
    totalSpan.classList.add("text-success");
    setTimeout(() => totalSpan.classList.remove("text-success"), 500);
    totalItemsSpan.textContent = totalItems;

    localStorage.setItem('cart', JSON.stringify(cart));

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            cart.splice(idx, 1);
            renderCart(searchInput.value);
        });
    });
}


// ============================
// FILTRAR PRODUCTOS
// ============================
searchInput.addEventListener('input', () => renderCart(searchInput.value));

// ============================
// VACÍAR CARRITO
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
// ESCANEO QR
// ============================
async function scanQR() {
    qrReaderDiv.style.display = "block"; // importante que esté visible


 if (html5QrCode) {
    await html5QrCode.stop();
    html5QrCode.clear();
}
html5QrCode = new Html5Qrcode("qr-reader");
;

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

            modalTitle.textContent = "Cargando...";
            modalPrice.textContent = "";
            modalQty.value = 1;

            try {
                const res = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                if (!data.existe) {
                    statusDiv.textContent = `Producto no encontrado: ${codigo}`;
                    return;
                }

                currentProduct = data.producto;
                modalTitle.textContent = currentProduct.nombre;
                modalPrice.textContent = `Precio: $${currentProduct.precio}`;
                modalQty.value = 1;
                productModal.show();

            } catch (err) {
                console.error(err);
                statusDiv.textContent = "Error al consultar servidor";
            }
        }
    ).catch(err => {
        console.error(err);
        qrReaderDiv.style.display = "none";
        statusDiv.textContent = "Error al iniciar el escáner";
    });
}
// ============================
// BOTÓN ESCANEAR
// ============================
document.getElementById('scan-products').addEventListener('click', () => scanQR());


// ============================
// BOTONES DEL MODAL
// ============================
decreaseBtn.addEventListener('click', () => {
    if (modalQty.value > 1) modalQty.value--;
});
increaseBtn.addEventListener('click', () => modalQty.value++);

acceptBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    const cantidad = parseInt(modalQty.value) || 1;

    // Evitar duplicados
    const existing = cart.find(item => item.nombre === currentProduct.nombre);
    if (existing) {
        existing.cantidad += cantidad;
    } else {
        cart.push({ nombre: currentProduct.nombre, precio: currentProduct.precio, cantidad });
    }

    renderCart(searchInput.value);
    currentProduct = null;
    lastScanned = null;
    productModal.hide();
});

// ============================
// INICIALIZAR
// ============================
renderCart();
