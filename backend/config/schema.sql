-- ============================================================
-- STEG SUPERVISION SYSTEM — Schéma Base de Données MySQL
-- Société Tunisienne de l'Electricité et du Gaz
-- ============================================================

CREATE DATABASE IF NOT EXISTS steg_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE steg_db;

-- ============================================================
-- TABLE: utilisateurs
-- ============================================================
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  matricule VARCHAR(20) UNIQUE NOT NULL,
  role ENUM('ADMIN','SUPERVISEUR','TECHNICIEN','OPERATEUR') DEFAULT 'OPERATEUR',
  email VARCHAR(150) UNIQUE NOT NULL,
  telephone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  theme_preference ENUM('light','dark') DEFAULT 'light',
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: gouvernorats (zones géographiques Tunisie)
-- ============================================================
CREATE TABLE IF NOT EXISTS gouvernorats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  region ENUM('NORD','CENTRE','SUD') NOT NULL
);

-- ============================================================
-- TABLE: centrales (power plants)
-- ============================================================
CREATE TABLE IF NOT EXISTS centrales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  type ENUM('THERMIQUE','HYDRAULIQUE','EOLIENNE','SOLAIRE','COMBINEE') NOT NULL,
  gouvernorat_id INT NOT NULL,
  capacite_mw DECIMAL(10,2) NOT NULL,
  production_actuelle_mw DECIMAL(10,2) DEFAULT 0,
  statut ENUM('EN_MARCHE','ARRET','MAINTENANCE','ALERTE') DEFAULT 'EN_MARCHE',
  date_mise_en_service DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  responsable VARCHAR(100),
  telephone_urgence VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gouvernorat_id) REFERENCES gouvernorats(id)
);

-- ============================================================
-- TABLE: zones_distribution (zones réseau électrique)
-- ============================================================
CREATE TABLE IF NOT EXISTS zones_distribution (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  centrale_id INT,
  gouvernorat_id INT NOT NULL,
  population_desservie INT DEFAULT 0,
  nb_abonnes INT DEFAULT 0,
  tension_kv DECIMAL(8,2) DEFAULT 30,
  statut ENUM('ALIMENTE','COUPURE','MAINTENANCE','PARTIEL') DEFAULT 'ALIMENTE',
  priorite ENUM('CRITIQUE','HAUTE','NORMALE','BASSE') DEFAULT 'NORMALE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (centrale_id) REFERENCES centrales(id),
  FOREIGN KEY (gouvernorat_id) REFERENCES gouvernorats(id)
);

-- ============================================================
-- TABLE: materiel (équipements STEG)
-- ============================================================
CREATE TABLE IF NOT EXISTS materiel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  reference VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('BOUTEAU','TRANSFORMATEUR','DISJONCTEUR','CABLE','COMPTEUR','GROUPE_ELECTROGENE','RELAIS','AUTRE') NOT NULL,
  marque VARCHAR(100),
  modele VARCHAR(100),
  centrale_id INT,
  zone_id INT,
  statut ENUM('OPERATIONNEL','PANNE','MAINTENANCE','HORS_SERVICE') DEFAULT 'OPERATIONNEL',
  tension_nominale_kv DECIMAL(8,2),
  date_installation DATE,
  date_derniere_maintenance DATE,
  prochaine_maintenance DATE,
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (centrale_id) REFERENCES centrales(id),
  FOREIGN KEY (zone_id) REFERENCES zones_distribution(id)
);

-- ============================================================
-- TABLE: alertes_coupures (système d'alerte coupure courant)
-- ============================================================
CREATE TABLE IF NOT EXISTS alertes_coupures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id INT NOT NULL,
  centrale_id INT,
  type_alerte ENUM('COUPURE_SIGNALEMENT','COUPURE_AUTOMATIQUE','SURCHARGE','COURT_CIRCUIT','SABOTAGE_SUSPECT','MAINTENANCE_URGENTE','CHUTE_TENSION') NOT NULL,
  niveau_urgence ENUM('INFO','AVERTISSEMENT','CRITIQUE','URGENCE') DEFAULT 'INFO',
  source ENUM('SIGNALEMENT_CLIENT','DETECTION_AUTOMATIQUE','TECHNICIEN','CAPTEUR') DEFAULT 'SIGNALEMENT_CLIENT',
  description TEXT,
  nb_signalements INT DEFAULT 1,
  decision ENUM('EN_ATTENTE','SERVICE_TECHNIQUE','POLICE','RESOLU','ANNULE') DEFAULT 'EN_ATTENTE',
  decision_par INT,
  commentaire_decision TEXT,
  statut ENUM('OUVERT','EN_COURS','RESOLU','ANNULE') DEFAULT 'OUVERT',
  date_debut TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_fin TIMESTAMP NULL,
  duree_minutes INT GENERATED ALWAYS AS (
    CASE WHEN date_fin IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, date_debut, date_fin) ELSE NULL END
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones_distribution(id),
  FOREIGN KEY (centrale_id) REFERENCES centrales(id),
  FOREIGN KEY (decision_par) REFERENCES utilisateurs(id)
);

-- ============================================================
-- TABLE: kpi_production (métriques de production)
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_production (
  id INT AUTO_INCREMENT PRIMARY KEY,
  centrale_id INT NOT NULL,
  date_mesure DATE NOT NULL,
  heure_mesure TINYINT NOT NULL,
  production_mw DECIMAL(10,2) DEFAULT 0,
  capacite_mw DECIMAL(10,2) DEFAULT 0,
  taux_utilisation DECIMAL(5,2) DEFAULT 0,
  consommation_combustible DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_centrale_date_heure (centrale_id, date_mesure, heure_mesure),
  FOREIGN KEY (centrale_id) REFERENCES centrales(id)
);

-- ============================================================
-- TABLE: interventions (historique interventions techniciens)
-- ============================================================
CREATE TABLE IF NOT EXISTS interventions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alerte_id INT NOT NULL,
  technicien_id INT NOT NULL,
  type_intervention ENUM('REPARATION','INSPECTION','REMPLACEMENT','URGENCE') NOT NULL,
  description TEXT,
  duree_minutes INT,
  materiel_utilise TEXT,
  statut ENUM('PLANIFIE','EN_COURS','TERMINE','ABANDONNE') DEFAULT 'PLANIFIE',
  date_intervention TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_fin TIMESTAMP NULL,
  FOREIGN KEY (alerte_id) REFERENCES alertes_coupures(id),
  FOREIGN KEY (technicien_id) REFERENCES utilisateurs(id)
);

-- ============================================================
-- TABLE: notifications (journal notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT,
  alerte_id INT,
  titre VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('COUPURE','MAINTENANCE','SYSTEME','ALERTE') DEFAULT 'SYSTEME',
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (alerte_id) REFERENCES alertes_coupures(id)
);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

INSERT INTO gouvernorats (nom, code, region) VALUES
('Tunis','TUN','NORD'),('Ariana','ARI','NORD'),('Ben Arous','BNA','NORD'),
('Manouba','MAN','NORD'),('Bizerte','BIZ','NORD'),('Nabeul','NAB','NORD'),
('Zaghouan','ZAG','NORD'),('Sousse','SOU','CENTRE'),('Monastir','MON','CENTRE'),
('Mahdia','MAH','CENTRE'),('Sfax','SFX','CENTRE'),('Kairouan','KAI','CENTRE'),
('Kasserine','KAS','CENTRE'),('Sidi Bouzid','SBZ','CENTRE'),('Gabès','GAB','SUD'),
('Médenine','MED','SUD'),('Tataouine','TAT','SUD'),('Gafsa','GAF','SUD'),
('Tozeur','TOZ','SUD'),('Kébili','KEB','SUD'),('Jendouba','JEN','NORD'),
('Kef','KEF','NORD'),('Siliana','SIL','NORD'),('Béja','BEJ','NORD');

INSERT INTO utilisateurs (nom, prenom, matricule, role, email, telephone, password_hash) VALUES
('Admin','Système','ADM-001','ADMIN','admin@steg.com.tn','+216 71 000 000','$2b$10$rQDnNjFb7CXAuQK5tPXvCewH8m5kOqJlvCv4/yJMFdKZfGnJ7B3Ey'),
('Ben Salah','Karim','SUP-001','SUPERVISEUR','k.bensalah@steg.com.tn','+216 71 111 111','$2b$10$rQDnNjFb7CXAuQK5tPXvCewH8m5kOqJlvCv4/yJMFdKZfGnJ7B3Ey'),
('Trabelsi','Sonia','TEC-001','TECHNICIEN','s.trabelsi@steg.com.tn','+216 71 222 222','$2b$10$rQDnNjFb7CXAuQK5tPXvCewH8m5kOqJlvCv4/yJMFdKZfGnJ7B3Ey'),
('Mansouri','Yassine','OPR-001','OPERATEUR','y.mansouri@steg.com.tn','+216 71 333 333','$2b$10$rQDnNjFb7CXAuQK5tPXvCewH8m5kOqJlvCv4/yJMFdKZfGnJ7B3Ey');

INSERT INTO centrales (nom, code, type, gouvernorat_id, capacite_mw, production_actuelle_mw, statut, date_mise_en_service, latitude, longitude, responsable, telephone_urgence) VALUES
('Centrale Thermique Radès 1','CTR-RAD1','THERMIQUE',3,490,420,'EN_MARCHE','1985-01-01',36.7667,10.2833,'Ing. Habib Chekir','+216 71 450 000'),
('Centrale Thermique Radès 2','CTR-RAD2','THERMIQUE',3,490,380,'EN_MARCHE','2001-06-01',36.7670,10.2840,'Ing. Habib Chekir','+216 71 450 001'),
('Centrale Thermique Sousse','CTR-SOU','THERMIQUE',8,380,310,'EN_MARCHE','1990-03-01',35.8333,10.6333,'Ing. Mounir Hamdi','+216 73 220 000'),
('Centrale Thermique Sfax','CTR-SFX','THERMIQUE',11,320,280,'EN_MARCHE','1995-07-01',34.7500,10.7167,'Ing. Leila Mzabi','+216 74 200 000'),
('Centrale Gaz Haouaria','CTG-HAO','COMBINEE',6,480,395,'EN_MARCHE','2010-01-01',37.0500,10.9333,'Ing. Amine Rekik','+216 72 269 000'),
('Parc Éolien Thala','PEO-THL','EOLIENNE',13,120,85,'EN_MARCHE','2012-05-01',35.5667,8.6667,'Ing. Fatma Jelassi','+216 77 480 000'),
('Parc Éolien Bizerte','PEO-BIZ','EOLIENNE',5,200,160,'EN_MARCHE','2014-09-01',37.2741,9.8739,'Ing. Sami Bouaziz','+216 72 431 000'),
('Centrale Solaire Tozeur','CSO-TOZ','SOLAIRE',19,50,38,'EN_MARCHE','2019-06-01',33.9197,8.1335,'Ing. Rania Gharbi','+216 76 453 000'),
('Centrale Thermique Gabès','CTG-GAB','THERMIQUE',15,420,0,'MAINTENANCE','1988-01-01',33.8833,10.1000,'Ing. Nader Karray','+216 75 270 000'),
('Centrale Hydraulique Kasserine','CHY-KAS','HYDRAULIQUE',13,85,70,'EN_MARCHE','1970-01-01',35.1667,8.8333,'Ing. Walid Dridi','+216 77 471 000');

INSERT INTO zones_distribution (nom, code, centrale_id, gouvernorat_id, population_desservie, nb_abonnes, tension_kv, statut, priorite) VALUES
('Tunis Centre','ZD-TUN1',1,1,450000,125000,30,'COUPURE','CRITIQUE'),
('Tunis Nord','ZD-TUN2',1,1,280000,78000,30,'ALIMENTE','HAUTE'),
('Tunis Sud','ZD-TUN3',2,3,320000,92000,30,'ALIMENTE','HAUTE'),
('Ariana Ville','ZD-ARI1',1,2,195000,54000,15,'ALIMENTE','NORMALE'),
('Ben Arous','ZD-BNA1',2,3,210000,61000,15,'ALIMENTE','NORMALE'),
('Sfax Centre','ZD-SFX1',4,11,310000,88000,30,'COUPURE','CRITIQUE'),
('Sfax Nord','ZD-SFX2',4,11,180000,51000,15,'ALIMENTE','HAUTE'),
('Sousse Centre','ZD-SOU1',3,8,250000,71000,30,'ALIMENTE','HAUTE'),
('Sousse Nord','ZD-SOU2',3,8,145000,42000,15,'ALIMENTE','NORMALE'),
('Bizerte Ville','ZD-BIZ1',7,5,175000,49000,15,'MAINTENANCE','NORMALE'),
('Nabeul','ZD-NAB1',5,6,165000,47000,15,'ALIMENTE','NORMALE'),
('Gabès Ville','ZD-GAB1',9,15,135000,38000,15,'PARTIEL','HAUTE'),
('Gafsa Centre','ZD-GAF1',10,18,110000,32000,15,'ALIMENTE','NORMALE');

INSERT INTO materiel (nom, reference, type, marque, modele, centrale_id, zone_id, statut, tension_nominale_kv, date_installation, date_derniere_maintenance, prochaine_maintenance) VALUES
('Bouteau Haute Tension TUN-01','BHT-TUN-001','BOUTEAU','ABB','OHB-245',1,1,'OPERATIONNEL',245,'2018-03-15','2025-03-10','2026-03-10'),
('Bouteau Haute Tension TUN-02','BHT-TUN-002','BOUTEAU','Siemens','3AP1',1,2,'OPERATIONNEL',245,'2019-06-20','2025-06-18','2026-06-18'),
('Transformateur Principal Radès','TRF-RAD-001','TRANSFORMATEUR','ABB','TRAFO-400',1,NULL,'OPERATIONNEL',400,'2001-01-15','2024-12-01','2025-12-01'),
('Disjoncteur HTA Sfax','DIS-SFX-001','DISJONCTEUR','Schneider','Masterpact','',6,'OPERATIONNEL',30,'2015-08-10','2025-01-20','2026-01-20'),
('Bouteau MT Sousse','BMT-SOU-001','BOUTEAU','ABB','VD4',3,8,'PANNE','15','2016-04-05',NULL,NULL),
('Groupe Électrogène Urgence Tunis','GEU-TUN-001','GROUPE_ELECTROGENE','Caterpillar','C3516',NULL,1,'OPERATIONNEL',0.4,'2020-02-20','2025-02-15','2026-02-15'),
('Compteur Smart Sfax 001','CSM-SFX-001','COMPTEUR','Landis+Gyr','E650',NULL,6,'OPERATIONNEL',0.23,'2022-01-10',NULL,'2027-01-10'),
('Transformateur HTA/BT Ariana','TRF-ARI-001','TRANSFORMATEUR','Schneider','Minera',NULL,4,'MAINTENANCE',15,'2010-05-12','2025-05-10','2025-11-10'),
('Relais de Protection Bizerte','REL-BIZ-001','RELAIS','GE','Multilin 350',7,10,'OPERATIONNEL',30,'2017-09-08','2025-09-05','2026-09-05'),
('Bouteau 63kV Gabès','BGK-GAB-001','BOUTEAU','Siemens','3AQ1',9,12,'HORS_SERVICE',63,'2005-11-20','2023-11-18',NULL),
('Disjoncteur MT Nabeul','DIS-NAB-001','DISJONCTEUR','ABB','VD4-12',5,11,'OPERATIONNEL',12,'2018-07-15','2024-07-10','2026-07-10'),
('Câble Souterrain HTA Gafsa','CAB-GAF-001','CABLE','Nexans','XLPE-3x240',10,13,'OPERATIONNEL',15,'2019-03-25','2025-03-20','2026-03-20');

INSERT INTO alertes_coupures (zone_id, centrale_id, type_alerte, niveau_urgence, source, description, nb_signalements, decision, statut, date_debut) VALUES
(1,1,'COUPURE_SIGNALEMENT','URGENCE','SIGNALEMENT_CLIENT','Coupure totale signalée par plusieurs abonnés. Zone résidentielle et commerciale affectée. Possible acte de sabotage sur le poste transformateur.',47,'EN_ATTENTE','OUVERT',NOW() - INTERVAL 25 MINUTE),
(6,4,'COUPURE_SIGNALEMENT','CRITIQUE','SIGNALEMENT_CLIENT','Coupure partielle secteur industriel Sfax. Plusieurs usines signalent la perte de courant. Câble endommagé suspecté.',23,'SERVICE_TECHNIQUE','EN_COURS',NOW() - INTERVAL 1 HOUR),
(10,7,'MAINTENANCE_URGENTE','AVERTISSEMENT','TECHNICIEN','Maintenance préventive requise sur le relais de protection. Risque de surcharge détecté.',0,'SERVICE_TECHNIQUE','EN_COURS',NOW() - INTERVAL 3 HOUR),
(12,9,'CHUTE_TENSION','AVERTISSEMENT','CAPTEUR','Chute de tension détectée sur la zone Gabès. Centrale en maintenance.',5,'EN_ATTENTE','OUVERT',NOW() - INTERVAL 45 MINUTE);

INSERT INTO kpi_production (centrale_id, date_mesure, heure_mesure, production_mw, capacite_mw, taux_utilisation) VALUES
(1,CURDATE(),HOUR(NOW())-3,410,490,83.7),(1,CURDATE(),HOUR(NOW())-2,420,490,85.7),(1,CURDATE(),HOUR(NOW())-1,415,490,84.7),
(2,CURDATE(),HOUR(NOW())-3,370,490,75.5),(2,CURDATE(),HOUR(NOW())-2,380,490,77.6),(2,CURDATE(),HOUR(NOW())-1,375,490,76.5),
(3,CURDATE(),HOUR(NOW())-3,305,380,80.3),(3,CURDATE(),HOUR(NOW())-2,310,380,81.6),(3,CURDATE(),HOUR(NOW())-1,308,380,81.1),
(4,CURDATE(),HOUR(NOW())-3,275,320,85.9),(4,CURDATE(),HOUR(NOW())-2,280,320,87.5),(4,CURDATE(),HOUR(NOW())-1,278,320,86.9);
