import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, ShoppingCart, ClipboardList, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/publish', label: '发布', icon: Plus },
  { path: '/cart', label: '购物车', icon: ShoppingCart },
  { path: '/orders', label: '订单', icon: ClipboardList },
];

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showMyMenu, setShowMyMenu] = useState(false);

  const handleNavClick = (path: string) => {
    if (!user && path !== '/') {
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="飞呀飞" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">飞呀飞</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">社区二手交易平台</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* My dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (!user) {
                  navigate('/auth', { state: { from: location.pathname } });
                  return;
                }
                setShowMyMenu(!showMyMenu);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors",
                ['/profile', '/my-products'].includes(location.pathname) || location.pathname.startsWith('/store')
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <User className="h-4 w-4" />
              <span>{user ? (profile?.nickname || '我的') : '登录/注册'}</span>
              {user && <ChevronDown className="h-3 w-3" />}
            </button>

            {showMyMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMyMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                  <button
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                    onClick={() => { setShowMyMenu(false); navigate('/my-products'); }}
                  >
                    我的发布
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                    onClick={() => { setShowMyMenu(false); navigate(`/store/${user!.id}`); }}
                  >
                    我的店铺
                  </button>
                   <button
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                    onClick={() => { setShowMyMenu(false); navigate('/profile'); }}
                  >
                    个人中心
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    className="w-full px-4 py-2.5 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    onClick={async () => { setShowMyMenu(false); await signOut(); navigate('/'); }}
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
