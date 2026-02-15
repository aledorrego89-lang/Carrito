let cart = JSON.parse(localStorage.getItem('cart') || "[]");
const statusDiv = document.getElementById('status');
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');

// URL relativa del JSON de productos
const jsonUrl = "productos.json";

// Renderiza el carrito
function renderCart() {
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}`;
    cartList.appendChild(li);
    total += item.precio * item.cantidad;
  });
  totalSpan.textContent = total;
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Carga productos desde productos.json
async function fetchProducts() {
  try {
    statusDiv.textContent = "Conectando a la base de datos...";
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    window.products = data.productos;
    statusDiv.textContent = "Conectado a los productos ✅";
    console.log("Productos cargados:", data);
  } catch (e) {
    console.error(e);
    statusDiv.textContent = "Error al conectar: " + e;
  }
}

// Función para escanear productos con QR
function scanProduct() {
  if (!window.products) {
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

      const prod = window.products.find(p => p.codigo === decodedText);
      if (!prod) {
        alert("Producto no encontrado");
        return;
      }

      const qty = parseInt(prompt(`Cantidad de ${prod.nombre}:`, "1")) || 1;
      
      cart.push({
        nombre: prod.nombre,
        precio: prod.precio,
        cantidad: qty
      });

      renderCart();
      statusDiv.textContent = `Producto agregado: ${prod.nombre} x${qty}`;
    },
    errorMessage => {
      // console.log("QR scan error: ", errorMessage);
    }
  ).catch(err => {
    console.error(err);
    qrReaderDiv.style.display = "none";
  });
}

// Botón para escanear productos
document.getElementById('scan-products').addEventListener('click', scanProduct);

// Render inicial
renderCart();
fetchProducts();
