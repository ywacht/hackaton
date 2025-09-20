import express from 'express'
import { createAuthenticatedClient, createUnauthenticatedClient } from '@interledger/open-payments'
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
app.use(cors()) // Habilitar CORS para el frontend

// Servir archivos estáticos (tu HTML del marketplace)
app.use(express.static('public'))

// Configuración
const config = {
  port: process.env.PORT || 3001,
  walletAddressUrl: process.env.WALLET_ADDRESS_URL || 'https://ilp.interledger-test.dev/pablog',
  privateKeyPath: process.env.PRIVATE_KEY_PATH || './private.key',
  keyId: process.env.KEY_ID || 'your-key-id-here',
  appUrl: process.env.APP_URL || 'http://localhost:3001'
}

// Store para grants y pagos activos (en producción usar Redis/DB)
const paymentStore = new Map()
const grantStore = new Map()

// Clientes
let authenticatedClient = null
let unauthenticatedClient = null

// Merchants configurados (en producción esto vendría de una DB)
const MERCHANTS = {
  'jazz-concert': {
    walletAddress: 'https://ilp.interledger-test.dev/jazz-merchant',
    name: 'Jazz Productions Inc.',
    privateKey: './merchant-keys/jazz.key', // Cada merchant tiene su propia key
    keyId: 'jazz-key-id'
  },
  'tech-summit': {
    walletAddress: 'https://ilp.interledger-test.dev/blockchain-events',
    name: 'Blockchain Events Ltd.',
    privateKey: './merchant-keys/blockchain.key',
    keyId: 'blockchain-key-id'
  },
  'art-workshop': {
    walletAddress: 'https://ilp.interledger-test.dev/creative-studio',
    name: 'Creative Studio Pro',
    privateKey: './merchant-keys/creative.key',
    keyId: 'creative-key-id'
  }
}

// Función para inicializar clientes
async function initializeClients() {
  try {
    console.log('🔧 Inicializando clientes Open Payments...')
    
    // Cliente no autenticado para operaciones públicas
    unauthenticatedClient = await createUnauthenticatedClient({
      validateResponses: false,
      requestTimeoutMs: 30000
    })
    
    console.log('✅ Cliente no autenticado inicializado')
    
    // Intentar crear cliente autenticado si tenemos las credenciales
    if (fs.existsSync(config.privateKeyPath) && config.keyId) {
      try {
        const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8')
        
        authenticatedClient = await createAuthenticatedClient({
          walletAddressUrl: config.walletAddressUrl,
          privateKey: privateKey,
          keyId: config.keyId,
          validateResponses: false
        })
        
        console.log('✅ Cliente autenticado inicializado')
      } catch (authError) {
        console.warn('⚠️ No se pudo crear cliente autenticado:', authError.message)
        console.warn('⚠️ Continuando solo con cliente no autenticado')
      }
    } else {
      console.warn('⚠️ No se encontraron credenciales para cliente autenticado')
      console.warn('⚠️ Archivo esperado en:', config.privateKeyPath)
    }
    
    return true
  } catch (error) {
    console.error('❌ Error inicializando clientes:', error)
    return false
  }
}

// Función para obtener cliente autenticado del merchant
async function getMerchantClient(merchantId) {
  const merchant = MERCHANTS[merchantId]
  if (!merchant) {
    throw new Error(`Merchant no encontrado: ${merchantId}`)
  }
  
  // En producción, cada merchant tendría sus propias credenciales
  // Por ahora usamos el cliente no autenticado para simular
  return unauthenticatedClient
}

// ==============================================
// ENDPOINTS PARA EL MARKETPLACE
// ==============================================

// POST /api/marketplace/create-payment - Crear un pago para evento
app.post('/api/marketplace/create-payment', async (req, res) => {
  try {
    const {
      eventId,
      eventName,
      amount,
      clientWalletAddress,
      merchantId
    } = req.body
    
    console.log('🎫 Iniciando compra de evento:', { eventId, eventName, amount })
    
    // Validaciones
    if (!eventId || !amount || !clientWalletAddress || !merchantId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos'
      })
    }
    
    const merchant = MERCHANTS[merchantId]
    if (!merchant) {
      return res.status(400).json({
        success: false,
        error: 'Merchant no válido'
      })
    }
    
    // Usar el cliente apropiado
    const client = unauthenticatedClient || authenticatedClient
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible'
      })
    }
    
    // Paso 1: Resolver wallet addresses
    console.log('📍 Resolviendo wallet addresses...')
    
    const [receivingWalletAddress, sendingWalletAddress] = await Promise.all([
      client.walletAddress.get({ url: merchant.walletAddress }),
      client.walletAddress.get({ url: clientWalletAddress })
    ])
    
    console.log('✅ Wallet addresses resueltos')
    
    // Paso 2: Solicitar grant para incoming payment (merchant)
    console.log('🔐 Solicitando grant para incoming payment...')
    
    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['create', 'read', 'complete']
            }
          ]
        }
      }
    )
    
    // Paso 3: Crear incoming payment
    console.log('💰 Creando incoming payment...')
    
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
      },
      {
        walletAddress: receivingWalletAddress.id,
        incomingAmount: {
          assetCode: receivingWalletAddress.assetCode || 'USD',
          assetScale: receivingWalletAddress.assetScale || 2,
          value: Math.round(amount * 100).toString() // Convertir a centavos
        },
        metadata: {
          eventId,
          eventName,
          merchantId,
          timestamp: new Date().toISOString()
        }
      }
    )
    
    console.log('✅ Incoming payment creado:', incomingPayment.id)
    
    // Paso 4: Obtener grant para quote
    console.log('📊 Obteniendo quote grant...')
    
    const quoteGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'quote',
              actions: ['create', 'read']
            }
          ]
        }
      }
    )
    
    // Paso 5: Crear quote
    console.log('📈 Creando quote...')
    
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
      },
      {
        walletAddress: sendingWalletAddress.id,
        receiver: incomingPayment.id,
        method: 'ilp'
      }
    )
    
    console.log('✅ Quote creado:', quote.id)
    
    // Paso 6: Iniciar grant interactivo para outgoing payment
    console.log('🔓 Iniciando autorización interactiva...')
    
    const outgoingPaymentGrantRequest = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['create', 'read'],
              limits: {
                debitAmount: quote.debitAmount,
                receiveAmount: quote.receiveAmount
              }
            }
          ]
        },
        interact: {
          start: ['redirect'],
          finish: {
            method: 'redirect',
            uri: `${config.appUrl}/api/marketplace/payment-callback`,
            nonce: generateNonce()
          }
        }
      }
    )
    
    // Guardar información del pago en store
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    paymentStore.set(paymentId, {
      eventId,
      eventName,
      amount,
      merchantId,
      clientWalletAddress,
      incomingPaymentId: incomingPayment.id,
      quoteId: quote.id,
      grantContinue: outgoingPaymentGrantRequest.continue,
      status: 'pending_authorization',
      createdAt: new Date().toISOString()
    })
    
    // Si el grant requiere interacción
    if (outgoingPaymentGrantRequest.interact) {
      return res.json({
        success: true,
        requiresAuth: true,
        paymentId,
        authUrl: outgoingPaymentGrantRequest.interact.redirect,
        message: 'Autorización requerida. Redirigiendo...',
        continueToken: outgoingPaymentGrantRequest.continue?.access_token?.value
      })
    }
    
    // Si ya tenemos el token (poco probable pero posible)
    if (outgoingPaymentGrantRequest.access_token) {
      // Crear el outgoing payment directamente
      const result = await createOutgoingPayment(
        client,
        sendingWalletAddress,
        outgoingPaymentGrantRequest.access_token.value,
        incomingPayment.id,
        quote
      )
      
      return res.json({
        success: true,
        paymentId,
        ...result
      })
    }
    
  } catch (error) {
    console.error('❌ Error en create-payment:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/marketplace/payment-callback - Callback después de autorización
app.get('/api/marketplace/payment-callback', async (req, res) => {
  try {
    const { interact_ref, hash, result } = req.query
    
    console.log('🔄 Callback de autorización recibido:', { interact_ref, result })
    
    // Aquí deberías continuar con el grant usando el interact_ref
    // Por ahora redirigimos al frontend con el estado
    
    const redirectUrl = new URL(`${config.appUrl}/payment-complete.html`)
    redirectUrl.searchParams.set('interact_ref', interact_ref || '')
    redirectUrl.searchParams.set('result', result || 'unknown')
    
    res.redirect(redirectUrl.toString())
    
  } catch (error) {
    console.error('❌ Error en callback:', error)
    res.redirect(`${config.appUrl}/payment-error.html`)
  }
})

// POST /api/marketplace/complete-payment - Completar pago después de autorización
app.post('/api/marketplace/complete-payment', async (req, res) => {
  try {
    const { paymentId, interact_ref } = req.body
    
    const paymentData = paymentStore.get(paymentId)
    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      })
    }
    
    const client = unauthenticatedClient || authenticatedClient
    
    // Continuar con el grant
    console.log('🔄 Continuando grant con interact_ref...')
    
    const continuedGrant = await client.grant.continue(
      {
        url: paymentData.grantContinue.uri,
        accessToken: paymentData.grantContinue.access_token.value
      },
      { interact_ref }
    )
    
    if (!continuedGrant.access_token) {
      return res.status(400).json({
        success: false,
        error: 'No se obtuvo token de acceso'
      })
    }
    
    // Obtener wallet address del cliente
    const sendingWalletAddress = await client.walletAddress.get({
      url: paymentData.clientWalletAddress
    })
    
    // Crear outgoing payment
    const result = await createOutgoingPayment(
      client,
      sendingWalletAddress,
      continuedGrant.access_token.value,
      paymentData.incomingPaymentId,
      { debitAmount: { value: Math.round(paymentData.amount * 100).toString() } }
    )
    
    // Actualizar estado del pago
    paymentData.status = 'completed'
    paymentData.outgoingPaymentId = result.outgoingPaymentId
    paymentData.completedAt = new Date().toISOString()
    
    // Generar enlace de acceso al evento
    const accessToken = generateEventAccessToken(paymentData.eventId, paymentId)
    
    res.json({
      success: true,
      paymentId,
      accessToken,
      accessUrl: `${config.appUrl}/event/${paymentData.eventId}?token=${accessToken}`,
      message: 'Pago completado exitosamente'
    })
    
  } catch (error) {
    console.error('❌ Error completando pago:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/marketplace/payment-status/:paymentId - Verificar estado del pago
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

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

// Crear outgoing payment
async function createOutgoingPayment(client, walletAddress, accessToken, receiverId, quote) {
  console.log('💸 Creando outgoing payment...')
  
  const outgoingPayment = await client.outgoingPayment.create(
    {
      url: walletAddress.resourceServer,
      accessToken: accessToken
    },
    {
      walletAddress: walletAddress.id,
      quoteId: quote.id,
      metadata: {
        receiverId,
        timestamp: new Date().toISOString()
      }
    }
  )
  
  console.log('✅ Outgoing payment creado:', outgoingPayment.id)
  
  // Monitorear el estado del pago
  let attempts = 0
  const maxAttempts = 30
  
  while (attempts < maxAttempts) {
    const payment = await client.outgoingPayment.get({
      url: outgoingPayment.id,
      accessToken: accessToken
    })
    
    console.log(`📊 Estado del pago: ${payment.state}`)
    
    if (payment.state === 'COMPLETED') {
      return {
        success: true,
        outgoingPaymentId: payment.id,
        state: payment.state,
        message: 'Pago completado exitosamente'
      }
    } else if (payment.state === 'FAILED') {
      throw new Error('El pago falló')
    }
    
    // Esperar 2 segundos antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++
  }
  
  throw new Error('Timeout: El pago no se completó en el tiempo esperado')
}

// Generar nonce
function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Generar token de acceso al evento
function generateEventAccessToken(eventId, paymentId) {
  // En producción, usar JWT o similar
  return Buffer.from(JSON.stringify({
    eventId,
    paymentId,
    expires: Date.now() + (24 * 60 * 60 * 1000)
  })).toString('base64')
}

// ==============================================
// ENDPOINTS DE HEALTH Y INFO
// ==============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    services: {
      authenticatedClient: !!authenticatedClient,
      unauthenticatedClient: !!unauthenticatedClient
    },
    activePayments: paymentStore.size,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Marketplace de Eventos - Open Payments API',
    version: '1.0.0',
    endpoints: {
      marketplace: [
        'POST /api/marketplace/create-payment',
        'POST /api/marketplace/complete-payment',
        'GET /api/marketplace/payment-status/:paymentId',
        'GET /api/marketplace/payment-callback'
      ],
      health: [
        'GET /health',
        'GET /api/info'
      ]
    }
  })
})

// ==============================================
// INICIALIZACIÓN
// ==============================================

async function startServer() {
  try {
    console.log('🚀 === Iniciando Marketplace Server ===')
    
    // Inicializar clientes
    await initializeClients()
    
    // Crear carpeta public si no existe
    const publicDir = path.join(__dirname, 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
      console.log('📁 Carpeta public creada')
    }
    
    // Iniciar servidor
    const server = app.listen(config.port, () => {
      console.log(`\n📡 Servidor escuchando en puerto ${config.port}`)
      console.log(`🌐 URL: http://localhost:${config.port}`)
      console.log(`🎫 Marketplace: http://localhost:${config.port}/index.html`)
      console.log(`📊 Health: http://localhost:${config.port}/health`)
      console.log(`📚 API Info: http://localhost:${config.port}/api/info`)
      console.log('\n✨ Servidor listo para procesar pagos de eventos')
      console.log('════════════════════════════════════════')
    })
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n📛 Cerrando servidor...')
      server.close(() => {
        console.log('👋 Servidor cerrado')
        process.exit(0)
      })
    })
    
  } catch (error) {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  }
}

startServer()