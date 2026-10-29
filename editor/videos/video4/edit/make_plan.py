import json

E = "/home/user/HandyLapse-App/editor/videos/video4/edit/"
wo = json.load(open(E + "words_out_1x.json"))  # tempi a velocità 1x
W = wo["words"]
clean = lambda s: s.strip('"«»,.:?!').lower()


def t(word, near=None):
    c = [w for w in W if clean(w["text"]) == clean(word)]
    if near is not None:
        c = sorted(c, key=lambda w: abs(w["start"] - near))
    return round(c[0]["start"], 2)


def idx(word, near):
    c = [(i, w) for i, w in enumerate(W) if clean(w["text"]) == clean(word)]
    return min(c, key=lambda x: abs(x[1]["start"] - near))[0]


S = lambda tt, n: {"t": tt, "name": n}
rows = [["Lastra PMMA trasparente", "3 mm", "24", "B3"], ["Lastra PMMA opale", "5 mm", "12", "B4"], ["Lastra policarbonato", "4 mm", "8", "C1"],
        ["Profilo alluminio", "20×20", "140", "D2"], ["Viti inox M8", "40 mm", "350", "A1"], ["Pannello forex bianco", "10 mm", "16", "C3"], ["Tubo PVC", "Ø 32", "60", "E2"]]
T = dict(caccia=t("caccia"), scorri=t("scorri"), misura=t("misura", 7.7), chiami=t("chiami"), intanto=t("intanto"), quarto=t("quarto"),
         scrivere=t("scrivere", 11.9), abbiamo=t("abbiamo", 15.3), risposta=t("risposta", 16.9), quanti2=t("quanti", 17.7), dove=t("dove"),
         excel=t("l'Excel", 20.25), whatsapp2=t("WhatsApp", 21.5), niente1=t("niente", 22.0), gestionali=t("gestionali"),
         scrivi=t("scrivi", 27.6), quantita=t("quantità", 29.3), aggiunto=t("aggiunto"), solo=t("solo", 29.9),
         aggiorna=t("aggiorna"), magazzino3=t("magazzino", 35.6), commerciale=t("commerciale"), sa=t("sa"), telefono=t("telefono"),
         recuperi=t("recuperi"), scrivilo=t("Scrivilo"), commenti=t("commenti"), automatizzare=t("automatizzare"),
         giorno=t("giorno", 0.8), chiunque=t("chiunque"), qualcuno=t("qualcuno"), ce=t("Ce", 2.3), due=t("due", 15.95))
end = wo["duration"]
scenes = [
    dict(id="s01", start=0.0, end=3.45, line="Quante volte al giorno in azienda qualcuno chiede: «Ce l'abbiamo questo pezzo?»",
         action="Le domande arrivano in chat una dopo l'altra, alternate, le vecchie salgono; l'ultima è proprio «Ce l'abbiamo questo pezzo?». ",
         graphic={"type": "bubbles", "props": {"items": [
             {"at": 0.1, "name": "Commerciale", "text": "Avete la lastra da 3 mm?"}, {"at": T["giorno"], "name": "Cliente", "text": "Quante ne restano?"},
             {"at": T["qualcuno"], "name": "Ufficio", "text": "È arrivato il profilo?"}, {"at": T["ce"], "name": "Collega", "text": "Ce l'abbiamo questo pezzo?"}]}},
         payoff={"word": "pezzo", "t": T["ce"]}, sfx=[S(0.1, "bolla-1"), S(T["giorno"], "bolla-2"), S(T["qualcuno"], "bolla-3"), S(T["ce"], "bolla-4")]),
    dict(id="s02", start=3.5, end=8.15, line="E parte la caccia. Apri l'Excel del magazzino, scorri centinaia di righe, controlli la misura,",
         action="Il foglio Excel del magazzino entra; su «scorri» le righe volano (centinaia) e frenano; su «misura» si illumina la colonna Misura.",
         graphic={"type": "sheet", "props": {"title": "Magazzino.xlsx", "rows": rows, "scrollAt": [T["scorri"], T["scorri"] + 1.2], "highlightAt": T["misura"], "highlightCol": 1}},
         payoff={"word": "misura", "t": T["misura"]}, sfx=[S(3.5, "foglio-entra"), S(T["scorri"], "righe-scorrono"), S(T["misura"], "colonna-misura")]),
    dict(id="s03", start=8.18, end=9.42, line="chiami chi sta in magazzino",
         action="Tessera 3D col telefono che atterra girando: CHIAMI IL MAGAZZINO.",
         graphic={"type": "icon3d", "props": {"items": [{"icon": "phone", "label": "CHIAMI IL MAGAZZINO", "at": T["chiami"]}]}},
         payoff={"word": "chiami", "t": T["chiami"]}, sfx=[S(T["chiami"], "tessera-telefono-chiama"), S(T["chiami"] + 0.35, "squillo")]),
    dict(id="s04", start=9.45, end=11.0, line="e intanto è passato un quarto d'ora.",
         action="Scheda stile referenza (pillola INTANTO, orologio, «Per una sola domanda», 15 minuti), barra che si riempie fino a «quarto».",
         graphic={"type": "idcard", "props": {"tag": "INTANTO", "icon": "clock", "kicker": "Per una sola domanda", "title": "15 minuti", "bar": 0.95, "barAt": T["intanto"]}},
         payoff={"word": "quarto", "t": T["quarto"]}, sfx=[S(9.45, "scheda-entra-2"), S(T["quarto"], "orologio")]),
    dict(id="s05", start=11.03, end=19.18,
         line="Ora immagina di scrivere su WhatsApp: «Lastre 3 millimetri trasparente, quanti ne abbiamo?» E in due secondi ti arriva la risposta, quanti pezzi hai e dove sono.",
         action="Chat WhatsApp col Magazzino: il messaggio si scrive mentre lo dici e parte su «abbiamo»; il bot «sta scrivendo» e su «risposta» arriva: 24 pezzi, scaffale B3; «24 pezzi» si evidenzia su «quanti pezzi», «scaffale B3» su «dove sono».",
         graphic={"type": "whatsapp", "props": {"name": "Magazzino", "status": "online", "messages": [
             {"from": "me", "text": "Lastre 3 mm trasparenti, quante ne abbiamo?", "typeFrom": T["scrivere"], "at": round(T["abbiamo"] + 0.25, 2)},
             {"from": "bot", "text": "**Lastra PMMA trasparente 3 mm**\n24 pezzi · scaffale B3", "at": T["risposta"]}],
             "highlights": [{"at": T["quanti2"], "text": "24 pezzi"}, {"at": T["dove"], "text": "scaffale B3"}]}},
         payoff={"word": "risposta", "t": T["risposta"]},
         sfx=[S(11.03, "chat-entra"), S(T["scrivere"], "digita-messaggio"), S(round(T["abbiamo"] + 0.25, 2), "invio-messaggio"), S(T["risposta"], "risposta-messaggio"),
              S(T["quanti2"], "evidenzia-pezzi"), S(T["dove"], "evidenzia-scaffale")]),
    dict(id="s06", start=19.2, end=21.97, line="Si può fare, si collega l'Excel che usi già a WhatsApp.",
         action="Due tessere 3D: EXCEL (verde foglio) su «l'Excel», WHATSAPP (verde chat) su «WhatsApp», poi una linea d'accento le collega con impulsi che corrono.",
         graphic={"type": "icon3d", "props": {"items": [{"icon": "sheet", "label": "EXCEL", "at": T["excel"], "color": "#1F7A4C"},
                                                        {"icon": "chat", "label": "WHATSAPP", "at": T["whatsapp2"], "color": "#22B35E"}], "linkAt": round(T["whatsapp2"] + 0.25, 2)}},
         payoff={"word": "WhatsApp", "t": T["whatsapp2"]}, sfx=[S(T["excel"], "tessera-excel"), S(T["whatsapp2"], "tessera-whatsapp"), S(round(T["whatsapp2"] + 0.25, 2), "collega-ping")]),
    dict(id="s07", start=22.0, end=24.2, line="niente programmi nuovi, niente gestionali da imparare.",
         action="Due timbri rossi uno sotto l'altro: 0 PROGRAMMI NUOVI su «niente», 0 GESTIONALI su «gestionali».",
         graphic={"type": "zero", "props": {"items": [{"at": T["niente1"], "text": "0 programmi nuovi"}, {"at": T["gestionali"], "text": "0 gestionali"}]}},
         payoff={"word": "gestionali", "t": T["gestionali"]}, sfx=[S(T["niente1"], "timbro-1"), S(T["gestionali"], "timbro-2")]),
    dict(id="s08", start=24.23, end=29.25, line="E non serve solo a cercare. Arriva un pezzo nuovo, lo scrivi in chat, nome, misura, quantità,",
         action="La chat torna: su «lo scrivi» si scrive il pezzo nuovo, il nome, la misura e la quantità compaiono mentre li dici, poi il messaggio parte.",
         graphic={"type": "whatsapp", "props": {"name": "Magazzino", "status": "online", "messages": [
             {"from": "me", "text": "Nuovo: Lastra PMMA opale · 5 mm · 10 pz", "typeFrom": T["scrivi"], "at": round(T["quantita"] + 0.3, 2)}]}},
         payoff={"word": "quantità", "t": T["quantita"]}, sfx=[S(24.23, "chat-entra-2"), S(T["scrivi"], "digita-nuovo"), S(round(T["quantita"] + 0.3, 2), "invio-nuovo")]),
    dict(id="s09", start=29.27, end=34.09, line="e viene aggiunto da solo nell'Excel. Hai preso delle lastre nuove? Lo scrivi e la quantità si aggiorna.",
         action="Il foglio: su «da solo» entra in cima la riga NUOVO (Lastra PMMA opale, 5 mm, 10); su «aggiorna» la quantità della lastra trasparente lampeggia e sale da 24 a 34.",
         graphic={"type": "sheet", "props": {"title": "Magazzino.xlsx", "rows": rows, "addAt": T["solo"], "addRow": ["Lastra PMMA opale", "5 mm", "10", "B4"],
                                             "updateAt": T["aggiorna"], "updateRow": 0, "updateCol": 2, "updateTo": 34}},
         payoff={"word": "aggiorna", "t": T["aggiorna"]}, sfx=[S(29.27, "foglio-entra-2"), S(T["solo"], "riga-aggiunta"), S(T["aggiorna"], "quantita-sale")]),
    dict(id="s10", start=34.12, end=41.12,
         line="Così chiunque in azienda, dal magazzino al commerciale in giro dai clienti, sa in un attimo cosa c'è e cosa manca, direttamente dal telefono.",
         action="Quattro tessere 3D: CHIUNQUE su «chiunque», MAGAZZINO, COMMERCIALE (auto), poi su «sa in un attimo» la linea le collega e su «telefono» arriva TELEFONO.",
         graphic={"type": "icon3d", "props": {"items": [{"icon": "family", "label": "CHIUNQUE", "at": T["chiunque"]}, {"icon": "house", "label": "MAGAZZINO", "at": T["magazzino3"]}, {"icon": "car", "label": "COMMERCIALE", "at": T["commerciale"]},
                                                        {"icon": "phone", "label": "TELEFONO", "at": T["telefono"]}], "linkAt": T["sa"]}},
         payoff={"word": "telefono", "t": T["telefono"]},
         sfx=[S(T["chiunque"], "tessera-chiunque"), S(T["magazzino3"], "tessera-magazzino"), S(T["commerciale"], "tessera-commerciale"), S(T["sa"], "collega-2"), S(T["telefono"], "tessera-telefono")]),
    dict(id="s11", start=41.14, end=44.21, line="Se hai una piccola azienda è tempo che recuperi ogni singolo giorno.",
         action="Scheda: pillola PICCOLA AZIENDA, orologio, «Ogni singolo giorno», «Tempo perso» che su «recuperi» diventa «Tempo recuperato» (pillola d'accento), barra piena.",
         graphic={"type": "idcard", "props": {"tag": "PICCOLA AZIENDA", "tag2": "RECUPERATO", "icon": "clock", "kicker": "Ogni singolo giorno", "title": "Tempo perso",
                                              "title2": "Tempo recuperato", "swapAt": T["recuperi"], "bar": 1.0, "barAt": T["recuperi"]}},
         payoff={"word": "recuperi", "t": T["recuperi"]}, sfx=[S(41.14, "scheda-entra-3"), S(T["recuperi"], "tempo-recuperato")]),
    dict(id="s12", start=44.24, end=51.0,
         line="Qual è il lavoro che ti fa perdere più tempo in azienda? Scrivilo nei commenti, magari si può automatizzare.",
         action="Box commenti: su «Scrivilo» si scrive «L'INVENTARIO», parte su «commenti», su «automatizzare» arriva la risposta «Si può automatizzare ✓»; fermo finale.",
         graphic={"type": "dm", "text": "L'inventario", "props": {"name": "Commenti", "placeholder": "Aggiungi un commento…", "sentLabel": "Pubblicato",
                                                                "typeAt": T["scrivilo"], "sendAt": round(T["commenti"] + 0.3, 2), "replyAt": T["automatizzare"], "reply": "Si può automatizzare ✓"}},
         payoff={"word": "automatizzare", "t": T["automatizzare"]},
         sfx=[S(44.24, "commenti-apre"), S(T["scrivilo"], "digita-guida"), S(round(T["commenti"] + 0.3, 2), "pubblica"), S(T["automatizzare"], "risposta-dm")]),
]
pos = {"bubbles": dict(y=0.29), "sheet": dict(y=0.265, scale=0.92), "icon3d": dict(y=0.26), "idcard": dict(y=0.265, scale=0.95),
       "whatsapp": dict(y=0.27, scale=0.94), "zero": dict(y=0.27, scale=0.95), "dm": dict(y=0.265, scale=0.9)}
for sc in scenes:
    sc["graphic"].update(pos[sc["graphic"]["type"]])
emph = [idx(w, n) for w, n in [("caccia", 4), ("quarto", 10.4), ("WhatsApp", 12.3), ("secondi", 16), ("l'Excel", 20.25), ("gestionali", 23.3), ("solo", 29.9),
                                ("aggiorna", 33.6), ("telefono", 40.6), ("recuperi", 42.7), ("automatizzare", 48.3)]]
plan = {"video": "video4", "engine": "hyperframes", "style": "pulse", "canvas": {"width": 1080, "height": 1920, "fps": 30}, "duration": round(end + 1.3, 3), "hold": 1.3,
        "face": {"x": 0.5, "y": 0.42, "note": "iPhone: cornice x 80–1000, y 900–1700; grafiche y 250–760; sottotitoli y≈830; sfondo sostituito con uno studio da programmatore (background.py)"},
        "styleOverrides": {"grade": {"brightness": 1, "contrast": 1.04, "saturation": 1.04, "warmth": 0, "vignette": 0.15},
                           "captions": {"positionY": 0.432, "fontSize": 84, "uppercase": False, "maxCharsPerLine": 10}, "motion": {"theme": "light"}},
        "frame": {"x": 80, "y": 900, "w": 920, "h": 800, "radius": 56, "border": 7, "zoom": 1.0, "faceY": 0.42, "faceAt": 0.4},
        "captions": {"style": "pulse", "emphasis": emph, "words": "edit/words_out.json"},
        "scenes": scenes, "objects": [],
        "camera": [{"type": "punch", "t": T[k], "strength": s} for k, s in [("caccia", 0.7), ("quarto", 0.8), ("due", 0.6), ("gestionali", 0.8), ("solo", 0.6), ("telefono", 0.7), ("automatizzare", 0.9)]]}
plan["music"] = {"file": "editor/assets/music/tech-pulse-video4.wav", "gap": 9, "note": "composta in locale: python .claude/skills/motion-hyperframes/scripts/music.py -o editor/assets/music/tech-pulse-video4.wav --duration 46.133 --bpm 120 --end 44.6"}
# il piano è a velocità 1x: speed.py lo accelera (motion-plan_1x.json → motion-plan.json)
json.dump(plan, open(E + "motion-plan_1x.json", "w"), ensure_ascii=False, indent=1)
print("emph", [W[i]["text"] for i in emph]); print(len(scenes), "scene", T)
