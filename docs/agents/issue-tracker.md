# Issue Tracker: GitHub

Issues and PRDs live in [GitHub Issues for `robertu7/Quotient`](https://github.com/robertu7/Quotient/issues).
Use the `gh` CLI for issue operations and infer the repository from the local
`origin` remote.

Before a write operation, confirm that `gh auth status` succeeds and that
`git remote get-url origin` resolves to `robertu7/Quotient`.

Use `gh issue create`, `view`, `list`, `comment`, `edit`, and `close`. Include
comments and labels when reading an issue so its current triage state and
decisions are not missed.

## Pull Requests as a Triage Surface

External pull requests are not a request or triage surface. Do not add them to
the issue queue. Pull requests created to implement an existing issue may link
that issue, but they do not replace its triage state.

## Skill Conventions

When a skill says "publish to the issue tracker," create a GitHub issue. When it
says "fetch the relevant ticket," run:

```bash
gh issue view <number> --comments
```

Apply only the canonical labels defined in `docs/agents/triage-labels.md`.
