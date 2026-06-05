import { useState } from 'react';

interface LoginProps {
  onLogin: (secret: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) {
      setError('Please enter the admin secret');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Verify the secret by making a test request to the dashboard endpoint
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://detangle-backend.onrender.com/api'}/admin/dashboard`,
        { headers: { Authorization: `Bearer ${secret.trim()}` } }
      );
      if (res.ok) {
        onLogin(secret.trim());
      } else {
        setError('Invalid admin secret');
      }
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logo}>D</div>
        </div>
        <h1 style={styles.title}>Detangle Admin</h1>
        <p style={styles.subtitle}>Enter your admin secret to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={secret}
            onChange={e => { setSecret(e.target.value); setError(''); }}
            placeholder="Admin Secret"
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f0ed',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '48px 40px',
    width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#D19371',
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#333',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    margin: '0 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  input: {
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid #e0e0e0',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#e53935',
    fontSize: 13,
    margin: 0,
  },
  button: {
    padding: '14px',
    borderRadius: 30,
    border: 'none',
    background: '#D19371',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
