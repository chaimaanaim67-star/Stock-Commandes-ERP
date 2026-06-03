-- Table modele (schéma actuel MySQL)
-- Le nom affiché est stocké dans nom_produit ; l'API l'expose comme nom_modele.

CREATE TABLE IF NOT EXISTS modele (
  id_modele INT NOT NULL AUTO_INCREMENT,
  nom_produit VARCHAR(100) DEFAULT NULL,
  unite VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (id_modele)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
