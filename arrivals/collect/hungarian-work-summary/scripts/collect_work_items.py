#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path


def run_git(repo: Path, args: list[str]) -> str:
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True, stderr=subprocess.STDOUT)


def shortstat(repo: Path, commit: str) -> str:
    out = run_git(repo, ['show', '--shortstat', '--format=', commit]).strip()
    return ' '.join(out.split())


def changed_files(repo: Path, commit: str) -> list[str]:
    out = run_git(repo, ['show', '--name-only', '--format=', commit])
    return [line for line in out.splitlines() if line.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description='Collect git commits and manual bullets for a work summary.')
    parser.add_argument('--repo', default='.', help='Repository path. Defaults to current directory.')
    parser.add_argument('--from', dest='start', required=True, help='Start commit hash/ref.')
    parser.add_argument('--to', dest='end', default='HEAD', help='End commit/ref. Defaults to HEAD.')
    parser.add_argument('--include-start', action='store_true', help='Include the start commit itself.')
    parser.add_argument('--bullet', action='append', default=[], help='Manual bullet point. Can be repeated.')
    parser.add_argument('--json', action='store_true', help='Emit JSON instead of Markdown.')
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    range_expr = f'{args.start}^..{args.end}' if args.include_start else f'{args.start}..{args.end}'

    root = run_git(repo, ['rev-parse', '--show-toplevel']).strip()
    rows = run_git(
        repo,
        ['log', '--reverse', '--date=short', '--format=%H%x1f%h%x1f%ad%x1f%s', range_expr],
    ).splitlines()

    commits = []
    for row in rows:
        if not row.strip():
            continue
        full_hash, short_hash, date, subject = row.split('\x1f', 3)
        commits.append({
            'hash': full_hash,
            'short_hash': short_hash,
            'date': date,
            'subject': subject,
            'shortstat': shortstat(repo, full_hash),
            'files': changed_files(repo, full_hash),
        })

    payload = {
        'repo': root,
        'range': range_expr,
        'commit_count': len(commits),
        'manual_bullets': args.bullet,
        'commits': commits,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f'# Work summary source')
    print(f'')
    print(f'- Repository: {root}')
    print(f'- Range: `{range_expr}`')
    print(f'- Commits: {len(commits)}')
    if args.bullet:
        print(f'')
        print('## Manual bullets')
        for bullet in args.bullet:
            print(f'- {bullet}')
    if commits:
        print(f'')
        print('## Commits')
        for commit in commits:
            print(f'- `{commit["short_hash"]}` {commit["date"]}: {commit["subject"]}')
            if commit['shortstat']:
                print(f'  - {commit["shortstat"]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
