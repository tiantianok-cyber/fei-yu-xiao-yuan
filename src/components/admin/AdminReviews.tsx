import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface ReviewRow {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: 'buyer' | 'seller';
  cooperation_score: number;
  description_match_score: number | null;
  content: string | null;
  is_default: boolean;
  created_at: string;
  reviewer_nickname?: string;
  reviewee_nickname?: string;
  product_type?: string;
}

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    setLoading(true);
    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reviewsData || reviewsData.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    // Get unique user ids for nicknames
    const userIds = new Set<string>();
    reviewsData.forEach(r => { userIds.add(r.reviewer_id); userIds.add(r.reviewee_id); });
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nickname')
      .in('user_id', Array.from(userIds));
    const nickMap: Record<string, string> = {};
    (profiles || []).forEach(p => { nickMap[p.user_id] = p.nickname; });

    // Get order -> product type mapping
    const orderIds = [...new Set(reviewsData.map(r => r.order_id))];
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id, product_id')
      .in('order_id', orderIds);

    const productIds = [...new Set((orderItems || []).map(oi => oi.product_id))];
    const { data: productsData } = await supabase
      .from('products')
      .select('id, type')
      .in('id', productIds);

    const productTypeMap: Record<string, string> = {};
    (productsData || []).forEach(p => { productTypeMap[p.id] = p.type; });

    const orderProductTypeMap: Record<string, string> = {};
    (orderItems || []).forEach(oi => {
      orderProductTypeMap[oi.order_id] = productTypeMap[oi.product_id] || 'unknown';
    });

    const enriched: ReviewRow[] = reviewsData.map(r => ({
      ...r,
      reviewer_nickname: nickMap[r.reviewer_id] || '未知',
      reviewee_nickname: nickMap[r.reviewee_id] || '未知',
      product_type: orderProductTypeMap[r.order_id] || 'unknown',
    }));

    setReviews(enriched);
    setLoading(false);
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('评价已删除');
      loadReviews();
    }
  };

  // Sort
  let sorted = [...reviews];
  if (sortBy === 'score_asc') sorted.sort((a, b) => a.cooperation_score - b.cooperation_score);
  else if (sortBy === 'score_desc') sorted.sort((a, b) => b.cooperation_score - a.cooperation_score);
  else if (sortBy === 'date_asc') sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  // default date_desc already sorted

  // Filter by product type
  if (typeFilter !== 'all') {
    sorted = sorted.filter(r => r.product_type === typeFilter);
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载评价数据...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">最新优先</SelectItem>
            <SelectItem value="date_asc">最早优先</SelectItem>
            <SelectItem value="score_desc">评分从高到低</SelectItem>
            <SelectItem value="score_asc">评分从低到高</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="book">书籍</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>评价人</TableHead>
              <TableHead>被评价人</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>配合分</TableHead>
              <TableHead className="hidden sm:table-cell">描述符合</TableHead>
              <TableHead className="hidden md:table-cell">内容</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="hidden sm:table-cell">时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.reviewer_nickname}</TableCell>
                <TableCell className="text-xs">{r.reviewee_nickname}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {r.reviewer_role === 'buyer' ? '买家' : '卖家'}
                  </Badge>
                </TableCell>
                <TableCell>{r.cooperation_score}</TableCell>
                <TableCell className="hidden sm:table-cell">{r.description_match_score ?? '-'}</TableCell>
                <TableCell className="hidden md:table-cell text-xs max-w-[150px] truncate">
                  {r.content || (r.is_default ? '系统默认好评' : '-')}
                </TableCell>
                <TableCell className="text-xs">{r.product_type === 'book' ? '书籍' : '其他'}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">
                  {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无评价</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminReviews;
