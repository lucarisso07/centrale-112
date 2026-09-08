/* Launcher regressions: every filesystem/process/network operation is mocked. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../outputs/avvia-centrale.cjs'),'utf8');
async function simulate(options={}) {
  const calls={spawn:[],browser:[],messages:[],mkdir:[],writes:[],fetch:[]};
  let gameSpawned=false,healthChecks=0;
  const mockFs={
    existsSync(file){if(file.endsWith('llama-server.exe'))return !options.missingExecutable;if(file.endsWith('conversazioni.gguf'))return !options.missingModel;if(file.endsWith('access.key'))return true;return false;},
    mkdirSync(file){calls.mkdir.push(file);},openSync(){return 10;},closeSync(){},
    writeFileSync(file,data){calls.writes.push({file,data});},readFileSync(){throw Error('Unexpected filesystem read');}
  };
  const childProcess={
    spawn(command,args,config){calls.spawn.push({command,args,config});if(args.some(arg=>arg.endsWith('centrale-server.cjs')))gameSpawned=true;return {pid:100+calls.spawn.length,on(){},unref(){}};},
    execFileSync(command,args,config){calls.browser.push({command,args,config});return '';}
  };
  const sandbox={__dirname:path.resolve(__dirname,'../outputs'),console:{log:text=>calls.messages.push(text),error:text=>calls.messages.push(text)},
    require(name){if(name==='fs')return mockFs;if(name==='path')return path;if(name==='crypto')return {randomBytes:()=>Buffer.alloc(32)};if(name==='child_process')return childProcess;throw Error('Unexpected require '+name);},
    process:{argv:options.noBrowser?['node','launcher','--no-browser']:['node','launcher'],execPath:'C:\\Mock\\node.exe',kill(){throw Error('A stop operation must never run in this test');}},
    AbortSignal:{timeout:()=>({})},setTimeout:fn=>{queueMicrotask(fn);return 1;},
    fetch:async address=>{calls.fetch.push(address);if(address.includes(':8124/'))return {ok:false};if(!gameSpawned||options.webFails)throw Error('Connection refused');healthChecks++;return {ok:!options.httpError,json:async()=>({ready:!options.slowModel&&!options.missingModel&&!options.missingExecutable,model:'Qwen',version:'0.4'})};}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(0,source.lastIndexOf('main().catch'))+'\nglobalThis.runLauncher=main;',sandbox);
  let error;
  try{await sandbox.runLauncher();}catch(e){error=e;}
  return {calls,error,healthChecks};
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
  for(const missing of ['missingModel','missingExecutable'])await check(missing+' opens the working fallback without starting llama',async()=>{
    const r=await simulate({[missing]:true});assert.ifError(r.error);assert.equal(r.calls.spawn.length,1);assert.ok(r.calls.spawn[0].args.some(v=>v.endsWith('centrale-server.cjs')));assert.equal(r.calls.browser.length,1);assert.equal(r.healthChecks,1);assert.ok(r.calls.mkdir.length);assert.ok(r.calls.messages.some(v=>v.includes('Gioco pronto con il motore contestuale')));assert.ok(!r.calls.messages.some(v=>v.includes('Gioco e IA pronti')));
  });
  await check('model still loading opens fallback after the bounded wait',async()=>{
    const r=await simulate({slowModel:true});assert.ifError(r.error);assert.equal(r.calls.spawn.length,2);assert.equal(r.calls.browser.length,1);assert.ok(r.healthChecks>=40);assert.ok(r.calls.messages.some(v=>v.includes('ancora in caricamento o non disponibile')));assert.ok(!r.calls.messages.some(v=>v.includes('Gioco e IA pronti')));
  });
  await check('healthy model preserves the normal launch',async()=>{
    const r=await simulate();assert.ifError(r.error);assert.equal(r.calls.browser.length,1);assert.ok(r.calls.messages.some(v=>v.includes('Gioco e IA pronti')));
  });
  await check('no-browser also applies to the fallback',async()=>{
    const r=await simulate({missingModel:true,noBrowser:true});assert.ifError(r.error);assert.equal(r.calls.browser.length,0);
  });
  for(const options of [{missingModel:true,webFails:true},{slowModel:true,webFails:true},{slowModel:true,httpError:true}])await check('failed web startup never announces a working game '+JSON.stringify(options),async()=>{
    const r=await simulate(options);assert.match(r.error?.message||'',/server del gioco non è raggiungibile/i);assert.equal(r.calls.browser.length,0);assert.ok(!r.calls.messages.some(v=>/Gioco pronto|Gioco e IA pronti|gioco è disponibile/.test(v)));
  });
  console.log(checks+' launcher checks passed; no real processes or services used');
})().catch(error=>{console.error(error);process.exitCode=1;});
