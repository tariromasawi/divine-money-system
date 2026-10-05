import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check, CircleAlert, Clock3, PackageCheck, ShieldCheck } from "lucide-react";

type CheckoutStatus = {
  state: string;
  paymentVerified: boolean;
  fulfilmentState: string;
  entitlements: { id: string }[];
};
const label = (value?: string) => value ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Awaiting status";

export default function CheckoutSuccess() {
  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  const status = useQuery<CheckoutStatus>({
    queryKey: [`/api/checkout/status?session_id=${encodeURIComponent(sessionId || "")}`],
    enabled: !!sessionId,
    refetchInterval: (query) => query.state.data?.fulfilmentState?.toLowerCase() === "delivered" ? false : 3000,
  });
  const confirmed = status.data?.paymentVerified === true;
  const delivered = status.data?.fulfilmentState?.toLowerCase() === "delivered";
  const entitlementDetails = useQueries({
    queries: (status.data?.entitlements ?? []).map((entitlement) => ({
      queryKey: ["/api/entitlements", entitlement.id],
      enabled: delivered,
      queryFn: async () => {
        const response = await fetch(`/api/entitlements/${encodeURIComponent(entitlement.id)}`, { credentials: "include" });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Sign in with the purchasing account to open this download." : "Protected download details are unavailable.");
        return response.json() as Promise<{ downloadUrl?: string | null }>;
      },
    })),
  });
  const stages = [
    { name: "Payment verification", done: confirmed },
    { name: "Product preparation", done: delivered },
    { name: "Protected delivery", done: delivered },
  ];
  return <main className="min-h-[100dvh] bg-[#eee6d8] text-[#433a31]">
    <header className="border-b border-[#d9cdbb] bg-[#f6f0e5]"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
      <span className="font-display text-lg tracking-wide">DIVINE MONEY</span><Link href="/purchases" className="text-sm text-[#76634f] hover:text-[#433a31]">Your purchases</Link>
    </div></header>
    <div className="mx-auto flex max-w-4xl justify-center px-5 py-14">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl rounded-[1.5rem] border border-[#d8cbbb] bg-[#fbf7ef] p-6 shadow-[0_18px_50px_rgba(66,47,28,.08)] sm:p-10">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${delivered ? "bg-[#e4eadf] text-[#526b4d]" : "bg-[#ebe3d5] text-[#806a50]"}`}>
          {status.isError ? <CircleAlert className="h-7 w-7" /> : delivered ? <PackageCheck className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}
        </div>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[.22em] text-[#849078]">Order status</p>
        <h1 className="mt-2 text-center font-display text-3xl sm:text-4xl">{!sessionId ? "No order session found" : status.isError ? "Status needs attention" : status.isLoading ? "Checking your order" : delivered ? "Your product is ready" : confirmed ? "Payment verified" : label(status.data?.state)}</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-[#796c5b]">
          {delivered ? "The service reports fulfilment as delivered. Your protected downloads and receipt are available in Purchases." :
            confirmed ? "Payment is verified, but delivery is still in progress. This page checks with the service until fulfilment is marked delivered." :
              "This page does not infer a successful payment or delivery. The service status will be shown here when available."}
        </p>
        <div className="mt-8 rounded-2xl border border-[#e7ddd0] bg-[#f6f0e5] p-5">
          <div className="mb-4 flex items-center justify-between"><span className="text-xs uppercase tracking-[.15em] text-[#897965]">Fulfilment progress</span><span className="rounded-full bg-[#ebe3d5] px-3 py-1 text-xs text-[#6d5945]">{label(status.data?.fulfilmentState)}</span></div>
          <div className="space-y-3">{stages.map((stage, i) => <div key={stage.name} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${stage.done ? "bg-[#738468] text-white" : "border border-[#cdbda8] text-[#9b8973]"}`}>{stage.done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}</span>
            <span className={`text-sm ${stage.done ? "text-[#4d674d]" : "text-[#897965]"}`}>{stage.name}</span>
            {i === 0 && confirmed && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#738468]">Verified</span>}
          </div>)}</div>
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-[#897965]">Payment confirmation does not mean a product was prepared, delivered, emailed, or refunded. Fulfilment reflects the exact state returned by the order service.</p>
        {delivered && status.data?.entitlements && status.data.entitlements.length > 0 && <div className="mt-6 space-y-2">
          {status.data.entitlements.map((entitlement, index) => {
            const detail = entitlementDetails[index];
            const downloadUrl = detail?.data?.downloadUrl;
            return <div key={entitlement.id} className="rounded-xl border border-[#e7ddd0] bg-[#f6f0e5] p-4 text-left">
              {downloadUrl ? <a href={downloadUrl} className="inline-flex items-center gap-2 text-sm font-medium text-[#53684d] underline underline-offset-4">Open protected product download</a> :
                <p className="text-sm text-[#796c5b]">{detail?.isError && detail.error instanceof Error ? <>{detail.error.message} <button onClick={() => detail.refetch()} className="ml-1 underline">Retry</button></> : "Retrieving protected download link…"}</p>}
            </div>;
          })}
        </div>}
        {status.isError && <div role="alert" className="mt-5 rounded-xl bg-[#f8eee8] p-4 text-sm text-[#805749]">{status.error instanceof Error ? status.error.message : "Could not retrieve order status."}<button onClick={() => status.refetch()} className="ml-2 underline">Retry</button></div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/purchases" className="inline-flex items-center justify-center rounded-lg bg-[#5f7259] px-5 py-3 text-sm text-white hover:bg-[#4d6249]"><ShieldCheck className="mr-2 h-4 w-4" />Open purchases</Link>
          <Link href="/store" className="inline-flex items-center justify-center rounded-lg border border-[#d8cbbb] px-5 py-3 text-sm text-[#665744] hover:bg-[#f1eadf]"><ArrowLeft className="mr-2 h-4 w-4" />Return to store</Link>
        </div>
      </motion.section>
    </div>
  </main>;
}
