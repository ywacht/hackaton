// test-api.js - Script para probar la API del marketplace

const API_URL = 'http://localhost:3001';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Función helper para hacer requests
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Tests
async function runTests() {
  console.log(`${colors.cyan}🧪 === Iniciando pruebas de la API ===${colors.reset}\n`);
  
  // Test 1: Health Check
  console.log(`${colors.blue}Test 1: Health Check${colors.reset}`);
  const health = await makeRequest('GET', '/health');
  if (health.success) {
    console.log(`${colors.green}✓ Servidor activo${colors.reset}`);
    console.log(`  Status: ${health.data.status}`);
    console.log(`  Cliente autenticado: ${health.data.services.authenticatedClient}`);
    console.log(`  Wallet: ${health.data.config.wallet}`);
  } else {
    console.log(`${colors.red}✗ Servidor no responde${colors.reset}`);
    return;
  }
  console.log();
  
  // Test 2: API Info
  console.log(`${colors.blue}Test 2: Información de la API${colors.reset}`);
  const info = await makeRequest('GET', '/api/info');
  if (info.success) {
    console.log(`${colors.green}✓ API Info disponible${colors.reset}`);
    console.log(`  Nombre: ${info.data.name}`);
    console.log(`  Version: ${info.data.version}`);
    console.log(`  Wallet: ${info.data.wallet}`);
  }
  console.log();
  
  // Test 3: Crear pago (simulación)
  console.log(`${colors.blue}Test 3: Crear solicitud de pago${colors.reset}`);
  
  const paymentData = {
    eventId: 'test-event-001',
    eventName: 'Test Concert',
    amount: 10.00,
    clientWalletAddress: 'https://ilp.interledger-test.dev/alice',
    merchantId: 'test-merchant'
  };
  
  console.log(`  Datos del pago:`);
  console.log(`    - Evento: ${paymentData.eventName}`);
  console.log(`    - Monto: $${paymentData.amount}`);
  console.log(`    - Cliente wallet: ${paymentData.clientWalletAddress}`);
  
  const payment = await makeRequest('POST', '/api/marketplace/create-payment', paymentData);
  
  if (payment.success) {
    console.log(`${colors.green}✓ Solicitud de pago creada${colors.reset}`);
    console.log(`  Payment ID: ${payment.data.paymentId}`);
    
    if (payment.data.requiresAuth) {
      console.log(`${colors.yellow}  ⚠ Autorización requerida${colors.reset}`);
      console.log(`  URL de autorización: ${payment.data.authUrl}`);
      console.log(`\n  ${colors.cyan}Para completar el pago:`);
      console.log(`  1. Abre la URL de autorización en tu navegador`);
      console.log(`  2. Autoriza el pago en tu wallet`);
      console.log(`  3. Serás redirigido de vuelta al marketplace${colors.reset}`);
      
      // Guardar paymentId para prueba posterior
      if (payment.data.paymentId) {
        console.log();
        console.log(`${colors.blue}Test 4: Verificar estado del pago${colors.reset}`);
        const status = await makeRequest('GET', `/api/marketplace/payment-status/${payment.data.paymentId}`);
        if (status.success) {
          console.log(`${colors.green}✓ Estado obtenido${colors.reset}`);
          console.log(`  Estado: ${status.data.payment.status}`);
          console.log(`  Creado: ${status.data.payment.createdAt}`);
        }
      }
    } else {
      console.log(`  Estado: Pago procesado directamente`);
    }
  } else {
    console.log(`${colors.red}✗ Error creando pago${colors.reset}`);
    console.log(`  Error: ${payment.data.error}`);
    if (payment.data.details) {
      console.log(`  Detalles: ${payment.data.details}`);
    }
  }
  
  console.log();
  console.log(`${colors.cyan}🏁 === Pruebas completadas ===${colors.reset}`);
  
  // Instrucciones adicionales
  console.log();
  console.log(`${colors.yellow}📝 Notas importantes:${colors.reset}`);
  console.log(`1. Asegúrate de que tu wallet address en .env sea válida`);
  console.log(`2. Tu private key debe coincidir con el keyId`);
  console.log(`3. Usa wallets de testnet como:`);
  console.log(`   - https://ilp.interledger-test.dev/alice`);
  console.log(`   - https://ilp.interledger-test.dev/bob`);
  console.log(`4. Para probar el flujo completo, abre: http://localhost:3001/`);
}

// Ejecutar pruebas
runTests().catch(error => {
  console.error(`${colors.red}Error fatal:${colors.reset}`, error);
});