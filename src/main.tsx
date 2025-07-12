import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

// Gestionnaire d'erreur global pour diagnostic
window.addEventListener('error', (event) => {
  console.error('Erreur globale détectée:', event.error);
  
  // Créer une page de diagnostic d'urgence
  const diagnosticDiv = document.createElement('div');
  diagnosticDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: Arial, sans-serif;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      z-index: 9999;
    ">
      <h1 style="font-size: 24px; margin-bottom: 20px;">⚠️ Problème de chargement</h1>
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px; max-width: 400px;">
        <p style="margin: 5px 0;"><strong>Navigateur:</strong> ${navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
        <p style="margin: 5px 0;"><strong>Écran:</strong> ${screen.width} x ${screen.height}</p>
        <p style="margin: 5px 0;"><strong>URL:</strong> ${window.location.href}</p>
        <p style="margin: 5px 0;"><strong>Erreur:</strong> ${event.error?.message || 'Inconnue'}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="window.location.reload()" style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        ">Recharger</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #f44336;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        ">Fermer</button>
      </div>
    </div>
  `;
  
  // Supprimer le contenu existant et afficher le diagnostic
  document.body.innerHTML = '';
  document.body.appendChild(diagnosticDiv);
});

// Gestionnaire pour les promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
