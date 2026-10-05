import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, BookOpen, CircleAlert, Clock3, Download, PackageCheck, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePurchases, usePurchaseAction, type Purchase } from "@/hooks/use-commerce";

const humanize = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const money = (amount: string, currency: string) => `${currency} ${Number(amount).toFixed(2)}`;

function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-2xl border border-[#b66f56]/30 bg-[#f5e7df] p-6 text-[#734c40]">
    <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><p className="font-medium">Your order record could not be loaded</p><p className="mt-1 text-sm opacity-80">{message}</p></div>
    <Button variant="outline" onClick={retry} className="border-[#b66f56]/30 text-[#734c40]"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div>
  </div>;
}

function OrderCard({ order, onAction, pending }: { order: Purchase; onAction: (id: string, action: "retry" | "refund-request", reason?: string) => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  const exceptional = ["failed", "exception", "blocked", "error"].some((s) => order.fulfilmentState.toLowerCase().includes(s)) ||
    order.items.some((item) => Boolean(item.errorCode));
  const paymentState = order.paymentStatus || (order.status.toLowerCase().includes("fail") ? "failed" : order.paymentVerified ? "verified" : "not verified");
  const recordedMode = order.authoritativeMode || order.paymentMode;
  return <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[1.35rem] border border-[#d8cbbb] bg-[#fbf7ef] shadow-[0_12px_35px_rgba(66,47,28,.06)]">
    <div className="flex flex-col gap-4 border-b border-[#e7ddd0] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div><p className="font-mono text-[11px] tracking-widest text-[#89735f]">ORDER · {order.id}</p><h2 className="mt-1 font-display text-xl text-[#433a31]">{new Date(order.createdAt).toLocaleString()}</h2></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1.5 text-xs ${/fail|dispute|refund/i.test(order.status) ? "bg-[#f3dfd5] text-[#8d5141]" : "bg-[#ebe3d5] text-[#6d5945]"}`}>{humanize(order.status)}</span>
        <span className="rounded-full bg-[#e4eadf] px-3 py-1.5 text-xs text-[#4d674d]">Fulfilment · {humanize(order.fulfilmentState)}</span>
        {recordedMode && <span className="rounded-full bg-[#e8e3d8] px-3 py-1.5 text-xs text-[#6d5945]">Payment mode · {humanize(recordedMode)}</span>}
        <strong className="ml-1 text-lg text-[#433a31]">{money(order.totalAmount, order.currency)}</strong>
      </div>
    </div>
    <div className="px-5 py-5 sm:px-7">
      <div className="mb-5 grid gap-2 sm:grid-cols-3">
          {[["Payment", humanize(paymentState)], ["Fulfilment", humanize(order.fulfilmentState)], ["Refund", order.refundStatus ? humanize(order.refundStatus) : "No refund recorded"], ...(order.disputeStatus ? [["Dispute", humanize(order.disputeStatus)]] : [])].map(([label, value]) =>
          <div key={label} className="rounded-xl bg-[#f1eadf] px-4 py-3"><p className="text-[10px] uppercase tracking-[.17em] text-[#927d67]">{label}</p><p className="mt-1 text-sm font-medium text-[#514638]">{value}</p></div>)}
      </div>
      <div className="space-y-3">
        {order.items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#e9dfd2] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3"><div className="rounded-lg bg-[#e8dfcf] p-2 text-[#826b51]"><BookOpen className="h-4 w-4" /></div><div className="min-w-0"><p className="font-medium text-[#473e34]">{item.name}</p>
            <p className="mt-1 text-xs text-[#887965]">Item state: {humanize(item.state)} · Attempts: {item.attempts}</p>
            {item.errorCode && <p className="mt-1 font-mono text-xs text-[#a35543]">Failed / held · issue code: {item.errorCode}</p>}
          </div></div>
          {item.downloadUrl ? <a href={item.downloadUrl} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#5f7259] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#4d6249]"><Download className="h-4 w-4" />Protected download <ArrowUpRight className="h-3.5 w-3.5" /></a> :
            <span className="inline-flex items-center gap-2 text-xs text-[#897c6b]"><Clock3 className="h-4 w-4" />Download not available yet</span>}
        </div>)}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
         <Link href={`/purchases/${encodeURIComponent(order.id)}/kitchen`} className="inline-flex items-center gap-2 rounded-lg border border-[#d8cbbb] px-4 py-2.5 text-sm text-[#665744] hover:bg-[#f1eadf]"><PackageCheck className="h-4 w-4" />Order kitchen</Link>
         {order.receiptUrl && <a href={order.receiptUrl} className="inline-flex items-center gap-2 rounded-lg border border-[#d8cbbb] px-4 py-2.5 text-sm text-[#665744] hover:bg-[#f1eadf]"><ReceiptText className="h-4 w-4" />Receipt</a>}
        {exceptional && <Button disabled={pending} variant="outline" onClick={() => onAction(order.id, "retry")} className="border-[#9da98e] text-[#52634d]"><RefreshCw className="mr-2 h-4 w-4" />Retry fulfilment</Button>}
      </div>
      {exceptional && <div className="mt-5 rounded-xl border border-[#d9b9a7] bg-[#f8eee8] p-4">
        <div className="flex items-start gap-2 text-[#765044]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-sm"><strong>Fulfilment needs attention.</strong> This request does not issue a refund. Refund execution is not reported here; a refund is not complete unless its status is explicitly recorded.</p></div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us what went wrong (required)" className="mt-3 min-h-20 border-[#dcc5b7] bg-[#fffaf5]" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#85695c]">Current refund state: {order.refundStatus ? humanize(order.refundStatus) : "Not refunded"}</p>
          <Button disabled={pending || reason.trim().length < 5} onClick={() => onAction(order.id, "refund-request", reason.trim())} className="bg-[#855e4f] text-white hover:bg-[#704d40]">Request refund review</Button>
        </div>
      </div>}
    </div>
  </motion.article>;
}

export default function Purchases() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const purchases = usePurchases(isAuthenticated);
  const action = usePurchaseAction();
  const errorMessage = purchases.error instanceof Error ? purchases.error.message : "Please sign in with the account used at checkout.";
  return <main className="min-h-[100dvh] bg-[#eee6d8] text-[#433a31]">
    <header className="border-b border-[#d9cdbb] bg-[#f6f0e5]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/store" className="inline-flex items-center gap-2 text-sm text-[#76634f] hover:text-[#433a31]"><ArrowLeft className="h-4 w-4" />Store</Link>
        <Link href="/admin/factory" className="text-xs uppercase tracking-[.16em] text-[#8e785e] hover:text-[#433a31]">Product Factory</Link>
        <Link href="/kitchen" className="text-xs uppercase tracking-[.16em] text-[#8e785e] hover:text-[#433a31]">Glass Kitchen</Link>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[.22em] text-[#7d8b70]"><ShieldCheck className="h-4 w-4" />Account library</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Your purchases</h1>
        <p className="mt-3 max-w-2xl text-[#796c5b]">See the recorded state of each order and access only the protected files the service has made available. Payment alone is not delivery.</p>
      </motion.div>
      <div className="mt-9">
        {authLoading || purchases.isLoading ? <div className="space-y-4">{[1, 2].map((n) => <div key={n} className="h-52 animate-pulse rounded-2xl bg-[#e3d9ca]" />)}</div> :
          !isAuthenticated ? <div className="rounded-2xl border border-[#d8cbbb] bg-[#fbf7ef] p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#7b896d]" /><h2 className="mt-4 font-display text-2xl">Sign in to view your library</h2><p className="mt-2 text-sm text-[#796c5b]">Purchases are private to the account that placed the order.</p><a href="/api/login" className="mt-5 inline-flex rounded-lg bg-[#5f7259] px-5 py-3 text-sm text-white">Sign in</a></div> :
          purchases.isError ? <ErrorPanel message={errorMessage} retry={() => purchases.refetch()} /> :
          !purchases.data?.orders.length ? <div className="rounded-2xl border border-dashed border-[#cdbda8] bg-[#f6f0e5] p-12 text-center"><PackageCheck className="mx-auto h-9 w-9 text-[#879477]" /><h2 className="mt-4 font-display text-2xl">Your library is waiting</h2><p className="mt-2 text-sm text-[#796c5b]">Completed purchases will appear here with their actual fulfilment state.</p><Link href="/store" className="mt-6 inline-flex rounded-lg bg-[#5f7259] px-5 py-3 text-sm text-white">Browse ready products</Link></div> :
          <div className="space-y-5">{purchases.data.orders.map((order) => <OrderCard key={order.id} order={order} pending={action.isPending} onAction={(id, actionName, reason) => action.mutate({ id, action: actionName, reason })} />)}</div>}
      </div>
      {action.isError && <p role="alert" className="mt-4 rounded-lg bg-[#f5e7df] p-3 text-sm text-[#734c40]">{action.error instanceof Error ? action.error.message : "The order action could not be completed."}</p>}
      {action.isSuccess && <p className="mt-4 rounded-lg bg-[#e4eadf] p-3 text-sm text-[#4d674d]">Request recorded. Check the order's updated state above; a refund is not assumed or represented as completed.</p>}
    </div>
  </main>;
}
