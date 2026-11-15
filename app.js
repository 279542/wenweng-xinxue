/* 文翁新学录 · 开场：石室门前
   演出脚本：封面 → 序·上一世（三张告示）→ 重启求学副本 → 第一幕·石室门前（路人议论、抉择）→ 门前收尾 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const stage=$('#stage'),cam=$('#cam'),world=$('#world');
const params=new URLSearchParams(location.search);
const FAST=params.has('fast');                    // 自动化测试用：压缩等待时间
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const T=ms=>FAST?Math.min(ms,40):(RM?Math.min(ms,250):ms);
const sleep=ms=>new Promise(r=>setTimeout(r,T(ms)));
const mark=step=>{document.body.dataset.step=step};

/* 动画：结束后把终值写回行内样式，避免多段动画叠加 */
function anim(el,kf,o={}){
  const a=el.animate(kf,{fill:'forwards',easing:'cubic-bezier(.2,.8,.2,1)',...o,duration:T(o.duration??400),delay:T(o.delay??0)});
  return a.finished.then(()=>{try{a.commitStyles()}catch(_){}a.cancel()}).catch(()=>{});
}

/* —— 声音：全部由 WebAudio 合成，无外部音频文件 —— */
const soundPreference=()=>{try{return localStorage.getItem('wx-sound')!=='off'}catch(_){return true}};
const Snd={ctx:null,master:null,on:soundPreference(),
  init(){if(this.ctx){this.ctx.resume&&this.ctx.resume();return}
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    try{this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.7;this.master.connect(this.ctx.destination)}catch(_){}},
  env(node,t,a,peak,d){const g=this.ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(.0001,t+a+d);node.connect(g);g.connect(this.master)},
  osc(type,f,t,a,peak,d,f2){const o=this.ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+a+d);this.env(o,t,a,peak,d);o.start(t);o.stop(t+a+d+.05)},
  noise(t,d,peak,type,freq,q=1){const sr=this.ctx.sampleRate,len=Math.ceil(sr*d),b=this.ctx.createBuffer(1,len,sr),ch=b.getChannelData(0);
    for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;const s=this.ctx.createBufferSource();s.buffer=b;
    const f=this.ctx.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(freq,t);f.Q.value=q;s.connect(f);
    this.env(f,t,d*.3,peak,d*.7);s.start(t);return f},
  pluck(f,t,v=.16){this.osc('triangle',f,t,.006,v,1.5);this.osc('sine',f*2,t,.006,v*.3,.8)},
  play(n){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime+.01;
    switch(n){
      case 'tap':this.osc('sine',760,t,.003,.1,.09,520);break;
      case 'pop':this.osc('sine',420,t,.004,.12,.14,820);break;
      case 'coin':this.osc('sine',1900,t,.002,.07,.25);this.osc('sine',2530,t+.07,.002,.06,.35);break;
      case 'thud':this.osc('sine',120,t,.004,.45,.35,48);this.noise(t,.25,.22,'lowpass',420);break;
      case 'page':{const f=this.noise(t,.75,.2,'bandpass',700,.7);f.frequency.exponentialRampToValueAtTime(3400,t+.65);break}
      case 'stamp':this.osc('sine',170,t,.002,.3,.16,70);this.noise(t,.12,.18,'lowpass',1300);break;
      case 'creak':this.osc('sawtooth',80,t,.1,.035,.7,150);break;
      case 'chime':[587.33,659.25,880,987.77,1174.66].forEach((f,i)=>this.pluck(f,t+i*.17,.1));break;
      case 'motif':[293.66,329.63,440,392,329.63,293.66].forEach((f,i)=>this.pluck(f,t+i*.24+(i>3?.18:0),.13));break;
      case 'low':this.osc('sine',196,t,.25,.1,1.6,140);this.osc('sine',233,t+.1,.25,.06,1.5,165);break;
      case 'whoosh':{const f=this.noise(t,.55,.13,'bandpass',420,.8);f.frequency.exponentialRampToValueAtTime(2200,t+.5);break}
      case 'flash':this.osc('sine',1318.5,t,.01,.07,1.4);this.osc('sine',1975.5,t+.04,.01,.05,1.6);this.osc('sine',659.25,t,.02,.06,1.6);break;
    }}
};
const btnSound=$('#btnSound');
const syncSoundBtn=()=>btnSound.classList.toggle('off',!Snd.on);syncSoundBtn();
btnSound.addEventListener('click',e=>{e.stopPropagation();Snd.on=!Snd.on;try{localStorage.setItem('wx-sound',Snd.on?'on':'off')}catch(_){}syncSoundBtn();Snd.init();Snd.play('tap')});

/* —— 世界坐标与镜头 —— */
const IMG_W=940,IMG_H=1670;
let VW=0,VH=0,W=0,H=0,offX=0,offY=0,align={x:.5,y:.7};
let camState={s:1,fx:.5,fy:.5,sy:.45};
function layout(){
  const r=stage.getBoundingClientRect();VW=r.width;VH=r.height;
  const s=Math.max(VW/IMG_W,VH/IMG_H);W=IMG_W*s;H=IMG_H*s;
  offX=(VW-W)*align.x;offY=(VH-H)*align.y;
  Object.assign(world.style,{width:W+'px',height:H+'px',left:offX+'px',top:offY+'px'});
  world.style.setProperty('--u',(W/100)+'px');
}
function camMatrix({s,fx,fy,sy=.45}){
  if(s===1)return 'translate(0px,0px) scale(1)';
  const px=offX+fx*W,py=offY+fy*H;
  let tx=VW/2-s*px,ty=VH*sy-s*py;
  tx=Math.min(-s*offX,Math.max(VW-s*(offX+W),tx));
  ty=Math.min(-s*offY,Math.max(VH-s*(offY+H),ty));
  return `translate(${tx}px,${ty}px) scale(${s})`;
}
function camSet(st){camState={sy:.45,...st};cam.getAnimations().forEach(a=>a.cancel());cam.style.transform=camMatrix(camState)}
function camTo(st,duration=1200,easing='cubic-bezier(.65,0,.35,1)'){
  const from=cam.style.transform||camMatrix(camState);camState={sy:.45,...st};
  return anim(cam,[{transform:from},{transform:camMatrix(camState)}],{duration,easing});
}
function setSet(name,al){
  document.querySelectorAll('.set').forEach(s=>s.classList.toggle('on',s.dataset.set===name));
  align=al;layout();camSet(camState);
}
addEventListener('resize',()=>{layout();cam.style.transform=camMatrix(camState);placeBubbles()});

/* —— 推进与对白 —— */
let advance=null;
stage.addEventListener('click',e=>{
  if(e.target.closest('button,.facts,.choice,.notice,.shot'))return;
  if(advance)advance();
});
const waitTap=()=>new Promise(r=>{advance=()=>{advance=null;r()}});
$('#dialog .dlg-next').addEventListener('click',e=>{e.stopPropagation();if(advance)advance()});
const dialog=$('#dialog'),dlgName=$('#dlgName'),dlgText=$('#dlgText');
function say(name,text,{narr=false}={}){
  return new Promise(res=>{
    dialog.hidden=false;dialog.classList.toggle('narr',narr);dialog.classList.remove('done');
    dialog.style.animation='none';void dialog.offsetWidth;dialog.style.animation='';
    dlgName.textContent=narr?'':name;dlgText.textContent='';
    let i=0,timer=0,typing=true;
    const finish=()=>{typing=false;clearTimeout(timer);dlgText.textContent=text;dialog.classList.add('done')};
    const step=()=>{dlgText.textContent=text.slice(0,++i);
      if(i>=text.length)return finish();
      const c=text[i-1];timer=setTimeout(step,FAST?0:(/[，。？！、：；…—]/.test(c)?170:46));};
    if(RM||FAST)finish();else step();
    advance=()=>{if(typing){finish();return}advance=null;Snd.play('tap');res()};
  });
}
function hideDialog(){if(dialog.hidden)return;return anim(dialog,[{opacity:1},{opacity:0,transform:'translateY(8px)'}],{duration:220}).then(()=>{dialog.hidden=true;dialog.style.opacity='';dialog.style.transform=''})}

const hintEl=$('#hint');
function hint(text,count){if(!text){hintEl.hidden=true;return}hintEl.hidden=false;hintEl.innerHTML=text+(count?`<b>${count}</b>`:'')}

/* 气泡：跟随角色头顶，限制在屏幕内 */
const bubbles=$('#bubbles');let liveBubbles=[];
function placeBubble(b){
  const sr=stage.getBoundingClientRect(),r=b._actor.getBoundingClientRect();
  const bw=b.offsetWidth,bh=b.offsetHeight;
  const cx=r.left-sr.left+r.width*(b._dx??.5);
  let left=Math.max(10,Math.min(VW-bw-10,cx-bw/2));
  let top=Math.max(70,r.top-sr.top+r.height*(b._dy??.02)-bh-12);
  b.style.left=left+'px';b.style.top=top+'px';
  b.style.setProperty('--tx',Math.max(18,Math.min(bw-18,cx-left))+'px');
}
function placeBubbles(){liveBubbles.forEach(placeBubble)}
function bubble(actor,who,text,o={}){
  liveBubbles.forEach(x=>{x.classList.add('fade');setTimeout(()=>x.remove(),400)});
  const b=document.createElement('div');b.className='bubble';
  b.innerHTML=`<span class="who">${who}</span>${text}`;b._actor=actor;b._dx=o.dx;b._dy=o.dy;
  bubbles.appendChild(b);placeBubble(b);liveBubbles=[b];Snd.play('pop');
  actor.classList.remove('talking');void actor.offsetWidth;actor.classList.add('talking');
  return b;
}
function clearBubbles(){liveBubbles.forEach(x=>{x.classList.add('fade');setTimeout(()=>x.remove(),400)});liveBubbles=[]}

/* 选择 */
const choiceEl=$('#choice');
function choose(q,opts){
  return new Promise(res=>{
    choiceEl.innerHTML=`<div class="choice-q">${q}</div><div class="choice-row">`+
      opts.map(o=>`<button class="opt ${o.cls||''}" data-k="${o.k}">${o.badge?`<i>${o.badge}</i>`:''}<b>${o.label}</b>${o.sub?`<span>${o.sub}</span>`:''}</button>`).join('')+'</div>';
    choiceEl.hidden=false;choiceEl.style.animation='none';void choiceEl.offsetWidth;choiceEl.style.animation='';
    choiceEl.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();Snd.play('tap');choiceEl.hidden=true;res(b.dataset.k)},{once:true}));
  });
}
const tapOn=el=>new Promise(r=>{const h=e=>{e.stopPropagation();el.removeEventListener('click',h);Snd.play('tap');r(e)};el.addEventListener('click',h)});

/* 顶栏与进度 */
const topbar=$('#topbar'),chapterEl=$('#chapter'),progressEl=$('#progress');
const setChapter=t=>{chapterEl.textContent=t};
const setProgress=p=>{progressEl.style.width=p+'%'};

/* 章节卡 */
async function titleCard({sub='',main='',seal='',note=''},hold=2200){
  const tc=$('#titleCard');$('#tcSub').textContent=sub;$('#tcMain').textContent=main;$('#tcSeal').textContent=seal;$('#tcNote').textContent=note;
  tc.hidden=false;tc.classList.remove('show');void tc.offsetWidth;tc.classList.add('show');tc.style.opacity=1;
  await sleep(hold);
  await anim(tc,[{opacity:1},{opacity:0}],{duration:700,easing:'ease'});
  tc.hidden=true;tc.style.opacity='';
}

/* 史实说明 */
const facts=$('#facts');
const openFacts=e=>{e&&e.stopPropagation();facts.hidden=false;Snd.play('tap')};
$('#btnFacts').addEventListener('click',openFacts);$('#btnFacts2').addEventListener('click',openFacts);
$('#factsClose').addEventListener('click',e=>{e.stopPropagation();facts.hidden=true});
facts.addEventListener('click',e=>{e.stopPropagation();if(e.target===facts)facts.hidden=true});

/* —— 资源预载 —— */
const ASSETS=['bg-study.webp','bg-street.webp','xm-orange-idle.webp','xm-orange-thinking.webp','xm-orange-sad.webp',...Array.from({length:6},(_,i)=>`xm-orange-walk-${String(i+1).padStart(2,'0')}.webp`),'passer-a.webp','passer-b.webp','passer-c.webp','wenweng.webp'];
function preload(onp){
  let n=0;return Promise.all(ASSETS.map(f=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>{onp(++n/ASSETS.length);(i.decode?i.decode().catch(()=>{}):Promise.resolve()).then(r)};i.src='assets/'+f})));
}

/* —— 封面撕纸分界 —— */
function buildCover(){
  const y0=60,y1=41,pts=[],up=[];
  for(let i=0;i<=24;i++){const x=i/24*100,y=y0+(y1-y0)*i/24,j=(Math.random()-.5)*1.6;pts.push([x,y+j]);up.push([x,y+j-1.1-Math.random()*1.2])}
  const poly=a=>a.map(([x,y])=>`${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',');
  $('.cover-now').style.clipPath=`polygon(${poly(pts)},100% 100%,0% 100%)`;
  $('#coverTear').style.clipPath=`polygon(${poly(up)},100% 100%,0% 100%)`;
  const seamAt=x=>y0+(y1-y0)*x/100;
  const xm=$('.cover-xm');xm.style.bottom=(100-seamAt(22)-1.2)+'%';
}

/* ============ 场景 ============ */

async function cover(){
  mark('cover');buildCover();
  const btn=$('#btnStart'),ld=$('#loader');
  btn.disabled=false;ld.classList.add('done');
  await tapOn(btn);Snd.init();Snd.play('motif');
  await window.WenwengAssets.ensure('bg-study.webp');
  window.WenwengAssets.warm('bg-enrollment-v2.webp');
  for(let i=1;i<=6;i++)window.WenwengAssets.warm(`xm-orange-walk-${String(i).padStart(2,'0')}.webp`);
  const cv=$('#cover');
  await anim(cv,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.06)'}],{duration:900,easing:'ease-in'});
  cv.hidden=true;
}

/* 回忆镜头三则 */
const SHOTS={
  1:{tag:'弯路 · 一',
    html:`<div class="sc-shop"><div class="sc-wall"></div><div class="sc-roof"></div><div class="sc-plaque">七日速成</div>
      <div class="sc-door"><div class="inner"></div><div class="sc-leaf l"></div><div class="sc-leaf r"></div><div class="sc-sign">今日歇业</div></div>
      <div class="sc-dust"></div><div class="sc-coin"></div></div>`,
    before:'“七日速成，包教包会。”',btn:'交学费',
    after:'钱交了，速成班的门却关上了。',
    async play(f){const coin=f.querySelector('.sc-coin');Snd.play('coin');
      await anim(coin,[{transform:'translateY(0) scale(1)',opacity:1},{transform:'translateY(-260%) scale(.7)',opacity:1,offset:.7},{transform:'translateY(-330%) scale(.4)',opacity:0}],{duration:800});
      await sleep(260);
      await Promise.all([...f.querySelectorAll('.sc-leaf')].map(l=>anim(l,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:230,easing:'cubic-bezier(.6,0,1,.6)'})));
      Snd.play('thud');
      anim(f,[{transform:'translate(0,0)'},{transform:'translate(-5px,3px)'},{transform:'translate(4px,-2px)'},{transform:'translate(0,0)'}],{duration:280,easing:'linear'});
      anim(f.querySelector('.sc-dust'),[{opacity:0,transform:'scaleX(.6)'},{opacity:1,offset:.3},{opacity:0,transform:'scaleX(1.3)'}],{duration:900});
      await sleep(380);
      await anim(f.querySelector('.sc-sign'),[{opacity:0,transform:'translate(-50%,-40px) rotate(-14deg)'},{opacity:1,transform:'translate(-50%,0) rotate(-4deg)'}],{duration:520,easing:'cubic-bezier(.3,1.5,.5,1)'});
    }},
  2:{tag:'弯路 · 二',
    html:`<div class="sc-desk"></div><div class="sc-scroll"><div class="sc-paper"><small>押题答案 · 考前必中</small><b>请根据题目作答</b></div>
      <div class="sc-rod a"></div><div class="sc-rod b"></div></div><div class="sc-q">？</div>`,
    before:'“押题答案，考前必看。”',btn:'展开答案',
    after:'答案摊开，上面只有一句：请根据题目作答。',
    async play(f){Snd.play('page');
      const [a,b]=f.querySelectorAll('.sc-rod'),p=f.querySelector('.sc-paper');
      await Promise.all([
        anim(a,[{left:'46.5%'},{left:'0%'}],{duration:900,easing:'cubic-bezier(.3,.7,.2,1)'}),
        anim(b,[{left:'46.5%'},{left:'93%'}],{duration:900,easing:'cubic-bezier(.3,.7,.2,1)'}),
        anim(p,[{clipPath:'inset(0 50% 0 50%)'},{clipPath:'inset(0 0% 0 0%)'}],{duration:900,easing:'cubic-bezier(.3,.7,.2,1)'})]);
      await sleep(520);
      await anim(f.querySelector('.sc-q'),[{opacity:0,transform:'scale(.4) rotate(-20deg)'},{opacity:1,transform:'scale(1) rotate(8deg)'}],{duration:480,easing:'cubic-bezier(.3,1.6,.5,1)'});
    }},
  3:{tag:'弯路 · 三',
    html:`<div class="sc-hall"></div><div class="sc-frame"><div class="sc-bricks"></div><div class="sc-gate"><span>内部通道</span></div></div><div class="sc-thud">咚</div>`,
    before:'“内部通道，免试入学。”',btn:'推开门',
    after:'推开门，后面还是一堵墙。',
    async play(f){Snd.play('creak');
      await anim(f.querySelector('.sc-gate'),[{transform:'rotateY(0deg)'},{transform:'rotateY(-112deg)'}],{duration:1100,easing:'cubic-bezier(.4,0,.2,1)'});
      await sleep(220);Snd.play('thud');
      anim(f,[{transform:'translate(0,0)'},{transform:'translate(-4px,2px)'},{transform:'translate(3px,-2px)'},{transform:'translate(0,0)'}],{duration:260,easing:'linear'});
      await anim(f.querySelector('.sc-thud'),[{opacity:0,transform:'translate(-50%,-50%) scale(.5)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.1)',offset:.5},{opacity:0,transform:'translate(-50%,-70%) scale(1)'}],{duration:900});
    }},
};
async function playShot(n){
  if(n===1){await playSevenDayMemory();return}
  const s=SHOTS[n],shot=$('#shot'),frame=$('#shotFrame'),cap=$('#shotCap'),act=$('#shotAct');
  frame.innerHTML=`<div class="shot-tag">${s.tag}</div>`+s.html;cap.textContent=s.before;act.innerHTML='';
  shot.hidden=false;shot.classList.remove('out');frame.style.animation='none';void frame.offsetWidth;frame.style.animation='';
  mark('shot-'+n);await sleep(500);
  const b=document.createElement('button');b.className='shot-btn pulse';b.textContent=s.btn;act.appendChild(b);
  await tapOn(b);b.remove();
  await s.play(frame);
  cap.style.opacity=0;await sleep(120);cap.textContent=s.after;anim(cap,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:450});
  await sleep(700);
  const c=document.createElement('button');c.className='shot-btn';c.textContent='继续';act.appendChild(c);
  await tapOn(c);
  shot.classList.add('out');await sleep(330);shot.hidden=true;cap.style.opacity='';
}

// 三个连续的回忆镜头：角色和环境保留在画面里，虚构经历只作为故事引子。
async function playSevenDayMemory(){
  await window.WenwengAssets.ensure('bg-enrollment-v2.webp');
  window.WenwengAssets.warm('bg-classroom-v2.webp');
  const scene=document.createElement('section');scene.className='memory-seven';
  scene.setAttribute('aria-label','七日速成的虚构回忆');
  scene.innerHTML=`<div class="memory-bg"></div><div class="memory-shade"></div>
    <div class="memory-heading"><small>序 · 上一世　／　虚构回忆</small><strong>七日速成</strong></div>
    <div class="memory-poster"><b>七日速成</b><span>名师亲授 · 限时报名</span></div>
    <div class="memory-days">课程进行中<br><b>第一天 → 第六天</b></div>
    <div class="memory-notice"><b>停课告示</b><span>第七天，课堂空了。<br>承诺没有兑现。</span></div>
    <img class="memory-horse" src="assets/xm-orange-idle.webp" alt="小马翁">
    <div class="memory-dialog"><small>小马翁 · 回忆</small><p></p><button type="button"></button></div>`;
  stage.appendChild(scene);
  const text=scene.querySelector('.memory-dialog p'),btn=scene.querySelector('button'),horse=scene.querySelector('.memory-horse');
  const steps=[
    ['七天就能学会？听起来真有这么容易。','报名入学'],
    ['一天又一天过去，我等着那条许诺的捷径。','走到第七天'],
    ['人不见了，课也停了……原来我只顾着相信承诺。','回到书房']
  ];
  mark('shot-1');
  for(let i=0;i<steps.length;i++){
    if(i===1)await window.WenwengAssets.ensure('bg-classroom-v2.webp');
    scene.dataset.part=String(i);text.textContent=steps[i][0];btn.textContent=steps[i][1];
    if(i===2){horse.src='assets/xm-orange-sad.webp';Snd.play('low')}
    await tapOn(btn);
    if(i<2){Snd.play('page');await sleep(220)}
  }
  scene.classList.add('is-leaving');await sleep(350);scene.remove();
}

async function prologue(){
  mark('prologue');stage.dataset.scene='study';
  setSet('study',{x:1,y:.35});camSet({s:1.22,fx:.62,fy:.36});
  topbar.classList.add('on');setChapter('序 · 上一世');setProgress(6);
  const xmPast=$('#xmPast');
  camTo({s:1},3200,'cubic-bezier(.4,0,.2,1)');
  await titleCard({sub:'很多年以后 · 一间旧书房',main:'上一世',seal:'序',note:'本作为架空互动剧情'},2000);
  await say('','上一世，小马翁忙着找捷径，却没把书读明白。',{narr:true});
  await hideDialog();
  const posters=[...document.querySelectorAll('.poster')];const done=new Set();
  while(done.size<3){
    hint('点墙上的告示，看看他走过的弯路',`${done.size}/3`);mark('posters-'+done.size);
    posters.forEach(p=>p.classList.toggle('is-hot',!done.has(p.dataset.poster)));
    const n=await new Promise(r=>{const hs=posters.filter(p=>!done.has(p.dataset.poster)).map(p=>{const h=e=>{e.stopPropagation();hs.forEach(([q,f])=>q.removeEventListener('click',f));Snd.play('tap');r(p.dataset.poster)};p.addEventListener('click',h);return[p,h]})});
    hint(null);posters.forEach(p=>p.classList.remove('is-hot'));
    const p=posters.find(q=>q.dataset.poster===n);
    await anim(p,[{transform:'scale(1)'},{transform:'scale(1.06)'}],{duration:220});
    await playShot(+n);
    p.style.transform='';done.add(n);p.classList.add('done');Snd.play('stamp');setProgress(6+done.size*9);
    await sleep(500);
  }
  mark('regret');
  xmPast.querySelector('img').src='assets/xm-orange-sad.webp';
  xmPast.animate([{transform:'translateX(-50%) rotate(0)'},{transform:'translateX(-50%) rotate(4deg) translateY(2%)'}],{duration:T(1200),fill:'forwards',easing:'ease-out'});
  Snd.play('low');
  await say('小马翁','钱花了不少，路怎么越走越绕？');
  await hideDialog();
  mark('notice');
  const nt=$('#notice');nt.hidden=false;
  await tapOn($('#btnReboot'));
  setProgress(40);
  await rebirth();
}

async function rebirth(){
  await window.WenwengAssets.ensure('bg-street.webp');
  mark('rebirth');Snd.play('flash');
  const fl=$('#flash');
  await anim(fl,[{opacity:0},{opacity:.85}],{duration:260,easing:'ease-out'});
  $('#notice').hidden=true;
  // 把当前旧书房画面复制到纸页正面
  const pt=$('#pageTurn'),front=pt.querySelector('.pt-front');
  front.innerHTML='';const clone=world.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  clone.querySelector('.set-street').remove();clone.querySelectorAll('.xm').forEach(n=>n.remove());
  const camWrap=document.createElement('div');camWrap.style.cssText='position:absolute;inset:0;transform-origin:0 0;transform:'+cam.style.transform;
  camWrap.appendChild(clone);front.appendChild(camWrap);pt.hidden=false;
  // 底下换成街景
  stage.dataset.scene='street';setSet('street',{x:.5,y:.72});camSet({s:1.32,fx:.45,fy:.22,sy:.4});
  setChapter('第一幕 · 石室门前');topbar.classList.remove('on');
  await anim(fl,[{opacity:.85},{opacity:0}],{duration:500,easing:'ease-in'});
  Snd.play('page');
  const shade=document.createElement('div');shade.style.cssText='position:absolute;inset:0;background:linear-gradient(90deg,#0000,#0007);opacity:0';front.appendChild(shade);
  anim(shade,[{opacity:0},{opacity:1}],{duration:1300,easing:'ease-in'});
  await anim(pt.querySelector('.pt-front'),[{transform:'rotateY(0deg)'},{transform:'rotateY(-180deg)'}],{duration:1400,easing:'cubic-bezier(.55,.05,.35,1)'});
  pt.hidden=true;front.innerHTML='';front.style.transform='';
}

function spawnLeaves(){
  const box=$('#leaves');box.innerHTML='';
  for(let i=0;i<9;i++){const l=document.createElement('i');l.className='leaf';
    l.style.left=(Math.random()*90)+'%';l.style.animationDuration=(8+Math.random()*7)+'s';l.style.animationDelay=(-Math.random()*12)+'s';
    l.style.transform=`scale(${.7+Math.random()*.6})`;box.appendChild(l)}
}

async function street(){
  mark('street');spawnLeaves();
  const xm=$('#xm'),pA=$('#pA'),pB=$('#pB'),pC=$('#pC');
  const walkFrames=[...xm.querySelectorAll('.xm-walk img')];
  walkFrames.forEach(img=>{img.loading='eager'});
  setProgress(46);
  await camTo({s:1},1800,'cubic-bezier(.45,0,.2,1)');
  Snd.play('chime');
  await titleCard({sub:'西汉 · 蜀郡成都',main:'石室门前',seal:'第一幕',note:'街景与人物造型为美术演绎'},2300);
  topbar.classList.add('on');
  // 先交代街景，再轻推镜头；互动前等待镜头稳定。
  await camTo({s:1.06,fx:.52,fy:.58,sy:.5},2200,'cubic-bezier(.25,.1,.25,1)');
  // 小马翁从左侧走入
  xm.classList.toggle('walk-unavailable',!walkFrames.every(img=>img.complete&&img.naturalWidth>0));
  Object.assign(xm.style,{left:'-14%',bottom:'23%'});xm.classList.add('in','walking');
  await anim(xm,[{left:'-14%'},{left:'56%'}],{duration:2600,easing:'cubic-bezier(.25,.1,.35,1)'});
  xm.classList.remove('walking');xm.classList.add('hop');setTimeout(()=>xm.classList.remove('hop'),600);
  mark('arrive');
  await say('','纸页翻过，小马翁站在了一条古蜀街口。前方门里，据说正在办学。',{narr:true});
  await say('小马翁','这一次，我得先看清楚，再往前走。');
  await hideDialog();
  [pA,pB,pC].forEach((p,i)=>setTimeout(()=>p.classList.add('in'),T(i*260)));
  await sleep(700);
  setProgress(56);
  // 点两位路人
  const LINES={甲:'办学的事，得花多少心思？',乙:'听说有人去京师学习了，回来能做什么？'};
  const heard=new Set();
  while(heard.size<2){
    hint('点路人，听听他们在议论什么',`${heard.size}/2`);mark('passers-'+heard.size);
    [pA,pB].forEach(p=>p.classList.toggle('is-hot',!heard.has(p.dataset.who)));
    const p=await new Promise(r=>{const hs=[pA,pB].filter(p=>!heard.has(p.dataset.who)).map(p=>{const h=e=>{e.stopPropagation();hs.forEach(([q,f])=>q.removeEventListener('click',f));r(p)};p.addEventListener('click',h);return[p,h]})});
    p.classList.remove('is-hot');heard.add(p.dataset.who);
    bubble(p,'路人'+p.dataset.who,LINES[p.dataset.who],{dy:.04});
    setProgress(56+heard.size*6);
    // 对白由观众主动推进，不因计时过短而消失。
    hint('读完后轻触空白处继续');
    await waitTap();
    hint(null);clearBubbles();
    await sleep(350);
  }
  [pA,pB].forEach(p=>p.classList.remove('is-hot'));
  hint(null);
  await sleep(700);
  bubble(pC,'路人丙','这么多人议论，不如进去问问。',{dy:.05});
  mark('passer-c');
  await sleep(1200);
  hint('轻触画面继续');
  await waitTap();hint(null);clearBubbles();
  // 抉择
  setProgress(72);mark('choice');
  let k=await choose('小马翁要怎么做？',[
    {k:'a',label:'跟着议论',sub:'先凑个热闹，听大家怎么说',badge:'甲'},
    {k:'b',label:'上前了解',sub:'走到门前，问个明白',badge:'乙',cls:'main'}]);
  if(k==='a'){
    mark('choice-a');Snd.play('low');
    xm.querySelector('.xm-still').src='assets/xm-orange-thinking.webp';
    stage.classList.add('greyed');xm.classList.add('ghosting');[pA,pB,pC].forEach(p=>p.classList.add('dim'));
    await say('','小马翁跟着说了几句，越说越像上一世——只凭几句传言，就想下结论。',{narr:true});
    xm.classList.add('shake');setTimeout(()=>xm.classList.remove('shake'),500);
    await say('小马翁','等等，我连门都没进，听到的都只是半句话。');
    await hideDialog();
    xm.querySelector('.xm-still').src='assets/xm-orange-idle.webp';
    stage.classList.remove('greyed');xm.classList.remove('ghosting');[pA,pB,pC].forEach(p=>p.classList.remove('dim'));
    await sleep(500);
    k=await choose('换个做法',[{k:'b',label:'上前了解',cls:'main single'}]);
  }
  mark('choice-b');setProgress(84);
  xm.querySelector('.xm-still').src='assets/xm-orange-thinking.webp';
  xm.classList.add('hop');setTimeout(()=>xm.classList.remove('hop'),600);
  await say('小马翁','这次我先不急着下结论，问明白再说。');
  await hideDialog();
  xm.querySelector('.xm-still').src='assets/xm-orange-idle.webp';
  // 路人让开
  Snd.play('whoosh');
  await Promise.all([
    anim(pA,[{left:'20%',opacity:1},{left:'2%',opacity:.0}],{duration:900}),
    anim(pB,[{left:'80%',opacity:1},{left:'98%',opacity:0}],{duration:900}),
    anim(pC,[{left:'69%'},{left:'82%'}],{duration:900}),
    (async()=>{xm.classList.toggle('walk-unavailable',!walkFrames.every(img=>img.complete&&img.naturalWidth>0));xm.classList.add('walking');await anim(xm,[{left:'56%',bottom:'23%'},{left:'64%',bottom:'25%'}],{duration:900,easing:'linear'})})()
  ]);
  await gateShot();
}

async function gateShot(){
  mark('gate');
  const wipe=$('#wipe'),xm=$('#xm'),ww=$('#ww'),pC=$('#pC');
  await anim(wipe,[{clipPath:'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0%)'}],{duration:520,easing:'cubic-bezier(.7,0,.3,1)'});
  // 切到门前构图
  ['#pA','#pB'].forEach(s=>{const p=$(s);p.classList.remove('in');p.style.opacity=''});
  pC.classList.remove('in');pC.style.opacity='';
  xm.classList.remove('walking');xm.classList.add('right');
  Object.assign(xm.style,{left:'39%',bottom:'17%',height:'12.5%'});
  camSet({s:1.38,fx:.516,fy:.6,sy:.36});
  await anim(wipe,[{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 100% 0 0)'}],{duration:620,easing:'cubic-bezier(.7,0,.3,1)'});
  camTo({s:1.46,fx:.516,fy:.6,sy:.36},4200,'ease-out');
  setProgress(94);
  await sleep(500);
  $('#gateGlow').classList.add('on');Snd.play('chime');
  await sleep(600);
  ww.classList.add('in');
  await sleep(1100);
  mark('gate-arrive');
  await say('','石室门前，有人正迎了出来。',{narr:true});
  await hideDialog();
  setProgress(100);
  $('#endcard').hidden=false;mark('end');
}

$('#btnReplay').addEventListener('click',e=>{e.stopPropagation();location.href=location.pathname});

/* —— 启动 —— */
async function main(){
  layout();
  if(params.get('preview')==='memory'){ $('#cover').hidden=true;await playSevenDayMemory();return }
  const at=params.get('at');
  if(at==='street'||at==='gate'){
    $('#cover').hidden=true;await preload(()=>{});
    stage.dataset.scene='street';setSet('street',{x:.5,y:.72});setChapter('第一幕 · 石室门前');
    if(at==='gate'){topbar.classList.add('on');spawnLeaves();await gateShot();return}
    camSet({s:1.32,fx:.45,fy:.22,sy:.4});await street();return;
  }
  setSet('study',{x:1,y:.35});
  await cover();
  await prologue();
  await street();
}
main();
window.__wx={Snd,layout,camState:()=>camState};
})();
