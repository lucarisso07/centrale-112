# Pubblicare su GitHub come repository privato

## Identità del progetto

- **Nome suggerito:** `centrale-112`
- **Visibilità richiesta:** **Private**
- **Descrizione:** Videogioco narrativo di gestione delle chiamate 112, con dossier progressivo, radio e città interattiva. Creatore: risso luca.
- **Argomenti suggeriti:** `simulation`, `game`, `javascript`, `html5`, `italian`, `local-ai`

Non è necessario attivare GitHub Pages: questa preparazione non pubblica un sito.

## Caricamento dal browser

1. Accedi al tuo account e apri [New repository](https://github.com/new).
2. Imposta il nome, la descrizione e **Private**.
3. Crea un repository vuoto: i file README e .gitignore sono già nel pacchetto.
4. Estrai lo ZIP sul PC. Carica **il contenuto** della cartella `centrale-112`, mantenendo le sottocartelle: non caricare soltanto lo ZIP.
5. Includi anche `.github`, `.gitignore` e `.gitattributes`. Non caricare la cartella interna `.git`.
6. Controlla che il repository mostri **Private** e che il README presenti **risso luca** come creatore.

GitHub spiega la creazione nella [guida ufficiale](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

## Alternativa con Git

La cartella preparata sul PC è inizializzata come repository locale sul ramo `main`; lo ZIP contiene solo i file da versionare.

Dopo aver creato un repository **privato e vuoto** sul tuo account:

```sh
git add .
git commit -m "Prepara Centrale 112 per GitHub"
git remote add origin URL_DEL_TUO_REPOSITORY_PRIVATO
git push -u origin main
```

Sostituisci il segnaposto con l’URL copiato dal repository. Se parti dallo ZIP, esegui prima `git init -b main`. Per il commit Git richiede il tuo nome e la tua email configurati; questa preparazione non inventa un indirizzo email o un account per il creatore.

## Contenuto escluso

Il pacchetto non include il modello da circa 2,5 GB, i binari, le chiavi, i log, i registri dei processi o i salvataggi del browser. I percorsi necessari all’IA si ricreano seguendo [IA-LOCALE.md](IA-LOCALE.md).

Il workflow verifica test offline e riproducibilità del build. Non pubblica il gioco, non scarica modelli e non esegue distribuzioni.
