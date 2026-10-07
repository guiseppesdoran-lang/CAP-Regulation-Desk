"""Build a static, secret-free GitHub Pages artifact using only Python stdlib."""
import gzip
import json
import shutil
from pathlib import Path
from metadata import enrich, options

ROOT = Path(__file__).resolve().parent

def build():
    destination = ROOT / 'site'
    destination.mkdir(exist_ok=True)
    for source in (ROOT / 'web').iterdir():
        if source.is_file():
            shutil.copyfile(source, destination / source.name)
    with gzip.open(ROOT / 'corpus.json.gz', 'rt', encoding='utf-8') as stream:
        corpus = json.load(stream)
    corpus['documents'] = [enrich(doc) for doc in corpus['documents']]
    corpus['scope_options'] = options()
    (destination / 'corpus.json').write_text(json.dumps(corpus, ensure_ascii=False), encoding='utf-8')
    (destination / '.nojekyll').write_text('', encoding='utf-8')
    print(f'Built static site: {len(corpus["documents"])} publications')

if __name__ == '__main__':
    build()
