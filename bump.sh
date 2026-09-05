#!/bin/sh
# 公開前に実行: 読み込みファイルのバージョン番号を更新してスマホのキャッシュを無効化する
V=$(date +%Y%m%d%H%M)
for f in tactic.html index.html js/app.js; do
  perl -pi -e "s/\?v=\d+/?v=$V/g" "$f"
done
echo "version -> $V"
