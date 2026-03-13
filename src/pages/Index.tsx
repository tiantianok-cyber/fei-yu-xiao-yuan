import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, RotateCcw, Plus, Store, ShoppingCart, Phone, MapPin, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';
import { CitySelector } from '@/components/auth/CitySelector';

const GRADES = ['幼儿园', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'];
const SEMESTERS = ['上学期', '下学期'];
const CONDITIONS: { value: string; label: string }[] = [
  { value: 'brand_new', label: '全新' },
  { value: 'almost_new', label: '九九新' },
  { value: 'slightly_used', label: '九五新' },
  { value: 'used', label: '九成新' },
  { value: 'heavily_used', label: '九成新以下' },
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
  community: string | null;
  school: string | null;
  city: string | null;
  district: string | null;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const conditionLabel = (val: string) => CONDITIONS.find(c => c.value === val)?.label || val;

// Chip component for filter options
const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
      selected
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`}
  >
    {label}
  </button>
);

// Searchable multi-select tag input
const SearchableTagInput: React.FC<{
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ placeholder, options, selected, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options.filter(o => !selected.includes(o));
    return options.filter(o => o.includes(query) && !selected.includes(o));
  }, [options, query, selected]);

  const addItem = (item: string) => {
    onChange([...selected, item]);
    setQuery('');
  };

  const removeItem = (item: string) => {
    onChange(selected.filter(s => s !== item));
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="h-9 text-sm pr-8"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-[160px] overflow-y-auto">
            {filtered.slice(0, 20).map(item => (
              <button
                key={item}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => { e.preventDefault(); addItem(item); }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground"
            >
              {item}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem(item)} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
const FILTER_STORAGE_KEY = 'fei-yu-home-filters';

const loadSavedFilters = () => {
  try {
    const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const saved = useMemo(() => loadSavedFilters(), []);

  // City filter
  const [filterCity, setFilterCity] = useState(saved?.filterCity || '');
  const [filterDistrict, setFilterDistrict] = useState(saved?.filterDistrict || '');
  const [filterProvince, setFilterProvince] = useState(saved?.filterProvince || '');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filterType, setFilterType] = useState<string>(saved?.filterType || 'all');
  const [filterGrade, setFilterGrade] = useState<string>(saved?.filterGrade || 'all');
  const [filterSemester, setFilterSemester] = useState<string>(saved?.filterSemester || 'all');
  const [filterCondition, setFilterCondition] = useState<string>(saved?.filterCondition || 'all');
  const [filterSchools, setFilterSchools] = useState<string[]>(saved?.filterSchools || []);
  const [filterCommunities, setFilterCommunities] = useState<string[]>(saved?.filterCommunities || []);
  const [profileInitialized, setProfileInitialized] = useState(!!saved?.filterProvince);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerProfile>>({});
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [communityOptions, setCommunityOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityUserIds, setCityUserIds] = useState<string[] | null>(null);

  // Initialize from profile (only if no saved filters)
  useEffect(() => {
    if (profileInitialized) return;
    if (profile) {
      if (profile.city) setFilterCity(profile.city);
      if (profile.district) setFilterDistrict(profile.district);
      if (profile.province) setFilterProvince(profile.province);
      setProfileInitialized(true);
    }
  }, [profile, profileInitialized]);

  // Save filters to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      filterProvince, filterCity, filterDistrict,
      filterType, filterGrade, filterSemester, filterCondition,
      filterSchools, filterCommunities,
    }));
  }, [filterProvince, filterCity, filterDistrict, filterType, filterGrade, filterSemester, filterCondition, filterSchools, filterCommunities]);

  // Load users in selected city/district → derive cityUserIds
  useEffect(() => {
    const loadCityUsers = async () => {
      if (!filterProvince) {
        setCityUserIds(null);
        return;
      }
      let query = supabase
        .from('profiles')
        .select('user_id, community, school')
        .eq('province', filterProvince);
      if (filterCity) query = query.eq('city', filterCity);
      if (filterDistrict) query = query.eq('district', filterDistrict);

      const { data } = await query;
      if (data) {
        setCityUserIds(data.map(p => p.user_id));
        const uniqueComms = [...new Set(data.map(p => p.community).filter(Boolean))] as string[];
        setCommunityOptions(uniqueComms);
        const uniqueSchools = [...new Set(data.map(p => p.school).filter(Boolean))] as string[];
        setSchoolOptions(uniqueSchools);
      } else {
        setCityUserIds([]);
        setCommunityOptions([]);
        setSchoolOptions([]);
      }
    };
    loadCityUsers();
  }, [filterProvince, filterCity, filterDistrict]);

  // Load products filtered by city users
  useEffect(() => {
    const loadProducts = async () => {
      // Wait for cityUserIds to resolve if a city is selected
      if (filterProvince && cityUserIds === null) return;

      setLoading(true);

      // If city is selected but no users in that city, show empty
      if (cityUserIds !== null && cityUserIds.length === 0) {
        setProducts([]);
        setSellers({});
        setLoading(false);
        return;
      }

      let query = supabase
        .from('products')
        .select('*')
        .in('status', ['on_sale', 'in_trade'])
        .order('created_at', { ascending: false });

      // Filter by city users
      if (cityUserIds !== null && cityUserIds.length > 0) {
        query = query.in('seller_id', cityUserIds);
      }

      if (filterType !== 'all') query = query.eq('type', filterType as 'book' | 'other');
      if (filterType !== 'other' && filterCondition !== 'all') query = query.eq('condition', filterCondition as any);
      if (filterSchools.length > 0) query = query.in('school', filterSchools);
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
        // Also filter by selected communities (via seller profile)
        if (filterCommunities.length > 0) {
          const { data: commProfiles } = await supabase
            .from('profiles')
            .select('user_id')
            .in('community', filterCommunities);
          if (commProfiles) {
            const commUserIds = new Set(commProfiles.map(p => p.user_id));
            filtered = filtered.filter(p => commUserIds.has(p.seller_id));
          }
        }
        setProducts(filtered);

        // Load seller profiles
        const sellerIds = [...new Set(filtered.map(p => p.seller_id))];
        if (sellerIds.length > 0) {
          const { data: sellerData } = await supabase
            .from('profiles')
            .select('user_id, nickname, phone, community, school, city, district')
            .in('user_id', sellerIds);
          if (sellerData) {
            const map: Record<string, SellerProfile> = {};
            sellerData.forEach(s => { map[s.user_id] = s as SellerProfile; });
            setSellers(map);
          }
        } else {
          setSellers({});
        }
      }
      setLoading(false);
    };
    loadProducts();
  }, [filterType, filterGrade, filterSemester, filterCondition, filterSchools, filterCommunities, activeSearch, cityUserIds]);

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
    setFilterSchools([]);
    setFilterCommunities([]);
    setSearchText('');
    setActiveSearch('');
    setFilterProvince('');
    setFilterCity('');
    setFilterDistrict('');
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
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

  const cityLabel = useMemo(() => {
    if (filterDistrict) return filterDistrict;
    if (filterCity) return filterCity;
    if (filterProvince) return filterProvince;
    return '选择城市';
  }, [filterProvince, filterCity, filterDistrict]);

  const isBookType = filterType !== 'other';

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Warning banner */}
      <div className="bg-accent/30 border-b border-accent/50 px-4 py-2">
        <p className="text-xs text-accent-foreground text-center">
          ⚠️ 本平台仅提供信息展示，不参与实际交易。交易风险由双方自担，建议在公共场所线下交易。
        </p>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-3">
        {/* Row 1: City selector + Search */}
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0 h-10 text-sm gap-1 max-w-[200px]">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{cityLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-4" align="start">
              <CitySelector
                province={filterProvince}
                city={filterCity}
                district={filterDistrict}
                onChange={(p, c, d) => {
                  setFilterProvince(p);
                  setFilterCity(c);
                  setFilterDistrict(d);
                }}
                showLocatePrompt={!filterProvince}
              />
            </PopoverContent>
          </Popover>

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

        {/* Filter panel */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          {/* 类型 */}
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">类型</span>
            <div className="flex flex-wrap gap-2">
              <Chip label="全部" selected={filterType === 'all'} onClick={() => setFilterType('all')} />
              <Chip label="书籍" selected={filterType === 'book'} onClick={() => setFilterType('book')} />
              <Chip label="其他" selected={filterType === 'other'} onClick={() => { setFilterType('other'); setFilterCondition('all'); }} />
            </div>
          </div>

          {/* 小区 + 学校 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">小区</span>
              <SearchableTagInput
                placeholder="搜索小区..."
                options={communityOptions}
                selected={filterCommunities}
                onChange={setFilterCommunities}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">学校</span>
              <SearchableTagInput
                placeholder="搜索学校..."
                options={schoolOptions}
                selected={filterSchools}
                onChange={setFilterSchools}
              />
            </div>
          </div>

          {/* 年级 */}
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">年级</span>
            <div className="flex flex-wrap gap-2">
              <Chip label="全部" selected={filterGrade === 'all'} onClick={() => setFilterGrade('all')} />
              {GRADES.map(g => (
                <Chip key={g} label={g} selected={filterGrade === g} onClick={() => setFilterGrade(g)} />
              ))}
            </div>
          </div>

          {/* 学期 */}
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">学期</span>
            <div className="flex flex-wrap gap-2">
              <Chip label="全部" selected={filterSemester === 'all'} onClick={() => setFilterSemester('all')} />
              {SEMESTERS.map(s => (
                <Chip key={s} label={s} selected={filterSemester === s} onClick={() => setFilterSemester(s)} />
              ))}
            </div>
          </div>

          {/* 成色 - only when not "other" type */}
          {isBookType && (
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">成色</span>
              <div className="flex flex-wrap gap-2">
                <Chip label="全部" selected={filterCondition === 'all'} onClick={() => setFilterCondition('all')} />
                {CONDITIONS.map(c => (
                  <Chip key={c.value} label={c.label} selected={filterCondition === c.value} onClick={() => setFilterCondition(c.value)} />
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <button onClick={handleReset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />重置筛选
          </button>
        </div>

        {/* Product list */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border animate-pulse flex">
                <div className="w-24 h-32 bg-muted rounded-l-xl shrink-0" />
                <div className="p-2.5 space-y-2 flex-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => {
              const seller = sellers[product.seller_id];
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
                        <div className="text-2xl">📖</div>
                      </div>
                    )}
                    {product.status === 'in_trade' && (
                      <div className="absolute top-1 left-1">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent text-accent-foreground">交易中</Badge>
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
                      {product.type === 'book' && (
                        <Badge variant="secondary" className="text-[10px]">{conditionLabel(product.condition)}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-bold text-sm">¥{product.price}</span>
                      <div className="flex items-center gap-1.5">
                        {seller && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {seller.nickname}{(seller.city || seller.district) && ` | ${[seller.city, seller.district].filter(Boolean).join('')}`}
                          </span>
                        )}
                        {product.status === 'on_sale' && (
                          <button
                            onClick={(e) => addToCart(product.id, e)}
                            className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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
