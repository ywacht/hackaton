// main.js - Archivo principal de inicialización

// Variables globales
let ilpApi, paymentHandler, uiController, eventManager, historyManager;

// Función para inicializar la aplicación
function initApp() {
    // Inicializar componentes
    ilpApi = new InterledgerAPI();
    paymentHandler = new PaymentHandler(ilpApi);
    uiController = new UIController();
    eventManager = new EventManager();
    historyManager = new HistoryManager();
    
    // Simular conexión a Interledger
    setTimeout(() => {
        hideLoadingScreen();
        showLoginScreen();
    }, 2000);
    
    // Verificar si hay sesión guardada
    const savedSession = localStorage.getItem('paylink_session');
    if (savedSession) {
        const session = JSON.parse(savedSession);
        autoLogin(session);
    }
}

// Funciones de transición entre pantallas
function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
}

function showMainApp(userData) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Actualizar datos del usuario
    if (userData) {
        uiController.updateUserData(userData);
    }
}

// Funciones de login
function loginWithWallet() {
    // Mostrar formulario de conexión manual
    document.getElementById('manualConnectForm').style.display = 'block';
}

function createWallet() {
    uiController.showCreateWalletForm();
}

function demoLogin() {
    // Usar billetera de prueba
    const demoConfig = CONFIG.TEST_WALLETS.demo;
    ilpApi.connectWallet(demoConfig)
        .then(connected => {
            if (connected) {
                return ilpApi.getBalance();
            }
            throw new Error('No se pudo conectar');
        })
        .then(balance => {
            showMainApp({
                name: 'Usuario Demo',
                ilpAddress: demoConfig.address,
                balance: balance
            });
            return eventManager.loadEvents();
        })
        .catch(error => {
            console.error('Error en demo login:', error);
            alert('Error al conectar: ' + error.message);
        });
}

function connectManually() {
    const walletUrl = document.getElementById('walletUrl').value;
    const accessToken = document.getElementById('accessToken').value;
    
    if (walletUrl && accessToken) {
        const walletConfig = {
            url: walletUrl,
            token: accessToken
        };
        
        ilpApi.connectWallet(walletConfig)
            .then(connected => {
                if (connected) {
                    return ilpApi.getBalance();
                }
                throw new Error('No se pudo conectar');
            })
            .then(balance => {
                showMainApp({
                    name: 'Usuario Conectado',
                    ilpAddress: walletUrl,
                    balance: balance
                });
            })
            .catch(error => {
                console.error('Error en conexión manual:', error);
                alert('Error al conectar: ' + error.message);
            });
    } else {
        alert('Por favor, complete todos los campos');
    }
}

function cancelManualConnect() {
    document.getElementById('manualConnectForm').style.display = 'none';
}

// Funciones de navegación
function showSection(sectionId) {
    uiController.showSection(sectionId);
    
    // Cargar contenido específico de la sección
    switch(sectionId) {
        case 'events':
            eventManager.loadEvents();
            break;
        case 'history':
            historyManager.loadHistory();
            break;
    }
}

// Funciones de modal
function closeModal(modalId) {
    uiController.closeModal(modalId);
}

function showReceiveModal() {
    uiController.showReceiveModal();
}

function showSendModal() {
    uiController.showSendModal();
}

function copyAddress() {
    uiController.copyAddress();
}

function refreshBalance() {
    ilpApi.getBalance()
        .then(balance => {
            document.getElementById('mainBalance').textContent = `$${balance.toFixed(2)}`;
            uiController.showNotification('Saldo actualizado', 'success');
        })
        .catch(error => {
            console.error('Error actualizando saldo:', error);
            uiController.showNotification('Error al actualizar saldo', 'error');
        });
}

// Funciones de pago
function processPayment(event) {
    event.preventDefault();
    paymentHandler.processPaymentForm(event);
}

function confirmPayment() {
    paymentHandler.confirmPayment();
}

function scanQR() {
    paymentHandler.scanQR();
}

function payByPhone() {
    paymentHandler.payByPhone();
}

function payByCard() {
    paymentHandler.payByCard();
}

function requestPayment() {
    paymentHandler.requestPayment();
}

// Funciones de eventos
function filterEvents(category) {
    eventManager.filterEvents(category);
}

function payForEvent(eventId, amount) {
    paymentHandler.payForEvent(eventId, amount);
}

// Funciones de historial
function filterHistory(type) {
    historyManager.filterHistory(type);
}

// Otras funciones de UI
function showNotifications() {
    uiController.showNotifications();
}

function showSettings() {
    uiController.showSettings();
}

function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        ilpApi.disconnect();
        localStorage.removeItem('paylink_session');
        showLoginScreen();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);