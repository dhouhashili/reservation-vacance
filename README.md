# Gestion des réservations de la maison de vacances

Application de gestion des réservations pour une maison de vacances : dates d’arrivée et de départ, coordonnées du locataire, avance, total, reste à payer, coût concierge Wassim, bénéfice net, calendrier d’occupation et suivi des statuts.

L’application reste une interface **100% statique** hébergeable gratuitement avec **GitHub Pages**. Les données sont stockées dans **Supabase** via le client JavaScript Supabase chargé depuis un CDN.

## Fonctionnalités

- Interface HTML/CSS/JavaScript sans serveur applicatif.
- Hébergement GitHub Pages uniquement : pas de Node.js obligatoire, pas d’Express, pas de Docker, pas de Railway, pas de MySQL et pas de serveur payant.
- Base de données Supabase.
- Calendrier mensuel des réservations avec couleurs par statut.
- Ajout, modification et suppression de réservations.
- Coordonnées locataire : nom complet obligatoire, téléphone et email facultatifs, WhatsApp facultatif, notes, lieu GPS et heure d’arrivée.
- Sources de réservation : TunRooms, Kabilys, Vivlio, Instagram, Direct et WhatsApp.
- Dates d’arrivée/départ et calcul automatique du nombre de nuits.
- Montants en dinars tunisiens (**TND**) : total, avance, reste à payer, coût concierge Wassim et bénéfice net.
- Bouton WhatsApp direct sur les réservations qui ont un numéro WhatsApp ou téléphone.
- Tableau de bord : chiffre d’affaires du mois, coût Wassim du mois, bénéfice net, reste à encaisser, taux d’occupation et nombre de réservations.
- Interface responsive mobile-first en français.

## Structure du projet

```text
.
├── index.html          # Point d’entrée statique GitHub Pages
├── styles.css          # Styles responsives et couleurs du calendrier
├── app.js              # Logique Supabase, calendrier, formulaire, CRUD et tableau de bord
├── supabase/schema.sql # Table Supabase/PostgreSQL, index, triggers et politiques RLS
├── .nojekyll           # Empêche GitHub Pages de traiter le site avec Jekyll
└── README.md
```

## 1. Créer la base Supabase gratuite

1. Allez sur <https://supabase.com> et créez un projet gratuit.
2. Ouvrez **SQL Editor** dans le tableau de bord Supabase.
3. Copiez le contenu de [`supabase/schema.sql`](supabase/schema.sql), collez-le dans SQL Editor, puis exécutez-le.
4. Ouvrez **Project Settings > API**.
5. Copiez ces deux valeurs :
   - **Project URL**
   - **anon public key**

> Si votre table existait déjà, réexécutez aussi `supabase/schema.sql` pour ajouter les nouveaux champs : WhatsApp, source, heure d’arrivée, GPS, coût Wassim, bénéfice net, téléphone/email facultatifs et nouveaux statuts.

## 2. Connecter l’interface à Supabase

Ouvrez [`app.js`](app.js) et remplacez les valeurs en haut du fichier si nécessaire :

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

par vos valeurs Supabase :

```js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

La devise de l’application est configurée en **TND** avec `APP_CURRENCY = 'TND'`.

La clé anon est publique dans une application navigateur. Le schéma inclus active Row Level Security et ajoute des politiques CRUD publiques pour fonctionner depuis GitHub Pages sans backend. Pour une utilisation privée en production, ajoutez Supabase Auth puis remplacez les politiques publiques par des règles limitées à votre utilisateur.

## 3. Tester localement sans Node.js

Comme les navigateurs peuvent bloquer les requêtes CDN/base de données depuis `file://`, lancez un petit serveur statique depuis la racine du dépôt. Exemple avec Python :

```bash
python3 -m http.server 8080
```

Puis ouvrez <http://localhost:8080>.

Ce serveur local sert uniquement au développement. GitHub Pages héberge les mêmes fichiers statiques gratuitement.

## 4. Déployer gratuitement sur GitHub Pages

1. Committez et poussez ce dépôt vers GitHub.
2. Dans GitHub, ouvrez **Settings > Pages**.
3. Dans **Build and deployment**, choisissez :
   - **Source** : Deploy from a branch
   - **Branch** : `main` ou votre branche de déploiement
   - **Folder** : `/ (root)`
4. Cliquez sur **Save**.
5. GitHub Pages publiera l’application à une adresse similaire à :

   ```text
   https://your-username.github.io/reservation-vacance/
   ```

L’application utilise des chemins relatifs (`./styles.css` et `./app.js`), elle fonctionne donc correctement depuis un sous-chemin GitHub Pages.

## Notes

- Les nuits sont calculées de la date d’arrivée à la date de départ dans le navigateur et stockées comme colonne générée dans Supabase.
- Le reste à payer est calculé avec `total_amount - deposit_paid` et ne descend jamais sous zéro.
- Le bénéfice net est calculé avec `total_amount - wassim_concierge_cost`, ce qui permet de voir immédiatement une perte si le coût dépasse le total.
- Les réservations annulées sont exclues du chiffre d’affaires, de l’occupation, du reste à encaisser et des prochaines arrivées.
- Le taux d’occupation est calculé pour le mois courant à partir des nuits occupées non annulées.
