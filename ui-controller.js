// ui-controller.js - Controlador de interfaz de usuario
class UIController {
    constructor() {
        this.currentSection = 'wallet';
        this.isLoggedIn = false;
    }
    
    // Actualizar datos del usuario en la UI
    updateUserData(userData) {
        document.getElementById('userName').textContent = userData.name || 'Usuario';
        document.getElementById('userIlpAddress').value = userData.ilpAddress || '';
        document.getElementById('mainBalance').textContent = `$${(userData.balance || 0).toFixed(2)}`;
        this.isLoggedIn = true;
    }
    
    // Mostrar sección específica
    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Desactivar todos los botones de navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar la sección seleccionada
        document.getElementById(sectionId + 'Section').classList.add('active');
        
        // Activar el botón correspondiente
        const button = document.querySelector(`.nav-btn[onclick="showSection('${sectionId}')"]`);
        if (button) {
            button.classList.add('active');
        }
        
        this.currentSection = sectionId;
    }
    
    // Cerrar modal
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    // Mostrar modal de recibir
    showReceiveModal() {
        // Implementar lógica para mostrar modal de recibir
        alert('Modal de recibir pago será implementado en payment-handler.js');
    }
    
    // Mostrar modal de enviar
    showSendModal() {
        // Implementar lógica para mostrar modal de enviar
        alert('Modal de enviar pago será implementado en payment-handler.js');
    }
    
    // Copiar dirección al portapapeles
    copyAddress() {
        const ilpAddress = document.getElementById('userIlpAddress');
        ilpAddress.select();
        document.execCommand('copy');
        this.showNotification('Dirección copiada al portapapeles', 'success');
    }
    
    // Mostrar formulario de crear billetera
    showCreateWalletForm() {
        // Implementar lógica para crear billetera
        alert('Función de crear billetera será implementada en interledger-api.js');
    }
    
    // Mostrar notificación
    showNotification(message, type = 'info') {
        // Implementar sistema de notificaciones
        console.log(`${type.toUpperCase()}: ${message}`);
    }
    
    // Mostrar configuración
    showSettings() {
        alert('Configuración será implementada en un archivo aparte');
    }
    
    // Mostrar notificaciones
    showNotifications() {
        alert('Notificaciones será implementada en un archivo aparte');
    }
}