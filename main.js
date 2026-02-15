let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const statusDiv = document.getElementById('status');
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const qrReaderDiv = document.getElementById("scanner-container");

const apiUrl = "https://100.126.169.121/guardar_producto.php";
const jsonUrl = "https://100.126.169.121/productos.json";

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

// ============================
// Render carrito
// ============================
function renderCart() {
  cartList.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    li.innerHTML = `
      <div>${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}</div>
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
      statusDiv.textContent = "Producto eliminado";
    });
  });
}

// ============================
// Vaciar carrito
// ============================
document.getElementById('clear-cart').addEventListener('click', () => {
  if (cart.length === 0) return;
  if (confirm("¿Estás seguro de vaciar todo el carrito?")) {
    cart = [];
    localStorage.removeItem('cart');
    renderCart();
    statusDiv.textContent = "Carrito vacío";
  }
});

// ============================
// Beep
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
// Mostrar error
// ============================
const errorBox = document.getElementById('error-box');
function showError(message) { errorBox.textContent = message; errorBox.classList.remove('d-none'); }
function clearError() { errorBox.textContent = ""; errorBox.classList.add('d-none'); }

// ============================
// Obtener solo nombre del negocio al cargar
// ============================
async function fetchNegocio() {
  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Solo mostramos el nombre del negocio al inicio
    const negocio = data.mensaje || "Desconocido";
    statusDiv.textContent = `Conectado a ${negocio}`;
    console.log("Negocio:", negocio);

    return data.productos || [];
  } catch (e) {
    console.error("Fetch error:", e);
    showError(`Error de conexión: ${e.name} - ${e.message}`);
    statusDiv.textContent = "Error al conectar con servidor";
    return [];
  }
}

// ============================
// Escanear y consultar al servidor
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
        const response = await fetch(`https://100.126.238.13/buscar_producto.php?codigo=${codigo}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!data.existe) {
          showError("Producto no encontrado: " + codigo);
          return;
        }

        const prod = data.producto;
        modalTitle.textContent = prod.nombre;
        modalPrice.textContent = `Precio: $${prod.precio}`;
        modalQty.value = 1;
        productModal.show();

        decreaseBtn.onclick = () => { if(modalQty.value > 1) modalQty.value--; };
        increaseBtn.onclick = () => modalQty.value++;

        acceptBtn.onclick = () => {
          const cantidad = parseInt(modalQty.value) || 1;
          cart.push({ nombre: prod.nombre, precio: prod.precio, cantidad });
          renderCart();
          statusDiv.textContent = `Producto agregado: ${prod.nombre} x${cantidad}`;
          productModal.hide();
        };

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
// Botón escanear
// ============================
document.getElementById('scan-products').addEventListener('click', () => {
  scanQRServer();
});

// ============================
// Inicializar
// ============================
renderCart();
let products = [];
fetchNegocio().then(prod => { products = prod; });
