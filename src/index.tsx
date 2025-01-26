import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './frontend/pages/App';
import './frontend/styles/index.css';
import { db } from './backend/utils/db';

// Initialize database connection
db.connect().catch(console.error);

// Create root element
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render app with strict mode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 