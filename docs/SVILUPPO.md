# Sviluppo e verifiche

## Requisiti

Node.js 22 o successivo. Non ci sono dipendenze npm; `npm install` non è necessario.

## Comandi

| Comando | Effetto |
| --- | --- |
| `npm test` | Esegue 13 suite offline, fermandosi se una fallisce. Non avvia il server o il modello. |
| `npm run check:build` | Ricostruisce l’HTML solo in una cartella temporanea e confronta il risultato con quello incluso. |
| `npm run verify:original` | Confronta i 40 file copiati con il manifest SHA-256 della preparazione. |
| `npm run build` | Rigenera `outputs/Centrale112.html` dai sorgenti della copia corrente. |
| `npm start` | Avvia il server locale in primo piano; Ctrl+C lo arresta. Non avvia llama.cpp. |
| `npm run test:ai` | Esegue le prove semantiche con i servizi locali già avviati. |

`check:build` non modifica l’HTML del repository. `verify:original` serve a verificare questa consegna: dopo future modifiche deliberate al gioco, il confronto con la copia iniziale segnalerà correttamente differenze.

## Suite incluse

Conversazioni, narrazione, fedeltà delle risposte, guida alle chiamate, grafo stradale, comunicazioni attive, radio, integrazione radio, dossier, gestione operativa, integrazione narrativa, turni completi e avviatore.

Le prove offline simulano browser, salvataggi e rete quando necessario. Non dimostrano da sole la qualità grafica o ogni possibile risposta del modello. Le prove con IA restano separate da GitHub Actions.

## Organizzazione del gioco

- `work/dialogue-data.js`, `case-factory.js`: scenari e varianti.
- `work/narrative-engine.js`: approfondimenti, sviluppi ed epiloghi.
- `work/conversation-ai.js`, `semantic-calls.cjs`: interpretazione e composizione delle risposte.
- `work/call-flow.js`, `story-desk.js`: guida contestuale e postazione.
- `work/radio-engine.js`, `active-comms.js`: radio e comunicazioni spontanee.
- `work/dossier-v5.js`, `operations-v5.js`: fascicoli e coordinamento.
- `work/city-map.js`: mappa e rete stradale.
- `work/game-v4.js`: integrazione e stato del gioco.
- `work/build-v4.cjs`: assemblaggio del file HTML completo.

I suffissi v4/v5 nei nomi sono quelli originali: il pacchetto contiene la versione di gioco v6.

## GitHub Actions

Il workflow usa Windows e Node.js 22, con accesso in lettura al repository. Esegue le suite e il controllo del build; non richiede credenziali dell’IA. Il suo esito remoto sarà disponibile soltanto dopo il caricamento su GitHub.
