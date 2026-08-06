"""Security review for a pull request's diff, using GLM-5.2 via NVIDIA's
OpenAI-compatible API. Posts findings as a single PR comment.

Required environment variables:
  NVIDIA_API_KEY   - NVIDIA API key (repo secret)
  GITHUB_TOKEN      - provided automatically by GitHub Actions
  GITHUB_REPOSITORY - "owner/repo", provided automatically
  PR_NUMBER         - pull request number
  BASE_SHA          - base commit of the PR
  HEAD_SHA          - head commit of the PR
"""

import os
import subprocess
import sys
import urllib.request
import urllib.error
import json

from openai import OpenAI

MAX_DIFF_CHARS = 60_000
MODEL = "z-ai/glm-5.2"

SYSTEM_PROMPT = """You are a security-focused code reviewer. You are given a \
git diff from a pull request. Analyze it for real, concrete security \
vulnerabilities only — injection (SQL/command/XSS/template), auth or \
authorization bypasses, secrets or credentials committed in code, unsafe \
deserialization, path traversal, SSRF, insecure crypto or randomness, \
missing input validation on user-controlled data, and similar issues.

Rules:
- Only report issues you can point to with a specific file and line from the \
diff. Do not speculate about code you cannot see.
- Do not report style, performance, or generic best-practice issues — \
security only.
- If you find nothing, say so plainly in one line. Do not invent findings to \
have something to report.
- For each finding: file:line, a one-sentence description of the \
vulnerability, and a concrete concern (what an attacker could do).
- Keep the whole response under 500 words. Use markdown."""


def run_git_diff(base_sha: str, head_sha: str) -> str:
	result = subprocess.run(
		["git", "diff", f"{base_sha}...{head_sha}"],
		capture_output=True,
		text=True,
		check=True,
	)
	diff = result.stdout
	if len(diff) > MAX_DIFF_CHARS:
		diff = diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated — too large for full review]"
	return diff


def review_diff(diff: str) -> str:
	if not diff.strip():
		return "No changes to review."

	client = OpenAI(
		base_url="https://integrate.api.nvidia.com/v1",
		api_key=os.environ["NVIDIA_API_KEY"],
	)

	completion = client.chat.completions.create(
		model=MODEL,
		messages=[
			{"role": "system", "content": SYSTEM_PROMPT},
			{"role": "user", "content": diff},
		],
		temperature=0.2,
		top_p=1,
		max_tokens=4096,
		stream=False,
	)

	return completion.choices[0].message.content or "(empty response from model)"


def post_pr_comment(body: str) -> None:
	repo = os.environ["GITHUB_REPOSITORY"]
	pr_number = os.environ["PR_NUMBER"]
	token = os.environ["GITHUB_TOKEN"]

	url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
	payload = json.dumps({"body": f"## 🔒 Security review (GLM-5.2)\n\n{body}"}).encode()

	request = urllib.request.Request(
		url,
		data=payload,
		method="POST",
		headers={
			"Authorization": f"Bearer {token}",
			"Accept": "application/vnd.github+json",
			"Content-Type": "application/json",
		},
	)
	try:
		with urllib.request.urlopen(request) as response:
			response.read()
	except urllib.error.HTTPError as e:
		print(f"Failed to post PR comment: {e.code} {e.read().decode()}", file=sys.stderr)
		raise


def main() -> None:
	base_sha = os.environ["BASE_SHA"]
	head_sha = os.environ["HEAD_SHA"]

	diff = run_git_diff(base_sha, head_sha)
	review = review_diff(diff)
	post_pr_comment(review)
	print(review)


if __name__ == "__main__":
	main()
