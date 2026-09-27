Updated backend integration docs and usage instructions.

Environment variables:
- OPENAI_API_KEY (required) OR Azure variables (OPENAI_API_TYPE=azure, OPENAI_API_BASE, OPENAI_DEPLOYMENT)
- GITHUB_TOKEN (required for /create-pr)

Run locally:
- Copy server/.env.example to server/.env and fill values.
- cd server && npm install
- npm start
- Open the frontend (index.html) in a browser or serve the root folder.

Endpoints:
- POST /generate { prompt } -> { yaml }
- POST /validate { yaml } -> { valid, errors }
- POST /create-pr { owner, repo, branchName, path, yaml, prTitle, prBody } -> { url }
