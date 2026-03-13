import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [logsDialog, setLogsDialog] = useState<{ open: boolean; user: UserProfile | null; logs: LoginLog[] }>({ open: false, user: null, logs: [] });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data as UserProfile[] || []);
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetDialog.user || !newPassword || newPassword.length < 8) {
      toast.error('密码至少8位');
      return;
    }
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

  const handleViewLogs = async (user: UserProfile) => {
    const { data } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', user.user_id)
      .order('login_time', { ascending: false })
      .limit(50);
    setLogsDialog({ open: true, user, logs: (data as LoginLog[]) || [] });
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const action = user.status === 'enabled' ? 'disable_user' : 'enable_user';
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action, userId: user.user_id },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(action === 'disable_user' ? '已禁用' : '已启用');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
    setActionLoading(false);
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
              <TableHead className="hidden lg:table-cell">小区</TableHead>
              <TableHead className="hidden lg:table-cell">学校</TableHead>
              <TableHead className="hidden md:table-cell">年级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden sm:table-cell">注册时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nickname}</TableCell>
                <TableCell className="text-xs">{u.phone}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  {[u.province, u.city, u.district].filter(Boolean).join(' ')}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{u.community || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{u.school || '-'}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  {u.child_grade ? `${u.child_grade}${u.child_semester ? ' ' + u.child_semester : ''}` : '-'}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleToggleStatus(u)}
                      disabled={actionLoading}
                    >
                      {u.status === 'enabled' ? <Ban className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
