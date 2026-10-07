export const normalize = text => String(text).replace(/\s+/g, ' ').trim();
const stop = new Set('a an the can i my with is are do does it of to in and for what how should me wear'.split(' '));
export function terms(text) {
  text = text.toLowerCase();
  if (/blues|pink.*shirt/.test(text)) text += ' light blue shirt service uniform';
  if (/capr?\s*39[- ]1|uniform/.test(text)) text += ' 39-1 uniform';
  return [...new Set((text.match(/[a-z0-9]+(?:-[0-9]+)?/g) || []).filter(t => t.length > 1 && !stop.has(t)))];
}
export function createIndex(corpus) {
  return corpus.documents.flatMap(doc => (doc.pages || []).map(page => ({doc, page:page.page, text:page.text, lower:page.text.toLowerCase()})));
}
export function applies(doc, scope) {
  if (scope === 'all' || doc.scope === 'national') return true;
  if (scope.endsWith('WG')) return doc.scope === scope || doc.scope === doc.region && doc.region === wingRegion(scope);
  return doc.scope === scope;
}
function wingRegion(wing) {
  const regions={NER:'CT MA ME NH NJ NY PA RI VT',MAR:'DC DE MD NC SC VA WV',GLR:'IL IN KY MI OH WI',SER:'AL FL GA MS PR TN',SWR:'AR AZ LA NM OK TX',NCR:'IA KS MN MO ND NE SD',RMR:'CO ID MT UT WY',PCR:'AK CA HI NV OR WA'};
  return Object.keys(regions).find(r => regions[r].split(' ').includes(wing.slice(0,2)));
}
export function search(index, question, scope='all', limit=8) {
  const query=terms(question), scored=[];
  for (const item of index) {
    if (!applies(item.doc,scope)) continue;
    let score=0;
    for (const term of query) {
      const count=item.lower.split(term).length-1;
      if (count) score += (1 + Math.log(count)) / (1 + Math.log(1 + item.text.length / 1000));
      if ((item.doc.publication_id || '').toLowerCase().includes(term)) score += 3;
    }
    if (score>0) scored.push({...item,score});
  }
  scored.sort((a,b)=>b.score-a.score);
  const selected=[],counts=new Map();
  for (const item of scored) {
    const count=counts.get(item.doc.url)||0;
    if (count>=3) continue;
    counts.set(item.doc.url,count+1);
    const positions=query.map(t=>item.lower.indexOf(t)).filter(p=>p>=0);
    const start=Math.max(0,(positions.length ? Math.min(...positions) : 0)-180);
    selected.push({...item,id:'S'+(selected.length+1),excerpt:item.text.slice(start,start+900)});
    if(selected.length===limit) break;
  }
  return selected;
}
export function validateAnswer(answer,sources) {
  const statuses=['supported','conflict','insufficient','clarification','informational'];
  if (!answer || !statuses.includes(answer.status) || typeof answer.answer!=='string' || !answer.answer.trim() || !Array.isArray(answer.citations)) throw Error('Incomplete AI response');
  const verified=answer.citations.map(c => {
    const source=sources.find(s=>s.id===c.source_id);
    if(!source || typeof c.quote!=='string' || normalize(c.quote).length<20 || !normalize(source.text).includes(normalize(c.quote))) throw Error('AI quotation did not match the publication');
    if(c.locator && !normalize(source.text).includes(normalize(c.locator))) throw Error('AI paragraph locator did not match the page');
    return {...c,source};
  });
  if(['supported','conflict'].includes(answer.status) && !verified.length) throw Error('Missing evidence');
  if(answer.status==='informational' && sources.length) throw Error('Uncited regulatory answer withheld');
  if(answer.status==='conflict' && (new Set(verified.map(c=>c.source.doc.url)).size<2 || !answer.conflict || !answer.guidance)) throw Error('Conflict requires both sources and guidance');
  return {...answer,citations:verified};
}
