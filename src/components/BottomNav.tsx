import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, ClipboardList, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/publish', label: '发布', icon: Plus },
  { path: '/cart', label: '购物车', icon: ShoppingCart },
  { path: '/orders', label: '订单', icon: ClipboardList },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showMyMenu, setShowMyMenu] = useState(false);

  const handleNavClick = (path: string) => {
    if (!user && path !== '/') {
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    navigate(path);
  };

  return (
    <>
      {showMyMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMyMenu(false)}>
          <div
            className="absolute bottom-16 right-2 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
              onClick={() => { setShowMyMenu(false); handleNavClick('/my-products'); }}
            >
              我的发布
            </button>
            <button
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
              onClick={() => { setShowMyMenu(false); handleNavClick(user ? `/store/${user.id}` : '/auth'); }}
            >
              我的店铺
            </button>
            <button
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
              onClick={() => { setShowMyMenu(false); handleNavClick('/profile'); }}
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
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              if (!user) {
                navigate('/auth', { state: { from: location.pathname } });
                return;
              }
              setShowMyMenu(!showMyMenu);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              ['/profile', '/my-products'].includes(location.pathname) || location.pathname.startsWith('/store')
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">我的</span>
          </button>
        </div>
      </nav>
    </>
  );
};
