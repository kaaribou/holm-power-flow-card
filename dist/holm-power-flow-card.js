/* HOLM Power Flow Card — flux de puissance compact et horizontal : Solaire → Maison ⇄ Réseau, + appareils actifs.
 * Les capteurs sont lus automatiquement dans le tableau de bord Énergie de Home Assistant (modifiables dans l'éditeur).
 *   type: custom:holm-power-flow-card
 *   solar_power / grid_power (W, négatif = injection accepté) / export_power / home_power / export_energy
 *   solar_label / home_label / grid_label : entité affichée sous chaque nœud
 *   HOLM HP/HC détecté automatiquement (binary_sensor.heures_creuses) : période HC / HP, tarif en cours, décompte
 *   tariff_display: color | label | both, show_countdown, hc_entity (sinon trouvé automatiquement)
 *   tariff_entity + hc_price (nombre ou entité) : ancienne méthode, prioritaire si configurée
 *   threshold, curve_factor, show_frame, show_devices, show_device_names, max_devices, device_threshold, devices
 *   show_totals : totaux du jour sous les icônes (acheté / revendu, produit, consommé)
 *   Un toucher sur une icône ou un appareil ouvre son graphique (6 h, 24 h, 48 h, 7 j ou dates au choix)
 *   solar_color / home_color / grid_color / grid_hp_color / export_color
 * https://github.com/kaaribou/holm-power-flow-card — licence MIT
 */
(() => {
const VERSION = "1.3.0";
// ---- traductions (fr, en, de, es, it, nl, pt, pl) ----
const I18N = {
  fr: { d: "j", m12: "12 mois", dates: "Dates…", consumption: "Consommation", power: "Puissance", details: "Détails", close: "Fermer", from: "Du", to: "au", show: "Afficher",
    loading: "Chargement…", hist_unavail: "Historique indisponible", no_data: "Aucune donnée sur cette période.", total: "Total", est_cost: "Coût estimé", at_price: "à {p} €/kWh",
    avg_per: "Moyenne / {u}", u_hour: "h", u_day: "jour", u_month: "mois", peak: "Pic", cons_per: "Consommation par {u}", per_hour: "heure", per_day: "jour", per_month: "mois",
    current: "Actuel", buy_peak: "Pic d'achat", sell_peak: "Pic de revente", bought: "Acheté", sold: "Revendu", grid_buy: "Achat au réseau", resale: "Revente",
    min: "Min", max: "Max", average: "Moyenne", energy: "Énergie", avg_suffix: " (moyenne)",
    device_power: "Puissance de l'appareil", solar: "Solaire", production: "Production", grid: "Réseau", buy_sell: "Achat et revente", home: "Maison",
    in_dur: "{p} dans {d}", hc: "HC", hp: "HP", hc_long: "Heures creuses", hp_long: "Heures pleines", kwh_today: "{x} kWh auj.", pct_solar: "{x} % solaire",
    l_show_totals: "Totaux du jour sous les icônes", l_title: "Titre (optionnel)", l_show_frame: "Afficher le cadre de la carte", l_threshold: "Seuil d'activité (W)", l_curve_factor: "Courbure des lignes (0 = droites)",
    l_solar_power: "Puissance solaire (vide = tableau Énergie)", l_grid_power: "Puissance réseau (vide = tableau Énergie)", l_export_power: "Puissance revendue (vide = estimée)",
    l_home_power: "Puissance maison (vide = calculée)", l_export_energy: "Énergie revendue pour l'estimation (vide = tableau Énergie)",
    l_solar_label: "Info sous Solaire (vide = production du jour)", l_home_label: "Info sous Maison (vide = part solaire)", l_grid_label: "Info sous Réseau (vide = tarif HC/HP)",
    l_tariff_display: "Heures creuses / pleines", l_show_countdown: "Décompte jusqu'au prochain changement HC / HP", l_hc_entity: "Heures creuses HOLM HP/HC (vide = détection automatique)",
    l_tariff_entity: "Ancienne méthode : tarif actuel (prioritaire si renseigné)", l_hc_price: "Prix HC (nombre, pour reconnaître les heures creuses)", l_hc_price_entity: "… ou entité contenant le prix HC",
    l_show_devices: "Afficher les appareils actifs", l_show_device_names: "Afficher le nom des appareils", l_max_devices: "Nombre max d'appareils", l_device_threshold: "Seuil appareil (W)",
    l_solar_color: "Couleur solaire", l_home_color: "Couleur maison / appareils", l_grid_color: "Couleur réseau (HC)", l_grid_hp_color: "Couleur réseau (HP)", l_export_color: "Couleur revente",
    l_language: "Langue", auto: "Automatique (profil)", sec_sensors: "Capteurs", sec_labels: "Infos sous les icônes", sec_devices: "Appareils actifs", sec_colors: "Couleurs",
    td_color: "Couleur du réseau (HC / HP)", td_label: "Repère « Heures creuses » / « Heures pleines »", td_both: "Couleur et repère",
    card_name: "HOLM – Flux de puissance compact", card_desc: "Solaire → Maison ⇄ Réseau en temps réel, totaux du jour et graphiques au toucher, avec les appareils actifs" },
  en: { d: "d", m12: "12 months", dates: "Dates…", consumption: "Consumption", power: "Power", details: "Details", close: "Close", from: "From", to: "to", show: "Show",
    loading: "Loading…", hist_unavail: "History unavailable", no_data: "No data for this period.", total: "Total", est_cost: "Estimated cost", at_price: "at {p} €/kWh",
    avg_per: "Average / {u}", u_hour: "h", u_day: "day", u_month: "month", peak: "Peak", cons_per: "Consumption per {u}", per_hour: "hour", per_day: "day", per_month: "month",
    current: "Now", buy_peak: "Import peak", sell_peak: "Export peak", bought: "Imported", sold: "Exported", grid_buy: "Grid import", resale: "Export",
    min: "Min", max: "Max", average: "Average", energy: "Energy", avg_suffix: " (average)",
    device_power: "Device power", solar: "Solar", production: "Production", grid: "Grid", buy_sell: "Import and export", home: "Home",
    in_dur: "{p} in {d}", hc: "Off-peak", hp: "Peak", hc_long: "Off-peak hours", hp_long: "Peak hours", kwh_today: "{x} kWh today", pct_solar: "{x}% solar",
    l_show_totals: "Today's totals under the icons", l_title: "Title (optional)", l_show_frame: "Show the card frame", l_threshold: "Activity threshold (W)", l_curve_factor: "Line curvature (0 = straight)",
    l_solar_power: "Solar power (empty = Energy dashboard)", l_grid_power: "Grid power (empty = Energy dashboard)", l_export_power: "Export power (empty = estimated)",
    l_home_power: "Home power (empty = calculated)", l_export_energy: "Exported energy for the estimate (empty = Energy dashboard)",
    l_solar_label: "Info under Solar (empty = today's production)", l_home_label: "Info under Home (empty = solar share)", l_grid_label: "Info under Grid (empty = peak/off-peak tariff)",
    l_tariff_display: "Off-peak / peak hours", l_show_countdown: "Countdown to the next peak / off-peak change", l_hc_entity: "HOLM HP/HC off-peak sensor (empty = auto-detect)",
    l_tariff_entity: "Legacy method: current tariff (takes priority if set)", l_hc_price: "Off-peak price (number, to recognise off-peak hours)", l_hc_price_entity: "… or entity holding the off-peak price",
    l_show_devices: "Show active devices", l_show_device_names: "Show device names", l_max_devices: "Max number of devices", l_device_threshold: "Device threshold (W)",
    l_solar_color: "Solar colour", l_home_color: "Home / devices colour", l_grid_color: "Grid colour (off-peak)", l_grid_hp_color: "Grid colour (peak)", l_export_color: "Export colour",
    l_language: "Language", auto: "Automatic (profile)", sec_sensors: "Sensors", sec_labels: "Info under the icons", sec_devices: "Active devices", sec_colors: "Colours",
    td_color: "Grid colour (off-peak / peak)", td_label: "“Off-peak” / “Peak” label", td_both: "Colour and label",
    card_name: "HOLM – Compact power flow", card_desc: "Solar → Home ⇄ Grid in real time, today's totals and charts on tap, with active devices" },
  de: { d: "T", m12: "12 Monate", dates: "Daten…", consumption: "Verbrauch", power: "Leistung", details: "Details", close: "Schließen", from: "Von", to: "bis", show: "Anzeigen",
    loading: "Wird geladen…", hist_unavail: "Verlauf nicht verfügbar", no_data: "Keine Daten für diesen Zeitraum.", total: "Gesamt", est_cost: "Geschätzte Kosten", at_price: "zu {p} €/kWh",
    avg_per: "Durchschnitt / {u}", u_hour: "h", u_day: "Tag", u_month: "Monat", peak: "Spitze", cons_per: "Verbrauch pro {u}", per_hour: "Stunde", per_day: "Tag", per_month: "Monat",
    current: "Aktuell", buy_peak: "Bezugsspitze", sell_peak: "Einspeisespitze", bought: "Bezogen", sold: "Eingespeist", grid_buy: "Netzbezug", resale: "Einspeisung",
    min: "Min", max: "Max", average: "Durchschnitt", energy: "Energie", avg_suffix: " (Durchschnitt)",
    device_power: "Geräteleistung", solar: "Solar", production: "Erzeugung", grid: "Netz", buy_sell: "Bezug und Einspeisung", home: "Haus",
    in_dur: "{p} in {d}", hc: "NT", hp: "HT", hc_long: "Niedertarif", hp_long: "Hochtarif", kwh_today: "{x} kWh heute", pct_solar: "{x} % Solar",
    l_show_totals: "Tagessummen unter den Symbolen", l_title: "Titel (optional)", l_show_frame: "Kartenrahmen anzeigen", l_threshold: "Aktivitätsschwelle (W)", l_curve_factor: "Linienkrümmung (0 = gerade)",
    l_solar_power: "Solarleistung (leer = Energie-Dashboard)", l_grid_power: "Netzleistung (leer = Energie-Dashboard)", l_export_power: "Einspeiseleistung (leer = geschätzt)",
    l_home_power: "Hausleistung (leer = berechnet)", l_export_energy: "Eingespeiste Energie für die Schätzung (leer = Energie-Dashboard)",
    l_solar_label: "Info unter Solar (leer = heutige Erzeugung)", l_home_label: "Info unter Haus (leer = Solaranteil)", l_grid_label: "Info unter Netz (leer = NT/HT-Tarif)",
    l_tariff_display: "Niedertarif / Hochtarif", l_show_countdown: "Countdown bis zum nächsten NT/HT-Wechsel", l_hc_entity: "Niedertarif-Sensor HOLM HP/HC (leer = automatisch)",
    l_tariff_entity: "Alte Methode: aktueller Tarif (hat Vorrang, wenn gesetzt)", l_hc_price: "NT-Preis (Zahl, um den Niedertarif zu erkennen)", l_hc_price_entity: "… oder Entität mit dem NT-Preis",
    l_show_devices: "Aktive Geräte anzeigen", l_show_device_names: "Gerätenamen anzeigen", l_max_devices: "Max. Anzahl Geräte", l_device_threshold: "Geräteschwelle (W)",
    l_solar_color: "Farbe Solar", l_home_color: "Farbe Haus / Geräte", l_grid_color: "Farbe Netz (NT)", l_grid_hp_color: "Farbe Netz (HT)", l_export_color: "Farbe Einspeisung",
    l_language: "Sprache", auto: "Automatisch (Profil)", sec_sensors: "Sensoren", sec_labels: "Infos unter den Symbolen", sec_devices: "Aktive Geräte", sec_colors: "Farben",
    td_color: "Netzfarbe (NT / HT)", td_label: "Hinweis „Niedertarif“ / „Hochtarif“", td_both: "Farbe und Hinweis",
    card_name: "HOLM – Kompakter Energiefluss", card_desc: "Solar → Haus ⇄ Netz in Echtzeit, Tagessummen und Diagramme per Tippen, mit aktiven Geräten" },
  es: { d: "d", m12: "12 meses", dates: "Fechas…", consumption: "Consumo", power: "Potencia", details: "Detalles", close: "Cerrar", from: "Del", to: "al", show: "Mostrar",
    loading: "Cargando…", hist_unavail: "Historial no disponible", no_data: "No hay datos en este periodo.", total: "Total", est_cost: "Coste estimado", at_price: "a {p} €/kWh",
    avg_per: "Media / {u}", u_hour: "h", u_day: "día", u_month: "mes", peak: "Pico", cons_per: "Consumo por {u}", per_hour: "hora", per_day: "día", per_month: "mes",
    current: "Actual", buy_peak: "Pico de compra", sell_peak: "Pico de venta", bought: "Comprado", sold: "Vendido", grid_buy: "Compra a la red", resale: "Venta",
    min: "Mín", max: "Máx", average: "Media", energy: "Energía", avg_suffix: " (media)",
    device_power: "Potencia del dispositivo", solar: "Solar", production: "Producción", grid: "Red", buy_sell: "Compra y venta", home: "Casa",
    in_dur: "{p} en {d}", hc: "Valle", hp: "Punta", hc_long: "Horas valle", hp_long: "Horas punta", kwh_today: "{x} kWh hoy", pct_solar: "{x} % solar",
    l_show_totals: "Totales del día bajo los iconos", l_title: "Título (opcional)", l_show_frame: "Mostrar el marco de la tarjeta", l_threshold: "Umbral de actividad (W)", l_curve_factor: "Curvatura de las líneas (0 = rectas)",
    l_solar_power: "Potencia solar (vacío = panel de Energía)", l_grid_power: "Potencia de red (vacío = panel de Energía)", l_export_power: "Potencia vendida (vacío = estimada)",
    l_home_power: "Potencia de la casa (vacío = calculada)", l_export_energy: "Energía vendida para la estimación (vacío = panel de Energía)",
    l_solar_label: "Info bajo Solar (vacío = producción del día)", l_home_label: "Info bajo Casa (vacío = parte solar)", l_grid_label: "Info bajo Red (vacío = tarifa valle/punta)",
    l_tariff_display: "Horas valle / punta", l_show_countdown: "Cuenta atrás hasta el próximo cambio valle / punta", l_hc_entity: "Sensor de horas valle HOLM HP/HC (vacío = detección automática)",
    l_tariff_entity: "Método antiguo: tarifa actual (prioritaria si se indica)", l_hc_price: "Precio valle (número, para reconocer las horas valle)", l_hc_price_entity: "… o entidad con el precio valle",
    l_show_devices: "Mostrar los dispositivos activos", l_show_device_names: "Mostrar el nombre de los dispositivos", l_max_devices: "Número máx. de dispositivos", l_device_threshold: "Umbral de dispositivo (W)",
    l_solar_color: "Color solar", l_home_color: "Color casa / dispositivos", l_grid_color: "Color red (valle)", l_grid_hp_color: "Color red (punta)", l_export_color: "Color venta",
    l_language: "Idioma", auto: "Automático (perfil)", sec_sensors: "Sensores", sec_labels: "Info bajo los iconos", sec_devices: "Dispositivos activos", sec_colors: "Colores",
    td_color: "Color de la red (valle / punta)", td_label: "Indicación «Horas valle» / «Horas punta»", td_both: "Color e indicación",
    card_name: "HOLM – Flujo de potencia compacto", card_desc: "Solar → Casa ⇄ Red en tiempo real, totales del día y gráficos al tocar, con los dispositivos activos" },
  it: { d: "g", m12: "12 mesi", dates: "Date…", consumption: "Consumo", power: "Potenza", details: "Dettagli", close: "Chiudi", from: "Dal", to: "al", show: "Mostra",
    loading: "Caricamento…", hist_unavail: "Cronologia non disponibile", no_data: "Nessun dato per questo periodo.", total: "Totale", est_cost: "Costo stimato", at_price: "a {p} €/kWh",
    avg_per: "Media / {u}", u_hour: "h", u_day: "giorno", u_month: "mese", peak: "Picco", cons_per: "Consumo per {u}", per_hour: "ora", per_day: "giorno", per_month: "mese",
    current: "Attuale", buy_peak: "Picco di prelievo", sell_peak: "Picco di immissione", bought: "Prelevato", sold: "Immesso", grid_buy: "Prelievo dalla rete", resale: "Immissione",
    min: "Min", max: "Max", average: "Media", energy: "Energia", avg_suffix: " (media)",
    device_power: "Potenza del dispositivo", solar: "Solare", production: "Produzione", grid: "Rete", buy_sell: "Prelievo e immissione", home: "Casa",
    in_dur: "{p} tra {d}", hc: "F. punta", hp: "Punta", hc_long: "Fuori punta", hp_long: "Ore di punta", kwh_today: "{x} kWh oggi", pct_solar: "{x}% solare",
    l_show_totals: "Totali del giorno sotto le icone", l_title: "Titolo (facoltativo)", l_show_frame: "Mostra la cornice della scheda", l_threshold: "Soglia di attività (W)", l_curve_factor: "Curvatura delle linee (0 = dritte)",
    l_solar_power: "Potenza solare (vuoto = dashboard Energia)", l_grid_power: "Potenza di rete (vuoto = dashboard Energia)", l_export_power: "Potenza immessa (vuoto = stimata)",
    l_home_power: "Potenza della casa (vuoto = calcolata)", l_export_energy: "Energia immessa per la stima (vuoto = dashboard Energia)",
    l_solar_label: "Info sotto Solare (vuoto = produzione del giorno)", l_home_label: "Info sotto Casa (vuoto = quota solare)", l_grid_label: "Info sotto Rete (vuoto = tariffa a fasce)",
    l_tariff_display: "Fuori punta / punta", l_show_countdown: "Conto alla rovescia al prossimo cambio di fascia", l_hc_entity: "Sensore fuori punta HOLM HP/HC (vuoto = rilevamento automatico)",
    l_tariff_entity: "Metodo precedente: tariffa attuale (prioritaria se impostata)", l_hc_price: "Prezzo fuori punta (numero, per riconoscere la fascia)", l_hc_price_entity: "… o entità con il prezzo fuori punta",
    l_show_devices: "Mostra i dispositivi attivi", l_show_device_names: "Mostra il nome dei dispositivi", l_max_devices: "Numero max di dispositivi", l_device_threshold: "Soglia dispositivo (W)",
    l_solar_color: "Colore solare", l_home_color: "Colore casa / dispositivi", l_grid_color: "Colore rete (fuori punta)", l_grid_hp_color: "Colore rete (punta)", l_export_color: "Colore immissione",
    l_language: "Lingua", auto: "Automatica (profilo)", sec_sensors: "Sensori", sec_labels: "Info sotto le icone", sec_devices: "Dispositivi attivi", sec_colors: "Colori",
    td_color: "Colore della rete (fuori punta / punta)", td_label: "Indicazione «Fuori punta» / «Ore di punta»", td_both: "Colore e indicazione",
    card_name: "HOLM – Flusso di potenza compatto", card_desc: "Solare → Casa ⇄ Rete in tempo reale, totali del giorno e grafici al tocco, con i dispositivi attivi" },
  nl: { d: "d", m12: "12 maanden", dates: "Datums…", consumption: "Verbruik", power: "Vermogen", details: "Details", close: "Sluiten", from: "Van", to: "tot", show: "Tonen",
    loading: "Laden…", hist_unavail: "Geschiedenis niet beschikbaar", no_data: "Geen gegevens voor deze periode.", total: "Totaal", est_cost: "Geschatte kosten", at_price: "tegen {p} €/kWh",
    avg_per: "Gemiddeld / {u}", u_hour: "u", u_day: "dag", u_month: "maand", peak: "Piek", cons_per: "Verbruik per {u}", per_hour: "uur", per_day: "dag", per_month: "maand",
    current: "Nu", buy_peak: "Afnamepiek", sell_peak: "Teruglevering-piek", bought: "Afgenomen", sold: "Teruggeleverd", grid_buy: "Afname van het net", resale: "Teruglevering",
    min: "Min", max: "Max", average: "Gemiddeld", energy: "Energie", avg_suffix: " (gemiddeld)",
    device_power: "Vermogen van het apparaat", solar: "Zon", production: "Opwekking", grid: "Net", buy_sell: "Afname en teruglevering", home: "Huis",
    in_dur: "{p} over {d}", hc: "Dal", hp: "Piek", hc_long: "Daltarief", hp_long: "Piektarief", kwh_today: "{x} kWh vandaag", pct_solar: "{x}% zon",
    l_show_totals: "Dagtotalen onder de pictogrammen", l_title: "Titel (optioneel)", l_show_frame: "Kaartkader tonen", l_threshold: "Activiteitsdrempel (W)", l_curve_factor: "Kromming van de lijnen (0 = recht)",
    l_solar_power: "Zonnevermogen (leeg = Energiedashboard)", l_grid_power: "Netvermogen (leeg = Energiedashboard)", l_export_power: "Terugleververmogen (leeg = geschat)",
    l_home_power: "Huisvermogen (leeg = berekend)", l_export_energy: "Teruggeleverde energie voor de schatting (leeg = Energiedashboard)",
    l_solar_label: "Info onder Zon (leeg = opwekking van vandaag)", l_home_label: "Info onder Huis (leeg = aandeel zon)", l_grid_label: "Info onder Net (leeg = dal/piek-tarief)",
    l_tariff_display: "Dal- / piekuren", l_show_countdown: "Aftellen tot de volgende dal/piek-wissel", l_hc_entity: "Daltariefsensor HOLM HP/HC (leeg = automatisch)",
    l_tariff_entity: "Oude methode: huidig tarief (heeft voorrang indien ingesteld)", l_hc_price: "Dalprijs (getal, om daluren te herkennen)", l_hc_price_entity: "… of entiteit met de dalprijs",
    l_show_devices: "Actieve apparaten tonen", l_show_device_names: "Apparaatnamen tonen", l_max_devices: "Max. aantal apparaten", l_device_threshold: "Apparaatdrempel (W)",
    l_solar_color: "Kleur zon", l_home_color: "Kleur huis / apparaten", l_grid_color: "Kleur net (dal)", l_grid_hp_color: "Kleur net (piek)", l_export_color: "Kleur teruglevering",
    l_language: "Taal", auto: "Automatisch (profiel)", sec_sensors: "Sensoren", sec_labels: "Info onder de pictogrammen", sec_devices: "Actieve apparaten", sec_colors: "Kleuren",
    td_color: "Kleur van het net (dal / piek)", td_label: "Label ‘Daltarief’ / ‘Piektarief’", td_both: "Kleur en label",
    card_name: "HOLM – Compacte energiestroom", card_desc: "Zon → Huis ⇄ Net in realtime, dagtotalen en grafieken met een tik, met actieve apparaten" },
  pt: { d: "d", m12: "12 meses", dates: "Datas…", consumption: "Consumo", power: "Potência", details: "Detalhes", close: "Fechar", from: "De", to: "a", show: "Mostrar",
    loading: "A carregar…", hist_unavail: "Histórico indisponível", no_data: "Sem dados neste período.", total: "Total", est_cost: "Custo estimado", at_price: "a {p} €/kWh",
    avg_per: "Média / {u}", u_hour: "h", u_day: "dia", u_month: "mês", peak: "Pico", cons_per: "Consumo por {u}", per_hour: "hora", per_day: "dia", per_month: "mês",
    current: "Atual", buy_peak: "Pico de compra", sell_peak: "Pico de venda", bought: "Comprado", sold: "Vendido", grid_buy: "Compra à rede", resale: "Venda",
    min: "Mín", max: "Máx", average: "Média", energy: "Energia", avg_suffix: " (média)",
    device_power: "Potência do dispositivo", solar: "Solar", production: "Produção", grid: "Rede", buy_sell: "Compra e venda", home: "Casa",
    in_dur: "{p} em {d}", hc: "Vazio", hp: "Cheias", hc_long: "Horas de vazio", hp_long: "Horas cheias", kwh_today: "{x} kWh hoje", pct_solar: "{x}% solar",
    l_show_totals: "Totais do dia sob os ícones", l_title: "Título (opcional)", l_show_frame: "Mostrar a moldura do cartão", l_threshold: "Limite de atividade (W)", l_curve_factor: "Curvatura das linhas (0 = retas)",
    l_solar_power: "Potência solar (vazio = painel Energia)", l_grid_power: "Potência da rede (vazio = painel Energia)", l_export_power: "Potência vendida (vazio = estimada)",
    l_home_power: "Potência da casa (vazio = calculada)", l_export_energy: "Energia vendida para a estimativa (vazio = painel Energia)",
    l_solar_label: "Info sob Solar (vazio = produção do dia)", l_home_label: "Info sob Casa (vazio = parte solar)", l_grid_label: "Info sob Rede (vazio = tarifa bi-horária)",
    l_tariff_display: "Horas de vazio / cheias", l_show_countdown: "Contagem até à próxima mudança vazio / cheias", l_hc_entity: "Sensor de horas de vazio HOLM HP/HC (vazio = deteção automática)",
    l_tariff_entity: "Método antigo: tarifa atual (prioritária se indicada)", l_hc_price: "Preço de vazio (número, para reconhecer as horas de vazio)", l_hc_price_entity: "… ou entidade com o preço de vazio",
    l_show_devices: "Mostrar os dispositivos ativos", l_show_device_names: "Mostrar o nome dos dispositivos", l_max_devices: "Número máx. de dispositivos", l_device_threshold: "Limite do dispositivo (W)",
    l_solar_color: "Cor solar", l_home_color: "Cor casa / dispositivos", l_grid_color: "Cor da rede (vazio)", l_grid_hp_color: "Cor da rede (cheias)", l_export_color: "Cor da venda",
    l_language: "Idioma", auto: "Automático (perfil)", sec_sensors: "Sensores", sec_labels: "Info sob os ícones", sec_devices: "Dispositivos ativos", sec_colors: "Cores",
    td_color: "Cor da rede (vazio / cheias)", td_label: "Indicação «Horas de vazio» / «Horas cheias»", td_both: "Cor e indicação",
    card_name: "HOLM – Fluxo de potência compacto", card_desc: "Solar → Casa ⇄ Rede em tempo real, totais do dia e gráficos ao toque, com os dispositivos ativos" },
  pl: { d: "d", m12: "12 mies.", dates: "Daty…", consumption: "Zużycie", power: "Moc", details: "Szczegóły", close: "Zamknij", from: "Od", to: "do", show: "Pokaż",
    loading: "Ładowanie…", hist_unavail: "Historia niedostępna", no_data: "Brak danych w tym okresie.", total: "Razem", est_cost: "Szacowany koszt", at_price: "po {p} €/kWh",
    avg_per: "Średnio / {u}", u_hour: "h", u_day: "dzień", u_month: "mies.", peak: "Szczyt", cons_per: "Zużycie na {u}", per_hour: "godzinę", per_day: "dzień", per_month: "miesiąc",
    current: "Teraz", buy_peak: "Szczyt poboru", sell_peak: "Szczyt oddawania", bought: "Pobrano", sold: "Oddano", grid_buy: "Pobór z sieci", resale: "Oddawanie",
    min: "Min", max: "Maks", average: "Średnia", energy: "Energia", avg_suffix: " (średnia)",
    device_power: "Moc urządzenia", solar: "PV", production: "Produkcja", grid: "Sieć", buy_sell: "Pobór i oddawanie", home: "Dom",
    in_dur: "{p} za {d}", hc: "Poza szczytem", hp: "Szczyt", hc_long: "Strefa pozaszczytowa", hp_long: "Strefa szczytowa", kwh_today: "{x} kWh dziś", pct_solar: "{x}% PV",
    l_show_totals: "Dzisiejsze sumy pod ikonami", l_title: "Tytuł (opcjonalnie)", l_show_frame: "Pokaż ramkę karty", l_threshold: "Próg aktywności (W)", l_curve_factor: "Krzywizna linii (0 = proste)",
    l_solar_power: "Moc PV (puste = panel Energia)", l_grid_power: "Moc sieci (puste = panel Energia)", l_export_power: "Moc oddawana (puste = szacowana)",
    l_home_power: "Moc domu (puste = obliczana)", l_export_energy: "Energia oddana do szacowania (puste = panel Energia)",
    l_solar_label: "Info pod PV (puste = dzisiejsza produkcja)", l_home_label: "Info pod Domem (puste = udział PV)", l_grid_label: "Info pod Siecią (puste = taryfa strefowa)",
    l_tariff_display: "Strefa pozaszczytowa / szczytowa", l_show_countdown: "Odliczanie do następnej zmiany strefy", l_hc_entity: "Czujnik strefy pozaszczytowej HOLM HP/HC (puste = automatycznie)",
    l_tariff_entity: "Stara metoda: bieżąca taryfa (ma pierwszeństwo, jeśli ustawiona)", l_hc_price: "Cena pozaszczytowa (liczba, do rozpoznania strefy)", l_hc_price_entity: "… lub encja z ceną pozaszczytową",
    l_show_devices: "Pokaż aktywne urządzenia", l_show_device_names: "Pokaż nazwy urządzeń", l_max_devices: "Maks. liczba urządzeń", l_device_threshold: "Próg urządzenia (W)",
    l_solar_color: "Kolor PV", l_home_color: "Kolor domu / urządzeń", l_grid_color: "Kolor sieci (poza szczytem)", l_grid_hp_color: "Kolor sieci (szczyt)", l_export_color: "Kolor oddawania",
    l_language: "Język", auto: "Automatycznie (profil)", sec_sensors: "Czujniki", sec_labels: "Info pod ikonami", sec_devices: "Aktywne urządzenia", sec_colors: "Kolory",
    td_color: "Kolor sieci (poza szczytem / szczyt)", td_label: "Etykieta „Poza szczytem” / „Szczyt”", td_both: "Kolor i etykieta",
    card_name: "HOLM – Kompaktowy przepływ mocy", card_desc: "PV → Dom ⇄ Sieć w czasie rzeczywistym, dzisiejsze sumy i wykresy po dotknięciu, z aktywnymi urządzeniami" },
};
const LANG_NAMES = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português", pl: "Polski" };
const LOCALES = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL", pt: "pt-PT", pl: "pl-PL" };
// langue : option `language` de la carte, sinon celle du profil Home Assistant ; anglais si non traduite
const langOf = (hass, c) => { const l = String((c && c.language) || hass?.locale?.language || hass?.language || navigator.language || "en").toLowerCase().split(/[-_]/)[0]; return I18N[l] ? l : "en"; };
const tr = (l, k, v) => { let s = (I18N[l] && I18N[l][k]) ?? I18N.en[k] ?? I18N.fr[k] ?? k; if (v) for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
let NUMLOC = "fr-FR"; // format des nombres et des dates, suit la langue de la dernière carte affichée
const setLoc = (hass, c) => { const l = langOf(hass, c); const p = hass?.locale?.language; NUMLOC = !(c && c.language) && p && p.toLowerCase().startsWith(l) ? p : LOCALES[l]; return l; };
// ---- holm-energy-chart : panneau graphique partagé (HOLM Power Flow Card / HOLM Energy Cards) ----
// open(hass, {
//   name, subtitle, color, icon, entity (pour « Détails »),
//   mode: "power" | "energy",
//   power: entité de puissance (W ou kW) ou liste d'entités additionnées,  signed: true = négatif → revente (réseau)
//   energy: [statistic_id…] (kWh, ajoutés),  energyNeg: [statistic_id…] (soustraits),  energyOut: [statistic_id…] (revente, réseau)
//   price: €/kWh (estimation du coût, mode énergie), outColor, defaultRange
// })
if (!customElements.get("holm-energy-chart-v1b")) {
  const frc = (v, d = 1) => Number(v).toLocaleString(NUMLOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const escc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fW = (w) => (Math.abs(w) >= 1000 ? `${frc(w / 1000, Math.abs(w) >= 10000 ? 1 : 2)} kW` : `${frc(w, 0)} W`);
  const fK = (k) => `${frc(k, Math.abs(k) < 10 ? 2 : 1)} kWh`;
  const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  class HolmEnergyChart extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._onKey = (e) => { if (e.key === "Escape") this.close(); };
      this._onResize = () => this._draw();
    }
    _t(k, v) { return tr(this._l, k, v); }
    open(hass, o) {
      this._hass = hass; this._o = o; this._data = null; this._l = o.lang || langOf(hass);
      this._ranges = o.mode === "energy"
        ? [["24h", "24 h"], ["7d", "7 " + this._t("d")], ["30d", "30 " + this._t("d")], ["12m", this._t("m12")], ["custom", this._t("dates")]]
        : [["6h", "6 h"], ["24h", "24 h"], ["48h", "48 h"], ["7d", "7 " + this._t("d")], ["custom", this._t("dates")]];
      this._r = o.defaultRange || (o.mode === "energy" ? "7d" : "24h");
      const t = new Date();
      this._from = isoDay(new Date(t - 6 * 864e5)); this._to = isoDay(t);
      this._build();
      document.addEventListener("keydown", this._onKey);
      window.addEventListener("resize", this._onResize);
      requestAnimationFrame(() => this.shadowRoot.querySelector(".bg")?.classList.add("on"));
      this._load();
    }
    close() {
      document.removeEventListener("keydown", this._onKey);
      window.removeEventListener("resize", this._onResize);
      this.shadowRoot.querySelector(".bg")?.classList.remove("on");
      setTimeout(() => { this.shadowRoot.innerHTML = ""; }, 220);
    }
    _build() {
      const o = this._o;
      this.shadowRoot.innerHTML = `<style>${HolmEnergyChart.css()}</style>
        <div class="bg" style="--ac:${o.color || "#0abfbf"};--out:${o.outColor || "#9b6fd6"}"><div class="dlg" role="dialog" aria-label="${escc(o.name)}">
          <div class="hd"><div class="ico"><ha-icon icon="${escc(o.icon || "mdi:flash")}"></ha-icon></div>
            <div class="tt"><b>${escc(o.name)}</b><small>${escc(o.subtitle || this._t(o.mode === "energy" ? "consumption" : "power"))}</small></div>
            ${o.entity ? `<button class="det" title="${this._t("details")}"><ha-icon icon="mdi:information-outline"></ha-icon></button>` : ""}
            <button class="x" aria-label="${this._t("close")}"><ha-icon icon="mdi:close"></ha-icon></button></div>
          <div class="rg">${this._ranges.map(([k, l]) => `<button data-r="${k}" class="${k === this._r ? "on" : ""}">${l}</button>`).join("")}</div>
          <div class="cu" style="display:${this._r === "custom" ? "flex" : "none"}"><label>${this._t("from")} <input type="date" id="f" value="${this._from}" max="${isoDay(new Date())}"></label>
            <label>${this._t("to")} <input type="date" id="t" value="${this._to}" max="${isoDay(new Date())}"></label><button class="ok">${this._t("show")}</button></div>
          <div class="stats" id="stats"></div>
          <div class="ch" id="ch"><div class="ld">${this._t("loading")}</div></div>
          <div class="lg" id="lg"></div>
        </div></div>`;
      const r = this.shadowRoot;
      r.querySelector(".bg").addEventListener("click", (e) => { if (e.target.classList.contains("bg")) this.close(); });
      r.querySelector(".x").addEventListener("click", () => this.close());
      r.querySelector(".det")?.addEventListener("click", () => {
        const id = o.entity; this.close();
        const ev = new Event("hass-more-info", { bubbles: true, composed: true }); ev.detail = { entityId: id };
        (document.querySelector("home-assistant") || document.body).dispatchEvent(ev);
      });
      r.querySelectorAll(".rg button").forEach((b) => b.addEventListener("click", () => {
        this._r = b.dataset.r;
        r.querySelectorAll(".rg button").forEach((x) => x.classList.toggle("on", x === b));
        r.querySelector(".cu").style.display = this._r === "custom" ? "flex" : "none";
        this._load();
      }));
      r.querySelector(".ok").addEventListener("click", () => { this._from = r.getElementById("f").value; this._to = r.getElementById("t").value; this._load(); });
    }
    _span() {
      const now = new Date();
      const H = { "6h": 6, "24h": 24, "48h": 48, "7d": 168 };
      if (this._o.mode === "power" && H[this._r]) return { start: new Date(now - H[this._r] * 3600e3), end: now };
      if (this._r === "24h") return { start: new Date(now - 24 * 3600e3), end: now };
      if (this._r === "7d") return { start: day0(new Date(now - 6 * 864e5)), end: now };
      if (this._r === "30d") return { start: day0(new Date(now - 29 * 864e5)), end: now };
      if (this._r === "12m") { const s = new Date(now.getFullYear(), now.getMonth() - 11, 1); return { start: s, end: now }; }
      let a = this._from ? new Date(this._from + "T00:00:00") : day0(now), b = this._to ? new Date(this._to + "T00:00:00") : day0(now);
      if (b < a) [a, b] = [b, a];
      b = new Date(+b + 864e5); if (b > now) b = now;
      return { start: a, end: b };
    }
    async _stats(ids, start, end, period, types) {
      if (!ids.length) return {};
      return this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: ids, period, types, units: { energy: "kWh", power: "W" } });
    }
    async _load() {
      const seq = (this._seq = (this._seq || 0) + 1);
      const o = this._o, { start, end } = this._span();
      const days = (end - start) / 864e5;
      const ch = this.shadowRoot.getElementById("ch");
      if (ch) ch.innerHTML = `<div class="ld">${this._t("loading")}</div>`;
      try {
        const eIds = [...new Set([...(o.energy || []), ...(o.energyNeg || []), ...(o.energyOut || [])].filter(Boolean))];
        let d;
        if (o.mode === "energy") {
          const period = this._r === "24h" || days <= 3 ? "hour" : this._r === "12m" || days > 93 ? "month" : "day";
          const st = await this._stats(eIds, start, end, period, ["change"]);
          const bars = new Map();
          for (const id of o.energy || []) for (const s of st[id] || []) { const t = +new Date(s.start); bars.set(t, (bars.get(t) || 0) + Math.max(0, Number(s.change) || 0)); }
          const T = [...bars.keys()].sort((a, b) => a - b);
          let line = null;
          if (o.power && period === "hour") line = await this._powerSeries(o.power, start, end);
          d = { kind: "bars", period, t0: +start, t1: +end, bars: T.map((t) => ({ t, v: bars.get(t) })), line };
        } else {
          const ser = await this._powerSeries(o.power, start, end);
          let eIn = NaN, eOut = NaN;
          if (eIds.length) {
            const st = await this._stats(eIds, start, end, days <= 3 ? "hour" : "day", ["change"]);
            const sum = (ids) => ids.reduce((a, id) => a + (st[id] || []).reduce((b, s) => b + (Number(s.change) || 0), 0), 0);
            if ((o.energy || []).length) eIn = Math.max(0, sum(o.energy) - sum(o.energyNeg || []));
            if ((o.energyOut || []).length) eOut = sum(o.energyOut);
          }
          d = { kind: "power", t0: +start, t1: +end, pts: ser, eIn, eOut };
        }
        if (seq !== this._seq) return;
        this._data = d;
        this._draw();
      } catch (e) {
        if (seq === this._seq && ch) ch.innerHTML = `<div class="ld">${this._t("hist_unavail")} : ${escc(e && e.message ? e.message : e)}</div>`;
      }
    }
    // série de puissance (W) : statistiques (5 min / heure) si dispo, sinon historique brut
    async _powerSeries(ids, start, end) {
      if (Array.isArray(ids)) {
        if (ids.length === 1) return this._powerSeries(ids[0], start, end);
        const all = await Promise.all(ids.map((i) => this._powerSeries(i, start, end)));
        const T = [...new Set(all.flatMap((a) => a.map((p) => p.t)))].sort((a, b) => a - b);
        const idx = all.map(() => -1);
        return T.map((t) => {
          let v = 0;
          all.forEach((a, k) => { while (idx[k] + 1 < a.length && a[idx[k] + 1].t <= t) idx[k]++; if (idx[k] >= 0) v += a[idx[k]].v; });
          return { t, v };
        });
      }
      const id = ids;
      const kw = (this._hass.states[id]?.attributes.unit_of_measurement || "") === "kW";
      const hrs = (end - start) / 3600e3;
      try {
        const st = await this._stats([id], start, end, hrs <= 72 ? "5minute" : "hour", ["mean", "min", "max"]);
        const rows = st[id] || [];
        if (rows.length > 2) return rows.map((s) => ({ t: +new Date(s.start), v: Number(s.mean), lo: Number(s.min), hi: Number(s.max) })).filter((p) => !isNaN(p.v));
      } catch (e) { /* pas de statistiques : historique */ }
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(),
        entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
      return (r[id] || []).map((x) => ({ t: (x.lu != null ? x.lu : x.lc) * 1000, v: parseFloat(x.s) * (kw ? 1000 : 1) })).filter((p) => !isNaN(p.v));
    }
    _xAxis(d, W, P) {
      const span = d.t1 - d.t0, hrs = span / 3600e3;
      const out = [];
      if (hrs <= 50) {
        const step = hrs <= 7 ? 1 : hrs <= 25 ? 3 : 6;
        const f = new Date(d.t0); f.setMinutes(0, 0, 0);
        for (let t = +f; t <= d.t1; t += 3600e3) { const dt = new Date(t); if (t >= d.t0 && dt.getHours() % step === 0) out.push([t, dt.getHours() === 0 && hrs > 25 ? dt.toLocaleDateString(NUMLOC, { weekday: "short" }) : dt.getHours() + "h"]); }
      } else if (hrs <= 24 * 40) {
        const step = hrs <= 24 * 8 ? 1 : hrs <= 24 * 16 ? 2 : 5;
        for (let t = +day0(new Date(d.t0)), i = 0; t <= d.t1; t = +new Date(new Date(t).setDate(new Date(t).getDate() + 1)), i++) if (t >= d.t0 && i % step === 0)
          out.push([t, new Date(t).toLocaleDateString(NUMLOC, hrs <= 24 * 8 ? { weekday: "short", day: "numeric" } : { day: "numeric", month: "short" })]);
      } else {
        const s = new Date(d.t0); s.setDate(1); s.setHours(0, 0, 0, 0);
        for (let m = new Date(s); +m <= d.t1; m.setMonth(m.getMonth() + 1)) if (+m >= d.t0 - 864e5) out.push([+m, m.toLocaleDateString(NUMLOC, { month: "short" })]);
      }
      return out;
    }
    _draw() {
      const d = this._data, ch = this.shadowRoot.getElementById("ch"), st = this.shadowRoot.getElementById("stats"), lg = this.shadowRoot.getElementById("lg");
      if (!d || !ch) return;
      const o = this._o;
      const W = Math.max(280, ch.clientWidth || 600), H = Math.round(Math.min(320, Math.max(200, W * 0.42)));
      const P = { l: 44, r: d.kind === "bars" && d.line ? 44 : 12, t: 12, b: 24 };
      const x = (t) => P.l + ((t - d.t0) / (d.t1 - d.t0 || 1)) * (W - P.l - P.r);
      const nice = (m) => { const p = Math.pow(10, Math.floor(Math.log10(m || 1))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
      const xs = this._xAxis(d, W, P);
      let svgBody = "", stats = "", legend = "", hover = null;
      if (d.kind === "bars") {
        if (!d.bars.length) { ch.innerHTML = `<div class="ld">${this._t("no_data")}</div>`; st.innerHTML = ""; lg.innerHTML = ""; return; }
        const step = { hour: 3600e3, day: 864e5, month: 30.4 * 864e5 }[d.period];
        const t1 = Math.max(d.t1, d.bars[d.bars.length - 1].t + step);
        d.t1 = t1;
        const max = Math.max(...d.bars.map((b) => b.v), 1e-6), top = nice(max * 1.08);
        const y = (v) => P.t + (1 - v / top) * (H - P.t - P.b);
        const bw = Math.max(2, (x(d.t0 + step) - x(d.t0)) * 0.72);
        const ys = [0, top / 2, top];
        svgBody += ys.map((v) => `<line class="gl" x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="yl" x="${P.l - 6}" y="${(y(v) + 3.5).toFixed(1)}">${frc(v, top < 1 ? 2 : top < 10 ? 1 : 0)}</text>`).join("");
        svgBody += `<text class="yu" x="${P.l - 6}" y="${P.t - 2}">kWh</text>`;
        const pk = d.bars.reduce((a, b) => (b.v > a.v ? b : a), d.bars[0]);
        svgBody += d.bars.map((b) => { const cx = x(b.t + step / 2), h = Math.max(0, H - P.b - y(b.v)); return `<rect class="bar${b === pk ? " pk" : ""}" x="${(cx - bw / 2).toFixed(1)}" y="${(H - P.b - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 3).toFixed(1)}"/>`; }).join("");
        if (d.line && d.line.length > 1) {
          const lmax = nice(Math.max(...d.line.map((p) => p.v), 1) * 1.08);
          const yl = (v) => P.t + (1 - v / lmax) * (H - P.t - P.b);
          svgBody += `<path class="pw" d="M${d.line.map((p) => `${x(p.t).toFixed(1)} ${yl(p.v).toFixed(1)}`).join(" L")}"/>`;
          svgBody += [0, lmax / 2, lmax].map((v) => `<text class="yr" x="${W - P.r + 6}" y="${(yl(v) + 3.5).toFixed(1)}">${fW(v).replace(" ", "")}</text>`).join("");
          legend += `<span><i class="lpw"></i>${this._t("power")}</span>`;
        }
        const tot = d.bars.reduce((a, b) => a + b.v, 0);
        const unit = this._t({ hour: "u_hour", day: "u_day", month: "u_month" }[d.period]);
        const pkLbl = new Date(pk.t).toLocaleString(NUMLOC, d.period === "hour" ? { weekday: "short", hour: "2-digit", minute: "2-digit" } : d.period === "day" ? { weekday: "short", day: "numeric", month: "short" } : { month: "long", year: "numeric" });
        stats = `<div><small>${this._t("total")}</small><b>${fK(tot)}</b></div>${o.price > 0 ? `<div><small>${this._t("est_cost")}</small><b>${frc(tot * o.price, 2)} €</b><em>${this._t("at_price", { p: frc(o.price, 3) })}</em></div>` : ""}
          <div><small>${this._t("avg_per", { u: unit })}</small><b>${fK(tot / d.bars.length)}</b></div><div><small>${this._t("peak")}</small><b>${fK(pk.v)}</b><em>${escc(pkLbl)}</em></div>`;
        legend = `<span><i class="lbar"></i>${this._t("cons_per", { u: this._t({ hour: "per_hour", day: "per_day", month: "per_month" }[d.period]) })}</span>` + legend;
        hover = (t) => {
          const b = d.bars.find((q) => t >= q.t && t < q.t + step); if (!b) return null;
          const lbl = new Date(b.t).toLocaleString(NUMLOC, d.period === "hour" ? { weekday: "short", hour: "2-digit", minute: "2-digit" } : d.period === "day" ? { weekday: "long", day: "numeric", month: "short" } : { month: "long", year: "numeric" });
          return { px: x(b.t + step / 2), py: y(b.v), html: `<small>${escc(lbl)}</small><b>${fK(b.v)}</b>${o.price > 0 ? `<span>≈ ${frc(b.v * o.price, 2)} €</span>` : ""}` };
        };
      } else {
        const pts = d.pts;
        if (!pts.length) { ch.innerHTML = `<div class="ld">${this._t("no_data")}</div>`; st.innerHTML = ""; lg.innerHTML = ""; return; }
        const vals = pts.map((p) => p.v);
        let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
        hi = hi > 0 ? nice(hi * 1.08) : 0; lo = lo < 0 ? -nice(-lo * 1.08) : 0;
        if (hi === lo) hi = 100;
        const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
        const ys = lo < 0 ? [lo, 0, hi] : [0, hi / 2, hi];
        svgBody += ys.map((v) => `<line class="gl${v === 0 ? " z" : ""}" x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="yl" x="${P.l - 6}" y="${(y(v) + 3.5).toFixed(1)}">${fW(Math.abs(v)).replace(" ", "")}</text>`).join("");
        const step = pts.length > 1 ? Math.min(...pts.slice(1, 50).map((p, i) => p.t - pts[i].t).filter((v) => v > 0)) : 0;
        const isStat = pts[0].hi !== undefined;
        // escalier pour l'historique brut, ligne pour les statistiques
        const coords = [];
        pts.forEach((p, i) => { const px = x(Math.max(p.t, d.t0)); if (!isStat && i) coords.push([px, y(pts[i - 1].v)]); coords.push([px, y(p.v)]); });
        coords.push([x(d.t1), y(pts[pts.length - 1].v)]);
        const line = "M" + coords.map((c) => `${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" L");
        const z = y(0).toFixed(1);
        const area = `${line} L${x(d.t1).toFixed(1)} ${z} L${coords[0][0].toFixed(1)} ${z} Z`;
        svgBody += `<clipPath id="cpI"><rect x="0" y="0" width="${W}" height="${z}"/></clipPath><clipPath id="cpO"><rect x="0" y="${z}" width="${W}" height="${H}"/></clipPath>
          <path class="ai" d="${area}" clip-path="url(#cpI)"/>${lo < 0 ? `<path class="ao" d="${area}" clip-path="url(#cpO)"/>` : ""}
          <path class="li" d="${line}" clip-path="url(#cpI)"/>${lo < 0 ? `<path class="lo" d="${line}" clip-path="url(#cpO)"/>` : ""}`;
        const dt = (i) => (i + 1 < pts.length ? pts[i + 1].t : d.t1) - Math.max(pts[i].t, d.t0);
        let pos = 0, neg = 0, tw = 0, wsum = 0;
        pts.forEach((p, i) => { const h = Math.max(0, dt(i)) / 3600e3; if (p.v > 0) pos += p.v * h; else neg += -p.v * h; tw += h; wsum += p.v * h; });
        const pIds = Array.isArray(o.power) ? o.power : [o.power];
        const cur = o.current != null ? o.current : pIds.reduce((a, i) => { const s = this._hass.states[i]; const v = parseFloat(s?.state); return a + (isNaN(v) ? NaN : v * ((s.attributes.unit_of_measurement || "") === "kW" ? 1000 : 1)); }, 0);
        const curW = isNaN(cur) ? pts[pts.length - 1].v : cur;
        const mx = Math.max(...pts.map((p) => (p.hi !== undefined && !isNaN(p.hi) ? p.hi : p.v)));
        const mn = Math.min(...pts.map((p) => (p.lo !== undefined && !isNaN(p.lo) ? p.lo : p.v)));
        const eIn = !isNaN(d.eIn) ? d.eIn : pos / 1000, eOut = !isNaN(d.eOut) ? d.eOut : neg / 1000;
        if (o.signed) {
          stats = `<div><small>${this._t("current")}</small><b>${curW < 0 ? "↑ " : curW > 0 ? "↓ " : ""}${fW(Math.abs(curW))}</b></div><div><small>${this._t("buy_peak")}</small><b>${fW(Math.max(0, mx))}</b></div>
            ${mn < 0 ? `<div><small>${this._t("sell_peak")}</small><b>${fW(-mn)}</b></div>` : ""}<div class="in"><small>${this._t("bought")}</small><b>${fK(eIn)}</b></div><div class="out"><small>${this._t("sold")}</small><b>${fK(eOut)}</b></div>`;
          legend = `<span><i class="lin"></i>${this._t("grid_buy")}</span><span><i class="lout"></i>${this._t("resale")}</span>`;
        } else {
          stats = `<div><small>${this._t("current")}</small><b>${fW(curW)}</b></div><div><small>${this._t("min")}</small><b>${fW(Math.max(0, mn))}</b></div><div><small>${this._t("max")}</small><b>${fW(mx)}</b></div>
            <div><small>${this._t("average")}</small><b>${fW(tw ? wsum / tw : 0)}</b></div><div><small>${this._t("energy")}</small><b>${fK(eIn)}</b></div>`;
          legend = `<span><i class="lin"></i>${this._t("power")}${isStat ? this._t("avg_suffix") : ""}</span>`;
        }
        hover = (t) => {
          let p = null, pi = 0; for (let i = 0; i < pts.length; i++) { if (pts[i].t <= t) { p = pts[i]; pi = i; } else break; }
          if (!p) p = pts[0];
          const lbl = new Date(t).toLocaleString(NUMLOC, { weekday: "short", hour: "2-digit", minute: "2-digit" });
          const v = p.v, extra = isStat && !isNaN(p.lo) && step ? `<span>${this._t("min").toLowerCase()} ${fW(p.lo)} · ${this._t("max").toLowerCase()} ${fW(p.hi)}</span>` : "";
          return { px: x(t), py: y(v), html: `<small>${escc(lbl)}</small><b>${o.signed ? (v < 0 ? "↑ revente " : "↓ achat ") : ""}${fW(Math.abs(v))}</b>${extra}` };
        };
      }
      svgBody += xs.map(([t, l]) => `<text class="xl" x="${x(t).toFixed(1)}" y="${H - 6}">${escc(l)}</text>`).join("");
      ch.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
        <defs><linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".38"/><stop offset="1" stop-color="var(--ac)" stop-opacity=".02"/></linearGradient>
        <linearGradient id="go" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--out)" stop-opacity=".42"/><stop offset="1" stop-color="var(--out)" stop-opacity=".03"/></linearGradient></defs>
        ${svgBody}<g class="hv" style="display:none"><line class="hl" y1="${P.t}" y2="${H - P.b}"/><circle r="4"/></g></svg><div class="tip" style="display:none"></div>`;
      st.innerHTML = stats; lg.innerHTML = legend;
      const svg = ch.querySelector("svg"), hv = ch.querySelector(".hv"), tip = ch.querySelector(".tip");
      const show = (ev) => {
        const rc = svg.getBoundingClientRect(), px = ((ev.clientX - rc.left) / rc.width) * W;
        const hideTip = () => { hv.style.display = "none"; tip.style.display = "none"; };
        if (px < P.l || px > W - P.r) return hideTip();
        const r = hover(d.t0 + ((px - P.l) / (W - P.l - P.r)) * (d.t1 - d.t0));
        if (!r) return hideTip();
        hv.style.display = ""; const ln = hv.querySelector("line"); ln.setAttribute("x1", r.px); ln.setAttribute("x2", r.px);
        const c = hv.querySelector("circle"); c.setAttribute("cx", r.px); c.setAttribute("cy", r.py);
        tip.style.display = ""; tip.innerHTML = r.html;
        tip.style.left = `${Math.min(Math.max((r.px / W) * rc.width, 70), rc.width - 70)}px`;
      };
      svg.addEventListener("pointermove", show); svg.addEventListener("pointerdown", show);
      svg.addEventListener("pointerleave", () => { hv.style.display = "none"; tip.style.display = "none"; });
    }
    static css() {
      return `
      .bg { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;
        background:rgba(4,8,12,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); opacity:0; transition:opacity .2s;
        font-family:var(--ha-font-family-body, var(--paper-font-body1_-_font-family, system-ui, sans-serif)); }
      .bg.on { opacity:1; }
      .dlg { width:100%; max-width:780px; max-height:100%; overflow:auto; box-sizing:border-box; padding:16px; border-radius:22px; color:#e6f2f5;
        background:linear-gradient(160deg, rgba(22,30,40,.98), rgba(10,15,22,.99)); border:1px solid rgba(255,255,255,.08); box-shadow:0 20px 60px rgba(0,0,0,.5);
        transform:translateY(12px) scale(.98); transition:transform .22s; }
      .bg.on .dlg { transform:none; }
      button { font:inherit; color:inherit; border:0; background:none; cursor:pointer; padding:0; }
      .hd { display:flex; align-items:center; gap:10px; }
      .ico { width:38px; height:38px; border-radius:50%; display:grid; place-items:center; color:var(--ac); background:color-mix(in srgb, var(--ac) 18%, transparent); flex:none; }
      .ico ha-icon { --mdc-icon-size:20px; }
      .tt { flex:1; min-width:0; display:flex; flex-direction:column; } .tt b { font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .tt small { font-size:12px; color:rgba(220,235,240,.62); }
      .x, .det { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.07); flex:none; }
      .x ha-icon, .det ha-icon { --mdc-icon-size:18px; }
      .rg { display:flex; gap:3px; padding:3px; border-radius:12px; background:rgba(0,0,0,.3); margin-top:12px; overflow-x:auto; scrollbar-width:none; }
      .rg button { flex:1; height:30px; padding:0 10px; border-radius:9px; font-size:12.5px; font-weight:700; color:rgba(220,235,240,.7); white-space:nowrap; }
      .rg button.on { color:#0b1416; background:var(--ac); }
      .cu { gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; font-size:13px; color:rgba(220,235,240,.75); }
      .cu label { display:flex; align-items:center; gap:6px; }
      .cu input { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#e6f2f5; border-radius:9px; padding:6px 8px; font:inherit; color-scheme:dark; }
      .cu .ok { padding:7px 14px; border-radius:9px; background:var(--ac); color:#0b1416; font-weight:700; }
      .stats { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 8px; }
      .stats div { flex:1 1 90px; padding:7px 10px; border-radius:12px; background:rgba(255,255,255,.05); display:flex; flex-direction:column; min-width:0; }
      .stats div.in { box-shadow:inset 3px 0 0 var(--ac); } .stats div.out { box-shadow:inset 3px 0 0 var(--out); }
      .stats small { font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:rgba(220,235,240,.6); }
      .stats b { font-size:17px; font-variant-numeric:tabular-nums; white-space:nowrap; } .stats em { font-style:normal; font-size:11px; color:rgba(220,235,240,.6); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ch { position:relative; min-height:200px; }
      .ch svg { display:block; width:100%; height:auto; touch-action:pan-y; }
      .ld { display:grid; place-items:center; min-height:200px; font-size:13px; color:rgba(220,235,240,.62); text-align:center; }
      .gl { stroke:rgba(255,255,255,.07); } .gl.z { stroke:rgba(255,255,255,.22); }
      .yl, .xl, .yr, .yu { fill:rgba(220,235,240,.55); font-size:10.5px; } .yl, .yu { text-anchor:end; } .yr { text-anchor:start; } .xl { text-anchor:middle; } .yu { font-size:9.5px; }
      .bar { fill:var(--ac); opacity:.78; } .bar.pk { opacity:1; }
      .pw { fill:none; stroke:#e6f2f5; stroke-opacity:.7; stroke-width:1.6; stroke-linejoin:round; }
      .ai { fill:url(#gi); } .ao { fill:url(#go); }
      .li { fill:none; stroke:var(--ac); stroke-width:2; stroke-linejoin:round; } .lo { fill:none; stroke:var(--out); stroke-width:2; stroke-linejoin:round; }
      .hl { stroke:rgba(255,255,255,.35); stroke-dasharray:3 3; } .hv circle { fill:#fff; stroke:var(--ac); stroke-width:2; }
      .tip { position:absolute; top:4px; transform:translateX(-50%); padding:6px 9px; border-radius:10px; background:rgba(15,22,30,.95); box-shadow:0 6px 18px rgba(0,0,0,.4);
        display:flex; flex-direction:column; align-items:center; pointer-events:none; font-size:12px; white-space:nowrap; }
      .tip small { color:rgba(220,235,240,.6); font-size:11px; } .tip b { font-size:15px; } .tip span { color:rgba(220,235,240,.75); font-size:11px; }
      .lg { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:11.5px; color:rgba(220,235,240,.65); }
      .lg span { display:flex; align-items:center; gap:5px; } .lg i { width:14px; height:9px; border-radius:2px; display:inline-block; }
      .lbar, .lin { background:var(--ac); } .lout { background:var(--out); } .lpw { height:2px !important; background:#e6f2f5; }
      @media (max-width:480px) { .bg { padding:8px; align-items:flex-end; } .dlg { border-radius:22px 22px 14px 14px; padding:12px; } }`;
    }
  }
  customElements.define("holm-energy-chart-v1b", HolmEnergyChart);
}
const openEnergyChart = (hass, o) => {
  let dlg = document.querySelector("holm-energy-chart-v1b");
  if (!dlg) { dlg = document.createElement("holm-energy-chart-v1b"); document.body.appendChild(dlg); }
  dlg.open(hass, o);
};

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fr = (v, d = 1) => Number(v).toLocaleString(NUMLOC, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtW = (w) => (Math.abs(w) >= 1000 ? [fr(w / 1000, Math.abs(w) >= 10000 ? 1 : 2), "kW"] : [fr(w, 0), "W"]);
const DEF = { solar_color: "#e3a21a", home_color: "#0abfbf", grid_color: "#4a90d9", grid_hp_color: "#e2702a", export_color: "#9b6fd6" };
const ICONS = [
  [/chauffe.?eau|ballon|water.?heater|boiler/i, "mdi:water-boiler"], [/clim|air.?con/i, "mdi:snowflake"], [/chauffage|radiateur|heater|heating/i, "mdi:radiator"],
  [/s[eè]che.?serviette/i, "mdi:heating-coil"], [/volet/i, "mdi:window-shutter"], [/frigo|r[ée]frig|fridge/i, "mdi:fridge-outline"],
  [/lave.?linge|washing|washer/i, "mdi:washing-machine"], [/lave.?vais|dishwasher/i, "mdi:dishwasher"], [/s[eè]che.?linge|dryer/i, "mdi:tumble-dryer"],
  [/tv|t[ée]l[ée]/i, "mdi:television"], [/spa/i, "mdi:hot-tub"], [/vid[ée]oproj/i, "mdi:projector"], [/robot|tondeuse/i, "mdi:robot-mower"],
  [/friteuse/i, "mdi:pot-steam"], [/serre/i, "mdi:greenhouse"], [/d[ée]shumid/i, "mdi:air-humidifier"], [/local tech|serveur|nas/i, "mdi:server"],
  [/multiprise/i, "mdi:power-plug-outline"], [/bureau/i, "mdi:desk"], [/cuisson|four|plaque/i, "mdi:stove"], [/prise/i, "mdi:power-socket-eu"],
];
const iconFor = (n) => (ICONS.find(([r]) => r.test(n)) || [0, "mdi:flash"])[1];
// vitesse des points : paliers pour ne pas relancer l'animation à chaque mesure
const level = (w, th) => (w < th ? 0 : w < 200 ? 1 : w < 800 ? 2 : w < 2000 ? 3 : w < 4000 ? 4 : 5);
const DUR = [0, 3.4, 2.4, 1.7, 1.2, 0.85];

class HolmPowerFlowCard extends HTMLElement {
  setConfig(c) {
    this._c = { threshold: 20, show_totals: true, show_devices: true, max_devices: 10, device_threshold: 15, show_device_names: false, show_frame: true, ...c };
    this._sig = null;
    if (this._src) this._build(); else if (this._hass && !this._inited) this._init();
  }
  set hass(h) {
    this._hass = h; this._lang = setLoc(h, this._c);
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._inited) this._init(); else this._update();
  }
  connectedCallback() {
    if (!this._ro) this._ro = new ResizeObserver(() => { const w = this.clientWidth; if (w && Math.abs(w - (this._w || 0)) > 4) { this._w = w; this._build(); } });
    this._ro.observe(this);
    clearInterval(this._tk); this._tk = setInterval(() => { this._update(true); if (++this._tn % 10 === 0) this._loadTotals(); }, 30000); this._tn = 0;
  }
  disconnectedCallback() { this._ro?.disconnect(); clearInterval(this._tk); }
  async _init() {
    this._inited = true;
    let p = { energy_sources: [], device_consumption: [] };
    try { p = await this._hass.callWS({ type: "energy/get_prefs" }); } catch (e) { /* pas de tableau Énergie */ }
    const s = { solar: null, solarE: null, grid: null, expE: null, devices: [], solarEs: [], gIn: [], gOut: [], devE: {} };
    for (const x of p.energy_sources || []) {
      if (x.type === "solar") { s.solar = s.solar || x.stat_rate; s.solarE = s.solarE || x.stat_energy_from; if (x.stat_energy_from) s.solarEs.push(x.stat_energy_from); }
      if (x.type === "grid") {
        s.grid = s.grid || x.power_config?.stat_rate || x.stat_rate;
        const to = x.flow_to ? x.flow_to[0]?.stat_energy_to : x.stat_energy_to; s.expE = s.expE || to;
        (x.flow_from || (x.stat_energy_from ? [x] : [])).forEach((f) => f.stat_energy_from && s.gIn.push(f.stat_energy_from));
        (x.flow_to || (x.stat_energy_to ? [x] : [])).forEach((f) => f.stat_energy_to && s.gOut.push(f.stat_energy_to));
      }
    }
    s.devices = (p.device_consumption || []).filter((d) => d.stat_rate).map((d) => ({ entity: d.stat_rate, name: d.name }));
    (p.device_consumption || []).forEach((d) => { if (d.stat_rate && d.stat_consumption) s.devE[d.stat_rate] = d.stat_consumption; });
    this._src = s;
    this._expHist = [];
    const expE = this._c.export_energy || s.expE;
    if (!this._c.export_power && expE) {
      try {
        const st = new Date(Date.now() - 20 * 60000);
        const r = await this._hass.callWS({ type: "history/history_during_period", start_time: st.toISOString(), entity_ids: [expE], minimal_response: true, no_attributes: true, significant_changes_only: false });
        this._expHist = (r[expE] || []).map((x) => ({ t: (x.lu || x.lc) * 1000, v: parseFloat(x.s) })).filter((x) => !isNaN(x.v));
      } catch (e) { /* estimation facultative */ }
    }
    this._build();
    this._loadTotals();
  }
  // totaux du jour (statistiques du tableau Énergie) : acheté / revendu, produit, consommé
  async _loadTotals() {
    const s = this._src; if (!s || this._c.show_totals === false || !this._hass) return;
    const ids = [...s.gIn, ...s.gOut, ...s.solarEs]; if (!ids.length) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    try {
      const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: new Date().toISOString(),
        statistic_ids: [...new Set(ids)], period: "hour", types: ["change"], units: { energy: "kWh" } });
      const sum = (a) => a.reduce((t, id) => t + (r[id] || []).reduce((b, x) => b + (Number(x.change) || 0), 0), 0);
      const imp = sum(s.gIn), exp = sum(s.gOut), sol = sum(s.solarEs);
      this._tot = { imp: s.gIn.length ? imp : NaN, exp: s.gOut.length ? exp : NaN, sol: s.solarEs.length ? sol : NaN, home: s.gIn.length ? Math.max(0, imp + sol - exp) : NaN };
      this._update(true);
    } catch (e) { /* totaux facultatifs */ }
  }
  _t(k, v) { return tr(this._lang || langOf(this._hass, this._c), k, v); }
  _chart(k, dev) {
    const c = this._c, s = this._src || {}, v = this._values();
    const col = { solar: c.solar_color || DEF.solar_color, home: c.home_color || DEF.home_color, grid: this._gridColor() };
    let o;
    if (dev) {
      const name = dev.name || this._hass.states[dev.entity]?.attributes.friendly_name || dev.entity;
      o = { name, subtitle: this._t("device_power"), icon: dev.icon || iconFor(name), color: dev.color || col.home, power: dev.entity, entity: dev.entity, energy: s.devE[dev.entity] ? [s.devE[dev.entity]] : [] };
    } else if (k === "solar") {
      o = { name: this._t("solar"), subtitle: this._t("production"), icon: "mdi:solar-power-variant", color: col.solar, power: this._ent("solar"), entity: this._ent("solar"), energy: s.solarEs };
    } else if (k === "grid") {
      o = { name: this._t("grid"), subtitle: this._t("buy_sell"), icon: "mdi:transmission-tower", color: c.grid_color || DEF.grid_color, outColor: c.export_color || DEF.export_color,
        power: this._ent("grid"), entity: this._ent("grid"), signed: true, energy: s.gIn, energyOut: s.gOut };
    } else {
      const pw = c.home_power ? c.home_power : [this._ent("solar"), this._ent("grid")].filter(Boolean);
      o = { name: this._t("home"), subtitle: this._t("consumption"), icon: "mdi:home-lightning-bolt", color: col.home, power: pw, entity: c.home_power || null, current: v.home,
        energy: [...s.gIn, ...s.solarEs], energyNeg: s.gOut };
    }
    if (!o.power || (Array.isArray(o.power) && !o.power.length)) return o.entity && this._more(o.entity);
    o.lang = this._lang; setLoc(this._hass, this._c);
    openEnergyChart(this._hass, o);
  }
  _ent(k) {
    const c = this._c, s = this._src || {};
    return { solar: c.solar_power || s.solar, grid: c.grid_power || s.grid, exp: c.export_power, home: c.home_power, expE: c.export_energy || s.expE,
      solarE: s.solarE, tariff: c.tariff_entity || null }[k];
  }
  _n(id) { if (!id) return NaN; const s = this._hass.states[id]; if (!s) return NaN; let v = parseFloat(s.state); const u = s.attributes.unit_of_measurement; if (u === "kW") v *= 1000; return v; }
  _exportEstimate(imp) {
    const id = this._ent("expE"); if (!id) return 0;
    const s = this._hass.states[id]; const v = s ? parseFloat(s.state) : NaN;
    if (!isNaN(v)) { const t = new Date(s.last_updated).getTime(); const h = this._expHist; if (!h.length || h[h.length - 1].v !== v) h.push({ t, v }); }
    const now = Date.now(); this._expHist = this._expHist.filter((x) => now - x.t < 20 * 60000);
    if (imp > 60) return 0;
    const h = this._expHist; if (h.length < 2) return 0;
    const last = h[h.length - 1]; if (now - last.t > 8 * 60000) return 0; // plus de revente depuis 8 min
    const ref = h.find((x) => last.t - x.t <= 10 * 60000) || h[0];
    if (last.t === ref.t || last.v < ref.v) return 0;
    return ((last.v - ref.v) * 1000) / ((last.t - ref.t) / 3600000);
  }
  _values() {
    const c = this._c, th = Number(c.threshold) || 0;
    let solar = Math.max(0, this._n(this._ent("solar")) || 0);
    let g = this._n(this._ent("grid")); g = isNaN(g) ? 0 : g;
    let imp = Math.max(0, g), exp = g < 0 ? -g : 0, est = false;
    if (c.export_power) exp = Math.max(0, this._n(c.export_power) || 0);
    else if (!(g < 0)) { exp = this._exportEstimate(imp); est = exp > 0; }
    exp = Math.min(exp, solar);
    let home = c.home_power ? this._n(c.home_power) : solar + imp - exp;
    home = Math.max(0, isNaN(home) ? 0 : home);
    const selfUse = Math.max(0, solar - exp);
    const share = home > 0 ? Math.min(1, selfUse / home) : solar > 0 ? 1 : 0;
    return { solar, imp, exp, home, selfUse, share, est, th };
  }
  // ---- HOLM HP/HC : binary_sensor des heures creuses (attributs prochaine_bascule, tarif) ----
  _hcEnt() {
    const h = this._hass, ok = (id) => { const st = id && h.states[id]; return !!st && st.attributes.prochaine_bascule !== undefined; };
    if (this._c.hc_entity) return ok(this._c.hc_entity) ? this._c.hc_entity : null;
    if (ok(this._hcAuto)) return this._hcAuto;
    this._hcAuto = ok("binary_sensor.heures_creuses") ? "binary_sensor.heures_creuses"
      : Object.keys(h.states).find((k) => k.startsWith("binary_sensor.") && h.states[k].attributes.prochaine_bascule !== undefined && h.states[k].attributes.prochaine_periode !== undefined) || null;
    return this._hcAuto;
  }
  // { isHC, price, next } : ancienne méthode (tariff_entity + hc_price) si configurée, sinon HOLM HP/HC
  _tariff() {
    const c = this._c, hc = this._hcEnt(), hs = hc ? this._hass.states[hc] : null;
    const next = hs && hs.attributes.prochaine_bascule ? new Date(hs.attributes.prochaine_bascule) : null;
    const nx = next && !isNaN(next) ? next : null;
    if (this._ent("tariff")) {
      const t = this._ent("tariff"), v = parseFloat(this._hass.states[t]?.state);
      const hp = typeof c.hc_price === "string" && c.hc_price.includes(".") && isNaN(Number(c.hc_price)) ? this._n(c.hc_price) : Number(c.hc_price);
      if (isNaN(v)) return null;
      return { isHC: !isNaN(hp) && Math.abs(v - hp) < 1e-6, price: v, next: nx };
    }
    if (!hs || !["on", "off"].includes(hs.state)) return null;
    let price = parseFloat(hs.attributes.tarif);
    if (isNaN(price)) price = parseFloat(this._hass.states["sensor.tarif_actuel"]?.state);
    return { isHC: hs.state === "on", price, next: nx };
  }
  _countdown(t) {
    if (!t || !t.next || this._c.show_countdown === false) return "";
    const now = new Date(), min = Math.max(0, Math.round((t.next - now) / 60000));
    const dur = min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`;
    return this._t("in_dur", { p: this._t(t.isHC ? "hp" : "hc"), d: dur });
  }
  _gridColor() {
    const c = this._c, t = this._tariff();
    this._tar = t;
    if (!t || c.tariff_display === "label") { this._isHC = t ? t.isHC : false; return c.grid_color || DEF.grid_color; }
    this._isHC = t.isHC;
    return t.isHC ? c.grid_color || DEF.grid_color : c.grid_hp_color || DEF.grid_hp_color;
  }
  _build() {
    if (!this.shadowRoot || !this._c || !this._src) return;
    const c = this._c, W = Math.max(260, (this._w || this.clientWidth || 400) - 24), H = (c.show_totals !== false ? 112 : 96) + (c.show_countdown !== false && (this._ent("tariff") || (this._hass && this._hcEnt())) ? 13 : 0), cy = 30, r = 22;
    const xs = Math.round(W * 0.14), xh = Math.round(W * 0.5), xg = Math.round(W * 0.86);
    const col = { s: c.solar_color || DEF.solar_color, h: c.home_color || DEF.home_color, e: c.export_color || DEF.export_color };
    const cf = c.curve_factor !== undefined ? Number(c.curve_factor) : 1;
    const sag = 10 * cf;
    // chemins : solaire → maison, réseau → maison (import), maison → réseau (export), solaire → réseau (arc)
    const pSH = `M${xs + r + 4},${cy} C${xs + r + 4 + (xh - xs) * 0.35},${cy + sag} ${xh - r - 4 - (xh - xs) * 0.35},${cy + sag} ${xh - r - 4},${cy}`;
    const pGH = `M${xg - r - 4},${cy} C${xg - r - 4 - (xg - xh) * 0.35},${cy + sag} ${xh + r + 4 + (xg - xh) * 0.35},${cy + sag} ${xh + r + 4},${cy}`;
    const pHG = `M${xh + r + 4},${cy} C${xh + r + 4 + (xg - xh) * 0.35},${cy + sag} ${xg - r - 4 - (xg - xh) * 0.35},${cy + sag} ${xg - r - 4},${cy}`;
    const dots = (cls, path, color) => [0, 1, 2].map((i) => `<circle r="3" class="dot ${cls}" style="offset-path:path('${path}');fill:${color};--i:${i}"/>`).join("");
    this.shadowRoot.innerHTML = `
    <style>
      :host { display:block; }
      ha-card { display:block; padding:10px 12px 10px; box-sizing:border-box; height:100%; overflow:hidden; }
      ha-card.noframe { background:none !important; box-shadow:none !important; border:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
      ha-card.noframe::before, ha-card.noframe::after { content:none !important; display:none !important; }
      .tt { font-size:14px; font-weight:600; color:var(--primary-text-color); margin:0 0 4px 2px; }
      .flow { position:relative; height:${H}px; }
      svg { position:absolute; inset:0; overflow:visible; }
      .ln { fill:none; stroke-width:2; stroke-linecap:round; opacity:.18; transition:opacity .6s, stroke .6s; }
      .ln.on { opacity:.55; }
      .dot { opacity:0; offset-rotate:0deg; filter:drop-shadow(0 0 4px currentColor); }
      .dot.run { opacity:1; animation:mv var(--d) linear infinite; animation-delay:calc(var(--d) * var(--i) / -3); }
      @keyframes mv { from { offset-distance:0%; } to { offset-distance:100%; } }
      .node { position:absolute; top:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; width:${Math.min(120, Math.round(W * 0.3))}px; text-align:center; cursor:pointer; }
      .ic { width:${2 * r}px; height:${2 * r}px; border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative; box-sizing:border-box;
            background:color-mix(in srgb, var(--c) 16%, transparent); color:var(--c); border:1.5px solid color-mix(in srgb, var(--c) 45%, transparent);
            transition:box-shadow .6s, opacity .6s; margin-top:${cy - r}px; }
      .ic ha-icon { --mdc-icon-size:22px; }
      .node.on .ic { box-shadow:0 0 14px color-mix(in srgb, var(--c) 45%, transparent); }
      .node.off .ic { opacity:.45; }
      .home .ic { border:none; background:none; }
      .home .ring { position:absolute; inset:0; border-radius:50%; background:conic-gradient(var(--rs) 0 var(--p), var(--rg) var(--p) 100%);
            -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); transition:background .6s; }
      .home .ic::before { content:""; position:absolute; inset:4px; border-radius:50%; background:color-mix(in srgb, var(--c) 14%, transparent); }
      .v { font-size:15px; font-weight:700; color:var(--primary-text-color); margin-top:4px; white-space:nowrap; font-variant-numeric:tabular-nums; line-height:1.1; }
      .v small { font-size:.66em; font-weight:500; color:var(--secondary-text-color); margin-left:1px; }
      .v .ar { font-size:.8em; margin-right:2px; }
      .k { font-size:11px; font-weight:600; color:var(--primary-text-color); opacity:.85; white-space:nowrap; font-variant-numeric:tabular-nums; line-height:1.3; }
      .k .in { color:var(--gc); } .k .out { color:${c.export_color || DEF.export_color}; }
      .k:empty { display:none; }
      .node.grid { width:${Math.min(144, Math.round(W * 0.29))}px; }
      .cd { font-size:10.5px; font-weight:600; white-space:nowrap; line-height:1.3; font-variant-numeric:tabular-nums; color:color-mix(in srgb, var(--cdc, var(--secondary-text-color)) 85%, var(--primary-text-color)); }
      .cd:empty { display:none; }
      .s { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; line-height:1.3; }
      .devs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding:6px 1px 1px; margin-top:4px; border-top:1px solid color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
      .devs::-webkit-scrollbar { display:none; }
      .devs:empty { display:none; }
      .dv { flex:none; display:flex; align-items:center; gap:5px; padding:4px 9px 4px 5px; border-radius:999px; cursor:pointer;
            background:color-mix(in srgb, var(--c) calc(8% + var(--a) * 22%), transparent); border:1px solid color-mix(in srgb, var(--c) 30%, transparent); }
      .dv ha-icon { --mdc-icon-size:15px; color:var(--c); width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--c) 20%, transparent); }
      .dv b { font-size:12px; font-weight:600; color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
      .dv i { font-style:normal; font-size:11px; color:var(--secondary-text-color); white-space:nowrap; max-width:90px; overflow:hidden; text-overflow:ellipsis; }
    </style>
    <ha-card class="${c.show_frame === false ? "noframe" : ""}">
      ${c.title ? `<div class="tt">${esc(c.title)}</div>` : ""}
      <div class="flow">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <path id="lSH" class="ln" d="${pSH}" stroke="${col.s}"/><path id="lGH" class="ln" d="${pGH}"/>
          ${dots("dSH", pSH, col.s)}${dots("dGH", pGH, "var(--gc)")}${dots("dHG", pHG, col.e)}
        </svg>
        <div class="node solar" data-e="solar" style="left:${xs}px;--c:${col.s}"><div class="ic"><ha-icon icon="mdi:solar-power-variant"></ha-icon></div><div class="v" id="vS"></div><div class="s" id="sS"></div><div class="k" id="kS"></div></div>
        <div class="node home" data-e="home" style="left:${xh}px;--c:${col.h}"><div class="ic"><div class="ring"></div><ha-icon icon="mdi:home-lightning-bolt"></ha-icon></div><div class="v" id="vH"></div><div class="s" id="sH"></div><div class="k" id="kH"></div></div>
        <div class="node grid" data-e="grid" style="left:${xg}px"><div class="ic"><ha-icon icon="mdi:transmission-tower"></ha-icon></div><div class="v" id="vG"></div><div class="s" id="sG"></div><div class="cd" id="cG"></div><div class="k" id="kG"></div></div>
      </div>
      <div class="devs"></div>
    </ha-card>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll(".node").forEach((n) => n.addEventListener("click", () => this._chart(n.dataset.e)));
    sr.querySelector(".devs").addEventListener("click", (ev) => {
      const d = ev.target.closest(".dv"); if (!d) return;
      const list = Array.isArray(c.devices) && c.devices.length ? c.devices.map((x) => (typeof x === "string" ? { entity: x } : x)) : this._src.devices;
      this._chart(null, list.find((x) => x.entity === d.dataset.e) || { entity: d.dataset.e });
    });
    this._lv = {}; this._devSig = null;
    this._update(true);
  }
  _more(id) { const ev = new Event("hass-more-info", { bubbles: true, composed: true }); ev.detail = { entityId: id }; this.dispatchEvent(ev); }
  _label(key, def) {
    const id = this._c[key];
    if (id === false || id === "none") return "";
    if (id) { const s = this._hass.states[id]; if (!s) return ""; const u = s.attributes.unit_of_measurement || ""; const n = parseFloat(s.state);
      return `${isNaN(n) ? s.state : fr(n, Math.abs(n) < 10 ? 2 : 1)}${u ? " " + u : ""}`; }
    return def;
  }
  _update(force) {
    const sr = this.shadowRoot; if (!sr || !sr.querySelector(".flow") || !this._hass) return;
    const c = this._c, e = this._ent.bind(this);
    const ids = [e("solar"), e("grid"), c.export_power, c.home_power, e("expE"), e("solarE"), e("tariff"), this._hcEnt(), c.solar_label, c.grid_label, c.home_label, ...(this._src?.devices || []).map((d) => d.entity)];
    const sig = ids.map((i) => (i ? this._hass.states[i]?.state : "")).join("|");
    if (!force && sig === this._sig) return;
    this._sig = sig;
    const v = this._values(), gc = this._gridColor();
    const card = sr.querySelector(".flow");
    card.style.setProperty("--gc", gc);
    sr.querySelector(".grid").style.setProperty("--c", v.exp > v.th ? c.export_color || DEF.export_color : gc);
    const set = (id, html) => { const el = sr.getElementById(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
    const w = (x, pre = "") => { const [a, u] = fmtW(x); return `${pre}${a}<small>${u}</small>`; };
    set("vS", w(v.solar));
    const se = e("solarE") ? this._n(e("solarE")) : NaN;
    set("sS", this._label("solar_label", isNaN(se) || (c.show_totals !== false && this._tot && !isNaN(this._tot.sol)) ? this._t("solar") : this._t("kwh_today", { x: fr(se, 1) })));
    set("vH", w(v.home));
    set("sH", this._label("home_label", v.home > 0 ? this._t("pct_solar", { x: fr(v.share * 100, 0) }) : this._t("home")));
    if (v.exp > v.th) set("vG", w(v.exp, `<span class="ar">↑</span>${v.est ? "≈" : ""}`));
    else set("vG", w(v.imp, v.imp > v.th ? `<span class="ar">↓</span>` : ""));
    const T0 = this._tar, tv = T0 ? T0.price : NaN, long = c.tariff_display === "label" || c.tariff_display === "both";
    const per = T0 ? this._t(long ? (T0.isHC ? "hc_long" : "hp_long") : (T0.isHC ? "hc" : "hp")) : "";
    set("sG", this._label("grid_label", v.exp > v.th ? this._t("resale") : T0 ? `${per}${!isNaN(tv) ? ` · ${fr(tv, 4)} €` : ""}` : this._t("grid")));
    { const sg = sr.getElementById("sG"); if (sg) sg.title = sg.textContent; }
    const cdEl = sr.getElementById("cG");
    if (cdEl) { const cd = this._countdown(T0); if (cdEl.textContent !== cd) cdEl.textContent = cd;
      cdEl.style.setProperty("--cdc", T0 && !T0.isHC ? (c.grid_color || DEF.grid_color) : (c.grid_hp_color || DEF.grid_hp_color)); }
    // totaux du jour
    const T = c.show_totals !== false ? this._tot : null;
    const kv = (x) => (isNaN(x) ? "" : fr(x, x < 10 ? 2 : 1));
    set("kS", T && !isNaN(T.sol) ? `${kv(T.sol)} kWh` : "");
    set("kH", T && !isNaN(T.home) ? `${kv(T.home)} kWh` : "");
    set("kG", T && (!isNaN(T.imp) || !isNaN(T.exp)) ? `${!isNaN(T.imp) ? `<span class="in">↓</span>${kv(T.imp)}` : ""}${!isNaN(T.exp) ? ` <span class="out">↑</span>${kv(T.exp)}` : ""} kWh` : "");
    // anneau maison : part solaire / réseau
    const ring = sr.querySelector(".home .ring");
    ring.style.setProperty("--rs", c.solar_color || DEF.solar_color); ring.style.setProperty("--rg", gc);
    ring.style.setProperty("--p", `${Math.round(v.share * 100)}%`);
    if (v.home <= v.th) { ring.style.setProperty("--rs", "rgba(127,127,127,.3)"); ring.style.setProperty("--rg", "rgba(127,127,127,.3)"); }
    // nœuds allumés / éteints
    sr.querySelector(".solar").className = `node solar ${v.solar > v.th ? "on" : "off"}`;
    sr.querySelector(".grid").className = `node grid ${v.imp > v.th || v.exp > v.th ? "on" : "off"}`;
    sr.querySelector(".home").className = `node home ${v.home > v.th ? "on" : ""}`;
    // lignes & points
    sr.getElementById("lSH").classList.toggle("on", v.solar > v.th);
    const lGH = sr.getElementById("lGH"); lGH.classList.toggle("on", v.imp > v.th || v.exp > v.th);
    lGH.setAttribute("stroke", v.exp > v.th ? c.export_color || DEF.export_color : gc);
    const run = (cls, watts) => {
      const L = level(watts, v.th);
      if (this._lv[cls] === L) return; this._lv[cls] = L;
      sr.querySelectorAll("." + cls).forEach((d) => { d.classList.toggle("run", L > 0); if (L) d.style.setProperty("--d", DUR[L] + "s"); });
    };
    run("dSH", v.solar); run("dGH", v.imp); run("dHG", v.exp);
    // appareils actifs
    if (c.show_devices !== false) {
      const list = (Array.isArray(c.devices) && c.devices.length ? c.devices.map((d) => (typeof d === "string" ? { entity: d } : d)) : this._src.devices)
        .map((d) => ({ ...d, w: this._n(d.entity) })).filter((d) => d.w >= (Number(c.device_threshold) || 0))
        .sort((a, b) => b.w - a.w).slice(0, Number(c.max_devices) || 10);
      const mx = Math.max(...list.map((d) => d.w), 1);
      const html = list.map((d) => {
        const name = d.name || this._hass.states[d.entity]?.attributes.friendly_name || d.entity;
        const [a, u] = fmtW(d.w);
        return `<div class="dv" data-e="${esc(d.entity)}" title="${esc(name)}" style="--c:${d.color || c.home_color || DEF.home_color};--a:${(d.w / mx).toFixed(2)}"><ha-icon icon="${d.icon || iconFor(name)}"></ha-icon>${c.show_device_names ? `<i>${esc(name)}</i>` : ""}<b>${a} ${u}</b></div>`;
      }).join("");
      if (html !== this._devSig) { this._devSig = html; sr.querySelector(".devs").innerHTML = html; }
    }
  }
  static getConfigElement() { return document.createElement("holm-power-flow-card-editor"); }
  static getStubConfig() { return {}; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}

// ---------------- Éditeur visuel ----------------
const hex2rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return undefined; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (a) => Array.isArray(a) ? "#" + a.map((v) => Number(v).toString(16).padStart(2, "0")).join("") : a;
const S = ["sensor"], ANY = ["sensor", "input_number", "number"];
const COLORS = ["solar_color", "home_color", "grid_color", "grid_hp_color", "export_color"];
const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { type: "grid", name: "", schema: [
    { name: "threshold", selector: { number: { min: 0, max: 500, mode: "box", unit_of_measurement: "W" } } },
    { name: "curve_factor", selector: { number: { min: 0, max: 3, step: 0.5, mode: "slider" } } },
    { name: "show_frame", selector: { boolean: {} } },
  ] },
  { name: "show_totals", selector: { boolean: {} } },
  { type: "expandable", title: "sec_sensors", icon: "mdi:flash", flatten: true, schema: [
    { name: "solar_power", selector: { entity: { domain: S } } }, { name: "grid_power", selector: { entity: { domain: S } } },
    { name: "export_power", selector: { entity: { domain: S } } }, { name: "home_power", selector: { entity: { domain: S } } },
    { name: "export_energy", selector: { entity: { domain: S } } },
  ] },
  { type: "expandable", title: "sec_labels", icon: "mdi:label-outline", flatten: true, schema: [
    { name: "solar_label", selector: { entity: {} } }, { name: "home_label", selector: { entity: {} } }, { name: "grid_label", selector: { entity: {} } },
    { name: "tariff_display", selector: { select: { mode: "dropdown", options: [{ value: "color", label: "td_color" }, { value: "label", label: "td_label" }, { value: "both", label: "td_both" }] } } },
    { name: "show_countdown", selector: { boolean: {} } },
    { name: "hc_entity", selector: { entity: { domain: ["binary_sensor"] } } },
    { name: "tariff_entity", selector: { entity: { domain: ANY } } },
    { type: "grid", name: "", schema: [ { name: "hc_price", selector: { number: { min: 0, max: 2, step: 0.0001, mode: "box" } } }, { name: "hc_price_entity", selector: { entity: { domain: ANY } } } ] },
  ] },
  { type: "expandable", title: "sec_devices", icon: "mdi:power-plug", flatten: true, schema: [
    { type: "grid", name: "", schema: [
      { name: "show_devices", selector: { boolean: {} } }, { name: "show_device_names", selector: { boolean: {} } },
      { name: "max_devices", selector: { number: { min: 1, max: 30, mode: "box" } } }, { name: "device_threshold", selector: { number: { min: 0, max: 1000, mode: "box", unit_of_measurement: "W" } } },
    ] },
  ] },
  { type: "expandable", title: "sec_colors", icon: "mdi:palette", flatten: true, schema: [ { type: "grid", name: "", schema: COLORS.map((n) => ({ name: n, selector: { color_rgb: {} } })) } ] },
  { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: "auto" }, ...Object.entries(LANG_NAMES).map(([value, label]) => ({ value, label }))] } } },
];
// libellés du schéma traduits (titres de sections, options) — les noms de LANG_NAMES restent tels quels
const localize = (sc, l) => sc.map((x) => { const o = { ...x }; if (o.title) o.title = tr(l, o.title); if (o.schema) o.schema = localize(o.schema, l);
  if (o.selector?.select && o.name !== "language") o.selector = { select: { ...o.selector.select, options: o.selector.select.options.map((op) => ({ ...op, label: tr(l, op.label) })) } };
  if (o.name === "language") o.selector = { select: { ...o.selector.select, options: o.selector.select.options.map((op) => (op.value ? op : { ...op, label: tr(l, "auto") })) } };
  return o; });
const DEFAULTS = { tariff_display: "color", show_countdown: true, show_totals: true, threshold: 20, curve_factor: 1, show_devices: true, max_devices: 10, device_threshold: 15, show_device_names: false, show_frame: true };
class HolmPowerFlowCardEditor extends HTMLElement {
  setConfig(c) { const j = JSON.stringify(c); this._config = JSON.parse(j); if (j === this._last && this._f) return; this._build(); }
  set hass(h) { this._hass = h; if (!this._f) this._build(); else this._f.hass = h; }
  _build() {
    if (!this._hass || !this._config) return;
    const c = this._config, data = { ...DEFAULTS, ...c }, l = langOf(this._hass, c);
    data.language = c.language || "";
    for (const k of COLORS) data[k] = hex2rgb(c[k] || DEF[k]);
    if (typeof c.hc_price === "string" && isNaN(Number(c.hc_price))) { data.hc_price_entity = c.hc_price; delete data.hc_price; }
    this.innerHTML = "";
    const f = (this._f = document.createElement("ha-form"));
    f.hass = this._hass; f.schema = localize(SCHEMA, l); f.data = data; f.computeLabel = (s) => tr(l, "l_" + s.name);
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const v = ev.detail.value, o = { ...this._config };
      for (const [k, val] of Object.entries(v)) {
        if (COLORS.includes(k)) { const h = rgb2hex(val); if (!h || h === DEF[k]) delete o[k]; else o[k] = h; continue; }
        if (k === "hc_price_entity") { if (val) o.hc_price = val; else if (typeof o.hc_price === "string") delete o.hc_price; continue; }
        if (k === "hc_price" && (val === "" || val == null) && typeof o.hc_price === "string") continue;
        if (val === "" || val === undefined || val === null || DEFAULTS[k] === val) delete o[k]; else o[k] = val;
      }
      const relang = (o.language || "") !== (this._config.language || "");
      this._config = o; this._last = JSON.stringify(o);
      if (relang) setTimeout(() => this._build());
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: o }, bubbles: true, composed: true }));
    });
    this.appendChild(f);
  }
}
if (!customElements.get("holm-power-flow-card-editor")) customElements.define("holm-power-flow-card-editor", HolmPowerFlowCardEditor);
if (!customElements.get("holm-power-flow-card")) customElements.define("holm-power-flow-card", HolmPowerFlowCard);
window.customCards = window.customCards || [];
{ const l = langOf(document.querySelector("home-assistant")?.hass); window.customCards.push({ type: "holm-power-flow-card", name: tr(l, "card_name"), description: tr(l, "card_desc"), preview: false }); }
console.info(`%c HOLM-POWER-FLOW %c ${VERSION} `, "background:#e3a21a;color:#111;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
