const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/client/index.html','utf8');
const nodes=Object.fromEntries(['home','shop-page','gacha-page','bgm-gacha-page','items-page','back-btn'].map(id=>[id,{style:{display:'none'}}]));
const ctx={document:{getElementById:id=>nodes[id]},window:{scrollTo(){}},goHome(){Object.values(nodes).forEach(n=>n.style.display='none');},setTaskbarActive(){},renderShopPage(){},saveData:{totalScore:500,ownedThemes:[],ownedAvatars:[],profile:{}},THEMES:{test:{price:200,name:'Test',colors:['blue']}},AVATAR_ITEMS:[{icon:'A',price:100,name:'Avatar'}],applyTheme(){},persistSave(){},renderHome(){},checkMetaProgress(){},syncOnlineProfile(){},updateUI(){},showToast(){}};
vm.createContext(ctx);
for(const name of ['openShop','openStorePage','buyTheme','buyAvatar']){
  const source=html.match(new RegExp('function '+name+'\\([^]*?\\n}'))[0];vm.runInContext(source,ctx);
}
ctx.openStorePage('gacha');assert.equal(nodes['gacha-page'].style.display,'block');assert.equal(nodes['shop-page'].style.display,'none');
ctx.openStorePage('bgm-gacha');assert.equal(nodes['bgm-gacha-page'].style.display,'block');assert.equal(nodes['gacha-page'].style.display,'none');
ctx.openStorePage('items');assert.equal(nodes['items-page'].style.display,'block');assert.equal(nodes['gacha-page'].style.display,'none');
ctx.openShop();assert.equal(nodes['shop-page'].style.display,'block');assert.equal(nodes['items-page'].style.display,'none');
ctx.buyTheme('test');assert.equal(ctx.saveData.totalScore,300);assert.equal(ctx.saveData.activeTheme,'test');
ctx.buyTheme('test');assert.equal(ctx.saveData.totalScore,300);
ctx.buyAvatar('A');assert.equal(ctx.saveData.totalScore,200);assert.equal(ctx.saveData.profile.avatar,'A');
ctx.buyAvatar('A');assert.equal(ctx.saveData.totalScore,200);
ctx.saveData.ownedAvatars=[];ctx.saveData.totalScore=0;ctx.buyAvatar('A');assert.equal(ctx.saveData.ownedAvatars.length,0);assert.equal(ctx.saveData.totalScore,0);
console.log('PASS: store navigation, purchases, re-equip without duplicate charge, insufficient balance');
