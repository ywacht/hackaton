// App.jsx

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
  User,
} from 'lucide-react';
import './App.css';

const EventPaymentsPlatform = () => {
  const OPEN_PAYMENTS_CONFIG = {
    RECEIVER_WALLET: 'https://wallet.interledger-test.dev/eventos',
    RECEIVER_PAYMENT_TAG: 'evento123',
    CLIENT_ID: 'a8d88dd4-5fa5-4013-bb89-113c5ff93c9e',
    GRANT_REQUEST_URL: 'https://auth.interledger-test.dev',
  };

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setPaymentStatus(null);

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 500, ...OPEN_PAYMENTS_CONFIG }),
      });

      const result = await response.json();
      if (response.ok) {
        setPaymentStatus('success');
      } else {
        setPaymentStatus('error');
        console.error('Payment error:', result);
      }
    } catch (error) {
      setPaymentStatus('error');
      console.error('Request failed:', error);
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>
          <DollarSign /> Plataforma de Pagos para Eventos
        </h1>
        <p>Gestiona y recibe pagos fácilmente para tus eventos.</p>
      </header>

      <main>
        <section className="event-info">
          <h2>
            <Calendar /> Evento: Hackathon 2025
          </h2>
          <p>
            <Clock /> Fecha: 30 de septiembre, 2025
          </p>
          <p>
            <Users /> Participantes: 100+
          </p>
        </section>

        <section className="payment-section">
          <h3>
            <CreditCard /> Realizar Pago
          </h3>
          <button
            className="pay-button"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="spinner" /> Procesando...
              </>
            ) : (
              <>
                <ArrowRight /> Pagar $5.00
              </>
            )}
          </button>

          {paymentStatus === 'success' && (
            <p className="success">
              <CheckCircle /> ¡Pago realizado con éxito!
            </p>
          )}

          {paymentStatus === 'error' && (
            <p className="error">
              <AlertCircle /> Hubo un error al procesar el pago.
            </p>
          )}
        </section>

        <section className="benefits">
          <h3>
            <TrendingUp /> Beneficios de usar nuestra plataforma:
          </h3>
          <ul>
            <li>
              <Shield /> Pagos seguros
            </li>
            <li>
              <Globe /> Soporte global
            </li>
            <li>
              <Zap /> Transacciones rápidas
            </li>
          </ul>
        </section>

        <section className="contact">
          <h3>
            <Mail /> Contáctanos
          </h3>
          <p>
            <User /> organizador@eventos.com
          </p>
        </section>
      </main>
    </div>
  );
};

export default EventPaymentsPlatform;
