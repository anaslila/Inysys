// ========================================
// INVSYS MANAGER - JAVASCRIPT v1.03 (COMPLETE)
// Created by: AL Software
// Version: 1.03
// Loading Icon: https://s3.ezgif.com/tmp/ezgif-39005c99a5e741.gif
// ========================================

// ========================================
// GLOBAL VARIABLES & STATE
// ========================================
const APP_VERSION = '1.03';
const APP_NAME = 'Invsys Manager';
const LOADING_ICON_URL = 'https://i.postimg.cc/XYpPy4qm/ezgif-49b35556d9c1e0.gif';

let appState = {
    currentWindow: 'dashboard',
    minimizedWindows: [],
    activeWindow: null,
    draggedWindow: null,
    dragOffset: { x: 0, y: 0 },
    settings: {
        itemsPerPage: 100,
        currencySymbol: '₹',
        dateFormat: 'dd/mm/yyyy',
        invoicePrefix: 'INV',
        startingInvoiceNo: 1001,
        paymentTerms: 30,
        ignoreStock: false
    },
    profile: {},
    inventory: [],
    customers: [],
    invoices: [],
    stockRefills: [],
    currentInvoice: null,
    currentPage: {
        inventory: 1,
        customers: 1,
        bills: 1
    },
    dropdown: {
        selectedIndex: -1,
        items: [],
        type: null
    },
    editingItem: null,
    refillProduct: null,
    selectedProduct: null
};

let calcState = {
    currentValue: '0',
    previousValue: '',
    operation: null,
    expression: '',
    history: []
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    try {
        showLoadingScreen();
        loadDataFromStorage();
        
        setTimeout(() => {
            try {
                initializeEventListeners();
                initializeWindows();
                initializeTaskbar();
                initializeKeyboardShortcuts();
                checkInstallPrompt();
                hideLoadingScreen();
                showMainApp();
                openWindow('dashboard');
                console.log('App initialized successfully!');
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        }, 1500);
    } catch (error) {
        console.error('Critical error:', error);
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        const loadingIcon = loadingScreen.querySelector('.loading-icon');
        if (loadingIcon) {
            loadingIcon.src = LOADING_ICON_URL;
        }
        loadingScreen.style.display = 'flex';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function showMainApp() {
    const mainApp = document.getElementById('mainApp');
    if (mainApp) {
        mainApp.style.display = 'flex';
        updateClock();
        setInterval(updateClock, 1000);
    }
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            const dashboardWindow = document.getElementById('window-dashboard');
            if (dashboardWindow && dashboardWindow.classList.contains('active')) {
                e.preventDefault();
                toggleStartMenu();
            }
            return;
        }
        
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-window[style*="display: flex"], .modal-window[style*="display: block"]');
            if (activeModal) {
                activeModal.style.display = 'none';
                return;
            }
            
            const activeWin = document.querySelector('.window.active:not(.dashboard-window)');
            if (activeWin) {
                closeWindow(activeWin);
            }
            hideStartMenu();
            hideDateTimePopup();
            return;
        }
        
        if (e.key === 'Enter' && e.target.closest('.modal-window')) {
            e.preventDefault();
            const modal = e.target.closest('.modal-window');
            if (modal.id === 'addCustomerModal') {
                saveNewCustomer();
            } else if (modal.id === 'addProductModal') {
                saveNewProduct();
            } else if (modal.id === 'refillStockModal') {
                saveStockRefill();
            } else if (modal.id === 'editInvoiceItemModal') {
                saveEditedItem();
            }
            return;
        }
        
        const startMenu = document.getElementById('startMenu');
        if (startMenu && startMenu.style.display !== 'none') {
            const key = e.key.toLowerCase();
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                if (item.dataset.key === key) {
                    const tab = item.dataset.tab;
                    openWindow(tab);
                    hideStartMenu();
                }
            });
        }
        
        // FIXED: Backspace navigation in quantity field
        if (e.key === 'Backspace' && e.target.id === 'itemQuantity' && e.target.value === '') {
            e.preventDefault();
            document.getElementById('productSearch').focus();
            return;
        }
        
        if (e.key === 'Backspace' && e.target.tagName === 'INPUT' && e.target.type === 'text' && e.target.value === '') {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('input:not([readonly]), select, textarea, button')).filter(el => el.tabIndex >= 0);
            const currentIndex = inputs.indexOf(e.target);
            if (currentIndex > 0) {
                inputs[currentIndex - 1].focus();
            }
        }
    });
}

// ========================================
// LOCAL STORAGE MANAGEMENT
// ========================================
function loadDataFromStorage() {
    try {
        const savedSettings = localStorage.getItem('invsys_settings');
        if (savedSettings) {
            appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
        }

        const savedProfile = localStorage.getItem('invsys_profile');
        if (savedProfile) {
            appState.profile = JSON.parse(savedProfile);
        }

        const savedInventory = localStorage.getItem('invsys_inventory');
        if (savedInventory) {
            appState.inventory = JSON.parse(savedInventory);
        }

        const savedCustomers = localStorage.getItem('invsys_customers');
        if (savedCustomers) {
            appState.customers = JSON.parse(savedCustomers);
        }

        const savedInvoices = localStorage.getItem('invsys_invoices');
        if (savedInvoices) {
            appState.invoices = JSON.parse(savedInvoices);
        }

        const savedStockRefills = localStorage.getItem('invsys_stock_refills');
        if (savedStockRefills) {
            appState.stockRefills = JSON.parse(savedStockRefills);
        }

        const savedCalcHistory = localStorage.getItem('invsys_calc_history');
        if (savedCalcHistory) {
            calcState.history = JSON.parse(savedCalcHistory);
        }

        if (appState.inventory.length === 0) {
            initializeDemoData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(`invsys_${key}`, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function initializeDemoData() {
    appState.inventory = [
        { id: 1, code: 'PRD001', name: 'Laptop Dell XPS 15', category: 'Electronics', price: 85000, stock: 15, tax: 18, status: 'Active' },
        { id: 2, code: 'PRD002', name: 'Wireless Mouse Logitech', category: 'Accessories', price: 500, stock: 100, tax: 18, status: 'Active' },
        { id: 3, code: 'PRD003', name: 'USB-C Cable 2m', category: 'Accessories', price: 200, stock: 250, tax: 18, status: 'Active' },
        { id: 4, code: 'PRD004', name: 'Monitor LG 24 inch', category: 'Electronics', price: 12000, stock: 30, tax: 18, status: 'Active' },
        { id: 5, code: 'PRD005', name: 'Keyboard Mechanical RGB', category: 'Accessories', price: 3500, stock: 50, tax: 18, status: 'Active' }
    ];
    
    appState.customers = [
        { id: 1, customerId: 'CUST001', name: 'Anas Khan', email: 'anas@example.com', phone: '8879706046', address: 'Mira Bhayandar, MH', totalOrders: 5 },
        { id: 2, customerId: 'CUST002', name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', address: 'Mumbai, Maharashtra', totalOrders: 3 },
        { id: 3, customerId: 'CUST003', name: 'Rahul Verma', email: 'rahul@example.com', phone: '9988776655', address: 'Delhi, India', totalOrders: 8 }
    ];
    
    saveToStorage('inventory', appState.inventory);
    saveToStorage('customers', appState.customers);
}

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', toggleStartMenu);
    }
    
    const trayDateTime = document.getElementById('trayDateTime');
    if (trayDateTime) {
        trayDateTime.addEventListener('click', toggleDateTimePopup);
    }
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            openWindow(tab);
            hideStartMenu();
        });
    });
    
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            openWindow(action);
        });
    });
    
    document.querySelectorAll('.window').forEach(window => {
        initializeWindowControls(window);
        if (!window.classList.contains('dashboard-window')) {
            makeWindowDraggable(window);
        }
    });
    
    initializeInvoiceListeners();
    initializeInventoryListeners();
    initializeCustomerListeners();
    initializeSalesListeners();
    initializeBillsListeners();
    initializeCalculatorListeners();
    initializeSettingsListeners();
    initializeProfileListeners();
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.start-button') && !e.target.closest('.start-menu')) {
            hideStartMenu();
        }
        
        if (!e.target.closest('.searchable-dropdown')) {
            hideAllDropdowns();
        }
        
        if (!e.target.closest('.tray-datetime') && !e.target.closest('.datetime-popup')) {
            hideDateTimePopup();
        }
    });
}

// ========================================
// SEARCHABLE DROPDOWN SYSTEM
// ========================================
function initializeSearchableDropdown(searchInputId, resultsId, dataSource, type) {
    const searchInput = document.getElementById(searchInputId);
    const resultsDiv = document.getElementById(resultsId);
    
    if (!searchInput || !resultsDiv) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            resultsDiv.style.display = 'none';
            appState.dropdown.selectedIndex = -1;
            return;
        }
        
        const filtered = dataSource.filter(item => {
            if (type === 'customer') {
                return item.name.toLowerCase().includes(searchTerm) ||
                       item.email.toLowerCase().includes(searchTerm) ||
                       item.phone.includes(searchTerm) ||
                       item.customerId.toLowerCase().includes(searchTerm);
            } else if (type === 'product') {
                return item.name.toLowerCase().includes(searchTerm) ||
                       item.code.toLowerCase().includes(searchTerm) ||
                       item.category.toLowerCase().includes(searchTerm);
            }
            return false;
        });
        
        displayDropdownResults(filtered, resultsDiv, type, searchTerm);
        appState.dropdown.items = filtered;
        appState.dropdown.type = type;
        appState.dropdown.selectedIndex = filtered.length > 0 ? 0 : -1;
    });
    
    searchInput.addEventListener('keydown', (e) => {
        handleDropdownKeyboard(e, resultsDiv, type, searchInput);
    });
}

function displayDropdownResults(items, resultsDiv, type, searchTerm) {
    resultsDiv.innerHTML = '';
    
    if (items.length === 0) {
        const addNewDiv = document.createElement('div');
        addNewDiv.className = 'dropdown-item add-new';
        addNewDiv.textContent = `+ Add New ${type === 'customer' ? 'Customer' : 'Product'}`;
        addNewDiv.addEventListener('click', () => {
            if (type === 'customer') {
                showAddCustomerModal(searchTerm);
            } else if (type === 'product') {
                showAddProductModal(searchTerm);
            }
        });
        resultsDiv.appendChild(addNewDiv);
        resultsDiv.style.display = 'block';
        return;
    }
    
    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dropdown-item';
        if (index === 0) itemDiv.classList.add('selected');
        itemDiv.dataset.index = index;
        
        if (type === 'customer') {
            itemDiv.innerHTML = `<strong>${item.name}</strong><br><small>${item.phone} - ${item.email}</small>`;
        } else if (type === 'product') {
            itemDiv.innerHTML = `<strong>${item.name}</strong> (${item.code})<br><small>₹${formatIndianNumber(item.price)} - Stock: ${item.stock}</small>`;
        }
        
        itemDiv.addEventListener('click', () => {
            selectDropdownItem(item, type);
        });
        
        resultsDiv.appendChild(itemDiv);
    });
    
    resultsDiv.style.display = 'block';
}

function handleDropdownKeyboard(e, resultsDiv, type, searchInput) {
    const items = appState.dropdown.items;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        appState.dropdown.selectedIndex = Math.min(appState.dropdown.selectedIndex + 1, items.length - 1);
        updateDropdownSelection(resultsDiv);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        appState.dropdown.selectedIndex = Math.max(appState.dropdown.selectedIndex - 1, 0);
        updateDropdownSelection(resultsDiv);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0 && appState.dropdown.selectedIndex >= 0) {
            selectDropdownItem(items[appState.dropdown.selectedIndex], type);
        } else if (items.length === 0) {
            if (type === 'customer') {
                showAddCustomerModal(searchInput.value);
            } else if (type === 'product') {
                showAddProductModal(searchInput.value);
            }
        }
    } else if (e.key === 'Tab') {
        if (items.length > 0 && appState.dropdown.selectedIndex >= 0) {
            e.preventDefault();
            selectDropdownItem(items[appState.dropdown.selectedIndex], type);
        } else if (items.length === 0) {
            e.preventDefault();
            if (type === 'customer') {
                showAddCustomerModal(searchInput.value);
            } else if (type === 'product') {
                showAddProductModal(searchInput.value);
            }
        }
    }
}

function updateDropdownSelection(resultsDiv) {
    const dropdownItems = resultsDiv.querySelectorAll('.dropdown-item:not(.add-new)');
    dropdownItems.forEach((item, index) => {
        if (index === appState.dropdown.selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectDropdownItem(item, type) {
    if (type === 'customer') {
        displayCustomerInfo(item);
        appState.currentInvoice.customer = item;
        document.getElementById('customerSearch').value = item.name;
        document.getElementById('customerResults').style.display = 'none';
        document.getElementById('productSearch').focus();
    } else if (type === 'product') {
        checkStockAndAdd(item);
    }
}

function checkStockAndAdd(product) {
    const qtyInput = document.getElementById('itemQuantity');
    const quantity = parseInt(qtyInput.value) || 1;
    
    if (!appState.settings.ignoreStock && product.stock < quantity) {
        if (product.stock === 0) {
            if (confirm(`${product.name} is OUT OF STOCK. Would you like to refill stock before adding?`)) {
                showRefillStockModal(product);
            }
        } else {
            if (confirm(`${product.name} has only ${product.stock} units in stock. You're trying to add ${quantity}. Would you like to refill stock?`)) {
                showRefillStockModal(product);
            }
        }
        return;
    }
    
    document.getElementById('productSearch').value = product.name;
    document.getElementById('productResults').style.display = 'none';
    appState.selectedProduct = product;
    qtyInput.focus();
    
    // FIXED: Better Enter/Tab handling from quantity field
    const handleQtySubmit = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const qty = parseInt(qtyInput.value);
            if (qty && qty > 0) {
                addInvoiceItem();
                qtyInput.removeEventListener('keydown', handleQtySubmit);
            } else {
                alert('Please enter a valid quantity');
            }
        }
    };
    
    qtyInput.addEventListener('keydown', handleQtySubmit);
}

function hideAllDropdowns() {
    document.querySelectorAll('.dropdown-results').forEach(div => {
        div.style.display = 'none';
    });
    appState.dropdown.selectedIndex = -1;
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function showAddCustomerModal(prefillValue = '') {
    const modal = document.getElementById('addCustomerModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerEmail').value = '';
    document.getElementById('newCustomerPhone').value = '';
    document.getElementById('newCustomerAddress').value = '';
    
    if (prefillValue) {
        const phonePattern = /^\+?\d+$/;
        const emailPattern = /@/;
        
        if (phonePattern.test(prefillValue.replace(/\s/g, ''))) {
            document.getElementById('newCustomerPhone').value = prefillValue;
            document.getElementById('newCustomerName').focus();
        } else if (emailPattern.test(prefillValue)) {
            document.getElementById('newCustomerEmail').value = prefillValue;
            document.getElementById('newCustomerName').focus();
        } else {
            document.getElementById('newCustomerName').value = prefillValue;
            document.getElementById('newCustomerEmail').focus();
        }
    } else {
        document.getElementById('newCustomerName').focus();
    }
}

function closeAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) modal.style.display = 'none';
}

function saveNewCustomer() {
    const name = document.getElementById('newCustomerName').value.trim();
    const email = document.getElementById('newCustomerEmail').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    const address = document.getElementById('newCustomerAddress').value.trim();
    
    if (!name || !email || !phone) {
        alert('Please fill in Name, Email, and Phone fields');
        return;
    }
    
    const customerId = 'CUST' + String(appState.customers.length + 1).padStart(3, '0');
    const newCustomer = {
        id: Date.now(),
        customerId: customerId,
        name: name,
        email: email,
        phone: phone,
        address: address,
        totalOrders: 0
    };
    
    appState.customers.push(newCustomer);
    saveToStorage('customers', appState.customers);
    
    // FIXED: Auto-refresh customer table after adding
    if (document.getElementById('window-customer').classList.contains('active')) {
        renderCustomerTable();
    }
    
    selectDropdownItem(newCustomer, 'customer');
    closeAddCustomerModal();
}

function showAddProductModal(prefillValue = '') {
    const modal = document.getElementById('addProductModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    document.getElementById('newProductCode').value = '';
    document.getElementById('newProductName').value = prefillValue || '';
    document.getElementById('newProductCategory').value = '';
    document.getElementById('newProductPrice').value = '';
    document.getElementById('newProductStock').value = '';
    document.getElementById('newProductTax').value = '18';
    
    document.getElementById('newProductCode').focus();
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) modal.style.display = 'none';
}

function saveNewProduct() {
    const code = document.getElementById('newProductCode').value.trim();
    const name = document.getElementById('newProductName').value.trim();
    const category = document.getElementById('newProductCategory').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const stock = parseInt(document.getElementById('newProductStock').value);
    const tax = parseFloat(document.getElementById('newProductTax').value);
    
    if (!code || !name || isNaN(price) || isNaN(stock)) {
        alert('Please fill in all required fields');
        return;
    }
    
    const newProduct = {
        id: Date.now(),
        code: code,
        name: name,
        category: category || 'General',
        price: price,
        stock: stock,
        tax: tax || 18,
        status: 'Active'
    };
    
    appState.inventory.push(newProduct);
    saveToStorage('inventory', appState.inventory);
    
    // FIXED: Auto-refresh inventory table after adding
    if (document.getElementById('window-inventory').classList.contains('active')) {
        renderInventoryTable();
    }
    
    checkStockAndAdd(newProduct);
    closeAddProductModal();
}

function showRefillStockModal(product) {
    appState.refillProduct = product;
    const modal = document.getElementById('refillStockModal');
    const refillInfo = document.getElementById('refillProductInfo');
    
    if (!modal || !refillInfo) return;
    
    refillInfo.innerHTML = `
        <strong>${product.name}</strong> (${product.code})<br>
        Current Stock: <strong>${product.stock}</strong> units<br>
        Price: ${appState.settings.currencySymbol}${formatIndianNumber(product.price)}
    `;
    
    document.getElementById('refillQuantity').value = '1';
    document.getElementById('refillNotes').value = '';
    
    modal.style.display = 'flex';
    document.getElementById('refillQuantity').focus();
}

function closeRefillStockModal() {
    const modal = document.getElementById('refillStockModal');
    if (modal) modal.style.display = 'none';
    appState.refillProduct = null;
}

function saveStockRefill() {
    const quantity = parseInt(document.getElementById('refillQuantity').value);
    const notes = document.getElementById('refillNotes').value.trim();
    
    if (isNaN(quantity) || quantity < 1) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const product = appState.refillProduct;
    if (!product) return;
    
    product.stock += quantity;
    
    const refillRecord = {
        id: Date.now(),
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        quantity: quantity,
        previousStock: product.stock - quantity,
        newStock: product.stock,
        notes: notes,
        date: new Date().toISOString()
    };
    
    appState.stockRefills.push(refillRecord);
    saveToStorage('inventory', appState.inventory);
    saveToStorage('stock_refills', appState.stockRefills);
    
    alert(`Stock refilled successfully!\n${product.name}: ${product.stock - quantity} → ${product.stock} units`);
    
    closeRefillStockModal();
    if (document.getElementById('window-inventory').classList.contains('active')) {
        renderInventoryTable();
    }
    
    if (document.getElementById('window-invoice').classList.contains('active')) {
        checkStockAndAdd(product);
    }
}

function showEditItemModal(index) {
    appState.editingItem = index;
    const item = appState.currentInvoice.items[index];
    
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemQuantity').value = item.quantity;
    
    document.getElementById('editInvoiceItemModal').style.display = 'flex';
    document.getElementById('editItemQuantity').focus();
}

function closeEditItemModal() {
    document.getElementById('editInvoiceItemModal').style.display = 'none';
    appState.editingItem = null;
}

function saveEditedItem() {
    const newQuantity = parseInt(document.getElementById('editItemQuantity').value);
    
    if (isNaN(newQuantity) || newQuantity < 1) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const item = appState.currentInvoice.items[appState.editingItem];
    const product = appState.inventory.find(p => p.id === item.id);
    
    if (!appState.settings.ignoreStock && product && newQuantity > (product.stock + item.quantity)) {
        alert(`Insufficient stock. Available: ${product.stock + item.quantity}`);
        return;
    }
    
    item.quantity = newQuantity;
    const itemSubtotal = newQuantity * item.price;
    item.subtotal = itemSubtotal;
    item.taxAmount = itemSubtotal * (item.tax / 100);
    item.total = itemSubtotal + item.taxAmount;
    
    renderInvoiceItems();
    updateInvoiceTotals();
    generateInvoicePreview();
    closeEditItemModal();
}

function deleteEditedItem() {
    if (confirm('Delete this item from invoice?')) {
        removeInvoiceItem(appState.editingItem);
        closeEditItemModal();
    }
}

// Continue with Part 2 in next message...
// ========================================
// INVOICE MANAGEMENT (CONTINUED)
// ========================================
function initializeInvoiceListeners() {
    const newInvoiceBtn = document.getElementById('newInvoiceBtn');
    if (newInvoiceBtn) newInvoiceBtn.addEventListener('click', initializeNewInvoice);
    
    const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
    if (saveInvoiceBtn) saveInvoiceBtn.addEventListener('click', saveInvoice);
    
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    if (printInvoiceBtn) printInvoiceBtn.addEventListener('click', printInvoice);
    
    const clearInvoiceBtn = document.getElementById('clearInvoiceBtn');
    if (clearInvoiceBtn) clearInvoiceBtn.addEventListener('click', clearInvoice);
    
    initializeSearchableDropdown('customerSearch', 'customerResults', appState.customers, 'customer');
    initializeSearchableDropdown('productSearch', 'productResults', appState.inventory, 'product');
}

function initializeNewInvoice() {
    const invoiceNo = appState.settings.invoicePrefix + appState.settings.startingInvoiceNo;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + appState.settings.paymentTerms);
    
    document.getElementById('invoiceNo').value = invoiceNo;
    document.getElementById('invoiceDate').value = today;
    document.getElementById('invoiceDueDate').value = dueDate.toISOString().split('T')[0];
    
    appState.currentInvoice = {
        invoiceNo: invoiceNo,
        date: today,
        dueDate: dueDate.toISOString().split('T')[0],
        customer: null,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: ''
    };
    
    document.getElementById('customerSearch').value = '';
    document.getElementById('productSearch').value = '';
    document.getElementById('itemQuantity').value = ''; // FIXED: Empty default
    document.getElementById('selectedCustomerInfo').innerHTML = '';
    clearInvoiceItems();
    updateInvoiceTotals();
    generateInvoicePreview();
    
    setTimeout(() => {
        document.getElementById('customerSearch').focus();
    }, 100);
}

function displayCustomerInfo(customer) {
    const infoDiv = document.getElementById('selectedCustomerInfo');
    if (!customer || !infoDiv) return;
    
    infoDiv.innerHTML = `
        <strong>${customer.name}</strong> (${customer.customerId})<br>
        Email: ${customer.email}<br>
        Phone: ${customer.phone}<br>
        Address: ${customer.address}
    `;
}

// FIXED: Auto-club duplicate products
function addInvoiceItem() {
    const product = appState.selectedProduct;
    const qtyInput = document.getElementById('itemQuantity');
    const quantity = parseInt(qtyInput.value) || 1;
    
    if (!product) {
        alert('Please select a product');
        return;
    }
    
    if (!appState.settings.ignoreStock && quantity > product.stock) {
        if (confirm(`Insufficient stock. Available: ${product.stock}. Would you like to refill stock?`)) {
            showRefillStockModal(product);
        }
        return;
    }
    
    // FIXED: Check if product already exists in invoice
    const existingItemIndex = appState.currentInvoice.items.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
        // Product exists, add to quantity
        const existingItem = appState.currentInvoice.items[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        // Check stock for combined quantity
        if (!appState.settings.ignoreStock && newQuantity > product.stock) {
            if (confirm(`Insufficient stock for total quantity ${newQuantity}. Available: ${product.stock}. Would you like to refill stock?`)) {
                showRefillStockModal(product);
            }
            return;
        }
        
        existingItem.quantity = newQuantity;
        const itemSubtotal = newQuantity * existingItem.price;
        existingItem.subtotal = itemSubtotal;
        existingItem.taxAmount = itemSubtotal * (existingItem.tax / 100);
        existingItem.total = itemSubtotal + existingItem.taxAmount;
    } else {
        // New product, add to invoice
        const itemSubtotal = quantity * product.price;
        const itemTax = itemSubtotal * (product.tax / 100);
        const itemTotal = itemSubtotal + itemTax;
        
        const item = {
            id: product.id,
            name: product.name,
            code: product.code,
            quantity: quantity,
            price: product.price,
            tax: product.tax,
            subtotal: itemSubtotal,
            taxAmount: itemTax,
            total: itemTotal
        };
        
        appState.currentInvoice.items.push(item);
    }
    
    renderInvoiceItems();
    updateInvoiceTotals();
    generateInvoicePreview();
    
    // FIXED: Clear and return to product search
    document.getElementById('productSearch').value = '';
    qtyInput.value = '';
    appState.selectedProduct = null;
    document.getElementById('productSearch').focus();
}

function renderInvoiceItems() {
    const tbody = document.getElementById('invoiceItems');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    appState.currentInvoice.items.forEach((item, index) => {
        const row = tbody.insertRow();
        row.style.cursor = 'pointer';
        row.onclick = () => showEditItemModal(index);
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(item.price)}</td>
            <td>${item.tax}%</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(item.total.toFixed(2))}</td>
            <td><button class="action-btn danger" onclick="event.stopPropagation(); removeInvoiceItem(${index})">Delete</button></td>
        `;
    });
}

function removeInvoiceItem(index) {
    if (confirm('Remove this item from invoice?')) {
        appState.currentInvoice.items.splice(index, 1);
        renderInvoiceItems();
        updateInvoiceTotals();
        generateInvoicePreview();
    }
}

function clearInvoiceItems() {
    const tbody = document.getElementById('invoiceItems');
    if (tbody) tbody.innerHTML = '';
}

function updateInvoiceTotals() {
    let subtotal = 0;
    let tax = 0;
    
    appState.currentInvoice.items.forEach(item => {
        subtotal += item.subtotal;
        tax += item.taxAmount;
    });
    
    const total = subtotal + tax;
    
    appState.currentInvoice.subtotal = subtotal;
    appState.currentInvoice.tax = tax;
    appState.currentInvoice.total = total;
    
    document.getElementById('invoiceSubtotal').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(subtotal.toFixed(2))}`;
    document.getElementById('invoiceTax').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(tax.toFixed(2))}`;
    document.getElementById('invoiceGrandTotal').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(total.toFixed(2))}`;
}

function saveInvoice() {
    if (!appState.currentInvoice.customer) {
        alert('Please select a customer');
        return;
    }
    
    if (appState.currentInvoice.items.length === 0) {
        alert('Please add at least one item');
        return;
    }
    
    appState.currentInvoice.notes = document.getElementById('invoiceNotes').value;
    appState.invoices.push({ ...appState.currentInvoice });
    
    appState.currentInvoice.items.forEach(item => {
        const product = appState.inventory.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.quantity;
        }
    });
    
    const customer = appState.customers.find(c => c.id === appState.currentInvoice.customer.id);
    if (customer) {
        customer.totalOrders++;
    }
    
    appState.settings.startingInvoiceNo++;
    
    saveToStorage('invoices', appState.invoices);
    saveToStorage('inventory', appState.inventory);
    saveToStorage('customers', appState.customers);
    saveToStorage('settings', appState.settings);
    
    alert('Invoice saved successfully!');
    initializeNewInvoice();
}

function printInvoice() {
    generateInvoicePreview();
    setTimeout(() => window.print(), 500);
}

function clearInvoice() {
    if (confirm('Are you sure you want to clear this invoice?')) {
        initializeNewInvoice();
    }
}

function generateInvoicePreview() {
    const preview = document.getElementById('invoicePreview');
    if (!preview) return;
    
    const profile = appState.profile;
    const invoice = appState.currentInvoice;
    
    if (!invoice.customer && invoice.items.length === 0) {
        preview.innerHTML = '<div class="preview-placeholder">Invoice preview will appear here</div>';
        return;
    }
    
    let html = '<div style="font-family: Verdana; padding: 20px; font-size: 11px;">';
    
    if (profile.companyName) {
        html += `<div style="text-align: center; margin-bottom: 20px;">`;
        if (profile.companyLogo) {
            html += `<img src="${profile.companyLogo}" alt="Logo" style="max-width: 80px; margin-bottom: 10px;">`;
        }
        html += `<h2 style="margin: 5px 0;">${profile.companyName}</h2>`;
        if (profile.companyAddress) html += `<p style="margin: 2px 0; font-size: 10px;">${profile.companyAddress}</p>`;
        if (profile.companyPhone) html += `<p style="margin: 2px 0; font-size: 10px;">Phone: ${profile.companyPhone} | Email: ${profile.companyEmail}</p>`;
        if (profile.companyGST) html += `<p style="margin: 2px 0; font-size: 10px;">GST: ${profile.companyGST}</p>`;
        html += `</div>`;
    }
    
    html += '<hr style="border: 1px solid #000; margin: 15px 0;">';
    html += `<h3 style="text-align: center; margin: 10px 0;">TAX INVOICE</h3>`;
    html += `<div style="margin: 10px 0;">`;
    html += `<div style="float: left;"><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>`;
    html += `<div style="float: right;"><strong>Date:</strong> ${invoice.date}</div>`;
    html += `<div style="clear: both;"></div>`;
    html += `<div><strong>Due Date:</strong> ${invoice.dueDate}</div>`;
    html += `</div>`;
    
    if (invoice.customer) {
        html += '<hr style="border: 1px solid #ccc; margin: 15px 0;">';
        html += '<div style="margin: 15px 0;"><strong>Bill To:</strong><br>';
        html += `${invoice.customer.name} (${invoice.customer.customerId})<br>`;
        html += `${invoice.customer.phone}<br>${invoice.customer.email}<br>${invoice.customer.address}</div>`;
    }
    
    if (invoice.items.length > 0) {
        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">';
        html += '<thead><tr style="background: #c0c0c0;"><th style="border: 1px solid #000; padding: 5px; text-align: left;">Item</th><th style="border: 1px solid #000; padding: 5px; text-align: center;">Qty</th><th style="border: 1px solid #000; padding: 5px; text-align: right;">Price</th><th style="border: 1px solid #000; padding: 5px; text-align: center;">Tax</th><th style="border: 1px solid #000; padding: 5px; text-align: right;">Total</th></tr></thead>';
        html += '<tbody>';
        
        invoice.items.forEach(item => {
            html += `<tr>
                <td style="border: 1px solid #000; padding: 5px;">${item.name}<br><small style="color: #666;">${item.code}</small></td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${appState.settings.currencySymbol}${formatIndianNumber(item.price)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${item.tax}%</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${appState.settings.currencySymbol}${formatIndianNumber(item.total.toFixed(2))}</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        
        html += '<div style="margin-top: 20px; text-align: right;">';
        html += `<p style="margin: 5px 0;"><strong>Subtotal:</strong> ${appState.settings.currencySymbol}${formatIndianNumber(invoice.subtotal.toFixed(2))}</p>`;
        html += `<p style="margin: 5px 0;"><strong>Tax:</strong> ${appState.settings.currencySymbol}${formatIndianNumber(invoice.tax.toFixed(2))}</p>`;
        html += `<p style="margin: 5px 0; font-size: 14px;"><strong>Grand Total:</strong> ${appState.settings.currencySymbol}${formatIndianNumber(invoice.total.toFixed(2))}</p>`;
        html += '</div>';
    }
    
    if (invoice.notes) {
        html += `<p style="margin-top: 20px; font-size: 10px;"><strong>Notes:</strong><br>${invoice.notes}</p>`;
    }
    
    if (profile.bankName) {
        html += '<hr style="border: 1px solid #ccc; margin: 20px 0;">';
        html += '<div style="font-size: 10px;"><strong>Bank Details:</strong><br>';
        html += `Bank: ${profile.bankName}<br>Account: ${profile.accountNumber}<br>IFSC: ${profile.ifscCode}</div>`;
    }
    
    html += '<div style="margin-top: 30px; text-align: center; font-size: 9px; color: #666;">';
    html += '<p>Thank you for your business!</p>';
    if (profile.companyWebsite) html += `<p>${profile.companyWebsite}</p>`;
    html += '</div>';
    
    html += '</div>';
    preview.innerHTML = html;
}

// ========================================
// INVENTORY MANAGEMENT
// ========================================
function initializeInventoryListeners() {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', () => showAddProductModal());
    
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    if (exportInventoryBtn) exportInventoryBtn.addEventListener('click', exportInventory);
    
    const importInventoryBtn = document.getElementById('importInventoryBtn');
    if (importInventoryBtn) {
        importInventoryBtn.addEventListener('click', () => {
            document.getElementById('importInventoryFile').click();
        });
    }
    
    const importInventoryFile = document.getElementById('importInventoryFile');
    if (importInventoryFile) importInventoryFile.addEventListener('change', importInventory);
    
    const inventorySearch = document.getElementById('inventorySearch');
    if (inventorySearch) inventorySearch.addEventListener('input', searchInventory);
    
    const invPrevPage = document.getElementById('invPrevPage');
    if (invPrevPage) invPrevPage.addEventListener('click', () => changeInventoryPage(-1));
    
    const invNextPage = document.getElementById('invNextPage');
    if (invNextPage) invNextPage.addEventListener('click', () => changeInventoryPage(1));
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;
    
    const itemsPerPage = appState.settings.itemsPerPage;
    const currentPage = appState.currentPage.inventory;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = appState.inventory.slice(start, end);
    
    tbody.innerHTML = '';
    
    pageItems.forEach(product => {
        const row = tbody.insertRow();
        const stockClass = product.stock === 0 ? 'style="color: red; font-weight: bold;"' : product.stock < 10 ? 'style="color: orange; font-weight: bold;"' : '';
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(product.price)}</td>
            <td ${stockClass}>${product.stock}</td>
            <td>${product.tax}%</td>
            <td>${product.status}</td>
            <td>
                <button class="action-btn success" onclick="showRefillStockModal(appState.inventory.find(p => p.id === ${product.id}))">Refill</button>
                <button class="action-btn" onclick="editProductInline(${product.id})">Edit</button>
                <button class="action-btn danger" onclick="deleteProductById(${product.id})">Delete</button>
            </td>
        `;
    });
    
    updateInventoryPagination();
}

function updateInventoryPagination() {
    const totalPages = Math.ceil(appState.inventory.length / appState.settings.itemsPerPage) || 1;
    const invPageInfo = document.getElementById('invPageInfo');
    if (invPageInfo) {
        invPageInfo.textContent = `Page ${appState.currentPage.inventory} of ${totalPages}`;
    }
    
    const invPrevPage = document.getElementById('invPrevPage');
    const invNextPage = document.getElementById('invNextPage');
    
    if (invPrevPage) invPrevPage.disabled = appState.currentPage.inventory === 1;
    if (invNextPage) invNextPage.disabled = appState.currentPage.inventory >= totalPages;
}

function changeInventoryPage(direction) {
    appState.currentPage.inventory += direction;
    renderInventoryTable();
}

function searchInventory(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = appState.inventory.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.code.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filtered.forEach(product => {
        const row = tbody.insertRow();
        const stockClass = product.stock === 0 ? 'style="color: red; font-weight: bold;"' : product.stock < 10 ? 'style="color: orange; font-weight: bold;"' : '';
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(product.price)}</td>
            <td ${stockClass}>${product.stock}</td>
            <td>${product.tax}%</td>
            <td>${product.status}</td>
            <td>
                <button class="action-btn success" onclick="showRefillStockModal(appState.inventory.find(p => p.id === ${product.id}))">Refill</button>
                <button class="action-btn" onclick="editProductInline(${product.id})">Edit</button>
                <button class="action-btn danger" onclick="deleteProductById(${product.id})">Delete</button>
            </td>
        `;
    });
}

function deleteProductById(id) {
    if (confirm('Delete this product?')) {
        appState.inventory = appState.inventory.filter(p => p.id !== id);
        saveToStorage('inventory', appState.inventory);
        renderInventoryTable();
    }
}

function editProductInline(id) {
    const product = appState.inventory.find(p => p.id === id);
    if (!product) return;
    
    const newPrice = prompt(`Edit price for ${product.name}:`, product.price);
    if (newPrice !== null && !isNaN(newPrice)) {
        product.price = parseFloat(newPrice);
        saveToStorage('inventory', appState.inventory);
        renderInventoryTable();
    }
}

function exportInventory() {
    const csv = convertToCSV(appState.inventory, ['code', 'name', 'category', 'price', 'stock', 'tax', 'status']);
    downloadCSV(csv, 'inventory-export.csv');
}

function importInventory(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target.result;
            if (file.name.endsWith('.json')) {
                const imported = JSON.parse(content);
                appState.inventory = imported;
            } else if (file.name.endsWith('.csv')) {
                const imported = parseCSV(content);
                appState.inventory = imported.map((item, index) => ({
                    id: Date.now() + index,
                    code: item.code || '',
                    name: item.name || '',
                    category: item.category || 'General',
                    price: parseFloat(item.price) || 0,
                    stock: parseInt(item.stock) || 0,
                    tax: parseFloat(item.tax) || 18,
                    status: item.status || 'Active'
                }));
            }
            saveToStorage('inventory', appState.inventory);
            renderInventoryTable();
            alert('Inventory imported successfully!');
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ========================================
// CUSTOMER MANAGEMENT
// ========================================
function initializeCustomerListeners() {
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) addCustomerBtn.addEventListener('click', () => showAddCustomerModal());
    
    const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');
    if (deleteCustomerBtn) deleteCustomerBtn.addEventListener('click', deleteCustomers);
    
    const exportCustomerBtn = document.getElementById('exportCustomerBtn');
    if (exportCustomerBtn) exportCustomerBtn.addEventListener('click', exportCustomers);
    
    const importCustomerBtn = document.getElementById('importCustomerBtn');
    if (importCustomerBtn) {
        importCustomerBtn.addEventListener('click', () => {
            document.getElementById('importCustomerFile').click();
        });
    }
    
    const importCustomerFile = document.getElementById('importCustomerFile');
    if (importCustomerFile) importCustomerFile.addEventListener('change', importCustomers);
    
    const customerSearchField = document.getElementById('customerSearchField');
    if (customerSearchField) customerSearchField.addEventListener('input', searchCustomers);
    
    const custPrevPage = document.getElementById('custPrevPage');
    if (custPrevPage) custPrevPage.addEventListener('click', () => changeCustomerPage(-1));
    
    const custNextPage = document.getElementById('custNextPage');
    if (custNextPage) custNextPage.addEventListener('click', () => changeCustomerPage(1));
    
    // FIXED: Select All checkbox functionality
    const selectAllCustomers = document.getElementById('selectAllCustomers');
    if (selectAllCustomers) {
        selectAllCustomers.addEventListener('change', (e) => {
            document.querySelectorAll('#customerTable input[type="checkbox"]').forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
}

function renderCustomerTable() {
    const tbody = document.getElementById('customerTable');
    if (!tbody) return;
    
    const itemsPerPage = appState.settings.itemsPerPage;
    const currentPage = appState.currentPage.customers;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = appState.customers.slice(start, end);
    
    tbody.innerHTML = '';
    
    pageItems.forEach(customer => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" data-id="${customer.id}"></td>
            <td>${customer.customerId}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.address}</td>
            <td>${customer.totalOrders}</td>
        `;
    });
    
    updateCustomerPagination();
}

function updateCustomerPagination() {
    const totalPages = Math.ceil(appState.customers.length / appState.settings.itemsPerPage) || 1;
    const custPageInfo = document.getElementById('custPageInfo');
    if (custPageInfo) {
        custPageInfo.textContent = `Page ${appState.currentPage.customers} of ${totalPages}`;
    }
    
    const custPrevPage = document.getElementById('custPrevPage');
    const custNextPage = document.getElementById('custNextPage');
    
    if (custPrevPage) custPrevPage.disabled = appState.currentPage.customers === 1;
    if (custNextPage) custNextPage.disabled = appState.currentPage.customers >= totalPages;
}

function changeCustomerPage(direction) {
    appState.currentPage.customers += direction;
    renderCustomerTable();
}

function searchCustomers(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = appState.customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm) ||
        c.phone.includes(searchTerm) ||
        c.customerId.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('customerTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filtered.forEach(customer => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" data-id="${customer.id}"></td>
            <td>${customer.customerId}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.address}</td>
            <td>${customer.totalOrders}</td>
        `;
    });
}

function deleteCustomers() {
    const checkboxes = document.querySelectorAll('#customerTable input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('Please select customers to delete');
        return;
    }
    
    if (confirm(`Delete ${checkboxes.length} customer(s)?`)) {
        checkboxes.forEach(cb => {
            const id = parseInt(cb.dataset.id);
            appState.customers = appState.customers.filter(c => c.id !== id);
        });
        saveToStorage('customers', appState.customers);
        renderCustomerTable();
    }
}

function exportCustomers() {
    const csv = convertToCSV(appState.customers, ['customerId', 'name', 'email', 'phone', 'address', 'totalOrders']);
    downloadCSV(csv, 'customers-export.csv');
}

function importCustomers(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target.result;
            if (file.name.endsWith('.json')) {
                const imported = JSON.parse(content);
                appState.customers = imported;
            } else if (file.name.endsWith('.csv')) {
                const imported = parseCSV(content);
                appState.customers = imported.map((item, index) => ({
                    id: Date.now() + index,
                    customerId: item.customerId || `CUST${String(index + 1).padStart(3, '0')}`,
                    name: item.name || '',
                    email: item.email || '',
                    phone: item.phone || '',
                    address: item.address || '',
                    totalOrders: parseInt(item.totalOrders) || 0
                }));
            }
            saveToStorage('customers', appState.customers);
            renderCustomerTable();
            alert('Customers imported successfully!');
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ========================================
// SALES REPORT
// ========================================
function initializeSalesListeners() {
    const salesPeriod = document.getElementById('salesPeriod');
    if (salesPeriod) salesPeriod.addEventListener('change', toggleCustomDateRange);
    
    const generateSalesReport = document.getElementById('generateSalesReport');
    if (generateSalesReport) generateSalesReport.addEventListener('click', renderSalesReport);
    
    const exportSalesBtn = document.getElementById('exportSalesBtn');
    if (exportSalesBtn) exportSalesBtn.addEventListener('click', exportSales);
}

function toggleCustomDateRange(e) {
    const fromDate = document.getElementById('salesFromDate');
    const toDate = document.getElementById('salesToDate');
    
    if (!fromDate || !toDate) return;
    
    if (e.target.value === 'custom') {
        fromDate.style.display = 'inline-block';
        toDate.style.display = 'inline-block';
    } else {
        fromDate.style.display = 'none';
        toDate.style.display = 'none';
    }
}

function renderSalesReport() {
    const period = document.getElementById('salesPeriod').value;
    const filteredInvoices = filterInvoicesByPeriod(period);
    
    let totalSales = 0;
    let totalTax = 0;
    
    filteredInvoices.forEach(invoice => {
        totalSales += invoice.total;
        totalTax += invoice.tax;
    });
    
    const avgInvoice = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;
    
    document.getElementById('totalSalesValue').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(totalSales.toFixed(2))}`;
    document.getElementById('totalInvoicesValue').textContent = filteredInvoices.length;
    document.getElementById('avgInvoiceValue').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(avgInvoice.toFixed(2))}`;
    document.getElementById('taxCollectedValue').textContent = `${appState.settings.currencySymbol}${formatIndianNumber(totalTax.toFixed(2))}`;
    
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filteredInvoices.forEach(invoice => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${invoice.date}</td>
            <td>${invoice.invoiceNo}</td>
            <td>${invoice.customer?.name || 'N/A'}</td>
            <td>${invoice.items.length}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(invoice.subtotal.toFixed(2))}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(invoice.tax.toFixed(2))}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(invoice.total.toFixed(2))}</td>
        `;
    });
}

function filterInvoicesByPeriod(period) {
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'custom':
            const fromDate = document.getElementById('salesFromDate').value;
            const toDate = document.getElementById('salesToDate').value;
            if (fromDate && toDate) {
                return appState.invoices.filter(inv => 
                    inv.date >= fromDate && inv.date <= toDate
                );
            }
            return appState.invoices;
        default:
            return appState.invoices;
    }
    
    return appState.invoices.filter(inv => new Date(inv.date) >= startDate);
}

function exportSales() {
    const period = document.getElementById('salesPeriod').value;
    const filteredInvoices = filterInvoicesByPeriod(period);
    const csv = convertToCSV(filteredInvoices.map(inv => ({
        date: inv.date,
        invoiceNo: inv.invoiceNo,
        customer: inv.customer?.name || 'N/A',
        items: inv.items.length,
        subtotal: inv.subtotal.toFixed(2),
        tax: inv.tax.toFixed(2),
        total: inv.total.toFixed(2)
    })), ['date', 'invoiceNo', 'customer', 'items', 'subtotal', 'tax', 'total']);
    downloadCSV(csv, 'sales-report.csv');
}

// Continue in next message for Bills, Calculator, Settings, Profile, and Utilities...
// ========================================
// BILLS HISTORY (FIXED)
// ========================================
function initializeBillsListeners() {
    const viewBillBtn = document.getElementById('viewBillBtn');
    if (viewBillBtn) viewBillBtn.addEventListener('click', viewSelectedBill);
    
    const printBillBtn = document.getElementById('printBillBtn');
    if (printBillBtn) printBillBtn.addEventListener('click', printSelectedBills);
    
    const deleteBillBtn = document.getElementById('deleteBillBtn');
    if (deleteBillBtn) deleteBillBtn.addEventListener('click', deleteBills);
    
    const exportBillsBtn = document.getElementById('exportBillsBtn');
    if (exportBillsBtn) exportBillsBtn.addEventListener('click', exportBills);
    
    const billsSearch = document.getElementById('billsSearch');
    if (billsSearch) billsSearch.addEventListener('input', searchBills);
    
    const billsPrevPage = document.getElementById('billsPrevPage');
    if (billsPrevPage) billsPrevPage.addEventListener('click', () => changeBillsPage(-1));
    
    const billsNextPage = document.getElementById('billsNextPage');
    if (billsNextPage) billsNextPage.addEventListener('click', () => changeBillsPage(1));
    
    // FIXED: Select All checkbox functionality
    const selectAllBills = document.getElementById('selectAllBills');
    if (selectAllBills) {
        selectAllBills.addEventListener('change', (e) => {
            document.querySelectorAll('#billsTable input[type="checkbox"]').forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
}

function renderBillsTable() {
    const tbody = document.getElementById('billsTable');
    if (!tbody) return;
    
    const itemsPerPage = appState.settings.itemsPerPage;
    const currentPage = appState.currentPage.bills;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = appState.invoices.slice(start, end);
    
    tbody.innerHTML = '';
    
    pageItems.forEach(invoice => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" data-invoice="${invoice.invoiceNo}"></td>
            <td>${invoice.invoiceNo}</td>
            <td>${invoice.date}</td>
            <td>${invoice.customer?.name || 'N/A'}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(invoice.total.toFixed(2))}</td>
            <td>Completed</td>
            <td><button class="action-btn" onclick="viewBillDetails('${invoice.invoiceNo}')">View</button></td>
        `;
    });
    
    updateBillsPagination();
}

function updateBillsPagination() {
    const totalPages = Math.ceil(appState.invoices.length / appState.settings.itemsPerPage) || 1;
    const billsPageInfo = document.getElementById('billsPageInfo');
    if (billsPageInfo) {
        billsPageInfo.textContent = `Page ${appState.currentPage.bills} of ${totalPages}`;
    }
    
    const billsPrevPage = document.getElementById('billsPrevPage');
    const billsNextPage = document.getElementById('billsNextPage');
    
    if (billsPrevPage) billsPrevPage.disabled = appState.currentPage.bills === 1;
    if (billsNextPage) billsNextPage.disabled = appState.currentPage.bills >= totalPages;
}

function changeBillsPage(direction) {
    appState.currentPage.bills += direction;
    renderBillsTable();
}

function searchBills(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = appState.invoices.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(searchTerm) ||
        inv.customer?.name.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('billsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filtered.forEach(invoice => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" data-invoice="${invoice.invoiceNo}"></td>
            <td>${invoice.invoiceNo}</td>
            <td>${invoice.date}</td>
            <td>${invoice.customer?.name || 'N/A'}</td>
            <td>${appState.settings.currencySymbol}${formatIndianNumber(invoice.total.toFixed(2))}</td>
            <td>Completed</td>
            <td><button class="action-btn" onclick="viewBillDetails('${invoice.invoiceNo}')">View</button></td>
        `;
    });
}

// FIXED: View selected bill functionality
function viewSelectedBill() {
    const checkboxes = document.querySelectorAll('#billsTable input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('Please select a bill to view');
        return;
    }
    
    const invoiceNo = checkboxes[0].dataset.invoice;
    viewBillDetails(invoiceNo);
}

function viewBillDetails(invoiceNo) {
    const invoice = appState.invoices.find(inv => inv.invoiceNo === invoiceNo);
    if (invoice) {
        appState.currentInvoice = { ...invoice };
        openWindow('invoice');
        
        // Populate invoice form with saved data
        document.getElementById('invoiceNo').value = invoice.invoiceNo;
        document.getElementById('invoiceDate').value = invoice.date;
        document.getElementById('invoiceDueDate').value = invoice.dueDate;
        
        if (invoice.customer) {
            document.getElementById('customerSearch').value = invoice.customer.name;
            displayCustomerInfo(invoice.customer);
        }
        
        document.getElementById('invoiceNotes').value = invoice.notes || '';
        
        renderInvoiceItems();
        updateInvoiceTotals();
        generateInvoicePreview();
    }
}

function printSelectedBills() {
    const checkboxes = document.querySelectorAll('#billsTable input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('Please select bills to print');
        return;
    }
    
    checkboxes.forEach(cb => {
        const invoiceNo = cb.dataset.invoice;
        viewBillDetails(invoiceNo);
        setTimeout(() => window.print(), 500);
    });
}

function deleteBills() {
    const checkboxes = document.querySelectorAll('#billsTable input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('Please select bills to delete');
        return;
    }
    
    if (confirm(`Delete ${checkboxes.length} bill(s)?`)) {
        checkboxes.forEach(cb => {
            const invoiceNo = cb.dataset.invoice;
            appState.invoices = appState.invoices.filter(inv => inv.invoiceNo !== invoiceNo);
        });
        saveToStorage('invoices', appState.invoices);
        renderBillsTable();
    }
}

function exportBills() {
    const csv = convertToCSV(appState.invoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        date: inv.date,
        customer: inv.customer?.name || 'N/A',
        total: inv.total.toFixed(2),
        status: 'Completed'
    })), ['invoiceNo', 'date', 'customer', 'total', 'status']);
    downloadCSV(csv, 'bills-export.csv');
}

// ========================================
// CALCULATOR WITH EDITABLE EXPRESSION
// ========================================
function initializeCalculatorListeners() {
    const resultInput = document.getElementById('calcResult');
    
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', handleCalculatorInput);
    });
    
    if (resultInput) {
        resultInput.addEventListener('input', (e) => {
            calcState.currentValue = e.target.value || '0';
        });
        
        resultInput.addEventListener('click', (e) => {
            e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        });
    }
    
    document.addEventListener('keydown', (e) => {
        const calcWindow = document.getElementById('window-calculator');
        if (calcWindow && calcWindow.classList.contains('active')) {
            const key = e.key;
            
            if (/[0-9.]/.test(key)) {
                handleCalculatorInput({ target: { dataset: { value: key } } });
            } else if (key === '+' || key === '-' || key === '*' || key === '/') {
                handleCalculatorInput({ target: { dataset: { value: key } } });
            } else if (key === 'Enter') {
                e.preventDefault();
                handleCalculatorInput({ target: { dataset: { value: '=' } } });
            } else if (key === 'Escape') {
                handleCalculatorInput({ target: { dataset: { value: 'C' } } });
            } else if (key === 'Backspace' && !e.target.closest('#calcResult')) {
                e.preventDefault();
                handleCalculatorInput({ target: { dataset: { value: 'CE' } } });
            } else if (key === 'Delete') {
                e.preventDefault();
                const input = document.getElementById('calcResult');
                if (input) {
                    const cursorPos = input.selectionStart;
                    const value = input.value;
                    input.value = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
                    calcState.currentValue = input.value || '0';
                    input.setSelectionRange(cursorPos, cursorPos);
                }
            }
        }
    });
}

function handleCalculatorInput(e) {
    const value = e.target.dataset.value;
    
    if (value === 'C') {
        calcState.currentValue = '0';
        calcState.previousValue = '';
        calcState.operation = null;
        calcState.expression = '';
    } else if (value === 'CE') {
        calcState.currentValue = '0';
    } else if (value === '=') {
        calculateResult();
    } else if (['+', '-', '*', '/'].includes(value)) {
        handleOperation(value);
    } else if (value === '%') {
        calcState.currentValue = (parseFloat(calcState.currentValue) / 100).toString();
    } else {
        handleNumber(value);
    }
    
    updateCalculatorDisplay();
}

function handleNumber(value) {
    if (calcState.currentValue === '0' && value !== '.') {
        calcState.currentValue = value;
    } else {
        if (value === '.' && calcState.currentValue.includes('.')) return;
        calcState.currentValue += value;
    }
}

function handleOperation(op) {
    if (calcState.operation && calcState.previousValue) {
        calculateResult();
    }
    calcState.previousValue = calcState.currentValue;
    calcState.currentValue = '0';
    calcState.operation = op;
    
    const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op;
    calcState.expression = `${formatIndianNumber(calcState.previousValue)} ${opSymbol}`;
}

function calculateResult() {
    if (!calcState.operation || !calcState.previousValue) return;
    
    const prev = parseFloat(calcState.previousValue);
    const current = parseFloat(calcState.currentValue);
    let result = 0;
    
    switch(calcState.operation) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            result = current !== 0 ? prev / current : 0;
            break;
    }
    
    const opSymbol = calcState.operation === '*' ? '×' : calcState.operation === '/' ? '÷' : calcState.operation === '-' ? '−' : calcState.operation;
    const historyEntry = {
        expression: `${formatIndianNumber(prev)} ${opSymbol} ${formatIndianNumber(current)} = ${formatIndianNumber(result)}`,
        result: result,
        timestamp: new Date().toISOString()
    };
    
    calcState.history.unshift(historyEntry);
    if (calcState.history.length > 50) {
        calcState.history = calcState.history.slice(0, 50);
    }
    saveToStorage('calc_history', calcState.history);
    
    calcState.currentValue = result.toString();
    calcState.previousValue = '';
    calcState.operation = null;
    calcState.expression = '';
    
    renderCalculatorHistory();
}

function updateCalculatorDisplay() {
    const resultInput = document.getElementById('calcResult');
    const expressionDiv = document.getElementById('calcExpression');
    
    if (resultInput) resultInput.value = formatIndianNumber(calcState.currentValue);
    if (expressionDiv) expressionDiv.textContent = calcState.expression;
}

function renderCalculatorHistory() {
    const historyDiv = document.getElementById('calculatorHistory');
    if (!historyDiv) return;
    
    historyDiv.innerHTML = '';
    
    if (calcState.history.length === 0) {
        historyDiv.innerHTML = '<div style="text-align: center; color: #808080; padding: 20px;">No history yet</div>';
        return;
    }
    
    calcState.history.forEach((entry, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.textContent = entry.expression;
        itemDiv.addEventListener('click', () => {
            calcState.currentValue = entry.result.toString();
            calcState.expression = '';
            updateCalculatorDisplay();
        });
        historyDiv.appendChild(itemDiv);
    });
}

// ========================================
// SETTINGS (FIXED: Removed default tax rate)
// ========================================
function initializeSettingsListeners() {
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', resetSettings);
    
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
    
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => {
            document.getElementById('importDataFile').click();
        });
    }
    
    const importDataFile = document.getElementById('importDataFile');
    if (importDataFile) importDataFile.addEventListener('change', importAllData);
    
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', clearAllData);
}

function loadSettingsForm() {
    document.getElementById('itemsPerPage').value = appState.settings.itemsPerPage;
    document.getElementById('currencySymbol').value = appState.settings.currencySymbol;
    document.getElementById('invoicePrefix').value = appState.settings.invoicePrefix;
    document.getElementById('startingInvoiceNo').value = appState.settings.startingInvoiceNo;
    document.getElementById('paymentTerms').value = appState.settings.paymentTerms;
    document.getElementById('ignoreStock').checked = appState.settings.ignoreStock;
}

function saveSettings() {
    appState.settings.itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    appState.settings.currencySymbol = document.getElementById('currencySymbol').value;
    appState.settings.invoicePrefix = document.getElementById('invoicePrefix').value;
    appState.settings.startingInvoiceNo = parseInt(document.getElementById('startingInvoiceNo').value);
    appState.settings.paymentTerms = parseInt(document.getElementById('paymentTerms').value);
    appState.settings.ignoreStock = document.getElementById('ignoreStock').checked;
    
    saveToStorage('settings', appState.settings);
    alert('Settings saved successfully!');
}

function resetSettings() {
    if (confirm('Reset all settings to default?')) {
        appState.settings = {
            itemsPerPage: 100,
            currencySymbol: '₹',
            dateFormat: 'dd/mm/yyyy',
            invoicePrefix: 'INV',
            startingInvoiceNo: 1001,
            paymentTerms: 30,
            ignoreStock: false
        };
        saveToStorage('settings', appState.settings);
        loadSettingsForm();
        alert('Settings reset to default!');
    }
}

function exportAllData() {
    const exportData = {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        settings: appState.settings,
        profile: appState.profile,
        inventory: appState.inventory,
        customers: appState.customers,
        invoices: appState.invoices,
        stockRefills: appState.stockRefills,
        calcHistory: calcState.history
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invsys-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importAllData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            
            if (confirm('This will replace all existing data. Continue?')) {
                appState.settings = importedData.settings || appState.settings;
                appState.profile = importedData.profile || appState.profile;
                appState.inventory = importedData.inventory || [];
                appState.customers = importedData.customers || [];
                appState.invoices = importedData.invoices || [];
                appState.stockRefills = importedData.stockRefills || [];
                calcState.history = importedData.calcHistory || [];
                
                saveToStorage('settings', appState.settings);
                saveToStorage('profile', appState.profile);
                saveToStorage('inventory', appState.inventory);
                saveToStorage('customers', appState.customers);
                saveToStorage('invoices', appState.invoices);
                saveToStorage('stock_refills', appState.stockRefills);
                saveToStorage('calc_history', calcState.history);
                
                alert('Data imported successfully!');
                location.reload();
            }
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('WARNING: This will permanently delete ALL data. Are you absolutely sure?')) {
        if (confirm('Last chance! This cannot be undone.')) {
            localStorage.clear();
            alert('All data cleared. Reloading application...');
            location.reload();
        }
    }
}

// ========================================
// PROFILE
// ========================================
function initializeProfileListeners() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    
    const clearProfileBtn = document.getElementById('clearProfileBtn');
    if (clearProfileBtn) clearProfileBtn.addEventListener('click', clearProfile);
    
    const companyLogoFile = document.getElementById('companyLogoFile');
    if (companyLogoFile) companyLogoFile.addEventListener('change', handleLogoUpload);
}

function loadProfileForm() {
    const p = appState.profile;
    
    document.getElementById('companyName').value = p.companyName || '';
    document.getElementById('companyLogo').value = p.companyLogo || '';
    document.getElementById('companyAddress').value = p.companyAddress || '';
    document.getElementById('companyPhone').value = p.companyPhone || '';
    document.getElementById('companyEmail').value = p.companyEmail || '';
    document.getElementById('companyGST').value = p.companyGST || '';
    document.getElementById('companyPAN').value = p.companyPAN || '';
    document.getElementById('companyWebsite').value = p.companyWebsite || '';
    document.getElementById('ownerName').value = p.ownerName || '';
    document.getElementById('ownerDesignation').value = p.ownerDesignation || '';
    document.getElementById('ownerPhone').value = p.ownerPhone || '';
    document.getElementById('ownerEmail').value = p.ownerEmail || '';
    document.getElementById('bankName').value = p.bankName || '';
    document.getElementById('accountNumber').value = p.accountNumber || '';
    document.getElementById('ifscCode').value = p.ifscCode || '';
    document.getElementById('bankBranch').value = p.bankBranch || '';
}

function saveProfile() {
    appState.profile = {
        companyName: document.getElementById('companyName').value,
        companyLogo: document.getElementById('companyLogo').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyGST: document.getElementById('companyGST').value,
        companyPAN: document.getElementById('companyPAN').value,
        companyWebsite: document.getElementById('companyWebsite').value,
        ownerName: document.getElementById('ownerName').value,
        ownerDesignation: document.getElementById('ownerDesignation').value,
        ownerPhone: document.getElementById('ownerPhone').value,
        ownerEmail: document.getElementById('ownerEmail').value,
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        ifscCode: document.getElementById('ifscCode').value,
        bankBranch: document.getElementById('bankBranch').value
    };
    
    saveToStorage('profile', appState.profile);
    alert('Profile saved successfully!');
}

function clearProfile() {
    if (confirm('Clear all profile information?')) {
        appState.profile = {};
        saveToStorage('profile', appState.profile);
        loadProfileForm();
    }
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('companyLogo').value = event.target.result;
    };
    reader.readAsDataURL(file);
}

// ========================================
// DATE/TIME POPUP
// ========================================
function toggleDateTimePopup() {
    const popup = document.getElementById('datetimePopup');
    if (popup) {
        if (popup.style.display === 'none' || !popup.style.display) {
            showDateTimePopup();
        } else {
            hideDateTimePopup();
        }
    }
}

function showDateTimePopup() {
    const popup = document.getElementById('datetimePopup');
    if (!popup) return;
    
    const datetimeFull = document.getElementById('datetimeFull');
    const calendarMini = document.getElementById('calendarMini');
    
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (datetimeFull) {
        const fullDateTime = `${days[now.getDay()]}, ${now.getDate()}${getDaySuffix(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}<br>${now.toLocaleTimeString('en-IN')}`;
        datetimeFull.innerHTML = fullDateTime;
    }
    
    if (calendarMini) {
        generateMiniCalendar(calendarMini, now);
    }
    
    popup.style.display = 'block';
}

function hideDateTimePopup() {
    const popup = document.getElementById('datetimePopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function generateMiniCalendar(container, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = date.getDate();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = '<table><thead><tr>';
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody><tr>';
    
    for (let i = 0; i < firstDay; i++) {
        html += '<td></td>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        if ((firstDay + day - 1) % 7 === 0 && day !== 1) {
            html += '</tr><tr>';
        }
        const isToday = day === today ? 'today' : '';
        html += `<td class="${isToday}">${day}</td>`;
    }
    
    html += '</tr></tbody></table>';
    container.innerHTML = html;
}

// ========================================
// WINDOW MANAGEMENT
// ========================================
function initializeWindows() {
    document.querySelectorAll('.window').forEach(window => {
        const windowName = window.dataset.window;
        if (windowName !== 'dashboard') {
            window.style.display = 'none';
        }
    });
}

function openWindow(windowName) {
    const window = document.getElementById(`window-${windowName}`);
    if (!window) {
        console.log('Window not found:', windowName);
        return;
    }
    
    if (windowName === 'dashboard') {
        setActiveWindow(window);
        return;
    }
    
    window.style.display = 'flex';
    window.classList.remove('minimized');
    
    if (!window.style.left || window.style.left === '0px') {
        positionWindow(window);
    }
    
    setActiveWindow(window);
    
    switch(windowName) {
        case 'inventory':
            renderInventoryTable();
            break;
        case 'customer':
            renderCustomerTable();
            break;
        case 'sales':
            renderSalesReport();
            break;
        case 'bills':
            renderBillsTable();
            break;
        case 'invoice':
            initializeNewInvoice();
            break;
        case 'calculator':
            renderCalculatorHistory();
            break;
        case 'settings':
            loadSettingsForm();
            break;
        case 'profile':
            loadProfileForm();
            break;
    }
    
    appState.currentWindow = windowName;
}

function closeWindow(window) {
    if (window.classList.contains('dashboard-window')) return;
    window.style.display = 'none';
}

function minimizeWindow(window) {
    if (window.classList.contains('dashboard-window')) return;
    window.style.display = 'none';
}

function maximizeWindow(window) {
    if (window.classList.contains('dashboard-window')) return;
    window.classList.toggle('maximized');
}

function setActiveWindow(window) {
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active');
        w.classList.add('inactive');
    });
    window.classList.add('active');
    window.classList.remove('inactive');
    appState.activeWindow = window;
}

function positionWindow(window) {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    
    const desktopRect = desktop.getBoundingClientRect();
    const windowWidth = Math.min(desktopRect.width * 0.85, 900);
    const windowHeight = Math.min(desktopRect.height * 0.85, 700);
    
    const left = Math.max(10, (desktopRect.width - windowWidth) / 2);
    const top = Math.max(10, (desktopRect.height - windowHeight) / 2);
    
    window.style.left = left + 'px';
    window.style.top = top + 'px';
    window.style.width = windowWidth + 'px';
    window.style.height = windowHeight + 'px';
}

function initializeWindowControls(window) {
    const minimizeBtn = window.querySelector('.minimize-btn');
    const maximizeBtn = window.querySelector('.maximize-btn');
    const closeBtn = window.querySelector('.close-btn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            minimizeWindow(window);
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            maximizeWindow(window);
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeWindow(window);
        });
    }
    
    window.addEventListener('mousedown', () => {
        setActiveWindow(window);
    });
}

function makeWindowDraggable(window) {
    const header = window.querySelector('.window-header');
    if (!header) return;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls')) return;
        if (window.classList.contains('maximized')) return;
        
        appState.draggedWindow = window;
        appState.dragOffset = {
            x: e.clientX - window.offsetLeft,
            y: e.clientY - window.offsetTop
        };
        
        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', stopDragging);
    });
}

function dragWindow(e) {
    if (!appState.draggedWindow) return;
    
    const newLeft = e.clientX - appState.dragOffset.x;
    const newTop = e.clientY - appState.dragOffset.y;
    
    appState.draggedWindow.style.left = Math.max(0, newLeft) + 'px';
    appState.draggedWindow.style.top = Math.max(0, newTop) + 'px';
}

function stopDragging() {
    appState.draggedWindow = null;
    document.removeEventListener('mousemove', dragWindow);
    document.removeEventListener('mouseup', stopDragging);
}

// ========================================
// TASKBAR
// ========================================
function initializeTaskbar() {
    updateClock();
}

function updateClock() {
    const now = new Date();
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    const dateString = `${day}-${month}-${year}`;
    
    const trayTime = document.getElementById('trayTime');
    const trayDate = document.getElementById('trayDate');
    
    if (trayTime) trayTime.textContent = timeString;
    if (trayDate) trayDate.textContent = dateString;
}

function getDaySuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// ========================================
// START MENU
// ========================================
function toggleStartMenu() {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        if (startMenu.style.display === 'none' || !startMenu.style.display) {
            startMenu.style.display = 'block';
        } else {
            startMenu.style.display = 'none';
        }
    }
}

function hideStartMenu() {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        startMenu.style.display = 'none';
    }
}

// ========================================
// CSV UTILITIES
// ========================================
function convertToCSV(data, columns) {
    const header = columns.join(',');
    const rows = data.map(item => 
        columns.map(col => {
            const value = item[col] !== undefined ? item[col] : '';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
    );
    return [header, ...rows].join('\n');
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        return obj;
    });
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatIndianNumber(num) {
    const numStr = typeof num === 'number' ? num.toString() : String(num);
    const parts = numStr.split('.');
    let intPart = parts[0];
    const decPart = parts[1] ? '.' + parts[1] : '';
    
    let formatted = '';
    let count = 0;
    
    for (let i = intPart.length - 1; i >= 0; i--) {
        if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
            formatted = ',' + formatted;
        }
        formatted = intPart[i] + formatted;
        count++;
    }
    
    return formatted + decPart;
}

// ========================================
// PWA INSTALLATION
// ========================================
let deferredPrompt;

function checkInstallPrompt() {
    const isInstalled = localStorage.getItem('invsys_installed');
    if (isInstalled) return;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt('desktop');
    });
}

function showInstallPrompt(platform) {
    const prompt = document.getElementById('installPrompt');
    const message = document.getElementById('installMessage');
    const installBtn = document.getElementById('installBtn');
    
    if (!prompt || !message || !installBtn) return;
    
    let messageText = 'Install Invsys Manager as a desktop application for better experience.';
    message.textContent = messageText;
    prompt.style.display = 'flex';
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('invsys_installed', 'true');
            }
            deferredPrompt = null;
        }
        prompt.style.display = 'none';
    }, { once: true });
    
    const dismissBtn = document.getElementById('dismissBtn');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            prompt.style.display = 'none';
        }, { once: true });
    }
    
    const closeInstallPrompt = document.getElementById('closeInstallPrompt');
    if (closeInstallPrompt) {
        closeInstallPrompt.addEventListener('click', () => {
            prompt.style.display = 'none';
        }, { once: true });
    }
}

console.log('Invsys Manager v1.03 - Script loaded successfully!');
