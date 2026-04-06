"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

export default function SaLogin() {
  const [email, setEmail] = useState('4andonestudio@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (email === '4andonestudio@gmail.com' && password === '@Kjkszpj13') {
        localStorage.setItem('studio_auth', 'true');
        router.push('/admin/library');
      } else {
        setError('Invalid admin credentials. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 800);
  };

  if (!mounted) return <div style={{ background: '#000', height: '100vh', width: '100vw' }} />;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="text-gradient">Admin Dashboard</h1>
          <p className="login-subtitle">4and.one Music Studio Management</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Login to Studio'}
          </button>
        </form>

        <div className="login-footer">
          <p>&copy; 2026 4and.one Music Studio. All rights reserved.</p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          color: white;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
        }

        .text-gradient {
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -2px;
          margin-bottom: 8px;
          background: linear-gradient(to bottom, #ffffff, #888888);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          color: #71717a;
          font-size: 13px;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          width: 100%;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #52525b;
          z-index: 10;
        }

        input {
          width: 100%;
          background: #0f0f12;
          border: 1px solid #27272a;
          padding: 16px 16px 16px 48px;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #1db954;
          background: #121216;
          box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.1);
        }

        /* Prevent autofill white background */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: white;
          -webkit-box-shadow: 0 0 0px 1000px #0f0f12 inset;
          transition: background-color 5000s ease-in-out 0s;
        }

        .login-btn {
          margin-top: 8px;
          height: 52px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          background: #1db954;
          color: black;
          transition: all 0.2s;
        }

        .login-btn:hover:not(:disabled) {
          background: #1ed760;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-box {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          border: 1px solid rgba(239, 68, 68, 0.1);
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .login-footer {
          text-align: center;
          font-size: 11px;
          color: #3f3f46;
        }
      `}</style>
    </div>
  );
}
