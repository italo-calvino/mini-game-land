// Run from the project root: node tests/pinball.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/client/index.html','utf8');
for(const [,js]of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(js);
const source=html.match(/games\.pinball = function\(el\) \{[\s\S]*?\n\};/)[0];
function setup(){
 const nodes={},events={};let awards=0;
 const el={querySelector(id){return nodes[id]??=(id==='#pin-canvas'?{getContext:()=>({})}:{setPointerCapture(){}});}};
 const context={games:{},Math,requestAnimationFrame:()=>1,cancelAnimationFrame(){},recordWin(){awards++;},recordLoss(){awards++;},document:{addEventListener(k,v){events[k]=v;},removeEventListener(k){delete events[k];}},window:{addEventListener(){},removeEventListener(){}}};
 vm.runInNewContext(source.replace('  reset();raf=requestAnimationFrame(loop);',`  el.test={step,launch,reset,held,targets,flippers,keys,release,get state(){return {ball,score,lives,time,saveUntil,running};},setState(v){if(v.ball)Object.assign(ball,v.ball);if(v.time!==undefined)time=v.time;if(v.score!==undefined)score=v.score;if(v.servedScore!==undefined)servedScore=v.servedScore;if(v.lives!==undefined)lives=v.lives;}};reset();raf=requestAnimationFrame(loop);`),context);
 context.games.pinball(el);return {t:el.test,el,nodes,events,get awards(){return awards;}};
}
const a=setup();a.t.launch();for(let i=0;i<1200&&!a.t.state.ball.ready;i++)a.t.step(1/120);
assert(a.t.state.score>0,'fixed launch reaches scoring elements');
const b=setup();b.t.launch();for(let i=0;i<1200&&!b.t.state.ball.ready;i++)b.t.step(1/120);
assert.equal(a.t.state.score,b.t.state.score);assert.equal(a.t.state.ball.x,b.t.state.ball.x);
const c=setup();c.t.launch();c.t.setState({ball:{launching:false,y:660},score:100});c.t.step(1/120);assert.equal(c.t.state.lives,3);assert(c.t.state.ball.ready);
c.t.launch();c.t.setState({time:30,ball:{launching:false,y:660},score:100,servedScore:100});c.t.step(1/120);assert.equal(c.t.state.lives,3,'zero-score save');
c.t.launch();c.t.setState({time:60,ball:{launching:false,y:660},score:200,servedScore:100});c.t.step(1/120);assert.equal(c.t.state.lives,2,'earned ball drains after save expires');
function shot(t){const s=setup();s.t.launch();s.t.setState({ball:{launching:false}});s.t.held.left=true;const f=s.t.flippers[0],angle=.28-11/120;
 s.t.setState({ball:{x:f.x+82*t*Math.cos(angle),y:f.y+82*t*Math.sin(angle)-16,vx:0,vy:100}});s.t.step(1/120);assert(s.t.state.ball.vy<0);return s.t.state.ball.vx;}
assert(shot(.2)<0&&shot(.85)>0,'contact position changes aiming direction');
const d=setup();d.t.launch();d.t.setState({ball:{launching:false}});for(const target of d.t.targets){d.t.setState({ball:{x:target.x,y:target.y-20,vx:0,vy:100}});d.t.step(1/120);}
assert.equal(d.t.state.score,1600,'four targets award mission bonus');assert(d.t.targets.every(t=>!t.lit));
d.t.setState({time:40,score:1700,servedScore:1600,lives:1,ball:{y:660}});d.t.step(1/120);assert.equal(d.awards,1);assert.equal(d.t.state.running,false);
d.el._cleanup();assert.equal(Object.keys(d.events).length,0);
console.log('PASS: script syntax; deterministic scoring launch; timed and scoreless saves; drain; aimed flipper shots; mission bonus; end and cleanup');
console.log('Uncontrolled launch score:',a.t.state.score);
