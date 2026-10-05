import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Compass, LoaderCircle, Minus, PackageCheck, Plus, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { CartItem, Product } from "@shared/schema";

type StoreProduct = Product & { personalizationFields?: string[]; dispatchReady?: boolean };
type CartLine = CartItem & { product: StoreProduct };
const SESSION_ID = (() => {
  if (typeof window === "undefined") return "";
  let value = localStorage.getItem("masowe_session_id");
  if (!value) {
    value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("masowe_session_id", value);
  }
  return value;
})();

export default function Store() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [personalization, setPersonalization] = useState<Record<string, Record<string, string>>>({});
  const [checkoutError, setCheckoutError] = useState("");
  const productsQuery = useQuery<StoreProduct[]>({ queryKey: ["/api/products"] });
  const commerceStatus = useQuery<{
    liveCheckoutEnabled: false;
    testCheckoutEnabled: boolean;
    emailEnabled: boolean;
    refundExecutionEnabled: false;
  }>({ queryKey: ["/api/commerce/status"] });
  const cartQuery = useQuery<CartLine[]>({
    queryKey: ["/api/cart"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/cart", { headers: { "x-session-id": SESSION_ID }, credentials: "include" });
      if (response.status === 401) return [];
      if (!response.ok) throw new Error("Cart unavailable");
      return response.json();
    },
  });
  const products = productsQuery.data ?? [];
  const cartItems = cartQuery.data ?? [];
  const sortedProducts = useMemo(() => [...products].sort((a, b) => Number(b.price) - Number(a.price)), [products]);
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": SESSION_ID },
        credentials: "include",
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Could not add product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart", description: "This product is marked ready by the factory." });
    },
    onError: (error: Error) => toast({ title: "Could not add product", description: error.message, variant: "destructive" }),
  });
  const updateCart = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) return apiRequest("DELETE", `/api/cart/${encodeURIComponent(id)}`);
      return apiRequest("PATCH", `/api/cart/${encodeURIComponent(id)}`, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
    onError: (error: Error) => toast({ title: "Cart could not be updated", description: error.message, variant: "destructive" }),
  });
  const needsFields = cartItems.flatMap((item) => (item.product.personalizationFields ?? []).map((field) => ({ productId: item.product.id, field })));
  const missingFields = needsFields.filter(({ productId, field }) => !personalization[productId]?.[field]?.trim());
  const cartReady = cartItems.every((item) => item.product.dispatchReady === true);
  const checkout = useMutation({
    mutationFn: async () => {
      setCheckoutError("");
      if (!isAuthenticated) throw new Error("Sign in before checkout.");
      if (!commerceStatus.data?.testCheckoutEnabled) throw new Error("Test checkout is unavailable. Live payments are not enabled.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter a valid email address for this order.");
      if (!cartReady) throw new Error("Every cart item must be dispatch-ready before checkout.");
      if (missingFields.length) throw new Error("Complete every required personalization field before checkout.");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": SESSION_ID },
        credentials: "include",
        body: JSON.stringify({
          customerEmail: email.trim(),
          customerName: name.trim(),
          personalization: Object.fromEntries(
          cartItems.filter((item) => (item.product.personalizationFields ?? []).length > 0)
            .map((item) => [item.product.id, personalization[item.product.id] ?? {}]),
          ),
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || "Checkout failed.");
      }
      return response.json();
    },
    onSuccess: (result) => {
      if (result.url) window.location.href = result.url;
      else {
        const message = "The checkout service did not return a payment session. Your cart is preserved.";
        setCheckoutError(message);
      }
    },
    onError: (error: Error) => setCheckoutError(error.message),
  });

  return <main className="min-h-[100dvh] bg-[#eee6d8] text-[#433a31]">
    <header className="sticky top-0 z-40 border-b border-[#d9cdbb] bg-[#f6f0e5]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/store" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#68765e] text-[#f4ead8]"><Compass className="h-5 w-5" /></span>
          <span><span className="block font-display text-lg leading-none tracking-wide">Divine Money</span><span className="mt-1 block text-[9px] uppercase tracking-[.2em] text-[#8a785f]">A considered spiritual library</span></span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/kitchen" className="hidden rounded-lg px-3 py-2 text-sm text-[#76634f] hover:bg-[#ebe3d5] md:inline-flex">Glass Kitchen</Link>
          {isAuthenticated ? <Link href="/purchases" className="hidden rounded-lg px-3 py-2 text-sm text-[#76634f] hover:bg-[#ebe3d5] sm:inline-flex">My purchases</Link> : <a href="/api/login" className="hidden rounded-lg px-3 py-2 text-sm text-[#76634f] hover:bg-[#ebe3d5] sm:inline-flex">Sign in</a>}
          {user?.email && <Link href="/admin/factory" className="hidden rounded-lg px-3 py-2 text-sm text-[#76634f] hover:bg-[#ebe3d5] md:inline-flex">Factory</Link>}
          <Button onClick={() => setCartOpen(true)} className="relative bg-[#5f7259] text-white hover:bg-[#4d6249]"><ShoppingCart className="mr-2 h-4 w-4" />Cart{cartCount > 0 && <span className="ml-2 rounded-full bg-[#f2e5ce] px-2 py-0.5 text-xs text-[#564534]">{cartCount}</span>}</Button>
        </nav>
      </div>
    </header>
    <section className="relative overflow-hidden border-b border-[#d9cdbb] bg-[#e8dece]">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-[#b9a78c]/30" /><div className="absolute -right-12 -top-12 h-72 w-72 rounded-full border border-[#b9a78c]/30" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] uppercase tracking-[.25em] text-[#738168]">Digital goods, prepared before they are offered</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[.98] tracking-tight sm:text-7xl">Tools for a more <span className="text-[#78856d]">grounded</span> practice.</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#786b5a]">Browse spiritual guides and practical learning materials. Each listed item has passed the current factory readiness checks; the library shows protected access only after the order service confirms fulfilment.</p>
        </motion.div>
        <div className="rounded-2xl border border-[#d2c3ae] bg-[#f3ecdf] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#927d67]">Store status</p>
          <div className="mt-4 flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a704e]" /><div><p className="text-sm font-medium text-[#604d3c]">Live payments are unavailable. No live sales.</p><p className="mt-1 text-sm leading-relaxed text-[#796c5b]">{commerceStatus.isLoading ? "Checking test checkout capability…" : commerceStatus.data?.testCheckoutEnabled ? "Test checkout is enabled by the commerce API." : commerceStatus.isError ? "Test checkout capability could not be confirmed." : "Test checkout is currently unavailable."} Catalogue products shown here are factory-proven ready for dispatch.</p></div></div>
          <p className="mt-3 text-xs leading-relaxed text-[#897965]">Any AI-generated Akashic reading is a creative reflection prompt, not factual prophecy or verified information about a person's past, present, or future.</p>
          <Link href="/purchases" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#5f7259] hover:text-[#42513f]">Already purchased? View your library <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#927d67]">The collection</p><h2 className="mt-2 font-display text-3xl">Ready to explore</h2></div><p className="text-sm text-[#897965]">{products.length} factory-ready {products.length === 1 ? "product" : "products"}</p></div>
      {productsQuery.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-72 animate-pulse rounded-2xl bg-[#e2d8c9]" />)}</div> :
        productsQuery.isError ? <div className="rounded-2xl border border-[#d9b9a7] bg-[#f8eee8] p-6 text-[#805749]"><p className="flex items-center gap-2 font-medium"><CircleAlert className="h-5 w-5" />Catalogue temporarily unavailable</p><p className="mt-2 text-sm">{productsQuery.error instanceof Error ? productsQuery.error.message : "Please try again."}</p><Button variant="outline" onClick={() => productsQuery.refetch()} className="mt-4">Retry</Button></div> :
        !products.length ? <div className="rounded-2xl border border-dashed border-[#cdbda8] bg-[#f6f0e5] p-12 text-center"><PackageCheck className="mx-auto h-8 w-8 text-[#7c896e]" /><h3 className="mt-4 font-display text-2xl">No ready products just yet</h3><p className="mt-2 text-sm text-[#796c5b]">The catalogue will show items after their preparation and QA checks pass.</p></div> :
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{sortedProducts.map((product, index) => <motion.article key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="group flex flex-col overflow-hidden rounded-2xl border border-[#d8cbbb] bg-[#fbf7ef] transition-transform duration-300 hover:-translate-y-1">
          {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-44 w-full object-cover" /> :
            <div className="flex h-44 items-center justify-center bg-[#e8dfcf] text-[#879477]"><div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#abb49b] bg-[#f2ecdf]"><BookOpen className="h-8 w-8" /></div></div>}
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[.16em] text-[#859076]">{product.category || "Digital guide"}</span><span className={`inline-flex items-center gap-1 text-[10px] ${product.dispatchReady === true ? "text-[#65745a]" : "text-[#9a644e]"}`}>{product.dispatchReady === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{product.dispatchReady === true ? "Dispatch ready" : "Not available"}</span></div>
            <h3 className="mt-3 font-display text-xl leading-tight">{product.name}</h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#796c5b]">{product.description || "A practical digital resource for your personal spiritual practice."}</p>
            {(product.personalizationFields?.length ?? 0) > 0 && <p className="mt-3 rounded-lg bg-[#f1eadf] px-3 py-2 text-xs text-[#78664f]">Personalized at checkout: {product.personalizationFields?.join(", ")}</p>}
            <div className="mt-5 flex items-center justify-between border-t border-[#e7ddd0] pt-4"><div><span className="font-display text-2xl">{product.currency ?? "USD"} {Number(product.price).toFixed(2)}</span><p className="mt-1 text-[10px] text-[#988873]">Digital product · protected access</p></div>
              <Button onClick={() => addToCart.mutate(product.id)} disabled={addToCart.isPending || product.dispatchReady !== true} className="bg-[#5f7259] text-white hover:bg-[#4d6249] disabled:opacity-50">{addToCart.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Add</>}</Button>
            </div>
          </div>
        </motion.article>)}</div>}
    </section>

    {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-[#30291f]/40" onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}>
      <aside className="flex h-full w-full max-w-xl flex-col bg-[#f6f0e5] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#d9cdbb] px-5 py-5"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#927d67]">Before checkout</p><h2 className="mt-1 font-display text-2xl">Your cart</h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart" className="rounded-lg p-2 text-[#76634f] hover:bg-[#ebe3d5]"><X className="h-5 w-5" /></button></div>
        {!isAuthenticated ? <div className="m-5 rounded-xl border border-[#d8cbbb] bg-[#fbf7ef] p-5"><p className="text-sm text-[#665a49]">Sign in to manage your cart and access purchases.</p><a href="/api/login" className="mt-4 inline-flex rounded-lg bg-[#5f7259] px-4 py-2.5 text-sm text-white">Sign in</a></div> :
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {cartQuery.isLoading ? <div className="space-y-3">{[1, 2].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-[#e5dccd]" />)}</div> :
              cartItems.length === 0 ? <div className="py-16 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-[#889477]" /><p className="mt-3 text-sm text-[#796c5b]">Your cart is empty.</p></div> :
              <div className="space-y-4">{cartItems.map((item) => <div key={item.id} className="rounded-xl border border-[#dfd3c3] bg-[#fbf7ef] p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{item.product.name}</h3><p className="mt-1 text-sm text-[#796c5b]">{item.product.currency ?? "USD"} {Number(item.product.price).toFixed(2)}</p></div>
                  <button onClick={() => updateCart.mutate({ id: item.id, quantity: 0 })} aria-label={`Remove ${item.product.name}`} className="rounded p-1.5 text-[#9d6550] hover:bg-[#f4e6de]"><Trash2 className="h-4 w-4" /></button></div>
                <div className="mt-3 flex items-center gap-3"><button onClick={() => updateCart.mutate({ id: item.id, quantity: item.quantity - 1 })} aria-label="Decrease quantity" className="rounded-md border border-[#d8cbbb] p-1.5"><Minus className="h-3 w-3" /></button><span className="min-w-5 text-center text-sm">{item.quantity}</span><button onClick={() => updateCart.mutate({ id: item.id, quantity: item.quantity + 1 })} aria-label="Increase quantity" className="rounded-md border border-[#d8cbbb] p-1.5"><Plus className="h-3 w-3" /></button></div>
                {(item.product.personalizationFields ?? []).length > 0 && <div className="mt-4 space-y-3 border-t border-[#e7ddd0] pt-4"><p className="text-xs font-medium text-[#706047]">Required personalization</p>{item.product.personalizationFields?.map((field) => <label key={field} className="block text-xs text-[#796c5b]">{field}<Input value={personalization[item.product.id]?.[field] ?? ""} onChange={(e) => setPersonalization((current) => ({ ...current, [item.product.id]: { ...current[item.product.id], [field]: e.target.value } }))} className="mt-1 border-[#d8cbbb] bg-[#fffdf8]" required /></label>)}</div>}
              </div>)}</div>}
            {!cartItems.length ? null : <div className="mt-6 space-y-3 rounded-xl border border-[#dfd3c3] bg-[#f1eadf] p-4"><h3 className="text-[10px] uppercase tracking-[.18em] text-[#927d67]">Order contact</h3><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="border-[#d8cbbb] bg-[#fffdf8]" /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for order updates" className="border-[#d8cbbb] bg-[#fffdf8]" required /></div>}
          </div>}
        <div className="border-t border-[#d9cdbb] bg-[#f3ecdf] p-5"><div className="flex justify-between text-sm text-[#796c5b]"><span>Order total</span><strong className="text-lg text-[#433a31]">${cartTotal.toFixed(2)}</strong></div>
          <p className="mt-2 text-xs leading-relaxed text-[#897965]">Checkout availability is determined by the payment API. We do not represent payment, delivery, or refund status until the service confirms it.</p>
          {checkoutError && <p role="alert" className="mt-3 rounded-lg bg-[#f8eee8] p-3 text-sm text-[#805749]">{checkoutError}</p>}
          {!commerceStatus.data?.testCheckoutEnabled && <p className="mt-3 rounded-lg bg-[#efe4d3] p-3 text-xs leading-relaxed text-[#765d43]">Checkout is disabled because the API does not report test checkout as enabled. Live payments are unavailable.</p>}
          {!cartReady && cartItems.length > 0 && <p className="mt-3 text-xs text-[#8b644e]">A cart item is no longer marked dispatch-ready. Remove it or refresh your cart before checkout.</p>}
          {needsFields.length > 0 && <p className="mt-3 text-xs text-[#8b644e]">{missingFields.length} required personalization {missingFields.length === 1 ? "field" : "fields"} remaining.</p>}
          <Button onClick={() => checkout.mutate()} disabled={checkout.isPending || !cartItems.length || !isAuthenticated || !cartReady || missingFields.length > 0 || !commerceStatus.data?.testCheckoutEnabled} className="mt-4 w-full bg-[#5f7259] py-6 text-white hover:bg-[#4d6249] disabled:opacity-50">{checkout.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Continue to test checkout <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </aside>
    </div>}
  </main>;
}
