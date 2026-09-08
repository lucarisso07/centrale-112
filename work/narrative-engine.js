/* Fictional narrative layer. Future beats stay private until their prerequisites
   are met; enrichment, ticking and presentation never mutate the supplied case. */
(function (root) {
  'use strict';
  const normal = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const field = (label, question, reply, fact, aliases) => ({label, question, reply, fact, requires: [], aliases: aliases || []});
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const variants = c => ({
    conscious: /\bcosciente\b|\bmi ha risposto\b|\bmi guarda\b/.test(normal((c.topics?.response?.fact || '') + ' ' + (c.topics?.response?.reply || ''))) && !/\bnon (?:mi |le |gli )?(?:ha risposto|rispond)|\bincosciente\b/.test(normal((c.topics?.response?.fact || '') + ' ' + (c.topics?.response?.reply || ''))),
    alone: /una persona|sono sola/.test(normal((c.topics?.people?.fact || '') + ' ' + (c.topics?.people?.reply || ''))),
    trapped: /passeggero/.test(normal((c.topics?.people?.fact || '') + ' ' + (c.topics?.people?.reply || '')))
  });
  const makeTopics = rows => Object.fromEntries(rows.map(([key, ...args]) => [key, field(...args)]));
  const storyCache = new Map();
  function storyFor(c) {
    const v = variants(c);
    const cacheKey = `${c.key}:${v.conscious}:${v.alone}:${v.trapped}`;
    if (storyCache.has(cacheKey)) return storyCache.get(cacheKey);
    const stories = {
      collision: {
        opening: 'Pronto, 112? Sono appena sceso dal tram e mi sono voltato dopo un botto, proprio davanti alla farmacia. Una macchina ha preso il palo ed è finita sul marciapiede. Mi tremano le mani: mi dica da dove cominciare.',
        topics: makeTopics([
          ['background', 'Prima dell’urto', 'Che cosa stava facendo prima di sentire il botto?', 'Stavo tornando verso casa. Ero appena sceso dal tram, con gli altri passeggeri; mi sono girato solo quando ho sentito il rumore.', 'Testimone appena sceso dal tram; si gira al rumore dell’urto.', ['prima del botto', 'perché era lì', 'come è arrivato', 'tornava a casa']],
          ['relationship', 'Rapporto con il conducente', 'Conosce il conducente o qualcuno che viaggiava con lui?', 'Non conosco il conducente. Non ero con lui e non ho visto la macchina prima degli ultimi istanti dell’urto.', 'Testimone estraneo al conducente; percorso precedente dell’auto ignoto.', ['conosce il conducente', 'che rapporto avete', 'è un familiare', 'eravate insieme']],
          ['sightline', 'Limiti della visuale', 'Da dove guarda l’auto e che cosa le copre la visuale?', 'La guardo dal lato della farmacia. Riesco a vedere il posto di guida, ma tra i riflessi e i vetri scuri non distinguo bene l’interno. Non ho guardato dall’altro lato.', 'Visuale dal lato farmacia; interno parzialmente coperto da vetri e riflessi.', ['visuale', 'cosa le impedisce di vedere', 'da quale lato guarda', 'riesce a vedere dentro']],
          ['scene_sounds', 'I rumori dopo il botto', 'Che cosa sente attorno a lei, oltre al traffico?', 'Sento clacson e alcune persone che si chiamano dalla fermata. Con questo rumore faccio fatica a distinguere se arrivi una voce dall’auto.', 'Clacson e voci dalla fermata rendono difficile distinguere suoni dall’auto.', ['rumori intorno', 'cosa sente adesso', 'voci dalla macchina', 'sente qualcuno parlare']],
          ['scene_detail', 'Posizione della carrozzeria', 'Che cosa riesce a descrivere del punto in cui si è fermata l’auto?', 'La parte anteriore è contro il palo, vicino al bordo del marciapiede. Non ho verificato se le portiere si aprano: le descrivo solo quello che vedo.', 'Parte anteriore contro il palo; apertura delle portiere non verificata.', ['portiere', 'carrozzeria', 'parte anteriore', 'si aprono le porte']],
          ['caller_focus', 'Difficoltà del testimone', 'Che cosa le rende più difficile rispondermi in questo momento?', 'Continuo a ripensare al rumore. Riesco a leggerle i riferimenti, ma se mi chiede troppe cose insieme perdo il filo.', 'Il testimone riesce a leggere riferimenti; fatica con domande simultanee.', ['cosa la preoccupa', 'riesce a concentrarsi', 'troppe domande', 'perde il filo']]
        ]),
        leadKeys: ['safety', 'situation', 'sightline'], promptKey: 'sightline',
        beat1: ['Il testimone distingue ciò che ha visto', 'Una persona alla fermata mi sta chiedendo se ho visto da dove arrivava la macchina. Le ho detto che mi sono girato al botto: non voglio confondere quello che ho visto con quello che stanno dicendo gli altri.', 'Il testimone ribadisce di non avere osservato il percorso precedente all’urto.'],
        beat2: ['Il punto viene riconosciuto', v.conscious ? 'Vedo una squadra vicino alla farmacia. Sto indicando quale auto ho segnalato e riferisco che il conducente mi aveva risposto; non so ancora che cosa abbiano verificato loro.' : 'Vedo una squadra vicino alla farmacia. Sto indicando quale auto ho segnalato e riferisco che da qui non avevo ricevuto una risposta dal conducente; non so ancora che cosa abbiano verificato loro.', 'Il testimone riconosce l’arrivo di una squadra e distingue le proprie osservazioni dagli accertamenti dei soccorritori.'],
        epilogue: 'Andrea ripete un’ultima volta da quale lato ha visto l’auto. Poi ringrazia e lascia parlare le squadre. Prima di chiudere rimane per un momento in silenzio, con il rumore della strada ancora nel telefono.'
      },
      fire: {
        opening: 'Sono Sara. Stavamo sparecchiando quando mia madre ha cominciato a tossire e ho sentito odore di bruciato. Adesso vedo fumo da sotto la porta che dà sulle scale. Sono qui con lei e con mio figlio: mi sente bene?',
        topics: makeTopics([
          ['background', 'La sera prima dell’allarme', 'Che cosa stavate facendo quando avete notato il fumo?', 'Stavamo sparecchiando dopo cena. Prima ho sentito l’odore, poi ho notato il fumo sotto la porta; non so che cosa stesse succedendo negli altri appartamenti.', 'Odore notato dopo cena, prima del fumo visibile sotto la porta.', ['prima del fumo', 'prima dell allarme', 'cosa stavate facendo', 'odore prima']],
          ['relationship', 'Le persone in casa', 'Sua madre abita con lei o era venuta a trovarla?', 'Mia madre era venuta a cena da noi. Mio figlio è con me. Continuo a guardare entrambi mentre le parlo.', 'La madre era ospite a cena; figlio presente con la chiamante.', ['madre abita con lei', 'venuta a cena', 'chi vive in casa', 'che rapporto avete']],
          ['sightline', 'Ciò che è visibile dall’appartamento', 'Dalle finestre che cosa riesce a vedere?', 'Dal soggiorno vedo il cortile interno. Le scale invece sono dietro la porta dell’appartamento: da qui non vedo che cosa ci sia sul pianerottolo.', 'Finestra del soggiorno sul cortile interno; pianerottolo non visibile.', ['finestra', 'vista dal soggiorno', 'vede il cortile', 'cosa vede fuori']],
          ['scene_sounds', 'Le voci nel cortile', 'Sente altre persone fuori dal vostro appartamento?', 'Dal cortile arrivano alcune voci, ma non capisco da quali finestre. Non posso dirle chi sia uscito o quante persone siano ancora nel palazzo.', 'Voci dal cortile; persone e numero dei residenti non identificati.', ['voci nel cortile', 'altri residenti', 'altre finestre', 'vicini fuori']],
          ['scene_detail', 'Riconoscere la scala giusta', 'Che cosa distingue la scala B una volta entrati nel cortile?', 'Il nostro portone è sulla destra. Accanto ai citofoni c’è la lettera B; l’altro ingresso del cortile è un’altra scala.', 'Scala B identificabile dalla lettera accanto ai citofoni, sul lato destro del cortile.', ['distinguere scala b', 'lettera sul portone', 'altra scala', 'riconoscere ingresso']],
          ['caller_focus', 'Tenere il contatto', 'Che cosa la aiuta a seguire le mie domande?', 'Mi aiuta se mi dice chiaramente quando sta aspettando una risposta. Quando c’è silenzio al telefono temo che sia caduta la linea.', 'La chiamante teme la perdita della linea durante i silenzi.', ['silenzio al telefono', 'linea caduta', 'cosa la aiuta', 'riesce a seguirmi']]
        ]),
        leadKeys: ['people', 'safety', 'sightline'], promptKey: 'scene_detail',
        beat1: ['Una voce da tenere distinta', 'Dal cortile qualcuno sta gridando qualcosa verso le finestre. Non capisco le parole e non so a chi si rivolga: preferisco riferirle soltanto che sento una voce.', 'Una voce dal cortile non intelligibile; contenuto e destinatario non verificati.'],
        beat2: ['I mezzi nel cortile', 'Dalla finestra vedo mezzi fermi vicino all’ingresso del cortile. Questo riesco a dirglielo; le scale restano fuori dalla mia visuale e non so che cosa stiano vedendo le squadre.', 'Mezzi osservati presso l’ingresso del cortile; situazione delle scale ancora non visibile alla chiamante.'],
        epilogue: 'Sara ripete il cognome sul citofono, Ferri, e la scala B. Prima di lasciare la linea torna a rivolgere la voce a sua madre e a suo figlio. Il contatto prosegue con le persone arrivate nel cortile.'
      },
      park: {
        opening: 'Mi chiamo Elena, sono sul sentiero del Parco del Fiume. Un signore davanti a me si è fermato, si è tenuto il petto e si è seduto per terra. Mi ha chiesto di chiamarvi. Non lo conosco: posso dirle quello che vedo, una cosa alla volta.',
        topics: makeTopics([
          ['background', 'La passeggiata interrotta', 'Da quanto si trovava sullo stesso sentiero del signore?', 'Stavo camminando dietro di lui da poco. Non abbiamo iniziato la passeggiata insieme e non so da quanto fosse al parco.', 'La testimone seguiva lo stesso sentiero da poco; durata della passeggiata dell’uomo ignota.', ['camminavate insieme', 'da quanto lo seguiva', 'prima del malore', 'iniziato passeggiata']],
          ['relationship', 'Un incontro occasionale', 'Aveva già parlato con lui prima che si sentisse male?', 'Non gli avevo mai parlato. Mi ha chiesto aiuto quando si è fermato; non posso ricostruire la sua giornata o la sua salute precedente.', 'Nessun rapporto precedente tra testimone e uomo; primo contatto per la richiesta di aiuto.', ['lo aveva già incontrato', 'prima volta', 'rapporto con il signore', 'gli aveva parlato']],
          ['sightline', 'Riconoscere il sentiero', 'Il punto dove siete si vede direttamente dall’ingresso?', 'Dall’ingresso il chiosco aiuta a orientarsi, ma un tratto del sentiero è coperto dagli alberi. Per questo cerco di darle un riferimento preciso.', 'Un tratto del sentiero è coperto dagli alberi rispetto all’ingresso.', ['vede ingresso', 'alberi coprono', 'visibile dalla strada', 'si vede il sentiero']],
          ['scene_sounds', 'Il secondo testimone', 'Il ragazzo che si è fermato riesce a comunicare con voi?', 'Il ragazzo ci sente e mi risponde. Mi ha detto che conosce questo ingresso; non mi ha detto di conoscere il signore.', 'Il secondo testimone comunica con Elena e conosce l’ingresso; rapporto con l’uomo non riferito.', ['ragazzo parla', 'ragazzo conosce signore', 'secondo testimone', 'cosa dice ragazzo']],
          ['scene_detail', 'Il fondo del percorso', 'Com’è il sentiero nel punto in cui vi trovate?', 'Qui il sentiero è largo e il terreno è compatto. Siamo vicino al chiosco, non sulla passerella; non so dirle quali mezzi possano percorrerlo.', 'Punto vicino al chiosco, su sentiero largo e compatto; percorribilità dei mezzi non valutata.', ['terreno', 'fondo del sentiero', 'sulla passerella', 'sentiero largo']],
          ['caller_focus', 'Osservazioni e interpretazioni', 'Riesce a distinguere quello che vede da quello che teme?', 'Vedo che è pallido e sudato; su cosa significhi non posso dirle nulla. Ho paura di usare una parola sbagliata e farle pensare che io sappia più di quello che so.', 'La testimone distingue pallore e sudorazione osservati da interpretazioni cliniche non note.', ['cosa teme', 'parola sbagliata', 'cosa sa davvero', 'interpretazione']]
        ]),
        leadKeys: ['response', 'breathing', 'access'], promptKey: 'scene_detail',
        beat1: ['Un riferimento condiviso', 'Un ragazzo si è fermato con noi e mi conferma che l’ingresso di cui stiamo parlando è quello a est, verso il chiosco. Almeno sul punto ci stiamo capendo; sulle condizioni del signore continuo a riferirle solo quello che osservo.', 'Un secondo testimone è presente e conferma il riferimento dell’ingresso est verso il chiosco.'],
        beat2: ['Il contatto sul sentiero', 'Il ragazzo vede la squadra arrivata e indica il nostro punto sul sentiero. Io sto riferendo come è cominciato il malessere; non so ancora quale valutazione abbiano fatto.', 'Il secondo testimone indica il punto alla squadra; valutazione sanitaria non comunicata al chiamante.'],
        epilogue: 'Elena racconta alle squadre il momento in cui il signore si è fermato sul sentiero. Il ragazzo rimane il riferimento vicino al chiosco. Quando saluta la centrale, Elena pronuncia il proprio nome una seconda volta, più lentamente.'
      },
      warehouse: {
        opening: 'Sono Marco, dall’ufficio nel capannone di fronte al magazzino dei ricambi. Stavo per chiudere quando ho sentito un colpo e dei vetri; poi ho visto una luce muoversi dentro. Non so se quelle persone debbano essere lì. Parlo piano perché la mia finestra dà sullo stesso cortile.',
        topics: makeTopics([
          ['background', 'L’ufficio ancora aperto', 'Perché era ancora nel capannone a quest’ora?', 'Stavo finendo di sistemare alcuni documenti prima di chiudere l’ufficio. Mi sono affacciato dopo il rumore, non ero lì a osservare il magazzino da prima.', 'Testimone ancora in ufficio; osservazione del magazzino iniziata dopo il rumore.', ['cosa faceva in ufficio', 'prima del vetro', 'perché era ancora lì', 'chiudere ufficio']],
          ['relationship', 'Rapporto con il titolare', 'Conosce personalmente il proprietario del magazzino?', 'Lo conosco di vista perché lavoriamo uno di fronte all’altro. Non ho un contatto diretto che possa darle e non conosco tutte le persone che lavorano con lui.', 'Titolare conosciuto di vista; recapito diretto e identità dei collaboratori non disponibili.', ['conosce proprietario', 'rapporto con titolare', 'numero del proprietario', 'dipendenti conosciuti']],
          ['sightline', 'La luce fra gli scaffali', 'Che cosa le impedisce di seguire le persone all’interno?', 'Ci sono scaffali fra la finestra e parte del magazzino. Vedo la luce spostarsi, poi scompare dietro qualcosa; non riesco a seguirle in ogni punto.', 'Scaffali limitano la visuale del testimone all’interno del magazzino.', ['scaffali', 'visuale interno', 'luce scompare', 'seguirle con lo sguardo']],
          ['scene_sounds', 'Distinguere i rumori', 'Dopo i vetri ha sentito parole comprensibili?', 'Non ho capito parole. Qualche rumore arriva, ma da questa distanza non saprei dire se siano passi, oggetti appoggiati o altro.', 'Nessuna parola comprensibile; natura dei rumori successivi incerta.', ['parole comprensibili', 'voci nel magazzino', 'passi', 'rumori dopo vetri']],
          ['scene_detail', 'Il furgone rispetto al cancello', 'Dove si trova il furgone rispetto all’accesso che vede?', 'È fuori dal cancello nord, vicino al lato del magazzino che riesco a vedere. La targa rimane rivolta dall’altra parte: non posso leggerla da questa finestra.', 'Furgone fuori dal cancello nord; targa non leggibile dalla finestra del testimone.', ['dove è parcheggiato', 'furgone rispetto cancello', 'lato del furgone', 'posizione furgone']],
          ['caller_focus', 'Il motivo della segnalazione', 'Che cosa l’ha convinta a chiamare pur avendo dei dubbi?', 'Il vetro e la luce dopo l’orario in cui di solito chiudono. Potrebbe esserci una spiegazione che non conosco, ma mi sembrava importante riferire quello che avevo visto.', 'Segnalazione motivata da vetri e luce dopo la chiusura abituale; presenza legittima non esclusa.', ['perché ha chiamato', 'motivo della chiamata', 'potrebbe essere normale', 'ha dubbi']]
        ]),
        leadKeys: ['situation', 'safety', 'weapons'], promptKey: 'sightline',
        beat1: ['La visuale resta incompleta', 'La luce dentro è passata dietro gli scaffali. Per un momento non l’ho più vista; questo non mi permette di dire che il magazzino sia vuoto.', 'Luce temporaneamente coperta dagli scaffali; assenza di persone non verificata.'],
        beat2: ['La finestra e la verifica sul posto', 'Vedo la pattuglia presso il cancello nord. Dalla mia finestra non riesco a sentire cosa si dicano: la verifica dentro il magazzino spetta a chi è arrivato.', 'Pattuglia osservata al cancello nord; colloqui e accertamenti interni non udibili al testimone.'],
        arrivalType: 'Polizia',
        epilogue: 'Marco indica ancora la finestra da cui ha osservato il magazzino, poi lascia proseguire la pattuglia. La sua voce rimane bassa fino al saluto. I documenti che stava sistemando sono ancora sulla scrivania.'
      },
      flood: {
        opening: 'Pronto, sono prima del sottopasso di viale Europa. Piove così forte che si sente quasi soltanto l’acqua, e un’auto si è fermata nella discesa allagata. Le altre continuano ad arrivare. Sono sul marciapiede: mi dica che cosa le serve sapere per prima cosa.',
        topics: makeTopics([
          ['background', 'Il percorso interrotto', 'Come si è accorto dell’auto nel sottopasso?', 'Stavo passando dalla parte della stazione. Mi sono fermato prima della discesa quando ho visto l’auto nell’acqua; non l’ho seguita mentre entrava.', 'Testimone si ferma prima della discesa; ingresso dell’auto nel sottopasso non osservato.', ['prima di fermarsi', 'come ha notato auto', 'ha visto entrare', 'da dove arrivava']],
          ['relationship', 'Il contatto con chi guidava', 'Conosceva già il conducente?', 'Non lo conoscevo. Abbiamo cominciato a parlarci qui, fuori dall’auto; quello che so del viaggio me lo sta dicendo lui.', 'Primo contatto con il conducente fuori dal veicolo; informazioni sul viaggio riferite da lui.', ['conosce conducente', 'viaggiavate insieme', 'chi le ha detto', 'rapporto con autista']],
          ['sightline', 'Ciò che l’acqua nasconde', 'Che cosa riesce a distinguere sotto il livello dell’acqua?', 'L’acqua è torbida, non vedo il fondo. Vedo la parte dell’auto che emerge e i riferimenti ai lati, ma non posso misurare la profondità.', 'Acqua torbida; fondo non visibile e profondità non misurabile.', ['acqua torbida', 'fondo sottopasso', 'vedere sotto acqua', 'profondità esatta']],
          ['scene_sounds', 'Parlare sotto la pioggia', 'Il rumore le permette di sentire chi è vicino all’auto?', v.trapped ? 'Sento il conducente che è accanto a me. La pioggia copre i suoni dal sottopasso: non riesco a sentire il passeggero ancora nell’auto.' : 'Il conducente è vicino a me e ci parliamo. La pioggia copre molti rumori che arrivano dalla parte bassa del sottopasso.', v.trapped ? 'Conducente udibile vicino al testimone; passeggero nel veicolo non udibile sotto la pioggia.' : 'Comunicazione possibile con il conducente fuori dall’auto; pioggia limita l’ascolto del sottopasso.', ['rumore pioggia', 'riesce a sentire conducente', 'sentire dal sottopasso', 'voce nell auto']],
          ['scene_detail', 'Il punto prima della discesa', 'Che cosa può indicare come riferimento sul lato asciutto?', 'La piazzola è prima che la strada scenda. Da qui si vede il ponte con i binari sopra; io sono sul lato verso la stazione, non oltre il sottopasso.', 'Riferimenti sul lato sud: piazzola prima della discesa e ponte ferroviario.', ['punto asciutto', 'riferimento piazzola', 'prima della discesa', 'binari sopra']],
          ['caller_focus', 'Il rischio che sta osservando', 'Quale cambiamento teme di non riuscire a segnalare in tempo?', 'Guardo sia l’acqua sia le auto che arrivano. Ho paura che qualcuno segua la macchina davanti senza accorgersi in tempo di quello che c’è sotto il ponte.', 'Preoccupazione del testimone per i veicoli in arrivo e la visibilità tardiva dell’allagamento.', ['cosa lo preoccupa', 'auto dietro', 'cosa teme', 'seguire macchina davanti']]
        ]),
        leadKeys: ['people', 'hazards', 'safety'], promptKey: 'scene_sounds',
        beat1: ['La posizione viene distinta', v.trapped ? 'Il conducente accanto a me continua a indicare l’auto. Voglio essere preciso: lui è fuori, il passeggero è ancora dentro; da qui non riesco a sentirlo.' : 'Il conducente accanto a me mi ripete che viaggiava da solo. Questo me lo sta dicendo lui: non sono io ad avere controllato l’interno dell’auto.', v.trapped ? 'Ribadita distinzione: conducente fuori, passeggero ancora dentro e non udibile.' : 'Assenza di altri occupanti riferita dal conducente, non verificata direttamente dal testimone.'],
        beat2: ['Un punto di accesso condiviso', 'Vedo una squadra sul lato della piazzola, prima della discesa. Sto indicando il punto da cui ho chiamato; non posso dire che l’acqua o il traffico siano già sotto controllo.', 'Squadra osservata presso la piazzola; controllo dell’allagamento e del traffico non verificato dal chiamante.'],
        epilogue: v.trapped ? 'Davide ripete alla squadra quali informazioni riguardano il conducente e quali il passeggero nell’auto. Poi lascia spazio alle loro comunicazioni. Il rumore della pioggia accompagna anche il suo ultimo saluto.' : 'Davide indica la piazzola e presenta alla squadra il conducente con cui ha parlato. Prima di chiudere ripete che l’auto era già ferma quando l’ha notata. La pioggia continua a riempire il microfono.'
      },
      lift: {
        opening: 'Mi chiamo Giulia. Ero venuta a trovare un’amica e l’ascensore si è fermato con uno scatto fra due piani. Ho premuto l’allarme, ma nessuno mi ha risposto. Le porte non si aprono e faccio fatica a restare concentrata qui dentro.',
        topics: makeTopics([
          ['background', 'Il motivo della visita', 'Era venuta a trovare qualcuno in questo edificio?', 'Ero venuta a trovare un’amica. L’indirizzo era nel messaggio che mi aveva mandato; non conosco bene il palazzo.', 'Chiamante in visita a un’amica; indirizzo ricevuto per messaggio e edificio poco conosciuto.', ['perché nel palazzo', 'motivo visita', 'messaggio amica', 'conosce edificio']],
          ['relationship', 'Chi conosce la chiamante', 'Conosce le altre persone che possono sapere dove si trova?', v.alone ? 'La mia amica sa che sarei arrivata, ma non è ancora a casa. Sono sola nella cabina e non ho un contatto confermato fuori dalla porta.' : 'Il signore in cabina non lo conoscevo. La mia amica invece è nel palazzo: riesco a sentirla dal pianerottolo.', v.alone ? 'Amica informata della visita ma non ancora a casa; chiamante sola, contatto esterno non confermato.' : 'Uomo in cabina estraneo alla chiamante; amica presente sul pianerottolo.', ['conosce signore', 'chi sa che è lì', 'conosce qualcuno fuori', 'amica sa arrivo']],
          ['sightline', 'L’interno della cabina', 'Riesce a vedere il pianerottolo attraverso le porte?', 'Vedo soltanto l’interno della cabina. Non riesco a vedere il pianerottolo o il meccanismo dall’altra parte delle porte.', 'Pianerottolo e meccanismo non visibili dall’interno della cabina.', ['vede pianerottolo', 'attraverso porte', 'meccanismo', 'visuale cabina']],
          ['scene_sounds', 'Le voci oltre le porte', 'Riesce a distinguere una voce che risponde dall’esterno?', v.alone ? 'Non ho avuto una risposta da una persona all’esterno. Se sento un rumore non posso sapere chi sia o se abbia capito che sono qui.' : 'Riconosco la voce della mia amica dall’altra parte. La sento vicina, ma non vedo che cosa possa fare dal pianerottolo.', v.alone ? 'Nessuna risposta umana confermata dall’esterno.' : 'Voce dell’amica riconosciuta dal pianerottolo; attività esterna non visibile.', ['voce fuori', 'chi risponde esterno', 'rumore oltre porta', 'sente amica']],
          ['scene_detail', 'La targhetta interna', 'Riesce a leggere un riferimento dell’ascensore?', 'C’è una targhetta nella cabina, ma il riferimento dell’assistenza non è leggibile per intero. Non voglio darle un numero incompleto come se fosse sicuro.', 'Riferimento dell’assistenza sulla targhetta interna non interamente leggibile.', ['targhetta', 'numero assistenza', 'riferimento ascensore', 'codice cabina']],
          ['caller_focus', 'La percezione dell’attesa', 'Che cosa la mette più in difficoltà durante l’attesa?', 'Non vedere cosa c’è fuori. Ogni rumore mi fa pensare che la cabina si muova, anche quando non posso esserne sicura; la sua voce mi aiuta a distinguere le cose.', 'Agitazione legata allo spazio chiuso; rumori non equivalgono a movimento verificato della cabina.', ['cosa le fa paura', 'attesa', 'spazio chiuso', 'rumore movimento']]
        ]),
        leadKeys: ['people', 'alarm', 'symptoms'], promptKey: 'scene_detail',
        beat1: ['Rumore e movimento restano distinti', v.alone ? 'Ho sentito un rumore oltre le porte, ma nessuno mi ha risposto. Non posso dire che qualcuno sia arrivato per me; sono ancora sola in cabina.' : 'Il signore mi dice che anche lui non vede fuori. Stiamo cercando di descrivere la stessa cosa: sentiamo dei rumori, ma non sappiamo da cosa vengano.', v.alone ? 'Rumore all’esterno senza risposta; nessun nuovo contatto confermato, chiamante ancora sola.' : 'Entrambi gli occupanti riferiscono visuale limitata alla cabina; origine dei rumori non nota.'],
        beat2: ['L’attesa oltre le porte', v.alone ? 'Sento rumori oltre le porte, ma non riesco ad attribuirli a qualcuno. Continuo a vedere solo la cabina; mi aiuta sapere che la centrale ha ancora il mio punto preciso.' : 'La mia amica mi dice che la squadra è arrivata al piano. Io continuo a vedere solo la cabina; la sua voce e quella della centrale sono i miei riferimenti.', v.alone ? 'Rumori non attribuibili all’esterno; visuale ancora limitata alla cabina.' : 'L’amica riferisce l’arrivo della squadra al piano; chiamante ancora senza visuale esterna.'],
        epilogue: 'Nel passaggio alla squadra Giulia ripete il proprio nome e il punto in cui la cabina si è fermata. Prima di salutare vuole assicurarsi che abbiano capito di quale ascensore si tratta. Il suo ultimo pensiero per la centrale è un breve ringraziamento.'
      },
      conflict: {
        opening: 'Parlo piano, sono Paola, la vicina dell’appartamento accanto. Una donna ha gridato “lasciami”, poi ho sentito un colpo attraverso il muro. Altre sere c’erano stati litigi, ma questa volta ho sentito chiedere aiuto. Io non vedo dentro: mi dica quello che posso riferirle.',
        topics: makeTopics([
          ['background', 'L’istante prima del colpo', 'Che cosa stava facendo quando ha sentito le voci?', 'Ero nella mia cucina. Le voci mi hanno fatto fermare, poi ho sentito il colpo; non stavo seguendo la discussione dall’inizio.', 'Testimone nella propria cucina; discussione non seguita dall’inizio.', ['prima del colpo', 'dove era in casa', 'cosa faceva', 'inizio discussione']],
          ['relationship', 'La conoscenza dei vicini', 'Conosce abbastanza i vicini da identificarli personalmente?', 'Li incrocio sul pianerottolo, ma non conosco bene la loro situazione. Non posso dirle chi sia presente adesso soltanto in base alle abitudini.', 'Vicini conosciuti superficialmente; presenza attuale non deducibile dalle abitudini.', ['conosce vicini', 'rapporto con loro', 'abitudini vicini', 'chi abita lì']],
          ['sightline', 'La parete da cui arrivano i rumori', 'Da quale parte del suo appartamento arrivano le voci?', 'Le sento dalla parete che confina con la mia cucina. Il loro ingresso è sullo stesso pianerottolo, ma io sono rimasta dentro casa mia.', 'Voci dalla parete confinante con la cucina della testimone; chiamante nel proprio appartamento.', ['parete', 'da quale stanza sente', 'confina cucina', 'da dove arrivano voci']],
          ['scene_sounds', 'Un rumore difficile da attribuire', 'Ha sentito altri suoni che riesce a descrivere senza interpretarli?', 'C’è stato un rumore raschiato dopo le voci. Non saprei dire se fosse un mobile o qualcos’altro: non vedo gli oggetti dentro.', 'Rumore raschiato riferito; oggetto o causa non identificati.', ['rumore raschiato', 'oggetti trascinati', 'mobile', 'altri suoni']],
          ['scene_detail', 'Distinguere i due interni', 'Come distingue il suo appartamento da quello segnalato?', 'Il mio è l’interno 4, il loro è il 5. Non sto chiamando da dentro l’appartamento segnalato: siamo due porte diverse sullo stesso piano.', 'Chiamante all’interno 4; segnalazione riferita all’interno 5 sullo stesso piano.', ['interno quattro cinque', 'quale porta è sua', 'due porte', 'appartamento segnalato']],
          ['caller_focus', 'Parlare senza essere sentita', 'C’è qualcosa che può impedirle di continuare a parlare?', 'Tengo la voce bassa perché temo che mi sentano. Se resto un momento in silenzio non significa che io sappia che cosa sta succedendo dall’altra parte.', 'Chiamante parla sottovoce; un suo silenzio non chiarisce la situazione nell’altro appartamento.', ['voce bassa', 'non può parlare', 'silenzio chiamante', 'paura essere sentita']]
        ]),
        leadKeys: ['safety', 'situation', 'injuries'], promptKey: 'scene_detail',
        beat1: ['La fonte della segnalazione', 'Voglio chiarire una cosa: le parole che le ho riferito le ho sentite, il resto lo posso soltanto temere. Non ho aperto la porta per controllare e non so chi sia vicino all’ingresso.', 'La testimone distingue parole udite da timori; nessuna verifica visiva dal pianerottolo.'],
        beat2: ['Il passaggio alla pattuglia', 'Sento una voce sul pianerottolo che si presenta come la pattuglia. Resto nel mio appartamento; quello che troveranno oltre l’altra porta non posso anticiparlo.', 'Contatto vocale della pattuglia sul pianerottolo; interno segnalato ancora non visibile alla testimone.'],
        arrivalType: 'Polizia',
        epilogue: 'Paola distingue ancora la propria porta, l’interno 4, da quella dell’interno 5. Poi lascia la comunicazione alla pattuglia. Rimane nel suo appartamento e saluta con la stessa voce bassa con cui aveva chiamato.'
      },
      lost: {
        opening: 'Mi chiamo Roberto. Volevo fare una passeggiata e adesso sono vicino a una panchina rossa, ma non riconosco più la strada per uscire. Mia figlia mi aspetta e mi vergogno un po’ a chiamare. Posso leggere i cartelli se mi lascia un momento.',
        topics: makeTopics([
          ['background', 'La passeggiata prima di perdersi', 'Che cosa ricorda della passeggiata prima di attraversare il ponticello?', 'Volevo camminare un po’ vicino al fiume. Ricordo il chiosco chiuso, ma non saprei ricostruire ogni svolta che ho fatto.', 'Passeggiata vicino al fiume; chiosco chiuso ricordato, svolte precedenti non ricostruibili.', ['prima del ponticello', 'perché passeggiata', 'ricorda svolte', 'percorso precedente']],
          ['relationship', 'La persona che lo aspetta', 'Sua figlia sa che era uscito per una passeggiata?', 'Anna sa che ero uscito. Non le ho saputo dire questo punto preciso: sto cercando di capirlo con lei al telefono.', 'La figlia Anna è informata della passeggiata; punto preciso non ancora comunicato a lei.', ['figlia sa passeggiata', 'anna sa dove', 'avvisato familiare', 'chi lo aspetta']],
          ['sightline', 'Riferimenti nella penombra', 'Che cosa riesce ancora a leggere e che cosa non distingue?', 'La panchina rossa è qui vicino e il cartello riesco a leggerlo. Oltre la passerella vedo il cancello verde, ma non distinguo altre scritte da questa distanza.', 'Cartello vicino leggibile; altre scritte oltre la passerella non distinguibili.', ['penombra', 'leggibile', 'cosa distingue da lontano', 'altre scritte']],
          ['scene_sounds', 'Suoni senza un riferimento preciso', 'Sente persone o traffico da un punto che riesce a indicare?', 'Sento l’acqua e qualche voce lontana. Non vedo chi parli e non saprei darle una direzione affidabile solo dal rumore.', 'Acqua e voci lontane udibili; origine e direzione delle voci non verificate.', ['voci lontane', 'sente traffico', 'direzione rumori', 'sente acqua']],
          ['scene_detail', 'Come riconoscere Roberto', 'Mi descrive un indumento che aiuti a riconoscerla?', 'Indosso una giacca blu. Posso guardarla mentre le parlo; sono io vicino alla panchina rossa, non un’altra persona che ho visto passare.', 'Chiamante con giacca blu, vicino alla panchina rossa.', ['come è vestito', 'indumento', 'giacca', 'riconoscerla']],
          ['caller_focus', 'La paura di sbagliare strada', 'Che cosa la preoccupa nel descrivermi il percorso?', 'Ho paura di confondere il ponte che ricordo con quello che vedo adesso. Per questo preferisco leggerle il cartello anziché scegliere una direzione a memoria.', 'Il chiamante distingue riferimenti letti sul posto da un percorso ricordato con incertezza.', ['paura sbagliare', 'ricordo confuso', 'ponte ricordato', 'direzione a memoria']]
        ]),
        leadKeys: ['landmark', 'safety', 'confirm'], promptKey: 'scene_detail',
        beat1: ['Il cartello diventa il riferimento', 'Ho riletto il cartello vicino alla panchina: il numero è 3. È questo che riesco a confermarle adesso; il percorso di prima continuo a non ricordarlo bene.', 'Numero 3 riletto sul cartello vicino alla panchina; percorso precedente ancora incerto.'],
        beat2: ['Una presenza riconoscibile', 'Vedo la pattuglia nella zona della passerella. Sto indicando la panchina rossa e mi faccio riconoscere dalla giacca blu; non ho cambiato punto mentre parlavamo.', 'Il chiamante riconosce la pattuglia presso la passerella e segnala la propria posizione presso la panchina.',
        ],
        arrivalType: 'Polizia',
        epilogue: 'Roberto indica alla pattuglia il cartello numero 3 e la panchina rossa. Al momento di salutare torna a nominare Anna, sua figlia. La conversazione si chiude con qualcuno sul posto a cui può rivolgere le stesse parole.'
      }
    };
    const story = stories[c.key];
    if (story) storyCache.set(cacheKey, story);
    return story;
  }

  function enrich(c) {
    if (!c || (c.source && c.source !== 'civilian')) return c;
    if (c.story?.version === 1 && c.openingSummary) return c;
    const story = storyFor(c);
    if (!story) return c;
    const summaries = {
      collision: 'Auto contro un palo davanti alla farmacia; il testimone si è voltato dopo il botto.',
      fire: 'Fumo da sotto la porta delle scale; Sara è in casa con la madre che tossisce e il figlio.',
      park: 'Un uomo si è fermato sul sentiero tenendosi il petto e ha chiesto alla testimone di chiamare.',
      warehouse: 'Vetri e una luce nel magazzino dei ricambi; il testimone non sa se la presenza sia autorizzata.',
      flood: 'Auto ferma nella discesa allagata di viale Europa; altri veicoli continuano ad arrivare.',
      lift: 'Ascensore fermo fra due piani; porte chiuse e allarme senza risposta.',
      conflict: 'Una vicina ha sentito “lasciami”, un colpo e una richiesta d’aiuto nell’appartamento accanto.',
      lost: 'Roberto non riconosce la strada per uscire; è vicino a una panchina rossa e riesce a leggere i cartelli.'
    };
    if (c.story?.version === 1) return {...c, openingSummary: summaries[c.key]};
    const additions = Object.fromEntries(Object.entries(story.topics).map(([key, t]) => [key, {...t, aliases: [...t.aliases], requires: [...t.requires]}]));
    return {...c, opening: story.opening, openingSummary: summaries[c.key], topics: {...c.topics, ...additions}, story: {version: 1, seen: [...(c.story?.seen || [])]}};
  }
  const isSeen = (c, chapter) => (c.story?.seen || []).includes(`${c.key}:story:${chapter}`);
  function contactTime(c) {return Number.isFinite(c.answeredAt) && c.answeredAt >= 0 ? c.answeredAt : null;}
  function questionCount(c) {
    return (c.history || []).filter(turn => ['operatore', 'operator', 'user'].includes(turn.role) && !/^(?:ok|bene|ricevuto|grazie)[.! ]*$/i.test(turn.text || '')).length;
  }
  function arrived(c, state, story) {
    const accepted = story.arrivalType ? [story.arrivalType] : c.need || [];
    if (Array.isArray(state.units)) return state.units.some(unit => unit.target === c.id && /^(?:sul posto|onscene)$/i.test(unit.phase || '') && (!accepted.length || accepted.includes(unit.type)));
    return !own(state, 'units') && (c.arrived || []).some(type => accepted.includes(type));
  }
  function eventFor(c, chapter, story, state) {
    const [label, text, note] = chapter === 1 ? story.beat1 : chapter === 2 ? story.beat2 : ['Passaggio concluso', story.epilogue, 'Il passaggio narrativo alle squadre è concluso; nessun ulteriore esito operativo o sanitario comunicato.'];
    const id = `${c.key}:story:${chapter}`, key = `story_${chapter}`;
    return {id, caseId: c.id, kind: 'story', chapter, label, text, facts: chapter === 3 ? [] : [{key, text: note}],
      topicPatches: chapter === 3 ? {} : {[key]: field(label, chapter === 1 ? 'Che cosa ha precisato mentre eravamo in contatto?' : 'Che cosa vede o sente dopo l’arrivo della squadra?', text, note, chapter === 1 ? ['precisazione', 'cosa ha chiarito'] : ['dopo arrivo', 'vede squadra', 'contatto con squadra'])},
      epilogue: chapter === 3, time: Number.isFinite(state.time) ? state.time : 0,
      speaker: chapter === 3 ? 'sistema' : 'chiamante'};
  }
  function tick(state, dt) {
    if (!state || state.paused || !Number.isFinite(state.time)) return [];
    const events = [];
    for (const c of state.cases || []) {
      if (c.story?.version !== 1) continue;
      if (state.pending?.has?.('c' + c.id)) continue;
      const story = storyFor(c), at = contactTime(c);
      if (!story || at === null) continue;
      if (c.done) {if (!isSeen(c, 3)) events.push(eventFor(c, 3, story, state)); continue;}
      // Civilian discoveries are heard during an actual conversation. A line in
      // waiting/hold never tells its future developments to the central operator.
      if (c.state !== 'connected') continue;
      const elapsed = state.time - at, questions = questionCount(c), known = Object.keys(c.facts || {}).length;
      const last = [...(c.history || [])].reverse().find(turn => ['chiamante', 'caller', 'assistant'].includes(turn.role));
      if (last && Number.isFinite(last.time) && state.time - last.time < 8) continue;
      if (!isSeen(c, 1) && elapsed >= 25 && questions >= 3 && story.leadKeys.some(key => own(c.facts, key))) {
        events.push(eventFor(c, 1, story, state)); continue;
      }
      if (isSeen(c, 1) && !isSeen(c, 2) && elapsed >= 50 && arrived(c, state, story) && known >= 4) events.push(eventFor(c, 2, story, state));
    }
    return events;
  }
  function view(c, state) {
    const at = contactTime(c), story = storyFor(c);
    if (!story || c.story?.version !== 1 || at === null) return {chapter: 0, label: 'In attesa di contatto'};
    const chapter = isSeen(c, 3) ? 3 : isSeen(c, 2) ? 2 : isSeen(c, 1) ? 1 : 0;
    const label = chapter === 3 ? 'Passaggio concluso' : chapter === 2 ? story.beat2[0] : chapter === 1 ? story.beat1[0] : 'Primo contatto';
    const next = !c.done && !own(c.facts, story.promptKey) ? c.topics?.[story.promptKey] : null;
    return {chapter, label, ...(next ? {nextPrompt: next.question} : {})};
  }
  root.NarrativeEngine = Object.freeze({enrich, tick, view, version: '1.0.0'});
})(typeof window === 'undefined' ? globalThis : window);
