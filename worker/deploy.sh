#!/bin/zsh
# Đưa "Sổ hoá đơn" (cách 2) lên Cloudflare. Chạy: ./deploy.sh   (thêm --secrets để nạp lại secret)
set -e
cd "$(dirname "$0")"
rm -rf public && mkdir public
cp ../index.html ../style.css ../app.js ../data-worker.js ../data-demo.js ../manifest.webmanifest public/
mkdir -p public/icons && cp ../icons/*.png public/icons/
npx -y wrangler@4 deploy
if [[ "$1" == "--secrets" ]]; then
  python3 -I -c "import json,os;print(json.load(open(os.path.expanduser('~/.claude.json')))['mcpServers']['lark']['env']['LARK_APP_SECRET'],end='')" | npx -y wrangler@4 secret put LARK_APP_SECRET
  cat ~/.config/hoa-don/session_key | npx -y wrangler@4 secret put SESSION_KEY
  python3 -I -c "import json,os;print(json.dumps(json.load(open(os.path.expanduser('~/.config/hoa-don/staff.json'))),ensure_ascii=False),end='')" | npx -y wrangler@4 secret put STAFF
fi
