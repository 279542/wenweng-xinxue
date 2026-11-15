/* Load scenes individually; slow or failed connections must not trap the viewer. */
(()=>{
'use strict';
const pending=new Map(), ready=new Set();
function load(name){
 if(ready.has(name))return Promise.resolve(true);
 if(pending.has(name))return pending.get(name);
 const p=new Promise(resolve=>{
  const img=new Image();let settled=false;
  const finish=ok=>{if(settled)return;settled=true;clearTimeout(timeout);img.onload=img.onerror=null;if(ok)ready.add(name);resolve(ok)};
  const timeout=setTimeout(()=>finish(false),12000);
  img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src='assets/'+name;
 }).then(ok=>{pending.delete(name);return ok});
 pending.set(name,p);return p;
}
function warm(name){load(name)}
async function ensure(name){
 if(ready.has(name))return true;
 const stage=document.querySelector('#stage');let overlay=null;
 const show=()=>{if(overlay)return;overlay=document.createElement('div');overlay.className='scene-loading';overlay.setAttribute('role','status');overlay.innerHTML='<div class="scene-loading-card"><strong>正在展开画卷</strong><p>场景正在加载，请稍候…</p></div>';stage.appendChild(overlay)};
 const delay=setTimeout(show,400);
 let ok=await load(name);clearTimeout(delay);
 while(!ok){
  show();overlay.innerHTML='<div class="scene-loading-card"><strong>画面加载较慢</strong><p>网络可能不稳定，请重试；也可以继续阅读。</p><div><button type="button" data-retry>重新加载</button><button type="button" data-skip>继续阅读</button></div></div>';
  const retry=await new Promise(resolve=>{overlay.querySelector('[data-retry]').onclick=()=>resolve(true);overlay.querySelector('[data-skip]').onclick=()=>resolve(false)});
  if(!retry)break;
  overlay.querySelector('p').textContent='正在重新加载，请稍候…';overlay.querySelectorAll('button').forEach(b=>b.disabled=true);
  ok=await load(name);
 }
 if(overlay)overlay.remove();return ok;
}
window.WenwengAssets={ensure,warm};
})();
