const fs=require('fs');
const paths=['work/dialogue-data.js','work/narrative-engine.js','work/case-factory.js','work/conversation-ai.js','work/radio-engine.js','work/city-map.js','work/active-comms.js','work/dossier-v5.js','work/operations-v5.js','work/call-flow.js','work/story-desk.js','work/game-v4.js'];
const scripts=paths.map(f=>fs.readFileSync(f,'utf8').replace('Game.init();','')).join('\n')+'\nOperationsDesk.attach(Game);StoryDesk.attach(Game);Game.init();';
new Function(scripts);
const style=['work/centrale-style.css','work/dossier-v5.css','work/calls-v5.css','work/story-desk.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const html=fs.readFileSync('work/centrale-shell.html','utf8').replace('/*__STYLE__*/',()=>style).replace('/*__SCRIPTS__*/',()=>scripts);
fs.writeFileSync('outputs/Centrale112.html',html);console.log('Built '+html.length+' chars');
