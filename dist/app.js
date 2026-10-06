'use strict';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e};
let library, busy=false, chatHistory=[];
const stop=new Set('a an the can i my with is are to of in do does for how what wear may any and on it we our'.split(' '));
const terms=s=>(s.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(x=>!stop.has(x)&&x.length>1);
document.querySelector('.pill').textContent='REGULATION ASSISTANT';
document.querySelector('.notice').textContent='Ask any CAP or general question. Regulatory answers include source quotations when supporting evidence is available. The library is a dated snapshot; unresolved conflicts require official clarification.';
const contextLabel=node('label','Member and activity context (optional)');contextLabel.htmlFor='context';
const contextInput=document.createElement('input');contextInput.id='context';contextInput.maxLength=1000;contextInput.placeholder='Example: cadet, female blues, encampment';contextInput.style.cssText='width:100%;padding:12px;border:1px solid #b8c9d7;border-radius:8px;margin-bottom:15px;font:14px Segoe UI';
$('question').before(contextLabel,contextInput);
document.querySelector('label[for="scope"]').textContent='Wing or region';
$('submit').textContent='Ask';
const searchButton=node('button','Search original sources','example');searchButton.type='button';searchButton.disabled=true;
const clearButton=node('button','New conversation','example');clearButton.type='button';
document.querySelector('.examples').append(searchButton,clearButton);
const allScopes={NER:'CT MA ME NH NJ NY PA RI VT',MAR:'DC DE MD NC SC VA WV',GLR:'IL IN KY MI OH WI',SER:'AL FL GA MS PR TN',SWR:'AR AZ LA NM OK TX',NCR:'IA KS MN MO ND NE SD',RMR:'CO ID MT UT WY',PCR:'AK CA HI NV OR WA'};
const parent=wing=>Object.keys(allScopes).find(r=>allScopes[r].split(' ').includes(wing.slice(0,2)));
const applies=d=>{const s=$('scope').value;return s==='all'||d.scope==='national'||d.scope===s||(s.endsWith('WG')&&d.scope===parent(s))};
async function init(){
 try{const r=await fetch('/api/library');if(!r.ok)throw Error('This address is served by a different program. Launch start-chatbot.cmd and use the page it opens automatically.');library=await r.json();
 $('scope').replaceChildren();for(const o of library.scope_options){const el=node('option',o.label);el.value=o.value;$('scope').append(el)}
 $('status').textContent=library.documents.filter(d=>d.status==='extracted').length+' PDFs • '+library.documents.reduce((n,d)=>n+d.pages.length,0)+' pages • library collected '+new Date(library.checked_at).toLocaleDateString()+' • '+library.documents.filter(d=>d.status==='failed').length+' extraction gaps';
 $('submit').disabled=false;searchButton.disabled=false;
 }catch(e){$('status').textContent=e.message}
}
function card(c){const el=node('article','','result');el.append(node('h3','Evidence '+c.source_id+' · '+c.publication),node('p',(c.locator?'Locator '+c.locator+' · ':'')+'PDF page '+c.pdf_page+' · '+c.scope,'meta'),node('blockquote',c.quote));const link=node('a','Open original PDF · page '+c.pdf_page);link.href=c.url+'#page='+c.pdf_page;link.target='_blank';link.rel='noopener noreferrer';el.append(link,node('p',c.index_context,'meta'));return el}
function renderAnswer(a,q){
 const out=$('results'),turn=node('section','','panel');turn.style.marginBottom='24px';turn.append(node('h2',q));turn.append(node('p',a.status==='conflict'?'Conflicting guidance':a.status==='clarification'?'More context needed':a.status==='insufficient'?'Supporting evidence is incomplete':a.status==='informational'?'General information':'Regulation answer','eyebrow'),node('p',a.answer||''));
 if(a.applicability)turn.append(node('h3','Applicability'),node('p',a.applicability));
 for(const c of a.citations||[])turn.append(card(c));
 if(a.conflicts?.length){turn.append(node('h3','How the provisions conflict'));for(const c of a.conflicts)turn.append(node('p',c.explanation+' (Evidence '+c.source_ids.join(', ')+')'))}
 if(a.guidance)turn.append(node('h3','Where to seek guidance'),node('p',a.guidance));
 if(a.coverage)turn.append(node('p','Library collected '+new Date(a.coverage.downloaded_at).toLocaleDateString()+'. '+a.coverage.currency+' '+a.coverage.failed_pdfs+' PDF extraction gaps.','guide'));
 out.append(turn);turn.scrollIntoView({behavior:'smooth',block:'start'});
}
function setBusy(value){busy=value;$('submit').disabled=value;searchButton.disabled=value;clearButton.disabled=value;$('submit').textContent=value?'Checking evidence…':'Ask';$('question').disabled=value}
$('form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!library)return;const q=$('question').value.trim();if(!q)return;setBusy(true);const pending=node('p','Retrieving publications and checking the answer. This may take up to two minutes.','guide');$('results').append(pending);
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),255000);
 try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,scope:$('scope').value,context:contextInput.value,history:chatHistory.slice(-8)}),signal:abort.signal});let a;try{a=await r.json()}catch{throw Error('The server returned an unexpected response. Restart start-chatbot.cmd.')};if(!r.ok)throw Error(a.error||'The answer service failed.');pending.remove();renderAnswer(a,q);chatHistory.push({question:q,answer:a.answer.slice(0,3000)});if(chatHistory.length>8)chatHistory.shift();$('question').value='';$('question').placeholder='Ask a follow-up or a new question…';}
 catch(e){pending.textContent=e.name==='AbortError'?'The answer took too long. Try a more specific question.':e.message;pending.setAttribute('role','alert')}
 finally{clearTimeout(timer);setBusy(false);$('question').focus()}
});
searchButton.addEventListener('click',()=>{
 if(!library||busy)return;const q=$('question').value.trim();if(!q){$('question').focus();return}const words=terms(q),hits=[];
 for(const d of library.documents.filter(applies))for(const p of d.pages){const set=new Set(terms(p.text)),score=words.reduce((n,t)=>n+(set.has(t)?1:0),0);if(score>=Math.max(1,Math.ceil(words.length*.4)))hits.push({d,p,score})}
 hits.sort((a,b)=>b.score-a.score);const section=node('section','','panel');section.style.marginBottom='24px';section.append(node('h2','Source search: '+q),node('p','Matches are research evidence, not a regulatory conclusion. Expand the page to check exceptions and context.','guide'));
 for(const {d,p} of hits.slice(0,8)){const el=card({source_id:'search',publication:d.title,pdf_page:p.page,scope:d.scope,url:d.url,index_context:d.index_text,quote:p.text.slice(0,900)+(p.text.length>900?' […]':'')});const details=node('details'),summary=node('summary','Full extracted page');details.append(summary,node('pre',p.text));el.append(details);section.append(el)}
 if(!hits.length)section.append(node('p','No relevant passage found. Try the publication number or specific topic. A search miss does not establish permission or prohibition.'));$('results').append(section);
});
clearButton.addEventListener('click',()=>{chatHistory=[];$('results').replaceChildren();$('question').value='';$('question').focus()});
document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{$('question').value=b.dataset.q;$('question').focus()}));
init();
