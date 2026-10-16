import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

// Mock api client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          success: true,
          status: 'ok',
          service: 'SmartCart AI API',
          version: '1.0.0',
          environment: 'development',
          uptime: 42,
        },
      })
    ),
  },
}));

describe('SmartCart AI Frontend App', () => {
  it('renders the branding header and marketplace title', async () => {
    render(<App />);
    const smartCartElements = screen.getAllByText(/SmartCart/i);
    expect(smartCartElements.length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI-Powered Multi-Vendor Marketplace Platform/i);
    
    await waitFor(() => {
      expect(screen.getByText(/Backend Response:/i)).toBeInTheDocument();
    });
  });

  it('renders system diagnostics cards and phase roadmap', async () => {
    render(<App />);
    expect(screen.getByText(/Backend & Service Diagnostic/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Architecture Roadmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 1 of 13 In Progress/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Backend Response:/i)).toBeInTheDocument();
    });
  });
});
