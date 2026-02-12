'use client';

import React, { useEffect, useState } from 'react';

interface WidgetConfig {
  primaryColor: string;
  welcomeMessage: string;
  agentId: string;
  headerText: string;
  logoUrl: string;
  position: string;
}

export default function WidgetPage({ params }: { params: { customerId: string } }) {
  const { customerId } = params;
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/widget/config?customerId=${customerId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data: WidgetConfig = await response.json();
        setConfig(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchConfig();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Loading Mejai Chat Widget...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>
        <p>Error loading widget: {error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>No configuration found for this customer ID.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        border: `1px solid ${config.primaryColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'sans-serif',
      }}
    >
      <header
        style={{
          backgroundColor: config.primaryColor,
          color: 'white',
          padding: '10px 15px',
          fontSize: '1.1em',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {config.logoUrl && (
          <img src={config.logoUrl} alt="Logo" style={{ height: '24px', width: '24px', borderRadius: '50%' }} />
        )}
        {config.headerText}
      </header>
      <div style={{ flexGrow: 1, padding: '15px', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <h2 style={{ color: config.primaryColor }}>{config.welcomeMessage}</h2>
        <p>Customer ID: <strong>{customerId}</strong></p>
        <p>Agent: <strong>{config.agentId}</strong></p>
        <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
          <em>(This is the chat widget. Real chat functionality will go here.)</em>
        </p>
      </div>
      <footer
        style={{
          backgroundColor: '#e0e0e0',
          padding: '10px 15px',
          textAlign: 'center',
          fontSize: '0.8em',
          color: '#555',
        }}
      >
        Powered by Mejai
      </footer>
    </div>
  );
}
