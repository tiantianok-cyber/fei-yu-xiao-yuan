import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import logo from '@/assets/logo.png';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => navigate(from, { replace: true })}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">{mode === 'login' ? '登录' : '注册'}</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="飞呀飞" className="h-16 w-16 rounded-2xl mb-3" />
            <h2 className="text-xl font-semibold text-foreground">飞呀飞</h2>
            <p className="text-sm text-muted-foreground">社区二手物品交易平台</p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-xl border border-border p-6">
            {mode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
