import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Copy, Phone, Store, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const CONDITIONS: Record<string, { label: string; desc: string }> = {
  brand_new: { label: '全新', desc: '未使用，包装完好' },
  almost_new: { label: '几乎全新', desc: '仅翻阅，无笔记折痕' },
  slightly_used: { label: '轻微使用', desc: '少量笔记，整体良好' },
  used: { label: '使用过', desc: '有笔记标注，不影响阅读' },
  heavily_used: { label: '大量使用', desc: '较多笔记磨损，可正常使用' },
};

interface Product {
  id: string;
  seller_id: string;
  type: 'book' | 'other';
  name: string;
  author: string | null;
  translator: string | null;
  publisher: string | null;
  publish_date: string | null;
  cover_image_url: string | null;
  grade: string[] | null;
  semester: string | null;
  book_tag: string | null;
  condition: string;
  condition_note: string | null;
  description: string | null;
  defect_description: string | null;
  price: number;
  school: string | null;
  status: string;
  view_count: number;
  created_at: string;
}

interface SellerProfile {
  user_id: string;
  nickname: string;
  phone: string;
  community: string | null;
  school: string | null;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast({ title: '物品不存在或已下架', variant: 'destructive' });
        navigate('/', { replace: true });
        return;
      }
      setProduct(data as Product);

      // Load seller
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('user_id, nickname, phone, community, school')
        .eq('user_id', data.seller_id)
        .single();
      if (sellerData) setSeller(sellerData);

      // Log view
      if (user) {
        await supabase.from('product_views').insert({
          product_id: id,
          viewer_id: user.id,
        });
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const addToCart = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    if (!product) return;
    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: product.id,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: '该物品已在购物车中' });
      } else {
        toast({ title: '加入购物车失败', variant: 'destructive' });
      }
    } else {
      toast({ title: '已加入购物车 🛒' });
    }
  };

  const copyToPublish = () => {
    if (!product) return;
    // Store product info in sessionStorage for pre-fill
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
    }));
    navigate('/publish');
    toast({ title: '已复制书籍信息到发布页' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-card border-b border-border px-4 h-12 flex items-center">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="ml-3 font-medium">加载中...</span>
        </div>
        <div className="animate-pulse p-4 space-y-4">
          <div className="aspect-[1/1.42] bg-muted rounded-xl max-w-sm mx-auto" />
          <div className="h-6 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const cond = CONDITIONS[product.condition];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center">
        <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="ml-3 font-medium text-sm line-clamp-1">{product.name}</span>
      </div>

      {/* Cover */}
      <div className="bg-muted">
        <div className="max-w-md mx-auto aspect-[1/1.42] relative">
          {product.cover_image_url ? (
            <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-6xl mb-2">📖</div>
                <span className="text-sm">{product.type === 'book' ? '暂无封面' : '暂无图片'}</span>
              </div>
            </div>
          )}
          {product.status === 'in_trade' && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-orange-500 text-white">交易中</Badge>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Price & name */}
        <div>
          <div className="text-2xl font-bold text-primary mb-1">¥{product.price}</div>
          <h1 className="text-lg font-semibold text-foreground">{product.name}</h1>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {product.type === 'book' && product.book_tag && (
            <Badge variant="secondary">{product.book_tag}</Badge>
          )}
          {product.grade?.map(g => (
            <Badge key={g} variant="outline">{g}</Badge>
          ))}
          {product.semester && <Badge variant="outline">{product.semester}</Badge>}
          {cond && (
            <Badge variant="secondary" className="gap-1">
              {cond.label}
              <span className="text-muted-foreground font-normal">· {cond.desc}</span>
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {product.type === 'book' && (
            <>
              {product.author && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">作者</span>
                  <span className="text-foreground">{product.author}</span>
                </div>
              )}
              {product.translator && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">译者</span>
                  <span className="text-foreground">{product.translator}</span>
                </div>
              )}
              {product.publisher && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">出版社</span>
                  <span className="text-foreground">{product.publisher}</span>
                </div>
              )}
              {product.publish_date && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">出版时间</span>
                  <span className="text-foreground">{product.publish_date}</span>
                </div>
              )}
            </>
          )}
          {product.school && (
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">适用学校</span>
              <span className="text-foreground">{product.school}</span>
            </div>
          )}
          {product.condition_note && (
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground shrink-0">成色说明</span>
              <span className="text-foreground text-right ml-4">{product.condition_note}</span>
            </div>
          )}
          {product.description && (
            <div className="px-4 py-3 text-sm">
              <span className="text-muted-foreground block mb-1">描述</span>
              <p className="text-foreground whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
          {product.defect_description && (
            <div className="px-4 py-3 text-sm">
              <span className="text-muted-foreground block mb-1">瑕疵说明</span>
              <p className="text-foreground whitespace-pre-wrap">{product.defect_description}</p>
            </div>
          )}
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-muted-foreground">浏览量</span>
            <span className="text-foreground">{product.view_count}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-muted-foreground">发布时间</span>
            <span className="text-foreground">{new Date(product.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        {/* Seller */}
        {seller && (
          <div
            className="bg-card rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/store/${seller.user_id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {seller.nickname.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{seller.nickname}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <a
                    href={user ? `tel:${seller.phone}` : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!user) {
                        e.preventDefault();
                        navigate('/auth', { state: { from: `/product/${id}` } });
                      }
                    }}
                    className="flex items-center gap-0.5"
                  >
                    <Phone className="h-3 w-3" />
                    {user ? seller.phone : maskPhone(seller.phone)}
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Store className="h-4 w-4" />
              <span className="text-xs">店铺</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 flex gap-3 md:max-w-2xl md:mx-auto">
        {product.type === 'book' && (
          <Button variant="outline" className="flex-1" onClick={copyToPublish}>
            <Copy className="h-4 w-4 mr-1" />我也要卖此书
          </Button>
        )}
        {product.status === 'on_sale' && (
          <Button className="flex-1" onClick={addToCart}>
            <ShoppingCart className="h-4 w-4 mr-1" />加入购物车
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
