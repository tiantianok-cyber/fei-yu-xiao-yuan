import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Share2, Star, ShoppingCart, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SellerProfile {
  user_id: string;
  nickname: string;
  phone: string;
  community: string | null;
  school: string | null;
  avatar_url: string | null;
  city: string | null;
  district: string | null;
}

interface Product {
  id: string;
  name: string;
  author: string | null;
  price: number;
  cover_image_url: string | null;
  type: string;
  status: string;
  condition: string;
  grade: string[] | null;
  semester: string | null;
  school: string | null;
  book_tag: string | null;
  description: string | null;
  created_at: string;
}

// Review interface disabled

const CONDITIONS: Record<string, string> = {
  brand_new: '全新',
  almost_new: '九九新',
  slightly_used: '九五新',
  used: '九成新',
  heavily_used: '九成新以下',
};

const maskName = (name: string) => {
  if (!name || name.length <= 1) return name;
  return name.charAt(0) + '**';
};

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const StarDisplay: React.FC<{ score: number; max?: number }> = ({ score, max = 5 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < Math.round(score) ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`}
      />
    ))}
  </div>
);

const StorePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  // const [reviews, setReviews] = useState<Review[]>([]);
  // const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  // Load user's cart product IDs
  useEffect(() => {
    if (!user) { setCartProductIds(new Set()); return; }
    const loadCart = async () => {
      const { data } = await supabase
        .from('cart_items')
        .select('product_id')
        .eq('user_id', user.id);
      setCartProductIds(new Set((data || []).map(c => c.product_id)));
    };
    loadCart();
  }, [user]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: profileData }, { data: productData }] = await Promise.all([
        supabase.from('profiles').select('user_id, nickname, phone, community, school, avatar_url, city, district').eq('user_id', userId).single(),
        supabase.from('products').select('*').eq('seller_id', userId).in('status', ['on_sale', 'in_trade']).order('created_at', { ascending: false }),
      ]);

      if (profileData) setSeller(profileData);
      if (productData) setProducts(productData as Product[]);
      setLoading(false);
    };
    load();
  }, [userId]);

  // Composite score disabled

  const filteredProducts = useMemo(() => {
    if (!activeSearch) return products;
    const keyword = activeSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(keyword));
  }, [products, activeSearch]);

  const handleSearch = () => setActiveSearch(searchText.trim());
  const handleCancelSearch = () => { setSearchText(''); setActiveSearch(''); };

  const isSelf = user?.id === userId;

  const addToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth', { state: { from: `/store/${userId}` } });
      return;
    }
    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: '该物品已在购物车中' });
      } else {
        toast({ title: '加入购物车失败', variant: 'destructive' });
      }
    } else {
      setCartProductIds(prev => new Set(prev).add(productId));
      toast({ title: '已加入购物车 🛒' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-card border-b border-border px-4 h-12 flex items-center">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="ml-3 font-medium text-sm">加载中...</span>
        </div>
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl border border-border flex">
                <div className="w-24 h-32 bg-muted rounded-l-xl shrink-0" />
                <div className="p-2.5 space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center">
        <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="ml-3 font-medium text-sm">{isSelf ? '我的店铺' : `${seller?.nickname || ''}的店铺`}</span>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Seller Card */}
        {seller && (
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold overflow-hidden shrink-0">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.nickname} className="w-full h-full object-cover" />
              ) : (
                seller.nickname.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">
                {seller.nickname}
                {(seller.city || seller.district) && (
                  <span className="text-muted-foreground font-normal text-sm"> | {[seller.city, seller.district].filter(Boolean).join('')}</span>
                )}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <a
                  href={user ? `tel:${seller.phone}` : undefined}
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      navigate('/auth', { state: { from: `/store/${userId}` } });
                    }
                  }}
                  className="flex items-center gap-0.5"
                >
                  <Phone className="h-3 w-3" />
                  {user ? seller.phone : maskPhone(seller.phone)}
                </a>
                {seller.school && <span>📚 {seller.school}</span>}
                {seller.community && <span>🏠 {seller.community}</span>}
              </div>
              {/* Composite Score disabled */}
            </div>
            <div className="flex items-center shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/store/${userId}`;
                  const text = `整理了一些孩子不用的书和用品，价格实惠，点进来挑一挑吧：${url}`;
                  navigator.clipboard.writeText(text).then(() => {
                    toast({ title: '分享内容已复制到剪贴板 📋' });
                  }).catch(() => {
                    toast({ title: '复制失败，请手动复制', variant: 'destructive' });
                  });
                }}
              >
                <Share2 className="h-3.5 w-3.5 mr-1" />分享
              </Button>
            </div>
          </div>
        )}

        {/* Products - Index-style horizontal cards */}
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3">
            在售物品 {products.length > 0 && <span className="text-muted-foreground font-normal">({products.length})</span>}
          </h2>
          {/* Search bar */}
          <div className="flex gap-2 items-center mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索书名、物品名称..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 pr-8"
              />
              {searchText && (
                <button onClick={() => { setSearchText(''); setActiveSearch(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {activeSearch ? (
              <Button variant="outline" size="sm" onClick={handleCancelSearch} className="shrink-0 h-10">
                <X className="h-4 w-4 mr-1" />取消
              </Button>
            ) : (
              <Button onClick={handleSearch} className="shrink-0 h-10 px-6">搜索</Button>
            )}
          </div>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">🏪</div>
              <p>{activeSearch ? '未找到匹配的物品' : (isSelf ? '你还没有在售商品' : '该店铺暂无在售商品')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const infoLine = [product.school, product.grade?.join('/'), product.semester].filter(Boolean).join(' | ');
                return (
                  <div
                    key={product.id}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {/* Cover */}
                    <div className="w-24 bg-muted relative overflow-hidden shrink-0 self-stretch">
                      {product.cover_image_url ? (
                        <img
                          src={product.cover_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-2xl">{product.type === 'book' ? '📖' : '📦'}</div>
                        </div>
                      )}
                      {product.status === 'in_trade' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Badge className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 font-semibold">交易中</Badge>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm text-foreground line-clamp-1">{product.name}</h3>
                        {product.type === 'book' && product.author && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{product.author}</p>
                        )}
                        {infoLine && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{infoLine}</p>
                        )}
                        {product.type === 'book' && CONDITIONS[product.condition] && (
                          <Badge variant="secondary" className="text-[10px]">{CONDITIONS[product.condition]}</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-primary font-bold text-sm">¥{product.price}</span>
                        {!isSelf && product.status === 'on_sale' && (
                          cartProductIds.has(product.id) ? (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">已加入购物车</span>
                          ) : (
                            <button
                              onClick={(e) => addToCart(product.id, e)}
                              className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3">
            用户评价 {reviews.length > 0 && <span className="text-muted-foreground font-normal">({reviews.length})</span>}
          </h2>
          {reviews.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
              暂无评价
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => {
                const reviewerName = reviewerNames[review.reviewer_id] || '匿名';
                const roleLabel = review.reviewer_role === 'buyer' ? '买家' : '卖家';
                const score = review.reviewer_role === 'buyer'
                  ? (review.description_match_score ?? review.cooperation_score)
                  : review.cooperation_score;
                return (
                  <div key={review.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{maskName(reviewerName)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{roleLabel}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StarDisplay score={score} />
                        <span className="text-xs text-muted-foreground">{score}分</span>
                      </div>
                    </div>
                    {review.content ? (
                      <p className="text-sm text-foreground">{review.content}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {review.is_default ? '系统默认好评' : '该用户未留下文字评价'}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
