import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppShell } from "./components/ui/app-shell";

// Lazy loading pages for better initial performance
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateTransaction = lazy(() => import("./pages/CreateTransaction"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SelectUserType = lazy(() => import("./pages/SelectUserType"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Terms"));
const WalletManagement = lazy(() => import("./pages/WalletManagement"));
const Messaging = lazy(() => import("./pages/Messaging"));
const IdentityVerification = lazy(() => import("./pages/IdentityVerification"));
const AdvancedPayment = lazy(() => import("./pages/AdvancedPayment"));
const WalletID = lazy(() => import("./pages/WalletID"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const CommissionStats = lazy(() => import("./pages/admin/CommissionStats"));
const DisputeManagement = lazy(() => import("./pages/admin/DisputeManagement"));
const NotificationManagement = lazy(() => import("./pages/admin/NotificationManagement"));
const ProductManagement = lazy(() => import("./pages/admin/ProductManagement"));
const SettingsManagement = lazy(() => import("./pages/admin/SettingsManagement"));
const TransactionDetails = lazy(() => import("./pages/admin/TransactionDetails"));
const TransactionManagement = lazy(() => import("./pages/admin/TransactionManagement"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background font-arabic">
    <div className="text-center">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">جاري تحميل الصفحة...</p>
    </div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/create-transaction" component={CreateTransaction} />
        <Route path="/products" component={Products} />
        <Route path="/product/:type/:id" component={ProductDetail} />
        <Route path="/select-user-type" component={SelectUserType} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={UserManagement} />
        <Route path="/admin/users/:id" component={UserDetails} />
        <Route path="/admin/transactions" component={TransactionManagement} />
        <Route path="/admin/transactions/:id" component={TransactionDetails} />
        <Route path="/admin/disputes" component={DisputeManagement} />
        <Route path="/admin/notifications" component={NotificationManagement} />
        <Route path="/admin/products" component={ProductManagement} />
        <Route path="/admin/commissions" component={CommissionStats} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/settings" component={SettingsManagement} />
        <Route path="/faq" component={FAQ} />
        <Route path="/terms" component={Terms} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/verify" component={IdentityVerification} />
        <Route path="/wallet" component={WalletManagement} />
        <Route path="/transactions" component={WalletManagement} />
        <Route path="/withdraw" component={WalletManagement} />
        <Route path="/trusted-seller" component={Profile} />
        <Route path="/payment" component={AdvancedPayment} />
        <Route path="/wallet-id" component={WalletID} />
        <Route path="/business" component={BusinessDashboard} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppShell>
            <Router />
          </AppShell>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
