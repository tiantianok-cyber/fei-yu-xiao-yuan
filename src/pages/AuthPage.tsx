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
        <span className="font-medium">账号</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="飞呀飞" className="h-16 w-16 rounded-2xl mb-3" />
            <h2 className="text-xl font-semibold text-foreground">飞呀飞</h2>
            <p className="text-sm text-muted-foreground">社区二手物品交易平台</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-0">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative ${
                mode === 'login'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              登录
              {mode === 'login' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative ${
                mode === 'register'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              注册
              {mode === 'register' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* Form */}
          <div className="bg-card rounded-b-xl border border-t-0 border-border p-6">
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
