import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, RotateCcw, Plus, Store, ShoppingCart, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const GRADES = ['幼儿园', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一'];
const SEMESTERS = ['上学期', '下学期'];
const CONDITIONS: { value: string; label: string; desc: string }[] = [
  { value: 'brand_new', label: '全新', desc: '未使用，包装完好' },
  { value: 'almost_new', label: '几乎全新', desc: '仅翻阅，无笔记折痕' },
  { value: 'slightly_used', label: '轻微使用', desc: '少量笔记，整体良好' },
  { value: 'used', label: '使用过', desc: '有笔记标注，不影响阅读' },
  { value: 'heavily_used', label: '大量使用', desc: '较多笔记磨损，可正常使用' },
];

interface Product {
  id: string;
  seller_id: string;
  type: 'book' | 'other';
  name: string;
  author: string | null;
  cover_image_url: string | null;
  grade: string[] | null;
  semester: string | null;
  condition: string;
  price: number;
  school: string | null;
  status: string;
  created_at: string;
  view_count: number;
  description: string | null;
  book_tag: string | null;
}

interface SellerProfile {
  user_id: string;
  nickname: string;
  phone: string;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const conditionLabel = (val: string) => CONDITIONS.find(c => c.value === val)?.label || val;

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterCommunity, setFilterCommunity] = useState<string>('all');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerProfile>>({});
  const [schools, setSchools] = useState<string[]>([]);
  const [communities, setCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize filters from profile
  useEffect(() => {
    if (profile) {
      if (profile.school) setFilterSchool(profile.school);
    }
  }, [profile]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      const { data: prods } = await supabase
        .from('products')
        .select('school')
        .in('status', ['on_sale', 'in_trade']);
      if (prods) {
        const uniqueSchools = [...new Set(prods.map(p => p.school).filter(Boolean))] as string[];
        setSchools(uniqueSchools);
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('community')
        .not('community', 'is', null)
        .not('community', 'eq', '');
      if (profs) {
        const uniqueComms = [...new Set(profs.map(p => p.community).filter(Boolean))] as string[];
        setCommunities(uniqueComms);
      }
    };
    loadFilterOptions();
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*')
        .in('status', ['on_sale', 'in_trade'])
        .order('created_at', { ascending: false });

      if (filterType !== 'all') query = query.eq('type', filterType as 'book' | 'other');
      if (filterCondition !== 'all') query = query.eq('condition', filterCondition as any);
      if (filterSchool !== 'all') query = query.eq('school', filterSchool);
      if (filterSemester !== 'all') query = query.eq('semester', filterSemester);
      if (filterGrade !== 'all') query = query.contains('grade', [filterGrade]);

      const { data, error } = await query;
      if (error) {
        console.error('Load products error:', error);
        setProducts([]);
      } else {
        let filtered = data || [];
        if (activeSearch) {
          const s = activeSearch.toLowerCase();
          filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(s) ||
            (p.author && p.author.toLowerCase().includes(s)) ||
            (p.description && p.description.toLowerCase().includes(s))
          );
        }
        setProducts(filtered);

        // Load seller profiles
        const sellerIds = [...new Set(filtered.map(p => p.seller_id))];
        if (sellerIds.length > 0) {
          const { data: sellerData } = await supabase
            .from('profiles')
            .select('user_id, nickname, phone')
            .in('user_id', sellerIds);
          if (sellerData) {
            const map: Record<string, SellerProfile> = {};
            sellerData.forEach(s => { map[s.user_id] = s; });
            setSellers(map);
          }
        }
      }
      setLoading(false);
    };
    loadProducts();
  }, [filterType, filterGrade, filterSemester, filterCondition, filterSchool, activeSearch]);

  const handleSearch = () => {
    setActiveSearch(searchText.trim());
  };

  const handleCancelSearch = () => {
    setSearchText('');
    setActiveSearch('');
  };

  const handleReset = () => {
    setFilterType('all');
    setFilterGrade('all');
    setFilterSemester('all');
    setFilterCondition('all');
    setFilterSchool('all');
    setFilterCommunity('all');
    setSearchText('');
    setActiveSearch('');
  };

  const addToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth', { state: { from: '/' } });
      return;
    }
    const { error } = await supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: productId,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: '该物品已在购物车中', variant: 'destructive' });
      } else {
        toast({ title: '加入购物车失败', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: '已加入购物车 🛒' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Warning banner */}
      <div className="bg-accent/30 border-b border-accent/50 px-4 py-2">
        <p className="text-xs text-accent-foreground text-center">
          ⚠️ 温馨提示：本平台仅提供信息展示，不参与实际交易。请交易双方当面验货，注意交易安全。
        </p>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索书名、作者、描述..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          {activeSearch ? (
            <Button variant="outline" size="sm" onClick={handleCancelSearch} className="shrink-0">
              <X className="h-4 w-4 mr-1" />取消
            </Button>
          ) : (
            <Button size="sm" onClick={handleSearch} className="shrink-0">搜索</Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {schools.length > 0 && (
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs">
                <SelectValue placeholder="学校" />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                <SelectItem value="all">全部学校</SelectItem>
                {schools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-auto min-w-[80px] h-8 text-xs">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="book">书籍</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-auto min-w-[80px] h-8 text-xs">
              <SelectValue placeholder="年级" />
            </SelectTrigger>
            <SelectContent className="max-h-[240px]">
              <SelectItem value="all">全部年级</SelectItem>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-auto min-w-[80px] h-8 text-xs">
              <SelectValue placeholder="学期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学期</SelectItem>
              {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterCondition} onValueChange={setFilterCondition}>
            <SelectTrigger className="w-auto min-w-[80px] h-8 text-xs">
              <SelectValue placeholder="成色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部成色</SelectItem>
              {CONDITIONS.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{c.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>{c.desc}</TooltipContent>
                  </Tooltip>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3 mr-1" />重置
          </Button>
        </div>

        {/* Product list */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border animate-pulse">
                <div className="aspect-[1/1.42] bg-muted rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <img src={logo} alt="飞呀飞" className="h-20 w-20 rounded-2xl mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">暂无物品，快来发布第一件吧！</p>
            <Button onClick={() => navigate(user ? '/publish' : '/auth', { state: { from: '/publish' } })}>
              <Plus className="h-4 w-4 mr-1" />发布物品
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => {
              const seller = sellers[product.seller_id];
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* Cover */}
                  <div className="aspect-[1/1.42] bg-muted relative overflow-hidden">
                    {product.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <div className="text-3xl mb-1">📖</div>
                          <span className="text-xs">{product.type === 'book' ? '书籍' : '物品'}</span>
                        </div>
                      </div>
                    )}
                    {product.status === 'in_trade' && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                          交易中
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-medium text-sm text-foreground line-clamp-1">{product.name}</h3>
                    {product.type === 'book' && product.author && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.author}</p>
                    )}
                    {product.school && (
                      <p className="text-xs text-muted-foreground line-clamp-1">🏫 {product.school}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {product.grade?.map(g => (
                        <Badge key={g} variant="outline" className="text-[10px] px-1.5 py-0">{g}</Badge>
                      ))}
                      {product.semester && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.semester}</Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{conditionLabel(product.condition)}</Badge>

                    {/* Seller info */}
                    {seller && (
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs text-muted-foreground truncate">{seller.nickname}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/store/${product.seller_id}`);
                            }}
                            className="shrink-0"
                          >
                            <Store className="h-3 w-3 text-primary" />
                          </button>
                        </div>
                        <a
                          href={user ? `tel:${seller.phone}` : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              e.preventDefault();
                              navigate('/auth', { state: { from: '/' } });
                            }
                          }}
                          className="text-xs text-muted-foreground flex items-center gap-0.5"
                        >
                          <Phone className="h-3 w-3" />
                          {user ? seller.phone : maskPhone(seller.phone)}
                        </a>
                      </div>
                    )}

                    {/* Price + cart */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-primary font-bold text-sm">¥{product.price}</span>
                      {product.status === 'on_sale' && (
                        <button
                          onClick={(e) => addToCart(product.id, e)}
                          className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
