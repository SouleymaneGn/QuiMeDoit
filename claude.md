Je développe Carnet+, un SaaS de carnet de dettes destiné aux commerçants africains.

IMPORTANT :
Je veux d'abord développer toute l'interface avec des FAUSSES DONNÉES JSON.
Je connecterai Supabase plus tard.

Stack :
- Angular
- AilAdmin comme template UI existant
- TypeScript
- Angular Signals
- données mock JSON pour la première phase

Ne mets PAS Supabase pour le moment.

VISION PRODUIT :

Carnet+ V1 est volontairement très simple.

Le concept central est :

Client → Libellé → Montant → Dette/Paiement

Exemple :

Mamadou Diallo
"Ciment + fer"
500000 GNF
DETTE

Puis :

Mamadou Diallo
"Règlement"
200000 GNF
PAIEMENT

Solde :
300000 GNF

NAVIGATION :

Je veux seulement :

- Accueil
- Clients
- Paiements
- Paramètres

NE PAS créer :
- menu Historique
- menu Dettes
- menu Produits
- menu Stock
- menu Factures
- autres modules inutiles

L'historique d'un client doit être directement visible dans sa fiche.

ACCUEIL :

L'accueil doit être une page d'accès rapide, pas un dashboard lourd.

Afficher :

Bonjour [nom]

[ + Nouvelle dette ]
[ 💵 Recevoir un paiement ]

Puis éventuellement :

À récupérer
X GNF

X clients débiteurs

Et les dernières activités.

CLIENTS :

Afficher :
- recherche
- liste des clients
- nom
- téléphone
- dette actuelle
- création/modification client

FICHE CLIENT :

Afficher :
- nom
- téléphone
- dette actuelle
- bouton Nouvelle dette
- bouton Paiement
- historique des transactions

NOUVELLE DETTE :

Seulement :
- client
- libellé
- montant

Objectif : moins de 10 secondes.

PAIEMENTS :

Afficher :
- filtre de date
- total reçu sur la période
- liste des paiements
- bouton Recevoir un paiement

Un paiement contient :
- client
- montant
- mode de paiement
- libellé
- date

MODÈLES :

Customer :
id
name
phone
createdAt

Transaction :
id
customerId
type: DEBT | PAYMENT
label
amount
paymentMethod
createdAt

PaymentMethod :
CASH
ORANGE_MONEY
MOBILE_MONEY

IMPORTANT :

Ne stocke pas le solde du client.

Le solde doit être calculé :

somme des DETTES - somme des PAIEMENTS

ARCHITECTURE :

Même avec JSON, je veux une architecture qui permettra de remplacer facilement JSON par Supabase.

Les composants ne doivent jamais accéder directement aux fichiers JSON.

Utiliser :

Components
↓
Services
↓
Repository/Data source
↓
Mock JSON

Plus tard :

Components
↓
Services
↓
Repository/Data source
↓
Supabase

Créer donc des interfaces TypeScript et des services propres.

MOCK DATA :

Créer :

assets/mock/customers.json
assets/mock/transactions.json
assets/mock/profile.json

Utiliser suffisamment de fausses données pour que l'interface ressemble à une vraie application.

DESIGN :

Je veux un design professionnel, moderne et sobre.

Ne pas faire un dashboard "AI generated" avec beaucoup de grosses cards.

S'inspirer d'un logiciel SaaS professionnel.

Utiliser le layout AilAdmin existant.

Sur desktop :
sidebar simple.

Sur mobile :
navigation adaptée au mobile.

Priorité :
- lisibilité
- rapidité
- densité raisonnable
- espace blanc maîtrisé
- boutons d'action clairement visibles

IMPORTANT :

Avant de coder :
1. Analyse le projet AilAdmin existant.
2. Analyse sa structure et ses composants.
3. Ne remplace pas inutilement son architecture.
4. Propose l'architecture Carnet+ adaptée à ce projet.
5. Propose un plan de développement par étapes.
6. Attends ma validation avant de commencer les modifications.

Ne développe pas toutes les fonctionnalités d'un seul coup.
On avancera phase par phase.