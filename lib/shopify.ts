// Shopify Admin GraphQL API helper (server-side only).
//
// Required env vars (NEVER expose to the browser):
//   - SHOPIFY_STORE_DOMAIN     e.g. my-store.myshopify.com
//   - SHOPIFY_ADMIN_API_TOKEN  custom-app Admin API access token
//   - SHOPIFY_API_VERSION      e.g. 2024-10 (defaults to "2024-10" if unset)
//
// Required custom-app Admin API access scopes:
//   - read_customers
//   - write_customers
//   - read_orders
//
// Endpoint:
//   POST https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json
// Headers:
//   X-Shopify-Access-Token: ${SHOPIFY_ADMIN_API_TOKEN}
//   Content-Type: application/json

const DEFAULT_API_VERSION = "2024-10";

export interface ShopifyResult<T> {
  ok: boolean;
  data?: T;
  errors?: string;
  status: number;
}

interface GraphQLError {
  message?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Low-level Shopify Admin GraphQL helper. Never throws: network failures and
 * missing config are surfaced via the returned object (status 0).
 */
export async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<ShopifyResult<T>> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;

  if (!domain || !token) {
    return { ok: false, status: 0, errors: "Shopify not configured" };
  }

  const url = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, status: 0, errors: message };
  }

  const status = res.status;

  // Defensive JSON parse — Shopify may return HTML on auth/rate-limit errors.
  let parsed: unknown;
  try {
    const text = await res.text();
    parsed = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status,
      errors: `Invalid JSON response (HTTP ${status})`,
    };
  }

  if (!res.ok) {
    let errors = `HTTP ${status}`;
    if (isRecord(parsed) && Array.isArray(parsed.errors)) {
      const joined = (parsed.errors as GraphQLError[])
        .map((e) => e?.message)
        .filter((m): m is string => typeof m === "string")
        .join("; ");
      if (joined) errors = joined;
    } else if (isRecord(parsed) && typeof parsed.errors === "string") {
      errors = parsed.errors;
    }
    return { ok: false, status, errors };
  }

  const body = parsed as GraphQLResponse<T>;

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const joined = body.errors
      .map((e) => e?.message)
      .filter((m): m is string => typeof m === "string")
      .join("; ");
    return {
      ok: false,
      status,
      errors: joined || "GraphQL error",
      data: body.data,
    };
  }

  return { ok: true, status, data: body.data };
}

// --- Helpers --------------------------------------------------------------

function normalizeCustomerGid(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith("gid://")) return trimmed;
  // Tolerate a bare numeric id.
  return `gid://shopify/Customer/${trimmed}`;
}

interface UserError {
  field?: string[] | null;
  message?: string;
}

function joinUserErrors(errors: UserError[] | undefined | null): string {
  if (!errors || errors.length === 0) return "";
  return errors
    .map((e) => e?.message)
    .filter((m): m is string => typeof m === "string" && m.length > 0)
    .join("; ");
}

// --- createOrFindCustomer --------------------------------------------------

interface CustomerNode {
  id: string;
}

interface FindCustomerData {
  customers?: {
    edges?: { node?: CustomerNode | null }[] | null;
  } | null;
}

interface CustomerCreateData {
  customerCreate?: {
    customer?: CustomerNode | null;
    userErrors?: UserError[] | null;
  } | null;
}

export async function createOrFindCustomer(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  company?: string | null;
}): Promise<{
  ok: boolean;
  customerId?: string;
  created?: boolean;
  error?: string;
}> {
  const email = input.email.trim();
  if (!email) {
    return { ok: false, error: "Email is required" };
  }

  // 1) Try to find an existing customer by email.
  const findQuery = `
    query FindCustomer($query: String!) {
      customers(first: 1, query: $query) {
        edges { node { id } }
      }
    }
  `;
  // Escape double quotes in the email for the search query string.
  const safeEmail = email.replace(/"/g, '\\"');
  const found = await shopifyGraphQL<FindCustomerData>(findQuery, {
    query: `email:"${safeEmail}"`,
  });

  if (!found.ok) {
    return { ok: false, error: found.errors ?? "Failed to query customer" };
  }

  const existingId = found.data?.customers?.edges?.[0]?.node?.id;
  if (existingId) {
    return { ok: true, customerId: existingId, created: false };
  }

  // 2) Create the customer.
  const company = input.company?.trim();
  const note = company ? `Company: ${company}` : null;
  const tags = company ? [company] : undefined;

  const createMutation = `
    mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }
  `;

  const customerInput: Record<string, unknown> = { email };
  if (input.firstName) customerInput.firstName = input.firstName;
  if (input.lastName) customerInput.lastName = input.lastName;
  if (input.phone) customerInput.phone = input.phone;
  if (note) customerInput.note = note;
  if (tags) customerInput.tags = tags;

  const created = await shopifyGraphQL<CustomerCreateData>(createMutation, {
    input: customerInput,
  });

  if (!created.ok) {
    return { ok: false, error: created.errors ?? "Failed to create customer" };
  }

  const userErr = joinUserErrors(created.data?.customerCreate?.userErrors);
  if (userErr) {
    return { ok: false, error: userErr };
  }

  const newId = created.data?.customerCreate?.customer?.id;
  if (!newId) {
    return { ok: false, error: "Customer was not created" };
  }

  return { ok: true, customerId: normalizeCustomerGid(newId), created: true };
}

// --- getCustomerOrders -----------------------------------------------------

interface OrderNode {
  displayFinancialStatus?: string | null;
  createdAt?: string | null;
  totalPriceSet?: {
    shopMoney?: { amount?: string | null } | null;
  } | null;
}

interface CustomerOrdersData {
  customer?: {
    id?: string;
    orders?: {
      edges?: { node?: OrderNode | null }[] | null;
    } | null;
  } | null;
}

export async function getCustomerOrders(customerId: string): Promise<{
  ok: boolean;
  orderCount: number;
  totalSpent: number;
  paidCount: number;
  lastOrderAt: string | null;
  error?: string;
}> {
  const gid = normalizeCustomerGid(customerId);

  const query = `
    query CustomerOrders($id: ID!) {
      customer(id: $id) {
        id
        orders(first: 50) {
          edges {
            node {
              displayFinancialStatus
              createdAt
              totalPriceSet { shopMoney { amount } }
            }
          }
        }
      }
    }
  `;

  const res = await shopifyGraphQL<CustomerOrdersData>(query, { id: gid });

  if (!res.ok) {
    return {
      ok: false,
      orderCount: 0,
      totalSpent: 0,
      paidCount: 0,
      lastOrderAt: null,
      error: res.errors ?? "Failed to query orders",
    };
  }

  const customer = res.data?.customer;
  if (!customer) {
    return {
      ok: false,
      orderCount: 0,
      totalSpent: 0,
      paidCount: 0,
      lastOrderAt: null,
      error: "Customer not found",
    };
  }

  const edges = customer.orders?.edges ?? [];

  let orderCount = 0;
  let paidCount = 0;
  let totalSpent = 0;
  let lastOrderAt: string | null = null;

  for (const edge of edges) {
    const node = edge?.node;
    if (!node) continue;
    orderCount += 1;

    if (node.displayFinancialStatus === "PAID") {
      paidCount += 1;
    }

    const amount = node.totalPriceSet?.shopMoney?.amount;
    if (amount) {
      const value = Number.parseFloat(amount);
      if (Number.isFinite(value)) totalSpent += value;
    }

    const createdAt = node.createdAt;
    if (createdAt) {
      if (!lastOrderAt || new Date(createdAt) > new Date(lastOrderAt)) {
        lastOrderAt = createdAt;
      }
    }
  }

  // Avoid float drift in the summed total.
  totalSpent = Math.round(totalSpent * 100) / 100;

  return { ok: true, orderCount, totalSpent, paidCount, lastOrderAt };
}
