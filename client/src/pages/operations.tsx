import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Check, ChevronRight, CircleAlert, Clock3, Cog, Database, Mail, Play, RefreshCw, ShieldCheck, Sparkles, Square, Store, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useOperationCommand, useOperations, useOrderTrace } from "@/hooks/use-operations";
import type { OperationCommand } from "@shared/operations";

type PendingCommand = Omit<OperationCommand, "confirm" | "requestKey"> & { title: string; explanation: string };
const words = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const time = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
const providerStatus = (value: string) => value.replace(/[_-]+/g, " ").toUpperCase();
const controlNames = ["factory", "fulfilment", "email", "promotions"];

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Activity }) {
  return <div className="border-t border-[#cdd5c4] py-4"><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[.18em] text-[#828876]">{label}</p><Icon className="h-4 w-4 text-[#788873]" /></div><p className="mt-2 font-display text-3xl text-[#38453b]">{value}</p><p className="mt-1 text-xs text-[#7e8172]">{detail}</p></div>;
}

export default function Operations() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const snapshot = useOperations(isAuthenticated);
  const command = useOperationCommand();
  const [confirmation, setConfirmation] = useState<PendingCommand | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const trace = useOrderTrace(selectedOrder);
  const data = snapshot.data;
  const denied = snapshot.isError && /401|403|unauthor|forbidden/i.test(snapshot.error instanceof Error ? snapshot.error.message : "");
  const exceptionCount = data?.reconciliation.exceptions.length ?? 0;
  const tracedOrder = trace.data?.order;
  const paymentRecord = trace.data?.order as { paymentMode?: string | null; authoritativeMode?: string | null } | undefined;
  const paymentMode = paymentRecord?.authoritativeMode || paymentRecord?.paymentMode;
  const nativeReconciliation = (data?.reconciliation as {
    native?: { checked?: number; exceptions?: unknown[]; scope?: string; state?: string };
  } | undefined)?.native;
  const refundStates = ["paid", "fulfilment_pending", "fulfilment_failed", "fulfilled"];
  const refundEligible = Boolean(tracedOrder?.paymentVerified && refundStates.includes(tracedOrder.status.toLowerCase()));
  const totals = useMemo(() => ({
    failedJobs: data?.jobs.filter((job) => /fail|error|exception|blocked/i.test(job.state)).length ?? 0,
    paused: data?.controls.filter((control) => control.paused).length ?? 0,
  }), [data]);

  const ask = (input: Omit<PendingCommand, "title" | "explanation">, title: string, explanation: string) =>
    setConfirmation({ ...input, title, explanation });
  const execute = () => {
    if (!confirmation) return;
    const { title: _title, explanation: _explanation, ...payload } = confirmation;
    command.mutate({ ...payload, confirm: true, requestKey: crypto.randomUUID() }, { onSuccess: () => setConfirmation(null) });
  };
  const control = (name: string) => data?.controls.find((item) => item.subsystem === name);

  return <main className="min-h-[100dvh] bg-[#eee9de] text-[#3d473e]">
    <header className="border-b border-[#d5d4c6] bg-[#f5f2e9]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#687561] hover:text-[#3b453c]"><ArrowLeft className="h-4 w-4" />Owner console</Link>
        <nav className="flex items-center gap-4 text-xs text-[#78816e]"><Link href="/admin/factory" className="hover:text-[#38453b]">Factory</Link><Link href="/kitchen" className="inline-flex items-center gap-1 hover:text-[#38453b]">Public kitchen <ArrowUpRight className="h-3 w-3" /></Link></nav>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-9 sm:px-8 sm:pt-14">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-[#71856c]"><ShieldCheck className="h-4 w-4" />Owner control room</p><h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Operations, with the lights on.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#737866]">Observe real production records and take explicit, auditable action only where the service allows it.</p></div>
        <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#d4d5c8] bg-[#f7f4eb] px-3 py-2 text-[10px] uppercase tracking-wider text-[#77816e]"><span className="h-1.5 w-1.5 rounded-full bg-[#829d7a]" />API reported state</span><span className="rounded-full bg-[#e2e2d6] px-3 py-2 font-mono text-[10px] text-[#7a806f]">POLL · 10 SEC</span></div>
      </motion.div>
      {authLoading || snapshot.isLoading ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((x) => <div key={x} className="h-28 animate-pulse border-t border-[#d5d4c6] bg-[#e7e3d8]" />)}</div> :
        !isAuthenticated ? <div className="mt-9 flex flex-col gap-4 rounded-2xl border border-[#d5d4c6] bg-[#f7f4eb] p-7 sm:flex-row sm:items-center"><ShieldCheck className="h-6 w-6 text-[#788873]" /><div className="flex-1"><h2 className="font-display text-2xl">Owner sign-in required</h2><p className="mt-1 text-sm text-[#737866]">Operations records and controls are available only to authorized administrators.</p></div><a href="/api/login" className="inline-flex justify-center rounded-lg bg-[#536c57] px-5 py-3 text-sm text-white hover:bg-[#435a47]">Sign in</a></div> :
        snapshot.isError ? <div className={`mt-9 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center ${denied ? "border-[#d5d4c6] bg-[#f7f4eb]" : "border-[#d9b9a7] bg-[#f8eee8]"}`}><CircleAlert className="h-5 w-5 shrink-0 text-[#9a644e]" /><div className="flex-1"><h2 className="font-medium">{denied ? "Operations access denied" : "Live records unavailable"}</h2><p className="mt-1 text-sm text-[#795b4e]">{denied ? "The API did not authorize this account. No operational records are shown." : snapshot.error instanceof Error ? snapshot.error.message : "The service could not return the operations snapshot."}</p></div><Button variant="outline" onClick={() => snapshot.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div> :
        data && <>
          <section className="mt-9 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Reconciliation" value={exceptionCount} detail={`${data.reconciliation.checked} checked · ${data.reconciliation.scope}`} icon={Database} />
            <Metric label="Production queue" value={data.jobs.length} detail={`${totals.failedJobs} held or failed jobs`} icon={Activity} />
            <Metric label="Paused systems" value={totals.paused} detail={`${data.controls.length} controls reported`} icon={Square} />
            <Metric label="Orders in view" value={data.orders.length} detail="Service-reported records" icon={Store} />
          </section>
          <section className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Switchboard</p><h2 className="mt-1 font-display text-2xl">Automation controls</h2><p className="mt-2 text-xs text-[#818373]">Pause or resume only the supported systems.</p></div><Cog className="h-5 w-5 text-[#7a8971]" /></div>
              <div className="mt-5 divide-y divide-[#e2dfd4]">
                {controlNames.map((name) => {
                  const item = control(name);
                  return <div key={name} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="flex items-center gap-2"><h3 className="font-medium">{words(name)}</h3><span className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-wider ${item?.paused ? "bg-[#f0e0d6] text-[#93664f]" : "bg-[#dce9dc] text-[#4d674f]"}`}>{item ? item.paused ? "Paused" : "Running" : "Not reported"}</span></div><p className="mt-1 text-xs text-[#828472]">{item ? `Updated ${time(item.updatedAt)}` : "Control is absent from the server snapshot."}</p></div>
                    <Button disabled={!item || command.isPending} variant="outline" className="border-[#d2d4c6] bg-[#fbf9f2] text-[#566953]" onClick={() => item && ask({ action: item.paused ? "resume" : "pause", subjectType: "automation", subjectId: name }, `${item.paused ? "Resume" : "Pause"} ${words(name)} automation`, `This sends an explicit ${item.paused ? "resume" : "pause"} command for the ${name} subsystem. The API response and audit event determine the outcome.`)}>{item?.paused ? <Play className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}{item?.paused ? "Resume" : "Pause"}</Button>
                  </div>;
                })}
                {data.controls.filter((entry) => !controlNames.includes(entry.subsystem)).map((item) => <div key={item.subsystem} className="flex items-center justify-between gap-3 py-4"><div><h3 className="font-medium">{words(item.subsystem)}</h3><p className="mt-1 text-xs text-[#828472]">Reported control · {time(item.updatedAt)}</p></div><span className="rounded-full bg-[#e8e7dc] px-3 py-1.5 text-[10px] text-[#717768]">{item.paused ? "Paused" : "Running"}</span></div>)}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#e7e8dc] p-5 sm:p-7">
              <p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Provider health</p><h2 className="mt-1 font-display text-2xl">External services</h2>
              <div className="mt-5 space-y-2">{Object.entries(data.providers).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 border-b border-[#d5d8ca] py-3"><span className="text-sm">{words(key)}</span><span className="rounded-full bg-[#f5f3e9] px-3 py-1.5 font-mono text-[10px] text-[#656d5d]">{providerStatus(value)}</span></div>)}</div>
              <p className="mt-5 text-xs leading-5 text-[#7d8273]">These are status values returned by the operations API. No provider secrets are displayed.</p>
            </div>
          </section>
          <section className="mt-8 rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Catalogue proof</p><h2 className="mt-1 font-display text-2xl">Product operations</h2></div><Link href="/admin/factory" className="text-xs text-[#687c63] hover:underline">Open Product Factory <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">{data.products.map((product) => <article key={product.id} className="rounded-xl border border-[#e3dfd3] bg-[#fbf9f2] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{product.name}</h3><p className="mt-1 font-mono text-[10px] text-[#898b78]">{product.id} · v{product.version ?? "—"}</p></div><div className="flex gap-1.5"><span className="rounded-full bg-[#e9e7dc] px-2.5 py-1 text-[9px] text-[#727767]">{words(product.state)}</span>{product.operatorPaused && <span className="rounded-full bg-[#f0e0d6] px-2.5 py-1 text-[9px] text-[#93664f]">Operator paused</span>}</div></div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#757b6b]"><span className="inline-flex items-center gap-1">{product.qaPassed ? <Check className="h-3 w-3 text-[#668267]" /> : <AlertTriangle className="h-3 w-3 text-[#a37758]" />}QA {product.qaPassed ? "passed" : "not passed"}</span><span className="inline-flex items-center gap-1">{product.acceptancePassed ? <Check className="h-3 w-3 text-[#668267]" /> : <AlertTriangle className="h-3 w-3 text-[#a37758]" />}Acceptance {product.acceptancePassed ? "passed" : "not passed"}</span></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: product.operatorPaused ? "resume" : "pause", subjectType: "product", subjectId: product.id }, `${product.operatorPaused ? "Resume" : "Pause"} ${product.name}`, `The API will update the operator control for this product. Its state and readiness remain service-owned.`)}>{product.operatorPaused ? <Play className="mr-1.5 h-3.5 w-3.5" /> : <Square className="mr-1.5 h-3.5 w-3.5" />}{product.operatorPaused ? "Resume" : "Pause"}</Button>
                <Button size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: "regenerate", subjectType: "product", subjectId: product.id }, `Regenerate ${product.name}`, "The production service will enqueue or report regeneration. Existing files are not assumed to change until the API reports it.")}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Regenerate</Button>
                <Button size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: "qa", subjectType: "product", subjectId: product.id }, `Run QA for ${product.name}`, "This submits a QA command to the production service. The recorded result will be reported in the snapshot.")}><Check className="mr-1.5 h-3.5 w-3.5" />Run QA</Button>
              </div>
            </article>)}
              {!data.products.length && <p className="rounded-xl border border-dashed border-[#d5d4c6] p-6 text-sm text-[#7c806f]">No products were returned by the operations API.</p>}
            </div>
          </section>
          <section className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#d9c8b8] bg-[#f5eee4] p-5 sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#96755e]">Exception desk</p><h2 className="mt-1 font-display text-2xl">Reconciliation</h2></div><AlertTriangle className="h-5 w-5 text-[#a37658]" /></div>
              <p className="mt-2 text-xs text-[#827565]">Internal checks · {data.reconciliation.scope} · {data.reconciliation.checked} checked</p>
              {nativeReconciliation && <div className="mt-3 rounded-xl border border-[#d5d8ca] bg-[#f1f1e8] p-4">
                <p className="text-[10px] uppercase tracking-[.16em] text-[#78856f]">Native read-only reconciliation</p>
                <p className="mt-1 text-xs text-[#71796c]">{nativeReconciliation.scope || nativeReconciliation.state || "Service-reported native reconciliation"}{typeof nativeReconciliation.checked === "number" ? ` · ${nativeReconciliation.checked} checked` : ""}{Array.isArray(nativeReconciliation.exceptions) ? ` · ${nativeReconciliation.exceptions.length} exceptions` : ""}</p>
              </div>}
              <div className="mt-4 space-y-2">{data.reconciliation.exceptions.map((exception, index) => <button key={`${exception.orderId}-${exception.code}-${index}`} onClick={() => setSelectedOrder(exception.orderId)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e4d8cb] bg-[#fbf7ef] p-4 text-left hover:border-[#c6ae96]"><div><p className="text-sm font-medium">Order {exception.orderId}</p><p className="mt-1 font-mono text-[10px] text-[#916e58]">{exception.code}</p></div><ChevronRight className="h-4 w-4 text-[#9b8068]" /></button>)}
                {!data.reconciliation.exceptions.length && <p className="rounded-xl border border-dashed border-[#d8cbbb] p-5 text-sm text-[#827565]">No reconciliation exceptions are reported.</p>}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Message ledger</p><h2 className="mt-1 font-display text-2xl">Email outbox</h2></div><Mail className="h-5 w-5 text-[#788873]" /></div>
              <div className="mt-4 space-y-2">{data.emailOutbox.map((email) => {
                const retryable = Boolean(email.errorCode) || /fail|error|blocked/i.test(email.state);
                return <div key={email.id} className="flex flex-col gap-3 rounded-xl border border-[#e3dfd3] bg-[#fbf9f2] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] text-[#898b78]">{email.id}</p><p className="mt-1 text-sm">Order {email.orderId} · {words(email.state)}</p><p className="mt-1 text-xs text-[#828472]">Attempts {email.attempts}{email.errorCode ? ` · ${email.errorCode}` : ""}</p></div>{retryable ? <Button size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: "retry_email", subjectType: "email", subjectId: email.id }, "Retry this email", "The email service will receive a retry command. Delivery is not claimed until the outbox state changes.")}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button> : <span className="text-xs text-[#8a8b7b]">No retry needed</span>}</div>;
              })}
                {!data.emailOutbox.length && <p className="rounded-xl border border-dashed border-[#d5d4c6] p-5 text-sm text-[#7c806f]">No email outbox records are reported.</p>}
              </div>
            </div>
          </section>
          <section className="mt-8 rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
            <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Production queue</p><h2 className="mt-1 font-display text-2xl">Fulfilment jobs</h2></div><span className="text-xs text-[#828472]">{data.jobs.length} records</span></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b border-[#deded1] text-[10px] uppercase tracking-wider text-[#898b78]"><th className="py-3 pr-3 font-medium">Job / order</th><th className="py-3 pr-3 font-medium">Product</th><th className="py-3 pr-3 font-medium">State</th><th className="py-3 pr-3 font-medium">Attempts</th><th className="py-3 pr-3 font-medium">Next attempt</th><th className="py-3 font-medium">Action</th></tr></thead>
              <tbody>{data.jobs.map((job) => {
                const retryable = Boolean(job.errorCode) || /fail|error|blocked|exception/i.test(job.state);
                return <tr key={job.id} className="border-b border-[#e7e4d9]"><td className="py-3 pr-3"><button onClick={() => setSelectedOrder(job.orderId)} className="text-left hover:underline"><span className="block font-mono text-[10px] text-[#7f8675]">{job.id}</span><span className="mt-1 block text-xs">Order {job.orderId}</span></button>{job.errorCode && <span className="mt-1 block font-mono text-[9px] text-[#a16c56]">{job.errorCode}</span>}</td><td className="py-3 pr-3 font-mono text-xs">{job.productId}</td><td className="py-3 pr-3"><span className="rounded-full bg-[#e8e7dc] px-2.5 py-1 text-[10px]">{words(job.state)}</span></td><td className="py-3 pr-3 font-mono text-xs">{job.attempts}</td><td className="py-3 pr-3 text-xs text-[#7f8273]">{time(job.nextAttemptAt)}</td><td className="py-3">{retryable ? <Button size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: "retry_fulfilment", subjectType: "order", subjectId: job.orderId }, `Retry fulfilment for ${job.orderId}`, "The API will receive a retry request for this order. This does not assert successful production or delivery.")}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button> : <span className="text-xs text-[#8a8b7b]">—</span>}</td></tr>;
              })}
                {!data.jobs.length && <tr><td colSpan={6} className="py-8 text-center text-sm text-[#7c806f]">No fulfilment jobs are reported.</td></tr>}</tbody>
            </table></div>
          </section>
          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Order register</p><h2 className="mt-1 font-display text-2xl">Customer orders</h2></div><WalletCards className="h-5 w-5 text-[#788873]" /></div>
              <div className="mt-4 max-h-[460px] space-y-2 overflow-auto pr-1">{data.orders.map((order) => <button key={order.id} onClick={() => setSelectedOrder(order.id)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedOrder === order.id ? "border-[#82987d] bg-[#eef0e5]" : "border-[#e3dfd3] bg-[#fbf9f2] hover:border-[#c6c9b9]"}`}><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-mono text-[10px] text-[#7f8675]">{order.id}</span><span className="text-xs font-medium">{order.currency} {order.totalAmount}</span></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs">{words(order.status)} · {words(order.fulfilmentState)}</span><span className={`rounded-full px-2.5 py-1 text-[9px] ${order.paymentVerified ? "bg-[#dce9dc] text-[#4d674f]" : "bg-[#ece7dc] text-[#887a65]"}`}>{order.paymentVerified ? "Verified by API" : "Not verified"}</span></div><p className="mt-2 text-[10px] text-[#898b78]">{time(order.createdAt)}</p></button>)}
                {!data.orders.length && <p className="rounded-xl border border-dashed border-[#d5d4c6] p-5 text-sm text-[#7c806f]">No orders are reported.</p>}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#e7e8dc] p-5 sm:p-7">
              <p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Selected record</p><h2 className="mt-1 font-display text-2xl">Order trace</h2>
              {!selectedOrder ? <p className="mt-5 rounded-xl border border-dashed border-[#cfd3c3] p-6 text-sm text-[#7c806f]">Select an order, job, or reconciliation exception to inspect its trace.</p> :
                trace.isLoading ? <div className="mt-5 space-y-3"><div className="h-20 animate-pulse rounded-xl bg-[#daddcf]" /><div className="h-32 animate-pulse rounded-xl bg-[#daddcf]" /></div> :
                trace.isError ? <div className="mt-5 rounded-xl border border-[#d9b9a7] bg-[#f8eee8] p-4"><p className="text-sm">Order trace could not be loaded.</p><p className="mt-1 text-xs">{trace.error instanceof Error ? trace.error.message : "Service unavailable"}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => trace.refetch()}>Retry trace</Button></div> :
                trace.data && <div className="mt-4 max-h-[540px] space-y-4 overflow-auto pr-1">
                  <div className="rounded-xl border border-[#d5d8ca] bg-[#f1f1e8] p-4"><p className="font-mono text-[10px] text-[#7f8675]">{trace.data.order.id}</p><p className="mt-2 text-sm">{words(trace.data.order.status)} · {words(trace.data.order.fulfilmentState)}</p><p className="mt-1 text-xs text-[#747a6c]">{trace.data.order.currency} {trace.data.order.totalAmount} · Payment {trace.data.order.paymentVerified ? "verified by API" : "not verified"}</p>
                  {refundEligible ? <div className="mt-4 border-t border-[#d5d8ca] pt-4"><p className="text-xs leading-5 text-[#71796c]">Eligible based on API-reported payment verification and order state. Authorization requests refund processing; it does not mean a refund is complete. The API-reported payment mode{paymentMode ? ` is ${words(paymentMode)}` : " was not provided"}; provider confirmation determines the recorded outcome.</p><Button className="mt-3 bg-[#8b5e4a] text-white hover:bg-[#744c3d]" disabled={command.isPending} onClick={() => ask({ action: "refund", subjectType: "order", subjectId: trace.data.order.id }, "Authorize a full refund", `Request a provider-backed full refund for this API-verified order${paymentMode ? ` (payment mode: ${words(paymentMode)})` : ""}. This action queues authorization only. The order is not refunded unless the service records provider confirmation, and access changes only as reported by the service.`)}>Authorize full refund</Button></div> :
                      <p className="mt-3 border-t border-[#d5d8ca] pt-3 text-[10px] leading-5 text-[#858a7b]">Full-refund authorization is shown only when payment is verified by the API and the order state is paid, fulfilment pending, fulfilment failed, or fulfilled.</p>}
                  </div>
                  {trace.data.refund && <section className="rounded-xl border border-[#d5d8ca] bg-[#f1f1e8] p-4"><h3 className="text-xs">Refund · {words(trace.data.refund.state)}</h3><p className="mt-2 text-xs">Attempts: {trace.data.refund.attempts}{trace.data.refund.errorCode ? ` · ${trace.data.refund.errorCode}` : ""}</p>{trace.data.refund.canRetry && <Button className="mt-3" variant="outline" disabled={command.isPending} onClick={() => ask({action:"retry_refund",subjectType:"order",subjectId:trace.data.order.id},"Retry refund recovery","The service will poll an existing provider refund or retry within its safe idempotency window. Uncertain outcomes may remain blocked for provider review. The retry action does not represent a completed refund.")}>Retry refund recovery</Button>}</section>}
                  {([["Items", trace.data.items], ["Events", trace.data.events], ["Journal", trace.data.journal]] as const).map(([label, entries]) => <div key={label}><h3 className="mb-2 text-[10px] uppercase tracking-[.18em] text-[#78856f]">{label} · {entries.length}</h3>{entries.length ? entries.map((entry, index) => <pre key={index} className="mb-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[#d5d8ca] bg-[#f1f1e8] p-3 font-mono text-[10px] leading-5 text-[#5d6658]">{JSON.stringify(entry, null, 2)}</pre>) : <p className="rounded-lg bg-[#f1f1e8] p-3 text-xs text-[#858a7b]">No {label.toLowerCase()} returned.</p>}</div>)}
                </div>}
            </div>
          </section>
          <section className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Provider-safe event view</p><h2 className="mt-1 font-display text-2xl">Redacted provider events</h2></div><ShieldCheck className="h-5 w-5 text-[#788873]" /></div>
              <p className="mt-2 text-xs leading-5 text-[#818373]">Only redacted event fields supplied by the API are displayed.</p>
              <div className="mt-4 space-y-2">{data.providerEvents.map((event) => <div key={event.id} className="rounded-xl border border-[#e3dfd3] bg-[#fbf9f2] p-4"><div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-[10px] text-[#7f8675]">{event.id}</span><span className="rounded-full bg-[#e9e7dc] px-2.5 py-1 text-[9px]">{words(event.state)}</span></div><p className="mt-2 text-xs">{words(event.type)} · {event.attempts} attempts</p>{event.errorCode && <p className="mt-1 font-mono text-[10px] text-[#a16c56]">{event.errorCode}</p>}</div>)}
                {!data.providerEvents.length && <p className="rounded-xl border border-dashed border-[#d5d4c6] p-5 text-sm text-[#7c806f]">No provider events are reported.</p>}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Ready-only promotions</p><h2 className="mt-1 font-display text-2xl">Campaign drafts</h2></div><Sparkles className="h-5 w-5 text-[#788873]" /></div>
              <div className="mt-4 space-y-3">{data.promotions.map((promo) => <article key={`${promo.productId}-${promo.campaign}`} className="rounded-xl border border-[#e3dfd3] bg-[#fbf9f2] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{promo.title}</p><span className="rounded-full bg-[#dce9dc] px-2.5 py-1 text-[9px] text-[#4d674f]">{words(promo.status)}</span></div><p className="mt-2 text-xs leading-5 text-[#777d6d]">{promo.description}</p><p className="mt-2 text-[10px] text-[#858a7b]">SEO · {promo.seoTitle} · Campaign · {promo.campaign}</p>
                <Button className="mt-3" size="sm" variant="outline" disabled={command.isPending} onClick={() => ask({ action: "refresh_promotions", subjectType: "promotions", subjectId: promo.productId }, `Refresh promotion for ${promo.title}`, "The promotions service will refresh this ready-only draft. This does not publish or send a campaign.")}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh draft</Button>
              </article>)}
                {!data.promotions.length && <p className="rounded-xl border border-dashed border-[#d5d4c6] p-5 text-sm text-[#7c806f]">No ready-only promotion drafts were returned.</p>}
              </div>
            </div>
          </section>
          <section className="mt-8 rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-5 sm:p-7">
            <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#78856f]">Audit history</p><h2 className="mt-1 font-display text-2xl">Recent operation events</h2></div><Clock3 className="h-5 w-5 text-[#788873]" /></div>
            <div className="mt-4 divide-y divide-[#e2dfd4]">{data.events.map((event) => <div key={event.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p className="text-sm">{words(event.action)}</p><p className="font-mono text-[10px] text-[#858a7b]">{words(event.resourceType)} · {event.resourceId}</p></div><p className="text-xs text-[#757b6b]">{words(event.result)}</p><p className="font-mono text-[10px] text-[#858a7b]">{time(event.at)}</p><span className="font-mono text-[9px] text-[#999989]">{event.id}</span></div>)}
              {!data.events.length && <p className="py-6 text-sm text-[#7c806f]">No operation events are recorded in this snapshot.</p>}
            </div>
          </section>
          <p className="mt-6 text-right font-mono text-[9px] tracking-wider text-[#818676]">SNAPSHOT · {time(data.generatedAt)} · REV {data.pipelineRevision}</p>
        </>}
    </div>
    {command.isError && <div role="alert" className="fixed bottom-5 left-5 right-5 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-[#d9b9a7] bg-[#f8eee8] p-4 text-sm text-[#805749] shadow-xl"><span className="flex-1">{command.error instanceof Error ? command.error.message : "Command was not accepted."}</span><button aria-label="Dismiss error" onClick={() => command.reset()} className="rounded-full p-1 hover:bg-[#ead8ce]"><X className="h-4 w-4" /></button></div>}
    {command.isSuccess && <div role="status" className="fixed bottom-5 left-5 right-5 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-[#c3d1b8] bg-[#edf2e9] p-4 text-sm text-[#52664b] shadow-xl"><span className="flex-1">Command submitted. Check the updated server snapshot and event history for its recorded result.</span><button aria-label="Dismiss confirmation" onClick={() => command.reset()} className="rounded-full p-1 hover:bg-[#dce8d5]"><X className="h-4 w-4" /></button></div>}
    {confirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26322b]/55 p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !command.isPending) setConfirmation(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="command-confirm-title" className="w-full max-w-lg rounded-[1.5rem] border border-[#d5d4c6] bg-[#f7f4eb] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#9a745d]">Explicit confirmation</p><h2 id="command-confirm-title" className="mt-2 font-display text-2xl">{confirmation.title}</h2></div><button aria-label="Close confirmation" disabled={command.isPending} onClick={() => setConfirmation(null)} className="rounded-full p-2 text-[#7a806f] hover:bg-[#e8e7dc]"><X className="h-4 w-4" /></button></div>
        <p className="mt-4 text-sm leading-6 text-[#737866]">{confirmation.explanation}</p><div className="mt-4 rounded-xl bg-[#e9e9de] p-3 font-mono text-[10px] text-[#757b6b]">ACTION · {confirmation.action}<br />SUBJECT · {confirmation.subjectType} / {confirmation.subjectId}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={command.isPending} onClick={() => setConfirmation(null)}>Cancel</Button><Button disabled={command.isPending} onClick={execute} className="bg-[#536c57] text-white hover:bg-[#435a47]">{command.isPending ? "Submitting…" : "Confirm and send"}</Button></div>
      </section>
    </div>}
  </main>;
}
