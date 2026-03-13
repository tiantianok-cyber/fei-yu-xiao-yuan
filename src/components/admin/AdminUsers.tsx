import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { KeyRound, FileText, Ban, CheckCircle } from 'lucide-react';

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

interface UserScore {
  user_id: string;
  avg_score: number;
  review_count: number;
}

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userScores, setUserScores] = useState<Record<string, UserScore>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [logsDialog, setLogsDialog] = useState<{ open: boolean; user: UserProfile | null; logs: LoginLog[] }>({ open: false, user: null, logs: [] });
  const [disableConfirm, setDisableConfirm] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: rolesData }, { data: reviewData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('reviews').select('reviewee_id, cooperation_score'),
    ]);

    setUsers((profileData as UserProfile[]) || []);
    setUserRoles((rolesData as UserRole[]) || []);

    // Compute current user's role
    if (user) {
      const myRole = (rolesData as UserRole[])?.find(r => r.user_id === user.id);
      setCurrentUserRole(myRole?.role || 'user');
    }

    // Compute average scores per user
    const scoreMap: Record<string, { total: number; count: number }> = {};
    (reviewData || []).forEach((r: any) => {
      if (!scoreMap[r.reviewee_id]) scoreMap[r.reviewee_id] = { total: 0, count: 0 };
      scoreMap[r.reviewee_id].total += r.cooperation_score;
      scoreMap[r.reviewee_id].count += 1;
    });
    const scores: Record<string, UserScore> = {};
    Object.entries(scoreMap).forEach(([uid, s]) => {
      scores[uid] = { user_id: uid, avg_score: Math.round((s.total / s.count) * 10) / 10, review_count: s.count };
    });
    setUserScores(scores);

    setLoading(false);
  };

  const getUserRole = (userId: string): string | null => {
    const role = userRoles.find(r => r.user_id === userId && (r.role === 'admin' || r.role === 'moderator'));
    return role?.role || null;
  };

  const canDisableUser = (targetUserId: string): boolean => {
    const targetRole = getUserRole(targetUserId);
    if (currentUserRole === 'admin') return true; // super admin can disable anyone
    if (currentUserRole === 'moderator') {
      // moderator cannot disable admin
      return targetRole !== 'admin';
    }
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

  const handleViewLogs = async (u: UserProfile) => {
    const { data } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', u.user_id)
      .order('login_time', { ascending: false })
      .limit(50);
    setLogsDialog({ open: true, user: u, logs: (data as LoginLog[]) || [] });
  };

  const handleToggleStatus = async (u: UserProfile) => {
    if (u.status === 'enabled') {
      // Show confirmation before disabling
      setDisableConfirm({ open: true, user: u });
      return;
    }
    // Enable directly
    await executeToggle(u);
  };

  const executeToggle = async (u: UserProfile) => {
    const action = u.status === 'enabled' ? 'disable_user' : 'enable_user';
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action, userId: u.user_id },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(action === 'disable_user' ? '已禁用该用户' : '已启用该用户');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
    setActionLoading(false);
  };

  const confirmDisable = async () => {
    if (disableConfirm.user) {
      await executeToggle(disableConfirm.user);
    }
    setDisableConfirm({ open: false, user: null });
  };

  const getRoleBadge = (userId: string) => {
    const role = getUserRole(userId);
    if (role === 'admin') return <Badge variant="default" className="text-xs bg-red-500 hover:bg-red-600">超管</Badge>;
    if (role === 'moderator') return <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">管理</Badge>;
    return null;
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载用户数据...</div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>称呼</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead className="hidden md:table-cell">城市</TableHead>
              <TableHead className="hidden lg:table-cell">学校</TableHead>
              <TableHead className="hidden md:table-cell">年级</TableHead>
              <TableHead>综合得分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden sm:table-cell">注册时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const score = userScores[u.user_id];
              const disableAllowed = canDisableUser(u.user_id);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {u.nickname}
                      {getRoleBadge(u.user_id)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{u.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {[u.province, u.city, u.district].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{u.school || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {u.child_grade ? `${u.child_grade}${u.child_semester ? ' ' + u.child_semester : ''}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {score ? (
                      <span className="font-medium">{score.avg_score}<span className="text-muted-foreground">（{score.review_count}条）</span></span>
                    ) : <span className="text-muted-foreground">暂无</span>}
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
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setResetDialog({ open: true, user: u }); setNewPassword(''); }}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleViewLogs(u)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {u.status === 'enabled' ? (
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2"
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading || !disableAllowed}
                          title={!disableAllowed ? '无权限禁用该用户' : '禁用用户'}
                        >
                          <Ban className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2"
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Disable Confirmation */}
      <AlertDialog open={disableConfirm.open} onOpenChange={(v) => !v && setDisableConfirm({ open: false, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认禁用用户</AlertDialogTitle>
            <AlertDialogDescription>
              您即将禁用用户 <strong>{disableConfirm.user?.nickname}</strong>（手机号：{disableConfirm.user?.phone}）。
              禁用后该用户将无法登录系统，是否确认？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              onChange={e => setNewPassword(e.target.value)}
            />
            <Button className="w-full" onClick={handleResetPassword} disabled={actionLoading}>
              {actionLoading ? '处理中...' : '确认重置'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Logs Dialog */}
      <Dialog open={logsDialog.open} onOpenChange={(v) => setLogsDialog({ open: v, user: v ? logsDialog.user : null, logs: v ? logsDialog.logs : [] })}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>登录日志 - {logsDialog.user?.nickname}</DialogTitle>
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
                {logsDialog.logs.map(log => (
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
