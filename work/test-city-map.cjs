const assert = require('node:assert/strict');
require('./city-map.js');
const map = globalThis.CityMap;
const connected=new Set(map.edges.flatMap(e=>[e.a+':'+e.b,e.b+':'+e.a]));
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS ' + name); }
const onRoad = p => map.edges.some(e => {
  const a = map.nodes[e.a], b = map.nodes[e.b];
  return Math.abs(Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(p.x-b.x,p.y-b.y)-e.length) < 0.0001;
});
test('expanded 3600x2400 city contains 204 intersections and five legal river bridges', () => {
  assert.equal(map.width,3600);assert.equal(map.height,2400);assert.equal(map.nodes.length,204);assert.equal(map.edges.length,368);
  assert.deepEqual(map.edges.filter(e => e.bridge).map(e => map.nodes[e.a].y), [260,630,1000,1600,2090]);
  assert(map.edges.every(e => e.bridge || !((map.nodes[e.a].x<1000&&map.nodes[e.b].x>1100)||(map.nodes[e.b].x<1000&&map.nodes[e.a].x>1100))));
});
test('all 70 legacy node IDs and first 119 edge IDs remain compatible with v4 saves',()=>{
 const xs=[70,250,430,610,790,930,1150,1320,1510,1720],ys=[90,260,440,630,820,1000,1130],expected=[];
 for(let row=0;row<ys.length;row++)for(let col=0;col<xs.length;col++){
  const id=row*10+col;assert.equal(map.nodes[id].x,xs[col]);assert.equal(map.nodes[id].y,ys[row]);assert.equal(map.nodes[id].id,id);
  if(col<9&&(col!==5||[1,3,5].includes(row)))expected.push(id+'-'+(id+1));
  if(row<6)expected.push(id+'-'+(id+10));
 }
 assert.equal(expected.length,119);assert.deepEqual(map.edges.slice(0,119).map(e=>e.id),expected);assert.equal(new Set(map.edges.map(e=>e.id)).size,map.edges.length);
});
test('no road enters either harbor basin or the coastal water',()=>{
 for(const edge of map.edges){const a=map.nodes[edge.a],b=map.nodes[edge.b];for(let i=0;i<=25;i++){const x=a.x+(b.x-a.x)*i/25,y=a.y+(b.y-a.y)*i/25;assert(!map.waterAreas.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h),'Road '+edge.id+' enters coastal water');}}
 assert(!map.edges.some(e=>map.nodes[e.a].y===2310&&map.nodes[e.b].y===2310&&map.nodes[e.a].x>=2400));
});
test('routing takes a legal bridge instead of crossing river directly', () => {
  const path = map.route(930,440,1150,440);
  assert(path.length > 2);
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i];
    assert(map.edges.some(e=>(e.a===a.nodeId&&e.b===b.nodeId)||(e.b===a.nodeId&&e.a===b.nodeId)));
    if(a.x===930&&b.x===1150) assert([260,630,1000,1600,2090].includes(a.y));
  }
});
test('closed bridge routes to next crossing; closing every bridge disconnects banks', () => {
  const bridges = map.edges.filter(e=>e.bridge);
  const path=map.route(930,260,1150,260,[bridges[0].id]);
  assert(path.some(p=>p.y===630));
  assert.deepEqual(map.route(930,440,1150,440,bridges.map(e=>e.id)),[]);
});
test('advance stays on roads for entire cross-city route and stops exactly at target', () => {
  const u = {x:70,y:90,angle:0,path:map.route(70,90,3410,2310),pathIndex:0};
  let arrived=false, samples=0;
  while(!arrived && samples<10000) { arrived=map.advance(u,.1,55); assert(onRoad(u)); assert(Number.isFinite(u.angle)); samples++; }
  assert(arrived); assert.equal(u.x,3410); assert.equal(u.y,2310);
  assert.equal(map.advance(u,100,100),true); assert.equal(u.x,3410);
});
test('large delta consumes corners without diagonal shortcuts', () => {
  const u={x:70,y:90,path:map.route(70,90,250,260)};
  const total=u.path.slice(1).reduce((s,n,i)=>s+Math.hypot(n.x-u.path[i].x,n.y-u.path[i].y),0);
  assert(!map.advance(u,1,total-1)); assert(onRoad(u));
  assert(map.advance(u,1,1)); assert.equal(u.x,250); assert.equal(u.y,260);
});
test('stationary, empty and same-node paths behave correctly',()=>{
  const a={x:70,y:90,path:[]}; assert.equal(map.advance(a,1,50),false);
  const b={x:70,y:90,path:map.route(70,90,70,90)}; assert.equal(map.advance(b,0,0),true);
  const c={x:70,y:90,path:map.route(70,90,250,90)}; assert.equal(map.advance(c,-1,50),false); assert.equal(c.x,70);
});
test('all 41,616 node pairs have legal shortest paths, compared with independent Floyd-Warshall',()=>{
  const n=map.nodes.length,dist=Array.from({length:n},()=>new Float64Array(n).fill(Infinity));
  for(let i=0;i<n;i++)dist[i][i]=0;for(const e of map.edges)dist[e.a][e.b]=dist[e.b][e.a]=e.length;
  for(let k=0;k<n;k++)for(let i=0;i<n;i++){if(!Number.isFinite(dist[i][k]))continue;for(let j=0;j<n;j++){const d=dist[i][k]+dist[k][j];if(d<dist[i][j])dist[i][j]=d;}}
  for(const a of map.nodes) for(const b of map.nodes) {
    const path=map.route(a.x,a.y,b.x,b.y); assert(path.length); assert.equal(path[0].nodeId,a.id); assert.equal(path.at(-1).nodeId,b.id);
    let length=0;for(let i=1;i<path.length;i++){assert(connected.has(path[i-1].nodeId+':'+path[i].nodeId));length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);}assert.equal(length,dist[a.id][b.id]);
  }
});
test('new district patrol endpoints and four external incident sites lie on connected roads',()=>{
 assert.equal(map.outerLocations.length,4);
 for(const site of map.outerLocations){const n=map.nodes[map.nearest(site.x,site.y)];assert.equal(n.x,site.x);assert.equal(n.y,site.y);assert(site.x>1800||site.y>1200);assert(map.edges.some(e=>(e.a===n.id||e.b===n.id)&&site.address.includes(e.name)));assert(map.route(430,440,site.x,site.y).length);}
 for(const points of Object.values(map.patrolRoutes))for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],n=map.nodes[map.nearest(...a)];assert.equal(n.x,a[0]);assert.equal(n.y,a[1]);assert(map.route(...a,...b).length);}
});
test('camera transforms round trip at multiple zoom levels',()=>{
  for(const zoom of [.4,.8,1.5,2.4]) { const v={x:830,y:577,zoom},p=map.worldToScreen(1222,891,900,650,v),w=map.screenToWorld(p.x,p.y,900,650,v); assert(Math.abs(w.x-1222)<1e-9); assert(Math.abs(w.y-891)<1e-9); }
});
test('opposing traffic uses distinct right lanes without altering graph positions',()=>{
  const east={id:'P01',x:500,y:440,angle:0,phase:'In viaggio'},west={id:'P02',x:500,y:440,angle:Math.PI,phase:'Pattugliamento'};
  const a=map.getUnitDisplayPosition(east),b=map.getUnitDisplayPosition(west);
  assert.equal(a.y,447); assert.equal(b.y,433); assert.equal(east.y,440); assert.equal(west.y,440);
  const north=map.getUnitDisplayPosition({...east,angle:-Math.PI/2}); assert.equal(north.x,507); assert.equal(north.y,440);
});
test('parked units at the same node occupy separate stable curb bays',()=>{
  const fleet=['P01','M01','V01'].map(id=>({id,x:430,y:630,angle:0,phase:'Sul posto'}));
  const positions=fleet.map(u=>map.getUnitDisplayPosition(u,fleet));
  assert.equal(new Set(positions.map(p=>p.x+','+p.y)).size,3); assert(positions.every(p=>p.y===649));
  for(let i=0;i<fleet.length;i++) assert.deepEqual(map.getUnitDisplayPosition(fleet[i],[...fleet].reverse()),positions[i]);
  assert(fleet.every(u=>u.x===430&&u.y===630));
});
test('expanded map rasterizes once and blits only the visible area with new landmark labels',()=>{
 let creations=0;const texts=[],copies=[];
 const offctx=new Proxy({measureText:t=>({width:t.length*6}),fillText:t=>texts.push(t)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 global.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;creations++;}getContext(){return offctx;}};
 const screen=new Proxy({measureText:t=>({width:t.length*6}),drawImage:(...args)=>copies.push(args)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 map.draw(screen,800,600,{x:3150,y:1840,zoom:1});map.draw(screen,800,600,{x:3150,y:2090,zoom:1});
 assert.equal(creations,1);assert.equal(copies.length,2);assert.equal(copies[0][0].width,4500);assert.equal(copies[0][0].height,3000);assert(copies.every(a=>a.length===9&&a[3]<4500&&a[4]<3000&&a[1]>=0&&a[2]>=0&&a[1]+a[3]<=4500&&a[2]+a[4]<=3000));
 for(const name of ['BELLAVISTA','PARCO DELLE COLLINE','SCALO MERCI','PORTO NUOVO','SCUOLA BELLINI','ACCESSO BANCHINA 4'])assert(texts.includes(name),name);
 delete global.OffscreenCanvas;
});
test('canvas drawing and three detailed vehicle thumbnails have valid output',()=>{
  const ctx=new Proxy({measureText:t=>({width:t.length*6})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  const units=['Polizia','Sanitario','Vigili del fuoco'].map((type,i)=>({id:'UNIT '+i,type,x:70+180*i,y:90,angle:0,phase:'patrol',path:map.route(70+180*i,90,930,630),pathIndex:0}));
  map.draw(ctx,1100,750,{x:900,y:600,zoom:.7},units,[{id:'EV-1',x:930,y:440,priority:1}],{unitId:'UNIT 0',caseId:'EV-1'},1.4);
  for(const type of ['Polizia','Sanitario','Vigili del fuoco']) { const svg=map.vehicleSVG(type); assert(svg.startsWith('<svg')); assert(svg.endsWith('</svg>')); assert(svg.includes('aria-label=')); }
});
console.log(tests+' map checks passed.');
