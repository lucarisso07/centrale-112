# Centrale 112 · Valdora · v6

Avvia **Avvia-Centrale.cmd** con un doppio clic. A caricamento completato si apre il gioco su http://127.0.0.1:8122/. Per chiudere i servizi locali e liberare la memoria del modello usa **Ferma-Centrale.cmd**.

**Per usare l’IA completa, apri il gioco dall’avviatore.** Il file `Centrale112.html` aperto direttamente funziona con il motore contestuale: un avviso permette di raggiungere la versione con IA quando il servizio è avviato. Il file HTML e l’indirizzo locale conservano i salvataggi separatamente nel browser.

Mantieni le cartelle `outputs` e `work` nella posizione attuale: il modello locale è in `work/ai-runtime`. Non occorre scaricarlo di nuovo e non servono abbonamenti o chiavi API esterne. Il modello occupa circa 2,5 GB su disco. Per avviare il gioco viene usato Node.js già presente sul computer.

## Giocare

- La **Postazione chiamate** mette al centro il racconto. **Il tuo prossimo passo** guida la gestione in cinque fasi: ascoltare, localizzare, chiarire, coordinare e seguire. Il riepilogo **Finora sappiamo** tiene insieme le informazioni già raccolte.
- Apri una chiamata e premi **Rispondi**. Scrivi le domande nella casella in basso, oppure scegli uno spunto. Premi Invio per trasmettere, Maiusc+Invio per andare a capo.
- Con **Approfondisci** esplori il contesto: perché la persona si trovava lì, i rapporti con gli altri, ciò che vede e sente, particolari riconoscibili e preoccupazioni. Le otto storie hanno conversazioni dedicate, sviluppi che emergono dopo le domande e con l’arrivo delle squadre, ed epiloghi nel rapporto finale. Il ritmo delle nuove chiamate lascia più tempo a ogni storia.
- Chiarisci la posizione. Il **dossier operativo** si aggiorna durante la conversazione: distingue posizione approssimativa e confermata, persone, pericoli, accessi e informazioni ancora da verificare. Ogni nuovo fatto conserva fonte e orario.
- Aggiungi **note dell’operatore**, separate dalle informazioni del chiamante. Le note e le bozze del dossier vengono salvate. **Esporta** scarica il fascicolo con fatti, note e cronologia in formato Markdown.
- Apri **Risorse** per confrontare stato e tempi stimati delle squadre e assegnarle al luogo confermato. Il dossier mostra le unità impegnate e permette di aprirne il canale radio.
- Usa **Trasmetti il briefing alle unità** per condividere i fatti raccolti con gli equipaggi assegnati. **Richiedi aggiornamento** ottiene un riscontro dalle squadre o dal chiamante, secondo i contatti disponibili.
- Seleziona una pattuglia sulla mappa o nella flotta per aprire la radio. Esempi: «Qual è la vostra posizione?», «Vai al caso 2», «Richiedi rinforzi», «Fermati», «Rientra alla base».
- Con **COM. ATTIVA**, chiamanti e squadre possono intervenire spontaneamente: dettagli aggiuntivi, richieste di accesso e riscontri sul posto. Le pattuglie possono aprire segnalazioni dal territorio. La viabilità e gli imprevisti modificano tempi e percorsi; il registro mostra gli aggiornamenti.
- Il turno viene salvato automaticamente nello stesso browser. Alla riapertura puoi riprenderlo oppure iniziarne uno nuovo.
- Passa a **Mappa operativa** per dare più spazio alla città. **Esplora la città** porta direttamente a Centro storico, Bellavista, Parco delle Colline, Scalo merci e Porto Nuovo. Trascina la mappa e usa la rotella o i pulsanti +/− per lo zoom; **⌖** mostra l’intero territorio.
- **Voce ON** legge le risposte con le voci italiane disponibili nel browser. Le domande si scrivono: il microfono non viene usato.

## Ambito della simulazione

Otto scenari civili con alcune varianti, cinque estratti per turno, più segnalazioni delle pattuglie. Otto mezzi, radio, rinforzi e una rete stradale di 204 incroci con cinque ponti. La città passa da 1800 × 1200 a **3600 × 2400**: larghezza e altezza raddoppiate, superficie quadrupla. Pattuglie e soccorsi operano anche nei nuovi quartieri e seguono la rete stradale. I tempi e le procedure sono adattati al gioco.

Il modello locale interpreta anche sinonimi, richieste indirette e più domande nello stesso messaggio. Nelle chiamate civili seleziona i temi della domanda; il motore contestuale compone le risposte scritte per lo scenario, conservando dubbi, negazioni e riferimenti alle persone. La radio può variare la formulazione dei riscontri verificati. I dettagli non previsti dallo scenario rimangono ignoti. Se il modello non risponde, subentra il motore contestuale. L’interpretazione può contenere errori; il gioco non riproduce procedure reali al 100% e non è uno strumento di formazione né un servizio di emergenza.

I turni della versione precedente restano compatibili quando si usa lo stesso indirizzo e browser. **Inizia un nuovo turno per provare tutte le nuove aperture e il nuovo ritmo delle chiamate.** Riprendendo una partita, la cronologia già vissuta viene conservata. I fatti dei vecchi salvataggi privi di fonte o orario vengono mostrati senza attribuzioni inventate.

## Componenti

Il motore di inferenza è [llama.cpp](https://github.com/ggml-org/llama.cpp). Il modello utilizzato è [Qwen3-4B-Instruct-2507, quantizzazione GGUF di LM Studio](https://huggingface.co/lmstudio-community/Qwen3-4B-Instruct-2507-GGUF). I servizi ascoltano soltanto sull’interfaccia locale del computer.
