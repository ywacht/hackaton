import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  ArrowRight, 
  Globe, 
  Shield, 
  Zap, 
  TrendingUp, 
  Mail, 
  User
} from 'lucide-react';
import './EventPaymentsPlatform.css';

// Definición de tipos TypeScript
interface OpenPaymentsConfig {
  RECEIVER_WALLET: string;
  DEFAULT_PAYER_WALLET: string;
  API_BASE_URL: string;
  GRANT_REQUEST_URL: string;
}

interface Event {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  description: string;
  price: number;
  currency: string;
  capacity: number;
  enrolled: number;
  image: string;
  tags: string[];
  receiverWallet: string;
}

interface Registration {
  id: string;
  email: string;
  name: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  amount: number;
  currency: string;
  payerWallet: string;
  receiverWallet: string;
  timestamp: string;
  status: 'pending' | 'completed';
  paymentId?: string;
  completedAt?: string;
}

interface Stats {
  totalEvents: number;
  totalRevenue: string;
  totalRegistrations: number;
  successRate: number;
}

interface FormData {
  email: string;
  name: string;
  payerWallet: string;
}

interface PaymentResult {
  success: boolean;
  paymentId: string;
  timestamp: string;
  error: string | null;
}

const EventPaymentsPlatform: React.FC = () => {
  // Configuración de Open Payments
  const OPEN_PAYMENTS_CONFIG: OpenPaymentsConfig = {
    RECEIVER_WALLET: 'https://wallet.interledger-test.dev/eventos',
    DEFAULT_PAYER_WALLET: 'https://wallet.interledger-test.dev/usuario',
    API_BASE_URL: 'https://wallet.interledger-test.dev',
    GRANT_REQUEST_URL: 'https://auth.interledger-test.dev',
  };

  // Estados
  const [events, setEvents] = useState<Event[]>([
    {
      id: 1,
      title: 'Workshop de JavaScript Avanzado',
      type: 'Taller Técnico',
      date: '25 Sep 2025',
      time: '18:00 UTC',
      description: 'Aprende técnicas avanzadas de JavaScript, patrones de diseño y optimización.',
      price: 49.99,
      currency: 'USD',
      capacity: 100,
      enrolled: 67,
      image: '🚀',
      tags: ['JavaScript', 'Programación', 'Avanzado'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    },
    {
      id: 2,
      title: 'Conferencia de Blockchain',
      type: 'Conferencia',
      date: '28 Sep 2025',
      time: '20:00 UTC',
      description: 'Explorando el futuro de las finanzas descentralizadas y Web3.',
      price: 29.99,
      currency: 'USD',
      capacity: 200,
      enrolled: 145,
      image: '🔗',
      tags: ['Blockchain', 'Web3', 'DeFi'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    },
    {
      id: 3,
      title: 'Masterclass de Marketing Digital',
      type: 'Masterclass',
      date: '02 Oct 2025',
      time: '19:00 UTC',
      description: 'Estrategias efectivas de marketing digital para 2025.',
      price: 39.99,
      currency: 'USD',
      capacity: 150,
      enrolled: 89,
      image: '📈',
      tags: ['Marketing', 'Digital', 'Estrategia'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    },
    {
      id: 4,
      title: 'Seminario de IA y Machine Learning',
      type: 'Seminario',
      date: '05 Oct 2025',
      time: '17:00 UTC',
      description: 'Introducción práctica a la inteligencia artificial y aprendizaje automático.',
      price: 59.99,
      currency: 'USD',
      capacity: 80,
      enrolled: 72,
      image: '🤖',
      tags: ['IA', 'Machine Learning', 'Tech'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    },
    {
      id: 5,
      title: 'Taller de Diseño UX/UI',
      type: 'Taller Creativo',
      date: '10 Oct 2025',
      time: '16:00 UTC',
      description: 'Principios de diseño centrado en el usuario y prototipado.',
      price: 44.99,
      currency: 'USD',
      capacity: 60,
      enrolled: 45,
      image: '🎨',
      tags: ['Diseño', 'UX', 'UI'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    },
    {
      id: 6,
      title: 'Webinar de Ciberseguridad',
      type: 'Webinar',
      date: '12 Oct 2025',
      time: '21:00 UTC',
      description: 'Protege tu empresa de las amenazas digitales modernas.',
      price: 19.99,
      currency: 'USD',
      capacity: 300,
      enrolled: 198,
      image: '🔒',
      tags: ['Seguridad', 'Cyber', 'Empresas'],
      receiverWallet: OPEN_PAYMENTS_CONFIG.RECEIVER_WALLET
    }
  ]);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'dashboard'>('events');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    payerWallet: OPEN_PAYMENTS_CONFIG.DEFAULT_PAYER_WALLET
  });
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    totalRevenue: '0',
    totalRegistrations: 0,
    successRate: 100
  });

  // Cargar registros al iniciar
  useEffect(() => {
    const savedRegistrations = localStorage.getItem('eventRegistrations');
    if (savedRegistrations) {
      setRegistrations(JSON.parse(savedRegistrations));
    }
    updateStats();
  }, []);

  // Actualizar estadísticas
  const updateStats = (): void => {
    const regs: Registration[] = JSON.parse(localStorage.getItem('eventRegistrations') || '[]');
    const totalRevenue = regs.reduce((sum: number, reg: Registration) => sum + (reg.status === 'completed' ? reg.amount : 0), 0);
    const completed = regs.filter(r => r.status === 'completed').length;
    
    setStats({
      totalEvents: events.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalRegistrations: regs.length,
      successRate: regs.length > 0 ? Math.round((completed / regs.length) * 100) : 100
    });
  };

  // Generar IDs únicos
  const generateId = (): string => {
    return 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Simular proceso de pago con Open Payments
  const processOpenPayment = async (paymentData: Registration): Promise<PaymentResult> => {
    // Simulación del flujo Open Payments
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular 95% de éxito
        const success = Math.random() > 0.05;
        resolve({
          success,
          paymentId: generateId(),
          timestamp: new Date().toISOString(),
          error: success ? null : 'Error de conexión con el wallet'
        });
      }, 2500);
    });
  };

  // Manejar selección de evento
  const handleSelectEvent = (event: Event): void => {
    setSelectedEvent(event);
    setShowPaymentModal(true);
    setPaymentStatus('idle');
    setFormData({
      ...formData,
      email: '',
      name: ''
    });
  };

  // Procesar pago
  const handlePayment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedEvent) return;

    setPaymentStatus('processing');

    try {
      // Crear registro de transacción
      const registration: Registration = {
        id: generateId(),
        email: formData.email,
        name: formData.name,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        amount: selectedEvent.price,
        currency: selectedEvent.currency,
        payerWallet: formData.payerWallet,
        receiverWallet: selectedEvent.receiverWallet,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      // Procesar con Open Payments
      const result = await processOpenPayment(registration);

      if (result.success) {
        registration.status = 'completed';
        registration.paymentId = result.paymentId;
        registration.completedAt = result.timestamp;

        // Guardar en localStorage
        const updatedRegistrations = [...registrations, registration];
        setRegistrations(updatedRegistrations);
        localStorage.setItem('eventRegistrations', JSON.stringify(updatedRegistrations));

        // Actualizar estadísticas
        updateStats();

        // Actualizar contador de inscritos
        setEvents(events.map(e => 
          e.id === selectedEvent.id 
            ? { ...e, enrolled: e.enrolled + 1 }
            : e
        ));

        setPaymentStatus('success');
        
        // Cerrar modal después de 3 segundos
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentStatus('idle');
        }, 3000);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      setPaymentStatus('error');
      console.error('Payment error:', error);
    }
  };

  // Componente de tarjeta de evento
  const EventCard: React.FC<{ event: Event }> = ({ event }) => {
    const progressPercentage = (event.enrolled / event.capacity) * 100;
    
    return (
      <div className="event-card">
        <div className="event-header">
          <div className="event-emoji">{event.image}</div>
          <h3 className="event-title">{event.title}</h3>
          <span className="event-type">
            {event.type}
          </span>
        </div>
        
        <div className="event-body">
          <div className="event-details">
            <div className="event-detail">
              <Calendar size={16} />
              <span>{event.date}</span>
            </div>
            <div className="event-detail">
              <Clock size={16} />
              <span>{event.time}</span>
            </div>
          </div>
          
          <p className="event-description">{event.description}</p>
          
          <div className="event-tags">
            {event.tags.map((tag, index) => (
              <span key={index} className="event-tag">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="capacity-info">
            <div className="capacity-header">
              <span className="capacity-text">Cupos disponibles</span>
              <span className="capacity-count">{event.capacity - event.enrolled}/{event.capacity}</span>
            </div>
            <div className="capacity-bar">
              <div 
                className="capacity-progress"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="event-footer">
            <div className="event-price">
              ${event.price}
              <span className="event-currency">{event.currency}</span>
            </div>
            <div className="event-enrolled">
              <Users size={16} />
              <span>{event.enrolled} inscritos</span>
            </div>
          </div>
          
          <button
            onClick={() => handleSelectEvent(event)}
            className="event-button"
            disabled={event.enrolled >= event.capacity}
          >
            {event.enrolled >= event.capacity ? (
              'Evento Lleno'
            ) : (
              <>
                Comprar Ticket
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Componente de Modal de Pago
  const PaymentModal: React.FC = () => {
    if (!selectedEvent) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h2 className="modal-title">Procesar Pago</h2>
            <p className="modal-subtitle">{selectedEvent.title}</p>
            <p className="modal-time">{selectedEvent.date} - {selectedEvent.time}</p>
          </div>

          <div className="modal-body">
            {paymentStatus === 'idle' && (
              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label className="form-label">
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <User size={16} />
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="info-box blue">
                    <label className="form-label">
                      <CreditCard size={16} />
                      Tu Wallet Address (Pagador)
                    </label>
                    <input
                      type="text"
                      value={formData.payerWallet}
                      onChange={(e) => setFormData({...formData, payerWallet: e.target.value})}
                      className="form-input"
                      placeholder="https://wallet.interledger-test.dev/usuario"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="info-box green">
                    <p className="form-label">
                      <Shield size={16} />
                      Wallet del Evento (Receptor)
                    </p>
                    <p className="wallet-address">{selectedEvent.receiverWallet}</p>
                  </div>
                </div>

                <div className="form-group">
                  <div className="info-box purple">
                    <p className="payment-amount">Total a Pagar:</p>
                    <p className="payment-total">
                      ${selectedEvent.price} {selectedEvent.currency}
                    </p>
                  </div>
                </div>

                <div className="modal-buttons">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="modal-button cancel"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="modal-button confirm"
                  >
                    Confirmar Pago
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}

            {paymentStatus === 'processing' && (
              <div className="status-screen">
                <Loader className="status-icon" />
                <p className="status-title">Procesando pago...</p>
                <p className="status-message">Conectando con Open Payments</p>
                <div className="warning-box">
                  <p className="warning-text">
                    <AlertCircle size={16} />
                    No cierres esta ventana
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="status-screen">
                <CheckCircle className="success-icon" />
                <p className="success-title">¡Pago Exitoso!</p>
                <p className="status-message">
                  Tu ticket ha sido enviado a {formData.email}
                </p>
                <div className="success-box">
                  <p className="success-text">
                    ID de transacción: {generateId()}
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="status-screen">
                <AlertCircle className="error-icon" />
                <p className="status-title">Error en el Pago</p>
                <p className="status-message">
                  No se pudo procesar la transacción
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="error-button"
                >
                  Intentar Nuevamente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Componente Dashboard
  const Dashboard: React.FC = () => {
    return (
      <div className="dashboard-container">
        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-container purple">
                <Calendar size={24} />
              </div>
              <TrendingUp className="stat-trend" size={20} />
            </div>
            <p className="stat-label">Total Eventos</p>
            <p className="stat-value">{stats.totalEvents}</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-container green">
                <DollarSign size={24} />
              </div>
              <TrendingUp className="stat-trend" size={20} />
            </div>
            <p className="stat-label">Ingresos Totales</p>
            <p className="stat-value">${stats.totalRevenue}</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-container blue">
                <Users size={24} />
              </div>
              <TrendingUp className="stat-trend" size={20} />
            </div>
            <p className="stat-label">Registros Totales</p>
            <p className="stat-value">{stats.totalRegistrations}</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-container indigo">
                <Zap size={24} />
              </div>
              <span className="stat-trend">+{stats.successRate}%</span>
            </div>
            <p className="stat-label">Tasa de Éxito</p>
            <p className="stat-value">{stats.successRate}%</p>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="registrations-table">
          <div className="table-header">
            <h2 className="table-title">Historial de Transacciones</h2>
          </div>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table">
                      No hay transacciones registradas aún
                    </td>
                  </tr>
                ) : (
                  [...registrations].reverse().map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <div className="data-email">{reg.email}</div>
                        <div className="data-name">{reg.name}</div>
                      </td>
                      <td>
                        <div className="data-event">{reg.eventTitle}</div>
                      </td>
                      <td>
                        <div className="data-date">
                          {new Date(reg.timestamp).toLocaleDateString()}
                        </div>
                        <div className="data-time">
                          {new Date(reg.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <div className="data-amount">
                          ${reg.amount} {reg.currency}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${reg.status === 'completed' ? 'completed' : 'pending'}`}>
                          {reg.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="event-payments-container">
      {/* Header */}
      <header className="event-payments-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-icon">
              <Globe size={24} />
            </div>
            <h1 className="logo-text">EventPay Pro</h1>
          </div>
          
          <nav className="header-nav">
            <button
              onClick={() => setActiveTab('events')}
              className={`nav-button ${activeTab === 'events' ? 'active' : 'inactive'}`}
            >
              Eventos
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                updateStats();
              }}
              className={`nav-button ${activeTab === 'dashboard' ? 'active' : 'inactive'}`}
            >
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      {activeTab === 'events' && (
        <div className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">
              Eventos Virtuales Premium
            </h2>
            <p className="hero-subtitle">
              Accede a los mejores eventos online con pagos seguros vía Open Payments
            </p>
            <div className="hero-features">
              <div className="hero-feature">
                <Shield size={20} />
                <span>Pagos Seguros</span>
              </div>
              <div className="hero-feature">
                <Zap size={20} />
                <span>Confirmación Instantánea</span>
              </div>
              <div className="hero-feature">
                <Globe size={20} />
                <span>Acceso Global</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'events' ? (
          <div className="events-grid">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && <PaymentModal />}

      {/* Footer */}
      <footer className="event-footer-section">
        <div className="footer-content">
          <div className="footer-grid">
            <div>
              <h3>EventPay Pro</h3>
              <p>
                Plataforma líder en pagos para eventos virtuales usando Open Payments Protocol.
              </p>
            </div>
            <div>
              <h4>Tecnología</h4>
              <ul className="footer-list">
                <li>• Open Payments Protocol</li>
                <li>• Interledger Network</li>
                <li>• Wallet Integration</li>
                <li>• Secure Transactions</li>
              </ul>
            </div>
            <div>
              <h4>Soporte</h4>
              <ul className="footer-list">
                <li>📧 soporte@eventpay.com</li>
                <li>📱 +1 234 567 8900</li>
                <li>🌍 Global Coverage</li>
                <li>🔒 SSL Secured</li>
              </ul>
            </div>
          </div>
          <div className="footer-divider">
            <p>© 2025 EventPay Pro. Powered by Open Payments Protocol.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EventPaymentsPlatform;