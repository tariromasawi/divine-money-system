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
import { MerchantCTA } from "@/components/merchant-cta";
import { AIAssistant } from "@/components/ai-assistant";
import { useLocation } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/store" component={Store} />
      <Route path="/admin" component={Admin} />
      <Route path="/invest" component={Invest} />
      <Route path="/evolution" component={Evolution} />
      <Route path="/superintelligence" component={Superintelligence} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route path="/merchant-signup" component={MerchantSignup} />
      <Route path="/merchant-dashboard" component={MerchantDashboard} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <MerchantCTAWrapper />
        <AIAssistantWrapper />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
