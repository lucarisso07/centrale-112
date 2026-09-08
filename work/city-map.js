(function (global) {
  'use strict';
  const WORLD_W = 3600, WORLD_H = 2400;
  const XS = [70, 250, 430, 610, 790, 930, 1150, 1320, 1510, 1720];
  const YS = [90, 260, 440, 630, 820, 1000, 1130];
  const BRIDGES = new Set([1, 3, 5]);
  const nodes = [], edges = [], graph = [], index = new Map();
  const avenueNames = ['Via delle Mura', 'Via Manzoni', 'Corso della Repubblica', 'Via Roma', 'Viale Dante', 'Viale Europa', 'Lungofiume Est', 'Via delle Acacie', 'Viale dell’Industria', 'Via del Porto'];
  const streetNames = ['Via dei Tigli', 'Corso Vittorio', 'Via San Marco', 'Via della Stazione', 'Via del Parco', 'Viale della Libertà', 'Via delle Officine'];
  const ALL_XS = [...XS, 1940, 2170, 2400, 2650, 2900, 3150, 3410];
  const ALL_YS = [...YS, 1360, 1600, 1840, 2090, 2310];
  const ALL_BRIDGES = new Set([...BRIDGES, 8, 10]);
  const ALL_AVENUES = [...avenueNames, 'Viale della Rinascita', 'Viale dei Platani', 'Via del Naviglio', 'Viale delle Darsene', 'Via dei Cantieri', 'Viale dello Scalo', 'Via della Dogana'];
  const ALL_STREETS = [...streetNames, 'Viale dei Colli', 'Viale dei Magazzini', 'Via della Pineta', 'Viale del Porto Nuovo', 'Via del Litorale'];
  for (let y = 0; y < YS.length; y++) for (let x = 0; x < XS.length; x++) {
    const id = nodes.length; nodes.push({ id, x: XS[x], y: YS[y], col: x, row: y }); graph.push([]); index.set(x + ',' + y, id);
  }
  // Append to the v4 graph: its first 70 node IDs and all original edge IDs stay unchanged.
  for(let row=0;row<ALL_YS.length;row++)for(let col=0;col<ALL_XS.length;col++){
    if(index.has(col+','+row))continue;
    const id=nodes.length;nodes.push({id,x:ALL_XS[col],y:ALL_YS[row],col,row});graph.push([]);index.set(col+','+row,id);
  }
  function addEdge(a, b, bridge, name, major) {
    const A = nodes[a], B = nodes[b], length = Math.hypot(B.x - A.x, B.y - A.y);
    const edge = { id: a + '-' + b, a, b, from: a, to: b, bridge: !!bridge, name, length, width: major || bridge ? 30 : 22 };
    edges.push(edge); graph[a].push({ to: b, edge }); graph[b].push({ to: a, edge });
  }
  for (let y = 0; y < YS.length; y++) for (let x = 0; x < XS.length; x++) {
    if (x < XS.length - 1 && (x !== 5 || BRIDGES.has(y))) addEdge(index.get(x + ',' + y), index.get((x + 1) + ',' + y), x === 5, streetNames[y], y === 1 || y === 3 || y === 5);
    if (y < YS.length - 1) addEdge(index.get(x + ',' + y), index.get(x + ',' + (y + 1)), false, avenueNames[x], x === 2 || x === 8);
  }
  for(let row=0;row<ALL_YS.length;row++)for(let col=0;col<ALL_XS.length;col++){
    const a=index.get(col+','+row);
    if(col<ALL_XS.length-1&&(row>=YS.length||col>=XS.length-1)&&(col!==5||ALL_BRIDGES.has(row))&&!(row===11&&col>=12))addEdge(a,index.get((col+1)+','+row),col===5,ALL_STREETS[row],row===8||row===10||row===3);
    if(row<ALL_YS.length-1&&(row>=YS.length-1||col>=XS.length))addEdge(a,index.get(col+','+(row+1)),false,ALL_AVENUES[col],col===2||col===8||col===10||col===13||col===15);
  }
  function nearest(x, y) {
    let best = 0, dist = Infinity;
    for (const node of nodes) { const d = (x - node.x) ** 2 + (y - node.y) ** 2; if (d < dist) { dist = d; best = node.id; } }
    return best;
  }
  function route(fromX, fromY, toX, toY, blockedEdgeIds = []) {
    const start = nearest(fromX, fromY), end = nearest(toX, toY);
    const blocked = new Set(blockedEdgeIds), distance = new Float64Array(nodes.length).fill(Infinity), previous = new Int32Array(nodes.length).fill(-1), visited = new Uint8Array(nodes.length), heap=[];
    const estimate=id=>Math.abs(nodes[id].x-nodes[end].x)+Math.abs(nodes[id].y-nodes[end].y);
    const push=(id,cost)=>{const item={id,cost,score:cost+estimate(id)};let at=heap.length;heap.push(item);while(at>0){const parent=(at-1)>>1;if(heap[parent].score<=item.score)break;heap[at]=heap[parent];at=parent;}heap[at]=item;};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let child=at*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[at]=heap[child];at=child;}heap[at]=last;}return first;};
    distance[start]=0;push(start,0);
    while(heap.length){
      const item=pop(),current=item.id;if(visited[current]||item.cost!==distance[current])continue;if(current===end)break;visited[current]=1;
      for(const link of graph[current]){if(blocked.has(link.edge.id)||visited[link.to])continue;const nextDistance=item.cost+link.edge.length;if(nextDistance<distance[link.to]){distance[link.to]=nextDistance;previous[link.to]=current;push(link.to,nextDistance);}}
    }
    if (!Number.isFinite(distance[end])) return [];
    const path = []; let cursor = end;
    while (cursor !== -1) { const n = nodes[cursor]; path.unshift({ x: n.x, y: n.y, nodeId: n.id }); if (cursor === start) break; cursor = previous[cursor]; }
    return path;
  }
  function advance(unit, dt, speed) {
    if (!unit.path || !unit.path.length) return false;
    if (!Number.isFinite(unit.pathIndex) || unit.pathIndex < 0) unit.pathIndex = 0;
    let travel = Math.max(0, Number(dt) || 0) * Math.max(0, Number(speed) || 0);
    while (unit.pathIndex < unit.path.length) {
      const target = unit.path[unit.pathIndex], dx = target.x - unit.x, dy = target.y - unit.y, d = Math.hypot(dx, dy);
      if (d < 0.001) { unit.x = target.x; unit.y = target.y; unit.pathIndex++; continue; }
      if (travel <= 0) return false;
      unit.angle = Math.atan2(dy, dx);
      if (travel >= d) { unit.x = target.x; unit.y = target.y; unit.pathIndex++; travel -= d; }
      else { unit.x += dx / d * travel; unit.y += dy / d * travel; return false; }
    }
    return true;
  }
  function roadName(x, y) {
    let best = null, d = Infinity;
    for (const edge of edges) {
      const a = nodes[edge.a], b = nodes[edge.b], vx = b.x - a.x, vy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy)));
      const dd = Math.hypot(x - a.x - vx * t, y - a.y - vy * t);
      if (dd < d) { d = dd; best = edge; }
    }
    return best ? best.name : 'Valdora';
  }
  function screenToWorld(px, py, w, h, view) { const z = view.zoom || 1; return { x: (px - w / 2) / z + view.x, y: (py - h / 2) / z + view.y }; }
  function worldToScreen(x, y, w, h, view) { return { x: (x - view.x) * view.zoom + w / 2, y: (y - view.y) * view.zoom + h / 2 }; }
  let seed = 91851;
  function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function rounded(ctx, x, y, w, h, radius, fill, stroke) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, color, width) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  function tree(ctx, x, y, radius = 7) {
    ctx.beginPath(); ctx.ellipse(x + 2.7, y + 3.3, radius + 1.5, radius, 0, 0, Math.PI * 2); ctx.fillStyle = '#0a1516'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = '#29413c'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - radius * .2, y - radius * .3, radius * .66, 0, Math.PI * 2); ctx.fillStyle = '#324e45'; ctx.fill();
  }
  function building(ctx, x, y, w, h, industrial = false) {
    if (w < 14 || h < 14) return;
    const palette = industrial ? ['#37434c', '#3d494f', '#313d46'] : ['#344048', '#3a434b', '#414951', '#303e45', '#3c4549'];
    rounded(ctx, x + 4, y + 6, w, h, 2, '#111b23');
    rounded(ctx, x, y, w, h, 1.5, palette[Math.floor(rand() * palette.length)], '#59636b'); ctx.lineWidth = 1;
    line(ctx, x + 2, y + 2, x + w - 2, y + 2, '#687179', .7);
    rounded(ctx, x + 3, y + 3, w - 6, h - 6, 1, null, '#222e37');
    if (industrial) {
      for (let roof = x + 9; roof < x + w - 7; roof += 14) line(ctx, roof, y + 5, roof, y + h - 5, '#1f303b', 2);
    } else if (w > 29 && h > 25) {
      rounded(ctx, x + w * .28, y + h * .23, w * .4, h * .43, 1, '#303a42', '#4d5961');
      rounded(ctx, x + w - 12, y + 6, 6, 7, 1, '#6b777d');
    }
    for (let t = x + 5; t < x + w - 3; t += 8) {
      const lit = rand() > .62; ctx.fillStyle = lit ? '#b4a679' : '#647078'; ctx.fillRect(t, y + h - 2.5, 3, 1.3);
    }
  }
  function parking(ctx, x, y, w, h) {
    rounded(ctx, x, y, w, h, 1, '#1c2932', '#3f4b53');
    for (let at = x + 4; at < x + w - 8; at += 10) {
      line(ctx, at, y + 3, at, y + 15, '#49545c', .7);
      if (rand() > .35) rounded(ctx, at + 2, y + 5, 5, 9, 1, ['#647885', '#979a8f', '#425c6d', '#784e4d'][Math.floor(rand() * 4)]);
      if (h > 39) { line(ctx, at, y + h - 3, at, y + h - 15, '#49545c', .7); if (rand() > .5) rounded(ctx, at + 2, y + h - 13, 5, 9, 1, '#596a72'); }
    }
  }
  function park(ctx, x, y, w, h, formal) {
    rounded(ctx, x, y, w, h, 5, '#21382f', '#365044');
    line(ctx, x + 10, y + h * .5, x + w - 10, y + h * .5, '#676656', formal ? 5 : 3);
    line(ctx, x + w * .5, y + 8, x + w * .5, y + h - 8, '#676656', formal ? 5 : 3);
    if (formal) { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * .18, 0, Math.PI * 2); ctx.fillStyle = '#1d4750'; ctx.fill(); ctx.strokeStyle = '#6b7770'; ctx.lineWidth = 4; ctx.stroke(); }
    for (let i = 0; i < w * h / 340; i++) { const tx = x + 10 + rand() * (w - 20), ty = y + 10 + rand() * (h - 20); if (Math.abs(tx - x - w / 2) > 10 && Math.abs(ty - y - h / 2) > 9) tree(ctx, tx, ty, 5 + rand() * 4); }
  }
  function landmark(ctx, x, y, w, h, kind) {
    rounded(ctx, x, y, w, h, 3, '#26343d', '#47565f');
    parking(ctx, x + 7, y + h - 29, w - 14, 22);
    if (kind === 'hospital') {
      building(ctx, x + 18, y + 13, w - 36, h - 53);
      ctx.fillStyle = '#50756e'; ctx.fillRect(x + w / 2 - 11, y + h / 2 - 19, 22, 22); ctx.fillStyle = '#c7dfd3'; ctx.fillRect(x + w / 2 - 7, y + h / 2 - 11, 14, 5); ctx.fillRect(x + w / 2 - 2, y + h / 2 - 16, 4, 15);
    } else if (kind === 'police') {
      building(ctx, x + 15, y + 12, w - 30, h - 49); ctx.fillStyle = '#456c87'; ctx.fillRect(x + 20, y + 18, w - 40, 8);
      for (let i = 0; i < 3; i++) rounded(ctx, x + 20 + i * 20, y + h - 23, 13, 6, 2, '#79a9c8');
    } else if (kind === 'fire') {
      building(ctx, x + 11, y + 8, w - 22, h - 43, true);
      for (let i = 0; i < 4; i++) { rounded(ctx, x + 18 + i * (w - 36) / 4, y + h - 42, (w - 44) / 4, 11, 1, '#75564f'); }
    } else {
      building(ctx, x + 8, y + 9, w - 16, 29, true);
      for (let track = y + 50; track < y + h - 31; track += 11) { line(ctx, x + 2, track, x + w - 2, track, '#7b827d', 1); line(ctx, x + 2, track + 4, x + w - 2, track + 4, '#7b827d', 1); for (let t = x + 5; t < x + w; t += 7) line(ctx, t, track - 2, t, track + 6, '#444e4f', 2); }
    }
  }
  const LANDMARKS = [
    { col: 3, row: 3, kind: 'hospital', name: 'OSPEDALE SAN LUCA', color: '#9ecdb9' },
    { col: 6, row: 3, kind: 'police', name: 'QUESTURA', color: '#96bcde' },
    { col: 8, row: 5, kind: 'fire', name: 'DISTACCAMENTO VVF', color: '#d5a291' },
    { col: 8, row: 2, kind: 'station', name: 'STAZIONE CENTRALE', color: '#b5c0c6' }
  ];
  const coastalBasins=[{x:2675,y:2130,w:200,h:270},{x:2925,y:2130,w:200,h:270}];
  const districts=[{id:'centro',name:'Centro storico',x:430,y:440},{id:'bellavista',name:'Bellavista',x:2170,y:630},{id:'colline',name:'Parco delle Colline',x:430,y:1840},{id:'scalo',name:'Scalo merci',x:3150,y:1600},{id:'porto',name:'Porto Nuovo',x:2900,y:2090}];
  const outerLocations=[
    {id:'school_bellini',name:'Scuola Bellini',x:1940,y:630,address:'Viale della Rinascita · Scuola Bellini · ingresso principale',district:'Bellavista'},
    {id:'park_colline',name:'Parco delle Colline',x:430,y:1840,address:'Via della Pineta · Parco delle Colline · ingresso est',district:'Parco delle Colline'},
    {id:'freight_gate',name:'Scalo merci · cancello 2',x:3150,y:1600,address:'Viale dei Magazzini · scalo merci · cancello 2',district:'Scalo merci'},
    {id:'harbor_4',name:'Porto Nuovo · banchina 4',x:2900,y:2090,address:'Viale del Porto Nuovo · accesso banchina 4 · Via dei Cantieri',district:'Porto Nuovo'}
  ];
  const patrolRoutes={
    bellavista:[[1940,260],[2400,440],[2170,1000],[1940,1360],[1720,820]],
    porto:[[2650,1600],[2900,2090],[3410,2310],[3150,1840],[2400,1600]],
    colline:[[790,1360],[430,1840],[70,2090],[790,2310],[930,2090],[1150,1600]]
  };
  function residentialBlock(ctx,x,y,w,h){
    rounded(ctx,x,y,w,h,3,'#23372f','#3c5145');
    const cols=w>200?3:2,rows=h>180?3:2,cw=w/cols,ch=h/rows;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const lx=x+col*cw,ly=y+row*ch,hx=lx+cw*.22,hy=ly+ch*.25,hw=Math.min(36,cw*.56),hh=Math.min(32,ch*.45);
      ctx.strokeStyle='#52604c';ctx.lineWidth=.8;ctx.strokeRect(lx+3,ly+3,cw-6,ch-6);
      rounded(ctx,hx+3,hy+5,hw,hh,2,'#152321');rounded(ctx,hx,hy,hw,hh,1,'#756255','#a18b71');
      ctx.fillStyle='#625347';ctx.fillRect(hx+hw/2,hy+1,hw/2-1,hh-2);line(ctx,hx+hw/2,hy,hx+hw/2,hy+hh,'#a08c73',1.5);
      ctx.fillStyle='#c1b183';ctx.fillRect(hx+3,hy+hh-2,4,1.5);ctx.fillRect(hx+hw-8,hy+hh-2,4,1.5);
      line(ctx,hx+hw*.5,hy+hh,hx+hw*.5,ly+ch-4,'#58655b',4);tree(ctx,lx+cw*.82,ly+ch*.78,5+rand()*3);
      if(rand()>.5)rounded(ctx,lx+6,ly+ch-15,6,11,1.5,'#788990');
    }
  }
  function schoolBlock(ctx,x,y,w,h){
    rounded(ctx,x,y,w,h,3,'#304239','#51675b');building(ctx,x+10,y+8,w-20,35);building(ctx,x+10,y+47,36,h-58);building(ctx,x+w-43,y+48,31,39);
    rounded(ctx,x+59,y+61,w-110,h-76,2,'#486658','#829386');
    ctx.strokeStyle='#bcc7ac';ctx.lineWidth=1;ctx.strokeRect(x+64,y+66,w-120,h-86);line(ctx,x+64,y+61+(h-76)/2,x+w-56,y+61+(h-76)/2,'#bbc5aa',.8);
    for(let t=x+55;t<x+w-10;t+=22)tree(ctx,t,y+h-5,4);
  }
  function freightBlock(ctx,x,y,w,h){
    rounded(ctx,x,y,w,h,2,'#25343b','#4b6068');building(ctx,x+8,y+9,w-16,37,true);
    for(let rail=y+62;rail<y+h-12;rail+=24){
      line(ctx,x+3,rail,x+w-3,rail,'#a1aaa3',1.5);line(ctx,x+3,rail+6,x+w-3,rail+6,'#a1aaa3',1.5);
      for(let tie=x+5;tie<x+w;tie+=8)line(ctx,tie,rail-3,tie,rail+9,'#596761',2);
      if(rand()>.2)for(let carriage=x+19;carriage<x+w-35;carriage+=46){rounded(ctx,carriage,rail-5,39,16,2,'#655945','#a99c7f');line(ctx,carriage+4,rail-3,carriage+4,rail+9,'#3a494a',1);}
    }
  }
  function cargoBlock(ctx,x,y,w,h){
    rounded(ctx,x,y,w,h,2,'#293c42','#657573');
    const palette=['#785d4c','#506d69','#6d7555','#4e667b'];
    for(let row=y+9;row<y+h-27;row+=34)for(let col=x+8;col<x+w-35;col+=43){rounded(ctx,col+3,row+3,35,22,1,'#10252d');rounded(ctx,col,row,35,22,1,palette[Math.floor(rand()*palette.length)],'#94a098');for(let crease=col+5;crease<col+32;crease+=6)line(ctx,crease,row+2,crease,row+20,'#253d4266',1);}
    line(ctx,x+4,y+h-9,x+w-4,y+h-9,'#c6b877',1);for(let lane=x+12;lane<x+w-20;lane+=48)rounded(ctx,lane,y+h-17,26,7,1,'#adb2a3');
  }
  function ship(ctx,x,y,len,color){
    ctx.beginPath();ctx.moveTo(x-25,y+len/2);ctx.lineTo(x-31,y-len/2+22);ctx.quadraticCurveTo(x-28,y-len/2,x,y-len/2-13);ctx.quadraticCurveTo(x+28,y-len/2,x+31,y-len/2+22);ctx.lineTo(x+25,y+len/2);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#a9b7b3';ctx.lineWidth=2;ctx.stroke();
    rounded(ctx,x-20,y+len/2-28,40,20,2,'#b4bcb6','#d7d8c5');for(let row=y-len/2+28;row<y+len/2-40;row+=24){rounded(ctx,x-21,row,19,20,1,'#ae7b56');rounded(ctx,x+2,row,19,20,1,'#719184');}
    ctx.fillStyle='#253e4c';ctx.fillRect(x-14,y+len/2-20,28,5);
  }
  function paintOuterDistricts(ctx){
    ctx.fillStyle='#183d4b';ctx.fillRect(0,2350,WORLD_W,50);line(ctx,0,2350,WORLD_W,2350,'#5a7370',7);
    for(let row=0;row<ALL_YS.length-1;row++)for(let col=0;col<ALL_XS.length-1;col++){
      if((row<YS.length-1&&col<XS.length-1)||col===5)continue;
      const x=ALL_XS[col]+24,y=ALL_YS[row]+24,w=ALL_XS[col+1]-x-24,h=ALL_YS[row+1]-y-24;
      if(row===10&&col>=12){if(col===12||col===15)cargoBlock(ctx,x,y,w,h);continue;}
      if(col===10&&row===2){schoolBlock(ctx,x,y,w,h);continue;}
      if((col===14||col===15)&&row===7){freightBlock(ctx,x,y,w,h);continue;}
      if(col<=2&&(row===8||row===9)){park(ctx,x,y,w,h,col===1&&row===8);continue;}
      if(row===10&&col<5){rounded(ctx,x,y,w,h,2,'#364535','#596a4b');for(let orchard=x+12;orchard<x+w-8;orchard+=22)for(let ty=y+10;ty<y+h-8;ty+=25)tree(ctx,orchard,ty,4);continue;}
      if((col===10||col===11)&&row<6||col>=6&&col<=10&&row>=7||col===3&&row===7){residentialBlock(ctx,x,y,w,h);continue;}
      if(col>=12&&row>=8){cargoBlock(ctx,x,y,w,h);continue;}
      if(col===9&&row===1||col===11&&row===6||col===4&&row===8){park(ctx,x,y,w,h,true);continue;}
      if(col===4&&row===7){building(ctx,x+5,y+5,w-10,h*.35);building(ctx,x+5,y+h*.43,w*.35,h*.52);park(ctx,x+w*.44,y+h*.43,w*.5,h*.52,false);continue;}
      building(ctx,x+4,y+4,w*.61,h-10,col>=12);parking(ctx,x+w*.69,y+4,w*.29,h-10);for(let treeY=y+10;treeY<y+h;treeY+=31)tree(ctx,x+w*.65,treeY,4.4);
    }
    for(const basin of coastalBasins){ctx.fillStyle='#567270';ctx.fillRect(basin.x-5,basin.y-5,basin.w+10,basin.h+5);ctx.fillStyle='#183f4d';ctx.fillRect(basin.x,basin.y,basin.w,basin.h);for(let ripple=basin.y+20;ripple<basin.y+basin.h;ripple+=28)line(ctx,basin.x+15,ripple,basin.x+basin.w-15,ripple+2,'#275566',.8);}
    ship(ctx,2775,2260,162,'#5c7980');ship(ctx,3025,2260,120,'#7c8e86');
    for(const craneX of [2652,2901,3148])for(const craneY of [2170,2290]){line(ctx,craneX-8,craneY+5,craneX+8,craneY+5,'#a5a083',4);line(ctx,craneX,craneY,craneX+45,craneY-37,'#8c987e',4);line(ctx,craneX,craneY,craneX+45,craneY-6,'#c2b177',2);line(ctx,craneX+45,craneY-37,craneX+45,craneY-6,'#6c8a87',1);}
    for(let y=1250;y<2325;y+=49)if(ALL_YS.every(yy=>Math.abs(yy-y)>30)){tree(ctx,952,y,5.4);tree(ctx,1134,y+4,4.8);}
  }
  function paintOuterLabels(ctx){
    ctx.textAlign='center';ctx.font='600 15px system-ui, sans-serif';ctx.fillStyle='#7faaa0';
    for(const label of [{x:2190,y:176,text:'BELLAVISTA'},{x:355,y:1743,text:'PARCO DELLE COLLINE'},{x:3150,y:1450,text:'SCALO MERCI'},{x:2980,y:2047,text:'PORTO NUOVO'},{x:714,y:1500,text:'CAMPUS SAN MICHELE'}]){const w=ctx.measureText(label.text).width;rounded(ctx,label.x-w/2-9,label.y-16,w+18,23,3,'#15292dde');ctx.fillText(label.text,label.x,label.y);}
    ctx.font='600 10px system-ui, sans-serif';ctx.fillStyle='#c3d2bc';ctx.fillText('SCUOLA BELLINI',2055,538);ctx.fillText('CANCELLO 2 · SCALO MERCI',3150,1626);ctx.fillText('ACCESSO BANCHINA 4',2900,2115);ctx.fillText('INGRESSO EST · PARCO',484,1863);ctx.fillStyle='#a8bca7';ctx.fillText('ORTI DELLA DORA',537,2243);
    ctx.font='9px system-ui, sans-serif';ctx.fillStyle='#9db4bc';
    for(let row=0;row<ALL_YS.length;row++){if(row<YS.length)ctx.fillText(ALL_STREETS[row].toUpperCase(),2277,ALL_YS[row]-5);else{ctx.fillText(ALL_STREETS[row].toUpperCase(),1690,ALL_YS[row]-5);if(row!==11)ctx.fillText(ALL_STREETS[row].toUpperCase(),2780,ALL_YS[row]-5);}}
    for(let col=10;col<ALL_XS.length;col++)for(const labelY of [356,1238,1940]){ctx.save();ctx.translate(ALL_XS[col]-5,labelY);ctx.rotate(-Math.PI/2);ctx.fillText(ALL_AVENUES[col].toUpperCase(),0,0);ctx.restore();}
    ctx.save();ctx.translate(1050,1880);ctx.rotate(-Math.PI/2);ctx.font='italic 15px Georgia';ctx.fillStyle='#66909b';ctx.fillText('Fiume Dora',0,0);ctx.restore();ctx.font='italic 15px Georgia';ctx.fillStyle='#75979f';ctx.fillText('Darsena di Valdora',1840,2381);
  }
  function paintBase(ctx) {
    seed = 91851;
    ctx.fillStyle = '#14232b'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let y = 0; y < WORLD_H; y += 60) for (let x = 0; x < WORLD_W; x += 60) { ctx.fillStyle = rand() > .5 ? '#17262d' : '#15252c'; ctx.fillRect(x, y, 59, 59); }
    // A continuous river separates the two banks; only three road edges span it.
    ctx.beginPath(); ctx.moveTo(988, -20); ctx.bezierCurveTo(948, 270, 1018, 500, 987, 710); ctx.bezierCurveTo(968, 870, 974, 1040, 1006, 1220);ctx.bezierCurveTo(1030,1400,1007,1600,980,1840);ctx.bezierCurveTo(958,2040,960,2220,1002,2420);ctx.lineTo(1114,2420);ctx.bezierCurveTo(1075,2200,1080,2060,1103,1840);ctx.bezierCurveTo(1125,1640,1141,1440,1116,1220); ctx.bezierCurveTo(1089, 1050, 1082, 870, 1104, 700); ctx.bezierCurveTo(1136, 470, 1070, 250, 1110, -20); ctx.closePath();
    ctx.fillStyle = '#173b4a'; ctx.fill(); ctx.strokeStyle = '#3a535a'; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = '#244c59'; ctx.lineWidth = 5; ctx.stroke();
    for (let i = 0; i < 95; i++) { const x = 1004 + rand() * 70, y = rand() * WORLD_H; line(ctx, x, y, x + 3 + rand() * 12, y + 1, '#22505c', .7); }
    // Blocks are individually built, with courtyards, parked cars and public places.
    for (let row = 0; row < YS.length - 1; row++) for (let col = 0; col < XS.length - 1; col++) {
      if (col === 5) continue;
      const x = XS[col] + 23, y = YS[row] + 23, w = XS[col + 1] - x - 23, h = YS[row + 1] - y - 23;
      const marked = LANDMARKS.find(p => p.col === col && p.row === row);
      if (marked) { landmark(ctx, x + 3, y + 3, w - 6, h - 6, marked.kind); continue; }
      if ((col === 2 && row === 1) || ((col === 6 || col === 7) && row === 4) || (col === 0 && row === 4)) { park(ctx, x + 3, y + 3, w - 6, h - 6, col === 2); continue; }
      const industrial = col >= 8 || (col >= 6 && row >= 5);
      if (industrial) {
        building(ctx, x + 4, y + 4, w * .6, h - 12, true); parking(ctx, x + w * .67, y + 6, w * .3, h - 15);
      } else {
        const gap = 11, half = (w - gap) / 2, third = (h - gap) / 2;
        building(ctx, x + 3, y + 2, half - 5, third - 1); building(ctx, x + half + gap, y + 2, half - 4, third - 1);
        if (rand() > .28) building(ctx, x + 3, y + third + gap, half - 5, third - 3); else park(ctx, x + 3, y + third + gap, half - 5, third - 3, false);
        building(ctx, x + half + gap, y + third + gap, half - 4, third - 3);
      }
      for (let tx = x + 9; tx < x + w; tx += 36) { if (rand() > .2) tree(ctx, tx, y - 6, 4.3); if (rand() > .3) tree(ctx, tx, y + h + 6, 4.1); }
    }
    paintOuterDistricts(ctx);
    for (const edge of edges) {
      const a = nodes[edge.a], b = nodes[edge.b];
      if (edge.bridge) { line(ctx, a.x + 17, a.y + 4, b.x - 17, b.y + 4, '#081a22', edge.width + 13); line(ctx, a.x + 16, a.y, b.x - 16, b.y, '#7d8584', edge.width + 8); }
      line(ctx, a.x, a.y, b.x, b.y, '#4e5b62', edge.width + 3); line(ctx, a.x, a.y, b.x, b.y, '#202f39', edge.width);
    }
    for (const node of nodes) { ctx.fillStyle = '#202f39'; ctx.fillRect(node.x - 14, node.y - 14, 28, 28); }
    ctx.setLineDash([6, 9]);
    for (const edge of edges) {
      const a = nodes[edge.a], b = nodes[edge.b], horizontal = a.y === b.y;
      line(ctx, a.x + (horizontal ? 22 : 0), a.y + (horizontal ? 0 : 22), b.x - (horizontal ? 22 : 0), b.y - (horizontal ? 0 : 22), edge.bridge ? '#788789' : '#55646c', .8);
    }
    ctx.setLineDash([]);
    for (const node of nodes) {
      // Zebra crossings leave the centre of the junction clear.
      if (node.row === 1 || node.row === 3 || node.col === 2 || node.col === 8) {
        ctx.fillStyle = '#617079';
        for (let s = -8; s <= 8; s += 4) {
          if (graph[node.id].some(e=>nodes[e.to].x<node.x)) ctx.fillRect(node.x - 22, node.y + s, 5, 2);
          if (graph[node.id].some(e=>nodes[e.to].x>node.x)) ctx.fillRect(node.x + 17, node.y + s, 5, 2);
          if (node.row > 0) ctx.fillRect(node.x + s, node.y - 22, 2, 5);
          if (node.row < ALL_YS.length-1) ctx.fillRect(node.x + s, node.y + 17, 2, 5);
        }
      }
      ctx.fillStyle = '#c5b57c'; ctx.fillRect(node.x - 19, node.y - 19, 1.7, 1.7);
    }
    // Sparse waterfront trees and moorings reinforce scale without hiding roads.
    for (let y = 125; y < 1160; y += 40) { if (YS.every(yy => Math.abs(yy - y) > 27)) { tree(ctx, 956, y, 5); tree(ctx, 1128, y + 4, 5); } }
    for (let y = 855; y < 970; y += 23) { line(ctx, 1108, y, 1080, y, '#566c70', 4); rounded(ctx, 1087, y + 6, 13, 6, 3, '#7d9397'); }
    // Pedestrian bridge 3 is a footpath only: it adds no edge to the vehicle graph.
    line(ctx, 960, 954, 1127, 954, '#0b1d25', 14);
    line(ctx, 960, 950, 1127, 950, '#889185', 11);
    line(ctx, 960, 950, 1127, 950, '#6f7f77', 7);
    for(let x=965;x<1124;x+=9)line(ctx,x,946,x,954,'#a3aa97',.8);
    line(ctx,960,944,1127,944,'#a2b3ad',1.3);line(ctx,960,956,1127,956,'#a2b3ad',1.3);
    for(const x of [961,1126]){rounded(ctx,x-2,943,4,4,1,'#c1c7ad');rounded(ctx,x-2,953,4,4,1,'#c1c7ad');}
    line(ctx,1127,950,1132,975,'#707c6c',3);line(ctx,1127,950,1177,950,'#707c6c',3);line(ctx,1177,950,1235,950,'#707c6c',3);line(ctx,1235,950,1235,911,'#707c6c',3);
    for(let y=944;y<957;y+=4){ctx.fillStyle='#7b8b82';ctx.fillRect(1142,y,16,1.7);}
    rounded(ctx,1124,971,10,3,1,'#b7624f');line(ctx,1126,974,1126,976,'#b2a086',1);line(ctx,1132,974,1132,976,'#b2a086',1);
    rounded(ctx,1274,850,14,12,2,'#826c4d','#b8a37b');line(ctx,1272,849,1290,849,'#a8b193',3);
    line(ctx,1313,836,1327,836,'#66977e',3);
    ctx.save(); ctx.translate(1047, 485); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = 'italic 15px Georgia'; ctx.fillStyle = '#54818d'; ctx.fillText('Fiume Dora', 0, 0); ctx.restore();
    const districts = [{x:330,y:39,text:'CENTRO STORICO'},{x:709,y:53,text:'SAN LUCA'},{x:1400,y:53,text:'BORGO EST'},{x:351,y:1174,text:'QUARTIERE GIARDINI'},{x:1460,y:1174,text:'ZONA INDUSTRIALE'}];
    ctx.textAlign = 'center'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = '#5c737d';
    for (const d of districts) ctx.fillText(d.text, d.x, d.y);
    ctx.font = '9px system-ui, sans-serif'; ctx.fillStyle = '#91a2a9';
    for (let row = 0; row < YS.length; row++) { ctx.fillText(streetNames[row].toUpperCase(), row % 2 ? 341 : 697, YS[row] - 5); ctx.fillText(streetNames[row].toUpperCase(), 1409, YS[row] - 5); }
    for(const label of [{x:610,y:349,text:'VIA ROMA'},{x:930,y:718,text:'VIALE EUROPA'},{x:1320,y:713,text:'VIA DELLE ACACIE'}]){ctx.save();ctx.translate(label.x-5,label.y);ctx.rotate(-Math.PI/2);ctx.fillStyle='#a0b4bb';ctx.font='9px system-ui, sans-serif';ctx.fillText(label.text,0,0);ctx.restore();}
    for (const mark of LANDMARKS) {
      const cx = (XS[mark.col] + XS[mark.col + 1]) / 2, cy = YS[mark.row] + 43;
      ctx.font = '600 8.5px system-ui, sans-serif'; ctx.fillStyle = mark.color; ctx.fillText(mark.name, cx, cy);
    }
    ctx.font = '9px system-ui, sans-serif'; ctx.fillStyle = '#84a698'; ctx.fillText('GIARDINI DELLA SIGNORIA', 520, 414); ctx.fillText('PARCO DEL FIUME', 1235, 880); ctx.fillText('PARCO DEL FIUME', 1415, 978);
    ctx.font='600 9px system-ui, sans-serif';ctx.fillStyle='#b2c8b6';ctx.fillText('PASSERELLA 3',1046,934);
    ctx.font='8px system-ui, sans-serif';ctx.fillStyle='#a3b6a5';ctx.fillText('SENTIERO EST',1198,968);ctx.fillText('INGRESSO EST · CHIOSCO',1260,834);
    paintOuterLabels(ctx);
  }
  const BASE_SCALE=1.25;
  let base = null, blockedEdges = [];
  function setBlockedEdges(ids = []) { const blocked = new Set(ids); blockedEdges = edges.filter(edge => blocked.has(edge.id)); }
  function getBase() {
    if (base) return base;
    const scale = BASE_SCALE;
    if (typeof OffscreenCanvas !== 'undefined') base = new OffscreenCanvas(WORLD_W * scale, WORLD_H * scale);
    else if (typeof document !== 'undefined') { base = document.createElement('canvas'); base.width = WORLD_W * scale; base.height = WORLD_H * scale; }
    else return null;
    const ctx = base.getContext('2d'); ctx.scale(scale, scale); paintBase(ctx); return base;
  }
  function typeStyle(type) {
    const value = String(type || '').toLowerCase();
    if (value.includes('sanit') || value.includes('ambul')) return { kind: 'ambulance', color: '#77dbaf', body: '#e1e6dc', stripe: '#dd732b', label: '118', length: 44, width: 20 };
    if (value.includes('fuoco') || value.includes('fire') || value.includes('vvf')) return { kind: 'fire', color: '#eea17f', body: '#ac392e', stripe: '#ebc8a4', label: '115', length: 51, width: 22 };
    return { kind: 'police', color: '#7cbeff', body: '#65a3cb', stripe: '#edf4eb', label: '113', length: 39, width: 17 };
  }
  let displayedFleet = [];
  function isTravelling(unit) {
    const phase = String(unit.phase || '').toLowerCase().replace(/_/g, ' ');
    if (['disponibile', 'available', 'sul posto', 'onscene', 'in attesa', 'hold'].includes(phase)) return false;
    return ['in viaggio', 'enroute', 'responding', 'rientro', 'returning', 'pattugliamento', 'patrol', 'pattuglia', 'in pattuglia'].includes(phase) || !!(unit.path && unit.pathIndex < unit.path.length);
  }
  function getUnitDisplayPosition(unit, fleet = displayedFleet) {
    const angle = Number.isFinite(unit.angle) ? unit.angle : 0, travelling = isTravelling(unit);
    let forward = 0, side = travelling ? 7 : 19;
    if (!travelling) {
      const parked = fleet.filter(other => !isTravelling(other) && Math.hypot(other.x - unit.x, other.y - unit.y) < 3).sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const index = parked.findIndex(other => other.id === unit.id);
      // Distinct curb bays share the same logical incident/base node. Heading remains the arrival heading.
      if (parked.length > 1 && index !== -1) forward = (index - (parked.length - 1) / 2) * 48;
    }
    return { x: unit.x - Math.sin(angle) * side + Math.cos(angle) * forward, y: unit.y + Math.cos(angle) * side + Math.sin(angle) * forward };
  }
  function vehicle(ctx, unit, t, selected, z) {
    const s = typeStyle(unit.type), len = s.length, wide = s.width;
    const position = getUnitDisplayPosition(unit);
    const emergency = ['in viaggio', 'in_viaggio', 'enroute', 'responding', 'sul posto', 'onscene'].includes(String(unit.phase || '').toLowerCase());
    ctx.save(); ctx.translate(position.x, position.y); ctx.scale(Math.max(.78, .48 / z), Math.max(.78, .48 / z));
    if (selected) { ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.strokeStyle = s.color + '80'; ctx.lineWidth = 1.7; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 35, -.3, .4); ctx.strokeStyle = '#e3f6ff'; ctx.stroke(); }
    ctx.rotate(Number.isFinite(unit.angle) ? unit.angle : 0);
    rounded(ctx, -len / 2 + 2, -wide / 2 + 4, len, wide + 2, 5, '#020a10a8');
    for (const wx of [-len * .3, len * .3]) { rounded(ctx, wx - 4, -wide / 2 - 1.8, 8, 4, 1.5, '#0b1218'); rounded(ctx, wx - 4, wide / 2 - 2, 8, 4, 1.5, '#0b1218'); }
    rounded(ctx, -len / 2, -wide / 2, len, wide, s.kind === 'police' ? 6 : 3, s.body, '#dae4e1a0');
    if (s.kind === 'police') {
      rounded(ctx, -7, -wide / 2 + 1.5, 17, wide - 3, 3, '#b9d2de');
      rounded(ctx, 5, -wide / 2 + 2, 6, wide - 4, 2, '#172e3f'); rounded(ctx, -11, -wide / 2 + 2, 5, wide - 4, 1.5, '#20394b');
      ctx.fillStyle = s.stripe; ctx.fillRect(-12, -wide / 2 + .6, 26, 2.1); ctx.fillRect(-12, wide / 2 - 2.7, 26, 2.1);
      line(ctx, 14, -5, 14, 5, '#366183', .6); line(ctx, -15, -5, -15, 5, '#467799', .6);
      ctx.fillStyle = '#0f3552'; ctx.font = 'bold 3.6px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLIZIA', 0, 5.5);
    } else if (s.kind === 'ambulance') {
      rounded(ctx, -20, -8.5, 27, 17, 2, '#ecede4', '#a1b0aa'); rounded(ctx, 10, -7, 5, 14, 1.5, '#153340');
      ctx.fillStyle = s.stripe; ctx.fillRect(-20, -9, 34, 2.5); ctx.fillRect(-20, 6.5, 34, 2.5);
      ctx.fillStyle = '#357b73'; ctx.fillRect(-10, -5, 4, 10); ctx.fillRect(-13, -2, 10, 4);
      rounded(ctx, -1, -3, 5, 6, 1, '#abbdb6', '#748983');
    } else {
      rounded(ctx, -23, -9, 31, 18, 1, '#9c4135'); rounded(ctx, 11, -8, 7, 16, 2, '#16313c');
      ctx.fillStyle = '#e5d5af'; ctx.fillRect(-23, -10, 41, 2); ctx.fillRect(-23, 8, 41, 2);
      rounded(ctx, -21, -5.5, 28, 11, 1, '#7a8785', '#c2c7b9');
      for (let i = -18; i < 5; i += 4) line(ctx, i, -5, i, 5, '#d2d9cd', 1);
      line(ctx, -21, -3, 7, -3, '#283b42', 1.2); line(ctx, -21, 3, 7, 3, '#283b42', 1.2);
    }
    // Headlights, mirrors, chrome bumpers and alternating blue lightbar.
    const lightX = s.kind === 'police' ? 1 : 8;
    rounded(ctx, lightX - 1.8, -7, 3.6, 14, 1, '#12232f');
    const flash = emergency && Math.floor(t * 5 + Number(String(unit.id).replace(/\D/g, '')) || t * 5) % 2 === 0;
    ctx.fillStyle = flash ? '#98edff' : '#398ac7'; ctx.fillRect(lightX - 1, -6.5, 2.1, 4.5); ctx.fillStyle = flash ? '#2b6793' : '#91dfff'; ctx.fillRect(lightX - 1, 2, 2.1, 4.5);
    if (emergency) { ctx.shadowBlur = 10; ctx.shadowColor = '#459dff'; ctx.fillStyle = flash ? '#4eaeff95' : '#4eaeff25'; ctx.fillRect(lightX - 2, -8, 4, 3); ctx.fillRect(lightX - 2, 5, 4, 3); ctx.shadowBlur = 0; }
    ctx.fillStyle = '#f4edd5'; ctx.fillRect(len / 2 - 2.2, -wide / 2 + 2.2, 1.8, 3); ctx.fillRect(len / 2 - 2.2, wide / 2 - 5.2, 1.8, 3);
    ctx.fillStyle = '#e95b53'; ctx.fillRect(-len / 2, -wide / 2 + 2, 1.8, 3); ctx.fillRect(-len / 2, wide / 2 - 5, 1.8, 3);
    line(ctx, len / 2 - .5, -wide / 2 + 5, len / 2 - .5, wide / 2 - 5, '#b9c5c2', 1);
    rounded(ctx, len * .16, -wide / 2 - 2.5, 4, 2.5, 1, '#c0d0d4'); rounded(ctx, len * .16, wide / 2, 4, 2.5, 1, '#c0d0d4');
    ctx.restore();
  }
  function draw(ctx, width, height, view, units = [], events = [], selection = {}, simTime = 0) {
    const z = Math.max(.1, view.zoom || 1), t = Number(simTime) || 0;
    displayedFleet = units;
    ctx.save(); ctx.fillStyle = '#101d25'; ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2); ctx.scale(z, z); ctx.translate(-view.x, -view.y);
    const background = getBase();
    if(background){const left=Math.max(0,view.x-width/(2*z)),top=Math.max(0,view.y-height/(2*z)),right=Math.min(WORLD_W,view.x+width/(2*z)),bottom=Math.min(WORLD_H,view.y+height/(2*z));if(right>left&&bottom>top)ctx.drawImage(background,left*BASE_SCALE,top*BASE_SCALE,(right-left)*BASE_SCALE,(bottom-top)*BASE_SCALE,left,top,right-left,bottom-top);}
    else paintBase(ctx);
    if(z<.85){ctx.textAlign='center';ctx.font='600 '+10/z+'px system-ui, sans-serif';for(const label of [{x:330,y:39,text:'CENTRO STORICO'},{x:2190,y:176,text:'BELLAVISTA'},{x:355,y:1743,text:'PARCO DELLE COLLINE'},{x:3150,y:1450,text:'SCALO MERCI'},{x:2980,y:2047,text:'PORTO NUOVO'}]){const tw=ctx.measureText(label.text).width;rounded(ctx,label.x-tw/2-7/z,label.y-13/z,tw+14/z,18/z,3/z,'#14272deb','#526e6560');ctx.fillStyle='#acc9bd';ctx.fillText(label.text,label.x,label.y);}}
    const selectedUnit = units.find(u => u.id === selection.unitId);
    if (selectedUnit && selectedUnit.path && selectedUnit.pathIndex < selectedUnit.path.length) {
      ctx.beginPath(); ctx.moveTo(selectedUnit.x, selectedUnit.y); for (let i = selectedUnit.pathIndex || 0; i < selectedUnit.path.length; i++) ctx.lineTo(selectedUnit.path[i].x, selectedUnit.path[i].y);
      ctx.lineWidth = 5 / z; ctx.strokeStyle = '#79c6ff20'; ctx.stroke(); ctx.lineWidth = 1.7 / z; ctx.strokeStyle = '#8dd8fd'; ctx.setLineDash([5 / z, 5 / z]); ctx.lineDashOffset = -t * 12 / z; ctx.stroke(); ctx.setLineDash([]);
    }
    for (const edge of blockedEdges) {
      const a = nodes[edge.a], b = nodes[edge.b], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, horizontal = a.y === b.y;
      line(ctx, a.x, a.y, b.x, b.y, '#e68a6233', edge.width);
      ctx.save(); ctx.translate(x, y); ctx.scale(1 / z, 1 / z); ctx.rotate(horizontal ? Math.PI / 2 : 0);
      rounded(ctx, -11, -4, 22, 8, 1.5, '#e6d8be', '#281c18');
      ctx.fillStyle = '#d3634d'; for (let bx = -9; bx <= 5; bx += 7) { ctx.beginPath(); ctx.moveTo(bx, -3); ctx.lineTo(bx + 5, -3); ctx.lineTo(bx + 2, 3); ctx.lineTo(bx - 3, 3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + 8 / z + 'px system-ui, sans-serif';
      rounded(ctx, x - 22 / z, y + 15 / z, 44 / z, 13 / z, 2 / z, '#37251feb', '#c6765360'); ctx.fillStyle = '#efb496'; ctx.fillText('CHIUSA', x, y + 21.5 / z);
    }
    for (const event of events) {
      if (event.visible === false || event.done || !Number.isFinite(event.x) || !Number.isFinite(event.y) || ['closed', 'resolved', 'archived'].includes(event.status || event.state)) continue;
      const selected = selection.caseId === event.id, critical = event.priority === 3 || /alta|ross|crit|p1/i.test(String(event.priority));
      const color = critical ? '#ff8372' : '#e9be70', radius = (selected ? 13 : 10) / z;
      const pulse = 1 + (t * .8 % 1);
      if (selected || critical) { ctx.beginPath(); ctx.arc(event.x, event.y, radius * pulse * 1.6, 0, Math.PI * 2); ctx.strokeStyle = critical ? '#ff837230' : '#e9be7030'; ctx.lineWidth = 1.2 / z; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(event.x, event.y, radius, 0, Math.PI * 2); ctx.fillStyle = '#16252de8'; ctx.fill(); ctx.lineWidth = 1.7 / z; ctx.strokeStyle = color; ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + (11 / z) + 'px system-ui, sans-serif'; ctx.fillText('!', event.x, event.y + .3 / z);
      if (selected) { ctx.font = '600 ' + 9 / z + 'px system-ui, sans-serif'; const label = String(event.code || event.id); const tw = ctx.measureText(label).width; rounded(ctx, event.x - tw / 2 - 5 / z, event.y + 17 / z, tw + 10 / z, 16 / z, 3 / z, '#15252fea', '#7b695260'); ctx.fillStyle = '#eedbc1'; ctx.fillText(label, event.x, event.y + 25 / z); }
    }
    for (const unit of units) {
      if (!Number.isFinite(unit.x) || !Number.isFinite(unit.y)) continue;
      vehicle(ctx, unit, t, unit.id === selection.unitId, z);
      const s = typeStyle(unit.type), label = String(unit.callSign || unit.callsign || unit.name || unit.id), selected = unit.id === selection.unitId, position = getUnitDisplayPosition(unit);
      ctx.font = (selected ? '700 ' : '600 ') + 9 / z + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(label).width, ly = position.y + Math.max(24, 20 / z);
      rounded(ctx, position.x - tw / 2 - 5 / z, ly - 7 / z, tw + 10 / z, 14 / z, 3 / z, selected ? '#163447f2' : '#101e27e8', selected ? '#76baf088' : '#52667466');
      ctx.fillStyle = s.color; ctx.fillText(label, position.x, ly + .2 / z);
    }
    ctx.restore();
  }
  function vehicleSVG(type) {
    const s = typeStyle(type), fire = s.kind === 'fire', amb = s.kind === 'ambulance';
    // A bespoke side elevation shows livery, individual wheels and equipment in unit cards.
    const body = fire ? '<path d="M14 27h75V14h36l17 17v25H14z" fill="#c74838"/><path d="M20 23h64v27H20z" fill="#748087" stroke="#d1d8d9"/><path d="M23 29h57m-57 6h57m-57 6h57" stroke="#a9b6bc"/><path d="M96 20h23l13 13H96z" fill="#143547"/><path d="M20 12h63v7H20z" fill="#bac7ce"/><path d="M25 11v10m9-10v10m9-10v10m9-10v10m9-10v10m9-10v10" stroke="#e3eaed"/>' : amb ? '<path d="M13 17h81v10h29l20 16v15H13z" fill="#e9eee7"/><path d="M96 30h24l13 13H96z" fill="#214450"/><path d="M17 38h73v8H17z" fill="#eb8035"/><path d="M52 21h7v19h-7zM46 27h19v7H46z" fill="#389181"/><rect x="19" y="23" width="20" height="10" rx="2" fill="#9fc0c2"/><path d="M88 20v34" stroke="#9cafaa"/>' : '<path d="M11 42l15-11 26-3 14-15h37l21 19 22 9v17H10z" fill="#62a6d5"/><path d="M70 18h12v14H57zm17 0h13l16 14H87z" fill="#183e54"/><path d="M14 40h129v9H14z" fill="#eff4ec"/><path d="M85 34v20m-35-18v18" stroke="#397aa6"/><path d="M116 29l13 5" stroke="#b5d3df" stroke-width="2"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 76" role="img" aria-label="' + (fire ? 'Autopompa vigili del fuoco' : amb ? 'Ambulanza di soccorso' : 'Pattuglia della Polizia') + '"><defs><linearGradient id="ground-' + s.kind + '" x2="0" y2="1"><stop stop-color="#07151e" stop-opacity="0"/><stop offset="1" stop-color="#07151e" stop-opacity=".5"/></linearGradient></defs><ellipse cx="79" cy="62" rx="72" ry="7" fill="#061119" opacity=".55"/>' + body + '<rect x="14" y="52" width="132" height="5" rx="2" fill="#294552"/><rect x="' + (fire || amb ? 96 : 77) + '" y="' + (amb ? 23 : 9) + '" width="17" height="4" rx="1.5" fill="#65c7ff"/><rect x="137" y="43" width="6" height="5" rx="1" fill="#fff4cd"/><rect x="11" y="43" width="4" height="6" fill="#fc6d5e"/><circle cx="37" cy="56" r="11" fill="#0b1820" stroke="#77909a" stroke-width="1.5"/><circle cx="37" cy="56" r="5.5" fill="#b7c4c8"/><circle cx="37" cy="56" r="2" fill="#475965"/><circle cx="122" cy="56" r="11" fill="#0b1820" stroke="#77909a" stroke-width="1.5"/><circle cx="122" cy="56" r="5.5" fill="#b7c4c8"/><circle cx="122" cy="56" r="2" fill="#475965"/><text x="' + (fire ? 109 : amb ? 73 : 82) + '" y="' + (fire ? 46 : amb ? 31 : 46) + '" text-anchor="middle" fill="' + (fire ? '#fff1dc' : '#194966') + '" font-size="' + (fire ? 8 : amb ? 7 : 8) + '" font-family="Arial,sans-serif" font-weight="bold">' + (fire ? '115' : amb ? '118' : 'POLIZIA') + '</text></svg>';
  }
  global.CityMap = { width: WORLD_W, height: WORLD_H, nodes, edges, nearest, route, advance, draw, screenToWorld, worldToScreen, vehicleSVG, roadName, setBlockedEdges, getUnitDisplayPosition, districts, outerLocations, patrolRoutes, waterAreas:[...coastalBasins,{x:0,y:2350,w:WORLD_W,h:50}],core:{width:1800,height:1200,nodeCount:70,edgeCount:119} };
})(typeof window !== 'undefined' ? window : globalThis);
