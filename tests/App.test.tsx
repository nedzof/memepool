import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/frontend/pages/App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByAltText('Memepool Logo')).toBeInTheDocument();
  });

  it('shows connect wallet button when wallet is not connected', () => {
    render(<App />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('opens wallet modal when connect button is clicked', () => {
    render(<App />);
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows connected status when wallet is connected', () => {
    render(<App />);
    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);
    
    // Simulate wallet connection
    const testWallet = {
      type: 'bsv',
      name: 'Test Wallet',
      icon: '/test-icon.png',
      address: '0x123',
      balance: 100,
      isAvailable: () => true,
      initiateLogin: async () => {},
      getBalance: async () => 100,
      getAddress: async () => '0x123',
      sendPayment: async () => 'tx123',
      signMessage: async () => 'sig123',
      verifyMessage: async () => true,
    };
    
    // Find and click the connect button in the modal
    const modalConnectButton = screen.getByText('Connect');
    fireEvent.click(modalConnectButton);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
}); 