-- Valeurs cochées par champ (filtres, lignes pivot, colonnes pivot)
CREATE TABLE IF NOT EXISTS p_modele_selection (
  id_selection INT AUTO_INCREMENT PRIMARY KEY,
  id_modele INT NOT NULL,
  variante VARCHAR(255) NOT NULL,
  zone_type VARCHAR(32) NOT NULL,
  valeur TEXT NOT NULL,
  INDEX idx_modele (id_modele),
  CONSTRAINT fk_p_modele_selection_modele
    FOREIGN KEY (id_modele) REFERENCES modele(id_modele) ON DELETE CASCADE
);
