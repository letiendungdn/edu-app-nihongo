import Stripe from "stripe";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

/** Stripe fields retained when pinning apiVersion `2024-12-18.acacia`. */
export type LegacyStripeSubscription = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

export type ExpandedStripeInvoice = Stripe.Invoice & {
  payment_intent?: Stripe.PaymentIntent | string | null;
  confirmation_secret?: { client_secret: string } | null;
  subscription?: string | Stripe.Subscription | null;
};

export type SubscriptionPeriod = {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
};

function unixToDate(seconds: number | null | undefined): Date | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getSubscriptionPeriod(
  sub: Stripe.Subscription,
): SubscriptionPeriod {
  const legacy = sub as LegacyStripeSubscription;
  const item = sub.items?.data?.[0] as
    { current_period_start?: number; current_period_end?: number } | undefined;

  return {
    currentPeriodStart: unixToDate(
      legacy.current_period_start ?? item?.current_period_start,
    ),
    currentPeriodEnd: unixToDate(
      legacy.current_period_end ?? item?.current_period_end,
    ),
  };
}

/** Chỉ ghi field period khi Stripe trả timestamp hợp lệ (tránh Invalid Date). */
export function subscriptionPeriodPrismaData(period: SubscriptionPeriod) {
  return {
    ...(period.currentPeriodStart
      ? { currentPeriodStart: period.currentPeriodStart }
      : {}),
    ...(period.currentPeriodEnd
      ? { currentPeriodEnd: period.currentPeriodEnd }
      : {}),
  };
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    trialing: SubscriptionStatus.TRIALING,
    paused: SubscriptionStatus.PAUSED,
    incomplete: SubscriptionStatus.PAST_DUE,
    incomplete_expired: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.PAST_DUE,
  };
  return statusMap[status];
}

export function isStripeSubscriptionEntitled(
  status: Stripe.Subscription.Status,
): boolean {
  return status === "active" || status === "trialing";
}

export function resolveSubscriptionPlan(params: {
  stripeStatus: Stripe.Subscription.Status;
  targetPlan: SubscriptionPlan;
  currentPlan?: SubscriptionPlan | null;
  metadataPlan?: string | null;
}): SubscriptionPlan {
  const metaPlan = params.metadataPlan as SubscriptionPlan | undefined;
  const desiredPlan = metaPlan ?? params.targetPlan;
  if (isStripeSubscriptionEntitled(params.stripeStatus)) {
    return desiredPlan;
  }
  return params.currentPlan ?? SubscriptionPlan.FREE;
}

export function getInvoiceClientSecret(
  invoice: Stripe.Invoice | string | null,
): string {
  if (!invoice || typeof invoice === "string") {
    throw new Error("Expanded invoice required for client secret");
  }

  const expanded = invoice as ExpandedStripeInvoice;
  if (
    typeof expanded.payment_intent === "object" &&
    expanded.payment_intent?.client_secret
  ) {
    return expanded.payment_intent.client_secret;
  }

  if (expanded.confirmation_secret?.client_secret) {
    return expanded.confirmation_secret.client_secret;
  }

  throw new Error("Invoice is missing payment client secret");
}

/** Client secret for Payment Element — invoice PI, confirmation_secret, or trial setup intent. */
export function getSubscriptionClientSecret(
  subscription: Stripe.Subscription,
): string {
  const setup = subscription.pending_setup_intent;
  if (typeof setup === "object" && setup?.client_secret) {
    return setup.client_secret;
  }

  const invoice = subscription.latest_invoice;
  if (invoice && typeof invoice !== "string") {
    return getInvoiceClientSecret(invoice);
  }

  throw new Error("Subscription is missing payment client secret");
}

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  const expanded = invoice as ExpandedStripeInvoice;
  if (!expanded.subscription) return null;
  return typeof expanded.subscription === "string"
    ? expanded.subscription
    : expanded.subscription.id;
}
