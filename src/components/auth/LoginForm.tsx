import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';
import csQrcode from '@/assets/cs-qrcode.jpg';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const LoginForm: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast({ title: '请填写手机号和密码', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const email = `${phone}@flyfly.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: '登录失败', description: error.message === 'Invalid login credentials' ? '手机号或密码错误' : error.message, variant: 'destructive' });
      } else {
        // Log login
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('login_logs').insert({
              user_id: user.id,
              device: navigator.userAgent.slice(0, 200),
            });
          }
        } catch {}
        toast({ title: '登录成功' });
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-phone">手机号</Label>
          <Input
            id="login-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={11}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">密码</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>

      <div className="flex items-center justify-end mt-4 text-sm">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => setShowForgotPwd(true)}
        >
          忘记密码？
        </button>
      </div>

      <Dialog open={showForgotPwd} onOpenChange={setShowForgotPwd}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>忘记密码</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <img src={csQrcode} alt="客服微信二维码" className="w-48 h-48 rounded-lg" />
            <p className="text-sm text-muted-foreground text-center">
              请扫描上方二维码添加客服微信，将协助您重置密码
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginForm;
