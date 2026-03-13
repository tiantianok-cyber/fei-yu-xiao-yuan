import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, BarChart3, Users, Package, Star } from 'lucide-react';
import AdminStats from '@/components/admin/AdminStats';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminReviews from '@/components/admin/AdminReviews';

const AdminPage: React.FC = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth', { state: { from: '/tianadmin' } });
      return;
    }
    // Check admin/moderator role
    (async () => {
      const [{ data: isAdmin, error: adminError }, { data: isModerator, error: moderatorError }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      ]);

      if (adminError || moderatorError || (!isAdmin && !isModerator)) {
        toast.error('无管理员权限');
        navigate('/');
      } else {
        setIsAdmin(true);
      }
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-foreground">飞呀飞 · 管理后台</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile?.nickname || '管理员'}</span>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg mb-6">
            <TabsTrigger value="stats" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              数据统计
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              物品管理
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5 text-xs sm:text-sm">
              <Star className="h-4 w-4" />
              评价管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats"><AdminStats /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="products"><AdminProducts /></TabsContent>
          <TabsContent value="reviews"><AdminReviews /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
