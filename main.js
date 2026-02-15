let cart = JSON.parse(localStorage.getItem('cart') || "[]");
let jsonUrl = localStorage.getItem('jsonUrl') || "";
const statusDiv = document.getElementById('status');
const cartList = document.getElementById('cart-list');
const totalSpan = document.getElementById('total');
const qrReaderDiv = document.getElementById('qr-reader');

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

async function fetchProducts() {
  if (!jsonUrl) {
    statusDiv.textContent = "Escanea el QR del local primero";
    return;
  }
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


// Función para escanear QR
function scanQR(callback) {
  qrReaderDiv.style.display = "block";
  const html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => {
      html5QrCode.stop();
      qrReaderDiv.style.display = "none";
      callback(decodedText);
    },
    errorMessage => {
      // console.log("QR scan error: ", errorMessage);
    }
  ).catch(err => {
    console.error(err);
    qrReaderDiv.style.display = "none";
  });
}

// Escanear local
document.getElementById('scan-local').addEventListener('click', () => {
  scanQR(url => {
    jsonUrl = url;
    localStorage.setItem('jsonUrl', jsonUrl);
    fetchProducts();
  });
});

// Escanear producto
document.getElementById('scan-products').addEventListener('click', () => {
  if (!window.products) {
    alert("Primero conecta el local escaneando el QR");
    return;
  }

scanQR(url => {
  console.log("URL del QR:", url); // Verifica que sea correcta
  jsonUrl = url;
  localStorage.setItem('jsonUrl', jsonUrl);
  fetchProducts();
});


    const qty = parseInt(prompt(`Cantidad de ${prod.nombre}:`, "1")) || 1;
    
    cart.push({
      nombre: prod.nombre,
      precio: prod.precio,
      cantidad: qty
    });

    renderCart();
    statusDiv.textContent = `Producto agregado: ${prod.nombre} x${qty}`;
  });
});

// Render inicial
renderCart();
fetchProducts();
