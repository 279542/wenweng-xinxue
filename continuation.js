/* 后续剧情：独立于开场，保留原有故事与素材 */
(()=>{
'use strict';
const stage=document.querySelector('#stage'), entry=document.querySelector('#btnContinue');
const layer=document.createElement('section');layer.className='story-next';layer.hidden=true;layer.setAttribute('aria-label','文翁篇后续故事');stage.appendChild(layer);
let timer=null, loop=null, run=0, lane=1, score=0, tokens=[], last=0, gameKeyHandler=null;
const scenes={
 intro:{chapter:'第二幕 · 石室门前',bg:'street',who:'小马翁',text:'听了几句议论，我还是想亲自问个明白。',note:'人物对白为创作演绎',next:'meeting',button:'上前了解'},
 meeting:{chapter:'第二幕 · 初见文翁',bg:'classroom',who:'文翁 · 形象演绎',text:'求学的路，要先问明白，再踏踏实实走下去。',note:'人物形象与对白为创作演绎，并非文翁原话',portrait:'wenweng',next:'question',button:'听见门前议论'},
 question:{chapter:'第二幕 · 名额之问',bg:'street',who:'乡绅 · 虚构人物',text:'这么好的求学机会，要是按出价安排，不就能多收些钱？',note:'情节演绎，不代表史实',portrait:'merchant',next:'choice',button:'听听小马翁怎么说'},
 choice:{chapter:'第二幕 · 名额之问',bg:'street',who:'小马翁',text:'可要是靠价钱决定机会，没钱的人怎么办？',note:'情节演绎',portrait:'merchant',kind:'choice'},
 reflectPrice:{chapter:'第二幕 · 兴学育人',bg:'street',who:'小马翁',text:'按出价安排，没钱的人就可能失去机会。再想一想，求学的机会不该只看谁出的钱多。',note:'以上选择为虚构情节，不是历史记载',next:'record',button:'看看史料记载'},
 reflectFair:{chapter:'第二幕 · 兴学育人',bg:'street',who:'小马翁',text:'不能只看谁出的钱多。兴学育人的意义，值得我们继续探寻。',note:'以上选择为虚构情节，不是历史记载',next:'record',button:'看看史料记载'},
 record:{chapter:'第三幕 · 节用与送学',bg:'classroom',who:'旁白',text:'文翁挑选张叔等十余名郡县小吏，送往京师学习；又节省供太守使用的少府用度，购置蜀地物品，托人带给京师博士。',note:'依据《汉书·循吏传》简明转述，场景为演绎',next:'pack',button:'整理出发的包裹'},
 pack:{chapter:'第三幕 · 整理行装',bg:'classroom',who:'小马翁',text:'蜀刀、蜀布要送往哪里？把它们放进包裹，看看目的地吧。',note:'点击物品即可，无需拖动',kind:'pack'},
 packed:{chapter:'第三幕 · 送往京师',bg:'classroom',who:'旁白',text:'包裹上写着：送往京师博士。这些是节省少府用度后购置的蜀地物品。',note:'不将其解释为学生缴纳的学费或文翁的私人积蓄',next:'gameIntro',button:'继续前行'},
 gameIntro:{chapter:'第四幕 · 新学避雷局',bg:'street',who:'小马翁',text:'接住书卷、笔砚加 1 分；碰到速成或买名额减 1 分，最低为 0。',note:'小游戏为现代比喻，并非历史事件',kind:'gameIntro'},
 return:{chapter:'第五幕 · 学成归来',bg:'street',who:'旁白',text:'数年后，赴京学习的蜀地小吏学成归来。文翁任用其中一些人，并依次考察推举。',note:'依据《汉书·循吏传》简明转述',next:'school',button:'走进成都学官'},
 school:{chapter:'第五幕 · 石室兴学',bg:'classroom',who:'旁白',text:'后来，文翁在成都兴办学官，招收所属县的子弟，并免除他们的更徭。',note:'场景和人物造型为演绎',next:'influence',button:'继续阅读'},
 influence:{chapter:'第五幕 · 求学之风',bg:'classroom',who:'旁白',text:'文翁又让部分学官学生随行、传达教令。人们看到学习的价值，求学之风渐渐兴盛。',note:'学官学生与先前赴京学习的小吏，并非同一组人',next:'realize',button:'听听小马翁的想法'},
 realize:{chapter:'第五幕 · 求学之风',bg:'classroom',who:'小马翁',text:'原来读书不是只看眼前快不快，还能让本领用得上，让更多人愿意学。',note:'人物对白为创作演绎',next:'quote',button:'翻开最后一页'},
 quote:{chapter:'第六幕 · 廉平育人',bg:'classroom',who:'《汉书·循吏传》',text:'谨身帅先，居以廉平。',note:'这是《汉书》对吴公、文翁等循吏的共同评价。',next:'ending',button:'走进讲堂'},
 ending:{chapter:'结局 · 石室兴学',bg:'classroom',who:'小马翁',text:'石室兴学，廉平育人。',note:'码上清廉，小故事悟大道理。',kind:'ending'}
};
function button(text,action,secondary=false){return `<button type="button" class="next-action${secondary?' secondary':''}" data-action="${action}">${text}</button>`}
function render(id){
 if(id==='return' && window.WenwengTheatre){stopGame();window.WenwengTheatre.actFive({layer,showFacts,render});return;}
 stopGame();const s=scenes[id];if(!s)return;layer.hidden=false;layer.dataset.scene=id;layer.dataset.background=s.bg;
 const image=id==='choice'||id==='realize'?'xm-orange-thinking.webp':'xm-orange-idle.webp';
 const portrait=s.portrait?(s.portrait==='wenweng'?'<img class="next-merchant next-wenweng" src="assets/wenweng-illustration-candidate.webp" alt="文翁形象演绎">':'<img class="next-merchant" src="assets/xiangshen-candidate.webp" alt="虚构乡绅">'):'';
 let controls='';if(s.kind==='choice')controls=button('按出价安排','price',true)+button('让求学机会更公平','fair');
 else if(s.kind==='pack')controls='<div class="pack-items"><button data-item="刀" aria-pressed="false">蜀刀 <span>＋</span></button><button data-item="布" aria-pressed="false">蜀布 <span>＋</span></button></div><p class="pack-status" aria-live="polite">包裹：还未放入物品</p>'+button('查看包裹','finish-pack');
 else if(s.kind==='gameIntro')controls=button('跳过小游戏','skip',true)+button('开始 15 秒挑战','start');
 else if(s.kind==='gameResult')controls=button('再试一次','start',true)+button('继续故事','next');
 else if(s.kind==='ending')controls=button('重新体验','restart')+button('查看史实说明','facts',true);
 else controls=button(s.button,'next');
 layer.innerHTML=`<div class="next-bg"></div><div class="next-vignette"></div><div class="next-leaves" aria-hidden="true"><i></i><i></i><i></i><i></i></div><header class="next-header"><span class="next-seal">码上<br>清廉</span><span>${s.chapter}</span><button type="button" class="next-facts" data-action="facts" aria-label="查看史实与演绎说明">史</button></header><div class="next-progress"><i style="width:${Math.round((Object.keys(scenes).indexOf(id)+1)/Object.keys(scenes).length*100)}%"></i></div><div class="next-actors">${portrait}<img class="next-xm" src="assets/${image}" alt="小马翁"></div><div class="next-card"><div class="next-speaker">${s.who}</div><p class="next-text">${s.text}</p><p class="next-note">${s.note}</p><div class="next-controls">${controls}</div></div>`;
 layer.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='next')render(s.next);else if(a==='price')render('reflectPrice');else if(a==='fair')render('reflectFair');else if(a==='skip')render('return');else if(a==='start')startGame();else if(a==='restart')location.href=location.pathname;else if(a==='facts')showFacts();else if(a==='finish-pack')finishPack()}));
 if(s.kind==='pack'){const selected=new Set();layer.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>{selected.add(el.dataset.item);el.setAttribute('aria-pressed','true');el.disabled=true;layer.querySelector('.pack-status').textContent='包裹：'+[...selected].join('、');}));layer._selected=selected;}
}
function finishPack(){const selected=layer._selected;if(selected.size<2){layer.querySelector('.pack-status').textContent='请先点选蜀刀和蜀布。';return}render('packed')}
function showFacts(){const modal=document.createElement('div');modal.className='next-facts-overlay';modal.innerHTML='<div class="next-facts-card"><h2>史实与演绎</h2><p>赴京学习、节用赠物、成都兴学及循吏评价依据《汉书·循吏传》。小马翁、乡绅、人物对白和小游戏为创作演绎。</p><p>节省少府用度购置的蜀刀、蜀布由计吏带给京师博士；赴京学习的小吏，与后来成都学官的学生是不同群体。</p><p>“谨身帅先，居以廉平”是对吴公、文翁等循吏的共同评价。</p><button class="next-action" type="button">知道了</button></div>';layer.appendChild(modal);modal.querySelector('button').addEventListener('click',()=>modal.remove())}
function stopGame(){run++;if(timer)clearInterval(timer);if(loop)cancelAnimationFrame(loop);if(gameKeyHandler)window.removeEventListener('keydown',gameKeyHandler);if(startGame.visibilityHandler)document.removeEventListener('visibilitychange',startGame.visibilityHandler);startGame.visibilityHandler=null;gameKeyHandler=null;timer=loop=null;tokens=[];}
function startGame(){stopGame();const thisRun=run;lane=1;score=0;let elapsed=0,lastSpawn=0;layer.dataset.scene='game';layer.dataset.background='street';layer.innerHTML=`<div class="next-bg"></div><div class="next-vignette"></div><header class="next-header"><span class="next-seal">码上<br>清廉</span><span>第四幕 · 新学避雷局</span><button class="game-skip">跳过</button></header><p class="game-intro">接住书卷 +1 · 碰到诱惑 −1</p><div class="game-stats"><span>剩余 <b id="seconds">15</b> 秒</span><span>收获 <b id="score">0</b></span></div><div class="game-field"><img class="game-xm" src="assets/xm-orange-idle.webp" alt="小马翁"></div><div class="game-bottom"><p class="game-feedback" aria-live="polite">点击按钮或左右滑动，分数最低为 0</p><div><button class="game-move" data-lane="-1" aria-label="向左移动">← 向左</button><button class="game-move" data-lane="1" aria-label="向右移动">向右 →</button></div><small>小游戏是现代比喻，与史实无关</small></div>`;
 const field=layer.querySelector('.game-field'),pony=layer.querySelector('.game-xm'),feedback=layer.querySelector('.game-feedback');const place=()=>{pony.style.left=(16+lane*34)+'%'};place();
 const move=step=>{lane=Math.max(0,Math.min(2,lane+step));place()};layer.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>move(Number(b.dataset.lane)));let swipeX=null;field.addEventListener('pointerdown',e=>{swipeX=e.clientX});field.addEventListener('pointerup',e=>{if(swipeX!==null&&Math.abs(e.clientX-swipeX)>25)move(e.clientX>swipeX?1:-1);swipeX=null});gameKeyHandler=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1)}};window.addEventListener('keydown',gameKeyHandler);layer.querySelector('.game-skip').onclick=()=>render('return');
 // Hidden tabs do not consume play time. Both the countdown and tokens use the same visible-time clock.
 startGame.visibilityHandler=()=>{last=0};document.addEventListener('visibilitychange',startGame.visibilityHandler);
 function frame(now){if(thisRun!==run)return;if(document.hidden){last=0;loop=requestAnimationFrame(frame);return}if(!last)last=now;const delta=now-last;last=now;elapsed+=delta;const label=layer.querySelector('#seconds');if(label)label.textContent=Math.max(0,Math.ceil((15000-elapsed)/1000));if(elapsed>=15000){render('gameResult');return}if(elapsed-lastSpawn>900){lastSpawn=elapsed;const bad=Math.random()<.4;const el=document.createElement('div');el.className='game-token '+(bad?'bad':'good');el.textContent=bad?(Math.random()<.5?'速成':'买名额'):(Math.random()<.5?'书卷':'笔砚');field.appendChild(el);tokens.push({el,lane:Math.floor(Math.random()*3),y:0,bad});tokens[tokens.length-1].el.style.left=(16+tokens[tokens.length-1].lane*34)+'%'}
 for(let i=tokens.length-1;i>=0;i--){let x=tokens[i];x.y+=delta*.018;x.el.style.top=x.y+'%';if(x.y>78){if(x.lane===lane){if(x.bad){score=Math.max(0,score-1);feedback.textContent=score===0?'先看清，分数最低为 0':'先看清，收获 −1';}else{score++;feedback.textContent='接住了！收获 +1';}layer.querySelector('#score').textContent=score;pony.classList.remove('react-good','react-bad');void pony.offsetWidth;pony.classList.add(x.bad?'react-bad':'react-good');}x.el.remove();tokens.splice(i,1)}}loop=requestAnimationFrame(frame)}
 last=0;loop=requestAnimationFrame(frame)
}
scenes.gameResult={chapter:'第四幕 · 挑战完成',bg:'street',who:'小马翁',get text(){return `这次我收获了 ${score} 份学习用品。无论多少，都可以继续前行。`},note:'真正的学习，不靠速成与买名额。',next:'return',kind:'gameResult'};
// “初见文翁”独立编排：保持场景连续，台词需用户主动推进。
function startMeeting(){
 stopGame();layer.hidden=false;layer.dataset.scene='meeting-cinema';layer.removeAttribute('data-background');
 // Start loading all six approved frames and the two portraits immediately.
 ['wenweng-illustration-candidate.webp','xm-orange-idle.webp','xm-orange-thinking.webp',...Array.from({length:6},(_,i)=>`xm-orange-walk-${String(i+1).padStart(2,'0')}.webp`)].forEach(name=>window.WenwengAssets.warm(name));
 layer.innerHTML=`<div class="meeting-scene"><div class="meeting-landscape"></div><div class="meeting-light"></div><div class="meeting-leaves" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
 <header class="meeting-header"><span class="next-seal">码上<br>清廉</span><span>第二幕 · 初见文翁</span><button class="next-facts" data-meet="facts" aria-label="史实与演绎说明">史</button></header>
 <div class="meeting-kicker">蜀郡 · 石室门前<span>人物形象与对白为演绎</span></div>
 <div class="meeting-world"><div class="meeting-shadow meeting-shadow-ww"></div><img class="meeting-wenweng" src="assets/wenweng-illustration-candidate.webp" alt="文翁形象演绎"><div class="meeting-shadow meeting-shadow-xm"></div><div class="meeting-xm"><img class="meeting-idle" src="assets/xm-orange-idle.webp" alt="小马翁"><div class="meeting-walk" aria-hidden="true">${Array.from({length:6},(_,i)=>`<img src="assets/xm-orange-walk-${String(i+1).padStart(2,'0')}.webp" style="--frame:${i}" alt="">`).join('')}</div></div></div>
 <div class="meeting-prompt" aria-live="polite"></div><div class="meeting-dialog" hidden><div class="meeting-name"></div><p class="meeting-text"></p><div class="meeting-foot"><span>人物对白为创作演绎</span><button type="button" class="meeting-advance">继续 <b>›</b></button></div></div>
 <button type="button" class="meeting-enter" hidden>上前问候 <span>→</span></button><button type="button" class="meeting-book" hidden aria-label="查看竹简">简</button></div>`;
 const box=layer.querySelector('.meeting-scene'),dlg=layer.querySelector('.meeting-dialog'),name=layer.querySelector('.meeting-name'),text=layer.querySelector('.meeting-text'),prompt=layer.querySelector('.meeting-prompt'),advance=layer.querySelector('.meeting-advance'),enter=layer.querySelector('.meeting-enter'),book=layer.querySelector('.meeting-book');
 // Missing artwork should not leave a broken-image glyph in the scene.
 const idle=layer.querySelector('.meeting-idle'),wenweng=layer.querySelector('.meeting-wenweng');
 wenweng.addEventListener('error',()=>{wenweng.style.visibility='hidden'});
 idle.addEventListener('error',()=>{if(!idle.src.endsWith('/xm-orange-idle.webp'))idle.src='assets/xm-orange-idle.webp';else idle.style.visibility='hidden'});
 let cancelled=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const wait=ms=>new Promise(r=>setTimeout(r,reduced?20:ms));
 const dialog=(speaker,line,button='继续')=>new Promise(resolve=>{box.dataset.speaker=speaker.startsWith('文翁')?'wenweng':speaker==='小马翁'?'horse':'';name.textContent=speaker;text.textContent=line;advance.innerHTML=button+' <b>›</b>';dlg.hidden=false;dlg.classList.remove('arrive');void dlg.offsetWidth;dlg.classList.add('arrive');advance.onclick=e=>{e.stopPropagation();advance.onclick=null;dlg.hidden=true;box.dataset.speaker='';resolve()}});
 layer.querySelector('[data-meet=facts]').onclick=e=>{e.stopPropagation();showFacts()};
 (async()=>{
  await wait(700);prompt.textContent='门前有人正在等候';prompt.classList.add('visible');await wait(1200);prompt.classList.remove('visible');
  await dialog('旁白','穿过热闹的街口，小马翁终于来到了石室门前。');
  enter.hidden=false;await new Promise(r=>{enter.onclick=e=>{e.stopPropagation();enter.hidden=true;r()}});
  // If any frame is still loading, move the intact standing image instead of flickering between missing frames.
  const walk=box.querySelector('.meeting-walk');
  const walkReady=[...walk.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0);
  if(!walkReady){idle.style.opacity='1';walk.style.opacity='0'}
  box.classList.add('walking');await wait(2000);box.classList.remove('walking');box.classList.add('arrived');
  idle.style.removeProperty('opacity');walk.style.removeProperty('opacity');
  await wait(500);await dialog('小马翁','请问……想在这里读书，要先准备多少银钱？');
  box.classList.add('wenweng-speaking');await dialog('文翁 · 形象演绎','先不急着问价钱。不妨先想一想，为何而学。');box.classList.remove('wenweng-speaking');
  layer.querySelector('.meeting-idle').src='assets/xm-orange-thinking.webp';await dialog('小马翁','上一世，我总想着快一点、再快一点……结果书没读明白，路也走偏了。');
  prompt.textContent='轻触竹简，看看文翁的提示';prompt.classList.add('visible');book.hidden=false;
  await new Promise(r=>{book.onclick=e=>{e.stopPropagation();book.hidden=true;prompt.classList.remove('visible');r()}});
  box.classList.add('book-open');await dialog('竹简','先辨明白，再认真求学。','合上竹简');box.classList.remove('book-open');
  layer.querySelector('.meeting-idle').src='assets/xm-orange-idle.webp';await dialog('小马翁','我明白了。先看清楚，再踏踏实实地学。','继续故事');
  await window.WenwengTheatre.actTwo({layer,showFacts,render});
 })();
}
entry.addEventListener('click',e=>{e.stopPropagation();document.querySelector('#endcard').hidden=true;startMeeting()});
if(new URLSearchParams(location.search).get('preview')==='meeting'){document.querySelector('#endcard').hidden=true;startMeeting()}
if(new URLSearchParams(location.search).get('preview')==='act2'){window.WenwengTheatre.actTwo({layer,showFacts,render})}
if(new URLSearchParams(location.search).get('preview')==='act3'){window.WenwengTheatre.actThree({layer,showFacts,render})}
if(new URLSearchParams(location.search).get('preview')==='act5'){window.WenwengTheatre.actFive({layer,showFacts,render})}
if(new URLSearchParams(location.search).get('preview')==='game'){render('gameIntro')}
})();
