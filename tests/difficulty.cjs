const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/client/index.html','utf8');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script);
function node(){return {innerHTML:'',textContent:'',children:[],classList:{add(){}},setAttribute(){},addEventListener(){},appendChild(c){this.children.push(c);}};}
for(const [id,count] of [['easy',8],['normal',16],['hard',24]]){
  const nodes={},awards=[],queue=[];const el={querySelectorAll:()=>[],set innerHTML(v){this.markup=v;}};
  const context={games:{},Math,MEMORY_EMOJIS:['🍕','🍣','🎸','🌸','🦊','🏀','🎩','🌈'],document:{getElementById:id=>nodes[id]??=node(),createElement:node},gameDelay:f=>queue.push(f),recordWin:(...a)=>awards.push(a),xpResultHtml:()=>''};
  const source=html.match(/games\.memory = function\(el\) \{[\s\S]*?\n\};/)[0];
  vm.runInNewContext(source.replace('  function start(id){','  el.start=start;\n  function start(id){').replace('  function flip(i) {','  el.flip=flip;el.cards=cards;\n  function flip(i) {'),context);
  context.games.memory(el);el.start(id);assert.equal(el.cards.length,count);
  const pairs=new Map();el.cards.forEach((v,i)=>pairs.set(v,[...(pairs.get(v)||[]),i]));assert.equal(pairs.size,count/2);
  for(const indices of pairs.values()){assert.equal(indices.length,2);indices.forEach(el.flip);while(queue.length)queue.shift()();}
  assert.equal(awards.length,1);assert(nodes['mem-status'].textContent.endsWith(`${count/2}/${count/2}`));
  el.flip(0);assert.equal(awards.length,1);
}
for(const difficulty of ['easy','normal','hard']){
  const nodes={},queue=[];let awards=0;
  const el={querySelectorAll:()=>[],querySelector:id=>nodes[id]??=node()};
  const context={games:{},Math,document:{createElement:node},gameDelay:f=>queue.push(f),recordWin(){awards++;},recordLoss(){awards++;},xpResultHtml:()=>''};
  const source=html.match(/games\.reversi = function\(el\) \{[\s\S]*?\n\};/)[0];
  vm.runInNewContext(source.replace('  menu();',`  el.test={start:()=>{difficulty='${difficulty}';start('cpu');},legalMoves,play,get board(){return board;},get ended(){return ended;}};menu();`),context);
  context.games.reversi(el);el.test.start();let steps=0;
  while(!el.test.ended&&steps++<100){
    const move=el.test.legalMoves(1)[0];if(move)el.test.play(move.x,move.y);
    let callbacks=0;while(queue.length){assert(++callbacks<200);queue.shift()();}
    assert(el.test.board.flat().every(v=>[0,1,2].includes(v)));
  }
  assert(el.test.ended,`${difficulty} completes a legal CPU game`);assert.equal(awards,1);
}
console.log('PASS: all memory sizes, unique pairs, completion and single reward; all Reversi CPU difficulties complete legal games');
