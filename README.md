# CAP Regulation Desk

An independent, self-contained Civil Air Patrol regulation assistant hosted on GitHub Pages. The website uses original JavaScript retrieval and a small deterministic rule engine. It requires no external AI backend, API key, credits, model download or WebGPU. There is no per-question service quota; browser resources and GitHub hosting limits still apply.

## Website

Ask a CAP question and select a wing or compare all jurisdictions. The app indexes its bundled publication snapshot, returns exact text with regulation, extracted paragraph number and PDF page, and links to the original publication. Only source text is quoted. Missing paragraph numbers are explicitly identified.

A supported built-in rule handles the pink-shirt/blues example when CAPR 39-1's retrieved text specifies a light-blue shirt. Other questions receive matching evidence rather than invented yes/no answers. Questions outside the corpus get a missing-evidence response. Follow-ups beginning with references such as 'what about' reuse the previous question.

Opposite wording in different publications with the same scope is flagged as a potential discrepancy. The app quotes both passages and recommends appropriate command/functional guidance. It does not claim to resolve legal precedence, exceptions or real-world applicability automatically. Different wings are comparisons, not automatic conflicts. Obsolete/superseded/rescinded indexed sources are excluded from answer evidence. Index status and snapshot age remain visible; current authority must be verified.

This is a deterministic research assistant, not a general-purpose language model. It does not reliably interpret every possible question or certify compliance. The bundled October 6, 2026 snapshot contains 428 documents; 424 have extracted PDF text. Scanned or unavailable text and subsequent changes can limit answers.

The website downloads its code and corpus from its own GitHub Pages origin. It makes no AI-service requests and has a same-origin content security policy. Clicking a source link opens the official external PDF. Questions and conversation context remain in browser memory; Clear conversation resets them. No personal question history is uploaded or retained by this app.

## Build and deploy

Set GitHub Pages Source to GitHub Actions. The Publish free website workflow deploys changes on main and can be run manually. Build with `python build_website.py`; test with `node test_web.mjs` and `node test_engine.mjs --corpus` after building. Serve locally with `python -m http.server 8899 --directory site`. Tests cover exact quotes, locators, unsupported conclusions, obsolete sources, scope, discrepancy candidates, and the actual snapshot's pink-shirt/cadet/flight searches.

Refresh official publication data using `python collect_sources.py --refresh`, commit `corpus.json.gz`, and deploy again. The static artifact contains public text and website assets only. The legacy desktop app below is separate and uses paid API services.

## Legacy Windows executable (uses paid API credits)

1. In this repository's **Actions** tab, open the latest successful **Build standalone Windows app** run.
2. Download **CAP-Regulation-Desk-Windows**, extract the ZIP, and run **CAP-Regulation-Desk.exe**.
3. Click **Configure API key** to save your own OpenAI API key locally, then **Open question bot**.
4. Keep the desktop window open. Use the browser address it opens automatically.

The executable includes Python and the publication library. AI answers require internet, an API key, and OpenAI API credits. Source research works offline. The app is standalone; its AI model is an online service rather than an offline model.

## From source

Install Python 3.12 or newer from python.org. On Windows, run **setup-windows.cmd** once, then **start-chatbot.cmd**. On other systems with Python and Tk:

```sh
python -m venv .venv
# Activate the environment for your platform.
python -m pip install -r requirements.txt
python desktop.py
```

A console server is available with `python server.py --open-browser`. `OPENAI_API_KEY` can be supplied through the environment. `OPENAI_MODEL` defaults to `gpt-5-mini`.

## Questions, citations, and conflicts

Ask free-form CAP questions about uniforms, cadet programs, emergency services, flight operations, membership, administration, and other topics. Follow-ups retain the conversation. General informational questions are also supported. Select your wing when location matters: searches include national, selected-wing, and parent-region guidance. All-region mode supports comparisons.

The app plans searches from the actual publication catalog, retrieves source pages and neighboring context, and requests a structured answer. Regulatory conclusions require quotations. Quotes and paragraph labels are checked against retrieved text. Citations link to original PDF pages. Conflict reports quote both provisions, explain the incompatible requirements, and identify where to seek guidance. Missing evidence is acknowledged rather than treated as permission or prohibition.

The included snapshot contains **424 extracted PDFs and 4,816 pages**, collected October 6, 2026. It includes national publications, interim change letters, pamphlets, and approved region/wing indexes. Four Alaska Wing finance forms lacked extractable text. The snapshot does not guarantee complete or current authority: confirm dates, changes, approved supplements, and recertification in official publications. No chatbot can guarantee a correct answer to every question or conclusively resolve every conflict.

## Keys and privacy

No key is included in this repository or executable. Configuration saves a key to `%APPDATA%\CAPRegulationDesk\.env.local` on Windows, or the user configuration directory on other systems. Protect that file as a credential. The server binds only to loopback and blocks credential-file requests. Questions, recent conversation, context, the public catalog, and selected source passages are sent to OpenAI. Requests use `store: false`; provider data policies still apply.

## Refresh publications

In a source checkout, run **refresh-publications.cmd**, or `python collect_sources.py --refresh`, then restart the app. The collector redownloads official PDFs and updates the JSON and compressed libraries after extraction. Rebuild the executable to distribute a refreshed snapshot. A standalone executable uses its bundled snapshot unless a refreshed `corpus.json` is placed in its user configuration directory.

## Build and test

```sh
python -m unittest test_server.py
python -m pip install "pyinstaller>=6,<7"
python build_executable.py
```

Output: `release/CAP-Regulation-Desk.exe`. GitHub Actions runs these tests and builds on Windows. The builder uses an explicit asset list and excludes credentials, cached PDFs, and personal configuration. Nineteen checks cover retrieval, geography, quotations, conflicts, simulated model responses, and local HTTP protections. Live model accuracy, connectivity, and billing/project access require separate verification.

## Troubleshooting

Use the address opened by the desktop app; it selects an available port. Close the app to stop its server. Exhausted API credits require billing or project-limit changes; a ChatGPT subscription does not include API credits. Network errors mean the app cannot reach OpenAI. `/api/health` reports library counts and configuration presence without exposing secrets.

Independent research tool; not an official Civil Air Patrol service.
