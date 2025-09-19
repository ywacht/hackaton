// =====================================================================
// 🔥 IMPLEMENTACIÓN COMPLETA DE OPEN PAYMENTS PARA MARKETPLACE
// =====================================================================
// 
// Este archivo contiene todo lo que necesitas para implementar pagos
// de punto A a punto B usando Open Payments API
//
// Wallet de prueba: https://wallet.interledger-test.dev/
// Documentación: https://docs.openpayments.dev/
// =====================================================================

/**
 * 📋 CONFIGURACIÓN INICIAL
 * Configura estas variables con tus datos reales
 */
const OPEN_PAYMENTS_CONFIG = {
    // URL base de la API de Open Payments
    baseUrl: 'https://wallet.interledger-test.dev',
    
    // Wallets de los merchants (organizadores de eventos)
    merchantWallets: {
        'jazz-concert': {
            walletAddress: 'https://wallet.interledger-test.dev/jazz-merchant',
            accessToken: 'TU_MERCHANT_TOKEN_1', // TODO: Obtener token real
            name: 'Jazz Productions Inc.'
        },
        'tech-summit': {
            walletAddress: 'https://wallet.interledger-test.dev/blockchain-events', 
            accessToken: 'TU_MERCHANT_TOKEN_2', // TODO: Obtener token real
            name: 'Blockchain Events Ltd.'
        },
        'art-workshop': {
            walletAddress: 'https://wallet.interledger-test.dev/creative-studio',
            accessToken: 'TU_MERCHANT_TOKEN_3', // TODO: Obtener token real
            name: 'Creative Studio Pro'
        }
    },
    
    // Configuración de pagos
    currency: {
        assetCode: 'USD',
        assetScale: 2 // 2 decimales para centavos
    },
    
    // Timeout para pagos (10 minutos)
    paymentTimeout: 10 * 60 * 1000
};

/**
 * 🔐 PASO 1: AUTENTICACIÓN CON OPEN PAYMENTS
 * Necesitas implementar OAuth 2.0 para obtener tokens de acceso
 */
class OpenPaymentsAuth {
    constructor() {
        this.clientTokens = new Map(); // Cache de tokens de clientes
        this.merchantTokens = new Map(); // Cache de tokens de merchants
    }
    
    /**
     * Obtener token de acceso para un cliente
     * El cliente debe autenticarse con su wallet
     */
    async getClientAccessToken(walletAddress) {
        // TODO: IMPLEMENTAR AUTENTICACIÓN REAL
        // En producción, esto debe usar el flujo OAuth 2.0 completo
        
        try {
            // Verificar si ya tienes el token en cache
            if (this.clientTokens.has(walletAddress)) {
                return this.clientTokens.get(walletAddress);
            }
            
            // IMPLEMENTAR: Solicitar token usando Client Credentials Flow
            const tokenRequest = await fetch(`${walletAddress}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa('CLIENT_ID:CLIENT_SECRET')}` // TODO: Tus credenciales reales
                },
                body: new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'scope': 'incoming-payments outgoing-payments'
                })
            });
            
            if (!tokenRequest.ok) {
                throw new Error(`Error obteniendo token: ${tokenRequest.status}`);
            }
            
            const tokenData = await tokenRequest.json();
            
            // Guardar token en cache
            this.clientTokens.set(walletAddress, tokenData.access_token);
            
            // Configurar expiración del token
            setTimeout(() => {
                this.clientTokens.delete(walletAddress);
            }, tokenData.expires_in * 1000);
            
            return tokenData.access_token;
            
        } catch (error) {
            console.error('Error obteniendo token del cliente:', error);
            
            // Para pruebas, devolver token simulado
            const mockToken = `mock_client_token_${Date.now()}`;
            this.clientTokens.set(walletAddress, mockToken);
            return mockToken;
        }
    }
    
    /**
     * Obtener token de acceso para un merchant
     * Los merchants deben registrarse previamente en tu plataforma
     */
    getMerchantAccessToken(eventId) {
        const merchantData = OPEN_PAYMENTS_CONFIG.merchantWallets[eventId];
        if (!merchantData) {
            throw new Error(`Merchant no encontrado para evento: ${eventId}`);
        }
        
        return merchantData.accessToken;
    }
}

/**
 * 💸 PASO 2: CLASE PRINCIPAL PARA MANEJAR PAGOS
 * Esta clase encapsula toda la lógica de Open Payments
 */
class OpenPaymentsService {
    constructor() {
        this.auth = new OpenPaymentsAuth();
        this.pendingPayments = new Map();
    }
    
    /**
     * 🎯 FUNCIÓN PRINCIPAL: Procesar pago completo de evento
     * Esta es la función que llamarás desde tu UI
     */
    async processEventPayment(eventId, clientWallet, amount, eventName) {
        try {
            console.log(`🚀 Iniciando pago para evento: ${eventId}`);
            
            // Paso 1: Validar datos
            this.validatePaymentData(eventId, clientWallet, amount);
            
            // Paso 2: Obtener información del merchant
            const merchantData = OPEN_PAYMENTS_CONFIG.merchantWallets[eventId];
            if (!merchantData) {
                throw new Error(`Evento no encontrado: ${eventId}`);
            }
            
            // Paso 3: Crear incoming payment (lado del merchant)
            const incomingPayment = await this.createIncomingPayment(
                merchantData,
                amount,
                `Entrada para ${eventName} - Evento ID: ${eventId}`
            );
            
            console.log('✅ Incoming payment creado:', incomingPayment.id);
            
            // Paso 4: Crear outgoing payment (lado del cliente)
            const outgoingPayment = await this.createOutgoingPayment(
                clientWallet,
                incomingPayment.receiver,
                amount
            );
            
            console.log('✅ Outgoing payment creado:', outgoingPayment.id);
            
            // Paso 5: Monitorear el progreso del pago
            const paymentResult = await this.monitorPaymentProgress(
                clientWallet,
                outgoingPayment.id
            );
            
            // Paso 6: Generar acceso al evento
            const accessData = await this.generateEventAccess(eventId, {
                incomingPaymentId: incomingPayment.id,
                outgoingPaymentId: outgoingPayment.id,
                amount: amount,
                clientWallet: clientWallet,
                merchantWallet: merchantData.walletAddress
            });
            
            console.log('🎫 Acceso al evento generado');
            
            return {
                success: true,
                paymentId: outgoingPayment.id,
                accessLink: accessData.link,
                expiresAt: accessData.expiresAt
            };
            
        } catch (error) {
            console.error('❌ Error procesando pago:', error);
            throw error;
        }
    }
    
    /**
     * 📥 Crear Incoming Payment (Lado del Merchant)
     * Esto le dice al wallet del merchant que espere un pago
     */
    async createIncomingPayment(merchantData, amount, description) {
        try {
            const response = await fetch(`${merchantData.walletAddress}/incoming-payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${merchantData.accessToken}`
                },
                body: JSON.stringify({
                    walletAddress: merchantData.walletAddress,
                    incomingAmount: {
                        value: this.convertToBaseUnits(amount).toString(),
                        assetCode: OPEN_PAYMENTS_CONFIG.currency.assetCode,
                        assetScale: OPEN_PAYMENTS_CONFIG.currency.assetScale
                    },
                    description: description,
                    expiresAt: new Date(Date.now() + OPEN_PAYMENTS_CONFIG.paymentTimeout).toISOString()
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error HTTP ${response.status}: ${errorData.message || 'Error desconocido'}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error creando incoming payment:', error);
            throw new Error(`No se pudo crear incoming payment: ${error.message}`);
        }
    }
    
    /**
     * 📤 Crear Outgoing Payment (Lado del Cliente)
     * Esto inicia la transferencia desde el wallet del cliente
     */
    async createOutgoingPayment(clientWallet, receiverUrl, amount) {
        try {
            // Obtener token del cliente
            const clientToken = await this.auth.getClientAccessToken(clientWallet);
            
            const response = await fetch(`${clientWallet}/outgoing-payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clientToken}`
                },
                body: JSON.stringify({
                    walletAddress: clientWallet,
                    receiver: receiverUrl, // URL del incoming payment
                    sendAmount: {
                        value: this.convertToBaseUnits(amount).toString(),
                        assetCode: OPEN_PAYMENTS_CONFIG.currency.assetCode,
                        assetScale: OPEN_PAYMENTS_CONFIG.currency.assetScale
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error HTTP ${response.status}: ${errorData.message || 'Error desconocido'}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error creando outgoing payment:', error);
            throw new Error(`No se pudo crear outgoing payment: ${error.message}`);
        }
    }
    
    /**
     * 👀 Monitorear el progreso del pago
     * Verifica el estado hasta que se complete o falle
     */
    async monitorPaymentProgress(clientWallet, paymentId) {
        const maxAttempts = 60; // 2 minutos máximo (60 intentos de 2 segundos)
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const clientToken = await this.auth.getClientAccessToken(clientWallet);
                
                const response = await fetch(`${clientWallet}/outgoing-payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${clientToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error consultando estado: ${response.status}`);
                }
                
                const payment = await response.json();
                
                console.log(`📊 Estado del pago (intento ${attempts + 1}): ${payment.state}`);
                
                switch (payment.state) {
                    case 'COMPLETED':
                        return { success: true, payment };
                    
                    case 'FAILED':
                        throw new Error(`Pago falló: ${payment.error || 'Razón desconocida'}`);
                    
                    case 'FUNDING':
                    case 'SENDING':
                        // Continuar monitoreando
                        break;
                    
                    default:
                        console.warn(`Estado desconocido: ${payment.state}`);
                }
                
                // Esperar 2 segundos antes del siguiente intento
                await this.sleep(2000);
                attempts++;
                
            } catch (error) {
                console.error(`Error en intento ${attempts + 1}:`, error);
                attempts++;
                await this.sleep(2000);
            }
        }
        
        throw new Error('Timeout: El pago no se completó en el tiempo esperado (2 minutos)');
    }
    
    /**
     * 🎫 Generar acceso al evento después del pago exitoso
     */
    async generateEventAccess(eventId, paymentData) {
        try {
            // Generar token único para el acceso
            const accessToken = this.generateSecureToken();
            const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
            
            // Datos del acceso
            const accessData = {
                eventId: eventId,
                accessToken: accessToken,
                paymentId: paymentData.outgoingPaymentId,
                amount: paymentData.amount,
                clientWallet: paymentData.clientWallet,
                merchantWallet: paymentData.merchantWallet,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(expiresAt).toISOString(),
                status: 'active'
            };
            
            // TODO: GUARDAR EN TU BASE DE DATOS
            await this.saveEventAccess(accessData);
            
            // Generar enlace de acceso
            const accessLink = `https://eventos.tudominio.com/join/${eventId}?token=${accessToken}&payment=${paymentData.outgoingPaymentId}&expires=${expiresAt}`;
            
            // TODO: ENVIAR EMAIL AL CLIENTE (opcional)
            await this.sendAccessEmail(paymentData.clientWallet, accessLink, eventId);
            
            return {
                link: accessLink,
                token: accessToken,
                expiresAt: expiresAt
            };
            
        } catch (error) {
            console.error('Error generando acceso:', error);
            // En caso de error, devolver enlace básico
            return {
                link: `https://eventos.tudominio.com/join/${eventId}?payment=${paymentData.outgoingPaymentId}`,
                token: 'emergency_access',
                expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            };
        }
    }
    
    /**
     * 💾 Guardar datos de acceso en base de datos
     * DEBES IMPLEMENTAR esto con tu base de datos preferida
     */
    async saveEventAccess(accessData) {
        try {
            // TODO: IMPLEMENTAR con tu base de datos (MySQL, PostgreSQL, MongoDB, etc.)
            const response = await fetch('/api/event-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accessData)
            });
            
            if (!response.ok) {
                throw new Error(`Error guardando acceso: ${response.status}`);
            }
            
            console.log('💾 Datos de acceso guardados en BD');
            
        } catch (error) {
            console.error('⚠️ Error guardando en BD:', error);
            // En caso de error, guardar en localStorage como fallback
            const storageKey = `event_access_${accessData.eventId}_${accessData.accessToken}`;
            localStorage.setItem(storageKey, JSON.stringify(accessData));
        }
    }
    
    /**
     * 📧 Enviar email con enlace de acceso (opcional)
     */
    async sendAccessEmail(clientWallet, accessLink, eventId) {
        try {
            // TODO: IMPLEMENTAR tu servicio de email (SendGrid, Mailgun, etc.)
            await fetch('/api/send-access-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientWallet: clientWallet,
                    accessLink: accessLink,
                    eventId: eventId
                })
            });
            
            console.log('📧 Email de acceso enviado');
            
        } catch (error) {
            console.warn('⚠️ No se pudo enviar email:', error);
            // No fallar el proceso por esto
        }
    }
    
    /**
     * 🔍 Validar enlace de acceso al evento
     * Función para usar en tu página de eventos
     */
    async validateEventAccess(eventId, token, paymentId) {
        try {
            // TODO: CONSULTAR tu base de datos
            const response = await fetch(`/api/validate-access?event=${eventId}&token=${token}&payment=${paymentId}`);
            
            if (!response.ok) {
                throw new Error('Acceso no válido');
            }
            
            const accessData = await response.json();
            
            // Verificar expiración
            if (new Date(accessData.expiresAt) < new Date()) {
                throw new Error('El enlace de acceso ha expirado');
            }
            
            // Verificar estado
            if (accessData.status !== 'active') {
                throw new Error('El acceso ha sido revocado');
            }
            
            return {
                valid: true,
                eventId: accessData.eventId,
                accessGranted: true
            };
            
        } catch (error) {
            console.error('Error validando acceso:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }
    
    // =====================================================================
    // 🛠️ UTILIDADES Y FUNCIONES DE SOPORTE
    // =====================================================================
    
    /**
     * Convertir cantidad a unidades base (centavos)
     */
    convertToBaseUnits(amount) {
        return Math.round(amount * Math.pow(10, OPEN_PAYMENTS_CONFIG.currency.assetScale));
    }
    
    /**
     * Convertir de unidades base a cantidad normal
     */
    convertFromBaseUnits(baseUnits) {
        return baseUnits / Math.pow(10, OPEN_PAYMENTS_CONFIG.currency.assetScale);
    }
    
    /**
     * Generar token seguro
     */
    generateSecureToken() {
        const array = new Uint32Array(8);
        crypto.getRandomValues(array);
        return Array.from(array, dec => dec.toString(16)).join('');
    }
    
    /**
     * Función sleep para delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Validar datos de entrada
     */
    validatePaymentData(eventId, clientWallet, amount) {
        if (!eventId || typeof eventId !== 'string') {
            throw new Error('ID de evento inválido');
        }
        
        if (!clientWallet || !clientWallet.includes('wallet.interledger-test.dev')) {
            throw new Error('Wallet address de cliente inválido');
        }
        
        if (!amount || amount <= 0 || amount > 10000) {
            throw new Error('Cantidad inválida (debe ser entre $0.01 y $10,000)');
        }
        
        if (!OPEN_PAYMENTS_CONFIG.merchantWallets[eventId]) {
            throw new Error(`Evento no configurado: ${eventId}`);
        }
    }
}

/**
 * 📡 PASO 3: CONFIGURACIÓN DE WEBHOOKS
 * Los webhooks te notifican automáticamente cuando cambian los estados de pago
 */
class OpenPaymentsWebhooks {
    constructor(openPaymentsService) {
        this.paymentService = openPaymentsService;
    }
    
    /**
     * 🔧 Configurar webhooks en los wallets
     * Ejecuta esto una vez para configurar las notificaciones
     */
    async setupWebhooks() {
        const webhookUrl = 'https://tudominio.com/webhooks/open-payments';
        
        // Configurar webhook para cada merchant wallet
        for (const [eventId, merchantData] of Object.entries(OPEN_PAYMENTS_CONFIG.merchantWallets)) {
            try {
                await this.configureWalletWebhook(merchantData.walletAddress, webhookUrl, merchantData.accessToken);
                console.log(`✅ Webhook configurado para ${merchantData.name}`);
            } catch (error) {
                console.error(`❌ Error configurando webhook para ${eventId}:`, error);
            }
        }
    }
    
    /**
     * Configurar webhook individual
     */
    async configureWalletWebhook(walletAddress, webhookUrl, accessToken) {
        const response = await fetch(`${walletAddress}/webhooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                url: webhookUrl,
                events: [
                    'incoming_payment.completed',
                    'incoming_payment.expired',
                    'outgoing_payment.completed',
                    'outgoing_payment.failed'
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error configurando webhook: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * 📨 Manejar webhook recibido
     * Esta función debe ser llamada desde tu endpoint de webhook
     */
    async handleWebhook(webhookData) {
        try {
            const { type, data } = webhookData;
            
            console.log(`📡 Webhook recibido: ${type}`);
            
            switch (type) {
                case 'outgoing_payment.completed':
                    await this.handlePaymentCompleted(data);
                    break;
                    
                case 'outgoing_payment.failed':
                    await this.handlePaymentFailed(data);
                    break;
                    
                case 'incoming_payment.completed':
                    await this.handleIncomingPaymentCompleted(data);
                    break;
                    
                case 'incoming_payment.expired':
                    await this.handlePaymentExpired(data);
                    break;
                    
                default:
                    console.log(`ℹ️ Evento webhook no manejado: ${type}`);
            }
            
        } catch (error) {
            console.error('Error procesando webhook:', error);
            throw error;
        }
    }
    
    async handlePaymentCompleted(paymentData) {
        console.log('✅ Pago completado via webhook:', paymentData.id);
        
        // TODO: Actualizar estado en tu base de datos
        // TODO: Generar acceso al evento si no se había generado
        // TODO: Notificar al cliente
    }
    
    async handlePaymentFailed(paymentData) {
        console.log('❌ Pago falló via webhook:', paymentData.id);
        
        // TODO: Actualizar estado en tu base de datos
        // TODO: Notificar al cliente del fallo
        // TODO: Limpiar recursos reservados
    }
    
    async handleIncomingPaymentCompleted(paymentData) {
        console.log('💰 Incoming payment completado:', paymentData.id);
        
        // TODO: Actualizar estadísticas del merchant
        // TODO: Procesar lógica de negocio específica
    }
    
    async handlePaymentExpired(paymentData) {
        console.log('⏰ Payment expiró:', paymentData.id);
        
        // TODO: Limpiar recursos reservados
        // TODO: Liberar inventario si aplica
    }
}

/**
 * 🚀 PASO 4: CLASE DE INTEGRACIÓN PRINCIPAL
 * Esta es la clase que usarás en tu aplicación
 */
class EventPaymentSystem {
    constructor() {
        this.openPayments = new OpenPaymentsService();
        this.webhooks = new OpenPaymentsWebhooks(this.openPayments);
        this.isInitialized = false;
    }
    
    /**
     * 🔄 Inicializar el sistema
     */
    async initialize() {
        try {
            console.log('🚀 Inicializando sistema de pagos...');
            
            // Configurar webhooks
            await this.webhooks.setupWebhooks();
            
            this.isInitialized = true;
            console.log('✅ Sistema de pagos inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            throw error;
        }
    }
    
    /**
     * 💳 Procesar compra de evento (función principal para la UI)
     */
    async purchaseEvent(eventId, clientWallet, amount, eventName) {
        if (!this.isInitialized) {
            console.warn('⚠️ Sistema no inicializado, continuando...');
        }
        
        return await this.openPayments.processEventPayment(eventId, clientWallet, amount, eventName);
    }
    
    /**
     * 🔍 Validar acceso a evento
     */
    async validateAccess(eventId, token, paymentId) {
        return await this.openPayments.validateEventAccess(eventId, token, paymentId);
    }
    
    /**
     * 📡 Manejar webhook (para tu servidor)
     */
    async handleWebhook(webhookData) {
        return await this.webhooks.handleWebhook(webhookData);
    }
}

// =====================================================================
// 📖 EJEMPLO DE USO COMPLETO
// =====================================================================

/**
 * 🎯 Ejemplo de implementación en tu aplicación
 */

// 1. Inicializar el sistema
const paymentSystem = new EventPaymentSystem();

// 2. Función que conectas a tu botón de compra
async function purchaseEventHandler(eventId, price, eventName) {
    try {
        // Obtener wallet del cliente desde la UI
        const clientWallet = document.getElementById('clientWallet').value;
        
        // Mostrar indicador de carga
        showLoadingState();
        
        // Procesar pago
        const result = await paymentSystem.purchaseEvent(eventId, clientWallet, price, eventName);
        
        // Mostrar resultado exitoso
        showSuccessResult(result.accessLink);
        
    } catch (error) {
        // Mostrar error al usuario
        showErrorMessage(error.message);
    }
}

// 3. Endpoint de webhook en tu servidor (Express.js ejemplo)
/*
app.post('/webhooks/open-payments', async (req, res) => {
    try {
        await paymentSystem.handleWebhook(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).send('Error');
    }
});
*/

// 4. Endpoint para validar acceso (Express.js ejemplo)
/*
app.get('/api/validate-access', async (req, res) => {
    const { event, token, payment } = req.query;
    
    try {
        const result = await paymentSystem.validateAccess(event, token, payment);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
*/

// =====================================================================
// 📋 CHECKLIST DE IMPLEMENTACIÓN
// =====================================================================

/**
 * ✅ LISTA DE TAREAS PARA IMPLEMENTAR:
 * 
 * 1. CONFIGURACIÓN INICIAL:
 *    □ Registrar aplicación en Open Payments
 *    □ Obtener Client ID y Client Secret
 *    □ Configurar URLs de redirect para OAuth
 *    □ Actualizar tokens en OPEN_PAYMENTS_CONFIG
 * 
 * 2. AUTENTICACIÓN:
 *    □ Implementar flujo OAuth 2.0 completo
 *    □ Manejar refresh tokens
 *    □ Implementar almacenamiento seguro de tokens
 * 
 * 3. BASE DE DATOS:
 *    □ Crear tabla para event_access
 *    □ Crear tabla para transactions
 *    □ Implementar API endpoints para CRUD
 * 
 * 4. WEBHOOKS:
 *    □ Crear endpoint /webhooks/open-payments
 *    □ Configurar verificación de firma webhook
 *    □ Implementar manejo de eventos webhook
 * 
 * 5. FUNCIONALIDADES ADICIONALES:
 *    □ Sistema de emails para notificaciones
 *    □ Dashboard para merchants
 *    □ Reportes de transacciones
 *    □ Manejo de reembolsos
 * 
 * 6. SEGURIDAD:
 *    □ Validación de entrada
 *    □ Rate limiting
 *    □ Logs de auditoría
 *    □ Manejo de errores robusto
 * 
 * 7. TESTING:
 *    □ Tests unitarios
 *    □ Tests de integración con Open Payments
 *    □ Tests de flujo completo de pago
 *    □ Tests de webhook handling
 */

// =====================================================================
// 🔧 CONFIGURACIÓN DE DESARROLLO LOCAL
// =====================================================================

/**
 * Para desarrollo local, necesitas:
 * 
 * 1. Tunnel público (ngrok, etc.) para recibir webhooks:
 *    ngrok http 3000
 * 
 * 2. Variables de entorno:
 *    OPEN_PAYMENTS_CLIENT_ID=tu_client_id
 *    OPEN_PAYMENTS_CLIENT_SECRET=tu_client_secret
 *    WEBHOOK_URL=https://tu-ngrok-url.com/webhooks/open-payments
 *    DATABASE_URL=tu_database_connection_string
 * 
 * 3. Wallets de prueba:
 *    - Cliente: https://wallet.interledger-test.dev/alice
 *    - Merchant: https://wallet.interledger-test.dev/merchant
 */

// =====================================================================
// 🌟 EXPORTAR PARA USO EN PRODUCCIÓN
// =====================================================================

// Para usar en tu aplicación, importa la clase principal:
// import { EventPaymentSystem } from './open-payments-implementation.js';

// Si usas CommonJS:
// const { EventPaymentSystem } = require('./open-payments-implementation.js');

// Crear instancia global
if (typeof window !== 'undefined') {
    window.EventPaymentSystem = EventPaymentSystem;
    window.paymentSystem = new EventPaymentSystem();
    
    // Auto-inicializar en el navegador
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.paymentSystem.initialize();
            console.log('🎉 Sistema de pagos listo para usar');
        } catch (error) {
            console.error('❌ Error inicializando:', error);
        }
    });
}

// Para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EventPaymentSystem,
        OpenPaymentsService,
        OpenPaymentsAuth,
        OpenPaymentsWebhooks,
        OPEN_PAYMENTS_CONFIG
    };
}