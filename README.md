# Centrale 112 — Sala operativa di Valdora

> Simulazione narrativa e gestionale di una centrale unica di emergenza ambientata nella città immaginaria di **Valdora**.

**Creatore e autore originale:** Luca Risso — [@lucarisso07](https://github.com/lucarisso07)  
**Copyright:** © 2026 Luca Risso. Tutti i diritti riservati.  
**Licenza:** uso gratuito e non commerciale con attribuzione obbligatoria. **Vendita e sfruttamento commerciale vietati** senza autorizzazione scritta. Vedi [LICENSE](LICENSE).

> [!IMPORTANT]
> Questo repository è **pubblico e source-available, ma NON open source**. Il fatto che il codice sia visibile o scaricabile non autorizza la vendita, la rimozione dell'attribuzione, la sublicenza o altri usi non concessi espressamente dalla licenza.

> [!WARNING]
> **Centrale 112 è un videogioco/simulazione narrativa. Non è il servizio reale 112, non è affiliato a enti di emergenza e non è uno strumento di formazione o supporto operativo.** Tempi, procedure, comunicazioni e scenari sono adattati alla simulazione. In una vera emergenza usa esclusivamente i canali ufficiali.

---

## Cos'è Centrale 112

Centrale 112 mette il giocatore nella postazione di un operatore di sala. L'obiettivo non è semplicemente premere un pulsante e inviare un mezzo: bisogna **ascoltare, ricostruire, localizzare, distinguere i fatti dalle supposizioni, coordinare le risorse, gestire la radio e seguire l'intervento fino alla chiusura**.

Ogni turno combina chiamate civili, segnalazioni provenienti dalle pattuglie, disponibilità variabile delle unità, viabilità, imprevisti e decisioni operative. Le conversazioni sono costruite per premiare domande precise: il chiamante non conosce automaticamente tutto e non deve inventare ciò che non può vedere o verificare.

La città, i personaggi e gli eventi sono fittizi. **Valdora non rappresenta un comune reale.**

## Filosofia di gioco

Il gioco è costruito attorno a cinque passaggi:

1. **Ascoltare** — capire che cosa sta realmente riferendo la persona.
2. **Localizzare** — ottenere un punto sufficientemente preciso per l'invio.
3. **Chiarire** — separare informazioni certe, dubbie e non verificabili.
4. **Coordinare** — assegnare i servizi necessari e comunicare con gli equipaggi.
5. **Seguire** — reagire ad aggiornamenti, problemi sul posto, richieste di verifica e conclusione dell'intervento.

Non esiste una singola sequenza rigida di domande. La postazione permette di scrivere in linguaggio naturale e, quando utile, offre suggerimenti contestuali.

---

## Caratteristiche principali

### Postazione chiamate

- risposta e gestione delle chiamate in entrata;
- possibilità di mettere una linea in attesa e riprenderla;
- conversazioni contestuali in italiano;
- domande libere scritte dall'operatore;
- suggerimenti di approfondimento;
- distinzione tra ciò che il chiamante ha osservato e ciò che non può confermare;
- aggiornamenti spontanei durante alcuni eventi;
- stato emotivo e informazioni che emergono progressivamente.

### Dossier operativo

Per ogni evento viene costruito un fascicolo che può contenere:

- posizione approssimativa;
- posizione confermata;
- persone coinvolte;
- pericoli osservati o riferiti;
- condizioni e sintomi riferiti;
- accessi e riferimenti utili;
- informazioni ancora da verificare;
- fonte e orario dei fatti acquisiti;
- note dell'operatore;
- risorse assegnate;
- cronologia operativa.

Il dossier può essere esportato in formato Markdown.

### Mappa di Valdora

La simulazione utilizza una città fittizia di circa **3600 × 2400 unità di mappa**, con:

- rete stradale estesa;
- circa **204 incroci/nodi**;
- **5 ponti**;
- centro storico;
- Bellavista;
- Parco delle Colline;
- Scalo merci;
- Porto Nuovo;
- ulteriori aree residenziali, industriali e verdi;
- spostamento e zoom della mappa;
- centratura su unità ed eventi;
- percorsi delle risorse calcolati sulla rete stradale.

### Flotta operativa

Il turno dispone di **8 unità**:

| ID | Servizio | Nominativo |
|---|---|---|
| P01 | Polizia | Alfa 21 |
| P02 | Polizia | Alfa 24 |
| P03 | Polizia | Alfa 27 |
| M01 | Sanitario | Medica 01 |
| M02 | Sanitario | Medica 02 |
| M03 | Sanitario | Medica 03 |
| V01 | Vigili del fuoco | Vigili 11 |
| V02 | Vigili del fuoco | Vigili 12 |

Le unità possono risultare disponibili, in pattugliamento, in viaggio, sul posto, in attesa o in rientro. Le pattuglie di polizia continuano a muoversi sul territorio quando non sono impegnate e possono generare nuove segnalazioni.

### Radio

Selezionando un'unità si apre il relativo canale. È possibile impartire o richiedere, in forma naturale, azioni come:

- posizione e situazione dell'equipaggio;
- invio a un evento;
- richiesta di rinforzi;
- arresto temporaneo/in attesa;
- rientro alla base;
- ripresa del pattugliamento;
- aggiornamenti sull'intervento.

Una domanda non equivale automaticamente a un ordine: per muovere o assegnare una risorsa la disposizione deve risultare esplicita.

### Viabilità e imprevisti

Durante il turno possono verificarsi:

- rallentamenti;
- ostacoli o chiusure temporanee;
- ricalcolo dei percorsi;
- richieste di supporto;
- segnalazioni nate direttamente dal territorio;
- aggiornamenti imprevisti durante un avvicinamento o un intervento.

### Gestione dell'intervento

Dopo l'arrivo della prima squadra si passa dalla sola gestione della chiamata alla conduzione dell'intervento.

Sono previste due modalità di lavoro simulate:

- **Coordinamento congiunto** — i servizi necessari attendono di essere tutti presenti; il lavoro simulato richiede 70 secondi per servizio.
- **Lavoro per fasi** — ogni servizio può iniziare autonomamente; il lavoro simulato richiede 110 secondi per servizio.

Durante l'attività può emergere un problema di coordinamento specifico del caso. L'operatore può dover richiedere una verifica o recuperare un riferimento già acquisito. I tempi indicati sono **tempi di gioco**, non tempi reali di intervento.

La conclusione tecnica di un servizio non chiude automaticamente il fascicolo: il giocatore legge il riscontro finale e conferma la chiusura.

---

## Scenari civili

La versione inclusa contiene **8 famiglie di scenario**, con informazioni, varianti, approfondimenti e sviluppi narrativi:

1. **Un urto, poi il silenzio** — incidente stradale con conducente non responsivo e traffico attorno al veicolo.
2. **Fumo dietro la porta** — fumo in un edificio, persone all'interno e sintomi riferiti.
3. **Sul sentiero del parco** — malessere di una persona in un'area pedonale.
4. **Una finestra infranta** — attività sospetta in un magazzino chiuso.
5. **Allagamento / criticità d'acqua** — scenario con accessi e persone da verificare.
6. **Ascensore bloccato** — persone ferme in cabina e necessità di localizzazione/accesso.
7. **Voci nell'appartamento accanto** — segnalazione indiretta con informazioni limitate a ciò che una vicina può sentire.
8. **Non trova più l'uscita** — persona disorientata in un parco, da localizzare tramite riferimenti ambientali.

Ogni nuovo turno seleziona **5 scenari civili** tra quelli disponibili e può aggiungere segnalazioni provenienti dalle pattuglie.

---

## Motore conversazionale

### Modalità standard: motore contestuale integrato

Il file `Centrale112.html` contiene già il motore contestuale necessario per giocare. Questa modalità:

- funziona senza account esterni;
- non richiede chiavi API;
- interpreta sinonimi e formulazioni naturali previste dal gioco;
- collega le domande ai temi dello scenario;
- conserva negazioni, limiti di conoscenza e informazioni già emerse;
- evita, per quanto previsto dalla logica narrativa, di inventare dettagli non presenti nello scenario.

Questa è la modalità pubblica e autonoma del repository.

### Modalità opzionale: modello locale

L'architettura supporta anche un livello semantico locale basato su un modello eseguito sul computer dell'utente. Nel progetto originale è stato sperimentato con:

- `llama.cpp` come runtime di inferenza;
- `Qwen3-4B-Instruct-2507` in formato GGUF.

**Il modello, il runtime binario e i moduli locali aggiuntivi non sono inclusi in questo repository.** La versione pubblica continua comunque a funzionare con il motore contestuale integrato.

---

## Installazione e avvio

### Requisiti consigliati

- Windows 10/11;
- browser moderno (Chrome, Edge, Firefox o equivalente);
- Node.js 18 o successivo per usare l'avviatore locale.

### Metodo consigliato — avviatore locale

1. Scarica o clona il repository.
2. Entra nella cartella `outputs`.
3. Fai doppio clic su `Avvia-Centrale.cmd`.
4. Apri, se non si apre automaticamente, `http://127.0.0.1:8122/`.
5. Per arrestare i processi locali avviati dal gioco usa `Ferma-Centrale.cmd`.

Se non sono presenti i componenti opzionali dell'IA locale, il gioco parte automaticamente con il motore contestuale integrato.

### Metodo semplice — solo HTML

È possibile aprire direttamente:

`outputs/Centrale112.html`

In questo caso il gioco utilizza il motore contestuale integrato. Alcuni browser possono applicare regole differenti al salvataggio locale quando una pagina viene aperta come file; per la massima coerenza è consigliato l'avviatore.

### Clonazione con Git

```bash
git clone https://github.com/lucarisso07/centrale-112.git
cd centrale-112/outputs
```

Su Windows, avvia poi `Avvia-Centrale.cmd`.

---

## Salvataggi e privacy

- Il turno viene salvato nel `localStorage` del browser.
- Il salvataggio resta sul computer e sul profilo browser utilizzato.
- Il gioco base non richiede un account online né una chiave API.
- Il server incluso ascolta solo su `127.0.0.1` / `localhost`.
- La lettura vocale, se attivata, usa le voci italiane messe a disposizione dal browser/sistema.
- Il microfono non viene utilizzato: i messaggi dell'operatore sono scritti.

I salvataggi aperti direttamente come file HTML e quelli aperti tramite `http://127.0.0.1:8122/` possono risultare separati perché il browser li considera origini differenti.

---

## Struttura del repository

```text
centrale-112/
├─ README.md
├─ LICENSE
├─ NOTICE
├─ COPYRIGHT.md
├─ CITATION.cff
├─ SECURITY.md
├─ CONTRIBUTING.md
├─ docs/
│  ├─ GUIDA_GIOCO.md
│  ├─ ARCHITETTURA.md
│  ├─ LICENZA_E_USO.md
│  └─ PUBBLICAZIONE_GITHUB.md
└─ outputs/
   ├─ Centrale112.html
   ├─ Avvia-Centrale.cmd
   ├─ Ferma-Centrale.cmd
   ├─ avvia-centrale.cjs
   ├─ centrale-server.cjs
   └─ LEGGIMI.md
```

---

## Stato del progetto

**Versione documentata:** v7  
**Stato:** giocabile / sviluppo indipendente  
**Lingua principale:** italiano  
**Piattaforma principale:** browser desktop su Windows

---

## Licenza e diritti d'autore

Copyright © 2026 **Luca Risso**. Tutti i diritti riservati.

In sintesi, salvo autorizzazione scritta separata:

- ✅ puoi scaricare il gioco gratuitamente;
- ✅ puoi usarlo per finalità personali, di studio, test o altre finalità non commerciali;
- ✅ puoi modificarlo per finalità non commerciali;
- ✅ puoi condividere gratuitamente una versione originale o modificata **mantenendo l'attribuzione a Luca Risso, il link al repository e la licenza**;
- ❌ non puoi venderlo;
- ❌ non puoi venderne versioni modificate;
- ❌ non puoi inserirlo dietro paywall, abbonamenti o servizi a pagamento;
- ❌ non puoi rimuovere o falsificare il nome dell'autore;
- ❌ non puoi sublicenziarlo o presentarlo come una tua opera originale;
- ❌ non puoi usarlo come sistema reale di emergenza o materiale formativo certificato.

I termini completi e vincolanti sono in [LICENSE](LICENSE). Per una spiegazione leggibile: [docs/LICENZA_E_USO.md](docs/LICENZA_E_USO.md). Consulta inoltre [DISCLAIMER.md](DISCLAIMER.md) e [PRIVACY.md](PRIVACY.md).

Una violazione della licenza può costituire violazione del diritto d'autore. Le conseguenze dipendono dalla legge applicabile e dal caso concreto; possono comprendere rimedi civili e, quando ricorrono i presupposti previsti dalla legge, anche sanzioni penali o amministrative. Il repository non afferma che ogni violazione determini automaticamente responsabilità penale.

---

## Disclaimer su 112 ed emergenze reali

Questo progetto:

- non è collegato al Numero Unico Europeo 112;
- non è sviluppato, approvato o certificato da centrali operative reali;
- non riproduce necessariamente procedure, tempi, protocolli o competenze reali;
- non deve essere usato per decidere che cosa fare in un'emergenza;
- non sostituisce formazione, protocolli, operatori o servizi ufficiali.

Tutti i nomi di persone, luoghi e situazioni sono usati in un contesto di finzione narrativa salvo diversa indicazione.

---

## Componenti di terze parti opzionali

Il repository non redistribuisce il modello o il runtime citati di seguito, ma l'architettura può interfacciarsi localmente con:

- **llama.cpp** — progetto di terze parti distribuito con licenza MIT;
- **Qwen3-4B-Instruct-2507** — modello di terze parti distribuito con licenza Apache 2.0;
- conversioni/quantizzazioni GGUF eventualmente scaricate da provider esterni, soggette ai rispettivi termini.

Consulta [NOTICE](NOTICE) prima di aggiungere o redistribuire componenti di terze parti.

---

## Autore

**Luca Risso**  
GitHub: [@lucarisso07](https://github.com/lucarisso07)  
Repository ufficiale: <https://github.com/lucarisso07/centrale-112>

Se trovi copie del gioco vendute, rilicenziate o distribuite senza attribuzione in violazione della licenza, usa il repository ufficiale come riferimento per identificare l'opera e il titolare indicato del progetto originale.
