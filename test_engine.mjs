import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createKnowledge,answerQuestion} from './web/engine.mjs';
const paragraph='4.1.11.1.1. The light blue shirt is worn with the service uniform. The shirt must be clean and pressed.';
const doc=(id,scope,text,status='indexed')=>({publication_id:id,scope,url:'https://example.com/'+id+'.pdf',index_status:status,pages:[{page:76,text}]});
const base=doc('CAPR 39-1','national',paragraph);
const knowledge=createKnowledge({documents:[base]});
const pink=answerQuestion(knowledge,'Can I wear a pink shirt with my blues?');
assert.equal(pink.status,'supported');
assert.equal(pink.sources[0].locator,'4.1.11.1.1.');
assert.equal(pink.sources[0].excerpt,paragraph);
assert.ok(pink.sources[0].text.includes(pink.sources[0].excerpt));
assert.equal(answerQuestion(knowledge,'unicorn teleportation zebra').status,'insufficient');
assert.equal(answerQuestion(knowledge,'hello').status,'informational');
assert.equal(answerQuestion(createKnowledge({documents:[doc('CAPR 39-1','national',paragraph,'obsolete')]}),'pink shirt blues').status,'insufficient');
const allow='1.1. Members may carry the equipment during the exercise.';
const forbid='1.1. Members may not carry the equipment during the exercise.';
const conflicts=createKnowledge({documents:[doc('R1','national',allow),doc('R2','national',forbid)]});
const compared=answerQuestion(conflicts,'carry equipment exercise');
assert.equal(compared.status,'review');
assert.equal(compared.differences.length,1);
assert.ok(compared.guidance.includes('commander'));
const wings=createKnowledge({documents:[doc('W1','CAWG',allow),doc('W2','TXWG',forbid)]});
assert.equal(answerQuestion(wings,'carry equipment exercise','all').differences.length,0);
assert.equal(answerQuestion(wings,'carry equipment exercise','CAWG').sources.length,1);
const missingRule=answerQuestion(createKnowledge({documents:[doc('CAPR 39-1','national','4.1. A shirt is part of the uniform. Members must keep the shirt clean.')]}),'pink shirt blues');
assert.notEqual(missingRule.status,'supported');
if(process.argv.includes('--corpus')){
 const corpus=JSON.parse(readFileSync('site/corpus.json','utf8'));
 const actual=answerQuestion(createKnowledge(corpus),'Can I wear a pink shirt with my blues?');
 assert.equal(actual.status,'supported','Snapshot must substantiate the pink-shirt example');
 assert.ok(actual.sources[0].text.includes(actual.sources[0].excerpt));
 assert.ok(/39-1/.test(actual.sources[0].doc.publication_id));
 for(const question of ['cadet protection supervision','flight release officer']){
  const response=answerQuestion(createKnowledge(corpus),question);
  assert.ok(response.sources.length>0,question);
  for(const s of response.sources)assert.ok(s.text.includes(s.excerpt));
 }
}
console.log('Original engine: quotes, locators, uncertainty, obsolete sources, scope and discrepancy checks passed.');
