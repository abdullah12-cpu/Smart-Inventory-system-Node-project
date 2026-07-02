'use client';
import { useState, useEffect } from 'react';
import { StoreProvider } from '@/lib/store';
import { PortalType } from '@/lib/data';
import LoginPage from '@/components/LoginPage';
import LoadingScreen from '@/components/LoadingScreen';
import AdminPortal from '@/components/AdminPortal';
import DistributorPortal from '@/components/DistributorPortal';
import BuyerPortal from '@/components/BuyerPortal';
import LandingPage from '@/components/landing/LandingPage';

type AppState = 'landing' | 'login' | 'register' | 'loading' | 'portal';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [portal, setPortal] = useState<PortalType>('buyer');

  const handleLogin = (selectedPortal: PortalType) => {
    setPortal(selectedPortal);
    setAppState('loading');
  };

  useEffect(() => {
    if (appState === 'loading') {
      const timer = setTimeout(() => setAppState('portal'), 1600);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleLogout = () => {
    setAppState('landing');
  };

  return (
    <StoreProvider>
      {appState === 'landing' && (
        <LandingPage 
          onGetStarted={() => setAppState('login')}
          onRegisterClick={() => setAppState('register')}
        />
      )}
      
      {appState === 'login' && (
        <LoginPage 
          initialMode="login"
          onLogin={handleLogin} 
          onBackToLanding={() => setAppState('landing')}
        />
      )}

      {appState === 'register' && (
        <LoginPage 
          initialMode="register"
          onLogin={handleLogin} 
          onBackToLanding={() => setAppState('landing')}
        />
      )}

      {appState === 'loading' && <LoadingScreen portal={portal} />}
      
      {appState === 'portal' && (
        <>
          {portal === 'admin' && <AdminPortal onLogout={handleLogout} />}
          {portal === 'distributor' && <DistributorPortal onLogout={handleLogout} />}
          {portal === 'buyer' && <BuyerPortal onLogout={handleLogout} />}
        </>
      )}
    </StoreProvider>
  );
}
