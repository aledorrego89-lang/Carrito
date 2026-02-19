let cart = JSON.parse(localStorage.getItem('cart') || "[]");

// Elementos DOM
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const totalItemsSpan = document.getElementById('total-items');
const qrReaderDiv = document.getElementById("scanner-container");
const searchInput = document.getElementById('search-cart');
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
// Verificar conexión con el local
// ============================
async function verificarLocal(statusDiv) {
    statusDiv.textContent = "Conectando al local...";
    try {
        const res = await fetch(`/api/status_local.php?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        statusDiv.textContent = `Conectado a ${data.mensaje} ✔️`;
    } catch (err) {
        console.error(err);
        statusDiv.textContent = "Error de conexión ❌";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const statusDiv = document.getElementById('status');
    verificarLocal(statusDiv);
    renderCart();
});

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

        li.addEventListener('click', e => {
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
    totalItemsSpan.textContent = totalItems;
    localStorage.setItem('cart', JSON.stringify(cart));

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            cart.splice(idx, 1);
            renderCart(searchInput.value);
        });
    });
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
// Beep al escanear
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
// Manejo errores
// ============================
const errorBox = document.getElementById('error-box');
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('d-none'); }
function clearError() { errorBox.textContent = ""; errorBox.classList.add('d-none'); }

// ============================
// Escaneo QR
// ============================
async function scanQR() {
    qrReaderDiv.style.display = "block";
    clearError();

    if (html5QrCode) await html5QrCode.stop().catch(()=>{}), html5QrCode.clear();
    html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 100 },
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
        async decodedText => {
            const codigo = decodedText.trim();
            if (codigo === lastScanned) return;
            lastScanned = codigo;

            await html5QrCode.stop().catch(()=>{});
            html5QrCode.clear();
            qrReaderDiv.style.display = "none";
            playBeep();

            // Limpiar modal
            modalTitle.textContent = "Cargando...";
            modalPrice.textContent = "";
            modalQty.value = 1;

            try {
                const res = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                if (!data.existe) {
                    showError("Producto no encontrado: " + codigo);
                    return;
                }

                currentProduct = data.producto;
                modalTitle.textContent = currentProduct.nombre;
                modalPrice.textContent = `Precio: $${currentProduct.precio}`;
                modalQty.value = 1;
                productModal.show();

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
document.getElementById('scan-products').addEventListener('click', scanQR);

// ============================
// Botones del modal
// ============================
decreaseBtn.addEventListener('click', () => { if (modalQty.value > 1) modalQty.value--; });
increaseBtn.addEventListener('click', () => { modalQty.value++; });

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
