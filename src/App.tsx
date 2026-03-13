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
import PublishPage from "./pages/PublishPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import MyProductsPage from "./pages/MyProductsPage";
import ProfilePage from "./pages/ProfilePage";
import StorePage from "./pages/StorePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";


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
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/publish" element={<PublishPage />} />
              <Route path="/publish/:productId" element={<PublishPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/my-products" element={<MyProductsPage />} />
              <Route path="/store/:userId" element={<StorePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/tianadmin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
