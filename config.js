// config.js - Configuración global de la aplicación
const CONFIG = {
    // URLs de billeteras de prueba Interledger
    TEST_WALLETS: {
        demo: {
            url: 'https://red.ilpv4.dev',
            address: '$red.ilpv4.dev/alice',
            token: 'tu_token_de_prueba'
        },
        rafiki: {
            url: 'https://rafiki.money',
            address: '$rafiki.money/alice',
            token: 'tu_token_rafiki'
        }
    },
    
    // APIs de eventos
    EVENTS_API: 'https://tu-api-eventos.com/api',
    
    // Configuración de pagos
    DEFAULT_CURRENCY: 'USD',
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 10000,
    
    // Configuración de la aplicación
    APP_NAME: 'PayLink',
    VERSION: '1.0.0',
    
    // Tiempos de espera
    LOADING_TIMEOUT: 2000,
    CONNECTION_TIMEOUT: 10000
};