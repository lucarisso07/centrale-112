<p align="center"><img src="docs/assets/copertina.svg" alt="Centrale 112 — Valdora. Creatore: risso luca." width="100%"></p>

<h1 align="center">Centrale 112 · Valdora</h1>
<p align="center"><strong>Una voce dall’altra parte della linea. Una città da coordinare.</strong><br>Videogioco narrativo di gestione delle emergenze · Creatore: <strong>risso luca</strong></p>
<p align="center">Italiano · HTML / CSS / JavaScript · IA locale opzionale · Versione di gioco v6</p>

---

Prendi posto nella sala operativa di Valdora: ascolta i chiamanti, ricostruisci ciò che è successo e coordina le squadre sul territorio. Le informazioni arrivano attraverso conversazioni, segnalazioni radio e riscontri sul posto; il dossier cresce insieme all’intervento.

**[Avvio rapido](#avvio-rapido)** · **[Guida al gioco](outputs/LEGGIMI.md)** · **[Configurazione IA](docs/IA-LOCALE.md)** · **[Sviluppo](docs/SVILUPPO.md)** · **[Crediti](CREDITS.md)**

## Dentro la sala operativa

| Funzione | Cosa puoi fare |
| --- | --- |
| Storie e chiamate | Affrontare otto scenari civili con varianti, cinque per turno, e approfondire il contesto dei personaggi. |
| Guida contestuale | Seguire cinque fasi: ascolta, localizza, chiarisci, coordina e segui. |
| Dossier progressivo | Consultare fatti acquisiti, fonti, orari, note, cronologia e risorse assegnate. |
| Radio e pattuglie | Comunicare con gli equipaggi, trasmettere briefing, chiedere aggiornamenti e gestire segnalazioni dal territorio. |
| Città estesa | Esplorare una mappa di 3600 × 2400, con 204 nodi stradali, cinque ponti e nuovi quartieri. |
| Sviluppi ed epiloghi | Seguire aggiornamenti durante l’intervento e leggere gli esiti delle storie nel rapporto finale. |

## Avvio rapido

### Prova immediata

Apri **[outputs/Centrale112.html](outputs/Centrale112.html)** nel browser. Il gioco funziona con il motore contestuale integrato, senza installare librerie.

### Avvio locale su Windows

1. Installa Node.js, versione 22 o successiva.
2. Mantieni `outputs` e `work` nella stessa cartella del progetto.
3. Fai doppio clic su **`outputs/Avvia-Centrale.cmd`**.
4. Si apre il gioco all’indirizzo **http://127.0.0.1:8122/**.

Per arrestare i servizi usa **`outputs/Ferma-Centrale.cmd`**.

Il repository contiene il gioco completo e i sorgenti. **Il modello IA e gli eseguibili di llama.cpp si installano separatamente**: se non sono presenti, l’avviatore usa automaticamente il motore contestuale. La [guida IA locale](docs/IA-LOCALE.md) spiega i percorsi richiesti.

> I salvataggi appartengono al browser e all’indirizzo usato: l’HTML aperto direttamente e il server locale mantengono partite separate. Scaricare questo repository non include le partite salvate su un altro PC.

## Come iniziare a giocare

Rispondi alla prima chiamata e usa **Il tuo prossimo passo** per orientarti. Puoi scrivere liberamente nella casella oppure scegliere **Approfondisci**. Conferma la posizione, raccogli il primo quadro e apri **Assegna soccorsi**. Le conversazioni possono continuare mentre i mezzi raggiungono il luogo.

**Mappa operativa** amplia la vista del territorio. Il selettore dei quartieri porta a Centro storico, Bellavista, Parco delle Colline, Scalo merci e Porto Nuovo.

## Come funziona l’IA

Qwen interpreta la domanda e seleziona i temi disponibili nello scenario. Nelle chiamate civili, le risposte usano il testo scritto per la storia, conservando dubbi, negazioni e riferimenti alle persone. Il motore contestuale resta disponibile quando il modello non è collegato.

Le storie sono definite: non è una conversazione generativa senza limiti, e l’interpretazione delle domande può sbagliare. Nella modalità prevista dall’avviatore il modello gira sul computer, senza chiavi API esterne.

## Struttura del progetto

```text
outputs/               Gioco pronto, server locale e avviatori Windows
work/                  Sorgenti del gioco, build e test
scripts/               Comandi del repository e verifiche
docs/                  Guide, copertina e impronte dei file originali
.github/               Controlli automatici e modelli per segnalazioni
```

Non sono inclusi modelli pesanti, binari, chiavi, log, registri dei processi o vecchie copie di lavorazione.

## Controlli e sviluppo

Non ci sono dipendenze npm da installare.

```sh
npm test
npm run verify:original
npm run check:build
```

La suite ordinaria è offline. I test con il modello reale si avviano separatamente con `npm run test:ai`, dopo aver attivato il server e il modello. I [dettagli dei controlli](docs/SVILUPPO.md) distinguono prove automatiche e verifica nel browser.

## Crediti e stato del progetto

**Creatore: risso luca.**

Questa preparazione per GitHub aggiunge documentazione, metadati e strumenti di verifica. I 40 file del progetto originale inclusi sono stati copiati senza alterazioni; le impronte SHA-256 sono disponibili in [original-files.sha256.json](docs/original-files.sha256.json).

La destinazione richiesta per la pubblicazione è un **repository privato**. Questa indicazione non imposta da sola la visibilità su GitHub: va scelta durante la creazione. Non è stata aggiunta una licenza open source; i componenti esterni mantengono i propri termini. Vedi [CREDITS.md](CREDITS.md).

Il gioco è ambientato in una città fittizia e non è affiliato al servizio 112. È una simulazione ludica, non un servizio di emergenza o uno strumento di formazione professionale.
