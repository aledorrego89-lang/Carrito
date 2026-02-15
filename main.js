let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const statusDiv = document.getElementById('status');
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');

// JSON relativo
const jsonUrl = "productos.json";
let products = [];

// Modal Bootstrap
const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const modalName = document.getElementById('modal-name');
const modalPrice = document.getElementById('modal-price');
const modalQty = document.getElementById('modal-qty');
const modalAccept = document.getElementById('modal-accept');
const incrementBtn = document.getElementById('increment-btn');
const decrementBtn = document.getElementById('decrement-btn');

// Incrementar cantidad
incrementBtn.addEventListener('click', () => {
  let current = parseInt(modalQty.value) || 1;
  modalQty.value = current + 1;
});

// Decrementar cantidad
decrementBtn.addEventListener('click', () => {
  let current = parseInt(modalQty.value) || 1;
  if (current > 1) modalQty.value = current - 1;
});

let currentProduct = null;

// Render carrito
function renderCart() {
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach(item => {
    const li = document.createElement('li');
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.textContent = `${item.nombre} x ${item.cantidad}`;
    const span = document.createElement('span');
    span.textContent = `$${item.precio * item.cantidad}`;
    li.appendChild(span);
    cartList.appendChild(li);
    total += item.precio * item.cantidad;
  });
  totalSpan.textContent = total;
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Cargar productos
async function fetchProducts() {
  try {
    statusDiv.textContent = "Conectando a la base de datos...";
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    products = data.productos;
    statusDiv.textContent = "Productos cargados ✅";
  } catch (e) {
    console.error(e);
    statusDiv.textContent = "Error al cargar productos: " + e;
  }
}

// Escanear producto
function scanProduct() {
  if (!products.length) {
    alert("No se han cargado los productos");
    return;
  }

  const qrReaderDiv = document.getElementById('qr-reader');
  qrReaderDiv.style.display = "block";
  const html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => {
      html5QrCode.stop();
      qrReaderDiv.style.display = "none";

      const prod = products.find(p => p.codigo === decodedText);
      if (!prod) {
        alert("Producto no encontrado");
        return;
      }
playBeep();
      currentProduct = prod;
      modalName.textContent = `Nombre: ${prod.nombre}`;
      modalPrice.textContent = `Precio unitario: $${prod.precio}`;
      modalQty.value = 1;
      productModal.show();
    },
    errorMessage => {
      // console.log("QR scan error: ", errorMessage);
    }
  ).catch(err => {
    console.error(err);
    qrReaderDiv.style.display = "none";
  });
}

// Aceptar producto en modal
modalAccept.addEventListener('click', () => {
  const qty = parseInt(modalQty.value) || 1;
  cart.push({
    nombre: currentProduct.nombre,
    precio: currentProduct.precio,
    cantidad: qty
  });
  renderCart();
  statusDiv.textContent = `Producto agregado: ${currentProduct.nombre} x${qty}`;
  productModal.hide();
});


function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine'; // tipo de onda
  oscillator.frequency.setValueAtTime(1000, ctx.currentTime); // 1000 Hz
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1); // dura 0.1 segundos
}



// Botón escanear
document.getElementById('scan-products').addEventListener('click', scanProduct);

// Inicial
renderCart();
fetchProducts();
