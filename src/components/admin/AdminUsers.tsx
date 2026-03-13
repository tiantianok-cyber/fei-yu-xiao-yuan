import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { KeyRound, FileText, Ban, CheckCircle, Search } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  nickname: string;
  phone: string;
  province: string | null;
  city: string | null;
  district: string | null;
  community: string | null;
  school: string | null;
  child_grade: string | null;
  child_semester: string | null;
  status: 'enabled' | 'disabled';
  created_at: string;
}

interface LoginLog {
  id: string;
  login_time: string;
  device: string | null;
  ip: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

type AdminRole = 'admin' | 'moderator' | 'user';

const SUPER_ADMIN_PHONE = '15810505520';

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [currentRole, setCurrentRole] = useState<AdminRole>('user');
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [logsDialog, setLogsDialog] = useState<{ open: boolean; user: UserProfile | null; logs: LoginLog[] }>({ open: false, user: null, logs: [] });
  const [disableConfirm, setDisableConfirm] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, { avg: number; count: number }>>({});
  const [bookCounts, setBookCounts] = useState<Record<string, { onSale: number; sold: number }>>({});

  // Search & filter state
  const [searchText, setSearchText] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: rolesData }, { data: reviewsData }, { data: productsData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('reviews').select('reviewee_id, cooperation_score'),
      supabase.from('products').select('seller_id, status'),
    ]);

    const roleRows = (rolesData as UserRole[]) || [];
    setUsers((profilesData as UserProfile[]) || []);
    setRoles(roleRows);

    if (user) {
      const myRoles = roleRows.filter((r) => r.user_id === user.id).map((r) => r.role);
      const role: AdminRole = myRoles.includes('admin')
        ? 'admin'
        : myRoles.includes('moderator')
          ? 'moderator'
          : 'user';
      setCurrentRole(role);
    }

    // Calculate scores
    const scoreMap: Record<string, { total: number; count: number }> = {};
    (reviewsData || []).forEach((r: any) => {
      if (!scoreMap[r.reviewee_id]) scoreMap[r.reviewee_id] = { total: 0, count: 0 };
      scoreMap[r.reviewee_id].total += Number(r.cooperation_score || 0);
      scoreMap[r.reviewee_id].count += 1;
    });
    const calculated: Record<string, { avg: number; count: number }> = {};
    Object.entries(scoreMap).forEach(([uid, v]) => {
      calculated[uid] = { avg: Number((v.total / v.count).toFixed(1)), count: v.count };
    });
    setScores(calculated);

    // Calculate book counts (on_sale + sold)
    const countMap: Record<string, { onSale: number; sold: number }> = {};
    (productsData || []).forEach((p: any) => {
      if (!countMap[p.seller_id]) countMap[p.seller_id] = { onSale: 0, sold: 0 };
      if (p.status === 'on_sale' || p.status === 'in_trade') countMap[p.seller_id].onSale += 1;
      if (p.status === 'sold') countMap[p.seller_id].sold += 1;
    });
    setBookCounts(countMap);

    setLoading(false);
  };

  // Derive unique cities for filter
  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    users.forEach((u) => { if (u.city) cities.add(u.city); });
    return Array.from(cities).sort();
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchText ||
        u.nickname.toLowerCase().includes(searchText.toLowerCase()) ||
        u.phone.includes(searchText);
      const matchesCity = filterCity === 'all' || u.city === filterCity;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [users, searchText, filterCity, filterStatus]);

  const getRoleOfUser = (u: UserProfile): AdminRole => {
    if (u.phone === SUPER_ADMIN_PHONE) return 'admin';
    const roleRows = roles.filter((r) => r.user_id === u.user_id).map((r) => r.role);
    if (roleRows.includes('admin')) return 'admin';
    if (roleRows.includes('moderator')) return 'moderator';
    return 'user';
  };

  const canManageUserStatus = (u: UserProfile) => {
    const targetRole = getRoleOfUser(u);
    if (currentRole === 'admin') return true;
    if (currentRole === 'moderator') return targetRole !== 'admin';
    return false;
  };

  const handleResetPassword = async () => {
    if (!resetDialog.user || !newPassword || newPassword.length < 8) {
      toast.error('密码至少8位');
      return;
    }
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action: 'reset_password', userId: resetDialog.user.user_id, newPassword },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`密码已重置为: ${newPassword}`);
      setResetDialog({ open: false, user: null });
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || '重置失败');
    }
    setActionLoading(false);
  };

  const handleViewLogs = async (targetUser: UserProfile) => {
    const { data } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', targetUser.user_id)
      .order('login_time', { ascending: false })
      .limit(30);
    setLogsDialog({ open: true, user: targetUser, logs: (data as LoginLog[]) || [] });
  };

  const executeToggleStatus = async (targetUser: UserProfile) => {
    const action = targetUser.status === 'enabled' ? 'disable_user' : 'enable_user';
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action, userId: targetUser.user_id },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(action === 'disable_user' ? '已禁用' : '已启用');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
    setActionLoading(false);
  };

  const handleToggleStatus = async (targetUser: UserProfile) => {
    if (!canManageUserStatus(targetUser)) {
      toast.error('当前账号无权限操作该用户');
      return;
    }
    if (targetUser.status === 'enabled') {
      setDisableConfirm({ open: true, user: targetUser });
      return;
    }
    await executeToggleStatus(targetUser);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载用户数据...</div>;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索称呼或手机号..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="城市筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部城市</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="enabled">正常</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">共 {filteredUsers.length} 人</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>称呼</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead className="hidden md:table-cell">城市</TableHead>
              <TableHead className="hidden lg:table-cell">学校</TableHead>
              <TableHead className="hidden md:table-cell">年级</TableHead>
              <TableHead className="hidden md:table-cell">上架/售出</TableHead>
              <TableHead className="hidden md:table-cell">综合得分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden sm:table-cell">注册时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => {
              const role = getRoleOfUser(u);
              const userScore = scores[u.user_id];
              const counts = bookCounts[u.user_id];
              const canManage = canManageUserStatus(u);

              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{u.nickname}</span>
                      {role === 'admin' && <Badge variant="destructive" className="text-xs">超管</Badge>}
                      {role === 'moderator' && <Badge variant="secondary" className="text-xs">管理</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{u.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {[u.province, u.city, u.district].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{u.school || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {u.child_grade ? `${u.child_grade}${u.child_semester ? ` ${u.child_semester}` : ''}` : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {counts ? `${counts.onSale} / ${counts.sold}` : '0 / 0'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {userScore ? `${userScore.avg}（${userScore.count}条）` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'enabled' ? 'default' : 'destructive'} className="text-xs">
                      {u.status === 'enabled' ? '正常' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">
                    {new Date(u.created_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => { setResetDialog({ open: true, user: u }); setNewPassword(''); }}
                        disabled={actionLoading}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleViewLogs(u)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoading || !canManage}
                        title={canManage ? (u.status === 'enabled' ? '禁用用户' : '启用用户') : '当前账号无权限操作该用户'}
                      >
                        {u.status === 'enabled' ? (
                          <Ban className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  无匹配用户
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Disable Confirm Dialog */}
      <AlertDialog
        open={disableConfirm.open}
        onOpenChange={(open) => setDisableConfirm({ open, user: open ? disableConfirm.user : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认禁用该用户？</AlertDialogTitle>
            <AlertDialogDescription>
              禁用后该账号将无法登录。用户：{disableConfirm.user?.nickname}（{disableConfirm.user?.phone}）
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (disableConfirm.user) await executeToggleStatus(disableConfirm.user);
                setDisableConfirm({ open: false, user: null });
              }}
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={(v) => setResetDialog({ open: v, user: v ? resetDialog.user : null })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>重置密码 - {resetDialog.user?.nickname}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">手机号: {resetDialog.user?.phone}</p>
            <Input
              placeholder="输入新密码（至少8位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button className="w-full" onClick={handleResetPassword} disabled={actionLoading}>
              {actionLoading ? '处理中...' : '确认重置'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Logs Dialog */}
      <Dialog
        open={logsDialog.open}
        onOpenChange={(v) => setLogsDialog({ open: v, user: v ? logsDialog.user : null, logs: v ? logsDialog.logs : [] })}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>登录日志（最近30条） - {logsDialog.user?.nickname}</DialogTitle>
          </DialogHeader>
          {logsDialog.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无登录记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>登录时间</TableHead>
                  <TableHead>设备</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsDialog.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.login_time).toLocaleString('zh-CN')}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{log.device || '-'}</TableCell>
                    <TableCell className="text-xs">{log.ip || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
