"""Build only allowlisted public resources; credentials are never bundled."""
import pathlib, sys, subprocess
ROOT=pathlib.Path(__file__).resolve().parent
subprocess.run([sys.executable,'-m','PyInstaller','--noconfirm','--clean','--onefile','--windowed','--name','CAP-Regulation-Desk','--distpath',str(ROOT/'release'),'--workpath',str(ROOT/'build'),'--specpath',str(ROOT/'build'),'--add-data',str(ROOT/'dist/index.html')+':dist','--add-data',str(ROOT/'dist/app.js')+':dist','--add-data',str(ROOT/'corpus.json.gz')+':.','--add-data',str(ROOT/'ANSWER_POLICY.md')+':.',str(ROOT/'desktop.py')],cwd=ROOT,check=True)
