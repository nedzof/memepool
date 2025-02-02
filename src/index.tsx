import './frontend/utils/wasm-init';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './frontend/styles/index.css';
import App from './frontend/pages/App';
import { WalletProvider } from './frontend/providers/WalletProvider';

// Create root element
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render app with strict mode
root.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
); 