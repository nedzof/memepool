import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './frontend/pages/App';
import './index.css';
import { WalletProvider } from './frontend/providers/WalletProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
); 