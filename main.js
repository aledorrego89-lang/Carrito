let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const statusDiv = document.getElementById('status');
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const qrReaderDiv = document.getElementById('qr-reader');

// Modal elementos
const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalQty = document.getElementById('modal-qty');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const acceptBtn = document.getElementById('accept-product');

// JSON de productos local
const jsonUrl = "productos.json"; // debe estar en la misma carpeta que index.html

// Renderizar carrito
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

// Vaciar carrito
document.getElementById('clear-cart').addEventListener('click', () => {
  if (cart.length === 0) return;
  if (confirm("¿Estás seguro de vaciar todo el carrito?")) {
    cart = [];
    renderCart();
    statusDiv.textContent = "Carrito vacío";
  }
});

// Cargar productos JSON local
async function fetchProducts() {
  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    window.products = data.productos;
    statusDiv.textContent = "Productos listos ✅";
    console.log("Productos cargados:", data);
  } catch(e) {
    console.error(e);
    statusDiv.textContent = "Error al cargar productos: " + e;
  }
}

// Beep al escanear producto
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}

// Escanear QR
function scanQR(callback) {
  qrReaderDiv.style.display = "block";
  const html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      html5QrCode.stop();
      qrReaderDiv.style.display = "none";
      callback(decodedText);
    },
    errorMessage => {}
  ).catch(err => {
    console.error(err);
    qrReaderDiv.style.display = "none";
  });
}

// Escanear producto
document.getElementById('scan-products').addEventListener('click', () => {
  if (!window.products) {
    alert("No se han cargado los productos");
    return;
  }

  scanQR(code => {
    const prod = window.products.find(p => p.codigo === code);
    if (!prod) {
      alert("Producto no encontrado");
      return;
    }

    playBeep();

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
  });
});

// Inicializar
renderCart();
fetchProducts();
