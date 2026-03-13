import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Store, ClipboardList, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CitySelector } from '@/components/auth/CitySelector';
import { GradeSemesterSelector } from '@/components/auth/GradeSemesterSelector';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [community, setCommunity] = useState('');
  const [school, setSchool] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [childSemester, setChildSemester] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ products: 0, orders: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: '/profile' } });
      return;
    }
    if (profile) {
      setNickname(profile.nickname || '');
      setPhone(profile.phone || '');
      setProvince(profile.province || '');
      setCity(profile.city || '');
      setDistrict(profile.district || '');
      setCommunity(profile.community || '');
      setSchool(profile.school || '');
      setChildGrade(profile.child_grade || '');
      setChildSemester(profile.child_semester || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const [{ count: pCount }, { count: oCount }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('orders').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      ]);
      setStats({ products: pCount || 0, orders: oCount || 0 });
    };
    loadStats();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: '头像不能超过2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: '上传失败', variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl + '?t=' + Date.now());
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!nickname.trim()) {
      toast({ title: '请填写昵称', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        province,
        city,
        district,
        community: community.trim(),
        school: school.trim(),
        child_grade: childGrade,
        child_semester: childSemester,
        avatar_url: avatarUrl,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: '保存失败', variant: 'destructive' });
    } else {
      toast({ title: '保存成功 ✓' });
      await refreshProfile();
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center">
        <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="ml-3 font-medium text-sm">个人中心</span>
      </div>

      <div className="container mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Avatar & Quick Stats */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  nickname.charAt(0) || '?'
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{profile?.nickname || '用户'}</p>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <button onClick={() => navigate('/my-products')} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">我的发布</span>
              <span className="text-sm font-semibold text-foreground">{stats.products}</span>
            </button>
            <button onClick={() => navigate('/orders')} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">我的订单</span>
              <span className="text-sm font-semibold text-foreground">{stats.orders}</span>
            </button>
            <button onClick={() => navigate(`/store/${user.id}`)} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors">
              <Store className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">我的店铺</span>
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">编辑资料</h2>

          <div className="space-y-1.5">
            <Label className="text-xs">昵称</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="输入昵称" maxLength={20} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">手机号</Label>
            <Input value={phone} disabled className="bg-muted" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">所在地区</Label>
            <CitySelector
              province={province}
              city={city}
              district={district}
              onChange={(p, c, d) => { setProvince(p); setCity(c); setDistrict(d); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">小区</Label>
            <Input value={community} onChange={e => setCommunity(e.target.value)} placeholder="输入小区名称" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">学校</Label>
            <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="输入学校名称" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">孩子年级 / 学期</Label>
            <GradeSemesterSelector
              grades={childGrade ? [childGrade] : []}
              semester={childSemester}
              onChange={(g, s) => { setChildGrade(g[0] || ''); setChildSemester(s); }}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存修改'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
