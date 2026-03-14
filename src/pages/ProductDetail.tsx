import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Copy, Phone, Store, ChevronRight, X, Share2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const CONDITIONS: Record<string, { label: string; desc: string }> = {
  brand_new: { label: '全新', desc: '未拆封' },
  almost_new: { label: '九九新', desc: '仅使用一次，无破损' },
  slightly_used: { label: '九五新', desc: '仅有翻阅痕迹' },
  used: { label: '九成新', desc: '轻度污渍和（或）少量标注' },
  heavily_used: { label: '九成新以下', desc: '有较重污渍和（或）有标注' },
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
  city: string | null;
  district: string | null;
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
  const [showImage, setShowImage] = useState(false);
  const [inCart, setInCart] = useState(false);

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

      const { data: sellerData } = await supabase
        .from('profiles')
        .select('user_id, nickname, phone, community, school, city, district')
        .eq('user_id', data.seller_id)
        .single();
      if (sellerData) setSeller(sellerData);

      if (user) {
        // Check if product is already in cart
        const { data: cartCheck } = await supabase
          .from('cart_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', id)
          .maybeSingle();
        setInCart(!!cartCheck);

        await supabase.from('product_views').insert({
          product_id: id,
          viewer_id: user.id,
        });
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const isSelfProduct = user && product?.seller_id === user.id;

  const addToCart = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    if (!product) return;
    if (isSelfProduct) {
      toast({ title: '不能购买自己发布的物品' });
      return;
    }
    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: product.id,
    });
    if (error) {
      if (error.code === '23505') {
        setInCart(true);
        toast({ title: '该物品已在购物车中' });
      } else {
        toast({ title: '加入购物车失败', variant: 'destructive' });
      }
    } else {
      setInCart(true);
      toast({ title: '已加入购物车 🛒' });
    }
  };

  const copyToPublish = () => {
    if (!product) return;
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
        <div className="animate-pulse p-6">
          <div className="flex gap-6">
            <div className="w-64 h-[360px] bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const cond = CONDITIONS[product.condition];

  // Detail rows for the info section
  const detailRows: { label: string; value: string | null | undefined }[] = [
    ...(product.type === 'book' ? [
      { label: '作者', value: product.author },
      { label: '译者', value: product.translator },
      { label: '出版社', value: product.publisher },
      { label: '出版时间', value: product.publish_date },
    ] : []),
    { label: '适用学校', value: product.school },
    { label: '年级', value: product.grade?.join('、') },
    { label: '学期', value: product.semester },
    ...(product.type === 'book' ? [
      { label: '成色', value: cond ? `${cond.label} · ${cond.desc}` : null },
      { label: '成色说明', value: product.condition_note },
    ] : []),
    { label: '浏览量', value: String(product.view_count) },
  ].filter(r => r.value);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center">
        <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="ml-3 font-medium text-sm line-clamp-1">{product.name}</span>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Main: left-right layout */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Cover + Actions */}
          <div className="md:w-64 shrink-0 space-y-4">
            {/* Cover */}
            <div className="bg-muted rounded-xl overflow-hidden aspect-[1/1.42] relative cursor-pointer" onClick={() => product.cover_image_url && setShowImage(true)}>
              {product.cover_image_url ? (
                <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-6xl mb-2">📖</div>
                    <span className="text-sm">{product.type === 'book' ? '暂无封面' : '暂无图片'}</span>
                  </div>
                </div>
              )}
              {product.status === 'in_trade' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Badge className="bg-destructive text-destructive-foreground text-sm px-3 py-1 font-semibold">交易中</Badge>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="text-2xl font-bold text-primary text-center">¥{product.price}</div>

            {/* Action buttons */}
            <div className="space-y-2">
              {product.status === 'on_sale' && !isSelfProduct && (
                inCart ? (
                  <Button className="w-full" disabled variant="outline">
                    <ShoppingCart className="h-4 w-4 mr-1" />已加入购物车
                  </Button>
                ) : (
                  <Button className="w-full" onClick={addToCart}>
                    <ShoppingCart className="h-4 w-4 mr-1" />加入购物车
                  </Button>
                )
              )}
              {product.type === 'book' && !isSelfProduct && (
                <Button variant="outline" className="w-full" onClick={copyToPublish}>
                  <Copy className="h-4 w-4 mr-1" />我也要卖此书
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => {
                const url = `${window.location.origin}/product/${product.id}`;
                const text = `【${product.name}】孩子的闲置好物，价格实惠，有需要的邻居戳链接挑选 ${url}`;
                navigator.clipboard.writeText(text).then(() => {
                  toast({ title: '分享内容已复制到剪贴板 📋' });
                }).catch(() => {
                  toast({ title: '复制失败，请手动复制', variant: 'destructive' });
                });
              }}>
                <Share2 className="h-4 w-4 mr-1" />分享
              </Button>
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Title & Tags */}
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-2">{product.name}</h1>
              <div className="flex flex-wrap gap-1.5">
                {product.type === 'book' && product.book_tag && (
                  <Badge variant="secondary">{product.book_tag}</Badge>
                )}
                {product.grade?.map(g => (
                  <Badge key={g} variant="outline">{g}</Badge>
                ))}
                {product.semester && <Badge variant="outline">{product.semester}</Badge>}
              </div>
            </div>

            {/* Detail table */}
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {detailRows.map((row, i) => (
                <div key={i} className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground shrink-0">{row.label}</span>
                  <span className="text-foreground text-right ml-4">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-card rounded-xl border border-border p-4">
                <span className="text-sm text-muted-foreground block mb-1">描述</span>
                <p className="text-sm text-foreground whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Defect */}
            {product.defect_description && (
              <div className="bg-card rounded-xl border border-border p-4">
                <span className="text-sm text-muted-foreground block mb-1">瑕疵说明</span>
                <p className="text-sm text-foreground whitespace-pre-wrap">{product.defect_description}</p>
              </div>
            )}

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
                    <p className="font-medium text-sm text-foreground">
                      {seller.nickname}
                      {(seller.city || seller.district) && (
                        <span className="text-muted-foreground font-normal"> | {[seller.city, seller.district].filter(Boolean).join('')}</span>
                      )}
                    </p>
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
        </div>
      </div>
      {/* Image preview dialog */}
      {product.cover_image_url && (
        <Dialog open={showImage} onOpenChange={setShowImage}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            <img src={product.cover_image_url} alt={product.name} className="w-full h-auto object-contain max-h-[85vh] rounded" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProductDetail;
