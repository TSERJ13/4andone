"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music2, Lock, User, AppWindow } from 'lucide-react';
import Logo from "@/components/brand/Logo";

export default function AdminLogin() {
  const [email, setEmail] = useState('4andonestudio@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock API call for now (until Supabase is connected)
    setTimeout(() => {
      if (email === '4andonestudio@gmail.com' && password === '@Kjkszpj13') {
        router.push('/admin/dashboard');
      } else {
        alert('Invalid credentials');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="login-page">
      <div className="login-card glass">
        <div className="login-header">
          <Logo size={64} className="text-primary pulse" />
          <h1 className="text-gradient">Admin Center</h1>
          <p className="login-subtitle">4and.one Music Studio</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input 
              type="email" 
              placeholder="Admin Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button className="login-btn btn-primary" disabled={isLoading}>
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
          background: radial-gradient(circle at center, #18181b 0%, #000 100%);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 48px;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.5);
        }

        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .text-gradient {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .login-subtitle {
          color: #71717a;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #52525b;
        }

        input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 16px 16px 48px;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(29, 185, 84, 0.05);
        }

        .login-btn {
          margin-top: 12px;
          height: 52px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          font-size: 12px;
          color: #3f3f46;
        }

        .pulse {
          animation: pulse 3s infinite ease-in-out;
        }

        @keyframes pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(29, 185, 84, 0)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(29, 185, 84, 0.2)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(29, 185, 84, 0)); }
        }
      `}</style>
    </div>
  );
}
