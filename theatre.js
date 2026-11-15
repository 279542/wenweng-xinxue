/* 后续戏剧场景：空间、人物、对白和交互保持连续。 */
(()=>{
'use strict';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait=ms=>new Promise(r=>setTimeout(r,reduced()?30:ms));
const frames=Array.from({length:6},(_,i)=>`<img src="assets/xm-orange-walk-${String(i+1).padStart(2,'0')}.webp" style="--frame:${i}" alt="">`).join('');
function create(layer,chapter,bg,roles,showFacts){
 layer.hidden=false;layer.dataset.scene='theatre';
 layer.innerHTML=`<section class="act" data-bg="${bg}" aria-label="${chapter}"><div class="act-bg"></div><div class="act-shade"></div><div class="act-leaves" aria-hidden="true"><i></i><i></i><i></i><i></i></div><header class="act-header"><span class="next-seal">码上<br>清廉</span><span class="act-chapter">${chapter}</span><button class="next-facts" aria-label="史实与演绎说明">史</button></header><div class="act-note">场景、人物及对白为演绎</div><div class="act-world">${roles.map(role=>actor(role)).join('')}</div><div class="act-props"></div><div class="act-hint" aria-live="polite"></div><div class="act-dialog" hidden><div class="act-name"></div><p class="act-line"></p><div class="act-dialog-foot"><span>人物对白为创作演绎</span><button class="act-next" type="button">继续 <b>›</b></button></div></div><div class="act-options" hidden></div><div class="act-transition" aria-hidden="true"></div></section>`;
 const el=layer.querySelector('.act');el.querySelector('.next-facts').addEventListener('click',e=>{e.stopPropagation();showFacts()});
 return {el,world:el.querySelector('.act-world'),props:el.querySelector('.act-props'),hint:el.querySelector('.act-hint'),dialog:el.querySelector('.act-dialog'),name:el.querySelector('.act-name'),line:el.querySelector('.act-line'),next:el.querySelector('.act-next'),options:el.querySelector('.act-options')};
}
function actor(role){const map={horse:['xm-orange-idle.webp','小马翁'],wenweng:['wenweng-illustration-candidate.webp','文翁形象演绎'],merchant:['xiangshen-candidate.webp','虚构乡绅'],scholar:['scholar-candidate.webp','赴京学习者形象演绎'],student:['scholar-candidate.webp','学官学生形象演绎']};const [src,alt]=map[role];return `<div class="act-actor ${role}" data-role="${role}"><i class="act-shadow"></i><img class="act-portrait" src="assets/${src}" alt="${alt}">${role==='horse'?`<div class="act-horse-walk" aria-hidden="true">${frames}</div>`:''}</div>`}
const clearFocus=a=>{a.world.classList.remove('has-speaker');a.world.querySelectorAll('.speaking').forEach(x=>x.classList.remove('speaking'))};
function say(a,who,text,{label='继续',speaker=''}={}){a.name.textContent=who;a.line.textContent=text;a.next.innerHTML=label+' <b>›</b>';a.dialog.hidden=false;a.dialog.classList.remove('arrive');void a.dialog.offsetWidth;a.dialog.classList.add('arrive');const focus=!!speaker&&!!a.world.querySelector(`[data-role="${speaker}"]`);a.world.classList.toggle('has-speaker',focus);a.world.querySelectorAll('.act-actor').forEach(x=>x.classList.toggle('speaking',focus&&x.dataset.role===speaker));return new Promise(resolve=>{a.next.onclick=e=>{e.stopPropagation();a.next.onclick=null;a.dialog.hidden=true;clearFocus(a);resolve()}})}
function choice(a,prompt,items){a.dialog.hidden=true;clearFocus(a);a.options.hidden=false;a.options.innerHTML=`<p>${prompt}</p><div>${items.map((x,i)=>`<button type="button" data-choice="${i}">${x}</button>`).join('')}</div>`;return new Promise(resolve=>a.options.querySelectorAll('button').forEach(btn=>btn.onclick=e=>{e.stopPropagation();a.options.hidden=true;resolve(Number(btn.dataset.choice))}))}
function interact(a,prompt,html,setup){a.dialog.hidden=true;clearFocus(a);a.hint.textContent=prompt;a.hint.classList.add('visible');a.props.innerHTML=html;return new Promise(resolve=>setup(a.props,()=>{a.hint.classList.remove('visible');a.props.innerHTML='';resolve()}))}
async function fade(a){let f=a.el.querySelector('.act-transition');f.classList.add('on');await wait(420)}
async function actTwo({layer,showFacts,render}){
 await window.WenwengAssets.ensure('bg-street.webp');window.WenwengAssets.warm('bg-office-v1.webp');window.WenwengAssets.warm('props-atlas-v1.webp');
 let a=create(layer,'第二幕 · 名额之问','street',['horse','wenweng','merchant'],showFacts);
 await say(a,'旁白','正说着，一位乡绅走上前，拿出一张价签。');
 await say(a,'乡绅 · 虚构人物','这求学的机会，要是按出价安排，岂不是能多收些钱？',{speaker:'merchant'});
 a.world.querySelector('.horse .act-portrait').src='assets/xm-orange-thinking.webp';
 await say(a,'小马翁','那没钱的人怎么办？',{speaker:'horse'});
 let decision=await choice(a,'如果把机会标上价码……',['按出价安排','不该只看出价']);
 if(decision===0)await say(a,'小马翁','等等。这样一来，出不起价的人可能连机会都没有。',{speaker:'horse'});
 else await say(a,'小马翁','求学的机会，不该只看谁出的钱多。',{speaker:'horse'});
 await say(a,'文翁 · 形象演绎','兴学是为了育人。把目光放回求学的人身上，再想想这张价签。',{speaker:'wenweng'});
 a.world.querySelector('.horse .act-portrait').src='assets/xm-orange-idle.webp';
 await interact(a,'轻触价签，把它移开',`<button class="act-pricetag" type="button" aria-label="移开名额价签"><span>名额</span><strong>标价？</strong><small>轻触移开</small></button><div class="act-principle" aria-hidden="true"><span>兴学</span><span>育人</span></div>`,(host,done)=>{const b=host.querySelector('button');b.onclick=async()=>{b.disabled=true;host.classList.add('tag-removed');await wait(1200);done()}});
 await say(a,'旁白','文翁兴学的实际做法，可以从接下来这份记录里看到。');
 await fade(a);await actThree({layer,showFacts,render});
}
async function actThree({layer,showFacts,render}){
 await window.WenwengAssets.ensure('bg-office-v1.webp');await window.WenwengAssets.ensure('props-atlas-v1.webp');window.WenwengAssets.warm('bg-road-v1.webp');
 let a=create(layer,'第三幕 · 节用送学','office',['horse','wenweng'],showFacts);
 await say(a,'旁白','郡府案上，摊着用度记录与送学的行装。');
 await interact(a,'轻触案上的文书',`<button class="act-ledger" type="button" aria-label="查看少府用度文书"><span class="prop-sprite slips"></span><span class="act-prop-label">查看文书</span></button>`,(host,done)=>{host.querySelector('button').onclick=()=>done()});
 await say(a,'旁白','文翁挑选张叔等十余名郡县小吏，送往京师学习。');
 await say(a,'旁白','他又节省供太守使用的少府用度，购置蜀刀、蜀布，托人带给京师博士。');
 await say(a,'小马翁','这些东西，要送到哪里？先把它们装好吧。',{speaker:'horse'});
 await interact(a,'点蜀刀和蜀布，放入包裹（顺序不限）',`<div class="packing-board"><div class="packing-parcel"><span class="prop-sprite parcel"></span><b>送学行装</b></div><button class="packing-item cloth" type="button" data-item="cloth" aria-label="把蜀布放入包裹"><span class="prop-sprite fabric"></span><b>蜀布</b></button><button class="packing-item sword" type="button" data-item="knife" aria-label="把蜀刀放入包裹"><span class="prop-sprite blade"></span><b>蜀刀</b></button><p class="packing-count" aria-live="polite">已装入 0 / 2</p><button class="packing-done" type="button" hidden>查看包裹去向 →</button></div>`,(host,done)=>{const selected=new Set(),count=host.querySelector('.packing-count'),finish=host.querySelector('.packing-done');host.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{selected.add(b.dataset.item);b.disabled=true;b.classList.add('packed');count.textContent=`已装入 ${selected.size} / 2`;if(selected.size===2){count.textContent='行装已备好';finish.hidden=false}});finish.onclick=()=>done()});
 await say(a,'旁白','包裹上写着：送往京师博士。蜀刀、蜀布并非学生交给文翁的学费。');
 await window.WenwengAssets.ensure('bg-road-v1.webp');await fade(a);let road=create(layer,'第三幕 · 赴京求学','road',['horse','scholar'],showFacts);
 await say(road,'旁白','蜀地的学习者带着行装，踏上了前往京师的路。');
 await interact(road,'轻触道路，送他们启程',`<button class="road-depart" type="button">送他们出发 <span>→</span></button>`,(host,done)=>{host.querySelector('button').onclick=async()=>{host.innerHTML='';road.el.classList.add('departing');await wait(2200);done()}});
 await say(road,'小马翁','原来读书，不只是找一条最快的路。',{speaker:'horse'});
 await fade(road);render('gameIntro');
}
async function actFive({layer,showFacts,render}){
 await window.WenwengAssets.ensure('bg-road-v1.webp');window.WenwengAssets.warm('bg-classroom.webp');
 let a=create(layer,'第五幕 · 学成归来','road',['horse','scholar'],showFacts);a.el.classList.add('returning');
 await say(a,'旁白','数年后，赴京学习的蜀地小吏学成归来。');
 await say(a,'旁白','文翁任用其中一些人，并依次考察推举。');
 await window.WenwengAssets.ensure('bg-classroom.webp');await fade(a);let b=create(layer,'第五幕 · 石室兴学','academy',['horse','wenweng','student'],showFacts);
 await say(b,'旁白','后来，文翁在成都兴办学官，招收所属县的子弟，并免除他们的更徭。');
 await interact(b,'轻触学堂门前的竹简',`<button class="academy-scroll" type="button" aria-label="查看学官学生的故事"><span class="prop-sprite slips"></span><b>查看竹简</b></button>`,(host,done)=>{host.querySelector('button').onclick=()=>done()});
 await say(b,'旁白','文翁选择明经、品行端正的学官学生随行，让他们传达教令。');
 await say(b,'旁白','人们看到学习的价值，求学之风渐渐兴盛。');
 b.world.querySelector('.horse .act-portrait').src='assets/xm-orange-thinking.webp';
 await say(b,'小马翁','原来读书不是只看眼前快不快，还能让本领用得上，让更多人愿意学。',{speaker:'horse'});
 await fade(b);let end=create(layer,'结局 · 石室兴学','academy',['horse'],showFacts);end.el.classList.add('finale');
 await say(end,'《汉书·循吏传》','谨身帅先，居以廉平。',{label:'继续'});
 await say(end,'旁白','这是《汉书》对吴公、文翁等循吏的共同评价。');
 end.dialog.hidden=true;end.el.classList.add('finished');end.el.insertAdjacentHTML('beforeend',`<div class="act-final"><div class="final-seal">清风 · 育人</div><h2>石室兴学<br>廉平育人</h2><p>码上清廉，小故事悟大道理。</p><div><button type="button" data-final="again">重新体验</button><button type="button" data-final="facts">史实与演绎</button></div></div>`);end.el.querySelector('[data-final=again]').onclick=()=>location.href=location.pathname;end.el.querySelector('[data-final=facts]').onclick=showFacts;
}
window.WenwengTheatre={actTwo,actThree,actFive};
})();
