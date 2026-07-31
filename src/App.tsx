  import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import { AuthProvider } from "@/contexts/AuthContext";
  import { ProtectedRoute } from "@/components/ProtectedRoute";
  import { PERMISSIONS } from "@/config/permissions";
  import POS from "./pages/POS";
  import Login from "./pages/Login";
  import BackofficeLayout from "./layouts/BackofficeLayout";
  import Dashboard from "./pages/backoffice/Dashboard";
  import Products from "./pages/backoffice/Products";
  import ProductClassification from "./pages/backoffice/ProductClassification";
  import Purchases from "./pages/backoffice/Purchases";
  import Transactions from "./pages/backoffice/Transactions";
  import Customers from "./pages/backoffice/Customers";
  import Expenses from "./pages/backoffice/Expenses";
  import Reports from "./pages/backoffice/Reports";
  import Settings from "./pages/backoffice/Settings";
  import Shipping from "./pages/backoffice/Shipping";
  import OwnerPortal from "./pages/OwnerPortal";
  import NotFound from "./pages/NotFound";
  import Attendance from "./pages/backoffice/Attendance";
  import PayrollPage from "./pages/backoffice/Payroll";
  import Evaluation from "./pages/backoffice/Evaluation";
  import EmployeesPage from "./pages/backoffice/Employees";

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
              <Route path="/owner" element={<ProtectedRoute allowedRoles={PERMISSIONS.ownerPortal}><OwnerPortal /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute allowedRoles={PERMISSIONS.pos}><POS /></ProtectedRoute>} />
              <Route path="/backoffice" element={<ProtectedRoute allowedRoles={PERMISSIONS.dashboard}><BackofficeLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/categories-brands" element={<ProductClassification />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="customers" element={<Customers />} />
                <Route path="expenses" element={<ProtectedRoute allowedRoles={PERMISSIONS.expenses}><Expenses /></ProtectedRoute>} />
                <Route path="shipping" element={<Shipping />} />
                <Route path="sdm/attendance" element={<Attendance />} />
                <Route path="sdm/payroll" element={<PayrollPage />} />
                <Route path="sdm/evaluation" element={<Evaluation />} />
                <Route path="sdm/employees" element={<EmployeesPage />} />
                <Route path="reports" element={<ProtectedRoute allowedRoles={PERMISSIONS.reports}><Reports /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute allowedRoles={PERMISSIONS.settings}><Settings /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  export default App;
