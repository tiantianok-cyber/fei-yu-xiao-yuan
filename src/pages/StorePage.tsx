import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
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
}

interface Product {
  id: string;
  name: string;
  price: number;
  cover_image_url: string | null;
  type: string;
  status: string;
  condition: string;
  grade: string[] | null;
  semester: string | null;
  book_tag: string | null;
  created_at: string;
}

const CONDITIONS: Record<string, string> = {
  brand_new: '全新',
  almost_new: '九九新',
  slightly_used: '九五新',
  used: '九成新',
  heavily_used: '九成新以下',
};

const StorePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: profileData }, { data: productData }] = await Promise.all([
        supabase.from('profiles').select('user_id, nickname, phone, community, school, avatar_url').eq('user_id', userId).single(),
        supabase.from('products').select('*').eq('seller_id', userId).in('status', ['on_sale', 'in_trade']).order('created_at', { ascending: false }),
      ]);

      if (profileData) setSeller(profileData);
      if (productData) setProducts(productData as Product[]);
      setLoading(false);
    };
    load();
  }, [userId]);

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  const isSelf = user?.id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-card border-b border-border px-4 h-12 flex items-center">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="ml-3 font-medium text-sm">加载中...</span>
        </div>
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-52 bg-muted rounded-xl" />)}
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
              <p className="font-semibold text-foreground">{seller.nickname}</p>
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
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-primary">{products.length}</p>
              <p className="text-xs text-muted-foreground">在售</p>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="text-5xl mb-3">🏪</div>
            <p>{isSelf ? '你还没有在售商品' : '该店铺暂无在售商品'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(product => (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="aspect-square bg-muted relative">
                  {product.cover_image_url ? (
                    <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {product.type === 'book' ? '📖' : '📦'}
                    </div>
                  )}
                  {product.status === 'in_trade' && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-accent text-accent-foreground text-xs">交易中</Badge>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1.5">{product.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">¥{product.price}</span>
                    {CONDITIONS[product.condition] && (
                      <span className="text-xs text-muted-foreground">{CONDITIONS[product.condition]}</span>
                    )}
                  </div>
                  {product.grade && product.grade.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {product.grade.slice(0, 2).map(g => (
                        <Badge key={g} variant="outline" className="text-xs px-1.5 py-0">{g}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
