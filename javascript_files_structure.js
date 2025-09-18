// =====================================================================
// 📁 config.js - Configuración Global de la Aplicación
// =====================================================================

const CONFIG = {
    // 🔗 URLs de billeteras de prueba Interledger
    TEST_WALLETS: {
        demo: {
            name: 'Demo Wallet',
            url: 'https://red.ilpv4.dev',
            address: '$red.ilpv4.dev/alice',
            token: 'demo_token_123', // CAMBIAR por token real
            initialBalance: 1000.00
        },
        rafiki: {
            name: 'Rafiki Money',
            url: 'https://rafiki.money',
            address: '$rafiki.money/alice',
            token: 'rafiki_token_456', // CAMBIAR por token real
            initialBalance: 500.00
        },
        tigerbeetle: {
            name: 'TigerBeetle',
            url: 'https://tigerbeetle.com',
            address: '$tigerbeetle.com/alice',
            token: 'tiger_token_789', // CAMBIAR por token real
            initialBalance: 2000.00
        }
    },
    
    // 🎪 API de eventos (IMPLEMENTAR tu backend)
    EVENTS_API: {
        base_url: 'https://tu-api-eventos.com/api/v1',
        endpoints: {
            events: '/events',
            purchase: '/purchase',
            access: '/access',
            validate: '/validate'
        }
    },
    
    // 💰 Configuración de pagos
    PAYMENT_CONFIG: {
        default_currency: 'USD',
        min_amount: 0.01,
        max_amount: 10000,
        fee_percentage: 0.001, // 0.1%
        timeout_ms: 30000
    },
    
    // 🔐 Configuración de seguridad
    SECURITY: {
        session_duration: 24 * 60 * 60 * 1000, // 24 horas
        max_retry_attempts: 3,
        rate_limit_per_minute: 10
    },
    
    // 📱 Configuración PWA
    PWA_CONFIG: {
        name: 'PayLink - Pagos Interledger',
        short_name: 'PayLink',
        theme_color: '#667eea',
        background_color: '#ffffff'
    }
};

// =====================================================================
// 📁 interledger-api.js - Conexión Real con Interledger
// =====================================================================

class InterledgerAPI {
    constructor() {
        this.wallet = null;
        this.isConnected = false;
        this.balance = 0;
        this.connectionStatus = 'disconnected';
        this.retryCount = 0;
    }
    
    // 🔌 IMPLEMENTAR: Conectar con billetera real de Interledger
    async connectWallet(walletConfig) {
        try {
            console.log('Conectando a billetera:', walletConfig.name);
            
            // TODO: IMPLEMENTAR CONEXIÓN REAL
            // Opción 1: Web Monetization API
            if (document.monetization) {
                await this.setupWebMonetization(walletConfig);
            }
            
            // Opción 2: Direct HTTP Connection
            const connectionResult = await this.connectViaHTTP(walletConfig);
            
            if (connectionResult.success) {
                this.wallet = walletConfig;
                this.isConnected = true;
                this.connectionStatus = 'connected';
                
                // Obtener saldo inicial
                await this.refreshBalance();
                
                // Configurar listeners para actualizaciones
                this.setupRealtimeUpdates();
                
                return { success: true, wallet: walletConfig };
            }
            
            throw new Error(connectionResult.error);
            
        } catch (error) {
            console.error('Error conectando billetera:', error);
            this.connectionStatus = 'error';
            this.retryCount++;
            
            return { 
                success: false, 
                error: error.message,
                canRetry: this.retryCount < CONFIG.SECURITY.max_retry_attempts
            };
        }
    }
    
    // 🌐 IMPLEMENTAR: Conexión Web Monetization
    async setupWebMonetization(walletConfig) {
        return new Promise((resolve, reject) => {
            // Configurar payment pointer
            const metaTag = document.createElement('meta');
            metaTag.name = 'monetization';
            metaTag.content = walletConfig.address;
            document.head.appendChild(metaTag);
            
            document.monetization.addEventListener('monetizationstart', (event) => {
                console.log('Web Monetization iniciado:', event.detail);
                resolve({ success: true });
            });
            
            document.monetization.addEventListener('monetizationpending', (event) => {
                console.log('Web Monetization pendiente');
            });
            
            document.monetization.addEventListener('monetizationprogress', (event) => {
                // Actualizar balance con micropagos recibidos
                this.balance += parseFloat(event.detail.amount);
                this.updateBalanceUI();
            });
            
            // Timeout si no se conecta
            setTimeout(() => {
                reject(new Error('Timeout en Web Monetization'));
            }, 10000);
        });
    }
    
    // 🔗 IMPLEMENTAR: Conexión HTTP directa
    async connectViaHTTP(walletConfig) {
        try {
            const response = await fetch(`${walletConfig.url}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${walletConfig.token}`
                },
                body: JSON.stringify({
                    action: 'connect',
                    wallet_address: walletConfig.address
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return { success: true, session: data.session_id };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 💰 IMPLEMENTAR: Obtener saldo real
    async getBalance() {
        if (!this.isConnected) return 0;
        
        try {
            const response = await fetch(`${this.wallet.url}/balance`, {
                headers: {
                    'Authorization': `Bearer ${this.wallet.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error obteniendo saldo: ${response.status}`);
            }
            
            const data = await response.json();
            this.balance = parseFloat(data.balance) || 0;
            return this.balance;
            
        } catch (error) {
            console.error('Error obteniendo saldo:', error);
            // En modo demo, usar saldo simulado
            return this.wallet.initialBalance || 0;
        }
    }
    
    // 🚀 IMPLEMENTAR: Enviar pago real via STREAM
    async sendPayment(recipient, amount, memo = '') {
        if (!this.isConnected) {
            throw new Error('No hay conexión con la billetera');
        }
        
        if (amount > this.balance) {
            throw new Error('Saldo insuficiente');
        }
        
        try {
            // IMPLEMENTAR: Usar @interledger/pay library
            const paymentRequest = {
                destinationAccount: recipient,
                sourceAmount: this.convertToBaseUnits(amount),
                memo: memo,
                timeout: CONFIG.PAYMENT_CONFIG.timeout_ms
            };
            
            const response = await fetch(`${this.wallet.url}/pay`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.wallet.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentRequest)
            });
            
            if (!response.ok) {
                throw new Error(`Error en pago: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Actualizar balance local
            this.balance -= amount;
            this.updateBalanceUI();
            
            return {
                success: true,
                transactionId: result.transaction_id,
                fee: parseFloat(result.fee) || 0,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error enviando pago:', error);
            throw error;
        }
    }
    
    // 🔄 IMPLEMENTAR: Configurar actualizaciones en tiempo real
    setupRealtimeUpdates() {
        // WebSocket connection para actualizaciones
        if ('WebSocket' in window) {
            const ws = new WebSocket(`wss://${this.wallet.url}/ws`);
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'balance_update') {
                    this.balance = parseFloat(data.balance);
                    this.updateBalanceUI();
                } else if (data.type === 'payment_received') {
                    this.handleIncomingPayment(data);
                }
            };
        }
        
        // Fallback: polling cada 30 segundos
        setInterval(() => {
            this.refreshBalance();
        }, 30000);
    }
    
    // 📊 Actualizar UI con nuevo balance
    updateBalanceUI() {
        const balanceElement = document.getElementById('mainBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.balance.toFixed(2)}`;
            
            // Animación de cambio
            balanceElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                balanceElement.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    // 🔧 Utilidades
    convertToBaseUnits(amount) {
        return Math.floor(amount * 1000000); // Convertir a unidades más pequeñas
    }
    
    convertFromBaseUnits(baseUnits) {
        return baseUnits / 1000000;
    }
    
    async refreshBalance() {
        this.balance = await this.getBalance();
        this.updateBalanceUI();
    }
}

// =====================================================================
// 📁 payment-handler.js - Lógica de Procesamiento de Pagos
// =====================================================================

class PaymentHandler {
    constructor(ilpApi) {
        this.ilp = ilpApi;
        this.pendingPayments = new Map();
        this.transactionHistory = [];
    }
    
    // 🎪 IMPLEMENTAR: Procesar pago de evento con enlace de acceso
    async processEventPayment(eventId, amount) {
        try {
            // 1. Validar evento
            const event = await this.validateEvent(eventId, amount);
            if (!event.available) {
                throw new Error('Evento no disponible o agotado');
            }
            
            // 2. Procesar pago via Interledger
            const payment = await this.ilp.sendPayment(
                event.payment_address,
                amount,
                `Entrada para ${event.name} - ID: ${eventId}`
            );
            
            if (!payment.success) {
                throw new Error('Error procesando pago');
            }
            
            // 3. Generar enlace de acceso seguro
            const accessData = await this.generateEventAccess(eventId, {
                transactionId: payment.transactionId,
                amount: amount,
                timestamp: payment.timestamp
            });
            
            // 4. Registrar transacción
            this.addTransaction({
                type: 'event_payment',
                eventId: eventId,
                eventName: event.name,
                amount: -amount,
                fee: payment.fee,
                status: 'completed',
                transactionId: payment.transactionId,
                accessLink: accessData.link,
                timestamp: new Date()
            });
            
            // 5. Enviar confirmación por email (opcional)
            await this.sendEventConfirmation(accessData);
            
            return {
                success: true,
                transactionId: payment.transactionId,
                accessLink: accessData.link,
                expiresAt: accessData.expiresAt,
                event: event
            };
            
        } catch (error) {
            console.error('Error en pago de evento:', error);
            throw error;
        }
    }
    
    // 🔐 IMPLEMENTAR: Generar enlace seguro de acceso
    async generateEventAccess(eventId, paymentProof) {
        try {
            const response = await fetch(`${CONFIG.EVENTS_API.base_url}${CONFIG.EVENTS_API.endpoints.access}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: eventId,
                    paymentProof: paymentProof,
                    timestamp: Date.now(),
                    // Generar token único
                    accessToken: this.generateSecureToken()
                })
            });
            
            if (!response.ok) {
                throw new Error('Error generando acceso al evento');
            }
            
            const data = await response.json();
            
            // Formato del enlace:
            // https://eventos.com/join/EVENTO_ID?token=TOKEN_ACCESO&expires=TIMESTAMP
            const accessLink = `${data.base_url}/join/${eventId}?token=${data.access_token}&expires=${data.expires_at}`;
            
            return {
                link: accessLink,
                token: data.access_token,
                expiresAt: data.expires_at
            };
            
        } catch (error) {
            // En modo demo, generar enlace simulado
            const demoToken = this.generateSecureToken();
            const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
            
            return {
                link: `https://demo-events.paylink.com/join/${eventId}?token=${demoToken}&expires=${expiresAt}`,
                token: demoToken,
                expiresAt: expiresAt
            };
        }
    }
    
    // 📱 IMPLEMENTAR: Pago por teléfono (NFC/Bluetooth)
    async payByPhone() {
        try {
            // Opción 1: Web NFC API
            if ('NDEFReader' in window) {
                return await this.payViaNFC();
            }
            // Opción 2: Web Bluetooth API
            else if ('bluetooth' in navigator) {
                return await this.payViaBluetooth();
            }
            // Opción 3: QR Code fallback
            else {
                return await this.payViaQR();
            }
        } catch (error) {
            console.error('Error en pago por teléfono:', error);
            throw new Error('Función no disponible en este dispositivo');
        }
    }
    
    // 📡 IMPLEMENTAR: Pago via NFC
    async payViaNFC() {
        const ndef = new NDEFReader();
        await ndef.scan();
        
        return new Promise((resolve, reject) => {
            ndef.addEventListener("reading", async ({ message }) => {
                try {
                    // Parsear datos NFC
                    const paymentData = this.parseNFCData(message);
                    
                    // Mostrar confirmación al usuario
                    const confirmed = await this.showPaymentConfirmation({
                        recipient: paymentData.merchant_name,
                        amount: paymentData.amount,
                        concept: paymentData.description
                    });
                    
                    if (confirmed) {
                        const result = await this.ilp.sendPayment(
                            paymentData.payment_address,
                            paymentData.amount,
                            paymentData.description
                        );
                        resolve(result);
                    } else {
                        reject(new Error('Pago cancelado por usuario'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            // Timeout después de 30 segundos
            setTimeout(() => {
                reject(new Error('Timeout esperando dispositivo NFC'));
            }, 30000);
        });
    }
    
    // 🔷 IMPLEMENTAR: Pago via Bluetooth
    async payViaBluetooth() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'PayLink-' }],
            optionalServices: ['payment-service']
        });
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('payment-service');
        const characteristic = await service.getCharacteristic('payment-data');
        
        // Leer datos de pago del dispositivo
        const value = await characteristic.readValue();
        const paymentData = this.parseBluetoothData(value);
        
        // Procesar pago
        return await this.ilp.sendPayment(
            paymentData.payment_address,
            paymentData.amount,
            paymentData.description
        );
    }
    
    // 💳 IMPLEMENTAR: Integración con Payment Request API
    async payByCard(amount, description) {
        if (!('PaymentRequest' in window)) {
            throw new Error('Payment Request API no disponible');
        }
        
        const supportedMethods = [
            {
                supportedMethods: 'basic-card',
                data: {
                    supportedNetworks: ['visa', 'mastercard', 'amex']
                }
            },
            {
                supportedMethods: 'interledger',
                data: {
                    merchantId: 'paylink-merchant-001'
                }
            }
        ];
        
        const details = {
            total: {
                label: description || 'Pago PayLink',
                amount: { currency: 'USD', value: amount.toString() }
            }
        };
        
        const request = new PaymentRequest(supportedMethods, details);
        const response = await request.show();
        
        // Procesar respuesta del pago
        const result = await this.processCardPayment(response);
        await response.complete('success');
        
        return result;
    }
    
    // 🔍 IMPLEMENTAR: Validar evento antes del pago
    async validateEvent(eventId, expectedAmount) {
        try {
            const response = await fetch(`${CONFIG.EVENTS_API.base_url}${CONFIG.EVENTS_API.endpoints.validate}/${eventId}`);
            
            if (!response.ok) {
                throw new Error('Evento no encontrado');
            }
            
            const event = await response.json();
            
            // Validaciones
            if (!event.available) {
                throw new Error('Evento ya no está disponible');
            }
            
            if (event.price !== expectedAmount) {
                throw new Error('Precio del evento ha cambiado');
            }
            
            if (new Date(event.start_date) < new Date()) {
                throw new Error('El evento ya comenzó');
            }
            
            return event;
            
        } catch (error) {
            // En modo demo, devolver evento simulado
            return {
                id: eventId,
                name: 'Evento Demo',
                price: expectedAmount,
                available: true,
                payment_address: '$demo.paylink.com/events',
                start_date: new Date(Date.now() + 86400000).toISOString() // Mañana
            };
        }
    }
    
    // 📧 IMPLEMENTAR: Enviar confirmación por email
    async sendEventConfirmation(accessData) {
        try {
            await fetch(`${CONFIG.EVENTS_API.base_url}/send-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_link: accessData.link,
                    expires_at: accessData.expiresAt,
                    user_email: this.getCurrentUserEmail()
                })
            });
        } catch (error) {
            console.warn('No se pudo enviar email de confirmación:', error);
            // No fallar el pago por esto
        }
    }
    
    // 📝 Agregar transacción al historial
    addTransaction(transaction) {
        transaction.id = this.generateTransactionId();
        this.transactionHistory.unshift(transaction);
        
        // Guardar en localStorage para persistencia
        this.saveTransactionHistory();
        
        // Actualizar UI
        this.updateTransactionHistoryUI();
    }
    
    // 🔧 Utilidades
    generateSecureToken() {
        const array = new Uint32Array(8);
        crypto.getRandomValues(array);
        return Array.from(array, dec => dec.toString(16)).join('');
    }
    
    generateTransactionId() {
        return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    parseNFCData(message) {
        // IMPLEMENTAR: Parser para datos NFC específicos
        const record = message.records[0];
        const data = JSON.parse(new TextDecoder().decode(record.data));
        return data;
    }
    
    parseBluetoothData(value) {
        // IMPLEMENTAR: Parser para datos Bluetooth
        const data = new TextDecoder().decode(value);
        return JSON.parse(data);
    }
    
    getCurrentUserEmail() {
        // IMPLEMENTAR: Obtener email del usuario logueado
        return localStorage.getItem('user_email') || 'demo@paylink.com';
    }
    
    saveTransactionHistory() {
        localStorage.setItem('paylink_transactions', JSON.stringify(this.transactionHistory));
    }
    
    loadTransactionHistory() {
        const saved = localStorage.getItem('paylink_transactions');
        if (saved) {
            this.transactionHistory = JSON.parse(saved);
        }
    }
    
    updateTransactionHistoryUI() {
        // Esta función se implementará en ui-controller.js
        if (window.uiController) {
            window.uiController.refreshTransactionHistory(this.transactionHistory);
        }
    }
}

// =====================================================================
// 📁 ui-controller.js - Control de Interfaz de Usuario
// =====================================================================

class UIController {
    constructor() {
        this.currentSection = 'wallet';
        this.isLoggedIn = false;
        this.userData = null;
        this.events = [];
        this.filteredEvents = [];
    }
    
    // 🚀 Inicializar la interfaz
    init() {
        this.setupEventListeners();
        this.loadSavedState();
    }
    
    // 🎭 IMPLEMENTAR: Mostrar pantalla de login
    showLoginScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        
        // Animación de entrada
        const loginContainer = document.querySelector('.login-container');
        loginContainer.style.opacity = '0';
        loginContainer.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            loginContainer.style.transition = 'all 0.5s ease';
            loginContainer.style.opacity = '1';
            loginContainer.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // 📱 IMPLEMENTAR: Mostrar app principal después del login
    async showMainApp(userData) {
        this.userData = userData;
        this.isLoggedIn = true;
        
        // Ocultar login y mostrar app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Actualizar información del usuario
        this.updateUserInfo(userData);
        
        // Cargar contenido inicial
        await this.loadInitialData();
        
        // Mostrar sección de billetera por defecto
        this.showSection('wallet');
        
        // Guardar sesión
        this.saveSession(userData);
    }
    
    // 👤 Actualizar información del usuario en la UI
    updateUserInfo(userData) {
        document.getElementById('userName').textContent = userData.name || 'Usuario';
        document.getElementById('userIlpAddress').value = userData.ilpAddress || '';
        document.getElementById('mainBalance').textContent = `${(userData.balance || 0).toFixed(2)}`;
        
        // Actualizar estado de conexión
        this.updateConnectionStatus('connected');
    }
    
    // 🔄 Actualizar estado de conexión
    updateConnectionStatus(status) {
        const statusElements = document.querySelectorAll('.connection-status');
        const indicators = document.querySelectorAll('.status-indicator');
        
        statusElements.forEach(el => {
            const text = el.querySelector('span:not(.status-indicator)');
            if (text) {
                switch(status) {
                    case 'connected':
                        text.textContent = 'Conectado';
                        break;
                    case 'connecting':
                        text.textContent = 'Conectando...';
                        break;
                    case 'error':
                        text.textContent = 'Error de conexión';
                        break;
                }
            }
        });
        
        indicators.forEach(indicator => {
            indicator.className = `status-indicator status-${status}`;
        });
    }
    
    // 📊 IMPLEMENTAR: Cargar datos iniciales
    async loadInitialData() {
        try {
            // Cargar eventos disponibles
            await this.loadEvents();
            
            // Cargar historial de transacciones
            this.loadTransactionHistory();
            
            // Configurar actualizaciones automáticas
            this.setupAutoRefresh();
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showError('Error cargando datos de la aplicación');
        }
    }
    
    // 🎪 IMPLEMENTAR: Cargar eventos desde la API
    async loadEvents() {
        try {
            this.showLoadingState('events');
            
            const response = await fetch(`${CONFIG.EVENTS_API.base_url}${CONFIG.EVENTS_API.endpoints.events}`);
            
            if (!response.ok) {
                throw new Error('Error cargando eventos');
            }
            
            const events = await response.json();
            this.events = events;
            this.filteredEvents = events;
            
            this.renderEvents();
            
        } catch (error) {
            console.error('Error cargando eventos:', error);
            
            // En modo demo, cargar eventos simulados
            this.loadDemoEvents();
        }
    }
    
    // 🎭 Cargar eventos de demostración
    loadDemoEvents() {
        this.events = [
            {
                id: 'jazz-night-001',
                title: 'Concierto Virtual Jazz Night',
                date: '25 Septiembre, 8:00 PM',
                price: 25.00,
                category: 'music',
                icon: '🎵',
                description: 'Una noche de jazz en vivo con músicos de clase mundial',
                duration: '2 horas',
                available_tickets: 150,
                payment_address: '$demo.paylink.com/jazz-night'
            },
            {
                id: 'tech-summit-001',
                title: 'Conferencia Tech Summit 2024',
                date: '30 Septiembre, 10:00 AM',
                price: 75.00,
                category: 'tech',
                icon: '📚',
                description: 'Las últimas tendencias en tecnología blockchain e IA',
                duration: '6 horas',
                available_tickets: 500,
                payment_address: '$demo.paylink.com/tech-summit'
            },
            {
                id: 'art-workshop-001',
                title: 'Workshop de Arte Digital',
                date: '5 Octubre, 3:00 PM',
                price: 40.00,
                category: 'art',
                icon: '🎨',
                description: 'Aprende técnicas avanzadas de arte digital',
                duration: '3 horas',
                available_tickets: 50,
                payment_address: '$demo.paylink.com/art-workshop'
            },
            {
                id: 'crypto-webinar-001',
                title: 'Webinar: Futuro de las Criptomonedas',
                date: '8 Octubre, 7:00 PM',
                price: 15.00,
                category: 'tech',
                icon: '₿',
                description: 'Análisis del mercado crypto y tendencias 2024',
                duration: '1.5 horas',
                available_tickets: 1000,
                payment_address: '$demo.paylink.com/crypto-webinar'
            }
        ];
        
        this.filteredEvents = this.events;
        this.renderEvents();
    }
    
    // 🎨 Renderizar eventos en la UI
    renderEvents() {
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '';
        
        this.filteredEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            eventsGrid.appendChild(eventCard);
        });
    }
    
    // 🃏 Crear tarjeta de evento
    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.setAttribute('data-category', event.category);
        
        // Generar gradiente dinámico basado en categoría
        const gradient = this.getGradientForCategory(event.category);
        
        card.innerHTML = `
            <div class="event-image" style="background: ${gradient}">
                ${event.icon}
            </div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-date">${event.date}</div>
                <div class="event-description">${event.description}</div>
                <div class="event-details">
                    <span>⏱️ ${event.duration}</span>
                    <span>🎫 ${event.available_tickets} disponibles</span>
                </div>
                <div class="event-price">${event.price.toFixed(2)}</div>
                <button class="btn btn-primary" onclick="payForEvent('${event.id}', ${event.price}, '${event.title}')">
                    🎟️ Comprar Entrada
                </button>
            </div>
        `;
        
        return card;
    }
    
    // 🌈 Obtener gradiente por categoría
    getGradientForCategory(category) {
        const gradients = {
            music: 'linear-gradient(45deg, #ff6b6b, #feca57)',
            tech: 'linear-gradient(45deg, #667eea, #764ba2)',
            art: 'linear-gradient(45deg, #f093fb, #f5576c)',
            business: 'linear-gradient(45deg, #4facfe, #00f2fe)',
            default: 'linear-gradient(45deg, #43cea2, #185a9d)'
        };
        
        return gradients[category] || gradients.default;
    }
    
    // 🔍 Filtrar eventos por categoría
    filterEvents(category) {
        // Actualizar botones de filtro
        document.querySelectorAll('.events-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Filtrar eventos
        if (category === 'all') {
            this.filteredEvents = this.events;
        } else {
            this.filteredEvents = this.events.filter(event => event.category === category);
        }
        
        // Re-renderizar
        this.renderEvents();
        
        // Animación de filtrado
        this.animateEventCards();
    }
    
    // ✨ Animar tarjetas de eventos
    animateEventCards() {
        const cards = document.querySelectorAll('.event-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    // 📱 IMPLEMENTAR: Navegación entre secciones
    showSection(sectionName) {
        // Remover clase active de navegación actual
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Agregar active al botón seleccionado
        const activeBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }
        
        // Ejecutar lógica específica por sección
        this.onSectionChange(sectionName);
    }
    
    // 🔄 Ejecutar cuando cambia la sección
    onSectionChange(sectionName) {
        switch(sectionName) {
            case 'wallet':
                this.refreshWalletData();
                break;
            case 'events':
                this.refreshEventsData();
                break;
            case 'history':
                this.refreshHistoryData();
                break;
        }
    }
    
    // 💰 Refrescar datos de billetera
    async refreshWalletData() {
        if (window.ilpApi && window.ilpApi.isConnected) {
            await window.ilpApi.refreshBalance();
        }
    }
    
    // 🎪 Refrescar datos de eventos
    async refreshEventsData() {
        await this.loadEvents();
    }
    
    // 📊 Refrescar datos de historial
    refreshHistoryData() {
        this.loadTransactionHistory();
        this.renderTransactionHistory();
    }
    
    // 💸 IMPLEMENTAR: Mostrar modal de confirmación de pago
    async showPaymentConfirmation(paymentData) {
        return new Promise((resolve) => {
            // Llenar datos del modal
            document.getElementById('confirmRecipient').textContent = paymentData.recipient || 'Destinatario';
            document.getElementById('confirmAmount').textContent = `${paymentData.amount.toFixed(2)}`;
            document.getElementById('confirmConc