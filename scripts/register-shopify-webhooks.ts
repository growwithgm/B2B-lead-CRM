/**
 * Registers the Shopify webhooks the CRM needs, via the Admin GraphQL API.
 *
 * Subscribes ORDERS_FULFILLED and ORDERS_PAID to the app's webhook endpoint so
 * the pipeline advances automatically (sample_shipped on fulfillment, converted
 * on a non-sample paid order).
 *
 * Run it once (and again if the URL changes):
 *   npx tsx scripts/register-shopify-webhooks.ts
 *
 * Required env (same as the app, plus the callback URL):
 *   SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_TOKEN, SHOPIFY_API_VERSION
 *   SHOPIFY_WEBHOOK_CALLBACK_URL   (defaults to the production endpoint)
 *
 * After Shopify delivers webhooks, set SHOPIFY_WEBHOOK_SECRET in the app to the
 * value Shopify signs with (Settings → Notifications → Webhooks shows it, or it
 * is your app's client secret / API secret depending on app type).
 */

const TOPICS = ["ORDERS_FULFILLED", "ORDERS_PAID"] as const;

const DEFAULT_CALLBACK = "https://b2-b-lead-crm.vercel.app/api/shopify/webhooks";

interface UserError {
  field?: string[] | null;
  message?: string;
}

interface CreateData {
  webhookSubscriptionCreate?: {
    webhookSubscription?: { id?: string } | null;
    userErrors?: UserError[] | null;
  } | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message?: string }[];
}

async function main(): Promise<void> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";
  const callbackUrl = process.env.SHOPIFY_WEBHOOK_CALLBACK_URL || DEFAULT_CALLBACK;

  if (!domain || !token) {
    console.error(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN in the environment."
    );
    process.exit(1);
    return;
  }

  const url = `https://${domain}/admin/api/${apiVersion}/graphql.json`;
  const mutation = `
    mutation Register($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }
  `;

  console.log(`Registering webhooks → ${callbackUrl}\n`);

  for (const topic of TOPICS) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: { topic, sub: { callbackUrl, format: "JSON" } },
      }),
    });

    const text = await res.text();
    let parsed: GraphQLResponse<CreateData> = {};
    try {
      parsed = text ? (JSON.parse(text) as GraphQLResponse<CreateData>) : {};
    } catch {
      console.error(`${topic}: invalid JSON response (HTTP ${res.status}): ${text}`);
      continue;
    }

    if (parsed.errors && parsed.errors.length > 0) {
      console.error(`${topic}: ${parsed.errors.map((e) => e.message).join("; ")}`);
      continue;
    }

    const userErrors = parsed.data?.webhookSubscriptionCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      // "already taken" just means the subscription exists — that's fine.
      console.warn(`${topic}: ${userErrors.map((e) => e.message).join("; ")}`);
      continue;
    }

    const id = parsed.data?.webhookSubscriptionCreate?.webhookSubscription?.id;
    console.log(`${topic}: subscribed (${id ?? "ok"})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
