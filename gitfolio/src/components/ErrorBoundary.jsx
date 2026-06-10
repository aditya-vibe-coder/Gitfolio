import React from 'react';
import { clearAllDexieData, db } from '../services/db';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, quotaError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    
    // Handle ChunkLoadError - typically happens after a new deployment
    if (error instanceof TypeError && error.message.includes('Failed to fetch dynamically imported module')) {
      console.warn('Deployment mismatch detected. Reloading page to fetch latest assets...');
      window.location.reload();
    }

    // Handle QuotaExceededError - IndexedDB full
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        (error.message && error.message.includes('quota')) || 
        (error.message && error.message.includes('full'))) {
      this.setState({ quotaError: true });
    }
  }

  handleReset = async () => {
    try {
      await clearAllDexieData();
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear data during reset', err);
    }
  };

  handleClearCacheOnly = async () => {
    try {
      if (db && db.cache) {
        await db.cache.clear();
      }
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear cache', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.quotaError;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#0d1117',
          color: '#e6edf3',
        }}>
          {isQuotaError ? (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Storage Full</h1>
              <p style={{ color: '#8b949e', marginBottom: '24px', maxWidth: '400px' }}>
                Your browser storage is full. Clear old data to continue.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  onClick={this.handleClearCacheOnly}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    backgroundColor: '#21262d',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                  }}
                >
                  Clear Cache Only
                </button>
                <button 
                  onClick={this.handleReset}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                  }}
                >
                  Reset Everything
                </button>
              </div>
              <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '16px' }}>
                "Clear Cache" removes only cached API responses. "Reset" removes all data.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Something went wrong</h1>
              <p style={{ color: '#8b949e', marginBottom: '24px' }}>Clear data and retry?</p>
              <button 
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  backgroundColor: '#238636',
                  color: 'white',
                  border: 'none',
                }}
              >
                Reset App
              </button>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
