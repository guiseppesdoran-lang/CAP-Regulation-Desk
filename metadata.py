"""Exact organizational scope from official index row identifiers."""
import re

REGIONS = {
 'NER': 'CT MA ME NH NJ NY PA RI VT',
 'MAR': 'DC DE MD NC SC VA WV',
 'GLR': 'IL IN KY MI OH WI',
 'SER': 'AL FL GA MS PR TN',
 'SWR': 'AR AZ LA NM OK TX',
 'NCR': 'IA KS MN MO ND NE SD',
 'RMR': 'CO ID MT UT WY',
 'PCR': 'AK CA HI NV OR WA',
}
WING_REGION={wing+'WG':region for region,wings in REGIONS.items() for wing in wings.split()}
WING_NAMES=dict(zip('AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA PR RI SC SD TN TX UT VA VT WA WI WV WY'.split(),['Alaska','Alabama','Arkansas','Arizona','California','Colorado','Connecticut','National Capital','Delaware','Florida','Georgia','Hawaii','Iowa','Idaho','Illinois','Indiana','Kansas','Kentucky','Louisiana','Massachusetts','Maryland','Maine','Michigan','Minnesota','Missouri','Mississippi','Montana','North Carolina','North Dakota','Nebraska','New Hampshire','New Jersey','New Mexico','Nevada','New York','Ohio','Oklahoma','Oregon','Pennsylvania','Puerto Rico','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Virginia','Vermont','Washington','Wisconsin','West Virginia','Wyoming']))
def enrich(doc):
    doc=dict(doc)
    local=any('approved-supplements-and-ois-by-region/' in u for u in doc.get('indexes',[]))
    first=re.match(r'\s*([A-Z]{2}WG|NER|MAR|GLR|SER|SWR|NCR|RMR|PCR)\b',doc.get('index_text',''))
    authority=first.group(1) if first and local else 'unknown-local' if local else 'national'
    doc['scope']=authority
    doc['region']=WING_REGION.get(authority,authority if authority in REGIONS else '')
    doc['publication_id']=next(iter(re.findall(r'\b(?:R|M|P)\s*\d{1,3}-\d+(?:\s*\(I\))?',doc.get('index_text',''),re.I)),doc.get('title',''))
    doc['publication_id']=re.sub(r'\s+','',doc['publication_id']).upper()
    doc['index_status']='obsolete' if re.search(r'\bobsolete|\bexpired|\bpast due',doc.get('index_text',''),re.I) else 'review required' if re.search(r'\bdue\b|revisions in progress',doc.get('index_text',''),re.I) else 'listed'
    return doc
def applies(doc,scope):
    if scope=='all' or doc['scope']=='national':return True
    if scope in WING_REGION:return doc['scope'] in (scope,WING_REGION[scope])
    return doc['scope']==scope
def options():
    return [{'value':'national','label':'National guidance — wing not selected'}, {'value':'all','label':'Compare all regions and wings'}]+[{'value':w,'label':WING_NAMES[w[:2]]+' Wing ('+w+')'} for w in sorted(WING_REGION,key=lambda w:WING_NAMES[w[:2]])]+[{'value':r,'label':r+' Region guidance only'} for r in REGIONS]
