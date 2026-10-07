# CAP Regulation Desk

A free static website for Civil Air Patrol publication questions. The website uses GitHub Pages and an optional browser-local WebLLM model. No OpenAI account, API key, AI credits, subscription, or running desktop server is required for the website.

## Free website

**Current validation status:** the static build, regulation retrieval, wing filtering and citation checks pass. Browser-local AI loaded in the test browser, but sample generated answers failed verification and the test browser later stalled. AI answers remain experimental; this is not yet a verified replacement for the desktop answer engine. Invalid answers fall back to source passages. The worker implementation still needs a completed live browser test before release.

Enable GitHub Pages with **GitHub Actions** as its source, then run **Publish free website**. Website changes on main also deploy automatically. The repository must be public for GitHub Free hosting. The workflow refuses to build in a private repository; the legacy Windows build runs manually.

The site downloads a snapshot of 428 publications, including national guidance and indexed region/wing supplements. Select your wing for scoped evidence or compare all jurisdictions. Source search works immediately. Click **Enable on-device AI** for free-form answers and follow-ups; this downloads a large Qwen2.5 1.5B model into the browser cache. A compatible WebGPU device and current Chrome or Edge are recommended. Inference runs on the visitor's device, with no paid API calls. Questions are not sent to an AI service; external hosts supply the library, JavaScript module and model files.

Answers verify quotations and paragraph identifiers against retrieved pages. Conflict answers require two distinct publication sources plus an explanation and guidance. Failed validation falls back to original passages. A small local model and a dated library cannot reliably answer every question, and verified quotes do not guarantee correct interpretation. Scanned/unavailable documents may have no searchable text. Confirm current requirements and changes with official publications and your chain of command.

Build locally with `python build_website.py`, then serve `site/` with `python -m http.server 8899 --directory site`. Run browser logic checks with `node test_web.mjs`. Refresh the library with `python collect_sources.py --refresh`, commit the updated `corpus.json.gz`, then rerun the website workflow. Deployment copies only `web/` and public publication text; local credentials are excluded.

Sources: [WebLLM documentation](https://webllm.mlc.ai/docs/user/basic_usage.html), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

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
