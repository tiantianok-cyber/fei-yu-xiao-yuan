import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { EyeOff } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  type: string;
  cover_image_url: string | null;
}

const STATUS_MAP: Record<string, string> = {
  on_sale: '上架中',
  in_trade: '交易中',
  sold: '已售出',
  off_shelf: '已下架',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  on_sale: 'default',
  in_trade: 'secondary',
  sold: 'outline',
  off_shelf: 'destructive',
};

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, price, status, type, cover_image_url')
      .order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  const handleOffShelf = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'off_shelf' })
      .eq('id', productId);
    if (error) {
      toast.error('下架失败');
    } else {
      toast.success('已下架');
      loadProducts();
    }
  };

  const filtered = products.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载物品数据...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="搜索物品名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态 ({products.length})</SelectItem>
            <SelectItem value="on_sale">上架中 ({products.filter(p => p.status === 'on_sale').length})</SelectItem>
            <SelectItem value="in_trade">交易中 ({products.filter(p => p.status === 'in_trade').length})</SelectItem>
            <SelectItem value="sold">已售出 ({products.filter(p => p.status === 'sold').length})</SelectItem>
            <SelectItem value="off_shelf">已下架 ({products.filter(p => p.status === 'off_shelf').length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">封面</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>售价</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">无</div>
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                <TableCell>¥{p.price}</TableCell>
                <TableCell className="text-xs">{p.type === 'book' ? '书籍' : '其他'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] || 'default'} className="text-xs">
                    {STATUS_MAP[p.status] || p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.status !== 'off_shelf' && p.status !== 'sold' && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => handleOffShelf(p.id)}>
                      <EyeOff className="h-3.5 w-3.5 mr-1" />
                      下架
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminProducts;
