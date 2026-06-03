-- Bon de commande commercial (évolution schéma)

CREATE TABLE IF NOT EXISTS bon_commande (
  id_bc INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(48) NOT NULL UNIQUE,
  nom_client VARCHAR(255) NOT NULL,
  ville VARCHAR(255) DEFAULT '',
  telephone VARCHAR(64) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  adresse TEXT,
  remarque TEXT,
  total_ht DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_tva DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_ttc DECIMAL(14,2) NOT NULL DEFAULT 0,
  statut VARCHAR(32) NOT NULL DEFAULT 'en_attente',
  source VARCHAR(32) DEFAULT 'app',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bc_created (created_at),
  INDEX idx_bc_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bon_commande_ligne (
  id_ligne INT AUTO_INCREMENT PRIMARY KEY,
  id_bc INT NOT NULL,
  id_modele INT NOT NULL,
  ligne_key TEXT NOT NULL,
  col_key TEXT NOT NULL,
  quantite DECIMAL(14,4) NOT NULL,
  prix_unitaire DECIMAL(14,4) NOT NULL DEFAULT 0,
  designation VARCHAR(768) DEFAULT '',
  id_produit INT NULL,
  KEY idx_bc (id_bc),
  KEY idx_bc_produit (id_produit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
