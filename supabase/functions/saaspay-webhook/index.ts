// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Voir abonement.md, Phase 5 (réécrite avec la vraie doc docs.saspay.me).
// Endpoint public (verify_jwt=false dans supabase/config.toml) : SaaSPay
// appelle directement, sans JWT Supabase. Configuration de l'URL et des
// évènements uniquement depuis le dashboard SaaSPay (pas d'API pour ça).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SAASPAY_WEBHOOK_SECRET = Deno.env.get("SAASPAY_WEBHOOK_SECRET");

const PERIOD_DAYS = 30;
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Schéma réel confirmé par docs.saspay.me : en-tête `X-Webhook-Signature`
 * (hex SHA-256 HMAC minuscule) calculé sur "{timestamp}.{body}", où
 * {timestamp} vient de l'en-tête `X-Webhook-Timestamp` (tolérance 300s).
 */
async function isSignatureValid(req: Request, rawBody: string): Promise<boolean> {
  if (!SAASPAY_WEBHOOK_SECRET) {
    console.warn(
      "SAASPAY_WEBHOOK_SECRET non configuré — signature NON vérifiée. À corriger avant la mise en production."
    );
    return true;
  }

  const signatureHeader = req.headers.get("x-webhook-signature");
  const timestampHeader = req.headers.get("x-webhook-timestamp");
  if (!signatureHeader || !timestampHeader) {
    console.warn("En-tête de signature ou de timestamp SaaSPay absent.");
    return false;
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    console.warn("Timestamp du webhook SaaSPay hors tolérance (rejeu possible).");
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SAASPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestampHeader}.${rawBody}`;
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signatureHeader;
}

interface SaaspayTransactionPayload {
  event: string;
  data?: {
    id?: string;
    reference?: string;
    status?: string;
    metadata?: { user_id?: string };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non supportée." }, 405);
  }

  const rawBody = await req.text();

  const validSignature = await isSignatureValid(req, rawBody);
  if (!validSignature) {
    return jsonResponse({ error: "Signature invalide." }, 401);
  }

  let payload: SaaspayTransactionPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Corps JSON invalide." }, 400);
  }

  // Treize catégories d'évènements existent côté SaaSPay ; seules celles-ci nous concernent.
  if (payload.event === "webhook.test") {
    return jsonResponse({ ok: true, test: true });
  }
  if (!["transaction.success", "transaction.failed", "transaction.cancelled"].includes(payload.event)) {
    console.warn("Évènement SaaSPay ignoré (hors scope abonnement)", payload.event);
    return jsonResponse({ ok: true, ignored: true });
  }

  // [À VÉRIFIER EN SANDBOX — cf. abonement.md] rien dans l'exemple de payload
  // transaction.success documenté ne montre metadata ni id de session de
  // checkout : c'est notre seule piste de corrélation connue à ce jour.
  // Si elle n'est pas répercutée en pratique, aucune reconciliation fiable
  // n'est possible depuis ce webhook seul (l'API ne permet pas de filtrer
  // les sessions de checkout par transaction/référence) — un mécanisme de
  // vérification actif côté client (GET /checkout-sessions/{id} avec l'id
  // qu'on a nous-mêmes stocké à la création) sera alors nécessaire en
  // complément, pas encore implémenté.
  const userId = payload.data?.metadata?.user_id;
  const paymentReference = payload.data?.reference ?? payload.data?.id ?? null;

  if (!userId) {
    console.error(
      "Webhook SaaSPay sans metadata.user_id exploitable — reconciliation impossible depuis ce seul évènement",
      payload
    );
    return jsonResponse({ ok: true, unmatched: true });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing, error: findError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, last_payment_reference")
    .eq("id", userId)
    .maybeSingle();

  if (findError) {
    console.error("Erreur lors de la recherche de l'abonnement pour le webhook", findError);
    return jsonResponse({ error: "Erreur interne." }, 500);
  }
  if (!existing) {
    console.error("Aucun abonnement trouvé pour cet utilisateur", userId);
    return jsonResponse({ ok: true, unmatched: true });
  }

  // Anti-doublon simple : si cette référence de paiement a déjà été traitée, on ne réapplique rien.
  if (paymentReference && existing.last_payment_reference === paymentReference) {
    return jsonResponse({ ok: true, deduped: true });
  }

  let update: Record<string, unknown>;

  if (payload.event === "transaction.success") {
    const currentPeriodEndsAt = new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    update = {
      status: "active",
      current_period_ends_at: currentPeriodEndsAt,
      last_payment_reference: paymentReference,
    };
  } else if (payload.event === "transaction.failed") {
    update = { status: "past_due" };
  } else {
    update = { status: "canceled" };
  }

  const { error: updateError } = await supabaseAdmin.from("subscriptions").update(update).eq("id", existing.id);

  if (updateError) {
    console.error("Échec de la mise à jour de l'abonnement depuis le webhook", updateError);
    return jsonResponse({ error: "Erreur interne." }, 500);
  }

  return jsonResponse({ ok: true });
});

/* Pour simuler un évènement (cf. abonement.md, checklist de vérification) :

  curl -X POST https://wsgnygfeecloqjqworwu.functions.supabase.co/saaspay-webhook \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Timestamp: $(date +%s)" \
    -H "X-Webhook-Signature: <hmac calculé avec SAASPAY_WEBHOOK_SECRET>" \
    -d '{"event":"transaction.success","data":{"reference":"TXN-TEST-1","metadata":{"user_id":"<uuid utilisateur>"}}}'

*/
