/* Centrale 112 — local, contextual dialogue. Answers remain grounded in the case.
   No network, mutation, medical directions or unbounded generative-AI claims. */
(function (root) {
  'use strict';
  const norm = value => String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'")
    .replace(/\bxke\b|\bperche'\b/g, 'perche').replace(/\bnn\b/g, 'non')
    .replace(/\bqnt\b/g, 'quanto').replace(/\bcmq\b/g, 'comunque')
    .replace(/\bdv\b/g, 'dove').replace(/\bce\b/g, "c'e").replace(/\s+/g, ' ').trim();
  const has = (text, pattern) => pattern.test(text);
  const unique = array => [...new Set(array)];
  const noFact = (reply, intent, extra = {}) => ({reply, facts: [], intent, ...extra});
  const factAnswer = (reply, key, text, intent = key) => ({reply, facts: text ? [{key, text}] : [], intent, stressDelta: -1});
  const seen = (c, key) => Boolean(c.facts && c.facts[key]);
  const topic = (c, key) => c.topics && c.topics[key];
  const profile = {
    collision: {subject: 'il conducente', other: 'le altre persone nell’auto', unknown: 'Sono un testimone: vedo l’auto dalla farmacia, non conosco il conducente.', focus: 'Le descrivo il conducente oppure il punto dell’incidente?', time: 'Ho chiamato dopo il botto. Non ho guardato l’ora esatta.', identity: 'Sono Andrea, ho visto l’incidente scendendo dal tram.', mood: 'Mi scusi, sono ancora scosso dal botto.'},
    fire: {subject: 'mia madre', other: 'mio figlio', unknown: 'Sono dentro casa con mia madre e mio figlio. Oltre la porta non vedo quello che succede.', focus: 'Vuole sapere come sta mia madre o da dove vedo arrivare il fumo?', time: 'Ho chiamato quando mi sono accorta del fumo. Non so dirle quanti minuti siano passati.', identity: 'Mi chiamo Sara. Sono nell’appartamento con mia madre e mio figlio.', mood: 'Ho paura per mia madre e mio figlio.'},
    park: {subject: 'il signore', other: 'il ragazzo che si è fermato', unknown: 'Non conosco questo signore. Posso descrivere ciò che vedo, ma sulla sua salute precedente non so nulla.', focus: 'Vuole sapere del signore che sta male o del ragazzo che è qui con noi?', time: 'L’ho visto fermarsi mentre camminavamo. Ho chiamato subito dopo, non ho guardato l’orologio.', identity: 'Mi chiamo Elena. Ero sul sentiero, non conosco il signore che sta male.', mood: 'Sono preoccupata, ma riesco a seguirla.'},
    warehouse: {subject: 'le persone nel magazzino', other: 'la persona con la giacca chiara', unknown: 'Guardo dalla finestra dell’ufficio di fronte. Non conosco le persone nel magazzino e non vedo ogni angolo.', focus: 'Vuole la descrizione delle persone, del furgone oppure dell’ingresso?', time: 'Ho sentito il vetro poco prima di chiamare. Di solito chiudono alle sette, ma non so quando siano arrivate quelle persone.', identity: 'Mi chiamo Marco. Lavoro nel capannone di fronte e sto guardando dalla finestra del mio ufficio.', mood: 'Sto parlando piano: preferisco che non mi sentano.'},
    flood: {subject: 'il conducente', other: 'il passeggero', unknown: 'Sono sul lato sud del sottopasso. Da qui non vedo il fondo né quello che succede dall’altro lato.', focus: 'Vuole sapere delle persone, dell’auto o del livello dell’acqua?', time: 'Piove già da prima. Ho chiamato quando ho visto l’auto ferma; non so da quanto il sottopasso sia allagato.', identity: 'Mi chiamo Davide. Sono sul marciapiede prima del sottopasso.', mood: 'Mi preoccupa l’acqua che continua a salire.'},
    lift: {subject: 'io', other: 'il signore in cabina', unknown: 'Sono chiusa nella cabina. Non riesco a vedere il meccanismo o quello che succede ai piani.', focus: 'Vuole sapere come sto, quante persone siamo oppure cosa è successo all’ascensore?', time: 'Ho premuto l’allarme e poi ho chiamato voi. Non so quanti minuti siano passati, qui sembrano un’eternità.', identity: 'Mi chiamo Giulia. Sono venuta a trovare un’amica e l’ascensore si è bloccato.', mood: 'Questo spazio chiuso mi fa molta paura.'},
    conflict: {subject: 'la donna nell’appartamento accanto', other: 'il bambino', unknown: 'Sono la vicina. Sento attraverso il muro, ma non vedo dentro il loro appartamento.', focus: 'Mi sta chiedendo delle voci, dei rumori oppure di dove mi trovo io?', time: 'Ho chiamato dopo il colpo e la richiesta di aiuto. Non ho controllato quando sia cominciata la discussione.', identity: 'Mi chiamo Paola, sono la vicina dell’interno 4. La chiamata riguarda l’interno 5.', mood: 'Parlo piano, ho paura che mi sentano.'},
    lost: {subject: 'io', other: 'mia figlia', unknown: 'Non ricordo bene il percorso. Posso leggerle quello che c’è sul cartello e descrivere quello che vedo.', focus: 'Vuole che le descriva il cartello o che le dica come mi sento?', time: 'Sono uscito per una passeggiata, ma non ricordo l’ora. Mi sono perso dopo il ponticello.', identity: 'Mi chiamo Roberto. Sono uscito a passeggiare da solo.', mood: 'Mi sento confuso, non ritrovo la strada.'}
  };
  const getProfile = c => profile[c.key] || {subject: 'la persona coinvolta', unknown: 'Posso riferire soltanto ciò che riesco a vedere da qui.', focus: 'Mi può dire quale persona o quale punto vuole che le descriva?', time: 'Non ho controllato l’ora esatta.', identity: 'Mi chiamo ' + (c.caller || 'il chiamante') + '.', mood: 'La ascolto.'};

  // Each intent collects several independent semantic cues. Strong specific
  // phrases beat general nouns, so "respira ancora?" is never an update request.
  const concepts = [
    ['confirm', /(?:civico|numero (?:del |di )?(?:palazzo|portone|edificio|via|casa)|comune|citta|indirizzo (?:esatto|preciso)|punto (?:esatto|preciso)|dove.{0,25}(?:esatt|precis)|(?:esatt|precis).{0,20}dove|conferm.{0,24}(?:indirizz|via|posizion|dove)|verific.{0,24}(?:indirizz|cartell|civico))/g, 14],
    ['location', /(?:\bdove\b|indirizz|localizz|coordinate|via\b|strada (?:e|si)|che zona|in che (?:posto|quartiere)|posizion)/g, 8],
    ['response', /(?:coscient|svegl|(?:perd|pers|privo|senza).{0,12}(?:sensi|conoscenza)|(?:ti|le|gli|mi|vi) rispond|risponde|parla(?:re)?\b|reagisc|apre gli occhi|stato di coscienza|sente la (?:sua|tua) voce|svenut|si muove|muove.{0,12}(?:bracci|gamb))/g, 13],
    ['breathing', /(?:respir|fiato|affann|manca.{0,12}aria|torace|respiro|soffoc|ansim|apnea)/g, 15],
    ['weapons', /(?:\barm[ai]\b|armat|coltell|pistol|fucil|sprang|baston|in mano|minacc|spar[oi]|sparat)/g, 14],
    ['people', /(?:quant[ie].{0,15}(?:person|siete|sono|occupant|dentro|ferit|bambin)|in quanti|chi c'e|chi (?:si trova |e )?con|\bsol[oa]\b|occupant|altre person|altri.{0,10}(?:dentro|coinvolt)|\bbambin|\bfiglio|quanti eravate|quante voci|tutti.{0,10}dentro|qualcuno.{0,12}dentro|sono.{0,10}uscit)/g, 13],
    ['injuries', /(?:\bferit|sangu|emorrag|traum|frattur|rotto (?:un|il|la)|ustion|richiest.{0,8}aiuto|chiede.{0,8}aiuto)/g, 11],
    ['symptoms', /(?:sintom|dolor|malesser|come (?:sta|stanno|stai)|come (?:si|ti) sent|pallid|sudat|toss|brucia.{0,10}gola|sta male|condizion|si sente male|spalla|\bpetto)/g, 12],
    ['smoke', /(?:fum[oa]|fiamm|incendi|bruciat|odore|gas\b|scintill)/g, 13],
    ['hazards', /(?:pericol|risch|traffic|detrit|carreggiat|vetri.{0,10}terra|altre auto|auto.{0,15}arriv|cavi|elettric)/g, 10],
    ['safety', /(?:al sicuro|sicurezza|(?:lei|tu|voi).{0,20}(?:trov|siete|sei)|porta.{0,12}chius|(?:lontan|vicin|distanza).{0,18}(?:strada|auto|acqua|pericol)|sa che.{0,15}chiam|dove siete (?:ora|voi|rispetto)|dove sei tu|pericoli.{0,20}(?:sentiero|dove siete))/g, 14],
    ['access', /(?:access|ingress|citofon|cancell|raggiung|entrare|portone|scala|piano|chi.{0,14}apr|strada.{0,12}blocc|passaggio|passar.{0,12}ambulanz)/g, 10],
    ['vehicle', /(?:\btarga|veicol|furgon|colore.{0,15}(?:auto|macchina)|marca.{0,15}(?:auto|macchina)|modello|descriv.{0,18}(?:auto|macchina)|quale macchina)/g, 14],
    ['alarm', /(?:allarm|pulsante|display|fuori servizio|spia|citofono interno|sos\b)/g, 12],
    ['history', /(?:precedent|gia success|altre volte|farmac|medicin|terapi|allerg|patologi|diabet|problemi.{0,12}salute|lo conosc|la conosc|conosce.{0,10}person)/g, 13],
    ['owner', /(?:proprietar|autorizzat|lavori|orario.{0,10}chius|dovrebbe.{0,10}chiuso|permesso|dipendent)/g, 14],
    ['contact', /(?:\bfiglia|familiar|recapito|telefono.{0,12}(?:numero|riferiment)|numero.{0,12}(?:telefono|cellulare)|chi.{0,12}aspett)/g, 13],
    ['landmark', /(?:cartell|panchina|riferiment|insegna|ponte pedonal|passerella|riconoscib)/g, 10],
    ['source', /(?:esplosion|scoppio|rumor|boato|colp[oi]|vetri.{0,10}romp)/g, 11],
    ['situation', /(?:success|succed|accad|raccont|inizi|dinamica|perche.{0,15}(?:sband|ferm|bloccat)|cosa (?:ha|hai|avete) (?:visto|sentito)|che cosa vede|cosa sta succedendo)/g, 9],
    ['situation', /(?:acqua.{0,15}(?:alta|sale|salendo|livello|aument)|livello.{0,10}acqua|profond|metri.{0,10}acqua|ascensore.{0,10}bloccat)/g, 16],
    ['update', /(?:aggiorn|cambiat|novita|situazione (?:ora|adesso)|nel frattempo|cosa succede (?:ora|adesso)|ancora (?:cosi|uguale))/g, 12],
    ['services', /(?:soccors|ambulanz|pattugl|polizi|carabinier|pompier|vigili|mezzi|quanto manca|quando arriv)/g, 8]
  ];

  const synonyms = {donna: ['madre', 'signora'], uomo: ['signore', 'conducente'], auto: ['macchina', 'veicolo'], ferito: ['ferita', 'feriti', 'trauma'], vede: ['vedi', 'vedere'], solo: ['sola'], siete: ['persone'], nome: ['chiami', 'chiama']};
  const stopwords = new Set(('a al alla allo ai alle anche che chi ci con cosa come da dal della del dello delle di e ed gli ha hai hanno ho i il in la le lei lo loro l ma mi ne no non o per poi puo puoi quale quali quando quanto quanti se si sono su sul sulla te ti tra tu un una uno vi voi').split(' '));
  function tokens(value) {
    const list = norm(value).match(/[a-z0-9]+/g) || [];
    return list.filter(s => s.length > 2 && !stopwords.has(s)).map(s => s.length > 5 ? s.slice(0, -1) : s);
  }
  function lexicalSimilarity(text, t) {
    const query = tokens(text), basis = new Set(tokens(t.label + ' ' + t.question));
    let overlap = 0;
    for (const q of query) if (basis.has(q)) overlap += 3;
    for (const [word, values] of Object.entries(synonyms)) if (text.includes(word) && values.some(v => basis.has(v.length > 5 ? v.slice(0, -1) : v))) overlap += 2;
    return Math.min(10, overlap);
  }
  function authoredIntent(c, text) {
    const query = norm(text).replace(/[?!.]+$/g, '').trim(), queryWords = new Set(tokens(query));
    let best = null;
    for (const [key, t] of Object.entries(c.topics || {})) {
      if (!Array.isArray(t.aliases) || !t.aliases.length) continue;
      const question = norm(t.question).replace(/[?!.]+$/g, '').trim();
      let score = question === query ? 200 : 0;
      for (const alias of t.aliases) {
        const phrase = norm(alias), words = tokens(phrase);
        if (query === phrase) score = Math.max(score, 150);
        else if (phrase.length >= 10 && query.includes(phrase)) score = Math.max(score, 90 + words.length);
        else if (words.length >= 2 && words.every(word => queryWords.has(word))) score = Math.max(score, 70 + words.length);
      }
      if (score && (!best || score > best.score)) best = {key, score};
    }
    return best;
  }
  function previousOperator(c) {
    const turns = c.history || [];
    return [...turns].reverse().find(h => ['operatore', 'operator', 'user'].includes(h.role));
  }
  function previousCaller(c) {
    return [...(c.history || [])].reverse().find(h => ['chiamante', 'caller', 'assistant'].includes(h.role));
  }
  function withoutCurrentTurn(c, text) {
    const tail = c.history?.[c.history.length - 1];
    return tail && ['operatore', 'operator', 'user'].includes(tail.role) && norm(tail.text) === norm(text)
      ? {...c, history: c.history.slice(0, -1)} : c;
  }
  function conversationTopic(c) {
    for (const turn of [...(c.history || [])].reverse()) {
      if (!['operatore', 'operator', 'user'].includes(turn.role)) continue;
      const text = norm(turn.text);
      if (/^(?:e )?(?:perche|come mai|non ho capito|non capisco|in che senso|cioe|mi spieghi|ripeta|lui|lei)[?!. ]*$/.test(text)) continue;
      const found = ranked(c, text).find(([key]) => topicExists(c, mapped(c, key)));
      if (found) return mapped(c, found[0]);
    }
    return null;
  }
  function chooseWording(c, key, options) {
    const history = (c.history || []).filter(h => ['chiamante', 'caller', 'assistant'].includes(h.role));
    const used = history.filter(h => options.some(option => h.text === option)).length;
    return options[used % options.length];
  }
  function topicExists(c, key) {
    if (['confirm', 'location', 'services', 'update'].includes(key)) return true;
    return Boolean(topic(c, key));
  }
  function mapped(c, intent) {
    if (topicExists(c, intent)) return intent;
    const fallback = {
      response: ['symptoms', 'injuries'], breathing: ['symptoms'], injuries: ['symptoms', 'response'],
      symptoms: ['injuries', 'response'], smoke: ['hazards'], source: ['situation'], hazards: ['safety'],
      landmark: ['access', 'location'], alarm: ['source'], history: [], weapons: [], safety: [],
      vehicle: [], people: [], contact: [], owner: []
    };
    return (fallback[intent] || []).find(key => topicExists(c, key)) || intent;
  }
  function ranked(c, text) {
    const scores = new Map();
    const authored = authoredIntent(c, text);
    if (authored) scores.set(authored.key, authored.score);
    for (const [key, regex, weight] of concepts) {
      const matches = text.match(regex);
      if (matches) scores.set(key, (scores.get(key) || 0) + weight + Math.min(matches.length - 1, 2) * 2);
    }
    // Context-sensitive disambiguation: "ha sentito mia madre?" is a link check;
    // noun presence alone never makes an unknown relative part of a case.
    if (c.key === 'fire' && /(?:mia|sua|tua)? ?madre/.test(text)) scores.set('symptoms', (scores.get('symptoms') || 0) + 6);
    if (c.key === 'warehouse' && /(?:descri|vestit|indoss|aspetto|giacca|volto|capelli|altezza)/.test(text) && !/furgon|auto|veicol/.test(text)) scores.set('people', (scores.get('people') || 0) + 15);
    if (c.key === 'flood' && /(?:acqua|allagament)/.test(text) && !/sicuro|voi|dove|asciutto/.test(text)) scores.set('situation', (scores.get('situation') || 0) + 10);
    if (/qualcun altro.{0,20}(?:male|coinvolt)|qualcuno.{0,15}(?:insieme|con (?:lei|te|voi))|in quanti|quante persone|quanti.{0,12}coinvolt/.test(text)) scores.set('people', 35);
    if (/come sta andando|sta (?:peggiorando|migliorando)|peggio di prima|meglio di prima/.test(text)) scores.set('update', 38);
    if (/riesc.{0,12}fiat|fa fatica.{0,12}(?:aria|respir)|prend(?:e|ere) aria|si alza.{0,10}petto/.test(text)) scores.set('breathing', 35);
    if (/si gira.{0,12}chiam|reazione.{0,12}voce|non (?:dice|fa) una parola|occhi (?:aperti|chiusi)|sente.{0,10}chiam/.test(text)) scores.set('response', 32);
    if (/quanta gente|numero.{0,12}coinvolt|c'e qualcun altro|c'e altra gente|ha compagnia|sei in compagnia/.test(text)) scores.set('people', 33);
    if (/conducente|guidava|occupant/.test(text) && /abitacolo|abbandon|uscit|fuori|rimast.{0,10}auto/.test(text)) scores.set('people', 34);
    if (/come arriviamo|da che parte|come (?:vi|ti|la|li) troviamo|indicazioni.{0,12}arriv|come facciamo.{0,10}trovar/.test(text)) scores.set('access', 30);
    if (/cosa (?:indossa|indossano)|riesc.{0,12}riconosc|faccia|fisionomia/.test(text) && c.key === 'warehouse') scores.set('people', 30);
    if (/hai visto.{0,12}occhi|ha visto.{0,12}occhi|visto o.{0,8}sentito|di persona|testimon/.test(text)) scores.set('situation', 30);
    if (c.key === 'conflict' && !/sa che.{0,20}chiam/.test(text) && /quali voci|che parole|cosa dicono|cosa dicevano|litigan|urlan|grida/.test(text)) scores.set('situation', 30);
    if (/altri veicoli|altri automobilisti|chi arriva|traffico/.test(text)) scores.set('hazards', 30);
    if (/quanti anni|che eta|quanto pesa|peso|altezza/.test(text) && c.key !== 'warehouse') scores.set('demographics', 40);
    if (/dove.{0,18}(?:dolor|male)|(?:dove|quale).{0,10}ferit/.test(text)) { scores.delete('location'); scores.set('symptoms', 25); }
    if (/dove.{0,40}(?:fum|fiamm)|origine.{0,10}(?:fum|incend)/.test(text)) { scores.delete('location'); scores.set('situation', 30); }
    if (/quanti.{0,10}(?:minut|second|temp)|da quando|da quanto|a che ora|quando.{0,12}(?:inizi|success|accad|visto)/.test(text)) scores.set('time', 40);
    if (/(?:lei|tu).{0,8}(?:mi sente|mi senti)|mi senti|mi sente|(?:puo|puoi).{0,8}parlarmi/.test(text) && !/conducente|signore|madre|donna|bambino|ferito|lui|lei e/.test(text)) scores.set('connection', 35);
    for (const [key, t] of Object.entries(c.topics || {})) {
      const lexical = lexicalSimilarity(text, t);
      if (lexical >= 6 || scores.has(key)) scores.set(key, (scores.get(key) || 0) + lexical);
    }
    return [...scores].sort((a, b) => b[1] - a[1]);
  }

  function aboutAnother(c, text) {
    if (c.key === 'fire' && /(?:figlio|bambin)/.test(text) && !/quanti|chi|persone|siete/.test(text)) {
      if (/anni|eta/.test(text)) return noFact('Non le ho ancora detto la sua età. In questo momento faccio fatica a concentrarmi su altro: è qui con me.', 'demographics');
      if (/respir|sta|sent|coscient|ferit|toss|dolor|lui/.test(text)) return noFact('Mio figlio è qui con me. Le ho descritto la tosse di mia madre; su eventuali sintomi di mio figlio non le ho ancora dato informazioni certe.', 'child_condition');
    }
    if (c.key === 'park' && /ragazzo/.test(text) && /sta|ferit|respir|male/.test(text)) return factAnswer('Il ragazzo si è fermato per aiutarci; non è lui la persona che sta male. Il malore riguarda il signore.', 'people', topic(c, 'people').fact);
    if (c.key === 'flood' && /passegger/.test(text)) {
      const occupied = /passeggero/.test(norm(topic(c, 'people')?.fact));
      if (!occupied) return factAnswer('Il conducente mi ha detto che viaggiava da solo. È qui fuori con me; non mi ha riferito di passeggeri nell’auto.', 'people', topic(c, 'people').fact);
      if (/respir|coscient|svegl|sta|ferit|parl|rispond/.test(text)) return factAnswer('Vedo che il passeggero muove un braccio, ma da qui non riesco a sentirlo. Non posso confermarle il respiro o le sue condizioni.', 'injuries', topic(c, 'injuries').fact);
    }
    if (c.key === 'lift' && /signore|lui|altro/.test(text) && /sta|ferit|respir|male|rispond/.test(text)) {
      if (/una persona|sola/.test(norm(topic(c, 'people')?.fact))) return factAnswer('Sono sola in cabina, non c’è un’altra persona con me.', 'people', topic(c, 'people').fact);
      return factAnswer('Il signore dice di stare bene. È tranquillo, ci parliamo. Quella molto agitata sono io.', 'symptoms', topic(c, 'symptoms').fact);
    }
    if (c.key === 'conflict' && /bambin/.test(text) && /sta|ferit|respir|male|dove|ora|adesso/.test(text)) return factAnswer('Prima ho sentito piangere un bambino. Adesso non lo sento; non posso vederlo né sapere come sta.', 'people', topic(c, 'people').fact);
    return null;
  }

  function clinicalUnknown(c, text, intent) {
    if (/mort[oa]|decedut|arresto cardiaco|infarto|ictus|coma\b/.test(text)) {
      const key = ['response', 'symptoms', 'injuries'].find(key => topic(c, key));
      return noFact('Non posso stabilirlo. ' + (key ? topicResponse(c, key, text).reply : getProfile(c).unknown), 'diagnosis');
    }
    if (intent === 'breathing' && !topic(c, 'breathing')) {
      if (c.key === 'fire') return factAnswer('Mia madre tossisce e riesce a rispondermi. Non so valutare il suo respiro con più precisione.', 'symptoms', topic(c, 'symptoms').fact);
      if (c.key === 'lift') return factAnswer('Riesco a parlarle. Sono molto agitata, ma non le ho riferito altri malesseri.', 'symptoms', topic(c, 'symptoms').fact);
      if (c.key === 'lost') return factAnswer('Riesco a parlarle. Sono stanco e confuso sulla strada, non sento altri malesseri.', 'symptoms', topic(c, 'symptoms').fact);
      if (c.key === 'flood') return factAnswer(topic(c, 'injuries').reply + ' Non ho fatto altre verifiche.', 'injuries', topic(c, 'injuries').fact);
      return noFact('Da qui non riesco a vedere il respiro delle persone. ' + getProfile(c).unknown, 'breathing_unknown');
    }
    if (intent === 'response' && !topic(c, 'response')) {
      if (['fire', 'lift', 'lost', 'flood'].includes(c.key)) return topicResponse(c, mapped(c, intent), text);
      return noFact('Non sto parlando direttamente con le persone coinvolte, quindi non posso verificare se rispondano alla voce. ' + getProfile(c).unknown, 'response_unknown');
    }
    if (/pressione|battit|polso\b|saturaz|temperatura|glicemia/.test(text)) return noFact('Non ho misurato questi valori e non ho strumenti per farlo. Posso descriverle solo quello che vedo.', 'measurement_unknown');
    if (/dose|dosaggio|massagg|rianim|defibrill|compression|somministr|(?:dai|dia|dare).{0,12}(?:farmac|medicin|aspirin)/.test(text)) return noFact('Non ho fatto manovre né dato farmaci. Ho bisogno che il servizio sanitario prenda in carico queste indicazioni.', 'clinical_handoff');
    return null;
  }

  function standaloneObservation(c, key, source) {
    // Topic scripts originally answered a single yes/no question. Paraphrases
    // can reverse its polarity: "still inside?" and "already outside?" must
    // receive the same complete observation, never an inherited "No".
    let reply = String(source || '').trim();
    const edits = {
      collision: {
        response: [/^Sì[.,]\s*Mi ha risposto/i, 'Il conducente mi ha risposto'],
        smoke: [/^No,\s*fiamme no[.]/i, 'Non vedo fiamme.']
      },
      park: {
        response: [/^Sì[.,]\s*Mi ha detto/i, 'Il signore mi ha detto'],
        people: [/^No,\s*solo lui[.]/i, 'Il malessere riguarda solo il signore.'],
        access: [/^Sì,\s*è il primo sentiero a sinistra[.]/i, 'Il chiosco si raggiunge dall’ingresso indicato prendendo il primo sentiero a sinistra.'],
        history: [/^No,\s*l’ho incontrato qui[.]/i, 'Non conosco questo signore: l’ho incontrato qui.']
      },
      warehouse: {safety: [/^No,\s*nel capannone di fronte[.]/i, 'Sono nel capannone di fronte, in un edificio separato.']},
      flood: {
        people: [/^No,\s*è uscito/i, 'Il conducente è uscito'],
        situation: [/^Sì,\s*continua a salire/i, 'L’acqua continua a salire']
      },
      lift: {
        people: [/^No,\s*c’è un signore con me[.]/i, 'In cabina siamo in due: c’è un signore con me.'],
        hazards: [/^No,\s*nessun odore[.]/i, 'Non vedo fumo e non sento odori anomali.']
      },
      conflict: {weapons: [/^No,\s*non ho capito parole di quel tipo[.]/i, 'Non ho capito parole riferite ad armi o minacce precise.']},
      lost: {
        people: [/^No,\s*ero uscito da solo[.]/i, 'Sono uscito da solo.'],
        symptoms: [/^No,\s*sto bene[.]/i, 'Non ho dolore e non mi sono fatto male.']
      }
    };
    const edit = edits[c.key]?.[key];
    if (edit) reply = reply.replace(edit[0], edit[1]);
    reply = reply.replace(/^(?:sì|si|no)\s*[,.;:!?]\s*/i, '');
    return reply ? reply[0].toUpperCase() + reply.slice(1) : String(source || '');
  }

  function topicResponse(c, key, text) {
    const t = topic(c, key);
    if (!t) {
      if (key === 'weapons') return noFact('Non ho osservato armi e non ho informazioni che ne confermino la presenza. ' + getProfile(c).unknown, 'weapons_unknown');
      if (key === 'history') return noFact('Su precedenti, malattie o terapie non ho informazioni da confermarle. ' + getProfile(c).unknown, 'history_unknown');
      if (key === 'vehicle') return noFact('Non ho una targa o una descrizione più precisa da darle. ' + getProfile(c).unknown, 'vehicle_unknown');
      if (key === 'contact') return noFact('Non ho un recapito da comunicarle con certezza in questo momento.', 'contact_unknown');
      return noFact(getProfile(c).unknown + ' ' + getProfile(c).focus, 'clarify', {clarification: true});
    }
    let reply = t.reply, fact = t.fact;
    if (c.eventFired && c.event) {
      const changed = {collision: ['hazards'], fire: ['situation'], park: ['response'], warehouse: ['people', 'situation'], flood: ['situation'], lift: ['alarm', 'access'], conflict: ['situation'], lost: ['safety']};
      if ((changed[c.key] || []).includes(key)) {
        let retainsPriorObservation = false;
        if (c.key === 'warehouse' && /vestit|giacca|descri|volto/.test(text)) {reply = t.reply + ' Però adesso una persona è uscita verso il furgone e l’altra non è più visibile.'; retainsPriorObservation = true;}
        else if (c.key === 'lift' && key === 'access') {reply = t.reply + ' ' + c.event.text; retainsPriorObservation = true;}
        else reply = c.event.text;
        fact = (retainsPriorObservation ? t.fact + ' ' : '') + c.event.fact;
      }
      if (c.key === 'lift' && key === 'hazards' && /stabile/.test(norm(c.event.text))) {
        reply = 'Non sento odore di bruciato e non vedo fumo. La luce adesso è stabile, ma l’ascensore è ancora fermo.';
        fact = 'Nessun fumo o odore anomalo; luce ora stabile, cabina ancora ferma.';
      }
    }
    reply = standaloneObservation(c, key, reply);
    if ((c.attempts?.[key] || 0) > 0 || seen(c, key)) {
      // Reconfirmation uses an explicitly authored observation; it never upgrades
      // "not visible" to "absent", or a witness impression to a diagnosis.
      const last = previousCaller(c);
      if (last && norm(last.text).includes(norm(reply))) reply = 'Per ora posso confermarle questo: ' + reply.charAt(0).toLowerCase() + reply.slice(1);
      else if (/sicuro|sicura|cert[oa]|conferm|ripet|di nuovo|ancora/.test(text)) reply = 'Confermo quello che riesco a osservare. ' + reply;
    }
    return factAnswer(reply, key, fact);
  }

  function services(c, text) {
    const assigned = c.assignedUnits || [];
    const present = assigned.some(u => /posto|arrivat|intervento/.test(norm(u.phase))) || (c.arrived || []).length > 0;
    const traveling = assigned.some(u => /viaggio|marcia|avvicin|risposta/.test(norm(u.phase)));
    if (/quanto|quando|minut|tempo/.test(text)) return noFact(present ? 'Vedo i soccorsi sul posto. Mi dica se devo restare in linea.' : 'Da qui non so quanto manchi. Può dirmi lei se una squadra è già in arrivo?', 'services');
    if (present) return noFact('Sì, i soccorsi sono qui. Rimango in linea se le serve chiarire qualcosa.', 'services');
    if (traveling || assigned.length || (c.sent || []).length) return noFact('Va bene, ho capito che i mezzi sono stati avvisati. Io non li vedo ancora; rimango in ascolto.', 'services', {stressDelta: -3});
    if (/sto inviando|inviat|arrivando|mandato|sta arrivando/.test(text)) return noFact('Ho capito, grazie. Da qui non vedo ancora nessuno. Rimango in linea.', 'services', {stressDelta: -2});
    return noFact('Non vedo ancora i soccorsi. Mi conferma lei se avete già avvisato qualcuno?', 'services');
  }

  function answerIntent(c, key, text) {
    if (key === 'identity') return factAnswer(getProfile(c).identity, 'identity', 'Chiamante: ' + (c.caller || 'identità da verificare') + '.');
    if (key === 'connection') return noFact(c.key === 'conflict' || c.key === 'warehouse' ? 'Sì, la sento. Posso parlare, ma tengo la voce bassa.' : 'Sì, la sento. Sono qui, mi dica.', 'connection', {stressDelta: -2});
    if (key === 'time') return noFact(getProfile(c).time, 'time');
    if (key === 'demographics') return noFact(c.key === 'park' || c.key === 'collision' ? 'Non lo conosco, non so l’età né altri dati personali. Non voglio inventarle un numero.' : 'Non ho ancora un dato preciso da darle su questo.', 'demographics');
    if (key === 'location') {
      if (seen(c, 'location') || seen(c, 'confirm')) return {reply: c.confirm || c.address || c.location, facts: [{key: 'location', text: c.location}, {key: 'confirm', text: c.address}], intent: 'confirm', stressDelta: -1};
      return factAnswer(c.location, 'location', c.location);
    }
    if (key === 'confirm') return {reply: c.confirm || c.address || c.location, facts: [{key: 'location', text: c.location}, {key: 'confirm', text: c.address}], intent: 'confirm', stressDelta: -1};
    if (key === 'services') return services(c, text);
    if (key === 'symptoms' && c.key === 'park' && /dove.{0,20}(?:male|dolor)|dolore.{0,12}(?:dove|punto)|petto/.test(text)) {
      const answer = topicResponse(c, 'situation', text);
      return {...answer, intent: 'symptoms'};
    }
    if (key === 'update') {
      if (c.eventFired && c.event) return factAnswer(c.event.text, 'update', c.event.fact);
      const context = ranked(c, norm(previousOperator(c)?.text || '')).find(([k]) => topic(c, mapped(c, k)));
      const reference = context && topic(c, mapped(c, context[0]));
      return reference ? noFact('Non ho osservato cambiamenti da quando le ho detto: ' + reference.reply, 'update') : noFact('Non ho notato nuovi cambiamenti mentre siamo in linea. ' + getProfile(c).focus, 'update');
    }
    const clinical = clinicalUnknown(c, text, key);
    if (clinical) return clinical;
    return topicResponse(c, mapped(c, key), text);
  }

  function reasonResponse(c, text) {
    const explicit = ranked(c, text).find(([key]) => topic(c, mapped(c, key)));
    const key = explicit ? mapped(c, explicit[0]) : conversationTopic(c);
    const replies = {
      collision: {
        breathing: 'Il riflesso sul vetro copre il torace: dalla mia posizione non riesco a vedere se respira.',
        people: 'Vedo il conducente, ma i vetri dietro sono scuri. Per questo non posso escludere altre persone.',
        situation: 'Ho visto solo gli ultimi secondi, quando ha attraversato la corsia e preso il palo. La causa della sbandata non la so.'
      },
      fire: {
        situation: 'La porta dell’appartamento è chiusa. Il fumo arriva da sotto, dal pianerottolo; non vedo da dove parta oltre la porta.',
        hazards: 'Dalla mia posizione vedo il fumo, ma nessuna fiamma. Non posso dire cosa ci sia sulle scale.'
      },
      park: {history: 'L’ho incontrato sul sentiero, non lo conosco. Non so la sua età, le sue malattie o quali medicine prenda.'},
      warehouse: {
        weapons: 'Vedo solo un oggetto lungo dalla finestra dell’ufficio di fronte. Potrebbe essere un attrezzo: non ho elementi per chiamarlo una pistola o un’altra arma.',
        vehicle: 'Il furgone è bianco, ma la targa è rivolta dall’altra parte. Da questa finestra non riesco a leggerla.',
        owner: 'Di solito chiudono alle sette, ma il proprietario non mi ha detto se ci siano lavori stasera. Non so se quelle persone siano autorizzate.',
        people: 'Dalla finestra distinguo una giacca chiara e una scura. I volti sono troppo lontani: non saprei identificarli.'
      },
      flood: {situation: 'Non so perché l’acqua non defluisca. Posso vedere che continua a salire: prima vedevo il cordolo, adesso non più.'},
      lift: {situation: 'Ho sentito uno scatto mentre salivamo dal secondo al terzo piano, poi la cabina si è fermata. Non vedo il meccanismo e non so cosa si sia guastato.'},
      conflict: {
        weapons: 'Sento attraverso il muro, ma non vedo dentro. Non ho sentito nominare armi o minacce precise: non posso confermarne la presenza.',
        injuries: 'Ho sentito una richiesta di aiuto, ma non vedo nessuno. Per questo non posso dirle se ci siano feriti.'
      },
      lost: {situation: 'Ricordo il chiosco e il ponticello. Dopo ho seguito il sentiero lungo l’acqua e non ho più riconosciuto la strada.'}
    };
    const authored = replies[c.key]?.[key];
    // Updated observations always take precedence over an explanation of an old
    // state. Clinical causes remain unknown, even when the symptom is visible.
    if (authored && !(c.eventFired && ['situation', 'people'].includes(key))) return factAnswer(authored, key, topic(c, key)?.fact, 'reason');
    if (key) {
      const answer = answerIntent(c, key, text);
      return {...answer, reply: 'La causa non la conosco. Quello che riesco a riferirle è questo: ' + answer.reply, intent: 'reason'};
    }
    return noFact('Intende perché ho chiamato oppure perché non riesco a verificare un dettaglio?', 'clarify_reason', {clarification: true});
  }

  function summaryResponse(c) {
    const records = catalog(c), known = records.filter(record => seen(c, record.key) && record.fact && !(record.key === 'location' && seen(c, 'confirm')));
    const ordered = known.sort((a, b) => Number(b.key === 'update') - Number(a.key === 'update'));
    if (!ordered.length) return noFact(typeof c.opening === 'string' ? c.opening : c.opening?.[0] || getProfile(c).unknown, 'summary');
    const selected = ordered.slice(0, 4);
    return {reply: 'Le ripeto i punti che le ho riferito. ' + selected.map(record => record.reply).join(' '), facts: selected.map(record => ({key: record.key, text: record.fact})), intent: 'summary', stressDelta: -1};
  }

  function conversationControl(c, text) {
    if (/riepilog|ricapitol|riassum|facciamo il punto|cosa (?:mi )?ha (?:gia )?detto|ricominciamo (?:dal|da) principio/.test(text)) return summaryResponse(c);
    if (/^(?:e |ma |mi (?:dice|spiega) )?(?:perche|come mai|per quale motivo|come fa a saperlo|come fai a saperlo|su cosa si basa)[?!. ]*$/.test(text) || /^(?:e |ma )?perche\b/.test(text)) return reasonResponse(c, text);
    // Resolve a named clarification without forcing the user to repeat the
    // entire preceding question ("intendo il conducente", "parlo del bambino").
    if (/^(?:intendo|mi riferisco|parlo|dicevo|chiedo)/.test(text)) {
      const key = conversationTopic(c) || 'symptoms';
      const special = aboutAnother(c, text + ' come sta');
      if (special) return special;
      if (/conducente|signore|madre|donna|persona/.test(text)) return answerIntent(c, key, text);
    }
    if (/^(?:non ho capito|non capisco|non e chiaro|mi spieghi|puo spiegarsi|puoi spiegarti)(?:\b.*)?$/.test(text)) {
      const explicit = ranked(c, text).find(([key]) => topicExists(c, mapped(c, key)));
      const key = explicit ? mapped(c, explicit[0]) : conversationTopic(c);
      if (key) {
        const answer = answerIntent(c, key, text);
        const simple = reasonResponse(c, 'perche');
        return key === 'location' || key === 'confirm' ? answer : {...answer, reply: simple.intent === 'reason' ? simple.reply : answer.reply, intent: answer.intent};
      }
    }
    return null;
  }

  function resolveFollowup(c, text) {
    const last = previousCaller(c), previous = previousOperator(c);
    if (!previous) return null;
    if (/^(?:e )?(?:lui|lei|loro|l'altro|l'altra|il bambino|suo figlio|sua madre)\??$/.test(text)) {
      const prevText = norm(previous.text), intent = ranked(c, prevText)[0]?.[0] || 'symptoms';
      if (c.key === 'fire' && /\blui\b|bambino|figlio/.test(text)) return aboutAnother(c, 'il bambino come sta');
      if (c.key === 'park' && /altro/.test(text)) return aboutAnother(c, 'il ragazzo come sta');
      if (c.key === 'lift') return aboutAnother(c, 'il signore come sta');
      if (c.key === 'flood' && /altro|lui/.test(text)) return aboutAnother(c, 'il passeggero come sta');
      if (c.key === 'conflict' && /bambino/.test(text)) return aboutAnother(c, 'il bambino come sta');
      if (c.key === 'conflict' && /lui/.test(text)) return noFact('Intende l’uomo di cui ho sentito la voce oppure il bambino?', 'clarify_subject', {clarification: true});
      return noFact('Quando dice «' + text.replace(/\?/g, '') + '», intende ' + getProfile(c).subject + '? ' + getProfile(c).focus, 'clarify_subject', {clarification: true});
    }
    if (/^(?:mi )?(?:ripet[ai]|puo ripetere|puoi ripetere|non ho capito|non capisco|non ho sentito|come scusi|in che senso|cioe|scusi|che intende|che significa|ne e sicur[oa]|sei sicur[oa]|sicuro|sicura)[?!. ]*$/.test(text)) {
      if (last) {
        const candidates = ranked(c, norm(previous.text));
        if (candidates.length) return answerIntent(c, candidates[0][0], 'può ripetere con certezza ' + norm(previous.text));
        return noFact('Mi spiego meglio. ' + last.text, 'repeat');
      }
    }
    if (/^(?:e |me |mi )?(?:lo descriv[aei]|la descriv[aei]|puo descrivermelo|puoi descrivermelo|puo descriverlo|puoi descriverlo|dica di piu|dimmi di piu|qualche dettaglio|piu precisamente|puo essere piu precis[oa])[?!. ]*$/.test(text)) {
      const candidates = ranked(c, norm(previous.text));
      if (candidates.length) return answerIntent(c, candidates[0][0], 'mi descriva con precisione ' + norm(previous.text));
    }
    return null;
  }

  function direct(c, text) {
    if (/^(?:pronto|salve|buon(?:giorno|asera)|ciao|112|centrale)[?!. ]*$/.test(text)) return noFact(previousCaller(c) ? 'Sì, sono ancora in linea. La sento.' : 'Pronto, mi sente? ' + (typeof c.opening === 'string' ? c.opening : c.opening?.[0] || getProfile(c).mood), 'greeting');
    if (/^(?:ok|okay|va bene|bene|capito|ricevuto|perfetto|grazie|d'accordo|continui|continua)[?!. ]*$/.test(text)) return noFact(chooseWording(c, 'acknowledgement', c.key === 'conflict' ? ['Sono ancora qui. Continuo a parlare piano.', 'La sento. Rimango in linea.', 'Va bene. Le dico se sento altro.'] : ['Va bene, rimango in linea.', 'La ascolto. Mi dica pure.', 'Sì, ci sono.']), 'acknowledgement', {stressDelta: -2});
    if (/nome|come.{0,18}chiama/.test(text) && /figlia|madre|figlio|signore|conducente|bambino|donna|ferito|persona/.test(text)) {
      if (c.key === 'lost' && /figlia/.test(text)) return topicResponse(c, 'contact', text);
      return noFact('Non ho ancora un nome verificato da comunicarle per questa persona.', 'person_identity_unknown');
    }
    if (/come (?:si chiama|ti chiami)|(?:il (?:suo|tuo)|nome (?:del|della)) nome|\bchi (?:parla|sei|e lei)\b|nome e cognome|(?:dica|dimmi) il nome|con chi (?:sto parlando|parlo)/.test(text)) return factAnswer(getProfile(c).identity, 'identity', 'Chiamante: ' + (c.caller || 'identità da verificare') + '.');
    if (/cognome|codice fiscale|data di nascita|documento/.test(text)) return noFact('Le ho dato il mio nome: ' + (c.caller || 'non ancora verificato') + '. Gli altri dati non sono ancora confermati.', 'identity_unknown');
    if (/stai mentendo|sta mentendo|bugiard|inventando|finta|scherzo/.test(text)) return noFact('No, sto chiamando per quello che sta succedendo. ' + getProfile(c).unknown, 'credibility');
    if (/stupid|idiot|coglione|deficiente|cretin|fott|vaffanc|zitt[oa]/.test(text)) return noFact('Sono in difficoltà e sto cercando di risponderle. Mi faccia una domanda chiara, per favore.', 'distress', {stressDelta: 5});
    if (/^(?:(?:si|stia|stai|resti|resta) )?(?:tranquill|calm)|una (?:cosa|domanda) alla volta|la ascolto|ti ascolto|sono qui|sono con (?:lei|te)|respiri piano|non si preoccupi|non preoccuparti|mi dispiace/.test(text) && !/\?/.test(text)) return factAnswer(chooseWording(c, 'rapport', [c.calm || 'Va bene, cerco di seguirla. La ascolto.', 'Sì, la seguo. Mi faccia una domanda alla volta.', 'La sento, continuo a risponderle.']), 'rapport', 'Contatto mantenuto; il chiamante risponde.', 'rapport');
    if (/non (?:ti|la) sento|voce (?:disturbata|bassa)|linea disturbata/.test(text)) return noFact(c.key === 'conflict' || c.key === 'warehouse' ? 'Provo a parlare più chiaramente, ma devo tenere la voce bassa. Mi sente adesso?' : 'Provo a parlare più chiaramente. Mi sente adesso?', 'connection');
    if (/mi senti|mi sente|linea (?:disturbata|cade)|riesc.{0,10}sentirmi/.test(text)) return answerIntent(c, 'connection', text);
    if (/quant[ie].{0,12}(?:ferit|stanno male|ustionat)/.test(text)) {
      if (['warehouse', 'lift', 'flood', 'conflict'].includes(c.key)) return topicResponse(c, topic(c, 'injuries') ? 'injuries' : 'symptoms', text);
      if (c.key === 'fire') return factAnswer('Siamo in tre, ma il malessere che le sto riferendo riguarda mia madre: tossisce e le brucia la gola. Non posso dare un conteggio di altre persone ferite nel palazzo.', 'symptoms', topic(c, 'symptoms').fact);
      if (c.key === 'collision') return factAnswer('Vedo soltanto il conducente. Non posso confermare se ci siano altri occupanti o quante persone siano ferite.', 'people', topic(c, 'people').fact);
      if (c.key === 'park') return topicResponse(c, 'people', text);
      if (c.key === 'lost') return topicResponse(c, 'symptoms', text);
    }
    const clinical = clinicalUnknown(c, text, null);
    if (clinical) return clinical;
    if (/quanto.{0,8}(?:alta|alto)|altezza|corporatura|capelli|barba|accento|nazionalita/.test(text) && c.key === 'warehouse') return noFact('Da questa distanza distinguo le giacche, ma non i volti né altri dettagli affidabili. Non posso stimare altezza, età o provenienza.', 'description_unknown');
    if (/targa/.test(text) && !topic(c, 'vehicle')) return noFact('Non ho una targa leggibile da comunicarle.', 'vehicle_unknown');
    if (/(?:colore|marca|modello).{0,20}(?:auto|macchina)|(?:auto|macchina).{0,15}(?:colore|marca|modello)/.test(text) && !topic(c, 'vehicle')) return noFact('Non ho identificato con certezza marca, modello o colore dell’auto. Posso dirle quello che vedo dell’incidente.', 'vehicle_unknown');
    if (/numero.{0,12}(?:richiam|cellulare|telefon)|richiamar/.test(text) && c.key !== 'lost') return noFact('Sto chiamando da questo telefono, ma non le ho ancora comunicato un numero da verificare. Sono ancora in linea.', 'callback_unknown');
    const waitCommand = /^(?:(?:per favore|adesso|ora)[, ]+)?(?:aspetti|aspetta)(?=$|[,.!;:]|\s+(?:un(?:o)?\b|qui\b|li\b|in linea\b|che\b|mentre\b|qualche\b|per favore\b))/.test(text);
    if ((waitCommand || /^(?:(?:per favore|adesso|ora)[, ]+)?(?:resti|rimanga|rimani)\b|non (?:si |ti )?(?:muova|muovere|sposti|avvicin|allontan|entri|entrare|apra|aprire)|restare in linea|(?:la|ti) metto in attesa/.test(text)) && !/\?/.test(text)) return noFact('Ho capito. Rimango in contatto con lei; se cambia qualcosa glielo dico.', 'instruction_ack', {stressDelta: -3});
    return aboutAnother(c, text);
  }

  function clauses(text) {
    // Split only when another question begins, preserving "fumo o fiamme" and
    // "nome e cognome" as one observation. Answer at most three distinct topics.
    return text.split(/[?;]+|,\s*(?=(?:dove|quanti|quante|come|cosa|che cosa|chi |respira|risponde|ci sono|vede|ha |quando|da quanto))|\s+e\s+(?=(?:se |dove|quanti|quante|come|cosa|che cosa|chi|respira|risponde|ci sono|vede|ha |e (?:coscient|svegl)|quando|da quanto))/)
      .map(s => s.trim()).filter(Boolean).slice(0, 4);
  }
  function respond(c, input) {
    const original = String(input || '').trim().slice(0, 800), text = norm(original);
    if (!text) return noFact('Sono in linea. Mi dica.', 'empty');
    // Accept hosts that append the current operator turn before invoking us.
    c = withoutCurrentTurn(c, text);
    const authored = authoredIntent(c, text);
    if (authored && clauses(text).length === 1) return topicResponse(c, authored.key, text);
    const control = conversationControl(c, text);
    if (control) return control;
    // Keep a named child's referent across comma/question boundaries.
    if (c.key === 'fire' && /bambin|figlio/.test(text) && !/madre|mamma/.test(text)) {
      const child = aboutAnother(c, text);
      if (child) return child;
    }
    if (c.key === 'conflict' && c.eventFired && /grid|url|litig|silenz/.test(text)) return answerIntent(c, 'situation', text);
    const segments = clauses(text);
    const replies = [], facts = [], intents = [];
    for (const segment of segments) {
      const authoredSegment = authoredIntent(c, segment);
      let response = authoredSegment ? topicResponse(c, authoredSegment.key, segment) : conversationControl(c, segment) || direct(c, segment) || resolveFollowup(c, segment);
      if (!response) {
        const candidates = ranked(c, segment);
        if (candidates.length && candidates[0][1] >= 8) response = answerIntent(c, candidates[0][0], segment);
        else if (/^(?:e )?(?:ora|adesso|ancora|poi)[?!. ]*$/.test(segment)) response = answerIntent(c, 'update', segment);
        else {
          const unknown = /\b(?:eta|anni|altezza|peso|nome|targa|numero|indirizzo di casa|sposat|lavoro|meteo|piove|nevica)\b/.test(segment);
          const previousKey = conversationTopic(c), knownTopic = previousKey && topic(c, previousKey);
          const alternatives = [getProfile(c).focus, knownTopic ? 'Intende un altro dettaglio su ' + knownTopic.label.toLowerCase() + '? Mi dica quale.' : 'Non ho capito bene a cosa si riferisce. ' + getProfile(c).focus, 'Mi aiuta a capire quale dettaglio le serve? ' + getProfile(c).unknown];
          response = noFact(unknown ? 'Questo dettaglio non lo so con certezza. ' + getProfile(c).unknown : chooseWording(c, 'clarify', alternatives), unknown ? 'detail_unknown' : 'clarify', {clarification: !unknown});
        }
      }
      if (!intents.includes(response.intent)) {
        replies.push(response.reply); facts.push(...response.facts); intents.push(response.intent);
      }
      if (intents.length >= 3) break;
    }
    const factMap = new Map(facts.filter(f => f.text).map(f => [f.key, f]));
    const reply = unique(replies).join(' ');
    const emotional = intents.includes('rapport') ? -10 : intents.includes('distress') ? 5 : intents.includes('services') ? -2 : -1;
    return {reply, facts: [...factMap.values()], stressDelta: emotional, intent: intents.join('+'), clarification: intents.some(k => /^clarify/.test(k))};
  }

  // Public semantic-retrieval contract. The catalog is a detached, current-state
  // truth source: it contains no guesses, dependency gates or revealed-only filter.
  // The caller's dossier remains progressive because only answers return facts.
  function catalog(c) {
    const clean = {...c, history: [], facts: {}, attempts: {}};
    const records = [
      {key: 'location', label: 'Dove si trova il chiamante; prima localizzazione', reply: c.location, fact: c.location},
      {key: 'confirm', label: 'Conferma del punto esatto, indirizzo, civico e comune', reply: c.confirm || c.address || c.location, fact: c.address || c.location}
    ];
    for (const [key, t] of Object.entries(c.topics || {})) {
      const answer = topicResponse(clean, key, '');
      records.push({key, label: t.label + (t.question ? ' · ' + t.question : ''), reply: answer.reply, fact: answer.facts.find(f => f.key === key)?.text || ''});
    }
    records.push({key: 'identity', label: 'Nome e identità del chiamante', reply: getProfile(c).identity, fact: c.caller ? 'Chiamante: ' + c.caller + '.' : ''});
    records.push({key: 'time', label: 'Quando è iniziato, tempo trascorso, durata e orario', reply: getProfile(c).time, fact: ''});
    records.push({key: 'update', label: 'Ultimi cambiamenti e situazione attuale', reply: c.eventFired && c.event ? c.event.text : 'Non ho osservato altri cambiamenti mentre siamo in linea.', fact: c.eventFired && c.event ? c.event.fact : ''});
    return records.filter(record => typeof record.reply === 'string' && record.reply.trim()).map(record => ({...record, fact: record.fact || ''}));
  }

  function answerTopics(c, keys, input = '') {
    const text = norm(String(input || '').slice(0, 800));
    c = withoutCurrentTurn(c, text);
    const authored = authoredIntent(c, text);
    if (authored && clauses(text).length === 1) return topicResponse(c, authored.key, text);
    const control = conversationControl(c, text);
    if (control) return control;
    const followup = resolveFollowup(c, text);
    if (followup) return followup;
    // A semantic score cannot authorise a fabricated person, a diagnosis, a
    // clinical action or a callback number. Preserve these contextual boundaries.
    const special = direct(c, text);
    if (special && /unknown|diagnosis|clinical|child_condition|demographics|clarify|instruction|distress/.test(special.intent)) return special;
    const allowed = new Set(catalog(c).map(record => record.key));
    const selected = unique((Array.isArray(keys) ? keys : [keys]).filter(key => typeof key === 'string' && allowed.has(key))).slice(0, 3);
    if (!selected.length) return respond(c, input);
    const answers = selected.map(key => answerIntent(c, key, text));
    return {reply: unique(answers.map(answer => answer.reply)).join(' '), facts: [...new Map(answers.flatMap(answer => answer.facts).filter(f => f.text).map(f => [f.key, f])).values()], intent: unique(answers.map(answer => answer.intent)).join('+'), stressDelta: -1, clarification: answers.some(answer => answer.clarification)};
  }

  function suggestions(c) {
    const items = [];
    const add = (label, text, key) => {if (text && !items.some(x => x.key === key)) items.push({label, text, key});};
    if (!seen(c, 'location')) add('Localizzazione', 'Mi dice dove si trova e quali riferimenti riesce a vedere?', 'location');
    else if (!seen(c, 'confirm')) add('Indirizzo preciso', 'Può verificare il civico, il comune e il punto esatto?', 'confirm');
    if (c.stress > 80 && !seen(c, 'rapport')) add('Contatto', 'La ascolto. Procediamo una domanda alla volta.', 'rapport');
    const order = {
      collision: ['people', 'response', 'breathing', 'safety', 'hazards', 'smoke', 'situation', 'access'],
      fire: ['people', 'symptoms', 'safety', 'situation', 'hazards', 'access', 'source'],
      park: ['response', 'breathing', 'situation', 'symptoms', 'safety', 'access', 'people', 'history'],
      warehouse: ['safety', 'situation', 'people', 'weapons', 'vehicle', 'injuries', 'access', 'owner'],
      flood: ['people', 'safety', 'injuries', 'situation', 'hazards', 'access', 'vehicle'],
      lift: ['people', 'symptoms', 'hazards', 'situation', 'alarm', 'access'],
      conflict: ['safety', 'situation', 'people', 'weapons', 'injuries', 'access', 'history'],
      lost: ['safety', 'symptoms', 'landmark', 'people', 'contact', 'situation', 'access']
    };
    if (c.eventFired && !seen(c, 'update')) add('Evoluzione', 'Che cosa è cambiato da quando abbiamo iniziato a parlare?', 'update');
    for (const key of unique([...(order[c.key] || []), ...Object.keys(c.topics || {})])) {
      const t = topic(c, key);
      if (t && !seen(c, key)) add(t.label, t.question, key);
    }
    if (items.length < 4) add('Aggiornamento', 'Mi aggiorna sulla situazione adesso?', 'update');
    if (items.length < 4) add('Soccorsi', 'Dalla sua posizione vede già i soccorsi?', 'services');
    if (items.length < 4 && topic(c, 'safety')) add('Sicurezza', topic(c, 'safety').question, 'safety');
    return items.slice(0, 4).map(({label, text}) => ({label, text}));
  }
  root.ConversationAI = Object.freeze({respond, suggestions, catalog, answerTopics, version: '3.0.0', mode: 'local-contextual'});
})(typeof window === 'undefined' ? globalThis : window);
