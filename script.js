let products = [];
let cart = [];
let currentProduct = null;
let currentOrderKey = ""; 

async function loadProducts() {
    try {
        const response = await fetch('menu.json');
        if (!response.ok) throw new Error('Error');
        products = await response.json();
        renderMenu();
    } catch (error) {
        document.getElementById('menu-grid').innerHTML = '<div style="text-align:center; padding:40px;">Error cargando menú. Usa Live Server.</div>';
    }
}

function renderMenu(filter = 'all', btnElement = null) {
    if (btnElement) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    const filtered = filter === 'all' ? products : products.filter(p => p.cat === filter);

    if(filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">No hay productos.</p>';
        return;
    }

    filtered.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`; 
        
        let imgContent = (p.img && p.img.trim() !== "") 
            ? `<img src="${p.img}" class="card-img" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-utensils no-image-icon\\'></i>'">`
            : `<i class="fas fa-utensils no-image-icon"></i>`;

        card.innerHTML = `
            <div class="card-img-container">${imgContent}</div>
            <div class="card-content">
                <h3 class="card-title">${p.name}</h3>
                <p class="card-ing">${p.desc}</p>
                <div class="card-footer">
                    <span class="price">$${p.price}</span>
                    <button class="add-btn" onclick="openProductModal(${p.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openProductModal(id) {
    currentProduct = products.find(p => p.id === id);
    if (!currentProduct) return;

    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('product-modal');
    
    let imgHTML = (currentProduct.img && currentProduct.img !== "") 
        ? `<img src="${currentProduct.img}" class="modal-img">`
        : `<div style="height:150px; background:#eee; display:flex; align-items:center; justify-content:center;"><i class="fas fa-utensils" style="font-size:3rem; color:#ccc;"></i></div>`;

    let optionsHTML = '';
    if (currentProduct.options && currentProduct.options.length > 0) {
        optionsHTML += `<div class="options-container"><span class="option-title">Elige una opción:</span><div class="option-group">`;
        currentProduct.options.forEach((opt, idx) => {
            const checked = idx === 0 ? 'checked' : ''; 
            const priceText = opt.extra > 0 ? `+ $${opt.extra}` : '';
            optionsHTML += `
                <label class="option-btn">
                    <input type="radio" name="prod-option" value="${opt.name}" data-extra="${opt.extra}" ${checked} onchange="updateModalPrice()">
                    <span class="option-check">
                        <span>${opt.name}</span>
                        <span style="font-weight:bold; color:#d4a373; font-size:0.9rem;">${priceText}</span>
                    </span>
                </label>`;
        });
        optionsHTML += `</div></div>`;
    }

    modalBody.innerHTML = `
        ${imgHTML}
        <div class="modal-info">
            <h2 class="modal-title">${currentProduct.name}</h2>
            <span class="modal-price-base">Base: $${currentProduct.price}</span>
        </div>
        ${optionsHTML}
    `;

    document.getElementById('product-note').value = '';
    updateModalPrice(); 
    modal.classList.add('active');
}

function updateModalPrice() {
    if (!currentProduct) return;
    let extraPrice = 0;
    const selectedOption = document.querySelector('input[name="prod-option"]:checked');
    if (selectedOption) extraPrice = parseFloat(selectedOption.getAttribute('data-extra')) || 0;
    const total = currentProduct.price + extraPrice;
    document.getElementById('modal-total-price').innerText = `$${total}`;
}

function closeModal() {
    document.getElementById('product-modal').classList.remove('active');
    currentProduct = null;
}

function confirmAddToCart() {
    if (!currentProduct) return;
    let selectedOptionName = null;
    let finalPrice = currentProduct.price; 
    const selectedRadio = document.querySelector('input[name="prod-option"]:checked');
    if (selectedRadio) {
        selectedOptionName = selectedRadio.value;
        const extra = parseFloat(selectedRadio.getAttribute('data-extra')) || 0;
        finalPrice += extra; 
    }
    const note = document.getElementById('product-note').value.trim();
    const cartItem = {
        ...currentProduct,
        cartId: Date.now(),
        selectedOption: selectedOptionName,
        note: note,
        finalPrice: finalPrice
    };
    cart.push(cartItem);
    updateCartDisplay();
    showToast(`Agregado: ${cartItem.name}`, 'success');
    closeModal();
    animateFab();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function updateCartDisplay() {
    const countBadge = document.getElementById('cart-count');
    const itemsContainer = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');

    countBadge.innerText = cart.length;
    countBadge.style.display = cart.length > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
        itemsContainer.innerHTML = `<div class="empty-msg"><i class="fas fa-shopping-basket" style="font-size:3rem; margin-bottom:10px;"></i><br>Tu carrito está vacío</div>`;
        totalElement.innerText = "$0.00";
    } else {
        itemsContainer.innerHTML = cart.map((item, i) => {
            let detailsHTML = '';
            if(item.selectedOption) detailsHTML += `<div style="font-size:0.8rem; color:#d4a373;">• ${item.selectedOption}</div>`;
            if(item.note) detailsHTML += `<div style="font-size:0.8rem; color:#888; font-style:italic;">Nota: ${item.note}</div>`;
            return `
            <div class="cart-item">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:0.95rem;">${item.name}</h4>
                    ${detailsHTML}
                    <small style="font-weight:bold; color:#4a4a4a;">$${item.finalPrice}</small>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${i})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        }).join('');
        const total = cart.reduce((acc, item) => acc + item.finalPrice, 0);
        totalElement.innerText = `$${total.toFixed(2)}`;
    }
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
    document.getElementById('cart-overlay').classList.toggle('open');
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; 
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    const color = type === 'success' ? '#4caf50' : '#ff5252';
    toast.innerHTML = `<i class="fas fa-${icon}" style="color:${color};"></i> ${msg}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300); // 400ms para fadeOut
    }, 2000);
}

function animateFab() {
    const fab = document.querySelector('.fab-cart');
    fab.style.transform = "scale(1.2) rotate(10deg)";
    setTimeout(() => fab.style.transform = "scale(1) rotate(0)", 200);
}

function generateOrderKey(name) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2,'0');
    const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    return `${prefix}${day}${time}`;
}

function processPaymentStep() {
    let name = document.getElementById('client-name').value.trim();
    if (cart.length === 0) return showToast(" Carrito vacío", 'error');
    if (!name || name.length < 5) return showToast(" Nombre inválido", 'error');
    
    currentOrderKey = generateOrderKey(name);
    document.getElementById('order-key-display').innerText = currentOrderKey;
    const total = cart.reduce((acc, item) => acc + item.finalPrice, 0);
    document.getElementById('payment-total-display').innerText = `$${total.toFixed(2)}`;
    
    toggleCart(); 
    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

function finalizeOrder() {
    let name = document.getElementById('client-name').value.trim();
    const orderType = document.getElementById('order-type').value;
    const phone = "5212414073434"; 

    let message = `*PEDIDO BG-14* 🍽️%0A`;
    message += `*Referencia:* ${currentOrderKey}%0A`;
    message += `*Cliente:* ${name}%0A`;
    message += `*Tipo:* ${orderType}%0A`;
    message += `----------------------------------%0A`;

    cart.forEach((item, index) => {
        message += `*${index + 1}. ${item.name}* - $${item.finalPrice}%0A`;
        if(item.selectedOption) message += `   ↳ _Opción: ${item.selectedOption}_%0A`;
        if(item.note) message += `   ↳ _Nota: ${item.note}_%0A`;
    });

    const total = cart.reduce((acc, item) => acc + item.finalPrice, 0);
    message += `----------------------------------%0A`;
    message += `*TOTAL: $${total.toFixed(2)}* (Adjunto Comprobante)`;

    // 1. Abrir WhatsApp
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    
    // 2. Limpiar Sistema
    cart = [];
    updateCartDisplay();
    closePaymentModal();
    document.getElementById('client-name').value = ''; 
    
    // 3. Confirmación visual
    showToast("Pedido enviado y carrito limpio");
}

document.addEventListener('DOMContentLoaded', loadProducts);