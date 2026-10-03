#!/usr/bin/env python3
"""Add the professionalization-pass landing sections to all 6 locales.

Inserts `compare`, `security`, `workflow` and `voices` blocks into the
`landing` object of each locale, immediately before the existing `faq` key.
Idempotent: re-running replaces the previously inserted blocks.
"""
import json
import collections
from pathlib import Path

LOCALES = Path(__file__).resolve().parent.parent / "apps" / "web" / "src" / "locales"

BLOCKS = {
    "en": {
        "compare": {
            "title": "flinkli vs. Excel vs. an accountant",
            "subtitle": "An honest look at how flinkli compares with the two options most Swiss freelancers use today.",
            "feature": "Capability",
            "excel": "Excel template",
            "accountant": "Accountant",
            "rows": {
                "qr": "Compliant QR-bills",
                "speed": "Invoice in under 2 minutes",
                "cost": "No recurring cost per invoice",
                "reminders": "Automatic payment reminders",
                "languages": "Multilingual invoices",
                "vat": "Swiss VAT handled correctly",
                "control": "You keep full control",
            },
            "note": "Comparison reflects typical usage. An accountant adds real value for complex cases — flinkli is built for everyday freelancer invoicing.",
        },
        "security": {
            "badge": "Swiss data residency",
            "title": "Your data stays in Switzerland",
            "body": "Invoicing data is sensitive. flinkli stores it on Swiss-hosted infrastructure, encrypts it in transit, and never sells it. You can export everything at any time.",
            "highlight": "Swiss hosting · TLS in transit · encryption at rest · export anytime",
            "points": {
                "hosting": {"title": "Swiss hosting", "desc": "Data is stored on infrastructure located in Switzerland."},
                "transit": {"title": "Encrypted in transit", "desc": "All traffic is protected with TLS end to end."},
                "rest": {"title": "Encrypted at rest", "desc": "Stored data is encrypted, not left in plain text."},
                "export": {"title": "Export anytime", "desc": "Download your invoices and data whenever you want."},
                "ownership": {"title": "You own your data", "desc": "Your invoices and customers belong to you, always."},
                "noResale": {"title": "Never sold", "desc": "We do not sell or share your data with third parties."},
            },
        },
        "workflow": {
            "title": "Fits the way you already work",
            "subtitle": "From first draft to reconciled payment — flinkli connects to the tools a Swiss freelancer already uses.",
            "steps": {
                "create": {"title": "Create", "desc": "Draft a compliant QR-invoice in seconds with your own branding."},
                "send": {"title": "Send", "desc": "Email the PDF directly, or share a link your customer can open."},
                "pay": {"title": "Get paid", "desc": "Customers scan the QR-code with any Swiss banking app."},
                "reconcile": {"title": "Reconcile", "desc": "Track paid, open and overdue invoices in one clear overview."},
            },
        },
        "voices": {
            "badge": "Early users",
            "title": "What early users tell us",
            "subtitle": "flinkli just launched. These are honest impressions from the first freelancers using it — not paid reviews.",
            "disclaimer": "Early-stage product. Feedback shared with permission; names shortened for privacy.",
            "items": {
                "designer": {"quote": "I sent my first QR-invoice in under two minutes. My old template took half an hour.", "role": "Freelance designer", "place": "Zurich"},
                "consultant": {"quote": "The reminders alone save me a follow-up email every single week.", "role": "Independent consultant", "place": "Geneva"},
                "studio": {"quote": "Finally an invoicing tool that speaks Italian and understands Swiss VAT.", "role": "Small studio owner", "place": "Lugano"},
            },
        },
    },
    "de": {
        "compare": {
            "title": "flinkli vs. Excel vs. Treuhänder",
            "subtitle": "Ein ehrlicher Blick darauf, wie flinkli im Vergleich zu den zwei Optionen abschneidet, die die meisten Schweizer Freelancer heute nutzen.",
            "feature": "Funktion",
            "excel": "Excel-Vorlage",
            "accountant": "Treuhänder",
            "rows": {
                "qr": "Konforme QR-Rechnungen",
                "speed": "Rechnung in unter 2 Minuten",
                "cost": "Keine laufenden Kosten pro Rechnung",
                "reminders": "Automatische Zahlungserinnerungen",
                "languages": "Mehrsprachige Rechnungen",
                "vat": "Schweizer MWST korrekt behandelt",
                "control": "Du behältst die volle Kontrolle",
            },
            "note": "Der Vergleich zeigt die typische Nutzung. Ein Treuhänder bringt bei komplexen Fällen echten Mehrwert — flinkli ist für die alltägliche Freelancer-Rechnung gemacht.",
        },
        "security": {
            "badge": "Schweizer Datenhaltung",
            "title": "Deine Daten bleiben in der Schweiz",
            "body": "Rechnungsdaten sind sensibel. flinkli speichert sie auf Schweizer Infrastruktur, verschlüsselt sie bei der Übertragung und verkauft sie niemals. Du kannst jederzeit alles exportieren.",
            "highlight": "Schweizer Hosting · TLS bei Übertragung · Verschlüsselung im Ruhezustand · Export jederzeit",
            "points": {
                "hosting": {"title": "Schweizer Hosting", "desc": "Die Daten liegen auf Infrastruktur in der Schweiz."},
                "transit": {"title": "Verschlüsselt bei Übertragung", "desc": "Der gesamte Verkehr ist durchgängig mit TLS geschützt."},
                "rest": {"title": "Verschlüsselt im Ruhezustand", "desc": "Gespeicherte Daten sind verschlüsselt, nicht im Klartext."},
                "export": {"title": "Export jederzeit", "desc": "Lade deine Rechnungen und Daten herunter, wann du willst."},
                "ownership": {"title": "Deine Daten gehören dir", "desc": "Deine Rechnungen und Kunden gehören immer dir."},
                "noResale": {"title": "Nie verkauft", "desc": "Wir verkaufen oder teilen deine Daten nicht mit Dritten."},
            },
        },
        "workflow": {
            "title": "Passt zu deiner Arbeitsweise",
            "subtitle": "Vom ersten Entwurf bis zur abgeglichenen Zahlung — flinkli verbindet sich mit den Tools, die Schweizer Freelancer bereits nutzen.",
            "steps": {
                "create": {"title": "Erstellen", "desc": "Erstelle in Sekunden eine konforme QR-Rechnung mit deinem Branding."},
                "send": {"title": "Senden", "desc": "Sende das PDF direkt per E-Mail oder teile einen Link."},
                "pay": {"title": "Bezahlt werden", "desc": "Kunden scannen den QR-Code mit jeder Schweizer Banking-App."},
                "reconcile": {"title": "Abgleichen", "desc": "Bezahlte, offene und überfällige Rechnungen in einer Übersicht."},
            },
        },
        "voices": {
            "badge": "Erste Nutzer",
            "title": "Was erste Nutzer uns sagen",
            "subtitle": "flinkli ist gerade gestartet. Das sind ehrliche Eindrücke der ersten Freelancer — keine bezahlten Bewertungen.",
            "disclaimer": "Frühes Produkt. Feedback mit Erlaubnis geteilt; Namen zum Schutz der Privatsphäre gekürzt.",
            "items": {
                "designer": {"quote": "Meine erste QR-Rechnung war in unter zwei Minuten raus. Meine alte Vorlage brauchte eine halbe Stunde.", "role": "Freiberufliche Designerin", "place": "Zürich"},
                "consultant": {"quote": "Allein die Erinnerungen sparen mir jede Woche eine Nachfass-E-Mail.", "role": "Unabhängiger Berater", "place": "Genf"},
                "studio": {"quote": "Endlich ein Rechnungstool, das Italienisch spricht und die Schweizer MWST versteht.", "role": "Kleine Studio-Inhaberin", "place": "Lugano"},
            },
        },
    },
    "fr": {
        "compare": {
            "title": "flinkli vs Excel vs un comptable",
            "subtitle": "Un regard honnête sur la façon dont flinkli se compare aux deux options que la plupart des indépendants suisses utilisent aujourd'hui.",
            "feature": "Fonction",
            "excel": "Modèle Excel",
            "accountant": "Comptable",
            "rows": {
                "qr": "QR-factures conformes",
                "speed": "Facture en moins de 2 minutes",
                "cost": "Aucun coût récurrent par facture",
                "reminders": "Rappels de paiement automatiques",
                "languages": "Factures multilingues",
                "vat": "TVA suisse gérée correctement",
                "control": "Vous gardez le contrôle total",
            },
            "note": "La comparaison reflète un usage typique. Un comptable apporte une vraie valeur pour les cas complexes — flinkli est conçu pour la facturation quotidienne des indépendants.",
        },
        "security": {
            "badge": "Données en Suisse",
            "title": "Vos données restent en Suisse",
            "body": "Les données de facturation sont sensibles. flinkli les stocke sur une infrastructure hébergée en Suisse, les chiffre en transit et ne les vend jamais. Vous pouvez tout exporter à tout moment.",
            "highlight": "Hébergement suisse · TLS en transit · chiffrement au repos · export à tout moment",
            "points": {
                "hosting": {"title": "Hébergement suisse", "desc": "Les données sont stockées sur une infrastructure située en Suisse."},
                "transit": {"title": "Chiffré en transit", "desc": "Tout le trafic est protégé de bout en bout par TLS."},
                "rest": {"title": "Chiffré au repos", "desc": "Les données stockées sont chiffrées, jamais en clair."},
                "export": {"title": "Export à tout moment", "desc": "Téléchargez vos factures et données quand vous voulez."},
                "ownership": {"title": "Vos données vous appartiennent", "desc": "Vos factures et clients vous appartiennent, toujours."},
                "noResale": {"title": "Jamais vendues", "desc": "Nous ne vendons ni ne partageons vos données avec des tiers."},
            },
        },
        "workflow": {
            "title": "S'adapte à votre façon de travailler",
            "subtitle": "Du premier brouillon au paiement rapproché — flinkli se connecte aux outils que les indépendants suisses utilisent déjà.",
            "steps": {
                "create": {"title": "Créer", "desc": "Rédigez une QR-facture conforme en quelques secondes avec votre image."},
                "send": {"title": "Envoyer", "desc": "Envoyez le PDF par e-mail ou partagez un lien."},
                "pay": {"title": "Être payé", "desc": "Vos clients scannent le QR-code avec n'importe quelle app bancaire suisse."},
                "reconcile": {"title": "Rapprocher", "desc": "Factures payées, ouvertes et en retard dans un aperçu clair."},
            },
        },
        "voices": {
            "badge": "Premiers utilisateurs",
            "title": "Ce que disent nos premiers utilisateurs",
            "subtitle": "flinkli vient de lancer. Voici des impressions honnêtes des premiers indépendants — pas des avis payants.",
            "disclaimer": "Produit en phase de démarrage. Retours partagés avec accord ; noms abrégés pour la confidentialité.",
            "items": {
                "designer": {"quote": "J'ai envoyé ma première QR-facture en moins de deux minutes. Mon ancien modèle prenait une demi-heure.", "role": "Designer indépendante", "place": "Zurich"},
                "consultant": {"quote": "Rien que les rappels m'économisent un e-mail de relance chaque semaine.", "role": "Consultant indépendant", "place": "Genève"},
                "studio": {"quote": "Enfin un outil de facturation qui parle italien et comprend la TVA suisse.", "role": "Petite propriétaire de studio", "place": "Lugano"},
            },
        },
    },
    "it": {
        "compare": {
            "title": "flinkli vs Excel vs un commercialista",
            "subtitle": "Uno sguardo onesto su come flinkli si confronta con le due opzioni che la maggior parte dei freelance svizzeri usa oggi.",
            "feature": "Funzione",
            "excel": "Modello Excel",
            "accountant": "Commercialista",
            "rows": {
                "qr": "QR-fatture conformi",
                "speed": "Fattura in meno di 2 minuti",
                "cost": "Nessun costo ricorrente per fattura",
                "reminders": "Promemoria di pagamento automatici",
                "languages": "Fatture multilingue",
                "vat": "IVA svizzera gestita correttamente",
                "control": "Mantieni il pieno controllo",
            },
            "note": "Il confronto riflette un uso tipico. Un commercialista aggiunge valore reale per i casi complessi — flinkli è pensato per la fatturazione quotidiana dei freelance.",
        },
        "security": {
            "badge": "Dati in Svizzera",
            "title": "I tuoi dati restano in Svizzera",
            "body": "I dati di fatturazione sono sensibili. flinkli li archivia su infrastruttura ospitata in Svizzera, li cifra in transito e non li vende mai. Puoi esportare tutto in qualsiasi momento.",
            "highlight": "Hosting svizzero · TLS in transito · cifratura a riposo · export in qualsiasi momento",
            "points": {
                "hosting": {"title": "Hosting svizzero", "desc": "I dati sono archiviati su infrastruttura situata in Svizzera."},
                "transit": {"title": "Cifrato in transito", "desc": "Tutto il traffico è protetto end-to-end con TLS."},
                "rest": {"title": "Cifrato a riposo", "desc": "I dati archiviati sono cifrati, mai in chiaro."},
                "export": {"title": "Export in qualsiasi momento", "desc": "Scarica fatture e dati quando vuoi."},
                "ownership": {"title": "I dati sono tuoi", "desc": "Le tue fatture e i tuoi clienti sono sempre tuoi."},
                "noResale": {"title": "Mai venduti", "desc": "Non vendiamo né condividiamo i tuoi dati con terzi."},
            },
        },
        "workflow": {
            "title": "Si adatta a come lavori già",
            "subtitle": "Dalla prima bozza al pagamento riconciliato — flinkli si collega agli strumenti che i freelance svizzeri già usano.",
            "steps": {
                "create": {"title": "Crea", "desc": "Prepara una QR-fattura conforme in pochi secondi con il tuo brand."},
                "send": {"title": "Invia", "desc": "Invia il PDF via e-mail o condividi un link."},
                "pay": {"title": "Fatti pagare", "desc": "I clienti scansionano il QR-code con qualsiasi app bancaria svizzera."},
                "reconcile": {"title": "Riconcilia", "desc": "Fatture pagate, aperte e scadute in una panoramica chiara."},
            },
        },
        "voices": {
            "badge": "Primi utenti",
            "title": "Cosa ci dicono i primi utenti",
            "subtitle": "flinkli è appena partito. Queste sono impressioni oneste dei primi freelance — non recensioni pagate.",
            "disclaimer": "Prodotto in fase iniziale. Feedback condiviso con permesso; nomi abbreviati per privacy.",
            "items": {
                "designer": {"quote": "Ho inviato la mia prima QR-fattura in meno di due minuti. Il mio vecchio modello richiedeva mezz'ora.", "role": "Designer freelance", "place": "Zurigo"},
                "consultant": {"quote": "Solo i promemoria mi risparmiano un'e-mail di sollecito ogni settimana.", "role": "Consulente indipendente", "place": "Ginevra"},
                "studio": {"quote": "Finalmente uno strumento di fatturazione che parla italiano e capisce l'IVA svizzera.", "role": "Titolare di piccolo studio", "place": "Lugano"},
            },
        },
    },
    "tr": {
        "compare": {
            "title": "flinkli vs. Excel vs. muhasebeci",
            "subtitle": "flinkli'nin bugün çoğu İsviçreli serbest çalışanın kullandığı iki seçenekle nasıl karşılaştırıldığına dürüst bir bakış.",
            "feature": "Özellik",
            "excel": "Excel şablonu",
            "accountant": "Muhasebeci",
            "rows": {
                "qr": "Uyumlu QR-faturalar",
                "speed": "2 dakikadan kısa sürede fatura",
                "cost": "Fatura başına yinelenen maliyet yok",
                "reminders": "Otomatik ödeme hatırlatmaları",
                "languages": "Çok dilli faturalar",
                "vat": "İsviçre KDV'si doğru işlenir",
                "control": "Tam kontrol sende kalır",
            },
            "note": "Karşılaştırma tipik kullanımı yansıtır. Muhasebeci karmaşık durumlarda gerçek değer katar — flinkli günlük serbest çalışan faturalaması için tasarlandı.",
        },
        "security": {
            "badge": "İsviçre veri konumu",
            "title": "Verilerin İsviçre'de kalır",
            "body": "Fatura verileri hassastır. flinkli bunları İsviçre'de barındırılan altyapıda saklar, aktarım sırasında şifreler ve asla satmaz. Her şeyi istediğin zaman dışa aktarabilirsin.",
            "highlight": "İsviçre barındırma · aktarımda TLS · bekleyen veride şifreleme · her zaman dışa aktarma",
            "points": {
                "hosting": {"title": "İsviçre barındırma", "desc": "Veriler İsviçre'de bulunan altyapıda saklanır."},
                "transit": {"title": "Aktarımda şifreli", "desc": "Tüm trafik uçtan uca TLS ile korunur."},
                "rest": {"title": "Bekleyen veride şifreli", "desc": "Saklanan veriler şifrelidir, düz metin bırakılmaz."},
                "export": {"title": "Her zaman dışa aktar", "desc": "Faturalarını ve verilerini istediğin zaman indir."},
                "ownership": {"title": "Veriler sana ait", "desc": "Faturaların ve müşterilerin her zaman sana aittir."},
                "noResale": {"title": "Asla satılmaz", "desc": "Verilerini üçüncü taraflara satmayız veya paylaşmayız."},
            },
        },
        "workflow": {
            "title": "Zaten çalıştığın şekle uyar",
            "subtitle": "İlk taslaktan mutabık kalınan ödemeye — flinkli İsviçreli serbest çalışanların zaten kullandığı araçlara bağlanır.",
            "steps": {
                "create": {"title": "Oluştur", "desc": "Kendi markanla saniyeler içinde uyumlu bir QR-fatura hazırla."},
                "send": {"title": "Gönder", "desc": "PDF'i doğrudan e-posta ile gönder veya bir bağlantı paylaş."},
                "pay": {"title": "Ödeme al", "desc": "Müşteriler QR kodu herhangi bir İsviçre bankacılık uygulamasıyla tarar."},
                "reconcile": {"title": "Mutabık kal", "desc": "Ödenen, açık ve gecikmiş faturaları tek bir net görünümde izle."},
            },
        },
        "voices": {
            "badge": "İlk kullanıcılar",
            "title": "İlk kullanıcılar bize ne söylüyor",
            "subtitle": "flinkli yeni başladı. Bunlar onu kullanan ilk serbest çalışanların dürüst izlenimleri — ücretli yorumlar değil.",
            "disclaimer": "Erken aşama ürün. Geri bildirimler izinle paylaşıldı; gizlilik için isimler kısaltıldı.",
            "items": {
                "designer": {"quote": "İlk QR-faturamı iki dakikadan kısa sürede gönderdim. Eski şablonum yarım saat sürüyordu.", "role": "Serbest tasarımcı", "place": "Zürih"},
                "consultant": {"quote": "Sadece hatırlatmalar bile bana her hafta bir takip e-postası kazandırıyor.", "role": "Bağımsız danışman", "place": "Cenevre"},
                "studio": {"quote": "Sonunda İtalyanca konuşan ve İsviçre KDV'sini anlayan bir fatura aracı.", "role": "Küçük stüdyo sahibi", "place": "Lugano"},
            },
        },
    },
    "ku": {
        "compare": {
            "title": "flinkli li hember Excel û jimêrkarekî",
            "subtitle": "Nêrîneke rastgo ya li ser ka flinkli çawa bi du vebijarkên ku piraniya karkerên serbixwe yên Swîsreyî îro bikar tînin re tê berhev kirin.",
            "feature": "Taybetmendî",
            "excel": "Şablona Excel",
            "accountant": "Jimêrkar",
            "rows": {
                "qr": "QR-fatûreyên lihevhatî",
                "speed": "Fatûre di bin 2 deqeyan de",
                "cost": "Ji bo her fatûreyê lêçûna dubare tune",
                "reminders": "Bîranînên dravdanê yên otomatîk",
                "languages": "Fatûreyên pirzimanî",
                "vat": "KDV ya Swîsreyî rast tê birêvebirin",
                "control": "Kontrola tevahî li te dimîne",
            },
            "note": "Berhevdan bikaranîna asayî nîşan dide. Jimêrkar ji bo rewşên tevlihev nirxa rast zêde dike — flinkli ji bo fatûreya rojane ya karkerên serbixwe hatiye çêkirin.",
        },
        "security": {
            "badge": "Cihê daneyan li Swîsreyê",
            "title": "Daneyên te li Swîsreyê dimînin",
            "body": "Daneyên fatûreyê hesas in. flinkli wan li ser binesaziya ku li Swîsreyê ye tomar dike, di dema veguhastinê de şîfre dike û qet wan nafiroşe. Tu dikarî her demê her tiştî derxî.",
            "highlight": "Mêvandariya Swîsreyî · TLS di veguhastinê de · şîfrekirin di bêhnvedanê de · her dem derxistin",
            "points": {
                "hosting": {"title": "Mêvandariya Swîsreyî", "desc": "Dane li ser binesaziya ku li Swîsreyê ye têne tomarkirin."},
                "transit": {"title": "Di veguhastinê de şîfre", "desc": "Hemû trafîk bi TLS ji serî heta dawiyê tê parastin."},
                "rest": {"title": "Di bêhnvedanê de şîfre", "desc": "Daneyên tomarkirî şîfre ne, ne bi nivîsa zelal."},
                "export": {"title": "Her dem derxistin", "desc": "Fatûre û daneyên xwe her demê dakêşîne."},
                "ownership": {"title": "Dane yên te ne", "desc": "Fatûre û xerîdarên te her dem yên te ne."},
                "noResale": {"title": "Qet nayê firotin", "desc": "Em daneyên te nafiroşin an bi aliyên sêyem re parve nakin."},
            },
        },
        "workflow": {
            "title": "Li gorî awayê ku tu jixwe dixebitî tê",
            "subtitle": "Ji reşnivîsa yekem heta dravdana lihevhatî — flinkli bi amûrên ku karkerên serbixwe yên Swîsreyî jixwe bikar tînin ve tê girêdan.",
            "steps": {
                "create": {"title": "Biafirîne", "desc": "Di çend çirkeyan de bi markaya xwe fatûreyeke QR ya lihevhatî amade bike."},
                "send": {"title": "Bişîne", "desc": "PDF-ê rasterast bi e-nameyê bişîne an girêdanekê parve bike."},
                "pay": {"title": "Drav bistîne", "desc": "Xerîdar koda QR bi her sepana bankî ya Swîsreyî dixwînin."},
                "reconcile": {"title": "Lihev bîne", "desc": "Fatûreyên hatine dayîn, vekirî û derengmayî di nêrîneke zelal de bişopîne."},
            },
        },
        "voices": {
            "badge": "Bikarhênerên pêşîn",
            "title": "Bikarhênerên pêşîn ji me re çi dibêjin",
            "subtitle": "flinkli nû dest pê kir. Ev bandorên rastgo yên karkerên serbixwe yên pêşîn in — ne nirxandinên bi pere.",
            "disclaimer": "Berhema qonaxa destpêkê. Bertek bi destûr hatine parve kirin; nav ji bo nepenîtiyê hatine kurt kirin.",
            "items": {
                "designer": {"quote": "Fatûreya xwe ya yekem a QR di bin du deqeyan de şand. Şablona min a berê nîv saet digirt.", "role": "Sêwirvan a serbixwe", "place": "Zurich"},
                "consultant": {"quote": "Tenê bîranîn her hefte e-nameyeke şopandinê ji min re xilas dikin.", "role": "Şêwirmendê serbixwe", "place": "Geneva"},
                "studio": {"quote": "Di dawiyê de amûreke fatûreyê ku bi Îtalî diaxive û KDV ya Swîsreyî fêm dike.", "role": "Xwediyê studyoyeke piçûk", "place": "Lugano"},
            },
        },
    },
}

NEW_KEYS = ["compare", "security", "workflow", "voices"]


def reorder_landing(landing: dict) -> dict:
    """Rebuild the landing object so the new sections sit before `faq`."""
    ordered = collections.OrderedDict()
    for key, value in landing.items():
        if key in NEW_KEYS:
            continue
        if key == "faq":
            for nk in NEW_KEYS:
                ordered[nk] = BLOCKS_CURRENT[nk]
        ordered[key] = value
    # If there was no `faq` key, append at the end.
    if "faq" not in landing:
        for nk in NEW_KEYS:
            ordered[nk] = BLOCKS_CURRENT[nk]
    return ordered


for code, blocks in BLOCKS.items():
    path = LOCALES / f"{code}.json"
    data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    BLOCKS_CURRENT = blocks
    data["landing"] = reorder_landing(data["landing"])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{code}: landing keys = {len(data['landing'])}")
