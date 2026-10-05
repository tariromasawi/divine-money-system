import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Check, CircleAlert, Cog, FileCheck2, Hammer, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFactory, useFactoryAction, useRefundReview } from "@/hooks/use-commerce";

const words = (v: string) => v.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const readiness = (p: { status: string; qaPassed: boolean; acceptancePassed: boolean; readinessReason: string | null }) =>
  p.status.toLowerCase() === "dispatch_ready" && p.qaPassed && p.acceptancePassed;

export default function ProductFactory() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const factory = useFactory(isAuthenticated);
  const runAction = useFactoryAction();
  const review = useRefundReview();
  const error = factory.error instanceof Error ? factory.error.message : "";
  const denied = /401|403|unauthor|forbidden/i.test(error);
  return <main className="min-h-[100dvh] bg-[#eee6d8] text-[#433a31]">
    <header className="border-b border-[#d9cdbb] bg-[#f6f0e5]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#76634f] hover:text-[#433a31]"><ArrowLeft className="h-4 w-4" />Owner console</Link>
        <Link href="/purchases" className="text-xs uppercase tracking-[.16em] text-[#8e785e] hover:text-[#433a31]">Customer orders</Link>
        <div className="flex items-center gap-4"><Link href="/admin/operations" className="text-xs uppercase tracking-[.16em] text-[#8e785e] hover:text-[#433a31]">Operations centre</Link><Link href="/kitchen" className="text-xs uppercase tracking-[.16em] text-[#8e785e] hover:text-[#433a31]">Glass Kitchen</Link></div>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[.22em] text-[#7d8b70]"><Cog className="h-4 w-4" />Owner operations</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Product Factory</h1>
          <p className="mt-3 max-w-xl text-[#796c5b]">Readiness is based on the service's build and QA records. Only verified-ready catalogue products may be offered for checkout.</p>
        </motion.div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={!isAuthenticated || runAction.isPending} onClick={() => runAction.mutate("validate")} className="border-[#cdbda8] bg-[#fbf7ef] text-[#5d5143]"><FileCheck2 className="mr-2 h-4 w-4" />Validate</Button>
          <Button disabled={!isAuthenticated || runAction.isPending} onClick={() => runAction.mutate("build")} className="bg-[#5f7259] text-white hover:bg-[#4d6249]">{runAction.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}Build products</Button>
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Checkout", factory.data ? (factory.data.liveCheckoutEnabled ? "Enabled by API" : "Disabled by API") : "Not reported by API"],
          ["Email", factory.data ? (factory.data.emailEnabled ? "Enabled by API" : "Disabled by API") : "Not reported by API"],
          ["Refund execution", factory.data ? (factory.data.refundExecutionEnabled ? "Enabled by API" : "Disabled by API") : "Not reported by API"],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#d8cbbb] bg-[#f6f0e5] px-5 py-4"><p className="text-[10px] uppercase tracking-[.18em] text-[#927d67]">{label} capability</p><p className="mt-2 font-medium text-[#514638]">{value}</p></div>)}
      </div>
      {!authLoading && !isAuthenticated && <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[#d6c2a1] bg-[#f7efdf] p-6 sm:flex-row sm:items-center"><LockKeyhole className="h-5 w-5 text-[#94794d]" /><div className="flex-1"><p className="font-medium">Owner sign-in required</p><p className="mt-1 text-sm text-[#796c5b]">Factory operations are available only to authorized administrators.</p></div><a href="/api/login" className="rounded-lg bg-[#5f7259] px-4 py-2.5 text-center text-sm text-white">Sign in</a></div>}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#927d67]">Catalog evidence</p><h2 className="mt-1 font-display text-2xl">Product readiness</h2></div><span className="text-xs text-[#897965]">Refreshes automatically</span></div>
        {authLoading || factory.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((x) => <div key={x} className="h-48 animate-pulse rounded-2xl bg-[#e3d9ca]" />)}</div> :
          factory.isError ? <div className={`rounded-2xl border p-6 ${denied ? "border-[#d6c2a1] bg-[#f7efdf]" : "border-[#d9b9a7] bg-[#f8eee8]"}`}>
            <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><h3 className="font-medium">{denied ? "Factory access is restricted" : "Factory records are unavailable"}</h3><p className="mt-1 text-sm opacity-80">{denied ? "The API denied access (401/403). Sign in with an owner account, or ask an administrator to grant access." : error || "The service could not return factory status."}</p></div><Button variant="outline" onClick={() => factory.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>
          </div> :
          <div className="grid gap-4 md:grid-cols-2">{factory.data?.products.map((product) => {
            const ready = readiness(product);
            return <motion.article key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#d8cbbb] bg-[#fbf7ef] p-5 shadow-[0_12px_35px_rgba(66,47,28,.05)]">
              <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-widest text-[#927d67]">{product.category} · {product.id}</p><h3 className="mt-2 font-display text-xl">{product.name}</h3><p className="mt-1 text-sm text-[#796c5b]">{product.currency} {Number(product.price).toFixed(2)}</p></div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${ready ? "bg-[#e4eadf] text-[#4d674d]" : "bg-[#f5e7df] text-[#895647]"}`}>{ready ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{ready ? "Ready" : "Paused"}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                {[["Status", words(product.status)], ["Adapter", product.adapter], ["Version", product.version == null ? "Not built" : `v${product.version}`], ["Checksum", product.checksum || "Not recorded"], ["QA", product.qaPassed ? "Passed" : "Not passed"], ["Acceptance", product.acceptancePassed ? "Passed" : "Not passed"]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f1eadf] px-3 py-2"><p className="text-[9px] uppercase tracking-widest text-[#927d67]">{label}</p><p className="mt-1 break-all text-[#514638]">{value}</p></div>)}
              </div>
              {!ready && <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#f8eee8] p-3 text-xs leading-relaxed text-[#805749]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{product.readinessReason || "Not yet proven ready. This product must remain paused until build, QA, and acceptance checks pass."}</p>}
              {ready && <p className="mt-4 flex items-center gap-2 text-xs text-[#607257]"><ShieldCheck className="h-4 w-4" />Factory checks report this version ready for dispatch.</p>}
              {product.personalizationFields.length > 0 && <p className="mt-3 text-xs text-[#76634f]">Personalization required: {product.personalizationFields.join(", ")}</p>}
            </motion.article>;
          })}{!factory.data?.products.length && <p className="rounded-2xl border border-dashed border-[#cdbda8] p-8 text-sm text-[#796c5b]">No factory products have been returned by the API.</p>}</div>}
      </section>
      <section className="mt-10 rounded-2xl border border-[#d9b9a7] bg-[#f8eee8] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9a644e]" />
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-[#956c59]">Order exceptions</p>
            <h2 className="mt-1 font-display text-2xl text-[#60483d]">Refund and delivery review</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#795b4e]">These are review requests only. NO funds have been refunded. Refund execution remains disabled; marking a request under review is not a financial action.</p>
          </div>
        </div>
        {review.isError && <p role="alert" className="mt-4 rounded-lg border border-[#d9b9a7] bg-[#fff8f3] p-3 text-sm text-[#805749]">{review.error instanceof Error ? review.error.message : "Could not update review status."}</p>}
        {review.isSuccess && <p className="mt-4 rounded-lg border border-[#b9c6ae] bg-[#edf2e9] p-3 text-sm text-[#52664b]">Review status updated. No refund was executed.</p>}
        <div className="mt-5 space-y-3">
          {factory.data?.exceptions?.length ? factory.data.exceptions.map((exception) => {
            const requested = exception.state.toUpperCase() === "REQUESTED";
            const underReview = exception.state.toUpperCase() === "UNDER_REVIEW";
            return <article key={exception.id} className="rounded-xl border border-[#e4d2c7] bg-[#fffaf6] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[#514238]">Order {exception.orderId}</h3>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${underReview ? "bg-[#e8e2d6] text-[#70614e]" : "bg-[#f1dfd5] text-[#895647]"}`}>{words(exception.state)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#795b4e]">{exception.reason}</p>
                  <p className="mt-2 text-xs text-[#967c6b]">{new Date(exception.createdAt).toLocaleString()} · {exception.currency} {Number(exception.totalAmount).toFixed(2)}</p>
                </div>
                {requested && <Button disabled={review.isPending} onClick={() => review.mutate(exception.id)} className="shrink-0 bg-[#855e4f] text-white hover:bg-[#704d40]">
                  {review.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Mark under review
                </Button>}
              </div>
              {underReview && <p className="mt-4 border-t border-[#eee0d7] pt-3 text-xs text-[#806c5e]">Under review. No financial action is available from this state.</p>}
            </article>;
          }) : <p className="rounded-xl border border-dashed border-[#d8bcae] bg-[#fffaf6] p-5 text-sm text-[#856b5c]">{factory.data ? "No refund or delivery exception requests are recorded." : "Exception requests will appear when the factory API returns them."}</p>}
        </div>
      </section>
      <section className="mt-10 rounded-2xl border border-[#d8cbbb] bg-[#f6f0e5] p-5 sm:p-6">
        <div className="flex items-start gap-3"><Cog className="mt-0.5 h-5 w-5 text-[#7d8b70]" /><div className="flex-1"><h2 className="font-display text-xl">Recent factory jobs</h2><p className="mt-1 text-xs text-[#897965]">Action outcome is reported by the service, not inferred from a click.</p></div></div>
        {runAction.isError && <p role="alert" className="mt-4 rounded-lg bg-[#f8eee8] p-3 text-sm text-[#805749]">{runAction.error instanceof Error ? runAction.error.message : "Factory action failed."}</p>}
        {runAction.isSuccess && <p className="mt-4 rounded-lg bg-[#e4eadf] p-3 text-sm text-[#4d674d]">Factory action accepted. Job status will appear when the API returns it.</p>}
        <div className="mt-4 space-y-2">{factory.data?.jobs.length ? factory.data.jobs.map((job) => <div key={job.id} className="flex flex-col gap-2 rounded-xl bg-[#fbf7ef] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-[#514638]">{words(job.kind)} · {job.id}</p>{job.errorCode && <p className="mt-1 font-mono text-xs text-[#a35543]">Reason: {job.errorCode}</p>}</div><span className="rounded-full bg-[#ebe3d5] px-3 py-1 text-xs text-[#6d5945]">{words(job.state)}</span></div>) : <p className="rounded-lg bg-[#fbf7ef] p-4 text-sm text-[#897965]">No factory jobs recorded yet.</p>}</div>
      </section>
    </div>
  </main>;
}
