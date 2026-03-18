import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import POS from "./pages/POS";
import Login from "./pages/Login";
import BackofficeLayout from "./layouts/BackofficeLayout";
import Dashboard from "./pages/backoffice/Dashboard";
import Products from "./pages/backoffice/Products";
import Purchases from "./pages/backoffice/Purchases";
import Transactions from "./pages/backoffice/Transactions";
import Debts from "./pages/backoffice/Debts";
import Expenses from "./pages/backoffice/Expenses";
import Reports from "./pages/backoffice/Reports";
import Settings from "./pages/backoffice/Settings";
import Shipping from "./pages/backoffice/Shipping";
import OwnerPortal from "./pages/OwnerPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerPortal /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'cashier']}><POS /></ProtectedRoute>} />
            <Route path="/backoffice" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><BackofficeLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="debts" element={<Debts />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="shipping" element={<Shipping />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['owner']}><Settings /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
