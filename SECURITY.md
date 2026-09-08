# Security policy

## Ambito

Centrale 112 è un gioco locale. Il server incluso è progettato per ascoltare soltanto su `127.0.0.1` e verifica host/origin consentiti.

## Segnalazione di vulnerabilità

Per segnalare un problema di sicurezza, apri una issue nel repository descrivendo il problema senza pubblicare credenziali, chiavi o dati personali. Se il problema richiede una comunicazione privata, contatta il maintainer tramite il profilo GitHub ufficiale `@lucarisso07` e concorda un canale privato prima di inviare dettagli sensibili.

## Dati da non pubblicare

Non includere mai nei commit:

- `access.key`;
- file `.gguf`;
- binari del runtime locale;
- log contenenti informazioni personali;
- token, password o chiavi API;
- salvataggi personali se contengono contenuti che non vuoi rendere pubblici.

Il `.gitignore` del progetto esclude i principali file runtime locali.
