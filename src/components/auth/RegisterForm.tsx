import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CitySelector } from '@/components/auth/CitySelector';
import { GradeSemesterSelector } from '@/components/auth/GradeSemesterSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const RegisterForm: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const [form, setForm] = useState({
    phone: '',
    password: '',
    nickname: '',
    province: '',
    city: '',
    district: '',
    community: '',
    school: '',
    childGrade: '',
    childSemester: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.phone || !/^\d{11}$/.test(form.phone)) {
      toast({ title: '请输入正确的11位手机号', variant: 'destructive' });
      return;
    }
    if (!form.password || form.password.length < 8) {
      toast({ title: '密码长度不能少于8位', variant: 'destructive' });
      return;
    }
    if (!form.nickname.trim()) {
      toast({ title: '请输入称呼', variant: 'destructive' });
      return;
    }
    if (!form.province || !form.city || !form.district) {
      toast({ title: '请选择完整的省市区', variant: 'destructive' });
      return;
    }
    if (!agreed) {
      toast({ title: '请阅读并同意用户协议', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const email = `${form.phone}@flyfly.local`;
      const { error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            phone: form.phone,
            nickname: form.nickname.trim(),
            province: form.province,
            city: form.city,
            district: form.district,
            community: form.community.trim(),
            school: form.school.trim(),
            child_grade: form.childGrade,
            child_semester: form.childSemester,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({ title: '该手机号已注册，请直接登录', variant: 'destructive' });
        } else {
          toast({ title: '注册失败', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: '注册成功！' });
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleRegister} className="space-y-4">
        {/* 1. Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">账号（手机号） <span className="text-destructive">*</span></Label>
          <Input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="请输入11位手机号"
            value={form.phone}
            onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, ''))}
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">请填写真实手机号，便于通过手机号联系完成交易</p>
        </div>

        {/* 2. Password */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">登录密码 <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请设置密码（至少8位）"
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
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

        {/* 3. Nickname */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-nickname">称呼 <span className="text-destructive">*</span></Label>
          <Input
            id="reg-nickname"
            placeholder="例如：小明妈妈"
            value={form.nickname}
            onChange={(e) => updateForm('nickname', e.target.value)}
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">该称呼将显示在物品列表和详情页中</p>
        </div>

        {/* 4. City Selector */}
        <div className="space-y-1.5">
          <Label>所在城市 <span className="text-destructive">*</span></Label>
          <CitySelector
            province={form.province}
            city={form.city}
            district={form.district}
            onChange={(p, c, d) => {
              updateForm('province', p);
              updateForm('city', c);
              updateForm('district', d);
            }}
          />
          <p className="text-xs text-muted-foreground">选择正确区域有助于附近的家长精确查找到您发布的闲置物品</p>
        </div>

        {/* 5. Community */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-community">小区名称</Label>
          <Input
            id="reg-community"
            placeholder="请输入小区名称"
            value={form.community}
            onChange={(e) => updateForm('community', e.target.value)}
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">请填写完整的小区名称，建议以地图App上的名称为准，方便附近家长精准查找到您发布的闲置物品</p>
        </div>

        {/* 6. School */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-school">孩子就读学校</Label>
          <Input
            id="reg-school"
            placeholder="请输入学校名称"
            value={form.school}
            onChange={(e) => updateForm('school', e.target.value)}
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">请填写完整的学校名称，建议以地图App上的名称为准，方便附近家长精准查找到您发布的闲置物品</p>
        </div>

        {/* 7. Grade + Semester */}
        <div className="space-y-1.5">
          <Label>孩子的年级和学期</Label>
          <GradeSemesterSelector
            grades={form.childGrade ? [form.childGrade] : []}
            semester={form.childSemester}
            onChange={(g, s) => {
              updateForm('childGrade', g.length > 0 ? g[g.length - 1] : '');
              updateForm('childSemester', s);
            }}
          />
          <p className="text-xs text-muted-foreground">选择孩子当前的年级和学期，系统将自动优先展示匹配的物品。小初高在每年3月1日和9月1日自动升级学期</p>
        </div>

        {/* Agreement */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="agree" className="text-sm text-muted-foreground leading-tight">
            我已阅读并同意
            <button
              type="button"
              className="text-primary hover:underline mx-0.5"
              onClick={() => setShowAgreement(true)}
            >
              《用户协议》
            </button>
          </label>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !agreed}>
          {loading ? '注册中...' : '注册'}
        </Button>
      </form>


      {/* User Agreement Dialog */}
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>飞呀飞用户协议</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3 py-2">
            <p>欢迎使用「飞呀飞」社区二手物品交易平台。请您在注册前仔细阅读本协议。</p>
            <h4 className="font-medium text-foreground">一、服务说明</h4>
            <p>飞呀飞是一个面向社区家长的二手物品交易信息平台，主要服务于学生教材、教辅及其他闲置物品的买卖双方信息对接。平台本身不参与实际交易，不对交易双方的行为承担担保责任。</p>
            <h4 className="font-medium text-foreground">二、用户行为规范</h4>
            <p>用户应保证注册信息真实有效；不得发布违禁品、侵权物品或虚假信息；应文明交易，互相尊重。</p>
            <h4 className="font-medium text-foreground">三、隐私保护</h4>
            <p>平台对用户的手机号等个人信息进行脱敏处理，仅在交易双方确认后才展示完整联系方式。用户信息仅用于平台服务，不会提供给第三方。</p>
            <h4 className="font-medium text-foreground">四、免责声明</h4>
            <p>平台仅提供信息展示服务，不对物品质量、交易纠纷承担责任。请交易双方在线下交易时当面验货。建议优先选择社区内、学校附近的面交方式。</p>
            <h4 className="font-medium text-foreground">五、协议变更</h4>
            <p>平台有权根据需要修改本协议，修改后的协议在平台公布后即时生效。</p>
          </div>
          <Button onClick={() => setShowAgreement(false)} className="w-full">
            我已阅读
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RegisterForm;
