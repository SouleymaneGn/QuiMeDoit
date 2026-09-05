// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Voir abonement.md, Phase 5 (réécrite avec la vraie doc docs.saspay.me).
// SaaSPay n'a pas de notion de "client" persistant : une session de checkout
// prend directement customer_email/customer_name dans sa requête de création.
// Cette fonction est le SEUL endroit où SAASPAY_SECRET_KEY existe.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SAASPAY_SECRET_KEY = Deno.env.get("SAASPAY_SECRET_KEY");
const SAASPAY_API_BASE_URL = Deno.env.get("SAASPAY_API_BASE_URL") ?? "https://api.saspay.me/api/v1";
const SAASPAY_PLAN_AMOUNT = Deno.env.get("SAASPAY_PLAN_AMOUNT") ?? "2000";
const SAASPAY_PLAN_CURRENCY = Deno.env.get("SAASPAY_PLAN_CURRENCY") ?? "XOF";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!SAASPAY_SECRET_KEY) {
    console.error("SAASPAY_SECRET_KEY manquant — configurer via `supabase secrets set`.");
    return jsonResponse({ error: "Configuration SaaSPay manquante côté serveur." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authentification requise." }, 401);
  }

  try {
    // Client "utilisateur" : identifie qui appelle et lit son propre profil (JWT transmis par Angular).
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Utilisateur non authentifié." }, 401);
    }
    const userId = userData.user.id;

    // Email/nom confirmés par l'utilisateur dans le modal de paiement côté Angular.
    // Filet de sécurité si l'appel arrive sans corps (ancien client, test manuel) :
    // on retombe sur l'email du compte / le nom du profil.
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    let email = typeof body["customerEmail"] === "string" ? (body["customerEmail"] as string).trim() : "";
    let customerName = typeof body["customerName"] === "string" ? (body["customerName"] as string).trim() : "";
    const returnUrl = typeof body["returnUrl"] === "string" ? (body["returnUrl"] as string).trim() : "";

    if (!email) {
      email = userData.user.email ?? "";
    }
    if (!customerName) {
      const { data: profile } = await supabaseUser
        .from("profiles")
        .select("owner_name, business_name")
        .eq("id", userId)
        .maybeSingle();
      customerName = profile?.business_name || profile?.owner_name || "Commerçant QuiMeDoit";
    }

    if (!email) {
      return jsonResponse({ error: "Email requis pour préparer le paiement." }, 400);
    }

    const origin = req.headers.get("origin") ?? Deno.env.get("APP_ORIGIN") ?? "";
    // return_url vient du client (Angular `environment.saaspayReturnUrl`, page de
    // remerciement dédiée) ; repli sur l'ancien comportement (retour vers l'abonnement) si absent.
    const finalReturnUrl = returnUrl || `${origin}/app/abonnement?status=pending`;

    // Endpoint et payload confirmés par docs.saspay.me (Phase 5, abonement.md).
    const checkoutResponse = await fetch(`${SAASPAY_API_BASE_URL}/checkout-sessions/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SAASPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(SAASPAY_PLAN_AMOUNT).toFixed(2),
        currency: SAASPAY_PLAN_CURRENCY,
        customer_email: email,
        customer_name: customerName,
        description: "Abonnement QuiMeDoit - 1 mois",
        return_url: finalReturnUrl,
        // À vérifier en sandbox (cf. abonement.md) : cette metadata est-elle
        // bien répercutée dans le webhook transaction.success ? C'est notre
        // clé de corrélation privilégiée si oui.
        metadata: { user_id: userId },
      }),
    });

    if (!checkoutResponse.ok) {
      console.error(
        "Échec de la création de la session de paiement SaaSPay",
        checkoutResponse.status,
        await checkoutResponse.text()
      );
      return jsonResponse({ error: "Impossible de préparer le paiement." }, 502);
    }

    // L'API SaaSPay enveloppe toujours ses réponses dans { success, data, code }
    // (confirmé en sandbox — l'exemple de la doc officielle montre les champs
    // à plat, ce qui ne correspond pas au comportement réel observé).
    const checkoutData = await checkoutResponse.json();
    const session = checkoutData?.data ?? checkoutData;
    const checkoutUrl: string | undefined = session?.checkout_url;
    const checkoutSessionId: string | undefined = session?.id;

    if (!checkoutUrl || !checkoutSessionId) {
      console.error('Réponse SaaSPay "créer session" inattendue', checkoutData);
      return jsonResponse({ error: "Réponse SaaSPay inattendue." }, 502);
    }

    // Client "service role" : seul habilité à écrire dans subscriptions (RLS lecture seule pour le client).
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({ saaspay_checkout_session_id: checkoutSessionId })
      .eq("id", userId);
    if (updateError) throw updateError;

    return jsonResponse({ checkoutUrl });
  } catch (err) {
    console.error("Erreur inattendue dans create-checkout", err);
    return jsonResponse({ error: "Erreur interne." }, 500);
  }
});

/* Pour tester en local :

  1. `supabase start`
  2. `supabase secrets set --env-file ./supabase/.env.local SAASPAY_SECRET_KEY=sk_test_...`
  3. curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-checkout' \
       --header 'Authorization: Bearer <jwt utilisateur>'

*/
