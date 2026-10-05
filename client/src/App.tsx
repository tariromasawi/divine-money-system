import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Store from "@/pages/store";
import Admin from "@/pages/admin";
import Invest from "@/pages/invest";
import Evolution from "@/pages/evolution";
import Superintelligence from "@/pages/superintelligence";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import MerchantSignup from "@/pages/merchant-signup";
import MerchantDashboard from "@/pages/merchant-dashboard";
import Cards from "@/pages/cards";
import Trade from "@/pages/trade";
import Wallet from "@/pages/wallet";
import About from "@/pages/about";
import EnergyUnits from "@/pages/energy-units";
import { MerchantCTA } from "@/components/merchant-cta";
import { AIAssistant } from "@/components/ai-assistant";
import DivineMusicDefense from "@/components/DivineMusicDefense";
import { DomainLock } from "@/components/DomainLock";
import { useLocation } from "wouter";
import Purchases from "@/pages/purchases";
import ProductFactory from "@/pages/product-factory";
import { Link } from "wouter";
import GlassKitchen from "@/pages/glass-kitchen";
import Operations from "@/pages/operations";
import OrderKitchen from "@/pages/order-kitchen";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/store" component={Store} />
      <Route path="/kitchen" component={GlassKitchen} />
      <Route path="/admin/operations" component={Operations} />
      <Route path="/purchases/:id/kitchen" component={OrderKitchen} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/admin/factory" component={ProductFactory} />
      <Route path="/admin" component={Admin} />
      <Route path="/invest" component={Invest} />
      <Route path="/evolution" component={Evolution} />
      <Route path="/superintelligence" component={Superintelligence} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route path="/merchant-signup" component={MerchantSignup} />
      <Route path="/merchant-dashboard" component={MerchantDashboard} />
      <Route path="/cards" component={Cards} />
      <Route path="/trade" component={Trade} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/about" component={About} />
      <Route path="/energy-units" component={EnergyUnits} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MerchantCTAWrapper() {
  const [location] = useLocation();
  const hiddenPaths = ['/merchant-signup', '/merchant-dashboard', '/admin'];
  if (hiddenPaths.some(path => location.startsWith(path))) {
    return null;
  }
  return <MerchantCTA />;
}

function FactoryContextLink() {
  const [location] = useLocation();
  if (!location.startsWith("/admin") || location.startsWith("/admin/factory")) return null;
  return (
    <Link href="/admin/factory" className="fixed bottom-5 right-5 z-[60] rounded-full border border-amber-700/30 bg-[#f4ead8] px-4 py-3 text-sm font-medium text-[#5c4734] shadow-lg transition-transform hover:-translate-y-0.5">
      Product Factory
    </Link>
  );
}

function AIAssistantWrapper() {
  const [location] = useLocation();
  const hiddenPaths = ['/admin', '/superintelligence'];
  if (hiddenPaths.some(path => location.startsWith(path))) {
    return null;
  }
  return <AIAssistant />;
}

function App() {
  return (
    <DomainLock>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FactoryContextLink />
          <MerchantCTAWrapper />
          <AIAssistantWrapper />
          <DivineMusicDefense />
        </TooltipProvider>
      </QueryClientProvider>
    </DomainLock>
  );
}

export default App;
