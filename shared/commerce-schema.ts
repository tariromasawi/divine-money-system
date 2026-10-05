import {pgTable,text,integer,boolean,timestamp,jsonb,bigint,customType,unique,index,uniqueIndex,check} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import {products,users,orders,orderItems} from "./schema";
const binary=customType<{data:Buffer;driverData:Buffer}>({dataType:()=>"bytea"});
const at=(name:string)=>timestamp(name,{withTimezone:true}).notNull().defaultNow();
export const commerceSpecs=pgTable("commerce_specs",{
  productId:text("product_id").primaryKey().references(()=>products.id),specHash:text("spec_hash").notNull(),
  adapter:text("adapter").notNull(),specification:jsonb("specification").notNull(),state:text("state").notNull().default("draft"),
  artifactId:text("artifact_id"),acceptancePassed:boolean("acceptance_passed").notNull().default(false),
  acceptanceEvidence:jsonb("acceptance_evidence").notNull().default({}),qaExpiresAt:timestamp("qa_expires_at",{withTimezone:true}),
  errorCode:text("error_code"),buildAttempts:integer("build_attempts").notNull().default(0),
  nextBuildAt:at("next_build_at"),updatedAt:at("updated_at"),
  operatorPaused:boolean("operator_paused").notNull().default(false),
  generationRevision:integer("generation_revision").notNull().default(0)});
export const commerceControls=pgTable("commerce_controls",{
  subsystem:text("subsystem").primaryKey(),paused:boolean("paused").notNull().default(false),updatedAt:at("updated_at")});
export const commerceOperationRequests=pgTable("commerce_operation_requests",{
  requestKey:text("request_key").primaryKey(),fingerprint:text("fingerprint").notNull(),actorId:text("actor_id").notNull(),
  result:jsonb("result").notNull(),createdAt:at("created_at")});
export const commercePromotions=pgTable("commerce_promotions",{
  productId:text("product_id").primaryKey().references(()=>products.id),specHash:text("spec_hash").notNull(),
  title:text("title").notNull(),description:text("description").notNull(),seoTitle:text("seo_title").notNull(),
  seoDescription:text("seo_description").notNull(),campaign:text("campaign").notNull(),updatedAt:at("updated_at")});
export const commerceDependencyHealth=pgTable("commerce_dependency_health",{
  dependency:text("dependency").primaryKey(),state:text("state").notNull(),safeDetails:jsonb("safe_details").notNull().default({}),checkedAt:at("checked_at")});
export const commerceProviderRefunds=pgTable("commerce_provider_refunds",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().unique().references(()=>orders.id),
  state:text("state").notNull().default("QUEUED"),providerRefundId:text("provider_refund_id").unique(),
  attempts:integer("attempts").notNull().default(0),owner:text("owner"),leaseUntil:timestamp("lease_until",{withTimezone:true}),
  nextAttemptAt:at("next_attempt_at"),errorCode:text("error_code"),startedAt:timestamp("started_at",{withTimezone:true}),
  completedAt:timestamp("completed_at",{withTimezone:true}),createdAt:at("created_at")});
export const commerceArtifacts=pgTable("commerce_artifacts",{
  id:text("id").primaryKey(),productId:text("product_id").notNull().references(()=>products.id),
  specHash:text("spec_hash").notNull(),version:integer("version").notNull(),scope:text("scope").notNull().default("generic"),
  userId:text("user_id").references(()=>users.id),generationMethod:text("generation_method").notNull(),
  format:text("format").notNull().default("zip"),checksum:text("checksum").notNull(),qaResult:jsonb("qa_result").notNull(),
  packageStatus:text("package_status").notNull(),packageData:binary("package_data").notNull(),contentText:text("content_text").notNull(),
  createdAt:at("created_at")},t=>[unique().on(t.productId,t.specHash,t.scope),check("commerce_artifact_version",sql`${t.version}>0`),
    check("commerce_artifact_package_status",sql`${t.packageStatus} IN ('DELIVERABLE','INVALID')`)]);
export const commerceOrderInputs=pgTable("commerce_order_inputs",{
  orderId:text("order_id").primaryKey().references(()=>orders.id),userId:text("user_id").notNull().references(()=>users.id),
  inputs:jsonb("inputs").notNull().default({})});
export const commerceOrderProducts=pgTable("commerce_order_products",{
  itemId:text("item_id").primaryKey().references(()=>orderItems.id),productId:text("product_id").notNull().references(()=>products.id),
  specHash:text("spec_hash").notNull(),specification:jsonb("specification").notNull(),
  artifactId:text("artifact_id").notNull().references(()=>commerceArtifacts.id)});
export const commerceJobs=pgTable("commerce_jobs",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().references(()=>orders.id),
  itemId:text("item_id").notNull().unique().references(()=>orderItems.id),productId:text("product_id").notNull().references(()=>products.id),
  userId:text("user_id").notNull().references(()=>users.id),specHash:text("spec_hash").notNull(),specification:jsonb("specification").notNull(),
  artifactId:text("artifact_id"),state:text("state").notNull().default("PAYMENT_VERIFIED"),attempts:integer("attempts").notNull().default(0),
  errorCode:text("error_code"),owner:text("owner"),leaseUntil:timestamp("lease_until",{withTimezone:true}),
  nextAttemptAt:at("next_attempt_at"),createdAt:at("created_at"),updatedAt:at("updated_at")},t=>[index("commerce_jobs_due").on(t.nextAttemptAt,t.state)]);
export const commerceNotifications=pgTable("commerce_notifications",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().unique().references(()=>orders.id),
  userId:text("user_id").notNull().references(()=>users.id),message:text("message").notNull(),read:boolean("read").notNull().default(false),createdAt:at("created_at")});
export const commerceEmailOutbox=pgTable("commerce_email_outbox",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().unique().references(()=>orders.id),state:text("state").notNull().default("pending"),
  attempts:integer("attempts").notNull().default(0),owner:text("owner"),leaseUntil:timestamp("lease_until",{withTimezone:true}),
  nextAttemptAt:at("next_attempt_at"),errorCode:text("error_code"),sentAt:timestamp("sent_at",{withTimezone:true}),
  sendStartedAt:timestamp("send_started_at",{withTimezone:true})});
export const commerceRefundRequests=pgTable("commerce_refund_requests",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().unique().references(()=>orders.id),
  userId:text("user_id").notNull().references(()=>users.id),reason:text("reason").notNull(),
  state:text("state").notNull().default("REQUESTED"),createdAt:at("created_at")});
export const commerceJournal=pgTable("commerce_journal",{
  id:text("id").primaryKey(),orderId:text("order_id").notNull().references(()=>orders.id),kind:text("kind").notNull(),
  currency:text("currency").notNull(),amountMinor:bigint("amount_minor",{mode:"bigint"}).notNull(),
  debitAccount:text("debit_account").notNull(),creditAccount:text("credit_account").notNull(),createdAt:at("created_at")},
  t=>[unique().on(t.orderId,t.kind),check("commerce_journal_positive",sql`${t.amountMinor}>0`)]);
export const commerceFactoryJobs=pgTable("commerce_factory_jobs",{
  id:text("id").primaryKey(),kind:text("kind").notNull(),state:text("state").notNull().default("pending"),owner:text("owner"),
  leaseUntil:timestamp("lease_until",{withTimezone:true}),errorCode:text("error_code"),createdAt:at("created_at"),
  completedAt:timestamp("completed_at",{withTimezone:true})},t=>[uniqueIndex("commerce_factory_jobs_active_kind").on(t.kind).where(sql`${t.state} IN ('pending','processing')`)]);
