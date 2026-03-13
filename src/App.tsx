import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

// Placeholder pages - will be built in later batches
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground">即将上线，敬请期待</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<PlaceholderPage title="商品详情" />} />
              <Route path="/publish" element={<PlaceholderPage title="发布物品" />} />
              <Route path="/cart" element={<PlaceholderPage title="购物车" />} />
              <Route path="/orders" element={<PlaceholderPage title="订单" />} />
              <Route path="/my-products" element={<PlaceholderPage title="我的发布" />} />
              <Route path="/store/:userId" element={<PlaceholderPage title="店铺" />} />
              <Route path="/profile" element={<PlaceholderPage title="个人中心" />} />
            </Route>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/tianadmin" element={<PlaceholderPage title="管理后台" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
