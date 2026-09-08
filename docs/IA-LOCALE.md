# Configurazione dell’IA locale

L’IA è opzionale. Senza modello o eseguibile, l’avviatore apre comunque il gioco con il motore contestuale.

## Sul PC originale

L’installazione esistente del gioco contiene già `work/ai-runtime`. Continua a usare il suo avviatore per mantenere la configurazione attuale. Per usare l’IA anche in questa copia, servono il modello e la cartella dei binari nei percorsi sotto; la chiave viene creata automaticamente al primo avvio.

## Su un altro PC Windows

1. Installa Node.js 22 o successivo e verifica `node --version`.
2. Scarica una distribuzione Windows compatibile di [llama.cpp dalle release ufficiali](https://github.com/ggml-org/llama.cpp/releases). L’avviatore attuale richiede `llama-server.exe`: conserva insieme all’eseguibile le DLL della stessa distribuzione.
3. Inserisci eseguibile e DLL in `work/ai-runtime/bin/`.
4. Scarica il modello GGUF dalla [pagina Qwen3-4B-Instruct-2507 di LM Studio](https://huggingface.co/lmstudio-community/Qwen3-4B-Instruct-2507-GGUF). L’installazione originale usa una quantizzazione da circa 2,5 GB. Rinomina il file scelto in `conversazioni.gguf`.
5. Inserisci il modello in `work/ai-runtime/` e avvia `outputs/Avvia-Centrale.cmd`.

```text
work/ai-runtime/
├── conversazioni.gguf
└── bin/
    ├── llama-server.exe
    └── DLL della stessa distribuzione
```

L’avviatore abilita l’accelerazione GPU quando supportata. La compatibilità dipende dalla distribuzione di llama.cpp, dai driver e dall’hardware; non è stata verificata ogni configurazione. Non occorre modificare il gioco per usarlo senza modello.

## Porte e dati locali

| Servizio | Indirizzo |
| --- | --- |
| Gioco | http://127.0.0.1:8122/ |
| Modello | http://127.0.0.1:8124/ |

L’avviatore genera `access.key` e i registri dei processi nella cartella del runtime. Questi file, i log e i binari sono esclusi da Git.

Evita di avviare contemporaneamente la copia originale e quella scaricata: usano le stesse porte. Prima arresta quella in esecuzione con il relativo `Ferma-Centrale.cmd`.

## Problemi frequenti

| Sintomo | Verifica |
| --- | --- |
| “node” non riconosciuto | Installa Node.js e riapri il terminale. |
| Motore contestuale attivo | Controlla modello, nome dell’eseguibile e DLL. Attendi il caricamento del modello. |
| Viene aperta un’altra copia | Arresta l’istanza già attiva sulle porte 8122 e 8124. |
| Nessun salvataggio dopo aver cambiato modalità | Usa lo stesso browser e lo stesso indirizzo della partita precedente. |
| Il modello non parte | Consulta localmente `work/ai-runtime/model.stderr.log`; non caricare l’intera cartella runtime nelle segnalazioni. |

Le release dei componenti esterni possono cambiare. I riferimenti ufficiali sopra sono il punto di partenza; questa guida descrive i percorsi richiesti dall’avviatore incluso.
