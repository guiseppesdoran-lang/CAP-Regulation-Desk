import {applies,normalize} from './retrieval.mjs';
const STOP=new Set('a an the can could would should i my me you your we our with is are was were do does did it its of to in and or for what how when where why wear wearing please tell about question allowed allow need want cap civil air patrol regulation regulations'.split(' '));
const ALIASES=[
 [/blues|service dress/i,'light blue shirt service uniform'],
 [/cadet protection|supervision|chaperon/i,'cadet protection supervision senior member'],
 [/flight release/i,'flight release officer'],
 [/pt uniform|physical training/i,'physical training uniform'],
 [/ribbon|medal/i,'ribbon medal award decoration'],
 [/haircut|hairstyle/i,'hair grooming'],
 [/promotion|promote/i,'promotion grade achievement'],
 [/emergency service|sar|search and rescue/i,'emergency services qualification'],
 [/dues|join|joining/i,'membership application dues']
];
export function keywords(text,expand=true){
 let value=String(text).toLowerCase();
 if(expand)for(const [pattern,words] of ALIASES)if(pattern.test(value))value+=' '+words;
 return [...new Set((value.match(/[a-z0-9]+(?:-[0-9]+)?/g)||[]).filter(t=>t.length>1&&!STOP.has(t)))];
}
function excerpt(text){
 const clean=text.trim();
 let end=0,count=0;
 for(const match of clean.matchAll(/[.!?](?=\s+[A-Z]|\s*$)/g)){
  end=match.index+1;count++;
  if(end>=180&&count>=2||end>=900)break;
 }
 return clean.slice(0,Math.min(end||clean.length,1200)).trim();
}
export function createKnowledge(corpus){
 const records=[],postings=new Map();
 for(const doc of corpus.documents){
  for(const page of doc.pages||[]){
   const blocks=page.text.split(/\n\s*\n|\n(?=\s*\d+(?:\.\d+){1,6}\.?\s+[A-Z])/).filter(s=>s.trim().length>=35);
   for(const block of blocks){
    const text=block.trim(),quote=excerpt(text);
    const locator=text.match(/^\s*(\d+(?:\.\d+){1,6}\.?)(?=\s)/)?.[1]||'';
    const record={doc,page:page.page,text:page.text,block:text,excerpt:quote,locator};
    const id=records.length;records.push(record);
    const words=keywords(text,false);
    for(const word of words){if(!postings.has(word))postings.set(word,[]);postings.get(word).push(id);}
   }
  }
 }
 return {records,postings,count:records.length};
}
function usable(doc){return !/obsolete|superseded|rescinded/i.test(String(doc.index_status||''));}
export function findEvidence(knowledge,question,scope='all',limit=8){
 const original=keywords(question,false),expanded=keywords(question),scores=new Map(),hits=new Map();
 for(const word of expanded){
  const ids=knowledge.postings.get(word)||[];
  const weight=Math.log(1+(knowledge.count+1)/(ids.length+1))*(original.includes(word)?2:0.6);
  for(const id of ids){
   const record=knowledge.records[id];
   if(!applies(record.doc,scope)||!usable(record.doc))continue;
   scores.set(id,(scores.get(id)||0)+weight);
   if(original.includes(word)){if(!hits.has(id))hits.set(id,new Set());hits.get(id).add(word);}
  }
 }
 const publication=String(question).match(/\b(?:CAP[RP]|reg(?:ulation)?)\s*(\d{1,3}[- ]\d{1,3})\b/i)?.[1]?.replace(' ','-');
 const ranked=[...scores].map(([id,score])=>{
  const r=knowledge.records[id],hit=hits.get(id)?.size||0;
  const exact=publication&&String(r.doc.publication_id).includes(publication);
  return {...r,score:(score+(exact?20:0))/(1+Math.log(1+r.block.length/700)),coverage:hit/Math.max(original.length,1),hit,exact};
 }).filter(r=>(r.hit>=Math.min(ALIASES.some(([pattern])=>pattern.test(question))?1:2,original.length)&&r.coverage>=0.25)||r.exact).sort((a,b)=>b.score-a.score);
 const picked=[],counts=new Map();
 for(const r of ranked){
  const key=r.doc.url+'#'+r.page+'#'+r.excerpt;
  if(picked.some(p=>p.key===key))continue;
  if((counts.get(r.doc.url)||0)>=3)continue;
  counts.set(r.doc.url,(counts.get(r.doc.url)||0)+1);
  picked.push({...r,key,id:'S'+(picked.length+1)});
  if(picked.length>=limit)break;
 }
 return picked;
}
export function guidanceFor(question){
 if(/uniform|blues|shirt|ribbon|hair/i.test(question))return 'Ask your unit commander for guidance on the applicable uniform requirement; the wing commander or designated uniform policy staff can clarify supplements.';
 if(/flight|pilot|aircraft/i.test(question))return 'Ask your unit commander and the wing director of operations or standardization/evaluation officer.';
 if(/cadet|supervision|promotion/i.test(question))return 'Ask your unit commander and the wing director of cadet programs.';
 if(/emergency|rescue|qualification/i.test(question))return 'Ask your unit commander and the wing emergency services officer.';
 if(/finance|dues|money/i.test(question))return 'Ask your unit commander and the wing finance officer.';
 return 'Ask your unit commander and the wing officer responsible for this subject.';
}
function possibleDifferences(sources){
 const pairs=[];
 for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++){
  const a=sources[i],b=sources[j];
  if(a.doc.url===b.doc.url||a.doc.scope!==b.doc.scope)continue;
  const clauses=source=>[...source.block.matchAll(/([^.!?\n]{8,100}?)\s+(must not|shall not|may not|must|shall|may)\s+([^.!?\n]{8,130})/gi)];
  for(const x of clauses(a))for(const y of clauses(b)){
   if(normalize(x[1]).toLowerCase()!==normalize(y[1]).toLowerCase())continue;
   if(normalize(x[3]).toLowerCase()!==normalize(y[3]).toLowerCase())continue;
   const negative=m=>/not/i.test(m[2]);
   if(negative(x)===negative(y))continue;
   // Opposite wording is a review candidate, not proof of an actual conflict.
   if(!pairs.some(p=>p.a.id===a.id&&p.b.id===b.id))pairs.push({a,b,explanation:a.doc.publication_id+' says "'+normalize(x[0])+'"; '+b.doc.publication_id+' says "'+normalize(y[0])+'". Their wording differs; dates, exceptions and the applicable situation need review.'});
  }
 }
 return pairs.slice(0,2);
}
export function answerQuestion(knowledge,question,scope='all',previous=''){
 question=String(question).trim();
 if(/^(hi|hello|hey|thanks|thank you)[!. ]*$/i.test(question))return {status:'informational',answer:'Ask a Civil Air Patrol question, include a regulation number if you know it, and choose your wing when local rules matter.',sources:[],differences:[],guidance:''};
 const query=/^(what about|and what|does that|is that|can i do that|what if)/i.test(question)&&previous?previous+' '+question:question;
 const sources=findEvidence(knowledge,query,scope);
 if(!sources.length)return {status:'insufficient',answer:'I could not establish an answer from the indexed CAP publications. This does not mean the activity is allowed or prohibited. Try the publication number, a specific activity, or a more precise description.',sources:[],differences:[],guidance:guidanceFor(query)};
 let answer='These are the closest matching provisions. Read their conditions and exceptions before applying them; a text match alone does not establish a yes or no answer.';
 let result='evidence';
 if(/pink\b/i.test(query)&&/shirt/i.test(query)&&/blues|service uniform|service dress/i.test(query)){
  const requirement=sources.find(s=>/39-1/.test(s.doc.publication_id||'')&&/light[\s-]*blue/i.test(s.excerpt)&&/shirt/i.test(s.excerpt));
  if(requirement){
   answer='For the blues shirt described in the cited provision, a pink shirt does not meet the specified light-blue color requirement. Check that this provision describes your exact uniform variant.';
   sources.splice(sources.indexOf(requirement),1);sources.unshift(requirement);result='supported';
  }
 }
 const differences=possibleDifferences(sources);
 if(differences.length){result='review';answer='I found opposite wording in matching passages from different publications. This is a potential discrepancy, not a confirmed conflict: applicability, publication dates and exceptions need review.';}
 return {status:result,answer,sources,differences,guidance:differences.length||result==='evidence'?guidanceFor(query):'',scopeNote:scope==='all'?'All-wing results compare jurisdictions. Another wing’s supplement may not apply to you. Choose your wing for local guidance.':''};
}
