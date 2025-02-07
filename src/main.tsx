import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './frontend/pages/App';
import './index.css';
import { WalletProvider } from './frontend/providers/WalletProvider';
import { YoursProvider } from 'yours-wallet-provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <YoursProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </YoursProvider>
  </React.StrictMode>
); 