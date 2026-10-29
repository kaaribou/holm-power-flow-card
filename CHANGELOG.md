# Changelog

## 1.2.0
- **Heures creuses / pleines via HOLM HP/HC** (#3) : l'intégration est détectée automatiquement (`binary_sensor.heures_creuses`, ou option `hc_entity`) ; période et prix du kWh en cours sans rien configurer.
- **Décompte** sous le réseau jusqu'au prochain changement : « HC dans 1 h 54 » (option `show_countdown`).
- **Affichage au choix** (`tariff_display`) : couleur du réseau, repère « Heures creuses » / « Heures pleines », ou les deux.
- L'ancienne méthode (`tariff_entity` + `hc_price`) reste disponible et prioritaire si elle est configurée.

## 1.1.0
- **Totaux du jour** (#1) sous les nœuds : acheté / revendu au réseau, produit, consommé (statistiques du tableau Énergie, option `show_totals`).
- **Graphiques au toucher** (#2) : un toucher sur Solaire, Maison, Réseau ou un appareil ouvre son graphique de puissance (6 h, 24 h, 48 h, 7 j ou dates au choix), avec min / max / moyenne et énergie de la période ; revente affichée sous l'axe pour le réseau.

## 1.0.0
Première version publique.

- Flux de puissance compact et horizontal : **Solaire → Maison ⇄ Réseau**, avec points animés dont la vitesse suit la puissance.
- Anneau de la maison : part solaire / réseau de la consommation, en direct.
- Revente affichée (mesurée, ou estimée à partir de l'énergie revendue).
- Couleur du réseau selon le tarif : heures creuses / heures pleines (`tariff_entity` + `hc_price`, nombre ou entité).
- Appareils actifs sous le flux, triés par puissance, avec icône automatique.
- Capteurs lus automatiquement dans le tableau de bord Énergie, tous modifiables dans l'éditeur visuel.
