# Carnet+ — Landing Page publique (v2, inspirée de dailykash.app)

## Contexte

La Landing Page V1 (déjà codée : header, hero, "Comment ça marche", fonctionnalités, CTA final, footer) est fonctionnelle mais minimale. L'utilisateur veut s'en inspirer davantage de la structure de [dailykash.app](https://www.dailykash.app/) — un concurrent direct (gestion financière pour freelances africains) dont la landing page est plus riche et plus persuasive. Objectif : enrichir la structure de la page (nouvelles sections) et rendre le message plus direct/orienté-problème, sans changer l'architecture technique déjà en place (toujours `LandingComponent` à `/`, toujours le même système de design).

## Analyse de dailykash.app (référence)

Structure observée : Header → Hero (mockup dashboard + accroche directe) → Preuve sociale (nombre d'utilisateurs) → Démo interactive → 3 problèmes → Comment ça marche (3 étapes) → Fonctionnalités (screenshot dashboard) → Robustesse (3 cartes : accessible, sécurisé, multi-devise) → Tarifs (Gratuit/Premium) → Témoignages → FAQ → CTA final → Footer.

Ton : direct, orienté problème → solution, phrases courtes ("Fini les fichiers Excel complexes", "No action, no cash").

## Ce qu'on adapte et ce qu'on n'adapte PAS

**Adapté à Carnet+ (ajouts par rapport à la V1) :**
- Nouvelle section **"Le problème"** (3 points courts) juste après le hero — inspiré de la section "3 pain points" de dailykash, adapté au carnet de dettes.
- Hero enrichi : la petite carte d'exemple devient une **mini-maquette façon tableau de bord** (salutation + solde à récupérer + dernière activité), plus proche visuellement du mockup dashboard de dailykash, tout en restant statique (pas besoin d'interactivité).
- Nouvelle section **"Disponible partout"** (3 cartes courtes : accessible sur tout appareil, données hébergées en toute sécurité (Supabase), devise adaptable) — inspirée de la section "Robustesse" de dailykash.
- Nouvelle section **FAQ courte** (3-4 questions réellement utiles sur le produit tel qu'il existe : sécurité des données, besoin d'installer une app, changement de devise, gratuité) — inspirée de la FAQ de dailykash.
- En-tête enrichi avec ancres de navigation (Fonctionnalités, Comment ça marche, FAQ) en plus de Connexion/Créer un compte.

**Volontairement PAS adapté (pour rester honnête, pas de contenu inventé) :**
- Pas de badge "Aimé par +X commerçants" ni de compteur d'utilisateurs — Carnet+ n'a pas encore d'utilisateurs réels à afficher.
- Pas de témoignages clients — aucun client réel n'existe encore, en inventer serait un faux avis.
- Pas de section Tarifs — aucune grille tarifaire n'a été définie pour Carnet+, on n'invente pas de prix.
- Pas de "démo interactive" (simulateur cliquable) — la petite carte d'exemple statique suffit, reste simple.
- Le ton reste en "vous" (comme tout le reste de l'app déjà codée — Signin/Signup, Paramètres...), pas en "tu" comme dailykash, pour rester cohérent avec l'existant. On reprend en revanche le style direct/orienté-problème de l'écriture.

## Nouvelle structure de la page (haut en bas)

1. **En-tête** (sticky) : wordmark "Carnet+" + nav ancres ("Fonctionnalités", "Comment ça marche", "FAQ") + boutons Connexion/Créer un compte.
2. **Hero** : accroche directe orientée problème (ex. "Finies les dettes clients qu'on oublie de noter") + sous-titre reprenant le concept Client → Libellé → Montant → Dette/Paiement + 2 CTA + mini-maquette tableau de bord (salutation, "À récupérer", dernière activité) à droite.
3. **Le problème** (3 cartes courtes) : carnet papier qui se perd/s'abîme, impossible de savoir qui doit quoi d'un coup d'œil, relances oubliées faute de suivi.
4. **Comment ça marche** (reprise de la V1, 3 étapes, inchangé).
5. **Fonctionnalités clés** (reprise de la V1, ajustée en 3-4 points).
6. **Disponible partout** (3 cartes courtes, nouveau) : accessible sur tout appareil, données sécurisées, devise adaptable.
7. **FAQ** (nouveau, 3-4 questions/réponses courtes, accordéon simple ou liste statique).
8. **CTA final** (reprise de la V1, inchangé).
9. **Footer** (légèrement enrichi : lien "Fonctionnalités" en plus de Connexion/Créer un compte, toujours minimal).

## Design

Aucun changement de système de design par rapport à la V1 : mêmes tokens (`brand-500`/`brand-950`, `Outfit`, dark mode via `.dark`), même règle de sobriété (pas de grille de grosses cards façon dashboard généré par IA), toujours `app-button` tel quel, toujours SVG à la main (pas de nouvelle dépendance icônes). La FAQ, si présentée en accordéon, peut s'inspirer du pattern déjà présent (mais non routé) dans `shared/components/ui-example/faqs-example/faqs-one` pour la logique d'ouverture/fermeture — à vérifier si réutilisable tel quel ou juste comme référence de style.

## Fichier à modifier

- `src/app/pages/landing/landing.component.html` (+ `.ts` si logique FAQ accordéon nécessite un signal d'état) — réécriture du contenu avec les nouvelles sections, même composant, pas de nouvelle route.

## Vérification

- `ng build` sans erreur.
- Scroll complet de la page : toutes les nouvelles sections s'affichent correctement en clair/sombre et sur mobile.
- Les ancres de navigation du header font défiler vers la bonne section.
- La FAQ (si accordéon) s'ouvre/se ferme correctement.
- Aucun contenu inventé (pas de faux chiffres, faux témoignages, faux tarifs) ne s'est glissé dans le résultat.

---

# Audit de cohérence — Landing page vs application réelle (2026-08-10)

Comparaison entre les promesses de `src/app/pages/landing/` telle qu'elle existe aujourd'hui et ce que l'application (`/app/*`) fait réellement (données mock JSON, pas encore Supabase).

## ✅ Vérifié conforme (pas d'action)

- "Quatre menus, pas un de plus : Accueil, Clients, Paiements, Paramètres" → sidebar réelle = exactement ces 4 items.
- "Solde actuel toujours visible, calculé en temps réel" → solde jamais stocké, toujours recalculé (DETTE - PAIEMENT).
- "Nouvelle dette ou paiement pré-rempli avec ce client, en un clic" → `CustomerDetailComponent` passe `presetCustomerId`/`presetCustomerName` aux modales, qui sautent la sélection du client.
- "Indicatifs téléphoniques de plus de 190 pays avec recherche" → `phone-countries.ts` (193 pays) + champ de recherche réel dans `PhoneInputComponent`.
- "Navigation adaptée au mobile" → menu hamburger réel dans `AppHeaderComponent`.
- Filtre par date + modes de paiement (Espèces / Orange Money / Mobile Money) sur la page Paiements → conforme au modèle `PaymentMethod`.
- "Devise CFA par défaut et modifiable" → conforme au code (`ParametresComponent` défaut `'CFA'`, `assets/mock/profile.json` a `"currency": "CFA"`).

## ⚠️ À corriger / à trancher

### 1. Devise CFA vs numéro guinéen (+224)
Le mock `profile.json` et l'exemple client sur la landing ("Mamadou Diallo", +224) associent un numéro guinéen à la devise "CFA". La Guinée n'utilise pas le franc CFA mais le **GNF (franc guinéen)** — unité utilisée par ailleurs dans les exemples de CLAUDE.md ("500000 GNF"). Le persona de démo contredit la devise par défaut.
- **Statut** : bug de contenu (données de démo)
- **Fichiers concernés** : `src/assets/mock/profile.json`, `src/app/pages/parametres/parametres.component.ts`, exemples dans `landing.component.html`
- **Options** : changer le numéro d'exemple pour un pays de la zone CFA, ou passer la devise par défaut à GNF.

### 2. Titres d'onglet "TailAdmin" résiduels
Les routes `payments`, `profile` et `**` (404) gardent le `title` `"... | TailAdmin - Angular Admin Dashboard Template"` au lieu de "Carnet+".
- **Statut** : incohérence de branding
- **Fichier concerné** : `src/app/app.routes.ts`

### 3. Page `/app/profile` hors périmètre
Une page Profile existe et est routée, alors que CLAUDE.md et la landing ("Quatre menus, pas un de plus") ne mentionnent que Accueil / Clients / Paiements / Paramètres. Pas dans la sidebar, mais probablement accessible via l'avatar.
- **Statut** : décision produit à trancher
- **Options** : fusionner avec Paramètres, supprimer, ou assumer comme page technique hors périmètre marketing.

### 4. Aucune section tarifs/plans
La landing vend un "SaaS" et pousse vers "Créer un compte gratuitement" sans jamais mentionner de plan payant, essai ou limites.
- **Statut** : point ouvert produit (cohérent avec la décision déjà prise plus haut dans ce fichier de ne pas inventer de tarifs — pas un bug)

### 5. Code mort du template d'origine (AilAdmin/TailAdmin)
Pages non utilisées toujours présentes dans le repo : ecommerce dashboard, invoices, tables, charts, calendar, forms, ui-elements, billing. Aucune n'est routée ni liée depuis la landing ou le nav — donc pas d'incohérence visible pour l'utilisateur, mais dette technique à nettoyer plus tard.
- **Statut** : dette technique, secondaire
- **Dossiers concernés** : `src/app/pages/{dashboard/ecommerce,invoices,tables,calender,charts,forms,ui-elements,blank}`, `src/app/shared/components/ecommerce/*`
