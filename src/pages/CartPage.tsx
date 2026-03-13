import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CartProduct {
  cart_id: string;
  product_id: string;
  name: string;
  price: number;
  cover_image_url: string | null;
  status: string;
  seller_id: string;
  type: string;
  school: string | null;
  grade: string[] | null;
  semester: string | null;
  description: string | null;
}

interface SellerInfo {
  user_id: string;
  nickname: string;
  phone: string;
  community: string | null;
  school: string | null;
}

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CartProduct[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCart = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cartData } = await supabase
      .from('cart_items')
      .select('id, product_id')
      .eq('user_id', user.id);

    if (!cartData || cartData.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const productIds = cartData.map(c => c.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, cover_image_url, status, seller_id, type, school, grade, semester, description')
      .in('id', productIds);

    if (products) {
      const cartMap = new Map(cartData.map(c => [c.product_id, c.id]));
      const cartProducts: CartProduct[] = products.map(p => ({
        cart_id: cartMap.get(p.id)!,
        product_id: p.id,
        name: p.name,
        price: p.price,
        cover_image_url: p.cover_image_url,
        status: p.status,
        seller_id: p.seller_id,
        type: p.type,
        school: p.school,
        grade: p.grade,
        semester: p.semester,
        description: p.description,
      }));
      setItems(cartProducts);

      const sellerIds = [...new Set(cartProducts.map(p => p.seller_id))];
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('user_id, nickname, phone, community, school')
        .in('user_id', sellerIds);
      if (sellerData) {
        const map: Record<string, SellerInfo> = {};
        sellerData.forEach(s => { map[s.user_id] = s; });
        setSellers(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadCart(); }, [user]);

  const groupedBySeller = useMemo(() => {
    const groups: Record<string, CartProduct[]> = {};
    items.forEach(item => {
      if (!groups[item.seller_id]) groups[item.seller_id] = [];
      groups[item.seller_id].push(item);
    });
    return groups;
  }, [items]);

  const toggleSelect = (cartId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cartId)) next.delete(cartId);
      else next.add(cartId);
      return next;
    });
  };

  const toggleSellerGroup = (sellerId: string) => {
    const groupItems = groupedBySeller[sellerId] || [];
    const allSelected = groupItems.every(i => selected.has(i.cart_id));
    setSelected(prev => {
      const next = new Set(prev);
      groupItems.forEach(i => {
        if (allSelected) next.delete(i.cart_id);
        else next.add(i.cart_id);
      });
      return next;
    });
  };

  const removeItem = async (cartId: string) => {
    await supabase.from('cart_items').delete().eq('id', cartId);
    setItems(prev => prev.filter(i => i.cart_id !== cartId));
    setSelected(prev => { const n = new Set(prev); n.delete(cartId); return n; });
    toast({ title: '已移除' });
  };

  const selectedItems = items.filter(i => selected.has(i.cart_id));
  const totalPrice = selectedItems.reduce((sum, i) => sum + i.price, 0);

  const selectedBySeller = useMemo(() => {
    const groups: Record<string, CartProduct[]> = {};
    selectedItems.forEach(item => {
      if (!groups[item.seller_id]) groups[item.seller_id] = [];
      groups[item.seller_id].push(item);
    });
    return groups;
  }, [selectedItems]);

  const handleConfirmPurchase = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      for (const [sellerId, sellerItems] of Object.entries(selectedBySeller)) {
        const unavailable = sellerItems.filter(i => i.status !== 'on_sale');
        if (unavailable.length > 0) {
          toast({ title: `"${unavailable[0].name}" 已不可购买`, variant: 'destructive' });
          setSubmitting(false);
          setConfirmOpen(false);
          loadCart();
          return;
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({ buyer_id: user.id, seller_id: sellerId })
          .select('id')
          .single();

        if (orderError || !order) {
          toast({ title: '创建订单失败', variant: 'destructive' });
          setSubmitting(false);
          return;
        }

        const orderItems = sellerItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          price_at_purchase: item.price,
        }));
        await supabase.from('order_items').insert(orderItems);

        await supabase
          .from('products')
          .update({ status: 'in_trade' as any })
          .in('id', sellerItems.map(i => i.product_id));

        await supabase
          .from('cart_items')
          .delete()
          .in('id', sellerItems.map(i => i.cart_id));
      }

      toast({ title: '下单成功 🎉' });
      setConfirmOpen(false);
      setSelected(new Set());
      loadCart();
      navigate('/orders');
    } catch {
      toast({ title: '操作失败，请重试', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const formatItemMeta = (item: CartProduct) => {
    const parts: string[] = [];
    if (item.school) parts.push(item.school);
    if (item.grade?.length) parts.push(item.grade.join('、'));
    if (item.semester) parts.push(item.semester);
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-foreground mb-4">购物车</h1>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-[90px] bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 pb-24">
      <h1 className="text-lg font-semibold text-foreground mb-4">
        购物车 {items.length > 0 && <span className="text-muted-foreground font-normal">({items.length})</span>}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">购物车是空的</p>
          <Button onClick={() => navigate('/')}>去逛逛</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySeller).map(([sellerId, sellerItems]) => {
            const seller = sellers[sellerId];
            const allSelected = sellerItems.every(i => selected.has(i.cart_id));
            return (
              <div key={sellerId} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Seller header */}
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSellerGroup(sellerId)}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {seller?.nickname || '卖家'}
                    </span>
                    {seller?.community && (
                      <span className="text-xs text-muted-foreground">· {seller.community}</span>
                    )}
                    {seller?.phone && (
                      <span className="text-xs text-muted-foreground">· {seller.phone}</span>
                    )}
                    {seller && (
                      <button
                        onClick={() => navigate(`/store/${sellerId}`)}
                        className="text-xs text-primary hover:underline ml-auto"
                      >
                        进入店铺
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-border">
                  {sellerItems.map(item => {
                    const meta = formatItemMeta(item);
                    return (
                      <div key={item.cart_id} className="px-4 py-3 flex items-start gap-3">
                        <Checkbox
                          className="mt-1"
                          checked={selected.has(item.cart_id)}
                          onCheckedChange={() => toggleSelect(item.cart_id)}
                        />
                        <div
                          className="w-14 h-[78px] bg-muted rounded-lg overflow-hidden shrink-0 cursor-pointer"
                          onClick={() => navigate(`/product/${item.product_id}`)}
                        >
                          {item.cover_image_url ? (
                            <img src={item.cover_image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                          {meta && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meta}</p>
                          )}
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                          <p className="text-primary font-bold text-sm mt-1">¥{item.price}</p>
                          {item.status !== 'on_sale' && (
                            <span className="text-xs text-destructive">已下架或交易中</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.cart_id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom action bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 md:max-w-2xl md:mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">已选 {selectedItems.length} 件</span>
              <span className="text-primary font-bold text-lg ml-3">¥{totalPrice.toFixed(2)}</span>
            </div>
            <Button
              disabled={selectedItems.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              确认购买
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription>请核实以下信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Warning */}
            <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-accent-foreground">
                <p className="font-medium mb-1">线下交易风险提示</p>
                <p className="text-xs">本平台仅提供信息展示，不参与实际交易。建议在公共场所进行面对面交易，当面验货后再付款。交易风险由双方自行承担。</p>
              </div>
            </div>

            {/* Buyer info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">买家信息</p>
              <p className="text-sm font-medium text-foreground">{profile?.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {[profile?.community, profile?.phone].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Orders by seller */}
            {Object.entries(selectedBySeller).map(([sellerId, sellerItems]) => {
              const seller = sellers[sellerId];
              const groupTotal = sellerItems.reduce((s, i) => s + i.price, 0);
              return (
                <div key={sellerId} className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border">
                    <p className="text-sm font-medium">{seller?.nickname || '卖家'}</p>
                    <p className="text-xs text-muted-foreground">
                      {[seller?.community, seller?.phone].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {sellerItems.map(item => (
                      <div key={item.product_id} className="px-3 py-2 flex justify-between text-sm">
                        <span className="text-foreground line-clamp-1">{item.name}</span>
                        <span className="text-primary font-medium shrink-0 ml-2">¥{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 bg-muted/30 border-t border-border flex justify-between text-sm">
                    <span className="text-muted-foreground">小计</span>
                    <span className="text-primary font-bold">¥{groupTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-medium text-foreground">合计</span>
              <span className="text-primary font-bold text-lg">¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button onClick={handleConfirmPurchase} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认下单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CartPage;