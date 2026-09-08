# Contribuire a Centrale 112

Creatore del progetto: **risso luca**.

Per segnalare un problema usa il modulo Bug e descrivi i passaggi, la modalità di avvio, la domanda inviata e la risposta osservata. Per una proposta spiega cosa cambierebbe per il giocatore.

Per una modifica al codice:

1. Crea un ramo dedicato.
2. Intervieni sui sorgenti in `work`.
3. Esegui i test pertinenti e `npm test`.
4. Rigenera l’HTML con `npm run build` e verifica `npm run check:build`.
5. Descrivi comportamento risultante e verifiche nella pull request.

Conserva i crediti del creatore. Non inserire file di `work/ai-runtime`, salvataggi personali o log completi. La documentazione tecnica è in [docs/SVILUPPO.md](docs/SVILUPPO.md).
