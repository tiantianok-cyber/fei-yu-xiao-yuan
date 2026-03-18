import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Tab = 'all' | 'bought' | 'sold';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  trading: { label: '交易中', variant: 'default' },
  completed: { label: '已完成', variant: 'secondary' },
  cancelled: { label: '已取消', variant: 'outline' },
};

interface OrderItem {
  product_id: string;
  price_at_purchase: number;
  product_name?: string;
  product_cover?: string | null;
}

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  created_at: string;
  buyer_nickname?: string;
  seller_nickname?: string;
  buyer_phone?: string;
  seller_phone?: string;
  items: OrderItem[];
  has_reviewed?: boolean;
}

const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`}
  >
    {label}
  </button>
);

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Review dialog state (disabled)
  // const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  // const [reviewRole, setReviewRole] = useState<'buyer' | 'seller'>('buyer');
  // const [reviewTarget, setReviewTarget] = useState<string>('');
  // const [cooperationScore, setCooperationScore] = useState(5);
  // const [descriptionMatchScore, setDescriptionMatchScore] = useState(5);
  // const [reviewContent, setReviewContent] = useState('');
  // const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Cancel / confirm dialog
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'confirm' | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (tab === 'bought') query = query.eq('buyer_id', user.id);
    else if (tab === 'sold') query = query.eq('seller_id', user.id);
    // 'all' shows both, RLS handles this

    const { data: ordersData } = await query;
    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Load order items with product info
    const orderIds = ordersData.map(o => o.id);
    const { data: orderItemsData } = await supabase
      .from('order_items')
      .select('order_id, product_id, price_at_purchase')
      .in('order_id', orderIds);

    // Load product names
    const productIds = [...new Set((orderItemsData || []).map(oi => oi.product_id))];
    const { data: productsData } = productIds.length > 0
      ? await supabase.from('products').select('id, name, cover_image_url').in('id', productIds)
      : { data: [] };
    const productMap = new Map((productsData || []).map(p => [p.id, p]));

    // Load profiles for buyer/seller
    const userIds = [...new Set(ordersData.flatMap(o => [o.buyer_id, o.seller_id]))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, nickname, phone')
      .in('user_id', userIds);
    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    // Reviews disabled
    const reviewedOrderIds = new Set<string>();

    const enrichedOrders: Order[] = ordersData.map(o => {
      const buyerProfile = profileMap.get(o.buyer_id);
      const sellerProfile = profileMap.get(o.seller_id);
      const oItems = (orderItemsData || [])
        .filter(oi => oi.order_id === o.id)
        .map(oi => {
          const prod = productMap.get(oi.product_id);
          return {
            product_id: oi.product_id,
            price_at_purchase: oi.price_at_purchase,
            product_name: prod?.name,
            product_cover: prod?.cover_image_url,
          };
        });
      return {
        ...o,
        buyer_nickname: buyerProfile?.nickname,
        seller_nickname: sellerProfile?.nickname,
        buyer_phone: buyerProfile?.phone,
        seller_phone: sellerProfile?.phone,
        items: oItems,
        has_reviewed: reviewedOrderIds.has(o.id),
      };
    });

    setOrders(enrichedOrders);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user, tab]);

  const handleAction = async () => {
    if (!actionOrderId || !actionType || !user) return;
    setActionSubmitting(true);

    if (actionType === 'confirm') {
      // Buyer confirms receipt → complete order; product status is synced in backend
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' as any, completed_at: new Date().toISOString() })
        .eq('id', actionOrderId);

      if (error) {
        toast({ title: '操作失败', variant: 'destructive' });
      } else {
        toast({ title: '已确认收货' });
      }
    } else if (actionType === 'cancel') {
      // Cancel order; product status is synced in backend
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' as any, cancelled_at: new Date().toISOString() })
        .eq('id', actionOrderId);

      if (error) {
        toast({ title: '取消失败', variant: 'destructive' });
      } else {
        toast({ title: '已取消订单' });
      }
    }

    setActionSubmitting(false);
    setActionOrderId(null);
    setActionType(null);
    loadOrders();
  };

  const openReview = (order: Order) => {
    const isBuyer = order.buyer_id === user?.id;
    setReviewOrderId(order.id);
    setReviewRole(isBuyer ? 'buyer' : 'seller');
    setReviewTarget(isBuyer ? order.seller_id : order.buyer_id);
    setCooperationScore(5);
    setDescriptionMatchScore(5);
    setReviewContent('');
  };

  const handleReviewSubmit = async () => {
    if (!reviewOrderId || !user) return;
    setReviewSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      order_id: reviewOrderId,
      reviewer_id: user.id,
      reviewee_id: reviewTarget,
      reviewer_role: reviewRole,
      cooperation_score: cooperationScore,
      description_match_score: reviewRole === 'buyer' ? descriptionMatchScore : null,
      content: reviewContent.trim() || null,
    });

    if (error) {
      toast({ title: '评价失败', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '评价成功' });
    }

    setReviewSubmitting(false);
    setReviewOrderId(null);
    loadOrders();
  };

  const ScoreSelector: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-xl transition-colors ${n <= value ? 'text-yellow-500' : 'text-muted'}`}
          >
            ★
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2 self-center">{value}分</span>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">我的订单</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Chip label="全部" selected={tab === 'all'} onClick={() => setTab('all')} />
        <Chip label="我买到的" selected={tab === 'bought'} onClick={() => setTab('bought')} />
        <Chip label="我卖出的" selected={tab === 'sold'} onClick={() => setTab('sold')} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-12 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">暂无订单</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isBuyer = order.buyer_id === user?.id;
            const isSeller = order.seller_id === user?.id;
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, variant: 'outline' as const };
            const total = order.items.reduce((s, i) => s + i.price_at_purchase, 0);

            return (
              <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Order header */}
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isBuyer ? `卖家: ${order.seller_nickname}` : `买家: ${order.buyer_nickname}`}
                  </span>
                </div>

                {/* Order items */}
                <div className="divide-y divide-border">
                  {order.items.map(item => (
                    <div
                      key={item.product_id}
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/product/${item.product_id}`)}
                    >
                      <div className="w-12 h-[68px] bg-muted rounded-lg overflow-hidden shrink-0">
                        {item.product_cover ? (
                          <img src={item.product_cover} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">{item.product_name || '未知商品'}</p>
                      </div>
                      <span className="text-sm text-primary font-medium shrink-0">¥{item.price_at_purchase}</span>
                    </div>
                  ))}
                </div>

                {/* Footer with total and actions */}
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">合计: </span>
                    <span className="text-primary font-bold">¥{total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    {/* Trading → buyer can confirm or cancel; seller can cancel */}
                    {order.status === 'trading' && isBuyer && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setActionOrderId(order.id); setActionType('cancel'); }}
                        >
                          取消订单
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setActionOrderId(order.id); setActionType('confirm'); }}
                        >
                          确认收货
                        </Button>
                      </>
                    )}
                    {order.status === 'trading' && isSeller && !isBuyer && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setActionOrderId(order.id); setActionType('cancel'); }}
                        >
                          取消订单
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setActionOrderId(order.id); setActionType('confirm'); }}
                        >
                          交易已完成
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel/Confirm dialog */}
      <Dialog open={!!actionOrderId} onOpenChange={(open) => { if (!open) { setActionOrderId(null); setActionType(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionType === 'cancel' ? '取消订单' : '确认收货'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {actionType === 'cancel'
              ? '取消后，物品将重新上架。确定取消吗？'
              : '确认已收到物品并完成交易？'}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionOrderId(null); setActionType(null); }}>
              返回
            </Button>
            <Button
              variant={actionType === 'cancel' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={actionSubmitting}
            >
              {actionSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'cancel' ? '确认取消' : '确认收货'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog disabled */}
    </div>
  );
};

export default OrdersPage;
