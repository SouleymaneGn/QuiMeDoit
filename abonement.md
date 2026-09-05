# Plan — Abonnement payant (SaaSPay) pour QuiMeDoit

## Contexte

QuiMeDoit est aujourd'hui gratuit et sans aucune notion d'abonnement : le
modèle `Profile` (`src/app/core/models/profile.model.ts`) ne contient que
`ownerName/businessName/phone/currency`, et `authGuard` ne vérifie qu'une
session Supabase valide, pas de statut de paiement. Le but de ce plan est
d'ajouter un abonnement payant via **SaaSPay** : un accès gratuit limité à
**10 clients**, puis un blocage total de l'application tant que l'abonnement
n'est pas payé.

**Décisions déjà actées :**
- Un seul plan payant, **2000 XOF/mois** + **quota gratuit de 10 clients**
  (valeur ajustable facilement), au-delà blocage total tant que l'abonnement
  n'est pas payé.
- Blocage total : hors quota gratuit/abonnement actif, tout `/app/*`
  redirige vers une page d'abonnement — seule cette page (+ déconnexion)
  reste accessible.
- Prix du plan en **XOF** (franc CFA) — indépendant de la devise
  d'affichage propre à chaque commerçant (`ProfileService.formatAmount`,
  qui reste par ex. en GNF pour un compte guinéen : ce sont deux choses
  différentes, le prix de l'abonnement lui-même vs. l'unité dans laquelle un
  commerçant affiche ses propres dettes clients).
- Pas de nouvel item de menu (respecte la contrainte du projet : seuls
  Accueil / Clients / Paiements / Paramètres existent) — la page d'abonnement
  est atteinte par redirection automatique ou par un lien dans Paramètres.

---

## Mise à jour — vraie documentation SaaSPay (docs.saspay.me)

Les phases 0 à 6 ci-dessous ont déjà été codées **avant** la lecture de la
vraie documentation SaaSPay, sur la base d'hypothèses placeholder. Après
lecture de `docs.saspay.me`, voici ce qui change réellement — cette section
fait foi sur les points en désaccord avec le texte des phases plus bas :

- **Authentification** : `Authorization: Bearer sk_live_...` (prod) /
  `sk_test_...` (sandbox). La clé s'obtient uniquement via le dashboard
  SaaSPay, au bout d'un parcours qui ne peut pas être automatisé depuis ce
  repo : création de compte → vérification email → connexion → création
  d'un "merchant" → dossier **KYC** → **approbation humaine côté SaaSPay**
  → génération de la clé (scope `PAYIN` suffisant pour ce cas d'usage).
  → Je n'ai pas besoin de tes identifiants de connexion SaaSPay (email/mot
  de passe) : je ne peux de toute façon pas valider le KYC à ta place. La
  seule chose qu'il me faudra, une fois la clé générée par toi, c'est la
  valeur `sk_live_...`/`sk_test_...` à poser via
  `supabase secrets set SAASPAY_SECRET_KEY=...` — idéalement que tu lances
  toi-même cette commande pour ne jamais faire transiter le secret ici.
- **Pas de "client" à créer séparément.** Contrairement à l'hypothèse
  initiale, `POST /checkout-sessions/` prend `customer_email`/
  `customer_name`/`customer_phone` directement dans la requête — pas
  d'endpoint "créer un client" ni d'identifiant client persistant. **Ça
  simplifie `create-checkout` : toute l'étape "récupérer/créer
  `saaspay_customer_id`" décrite en Phase 5 disparaît.**
- **Endpoint réel** : `POST https://api.saspay.me/api/v1/checkout-sessions/`
  → réponse `201` avec `checkout_url`, `id` (id de la session), `status`
  (`PENDING` → `SUCCESS`/`FAILED`, `CANCELLED` existe mais non atteint sur ce
  flux), `created_at`. Un seul champ de retour (`return_url`), pas de
  `success_url`/`cancel_url` séparés comme supposé initialement.
- **Webhooks** : se configurent **uniquement depuis le dashboard SaaSPay**
  (pas d'API pour ça). Évènements réels (parmi treize au total) pertinents
  ici : `transaction.success`, `transaction.failed`, `transaction.cancelled`
  (+ `webhook.test` pour valider la configuration). Signature dans l'en-tête
  `X-Webhook-Signature` (hex SHA-256 HMAC minuscule), calculée sur
  `"{timestamp}.{body}"` où `{timestamp}` vient de l'en-tête
  `X-Webhook-Timestamp` (tolérance de 300s) — schéma précis, plus besoin de
  placeholder ici.
- **Aucun abonnement récurrent natif.** SaaSPay ne fait que de l'encaissement
  ponctuel (checkout, softpay, liens de paiement) — confirmé explicitement
  par la doc ("aucune section dédiée aux abonnements récurrents"). Donc
  **`current_period_ends_at` n'est jamais fourni par SaaSPay** : c'est
  l'app qui doit le calculer elle-même (`now() + 30 jours`) au moment où le
  webhook confirme un `transaction.success`, et c'est l'app qui devra un
  jour re-proposer un paiement avant/à l'échéance (pas dans le scope de ce
  plan pour l'instant — noté comme suite logique de la Phase 7).
- **Conséquence sur la Phase 1 (déjà codée) : `hasAppAccess` a un bug à
  corriger.** Sans renouvellement automatique, un compte `active` dont
  `current_period_ends_at` est dépassé ne doit plus donner accès — la
  fonction actuelle (`src/app/core/utils/subscription.util.ts`) renvoie
  `true` pour `status==='active'` sans jamais regarder cette date. À corriger
  quand on recodera cette partie : `status==='active'` ne suffit plus, il
  faut aussi `currentPeriodEndsAt` dans le futur.
- **Bug réel trouvé et corrigé (testé en sandbox)** : un tiret cadratin
  `—` dans le champ `description` envoyé à `/checkout-sessions/` fait
  échouer le parsing JSON côté serveur SaaSPay (`invalid start byte`,
  `400`), même si la chaîne est un JSON valide côté client. Remplacé par un
  tiret simple `-` dans `create-checkout/index.ts`. À retenir : éviter toute
  ponctuation non-ASCII dans les champs texte envoyés à leur API.
- **Deuxième bug réel trouvé et corrigé (testé en sandbox)** : la doc
  officielle montre un exemple de réponse à plat (`{ id, checkout_url,
  status, created_at }`), mais l'API réelle enveloppe systématiquement ses
  réponses dans `{ success, data, code }` — `checkout_url`/`id` sont donc
  dans `data.checkout_url`/`data.id`, pas à la racine. La première version
  de `create-checkout` lisait ces champs à la racine, ce qui les rendait
  toujours `undefined` et aurait dû déclencher notre erreur "Réponse SaaSPay
  inattendue" à chaque tentative. Corrigé (`session = checkoutData?.data ??
  checkoutData`, avec repli si jamais l'enveloppe change).
- **Bonne nouvelle confirmée en sandbox** : `metadata.user_id` envoyé à la
  création est bien accepté et répercuté dans la réponse de
  `/checkout-sessions/` (`data.metadata.user_id`). Reste à confirmer que
  c'est aussi le cas dans le *webhook* `transaction.success` lui-même (pas
  encore testé), mais c'est un bon signe pour la stratégie de corrélation
  retenue.
- **Point encore incertain, à vérifier en sandbox avant de coder le
  webhook** : l'exemple de payload `transaction.success` vu dans la doc
  (`id, reference, type, status, amount, fee, charged, net_amount,
  currency, country, network, msisdn`) ne montre ni `metadata` ni
  d'identifiant de session de checkout — juste un id/référence de
  *transaction*. Pour relier ce webhook à l'utilisateur QuiMeDoit concerné,
  il faudra soit confirmer que le `metadata` passé à la création du
  checkout (`metadata: { user_id }`) est bien répercuté dans l'évènement
  webhook réel (à tester en sandbox, la doc ne le garantit pas
  explicitement), soit stocker l'`id` de la session de checkout créée et
  interroger `GET /checkout-sessions/{id}/` pour retrouver la transaction et
  son statut. Tant que ce n'est pas vérifié en sandbox, le code du webhook
  doit rester tolérant (logger et répondre 200 sans planter si aucune
  correspondance n'est trouvée), jamais supposer que la corrélation marche
  du premier coup.

---

## Architecture retenue

Respecte le pattern déjà en place dans le repo :
`Composants → Services → Repository (classe abstraite) → Supabase`.

L'état d'abonnement va dans une **table Supabase dédiée `subscriptions`**
(pas des colonnes sur `profiles`), pour deux raisons : elle n'est écrite que
par le serveur (trigger + webhook via service role), jamais par le client,
et son cycle de vie (paiement externe) diffère de celui du profil (édité
librement par l'utilisateur via `ProfileService.update()`).

Le quota gratuit, lui, ne se stocke nulle part : il se calcule à la volée à
partir du nombre de clients déjà chargés par `CustomerService.customers()`
(`.length`), exactement comme le solde d'un client se calcule à partir des
transactions plutôt que d'être stocké (cf. règle déjà en place dans
`TransactionService`).

---

## Phase 0 — Base de données (Supabase)

- **Le dossier `supabase/` n'existe pas encore dans ce repo** (pas de CLI
  scaffold, pas de migrations, pas d'Edge Functions) — cette phase le crée.
- `supabase init`, puis `supabase link` vers le projet existant
  (`wsgnygfeecloqjqworwu`, voir `src/environment/environment.ts`).
- Nouvelle migration `supabase/migrations/<timestamp>_create_subscriptions.sql`
  créant la table `subscriptions` (1 ligne par utilisateur, PK = `id` =
  `auth.users.id`) :

  | Colonne | Type | Rôle |
  |---|---|---|
  | `id` | `uuid` PK → `profiles(id)` | 1:1 avec l'utilisateur |
  | `status` | `text` (`free`/`active`/`past_due`/`canceled`) | pilote l'accès |
  | `current_period_ends_at` | `timestamptz` nullable | calculé par l'app (`now()+30j`) au moment du webhook `transaction.success` — SaaSPay ne fournit pas de date de renouvellement (pas d'abonnement récurrent natif, cf. section "Mise à jour" ci-dessus) |
  | `saaspay_checkout_session_id` | `text` nullable | id de la dernière session de checkout créée (`POST /checkout-sessions/` → `id`), sert à relier un webhook à l'utilisateur |
  | `last_payment_reference` | `text` nullable | `reference`/`id` de la transaction SaaSPay, anti-doublon webhook |
  | `created_at` / `updated_at` | `timestamptz default now()` | audit |

  (Pas de colonne de type "date de fin d'essai" — le quota gratuit n'est pas
  temporel, il se recalcule à chaque chargement à partir du nombre de
  clients réel.)

- RLS activée : politique `select` limitée à `id = auth.uid()` ; **aucune
  politique d'écriture pour le rôle `authenticated`** — les seules écritures
  viennent du trigger de provisioning et des Edge Functions (service role).
- Étendre le trigger d'auto-provisioning existant (celui qui crée déjà la
  ligne `profiles` — à retrouver/documenter dans une migration si non versionné)
  pour insérer aussi une ligne `subscriptions` avec `status='free'`.
- Filet de sécurité côté client : `SupabaseSubscriptionRepository.get()`
  s'auto-répare comme le fait déjà `SupabaseProfileRepository.get()` si la
  ligne manque (insertion par défaut `status='free'` côté client).

---

## Phase 1 — Modèle & utilitaire partagé

- `src/app/core/models/subscription.model.ts` : type `SubscriptionStatus`
  (`'free' | 'active' | 'past_due' | 'canceled'`), interface `Subscription`
  (`id, status, currentPeriodEndsAt, saaspayCheckoutSessionId`),
  interface `CheckoutSession { checkoutUrl: string }`.
  **(nom de champ à corriger : le code actuel a encore
  `saaspayCustomerId`/`saaspaySubscriptionId`, hérités des placeholders —
  cf. section "Mise à jour" : SaaSPay n'a pas de notion de client/abonnement
  persistant, seulement des sessions de checkout.)**
- `src/app/core/utils/subscription.util.ts` :
  - Constante `FREE_CUSTOMER_LIMIT = 10` (seule valeur à changer si le quota
    évolue).
  - Fonction pure `hasAppAccess(subscription: Subscription | null,
    customerCount: number): boolean` :
    - `status === 'active'` **ET** `currentPeriodEndsAt` pas encore dépassé
      → accès autorisé, quel que soit `customerCount`. **(correction à
      appliquer : le code actuel ignore encore `currentPeriodEndsAt`, ce qui
      était sans conséquence tant qu'on pensait avoir un vrai renouvellement
      automatique — ce n'est plus le cas, cf. section "Mise à jour".)**
    - `status === 'past_due'` ou `'canceled'`, ou `'active'` avec période
      expirée → accès refusé (l'utilisateur a déjà dépassé le stade gratuit,
      a résilié, ou son mois payé est terminé — pas de retour au quota
      gratuit).
    - `status === 'free'` (ou `subscription === null`, cas de secours) →
      autorisé seulement si `customerCount <= FREE_CUSTOMER_LIMIT`.
  - Cette fonction est la source unique de vérité, utilisée à la fois par le
    guard et par l'UI.
  - Hypothèse à valider : `customerCount` = nombre de clients actuellement
    en base (`customerService.customers().length`), donc si un client est
    supprimé, le quota se libère automatiquement. À confirmer que c'est le
    comportement voulu (sinon il faudrait un compteur cumulatif séparé,
    jamais décrémenté).

---

## Phase 2 — Repository

- `src/app/core/repositories/subscription.repository.ts` (classe abstraite,
  même forme que `ProfileRepository`) : `get(): Observable<Subscription>`,
  `createCheckoutSession(): Observable<CheckoutSession>`.
- `src/app/core/repositories/supabase/supabase-subscription.repository.ts` :
  - `get()` : identique au pattern de `SupabaseProfileRepository.get()`
    (lecture + auto-réparation si ligne manquante, `status='free'` par défaut).
  - `createCheckoutSession()` : **n'appelle jamais SaaSPay directement.**
    Appelle l'Edge Function via
    `this.supabaseService.client.functions.invoke('create-checkout', {})`
    (le JWT est transmis automatiquement). C'est le premier endroit du repo
    qui invoque une Edge Function.
- `src/app/app.config.ts` : ajouter
  `{ provide: SubscriptionRepository, useClass: SupabaseSubscriptionRepository }`.
  Pas de variante JSON mock nécessaire (concept intrinsèquement lié au
  backend live).

---

## Phase 3 — Service

- `src/app/core/services/subscription.service.ts` (même forme que
  `ProfileService`) : signal `subscription`, `load()`, `startCheckout()`.
  Recharge/vide sur `onAuthStateChange`, comme
  `ProfileService`/`CustomerService`/`TransactionService`.
  - `computed hasAccess` : injecte aussi `CustomerService` et calcule
    `hasAppAccess(this.subscription(), this.customerService.customers().length)`
    — combine donc l'état d'abonnement ET le nombre de clients actuel dans
    un seul signal réactif (si l'utilisateur supprime un client et repasse
    sous 10, `hasAccess` redevient vrai automatiquement, sans recharger la
    page).
- `src/app/guards/auth.guard.ts` : ajouter `subscriptionService.load()` à
  côté des appels `loadAll()`/`load()` déjà présents (le chargement des
  clients via `customerService.loadAll()` s'y trouve déjà), pour que l'état
  d'abonnement soit chargé à chaque entrée dans `/app`.

---

## Phase 4 — Garde de route

- `src/app/guards/subscription.guard.ts` : `CanActivateFn` asynchrone.
  Pour éviter une décision prise avant la fin du chargement (clients et
  abonnement peuvent encore valoir leurs valeurs initiales juste après la
  navigation), le guard s'appuie sur une méthode
  `SubscriptionService.ensureLoaded()` qui attend la première résolution
  réelle avant de statuer — même esprit que `authGuard` qui `await`e déjà
  `getSession()`.
  - `hasAccess` (Phase 3) vrai → `true`.
  - Sinon → `router.parseUrl('/app/abonnement')`.
- `src/app/app.routes.ts` :
  - Nouvelle route enfant `abonnement` (composant `AbonnementComponent`),
    **sans** `subscriptionGuard` (doit rester joignable même bloqué).
  - `canActivate: [subscriptionGuard]` ajouté sur `''` (Accueil),
    `customers`, `customers/:id`, `payments`, `profile`, **et `parametres`**
    (le blocage total demandé inclut explicitement Paramètres). La
    déconnexion reste possible directement depuis la page Abonnement
    (Phase 6), pas besoin d'exception dans le guard.

---

## Phase 5 — Edge Functions Supabase

**Réécriture complète suite à la vraie doc SaaSPay** (le code déjà en place
suit encore l'ancienne version placeholder — à refaire) :

- `supabase/functions/create-checkout/index.ts` : appelée par le client
  (JWT transmis, comme avant). Plus d'étape "récupérer/créer un client
  SaaSPay" (ça n'existe pas dans leur API). Directement :
  1. Identifier l'utilisateur via son JWT (`supabase.auth.getUser()`), lire
     son email et son nom (`ProfileService`/table `profiles`).
  2. `POST https://api.saspay.me/api/v1/checkout-sessions/` avec en-tête
     `Authorization: Bearer <SAASPAY_SECRET_KEY>` et payload :
     ```json
     {
       "amount": "2000.00",
       "currency": "XOF",
       "customer_email": "<email de l'utilisateur>",
       "customer_name": "<owner_name ou business_name>",
       "description": "Abonnement QuiMeDoit — 1 mois",
       "return_url": "<origin>/app/abonnement?status=pending",
       "metadata": { "user_id": "<id utilisateur Supabase>" }
     }
     ```
     (`amount`/`currency` viennent des secrets `SAASPAY_PLAN_AMOUNT`/
     `SAASPAY_PLAN_CURRENCY`, pas en dur — `metadata.user_id` est notre clé
     de corrélation côté webhook, **à vérifier en sandbox qu'elle est bien
     répercutée**, cf. section "Mise à jour".)
  3. Réponse `201` → `{ id, checkout_url, status, created_at }`. Stocker
     `id` dans `subscriptions.saaspay_checkout_session_id` (via client
     service role), puis renvoyer `{ checkoutUrl: checkout_url }` au client.
  Le secret `SAASPAY_SECRET_KEY` (`sk_live_...`/`sk_test_...`) ne vit que
  côté fonction, jamais dans le bundle Angular.
- `supabase/functions/saaspay-webhook/index.ts` : endpoint public
  (`verify_jwt=false`, déjà posé dans `config.toml`). **La configuration de
  l'URL de webhook se fait uniquement depuis le dashboard SaaSPay — pas
  d'API pour ça**, donc étape manuelle obligatoire (cf. checklist).
  - Vérifie la signature : en-tête `X-Webhook-Signature` (hex SHA-256 HMAC,
    minuscule), calculée sur `"{timestamp}.{body}"` où `{timestamp}` vient
    de l'en-tête `X-Webhook-Timestamp` (tolérance 300s), avec
    `SAASPAY_WEBHOOK_SECRET`. Schéma désormais réel, plus un placeholder.
  - Évènements traités : `transaction.success` → tente de relier via
    `metadata.user_id` si présent, sinon via l'`id`/référence de
    transaction en interrogeant `GET /checkout-sessions/` filtré par
    `saaspay_checkout_session_id` connu ; met à jour `subscriptions` :
    `status='active'`, `current_period_ends_at = now() + 30 jours`
    (**calculé par nous**, pas fourni par SaaSPay), `last_payment_reference
    = reference`. `transaction.failed` → `status='past_due'`.
    `transaction.cancelled` → `status='canceled'`. `webhook.test` et tout
    autre évènement → loggé et ignoré (réponse 200).
  - Anti-doublon via `last_payment_reference` (comparaison à la `reference`
    reçue). Répond 200 vite en cas de succès pour éviter les retry-storms ;
    répond 200 également (avec log d'erreur) si la corrélation
    utilisateur échoue, plutôt que de faire échouer indéfiniment les
    retentatives du fournisseur sur un cas qu'on ne saura de toute façon
    pas résoudre automatiquement.

---

## Phase 6 — Page Abonnement (nouvelle, non gardée)

- `src/app/pages/abonnement/abonnement.component.ts` + `.html`. Réutilise
  `app-badge`, `app-button`, `app-skeleton` (aucun nouveau composant UI).
  États (dérivés de `subscription()` + `customerService.customers().length`) :
  1. **Chargement** : skeletons.
  2. **Gratuit, sous le quota** : badge info "Gratuit" + "X / 10 clients
     utilisés" + bouton "Passer à l'abonnement payant" (accès non bloqué,
     page atteignable volontairement pour payer en avance).
  3. **Quota gratuit atteint** (`status==='free'` et `customerCount >= 10`) :
     badge avertissement + "Vous avez atteint la limite de 10 clients
     gratuits. Passez à l'abonnement payant pour continuer à ajouter des
     clients." + bouton "Payer avec SaaSPay".
  4. **`past_due`/`canceled`** : badge erreur + "Abonnement expiré/impayé.
     Réglez votre abonnement pour retrouver l'accès." + bouton "Payer avec
     SaaSPay".
  5. **`active`** : badge succès + "Renouvellement le {{ currentPeriodEndsAt
     | date }}".
  6. **Retour de SaaSPay** : si un paramètre de statut est présent dans
     l'URL de retour, bandeau "Paiement en cours de confirmation" — le vrai
     changement de statut vient uniquement du webhook, jamais de ce
     paramètre.
- Bouton "Payer avec SaaSPay" → directement (pas de modal, un modal de
  confirmation a été essayé puis retiré) : récupère l'email du compte
  (`SupabaseService.getUser()`) et le nom depuis le profil
  (`businessName`/`ownerName`), puis appelle
  `subscriptionService.startCheckout({ customerEmail, customerName })` →
  redirection plein écran (`window.location.href`) vers l'URL SaaSPay.
  `SubscriptionRepository.createCheckoutSession()` et l'Edge Function
  `create-checkout` acceptent ces deux champs en entrée (avec repli côté
  fonction sur l'email du compte / le nom du profil si jamais absents).
- Inclut un bouton "Déconnexion" (même logique que
  `ParametresComponent.logout()`), pour qu'un utilisateur bloqué garde un
  moyen de se déconnecter sans passer par Paramètres (désormais gardé).

---

## Phase 7 — Rappel dans Paramètres

- `parametres.component.ts/html` : petite carte "Mon abonnement" (même
  style que les cartes existantes) affichant le statut (`app-badge`), le
  compteur "X / 10 clients utilisés" si le compte est encore gratuit, et un
  bouton vers `/app/abonnement`. Visible uniquement pendant l'accès
  autorisé (la page est gardée), utile pour payer en avance ou vérifier la
  date de renouvellement.
- Prix affiché : 2000 XOF/mois, en dur ou lu depuis une constante partagée
  (à définir — actuellement `SAASPAY_PLAN_AMOUNT`/`SAASPAY_PLAN_CURRENCY` ne
  vivent que côté Edge Function ; si on veut l'afficher aussi côté
  Paramètres/Abonnement sans dupliquer la valeur, prévoir une petite
  constante côté Angular, ex. dans `subscription.util.ts`, à tenir
  synchronisée avec les secrets Supabase).
- **Suite logique, hors scope immédiat** : comme SaaSPay ne renouvelle rien
  automatiquement (cf. "Mise à jour" en tête de fichier), un compte `active`
  finira par expirer sans qu'aucun webhook ne prévienne à l'avance. Il
  faudra à terme un rappel (ex. sur la page Abonnement ou par un bandeau)
  quand `current_period_ends_at` approche, pour éviter qu'un commerçant
  découvre le blocage total sans préavis. Pas codé dans cette Phase 7 —
  à traiter comme une Phase 8 si tu veux l'ajouter.

---

## Fichiers clés à créer/modifier

- `supabase/migrations/<ts>_create_subscriptions.sql` (nouveau)
- `supabase/functions/create-checkout/index.ts`,
  `supabase/functions/saaspay-webhook/index.ts` (nouveaux)
- `src/app/core/models/subscription.model.ts` (nouveau)
- `src/app/core/utils/subscription.util.ts` (nouveau)
- `src/app/core/repositories/subscription.repository.ts` +
  `src/app/core/repositories/supabase/supabase-subscription.repository.ts` (nouveaux)
- `src/app/core/services/subscription.service.ts` (nouveau)
- `src/app/guards/subscription.guard.ts` (nouveau)
- `src/app/guards/auth.guard.ts`, `src/app/app.config.ts`,
  `src/app/app.routes.ts` (modifiés)
- `src/app/pages/abonnement/abonnement.component.ts/.html` (nouveau)
- `src/app/pages/parametres/parametres.component.ts/.html` (modifié)

---

## Checklist — mise en place manuelle (hors code)

- [ ] Créer le compte SaaSPay (toi, pas moi) : compte utilisateur → vérifier
      l'email → créer un "merchant" → dossier KYC → **attendre l'approbation
      SaaSPay** → générer une clé API avec le scope `PAYIN` (`sk_test_...`
      pour commencer). Je n'ai pas besoin de tes identifiants de connexion
      SaaSPay — juste de la clé une fois générée.
- [ ] `supabase secrets set SAASPAY_SECRET_KEY=sk_test_... SAASPAY_API_BASE_URL=https://api.saspay.me/api/v1 SAASPAY_PLAN_AMOUNT=2000 SAASPAY_PLAN_CURRENCY=XOF`
      (à faire toi-même dans ton terminal pour que la clé ne transite jamais
      par cette conversation).
- [ ] Une fois la Phase 5 recodée avec les vrais endpoints : déployer
      (`supabase functions deploy create-checkout` /
      `supabase functions deploy saaspay-webhook --no-verify-jwt`).
- [ ] Configurer le webhook **depuis le dashboard SaaSPay** (pas d'API pour
      ça) → URL `https://wsgnygfeecloqjqworwu.functions.supabase.co/saaspay-webhook`,
      événements `transaction.success` / `transaction.failed` /
      `transaction.cancelled`. Récupérer le secret de signature affiché et
      le poser via `supabase secrets set SAASPAY_WEBHOOK_SECRET=...`.
      Utiliser `webhook.test` depuis le dashboard pour vérifier la
      configuration avant de passer en réel.
- [ ] Confirmer si le quota de 10 clients gratuits compte tous les clients
      créés un jour, ou seulement les clients actuellement présents
      (comportement par défaut retenu dans ce plan : clients actuellement
      présents, donc supprimer un client libère de la place).

## Checklist — points encore réellement incertains

Tout ce qui suit a été confirmé par la vraie doc SaaSPay et n'a donc plus
besoin d'être deviné (endpoint/payload checkout, auth Bearer, schéma de
signature webhook, absence de renouvellement automatique, devises/pays
supportés). Il ne reste que :

- [ ] **Corrélation webhook → utilisateur** : vérifier en sandbox si
      `metadata.user_id` passé à la création du checkout est bien répété
      dans le payload `transaction.success`, ou s'il faut reconstituer le
      lien via `GET /checkout-sessions/{id}/`.
- [ ] Le format exact du payload `transaction.failed` (non documenté, seul
      le nom de l'évènement est garanti) — à observer via un vrai test
      d'échec en sandbox, ou via "Lister l'historique de livraison"
      (`/api-reference/webhooks/logs-list`) après une tentative.
- [ ] Confirmer qu'un montant `"2000.00"` (string décimale) sur `currency:
      "XOF"` est bien interprété comme 2000 XOF et pas 2000 divisé/multiplié
      par une unité mineure quelconque — à vérifier sur le premier paiement
      sandbox avant de passer en prod.

## Vérification / test

- **Quota gratuit** : créer un compte test → vérifier la ligne
  `subscriptions` (`status='free'`) → ajouter jusqu'à 10 clients → tout
  `/app/*` reste accessible.
- **Dépassement du quota** : ajouter un 11e client (ou, plus rapide en test,
  réduire temporairement `FREE_CUSTOMER_LIMIT` dans le code) → vérifier que
  toutes les routes gardées redirigent vers `/app/abonnement`, qui reste
  accessible, avec déconnexion fonctionnelle.
- **Libération du quota** : supprimer un client pour repasser sous 10 →
  vérifier que l'accès redevient possible sans avoir à se reconnecter
  (réactivité du signal `hasAccess`).
- **Pas de faux redirect** : rafraîchir plusieurs fois juste après connexion
  pour vérifier l'absence de redirection prématurée (course avec le
  chargement async des clients/abonnement).
- **Paiement (sandbox, `sk_test_...`)** : cliquer "Payer avec SaaSPay" →
  vérifier dans `supabase functions logs create-checkout` que
  `POST /checkout-sessions/` répond `201`, que `saaspay_checkout_session_id`
  est bien enregistré, et que la redirection vers `checkout_url` fonctionne.
- **Webhook réel** : utiliser le bouton `webhook.test` du dashboard SaaSPay
  pour vérifier que l'URL/signature sont correctement configurées avant tout
  test de paiement réel. Puis faire un vrai paiement sandbox de bout en
  bout et vérifier que `transaction.success` met bien à jour `subscriptions`
  (`status='active'`, `current_period_ends_at` ≈ +30 jours), que ça donne
  accès même au-delà de 10 clients, et qu'un renvoi du même évènement
  (double livraison) n'applique pas deux fois le changement.
- **Expiration de la période payée** : une fois la correction de la Phase 1
  appliquée (`hasAppAccess` doit regarder `currentPeriodEndsAt`), forcer
  cette date dans le passé via SQL pour un compte `active` → vérifier que
  l'accès redevient bloqué malgré `status='active'`.
