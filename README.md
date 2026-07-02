# ⚡ STEG — Système de Supervision Réseau Électrique

Système de supervision complet pour la Société Tunisienne de l'Électricité et du Gaz.
**Stack** : React 18 + Vite · Node.js/Express · MySQL · Socket.IO · jsPDF

---

## 📁 Structure du projet

```
steg-system/
├── backend/
│   ├── config/
│   │   ├── db.js            — Connexion MySQL
│   │   └── schema.sql       — Schéma BDD complet (24 gouvernorats, 10 centrales...)
│   ├── middleware/
│   │   └── auth.js          — JWT + contrôle de rôles
│   ├── routes/
│   │   ├── auth.js          — Login, profil, thème
│   │   ├── centrales.js     — CRUD centrales électriques
│   │   ├── zones.js         — CRUD zones de distribution
│   │   ├── materiel.js      — CRUD équipements (bouteaux, transformateurs...)
│   │   ├── alertes.js       — Système d'alertes + décisions
│   │   └── dashboard.js     — Stats, rapport, gouvernorats
│   ├── server.js            — Serveur Express + Socket.IO
│   └── .env
└── frontend/
    └── src/
        ├── context/
        │   ├── AuthContext.jsx   — Authentification + thème
        │   ├── SocketContext.jsx — Temps réel
        │   └── ToastContext.jsx  — Notifications toast
        ├── components/
        │   └── Layout.jsx        — Sidebar + topbar
        └── pages/
            ├── Login.jsx         — Page de connexion
            ├── Dashboard.jsx     — Tableau de bord
            ├── Alertes.jsx       — Alertes + prise de décision
            ├── Centrales.jsx     — Gestion centrales
            ├── Materiel.jsx      — Gestion matériel (bouteaux...)
            ├── Zones.jsx         — Gestion zones
            ├── Rapport.jsx       — Rapport PDF
            └── Historique.jsx    — Journal complet
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+, npm 9+
- MySQL 8.0+ (MySQL Workbench)

### 1. Base de données

Ouvrez MySQL Workbench et exécutez `backend/config/schema.sql`.

### 2. Configuration backend

Éditez `backend/.env` :
```
DB_PASSWORD=votre_mot_de_passe_mysql
```

### 3. Lancer le backend
```bash
cd backend
npm install
npm start        # production
npm run dev      # développement (nodemon)
```
→ http://localhost:5000/api/health

### 4. Lancer le frontend
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

---

## 🔐 Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@steg.com.tn | admin123 | Admin |
| k.bensalah@steg.com.tn | admin123 | Superviseur |
| s.trabelsi@steg.com.tn | admin123 | Technicien |

---

## 🌟 Fonctionnalités

### 📊 Tableau de bord
- Production totale en temps réel
- Zones alimentées / en coupure
- Graphique production 7 jours
- Répartition des zones (camembert)
- Top 6 centrales par production

### ⚡ Alertes & Coupures (CORE)
- Réception des signalements clients en temps réel (Socket.IO)
- Alerte sonore automatique à chaque coupure
- Bannière d'urgence pour les niveaux URGENCE/CRITIQUE
- **Système de décision** : Service Technique 🔧 | Police 🚔 | Résolu ✅ | Fausse alerte ❌
- Mise à jour automatique du statut de la zone après décision
- Historique complet filtrable

### 🏭 Centrales
- 10 centrales pré-chargées (Radès, Sfax, Sousse, Haouaria, éoliennes, solaire...)
- CRUD complet avec validation
- Suivi production MW / capacité / taux d'utilisation

### ⚙ Matériel
- Bouteaux haute/moyenne tension
- Transformateurs, disjoncteurs, câbles, compteurs, relais
- Suivi maintenance avec alertes dates dépassées
- Filtrage par type et statut

### 📍 Zones
- Vue grille ou liste
- 13 zones pré-configurées (Tunis, Sfax, Sousse, Bizerte...)
- Statut : Alimentée / Coupure / Maintenance / Partiel
- Priorité : Critique / Haute / Normale / Basse

### 📄 Rapport PDF
- Génération complète avec jsPDF + autoTable
- Synthèse globale, centrales, zones, alertes, matériel en panne
- En-tête professionnel STEG avec dégradé bleu
- Pagination automatique + footer

### 🌙 Mode sombre / clair
- Toggle dans la topbar (☀️/🌙)
- Préférence sauvegardée en BDD par utilisateur
- Appliquée automatiquement à la reconnexion

---

## 📡 API REST

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/login | Connexion JWT |
| GET | /api/dashboard/stats | Stats temps réel |
| GET | /api/dashboard/rapport | Données rapport PDF |
| GET | /api/centrales | Liste centrales |
| POST | /api/centrales | Ajouter centrale |
| PUT | /api/centrales/:id | Modifier centrale |
| DELETE | /api/centrales/:id | Supprimer centrale |
| GET | /api/zones | Liste zones |
| POST | /api/zones | Ajouter zone |
| GET | /api/materiel | Liste matériel (filtrable) |
| POST | /api/materiel | Ajouter matériel |
| GET | /api/alertes/actives | Alertes actives |
| POST | /api/alertes | Déclarer coupure |
| PUT | /api/alertes/:id/decision | Prendre décision |

## 🔌 Socket.IO Events

| Événement | Description |
|-----------|-------------|
| `nouvelle_alerte` | Nouvelle coupure signalée → toast + son |
| `alerte_sonore` | Déclencher alerte sonore |
| `alerte_decision` | Décision prise sur une alerte |
| `centrale_update` | Statut centrale modifié |
| `centrales_refresh` | Actualisation périodique (60s) |
| `zone_update` | Statut zone modifié |

---

## 🗃️ Données pré-chargées

- **24 gouvernorats** tunisiens
- **10 centrales** : Radès 1&2, Sousse, Sfax, Haouaria, Éoliens Thala & Bizerte, Solaire Tozeur, Gabès, Kasserine
- **13 zones** de distribution
- **12 équipements** (bouteaux, transformateurs, disjoncteurs...)
- **4 alertes** de démonstration actives
- **Historique KPI** production horaire
