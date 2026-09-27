# Workflow Agent Bot

A small, dependency-free static site for creating GitHub Actions trigger YAML. The UI is Bengali-friendly and is based on the `on` schema in [`actions/languageservices/workflow-v1.0.json`](https://github.com/actions/languageservices/blob/4043eda158e16579cc5fb1b0b07a4bce2a76f0b5/workflow-parser/src/workflow-v1.0.json#L62-L129).

## Run locally

Open `index.html` in a browser, or serve the folder with any static web server:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Included

- Event and activity-type selection
- Branch and path filters for common events
- Schedule, manual dispatch, and reusable workflow support
- Generated YAML with a copy button
- Responsive Bengali-friendly interface

This is a frontend starter. A production agent can later connect the form to a server-side model/API for natural-language workflow generation, validation, and GitHub pull-request creation.
