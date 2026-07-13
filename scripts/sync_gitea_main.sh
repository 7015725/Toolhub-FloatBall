#!/usr/bin/env bash
set -euo pipefail

# 将 GitHub origin/main 以“仅快进”方式同步到 Gitea main。
#
# 认证优先级：
#   1. GITEA_USER + GITEA_TOKEN 环境变量
#   2. GITEA_TOKEN_FILE（默认 ~/.hermes/.gitea_token）中的 netrc 风格 login/password
#   3. token 文件中的单行纯 token（用户名默认 linshenjianlu）
#   4. Git credential.helper 或交互认证
#
# 脚本不会把 token 写入 git remote URL，也不会强制覆盖已分叉的 Gitea 历史。

REPO_DIR="${1:-$HOME/Toolhub-FloatBall}"
GITEA_HOST="git.xin-blog.com"
GITEA_REPO="linshenjianlu/ShortX_ToolHub.git"
GITEA_URL="https://${GITEA_HOST}/${GITEA_REPO}"
TOKEN_FILE="${GITEA_TOKEN_FILE:-$HOME/.hermes/.gitea_token}"

fail() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

read_netrc_value() {
  local key="$1"
  local file="$2"
  awk -v wanted="$key" '
    {
      for (i = 1; i <= NF; i++) {
        if ($i == wanted && i < NF) {
          print $(i + 1)
          exit
        }
      }
    }
  ' "$file" 2>/dev/null || true
}

read_single_token() {
  local file="$1"
  local value
  value="$(tr -d '\r\n' < "$file" 2>/dev/null || true)"
  case "$value" in
    ''|*[[:space:]]*) return 0 ;;
    *) printf '%s' "$value" ;;
  esac
}

[ -d "$REPO_DIR/.git" ] || fail "不是 Git 仓库：$REPO_DIR"
cd "$REPO_DIR"

[ -z "$(git status --porcelain)" ] || fail "工作区不干净，请先提交、暂存或清理本地修改"
git remote get-url origin >/dev/null 2>&1 || fail "缺少 origin 远程仓库"

git fetch --prune origin main
MAIN_SHA="$(git rev-parse origin/main)"

GITEA_USER_VALUE="${GITEA_USER:-}"
GITEA_TOKEN_VALUE="${GITEA_TOKEN:-}"

if [ -f "$TOKEN_FILE" ]; then
  if [ -z "$GITEA_USER_VALUE" ]; then
    GITEA_USER_VALUE="$(read_netrc_value login "$TOKEN_FILE")"
  fi
  if [ -z "$GITEA_TOKEN_VALUE" ]; then
    GITEA_TOKEN_VALUE="$(read_netrc_value password "$TOKEN_FILE")"
  fi
  if [ -z "$GITEA_TOKEN_VALUE" ]; then
    GITEA_TOKEN_VALUE="$(read_single_token "$TOKEN_FILE")"
  fi
fi

if [ -n "$GITEA_TOKEN_VALUE" ] && [ -z "$GITEA_USER_VALUE" ]; then
  GITEA_USER_VALUE="linshenjianlu"
fi

ASKPASS_DIR=""
cleanup() {
  if [ -n "$ASKPASS_DIR" ] && [ -d "$ASKPASS_DIR" ]; then
    rm -rf "$ASKPASS_DIR"
  fi
  unset TOOLHUB_GITEA_USER TOOLHUB_GITEA_TOKEN GIT_ASKPASS GIT_TERMINAL_PROMPT || true
}
trap cleanup EXIT INT TERM

if [ -n "$GITEA_USER_VALUE" ] && [ -n "$GITEA_TOKEN_VALUE" ]; then
  ASKPASS_DIR="$(mktemp -d)"
  cat > "$ASKPASS_DIR/askpass.sh" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' "$TOOLHUB_GITEA_USER" ;;
  *Password*) printf '%s\n' "$TOOLHUB_GITEA_TOKEN" ;;
  *) printf '\n' ;;
esac
EOF
  chmod 700 "$ASKPASS_DIR/askpass.sh"
  export TOOLHUB_GITEA_USER="$GITEA_USER_VALUE"
  export TOOLHUB_GITEA_TOKEN="$GITEA_TOKEN_VALUE"
  export GIT_ASKPASS="$ASKPASS_DIR/askpass.sh"
  export GIT_TERMINAL_PROMPT=0
fi

if git remote get-url gitea >/dev/null 2>&1; then
  git remote set-url gitea "$GITEA_URL"
else
  git remote add gitea "$GITEA_URL"
fi

git fetch --prune gitea main
GITEA_SHA="$(git rev-parse gitea/main)"

printf 'GitHub origin/main：%s\n' "$MAIN_SHA"
printf 'Gitea main：%s\n' "$GITEA_SHA"

if [ "$MAIN_SHA" = "$GITEA_SHA" ]; then
  printf 'Gitea 已与 GitHub main 一致，无需推送。\n'
  exit 0
fi

if ! git merge-base --is-ancestor "$GITEA_SHA" "$MAIN_SHA"; then
  fail "Gitea main 与 GitHub main 已分叉，拒绝强制覆盖；请先人工审查两端历史"
fi

git push gitea origin/main:refs/heads/main

git fetch --prune gitea main
SYNCED_SHA="$(git rev-parse gitea/main)"
[ "$SYNCED_SHA" = "$MAIN_SHA" ] || fail "推送后 Gitea main 未指向预期提交"

printf '同步完成：%s\n' "$SYNCED_SHA"
printf '请在 GitHub Actions 中重新运行 check-update-sources，确认入口、签名清单和全部模块一致。\n'
