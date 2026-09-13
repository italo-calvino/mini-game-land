const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('dist/client/index.html', 'utf8');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { hidden:false, dataset:{}, attributes:{}, setAttribute(k,v){this.attributes[k]=v;}, focus(){this.focused=true;} });
  return nodes.get(id);
}
const tabs = ['simple','all','random'].map(mode => {
  const tab=node(`home-tab-${mode}`);tab.dataset.homeView=mode;return tab;
});
let renders=0;
const context={document:{getElementById:node,querySelectorAll:()=>tabs},renderGameGrid(){renders++;}};
vm.createContext(context);
vm.runInContext(html.slice(html.indexOf("let homeView='simple';"),html.indexOf('function openGameLibrary(')),context);
for (const mode of ['simple','all','random','simple']) {
  context.setHomeView(mode);
  for (const [key,id] of [['simple','home-simple'],['all','library-page'],['random','home-random']]) {
    assert.equal(node(id).hidden,key!==mode);
    assert.equal(node(`home-tab-${key}`).attributes['aria-selected'],String(key===mode));
    assert.equal(node(`home-tab-${key}`).tabIndex,key===mode?0:-1);
  }
}
assert.equal(renders,1);
context.handleHomeTabKey({key:'ArrowLeft',preventDefault(){}});
assert.equal(node('home-random').hidden,false);
assert.equal(node('home-tab-random').focused,true);
context.setHomeView('invalid');
assert.equal(node('home-random').hidden,false);
assert.match(html, /id="library-page" class="home-view-panel"/);
console.log('PASS: home panels, selected tabs, keyboard wrap, invalid selection and library navigation isolation');
