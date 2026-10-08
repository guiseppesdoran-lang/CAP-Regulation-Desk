import {createKnowledge,answerQuestion} from './engine.mjs';
const $=id=>document.getElementById(id);
let knowledge,corpus,previous='',busy=false;
const status=text=>{$('status').textContent=text;};
function element(tag,text,parent){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
function card(source,parent){
 const box=element('article','',parent);box.className='result';
 element('h3',source.doc.publication_id||source.doc.title,box);
 element('p',source.doc.scope+' · PDF page '+source.page+(source.locator?' · Paragraph '+source.locator:' · Paragraph number unavailable in extracted text'),box).className='meta';
 element('p','Publication index status: '+(source.doc.index_status||'Review source date'),box).className='meta';
 element('blockquote',source.excerpt,box);
 const link=element('a','Open original publication at this PDF page',box);
 if(/^https:\/\//.test(source.doc.url)){link.href=source.doc.url+'#page='+source.page;link.target='_blank';link.rel='noopener noreferrer';}
}
function lock(value){busy=value;$('submit').disabled=value||!knowledge;$('clear').disabled=value;}
$('clear').onclick=()=>{previous='';$('results').replaceChildren();$('question').value='';status('Conversation cleared. Ready for a question.');};
$('form').onsubmit=async event=>{
 event.preventDefault();if(busy||!knowledge)return;
 const question=$('question').value.trim();if(!question)return;
 lock(true);status('Checking the publication library…');
 await new Promise(resolve=>setTimeout(resolve,0));
 try{
  const answer=answerQuestion(knowledge,question,$('scope').value,previous);
  const turn=element('section','',$('results'));
  element('h2',question,turn);element('p',answer.answer,turn);
  if(answer.scopeNote)element('p',answer.scopeNote,turn).className='guide';
  for(const difference of answer.differences){
   element('h3','Potential discrepancy to review',turn);
   element('p',difference.explanation,turn);
   element('p','Compared scope: '+difference.a.doc.scope+'. Check issue dates, interim changes, approved supplements and exceptions.',turn);
  }
  if(answer.guidance)element('p',answer.guidance,turn);
  for(const source of answer.sources)card(source,turn);
  if(!answer.sources.length&&answer.status!=='informational')element('p','No supporting citation was found in the indexed snapshot.',turn);
  previous=question;
  status(answer.sources.length+' matching provisions · Quotations copied directly from indexed PDF text.');
  turn.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){status('Could not complete the search: '+error.message);}finally{lock(false);}
};
document.querySelectorAll('[data-q]').forEach(button=>button.onclick=()=>{$('question').value=button.dataset.q;$('question').focus();});
try{
 const response=await fetch('./corpus.json');if(!response.ok)throw Error('Library download failed ('+response.status+')');
 corpus=await response.json();
 $('scope').replaceChildren(...corpus.scope_options.map(o=>{const option=document.createElement('option');option.value=o.value;option.textContent=o.label;return option;}));
 $('scope').value='all';
 status('Building the regulation index…');
 await new Promise(resolve=>setTimeout(resolve,0));
 knowledge=createKnowledge(corpus);
 status(corpus.documents.length+' publications · '+knowledge.count+' indexed passages · Library checked '+corpus.checked_at+'. Ready.');
 lock(false);
}catch(error){status(error.message+' Reload the page to retry.');}
