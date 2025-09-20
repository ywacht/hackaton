import express from 'express'
import { createAuthenticatedClient } from '@interledger/open-payments'
import dotenv from 'dotenv'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Para ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar variables de entorno
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

// Servir archivos estáticos desde public
app.use(express.static('public'))

// Configuración
const config = {
  port: process.env.PORT || 3002,
  // Merchant wallet (recibe los pagos)
  walletAddressUrl: process.env.WALLET_ADDRESS_URL || 'https://ilp.interledger-test.dev/carterah',
  privateKeyPath: process.env.PRIVATE_KEY_PATH || './private.key',
  keyId: process.env.KEY_ID || '67b0ec64-9d43-4f9d-bd94-eddaaedc75fe',
  appUrl: process.env.APP_URL || 'http://localhost:3002',
  // Cliente wallet por defecto (para demo)
  defaultClientWallet: 'https://ilp.interledger-test.dev/b-e'
}

// Store para pagos activos
const paymentStore = new Map()

// Cliente autenticado
let authenticatedClient = null

// Función para inicializar cliente autenticado
async function initializeClient() {
  try {
    console.log('🔧 Inicializando cliente autenticado Open Payments...')
    
    // Leer la clave privada
    let privateKey = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_PATH
    
    // Si es un path, leer el archivo
    if (privateKey && !privateKey.includes('BEGIN') && fs.existsSync(privateKey)) {
      privateKey = fs.readFileSync(privateKey, 'utf8')
    }
    
    // Limpiar la clave de comillas y espacios extra
    if (privateKey) {
      privateKey = privateKey.replace(/^"|"$/g, '').trim()
    }
    
    // Si la clave no tiene headers, agregarlos
    if (privateKey && !privateKey.includes('BEGIN')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
    }
    
    if (!privateKey) {
      throw new Error('Private key no encontrada. Verifica PRIVATE_KEY o PRIVATE_KEY_PATH en .env')
    }
    
    console.log('🔍 Private key cargada, longitud:', privateKey.length)
    console.log('🔍 Comienza con BEGIN:', privateKey.includes('BEGIN PRIVATE KEY'))
    
    authenticatedClient = await createAuthenticatedClient({
      walletAddressUrl: config.walletAddressUrl,
      // privateKey: privateKey.trim(),
      privateKey: "./private.key",
      keyId: config.keyId,
      validateResponses: false,
      requestTimeoutMs: 60000
    })
    
    console.log('✅ Cliente autenticado inicializado correctamente')
    console.log('🔑 Key ID:', config.keyId)
    console.log('🏪 Merchant Wallet (recibe pagos):', config.walletAddressUrl)
    console.log('👤 Cliente Wallet (por defecto):', config.defaultClientWallet)
    console.log('')
    
    return true
    
  } catch (error) {
    console.error('❌ Error inicializando cliente:', error)
    console.error('Detalles:', error.message)
    return false
  }
}

// ==============================================
// ENDPOINTS DEL MARKETPLACE
// ==============================================

// POST /api/marketplace/create-payment
app.post('/api/marketplace/create-payment', async (req, res) => {
  console.log('🔍 === INICIO CREATE PAYMENT ===')
  console.log('🔍 Body recibido:', JSON.stringify(req.body, null, 2))
  console.log('🔍 Cliente autenticado disponible:', !!authenticatedClient)
  
  try {
    const {
      eventId,
      eventName,
      amount,
      clientWalletAddress,
      merchantId
    } = req.body
    
    console.log('🎫 Nueva solicitud de pago:', { 
      eventId, 
      eventName, 
      amount,
      clientWallet: clientWalletAddress 
    })
    
    if (!authenticatedClient) {
      console.log('❌ Cliente no inicializado')
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible - Cliente no inicializado'
      })
    }
    
    // Validar inputs
    if (!eventId || !eventName || !amount || !clientWalletAddress) {
      console.log('❌ Campos faltantes:', { eventId: !!eventId, eventName: !!eventName, amount: !!amount, clientWalletAddress: !!clientWalletAddress })
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      })
    }
    
    // Para demo, usar el merchant wallet configurado en .env
    const merchantWalletUrl = config.walletAddressUrl
    
    console.log('🏪 Merchant wallet:', merchantWalletUrl)
    console.log('👤 Cliente wallet:', clientWalletAddress)
    
    // Validar que no sean el mismo wallet
    if (clientWalletAddress === merchantWalletUrl) {
      throw new Error('Cliente y Merchant no pueden usar el mismo wallet')
    }
    
    // Paso 1: Resolver wallet addresses
    console.log('📍 Resolviendo wallet addresses...')
    console.log('   Cliente:', clientWalletAddress)
    console.log('   Merchant:', merchantWalletUrl)
    
    let senderWalletAddress, receiverWalletAddress
    
    try {
      console.log('🔍 Resolviendo sender wallet...')
      senderWalletAddress = await authenticatedClient.walletAddress.get({ url: clientWalletAddress })
      console.log('✅ Sender wallet resuelto:', senderWalletAddress.id)
      
      console.log('🔍 Resolviendo receiver wallet...')  
      receiverWalletAddress = await authenticatedClient.walletAddress.get({ url: merchantWalletUrl })
      console.log('✅ Receiver wallet resuelto:', receiverWalletAddress.id)
    } catch (walletError) {
      console.error('❌ Error resolviendo wallets:', walletError.message)
      throw new Error(`Error resolviendo wallet addresses: ${walletError.message}`)
    }
    
    console.log('✅ Wallets resueltos')
    
    // Paso 2: Crear incoming payment en el merchant wallet
    console.log('💰 Creando incoming payment...')
    console.log('🔍 Receiver resource server:', receiverWalletAddress.resourceServer)
    console.log('🔍 Asset info:', { code: receiverWalletAddress.assetCode, scale: receiverWalletAddress.assetScale })
    
    // Convertir USD a MXN aproximadamente (1 USD = 18 MXN aprox)
    let finalAmount = amount
    if (receiverWalletAddress.assetCode === 'MXN') {
      finalAmount = amount * 18 // Conversión aproximada USD a MXN
      console.log('🔍 Conversión USD->MXN:', amount, 'USD =', finalAmount, 'MXN')
    }
    
    const amountValue = Math.round(finalAmount * Math.pow(10, receiverWalletAddress.assetScale))
    console.log('🔍 Monto final a cobrar:', amountValue, 'centavos de', receiverWalletAddress.assetCode)
    
    let incomingPayment
    try {
      incomingPayment = await authenticatedClient.incomingPayment.create(
        {
          url: receiverWalletAddress.resourceServer
        },
        {
          walletAddress: merchantWalletUrl,
          incomingAmount: {
            assetCode: receiverWalletAddress.assetCode,
            assetScale: receiverWalletAddress.assetScale,
            value: amountValue.toString()
          },
          metadata: {
            eventId,
            eventName,
            description: `Entrada para ${eventName}`,
            merchantId,
            timestamp: new Date().toISOString()
          }
          // Remover expiresAt por ahora para ver si eso causa el problema
        }
      )
      console.log('✅ Incoming payment creado:', incomingPayment.id)
    } catch (incomingError) {
      console.error('❌ Error creando incoming payment:', incomingError.message)
      console.error('❌ Stack completo:', incomingError.stack)
      
      // Log más detalles del error si están disponibles
      if (incomingError.response) {
        console.error('❌ Response status:', incomingError.response.status)
        console.error('❌ Response data:', incomingError.response.data)
      }
      
      throw new Error(`Error creando incoming payment: ${incomingError.message}`)
    }
    
    // Paso 3: Crear quote
    console.log('📊 Creando quote...')
    console.log('🔍 Sender resource server:', senderWalletAddress.resourceServer)
    
    let quote
    try {
      quote = await authenticatedClient.quote.create(
        {
          url: senderWalletAddress.resourceServer
        },
        {
          walletAddress: clientWalletAddress,
          receiver: incomingPayment.id,
          method: 'ilp'
        }
      )
      console.log('✅ Quote creado:', quote.id)
      console.log('   Monto a debitar:', quote.debitAmount?.value || 'N/A')
      console.log('   Monto a recibir:', quote.receiveAmount?.value || 'N/A')
    } catch (quoteError) {
      console.error('❌ Error creando quote:', quoteError.message)
      throw new Error(`Error creando quote: ${quoteError.message}`)
    }
    
    // Paso 4: Solicitar grant con interacción para outgoing payment
    console.log('🔐 Solicitando autorización interactiva...')
    console.log('🔍 Sender auth server:', senderWalletAddress.authServer)
    
    let grant
    try {
      grant = await authenticatedClient.grant.request(
        { url: senderWalletAddress.authServer },
        {
          access_token: {
            access: [{
              type: 'outgoing-payment',
              actions: ['create', 'read'],
              limits: {
                debitAmount: quote.debitAmount,
                receiveAmount: quote.receiveAmount
              }
            }]
          },
          interact: {
            start: ['redirect'],
            finish: {
              method: 'redirect',
              uri: `${config.appUrl}/`,
              nonce: generateNonce()
            }
          }
        }
      )
      console.log('✅ Grant solicitado exitosamente')
    } catch (grantError) {
      console.error('❌ Error solicitando grant:', grantError.message)
      throw new Error(`Error solicitando autorización: ${grantError.message}`)
    }
    
    // Guardar información del pago
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    paymentStore.set(paymentId, {
      paymentId,
      eventId,
      eventName,
      amount,
      merchantId,
      clientWalletAddress,
      merchantWalletAddress: merchantWalletUrl,
      senderWalletAddress: senderWalletAddress,
      receiverWalletAddress: receiverWalletAddress,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      grant: grant,
      status: 'pending_authorization',
      createdAt: new Date().toISOString()
    })
    
    console.log('💾 Pago guardado con ID:', paymentId)
    
    // Si requiere interacción (siempre en este caso)
    if (grant.interact) {
      console.log('🔗 Autorización requerida:', grant.interact.redirect)
      
      return res.json({
        success: true,
        requiresAuth: true,
        paymentId,
        authUrl: grant.interact.redirect,
        message: 'Redirigiendo para autorización...'
      })
    }
    
    // Si ya tenemos el token (raro pero posible)
    if (grant.access_token) {
      const result = await completePaymentWithGrant(
        paymentId,
        grant.access_token.value,
        senderWalletAddress,
        quote.id
      )
      
      return res.json(result)
    }
    
  } catch (error) {
    console.error('❌ ERROR DETALLADO EN CREATE-PAYMENT:')
    console.error('   Mensaje:', error.message)
    console.error('   Stack:', error.stack)
    console.error('   Tipo:', error.constructor.name)
    
    // Error más específico
    let errorMessage = 'Error procesando el pago'
    
    if (error.message?.includes('wallet address')) {
      errorMessage = 'Wallet address inválida o no encontrada'
    } else if (error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
      errorMessage = 'Error de autorización - verifica tu private key y key ID'
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      errorMessage = 'Error de conexión con el servidor de pagos'
    } else if (error.message?.includes('resolviendo wallet')) {
      errorMessage = 'No se pudo resolver el wallet address - verifica que sea válido'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// POST /api/marketplace/complete-payment
app.post('/api/marketplace/complete-payment', async (req, res) => {
  try {
    const { paymentId, interact_ref } = req.body
    
    console.log('🔄 Completando pago:', { paymentId, interact_ref })
    
    const paymentData = paymentStore.get(paymentId)
    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      })
    }
    
    // Continuar el grant con el interact_ref
    console.log('🔄 Continuando grant...')
    
    const continuedGrant = await authenticatedClient.grant.continue(
      {
        url: paymentData.grant.continue.uri,
        accessToken: paymentData.grant.continue.access_token.value
      },
      { interact_ref }
    )
    
    console.log('✅ Grant continuado:', continuedGrant)
    
    if (!continuedGrant.access_token) {
      return res.status(400).json({
        success: false,
        error: 'No se obtuvo token de acceso después de la autorización'
      })
    }
    
    // Crear el outgoing payment
    const result = await completePaymentWithGrant(
      paymentId,
      continuedGrant.access_token.value,
      paymentData.senderWalletAddress,
      paymentData.quoteId
    )
    
    res.json(result)
    
  } catch (error) {
    console.error('❌ Error completando pago:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error completando el pago'
    })
  }
})

// Función auxiliar para completar el pago con el grant
async function completePaymentWithGrant(paymentId, accessToken, senderWalletAddress, quoteId) {
  try {
    const paymentData = paymentStore.get(paymentId)
    
    console.log('💸 Creando outgoing payment...')
    
    const outgoingPayment = await authenticatedClient.outgoingPayment.create(
      {
        url: senderWalletAddress.resourceServer,
        accessToken: accessToken
      },
      {
        walletAddress: paymentData.clientWalletAddress,
        quoteId: quoteId,
        metadata: {
          eventId: paymentData.eventId,
          eventName: paymentData.eventName,
          paymentId: paymentId
        }
      }
    )
    
    console.log('✅ Outgoing payment creado:', outgoingPayment.id)
    console.log('   Estado:', outgoingPayment.state)
    
    // Actualizar estado del pago
    paymentData.status = 'completed'
    paymentData.outgoingPaymentId = outgoingPayment.id
    paymentData.completedAt = new Date().toISOString()
    
    // Monitorear el estado del pago
    let finalState = outgoingPayment.state
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts && finalState === 'FUNDING') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const paymentStatus = await authenticatedClient.outgoingPayment.get({
        url: outgoingPayment.id,
        accessToken: accessToken
      })
      
      finalState = paymentStatus.state
      console.log(`   Verificando estado (${attempts + 1}/${maxAttempts}): ${finalState}`)
      attempts++
    }
    
    if (finalState === 'COMPLETED') {
      console.log('🎉 Pago completado exitosamente')
      
      return {
        success: true,
        paymentId,
        outgoingPaymentId: outgoingPayment.id,
        state: finalState,
        message: 'Pago completado exitosamente'
      }
    } else if (finalState === 'FAILED') {
      throw new Error('El pago falló durante el procesamiento')
    } else {
      // FUNDING o SENDING
      return {
        success: true,
        paymentId,
        outgoingPaymentId: outgoingPayment.id,
        state: finalState,
        message: `Pago en proceso (${finalState})`
      }
    }
    
  } catch (error) {
    console.error('Error en completePaymentWithGrant:', error)
    throw error
  }
}

// GET /api/marketplace/payment-status/:paymentId
app.get('/api/marketplace/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params
    
    const paymentData = paymentStore.get(paymentId)
    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      })
    }
    
    res.json({
      success: true,
      payment: {
        paymentId,
        status: paymentData.status,
        state: paymentData.currentState || paymentData.status,
        eventName: paymentData.eventName,
        amount: paymentData.amount,
        createdAt: paymentData.createdAt,
        completedAt: paymentData.completedAt
      }
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Health check mejorado
app.get('/health', async (req, res) => {
  let walletTest = null
  let clientStatus = 'no_initialized'
  
  if (authenticatedClient) {
    clientStatus = 'initialized'
    try {
      // Probar resolver nuestro propio wallet
      walletTest = await authenticatedClient.walletAddress.get({ 
        url: config.walletAddressUrl 
      })
      clientStatus = 'working'
    } catch (e) {
      clientStatus = `error: ${e.message}`
      walletTest = null
    }
  }
  
  res.json({
    status: clientStatus === 'working' ? 'OK' : 'ERROR',
    services: {
      authenticatedClient: !!authenticatedClient,
      clientStatus: clientStatus,
      walletResolution: walletTest ? 'success' : 'failed'
    },
    config: {
      wallet: config.walletAddressUrl,
      keyId: config.keyId
    },
    walletInfo: walletTest ? {
      id: walletTest.id,
      assetCode: walletTest.assetCode,
      assetScale: walletTest.assetScale,
      authServer: walletTest.authServer,
      resourceServer: walletTest.resourceServer
    } : null,
    activePayments: paymentStore.size,
    timestamp: new Date().toISOString()
  })
})

// API info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'PayLink - Marketplace de Eventos',
    version: '1.0.0',
    wallet: config.walletAddressUrl,
    endpoints: {
      marketplace: [
        'POST /api/marketplace/create-payment',
        'POST /api/marketplace/complete-payment',
        'GET /api/marketplace/payment-status/:paymentId'
      ],
      health: [
        'GET /health',
        'GET /api/info'
      ]
    }
  })
})

// Funciones auxiliares
function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Inicialización del servidor
async function startServer() {
  try {
    console.log('🚀 === Iniciando PayLink Marketplace Server ===')
    console.log('📋 Configuración:')
    console.log('   Puerto:', config.port)
    console.log('   🏪 Merchant Wallet:', config.walletAddressUrl)
    console.log('   👤 Cliente Wallet (demo):', config.defaultClientWallet)
    console.log('   🔑 Key ID:', config.keyId)
    console.log('   🌐 App URL:', config.appUrl)
    
    // Inicializar cliente autenticado
    const clientInitialized = await initializeClient()
    
    if (!clientInitialized) {
      console.error('⚠️  Advertencia: Cliente no pudo ser inicializado')
      console.error('⚠️  Verifica tu private key y key ID')
    }
    
    // Crear carpeta public si no existe
    const publicDir = path.join(__dirname, 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
      console.log('📁 Carpeta public creada')
    }
    
    // Copiar index.html a public si existe en raíz
    const htmlSource = path.join(__dirname, 'index.html')
    const htmlDest = path.join(publicDir, 'index.html')
    
    if (fs.existsSync(htmlSource)) {
      fs.copyFileSync(htmlSource, htmlDest)
      console.log('📄 index.html copiado a public/')
    }
    
    // Iniciar servidor
    const server = app.listen(config.port, () => {
      console.log('\n═══════════════════════════════════════════')
      console.log(`✨ Servidor activo en: http://localhost:${config.port}`)
      console.log(`🎫 Marketplace: http://localhost:${config.port}/`)
      console.log(`📊 Health Check: http://localhost:${config.port}/health`)
      console.log(`📚 API Info: http://localhost:${config.port}/api/info`)
      console.log('═══════════════════════════════════════════\n')
    })
    
    // Manejo de cierre graceful
    process.on('SIGTERM', () => {
      console.log('\n📛 Señal SIGTERM recibida, cerrando servidor...')
      server.close(() => {
        console.log('👋 Servidor cerrado correctamente')
        process.exit(0)
      })
    })
    
    process.on('SIGINT', () => {
      console.log('\n📛 Señal SIGINT recibida, cerrando servidor...')
      server.close(() => {
        console.log('👋 Servidor cerrado correctamente')
        process.exit(0)
      })
    })
    
  } catch (error) {
    console.error('💥 Error fatal al iniciar:', error)
    process.exit(1)
  }
}

// Iniciar el servidor
startServer()