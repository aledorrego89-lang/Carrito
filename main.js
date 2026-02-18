// ============================
// VARIABLES GLOBALES
// ============================
let cart = JSON.parse(localStorage.getItem('cart') || "[]");
let html5QrCode;
let lastScanned = null;

// ============================
// FUNCIONES
// ============================

// Mostrar nombre del negocio y cargar productos
async function mostrarNegocio(statusDiv) {
    statusDiv.textContent = "Conectando...";
    try {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/productos.json?t=${Date.now()}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        console.log("Mensaje del JSON:", data.mensaje);
        statusDiv.textContent = data.mensaje || "Conectado";

        // Guardamos los productos globalmente
        window.products = data.productos || [];
        console.log("Productos:", window.products);

    } catch (err) {
        console.error("Error al conectar con el JSON:", err);
        statusDiv.textContent = "Error de conexión";
    }
}

// Renderizar carrito
function renderCart(cartList, totalSpan, statusDiv) {
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
            renderCart(cartList, totalSpan, statusDiv);
            statusDiv.textContent = "Producto eliminado";
        });
    });
}

// Beep
function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
    oscillator.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
}

// Mostrar errores
function showError(errorBox, message) {
    errorBox.textContent = message;
    errorBox.classList.remove('d-none');
}
function clearError(errorBox) {
    errorBox.textContent = "";
    errorBox.classList.add('d-none');
}

// Escanear QR y consultar servidor
async function scanQRServer(qrReaderDiv, modalElements, statusDiv, errorBox) {
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
            clearError(errorBox);

            // Limpiar modal antes de cargar datos
            modalElements.modalTitle.textContent = "Cargando...";
            modalElements.modalPrice.textContent = "";
            modalElements.modalQty.value = 1;

            try {
                const response = await fetch(`/api/buscar_producto.php?codigo=${codigo}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();

                if (!data.existe) {
                    showError(errorBox, "Producto no encontrado: " + codigo);
                    return;
                }

                const prod = data.producto;
                modalElements.modalTitle.textContent = prod.nombre;
                modalElements.modalPrice.textContent = `Precio: $${prod.precio}`;
                modalElements.modalQty.value = 1;

                modalElements.productModal.show();

                modalElements.decreaseBtn.onclick = () => { if (modalElements.modalQty.value > 1) modalElements.modalQty.value--; };
                modalElements.increaseBtn.onclick = () => modalElements.modalQty.value++;
                modalElements.acceptBtn.onclick = () => {
                    const cantidad = parseInt(modalElements.modalQty.value) || 1;
                    cart.push({ nombre: prod.nombre, precio: prod.precio, cantidad });
                    renderCart(modalElements.cartList, modalElements.totalSpan, statusDiv);
                    statusDiv.textContent = `Producto agregado: ${prod.nombre} x${cantidad}`;
                    modalElements.productModal.hide();
                };

            } catch (err) {
                console.error(err);
                showError(errorBox, "Error al consultar servidor: " + err.message);
            }
        }
    ).then(() => {
        const line = document.createElement("div");
        line.className = "scan-line-green";
        document.getElementById("qr-reader").appendChild(line);
    }).catch(err => {
        console.error(err);
        qrReaderDiv.style.display = "none";
        showError(errorBox, "Error al iniciar el escáner");
    });
}

// ============================
// INICIALIZACIÓN AL CARGAR DOM
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const statusDiv = document.getElementById('status');
    const cartList = document.getElementById('cart-list');
    const totalSpan = document.getElementById('total');
    const qrReaderDiv = document.getElementById("scanner-container");
    const errorBox = document.getElementById('error-box');

    // Modal Bootstrap
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const modalElements = {
        productModal,
        modalTitle: document.getElementById('modal-title'),
        modalPrice: document.getElementById('modal-price'),
        modalQty: document.getElementById('modal-qty'),
        decreaseBtn: document.getElementById('decrease'),
        increaseBtn: document.getElementById('increase'),
        acceptBtn: document.getElementById('accept-product'),
        cartList,
        totalSpan
    };

    // Inicializar carrito
    renderCart(cartList, totalSpan, statusDiv);

    // Mostrar nombre del negocio
    mostrarNegocio(statusDiv);

    // Botón escanear QR
    const scanBtn = document.getElementById('scan-products');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            qrReaderDiv.style.display = "block";
            scanQRServer(qrReaderDiv, modalElements, statusDiv, errorBox);
        });
    }

    // Botón vaciar carrito
    const clearBtn = document.getElementById('clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
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
                    renderCart(cartList, totalSpan, statusDiv);
                    mostrarToast("Carrito vacío", "info");
                }
            });
        });
    }
});
