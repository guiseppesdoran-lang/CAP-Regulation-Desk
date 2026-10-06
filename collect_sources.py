"""Fetch CAP national publications, change letters, and all region supplement indexes.
Run with bundled Python. Corpus records preserve PDF page and source URL.
"""
import concurrent.futures, datetime, hashlib, io, json, pathlib, re, urllib.parse, urllib.request, sys, gzip
from metadata import enrich
from html.parser import HTMLParser
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parent
BASE = 'https://www.gocivilairpatrol.com'
PATH = '/members/publications/'
INDEXES = ['indexes-regulations-and-manuals-1700', 'interim-change-letters-1708', 'approved-supplements-and-ois-by-region', 'pamphlets-1702']

class IndexParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.links=[]; self.row=None; self.anchor=None
    def handle_starttag(self, tag, attrs):
        if tag == 'tr': self.row={'text': [], 'links': []}
        if tag == 'a':
            self.anchor={'href': dict(attrs).get('href', ''), 'text': []}
            self.links.append(self.anchor)
            if self.row is not None: self.row['links'].append(self.anchor)
    def handle_data(self, text):
        if self.row is not None: self.row['text'].append(text.strip())
        if self.anchor is not None: self.anchor['text'].append(text.strip())
    def handle_endtag(self, tag):
        if tag == 'a': self.anchor=None
        if tag == 'tr' and self.row is not None: self.rows.append(self.row); self.row=None

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'CAPPublicationResearch/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def inventory():
    docs, visited, queue = {}, set(), [BASE + PATH + p for p in INDEXES]
    while queue:
        url = queue.pop(0)
        if url in visited: continue
        visited.add(url)
        soup = IndexParser(); soup.feed(fetch(url).decode('utf-8', errors='replace'))
        region = url.rstrip('/').split('/')[-1] if 'approved-supplements-and-ois-by-region/' in url else 'national'
        for row in soup.rows:
            text = ' '.join(row['text'])
            for a in row['links']:
                target = urllib.parse.urljoin(url, a['href'])
                if '.pdf' not in target.lower(): continue
                label = ' '.join(a['text']).strip()
                if not label: continue
                item = docs.setdefault(target, {'url': target, 'title': label, 'index_text': text, 'indexes': [], 'scope': region})
                if url not in item['indexes']: item['indexes'].append(url)
                if region != 'national': item['scope'] = region
        for a in soup.links:
            target = urllib.parse.urljoin(url, a['href']).split('#')[0]
            if target.startswith(BASE + PATH + 'approved-supplements-and-ois-by-region/') and target not in visited and target not in queue:
                queue.append(target)
    return [enrich(d) for d in docs.values()], sorted(visited)

def extract(doc):
    try:
        cache = ROOT / 'pdfs' / (hashlib.sha256(doc['url'].encode()).hexdigest()[:20] + '.pdf')
        cache.parent.mkdir(exist_ok=True)
        if not cache.exists() or '--refresh' in sys.argv:
            fresh=fetch(doc['url']); PdfReader(io.BytesIO(fresh))
            cache.write_bytes(fresh)
        reader = PdfReader(io.BytesIO(cache.read_bytes()))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ''
            text = re.sub(r'[ \t]+', ' ', text).strip()
            if text: pages.append({'page': i+1, 'text': text})
        if not pages: raise ValueError('No extractable text; requires OCR')
        return {**doc, 'pages': pages, 'sha256': hashlib.sha256(cache.read_bytes()).hexdigest(), 'status': 'extracted'}
    except Exception as e:
        return {**doc, 'pages': [], 'status': 'failed', 'error': str(e)}

if __name__ == '__main__':
    docs, indexes = inventory()
    print(f'Discovered {len(docs)} PDFs across {len(indexes)} indexes', flush=True)
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(extract, docs):
            results.append(result)
            print(f"{len(results)}/{len(docs)} {result['title']}: {result['status']}", flush=True)
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    corpus = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'indexes': indexes, 'documents': results}
    temp=out/'corpus.new.json'
    temp.write_text(json.dumps(corpus, ensure_ascii=False), encoding='utf-8')
    temp.replace(out/'corpus.json')
    compressed=ROOT/'corpus.new.json.gz'
    with gzip.open(compressed,'wt',encoding='utf-8',compresslevel=9) as stream:json.dump(corpus,stream,ensure_ascii=False)
    compressed.replace(ROOT/'corpus.json.gz')
    print(json.dumps({'documents': len(results), 'extracted': sum(d['status']=='extracted' for d in results), 'pages': sum(len(d['pages']) for d in results)}))
