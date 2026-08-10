Je veux améliorer le champ **numéro de téléphone** dans mon application Angular + Tailwind CSS.

### Objectif

Créer un composant de téléphone moderne et simple pour Carnet+ avec :

```text
┌──────────────┬─────────────────────────┐
│ 🇬🇳 +224  ▼  │ 622 12 34 56            │
└──────────────┴─────────────────────────┘
```

### Pays à prendre en charge

Limiter la liste aux pays d'Afrique francophone suivants :

* 🇬🇳 Guinée — +224
* 🇸🇳 Sénégal — +221
* 🇨🇮 Côte d'Ivoire — +225
* 🇲🇱 Mali — +223
* 🇧🇫 Burkina Faso — +226
* 🇳🇪 Niger — +227
* 🇹🇬 Togo — +228
* 🇧🇯 Bénin — +229
* 🇨🇲 Cameroun — +237
* 🇨🇩 RDC — +243
* 🇨🇬 Congo — +242
* 🇬🇦 Gabon — +241
* 🇹🇩 Tchad — +235
* 🇨🇫 République centrafricaine — +236
* 🇬🇼 Guinée-Bissau — +245

### Fonctionnement souhaité

1. L'utilisateur clique sur le drapeau.
2. Un dropdown Tailwind s'ouvre avec les pays.
3. Chaque pays affiche :

   * son drapeau
   * son nom
   * son indicatif
4. Lorsqu'un pays est sélectionné, son indicatif est automatiquement affiché.
5. Si l'utilisateur sélectionne 🇬🇳 Guinée, afficher automatiquement `+224`.
6. Si l'utilisateur sélectionne 🇸🇳 Sénégal, afficher automatiquement `+221`.
7. Si l'utilisateur saisit directement un indicatif comme `+224`, détecter automatiquement le pays correspondant et sélectionner 🇬🇳.
8. Même comportement pour les autres indicatifs.
9. Le numéro local doit être saisi séparément de l'indicatif.
10. La valeur finale doit pouvoir être facilement enregistrée au format international, par exemple :
    `+224622123456`

### Design

Utiliser design systheme du theme pour le style du composant.

Je veux un design :

* moderne
* minimaliste
* propre
* adapté à Carnet+
* responsive
* avec bordure, focus et hover propres
* dropdown avec recherche si cela reste simple
* pas de design compliqué

Le composant doit fonctionner correctement avec les formulaires Angular existants (`FormsModule` ou Reactive Forms selon ce qui est déjà utilisé dans le projet).

### Architecture

Avant de modifier le code :

1. Analyse le projet existant.
2. Vérifie comment les champs téléphone sont actuellement utilisés.
3. Vérifie si un composant de formulaire ou un composant client existe déjà.
4. Réutilise l'architecture existante au lieu de créer une structure inutile.

Crée si nécessaire un composant réutilisable :

`PhoneInputComponent`

Il doit pouvoir être utilisé dans :

* création client
* modification client
* autres formulaires nécessitant un numéro de téléphone.

### Important

Ne modifie pas inutilement les autres fonctionnalités.

Ne remplace pas Tailwind par une autre librairie UI.

N'ajoute pas `ngx-intl-tel-input` si ce n'est pas nécessaire.

Si une petite librairie comme `libphonenumber-js` est réellement utile pour la validation ou le formatage, tu peux l'utiliser, mais garde la solution aussi simple que possible.

À la fin :

* vérifie que le projet compile
* corrige les erreurs TypeScript/Angular
* vérifie que le composant fonctionne avec les formulaires existants
* indique-moi les fichiers modifiés et explique brièvement ce qui a été fait.
