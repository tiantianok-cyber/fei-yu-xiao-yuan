import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  on_sale: { label: '上架中', variant: 'default' },
  in_trade: { label: '交易中', variant: 'secondary' },
  sold: { label: '已售出', variant: 'outline' },
  off_shelf: { label: '已下架', variant: 'outline' },
};

interface MyProduct {
  id: string;
  name: string;
  price: number;
  cover_image_url: string | null;
  status: string;
  type: string;
  view_count: number;
  created_at: string;
  author: string | null;
  translator: string | null;
  publisher: string | null;
  publish_date: string | null;
  grade: string[] | null;
  semester: string | null;
  book_tag: string | null;
  condition: string;
  description: string | null;
  school: string | null;
}

const MyProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<MyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, price, cover_image_url, status, type, view_count, created_at, author, translator, publisher, publish_date, grade, semester, book_tag, condition, description, school')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    setProducts((data || []) as MyProduct[]);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, [user]);

  const toggleShelf = async (product: MyProduct) => {
    const newStatus = product.status === 'on_sale' ? 'off_shelf' : 'on_sale';
    await supabase.from('products').update({ status: newStatus as any }).eq('id', product.id);
    toast({ title: newStatus === 'on_sale' ? '已重新上架' : '已下架' });
    loadProducts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('products').delete().eq('id', deleteId);
    toast({ title: '已删除' });
    setDeleteId(null);
    loadProducts();
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-foreground">我的发布</h1>
        <Button size="sm" onClick={() => navigate('/publish')}>
          <Plus className="h-4 w-4 mr-1" />发布
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse flex gap-3">
              <div className="w-16 h-[90px] bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">还没有发布任何物品</p>
          <Button onClick={() => navigate('/publish')}>
            <Plus className="h-4 w-4 mr-1" />发布物品
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const statusInfo = STATUS_MAP[product.status] || { label: product.status, variant: 'outline' as const };
            return (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border overflow-hidden flex cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="w-16 bg-muted shrink-0 self-stretch overflow-hidden">
                  {product.cover_image_url ? (
                    <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{product.name}</h3>
                      <Badge variant={statusInfo.variant} className="text-[10px] shrink-0">{statusInfo.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>¥{product.price}</span>
                      <span>{product.view_count} 次浏览</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    {(product.status === 'on_sale' || product.status === 'off_shelf') && (
                      <>
                        <button
                          onClick={() => navigate(`/publish/${product.id}`)}
                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
                        >
                          <Edit className="h-3 w-3" />修改
                        </button>
                        <button
                          onClick={() => toggleShelf(product)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                        >
                          {product.status === 'on_sale' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {product.status === 'on_sale' ? '下架' : '上架'}
                        </button>
                      </>
                    )}
                    {product.status === 'sold' && (
                      <button
                        onClick={() => {
                          sessionStorage.setItem('prefill_product', JSON.stringify({
                            type: product.type,
                            name: product.name,
                            author: product.author,
                            translator: product.translator,
                            publisher: product.publisher,
                            publish_date: product.publish_date,
                            grade: product.grade,
                            semester: product.semester,
                            book_tag: product.book_tag,
                            cover_image_url: product.cover_image_url,
                            condition: product.condition,
                            description: product.description,
                            price: product.price,
                            school: product.school,
                          }));
                          navigate('/publish');
                          toast({ title: '已复制物品信息到发布页' });
                        }}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
                      >
                        <RefreshCw className="h-3 w-3" />重新发布
                      </button>
                    )}
                    {product.status !== 'in_trade' && product.status !== 'sold' && (
                      <button
                        onClick={() => setDeleteId(product.id)}
                        className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-0.5"
                      >
                        <Trash2 className="h-3 w-3" />删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">删除后无法恢复，确定要删除吗？</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProductsPage;
