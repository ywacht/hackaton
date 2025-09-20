# PAYSTREAM - Documentación del Proyecto

![PAYSTREAM Logo](media/image1.jpg)

## Información del Equipo
- **Nombre del equipo:** Venadotech
- **Fecha:** 19-09-2025
- **Integrantes:**
  - Alberto Macias Roman
  - Omar Lopez Esparza
  - Juan Pablo Martínez Martínez
  - Giovanny Manuel Velasco

---

## Descripción del Proyecto

PAYSTREAM es una aplicación de pago innovadora diseñada para facilitar pagos seguros para eventos en línea. Su objetivo principal es reducir la dependencia de las tarjetas físicas y fomentar los pagos digitales en sectores no bancarios.

---

## Tabla de Contenidos
1. [Características Principales](#características-principales)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Uso de la Aplicación](#uso-de-la-aplicación)
6. [API Reference](#api-reference)
7. [Solución de Problemas](#solución-de-problemas)

---

## Características Principales

### 🔒 Reducción de Fraude
- Tokenización segura de transacciones
- Reducción del fraude digital hasta en un 60%

### 🛡️ Protección de Datos
- Protección de datos en tránsito y en reposo
- Información bancaria personal protegida

### 💳 Integración de Billeteras Digitales
- Arquitectura preparada para integración con:
  - Google Pay
  - Apple Pay
  - PayPal

### 🌐 Pagos en Línea Seguros
- Transacciones seguras para eventos en línea
- Sin exposición de detalles de tarjetas bancarias

---

## Tecnologías Utilizadas

### Frontend
- HTML5
- CSS3
- JavaScript (vanilla)

### Backend
- Node.js
- Express.js
- Open Payments API

### Dependencias Principales
- `@interledger/open-payments`
- `dotenv`
- `cors`

### Herramientas de Desarrollo
- Visual Studio Code
- GitHub
- npm

---

## Estructura del Proyecto
hackaton/
├── public/
│ ├── index.html
│ ├── styles/
│ └── scripts/
├── .env
├── package.json
├── server.js
└── README.md

text

### Archivos Principales
- **.env**: Configuración de variables de entorno
- **index.html**: Interfaz principal de usuario
- **package.json**: Dependencias y scripts del proyecto
- **server.js**: Servidor backend con Express

---

## Instalación y Configuración

### Prerrequisitos
- Node.js (v14 o superior)
- npm (v6 o superior)
- Cuenta en Open Payments

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/ywacht/hackaton.git
   cd hackaton
Instalar dependencias

bash
npm install
Configurar variables de entorno
Crear archivo .env en la raíz del proyecto:

env
PORT=3001
APP_URL=http://localhost:3001
WALLET_ADDRESS_URL=https://ilp.interledger-test.dev/b-e
KEY_ID=your-key-id
PRIVATE_KEY=your-private-key
Ejecutar la aplicación

bash
npm start
Acceder a la aplicación
Abrir navegador en: http://localhost:3001

Uso de la Aplicación
Flujo de Pago
Seleccionar evento y tickets

Ingresar información de pago

Confirmar transacción

Recibir confirmación y tickets

Roles de Usuario
Comprador: Puede navegar eventos y realizar pagos

Organizador: Puede crear eventos y gestionar ventas

API Reference
Endpoints Principales
Crear Solicitud de Pago
http
POST /api/payment-request
Content-Type: application/json

{
  "amount": "100.00",
  "currency": "USD",
  "eventId": "event_123"
}
Verificar Estado de Pago
http
GET /api/payment-status/:paymentId
Solución de Problemas
Errores Comunes
Puerto en Uso
bash
Error: listen EADDRINUSE: address already in use :::3001
Solución: Cambiar el puerto en el archivo .env o terminar el proceso que está usando el puerto.

Variables de Entorno No Encontradas
bash
Error: Missing required environment variables
Solución: Verificar que el archivo .env existe y contiene todas las variables requeridas.

Error de Conexión con Open Payments API
bash
Error: Connection timeout
Solución: Verificar la conectividad a internet y las credenciales de API.

Contribución
Fork el proyecto

Crear una rama para la feature (git checkout -b feature/AmazingFeature)

Commit los cambios (git commit -m 'Add some AmazingFeature')

Push a la rama (git push origin feature/AmazingFeature)

Abrir un Pull Request

Licencia
Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

Contacto
Venadotech Team - email@venadotech.com

Enlace del Proyecto: https://github.com/ywacht/hackaton