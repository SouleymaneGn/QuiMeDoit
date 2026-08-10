# Carnet+ — Plan de développement phasé

## Contexte

Le projet part d'un template Angular "AilAdmin" (TailAdmin) déjà partiellement épuré vers Carnet+ : les routes et la sidebar n'exposent déjà que Dashboard/Client/Paiement (stubs vides), et le kit UI Tailwind (boutons, modales, tables, formulaires) est réutilisable tel quel. Il manque entièrement la couche données/services : aucun HttpClient, aucun repository, aucun JSON mock, aucun usage de Signals à ce jour (l'état existant utilise des BehaviorSubject RxJS pour la sidebar/le thème).

Objectif : construire Carnet+ phase par phase, avec validation utilisateur à chaque étape, sans jamais connecter Supabase pour l'instant. L'architecture doit permettre de remplacer plus tard le repository JSON par un repository Supabase sans toucher aux composants ni aux services.

**Décisions validées avec l'utilisateur :**
- Données créées via l'UI (nouveau client, dette, paiement) : **en mémoire seulement**, perdues au rafraîchissement (pas de localStorage pour l'instant).
- Page Paramètres : **nouvelle page dédiée**, sobre, scopée aux besoins d'un commerçant (pas de réutilisation de `/profile` avec ses champs adresse/réseaux sociaux).
- Navigation mobile : **sidebar existante** (off-canvas/hamburger), pas de bottom tab bar pour la V1.

**Décisions par défaut (raisonnables, à ajuster si besoin en cours de route) :**
- Devise GNF affichée en séparateur d'espace sans décimales : `500 000 GNF`.
- Solde positif (client débiteur) affiché en rouge/warning discret ; solde à zéro en neutre — usage sobre des badges, pas de grosses cards colorées.
- Les modales "Nouvelle dette" / "Recevoir un paiement" sont des composants partagés uniques, ouverts depuis Accueil, Fiche client et Paiements (évite la duplication).
- Le stub vide `shared/components/transactions/customer-details/` est abandonné ; la fiche client est créée proprement sous `src/app/pages/customer-detail/`.
- Paiements : période par défaut = mois en cours.
- Tout est en français, pas d'i18n pour la V1.

---

## Phase 0 — Fondations architecture & données mock

**But :** poser la couche Components → Services → Repository → JSON mock, invisible pour l'utilisateur final mais prérequis à tout le reste.

**Fichiers à créer :**
- `src/app/core/models/customer.model.ts` — `Customer { id, name, phone, createdAt }`
- `src/app/core/models/transaction.model.ts` — `Transaction { id, customerId, type: 'DEBT'|'PAYMENT', label, amount, paymentMethod, createdAt }`, `type PaymentMethod = 'CASH'|'ORANGE_MONEY'|'MOBILE_MONEY'`
- `src/app/core/models/profile.model.ts` — profil commerçant (nom, nom commerce, téléphone, devise)
- `src/app/core/repositories/customer.repository.ts`, `transaction.repository.ts`, `profile.repository.ts` — classes abstraites servant de jeton d'injection (`getAll`, `getById`, `create`, `update`, `getByCustomerId`, `getByDateRange`...)
- `src/app/core/repositories/json/json-customer.repository.ts`, `json-transaction.repository.ts`, `json-profile.repository.ts` — implémentations via `HttpClient` lisant `assets/mock/*.json`, mutations en mémoire uniquement
- `src/app/core/services/customer.service.ts`, `transaction.service.ts`, `profile.service.ts` — état en Angular Signals (`signal`, `computed`), injectent les repositories abstraits
- `src/app/core/utils/balance.util.ts` — `computeBalance(transactions): number` = somme(DEBT) − somme(PAYMENT), fonction pure réutilisée partout
- `src/app/core/utils/currency.util.ts` — formatage GNF centralisé
- `src/assets/mock/customers.json`, `transactions.json`, `profile.json` — ~20-30 clients, ~80-150 transactions réalistes sur plusieurs semaines, quelques clients à zéro et quelques gros débiteurs

**Fichiers à modifier :**
- `angular.json` — ajouter `src/assets` aux assets buildés
- `src/app/app.config.ts` — ajouter `provideHttpClient()` + fournir les implémentations JSON pour chaque jeton de repository

**Vérification :** `ng serve` compile sans erreur ; via un log temporaire ou la devtools console, confirmer que `CustomerService`/`TransactionService` chargent bien les données mock. Aucun changement visuel attendu — c'est un point de validation avant d'attaquer l'UI.

---

## Phase 1 — Accueil

Remplace `EcommerceComponent` sur la route `''`.

**Fichiers à créer :**
- `src/app/pages/accueil/accueil.component.ts/.html` — "Bonjour [nom]", deux boutons d'action (`ui/button`), stat sobre "À récupérer: X GNF" / "X clients débiteurs" (computed), liste des dernières activités
- `src/app/shared/components/modals/new-debt-modal/` — modale partagée (`ui/modal`) : client, libellé, montant → `TransactionService.create(type: 'DEBT')`
- `src/app/shared/components/modals/new-payment-modal/` — modale partagée : client, montant, mode de paiement, libellé, date → `TransactionService.create(type: 'PAYMENT')`

**Fichiers à modifier :**
- `src/app/app.routes.ts` — route `''` → `AccueilComponent`
- `src/app/shared/layout/app-sidebar/app-sidebar.component.ts` (ligne ~33) — renommer "Dashboard" en "Accueil"

**Réutilisé :** `ui/button`, `ui/modal`, `form/select`, `form/input`, `form/date-picker`, layout/sidebar/header inchangés.

**Vérification :** `/` affiche le message de bienvenue ; "+ Nouvelle dette" ouvre la modale, soumission en <10s, le stat "À récupérer" et l'activité récente se mettent à jour immédiatement.

---

## Phase 2 — Clients (liste + fiche client)

**Fichiers à créer :**
- `src/app/shared/components/modals/new-customer-modal/` — nom + téléphone → `CustomerService.create()`
- `src/app/pages/customer-detail/customer-detail.component.ts/.html` — nom, téléphone, solde calculé, boutons Nouvelle dette/Paiement (modales Phase 1 pré-remplies avec le client), historique des transactions du client, état vide si aucune transaction

**Fichiers à modifier :**
- `src/app/pages/customers/customers.component.ts/.html` — remplacer le stub : recherche, table clients (nom/téléphone/solde calculé, coloré sobrement), clic ligne → fiche client, bouton "+ Nouveau client"
- `src/app/app.routes.ts` — ajouter route enfant `customers/:id` → `CustomerDetailComponent`

**Réutilisé :** `ui/table` (pattern de `recent-orders`/`product-list-table`), `ui/modal`, `ui/badge`, modales Phase 1.

**Vérification :** `/customers` liste les clients avec solde correct ; recherche filtre en direct ; clic sur un client ouvre sa fiche avec historique chronologique ; nouvelle dette/paiement depuis la fiche met à jour solde + historique instantanément ; un nouveau client créé affiche bien un état vide à solde 0.

---

## Phase 3 — Paiements

**Fichiers à modifier :**
- `src/app/pages/payments/payments.component.ts/.html` — remplacer le stub : filtre de date (défaut = mois en cours), total reçu sur la période, liste des paiements (`type === 'PAYMENT'`), bouton "Recevoir un paiement" (modale Phase 1, client choisi dans la modale)

**Réutilisé :** modale paiement Phase 1, `ui/table`, `form/date-picker`.

**Vérification :** `/payments` affiche le mois en cours par défaut, total cohérent avec la liste ; changer la période met à jour total + liste ; "Recevoir un paiement" ajoute une entrée visible immédiatement.

---

## Phase 4 — Paramètres

Page dédiée Carnet+, volontairement minimale — aucun champ hérité du profil AilAdmin (pas d'adresse, pas de réseaux sociaux, pas d'avatar upload).

**Contenu exact de la page (V1) :**
- Nom du commerce
- Téléphone
- Devise (GNF par défaut)
- Déconnexion

**Fichiers à créer :**
- `src/app/pages/parametres/parametres.component.ts/.html` — nouvelle page  affichant les 4 champs ci-dessus, lecture des données via `ProfileService` (lui-même injectant `ProfileRepository` → `JsonProfileRepository` → `assets/mock/profile.json`, posé en Phase 0). Réutilise les composants UI existants pertinents (`form/input`, `form/label`, `ui/button` pour l'action Déconnexion) sans réutiliser la page `/profile` ni ses cards (`UserMetaCard`, `UserInfoCard`, `UserAddressCard`).
- `src/app/core/models/profile.model.ts` (déjà prévu en Phase 0) — s'assurer que les champs correspondent exactement à ce besoin : `businessName`, `phone`, `currency` (+ champs internes éventuels comme `id`)

**Fichiers à modifier :**
- `src/app/app.routes.ts` — ajouter route `parametres` → `ParametresComponent` (la route `profile` existante n'est pas réutilisée ; à retirer en Phase 5 cleanup)
- `src/app/shared/layout/app-sidebar/app-sidebar.component.ts` — ajouter le 4ᵉ item "Paramètres" avec icône SVG dédiée, dans l'ordre Accueil/Clients/Paiements/Paramètres

**Vérification :** la sidebar affiche exactement 4 items dans le bon ordre ; `/parametres` affiche nom du commerce/téléphone/devise issus de `profile.json` via `ProfileService` (pas de données codées en dur) ; le bouton Déconnexion est visible et cliquable (comportement réel de déconnexion hors scope V1 tant qu'il n'y a pas d'auth Supabase — simple action UI pour l'instant, à clarifier si besoin).

---

## Phase 5 — Nettoyage du template

**Fichiers à supprimer/modifier (une fois les 4 pages validées) :**
- Pages non routées sous `src/app/pages/` (`ui-elements`, `charts`, `calender`, `invoices`, `tables`, `blank`, ancien `ecommerce` si totalement remplacé, `profile` si non réutilisé)
- Dépendances devenues inutiles dans `package.json` (amCharts5, ApexCharts, FullCalendar, Swiper, Prism) — vérifier par grep qu'aucun composant conservé n'en dépend avant suppression (`flatpickr` reste nécessaire pour `form/date-picker`)
- Composants partagés orphelins correspondants (wrappers charts/calendrier)

**Vérification :** `ng build` réussit, bundle réduit, les 4 pages réelles fonctionnent toujours, aucune erreur console/import cassé.

---

## Notes d'exécution

- Chaque phase doit être validée par l'utilisateur avant de passer à la suivante (approche demandée explicitement : pas de développement en une seule fois).
- Aucune infrastructure de test automatisé n'existe dans ce projet — la vérification de chaque phase se fait manuellement dans le navigateur (`ng serve`).
- Fichiers critiques déjà identifiés : `src/app/app.routes.ts`, `src/app/app.config.ts`, `src/app/shared/layout/app-sidebar/app-sidebar.component.ts`, `angular.json`.
