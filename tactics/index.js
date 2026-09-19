// セット一覧。新しいセットを追加するときはここに1行足し、tactics/ にデータファイルを置く。
window.TACTIC_LIST = [
  { id: "05", file: "05-yugo.js", title: "ユーゴ（5番）", summary: "3枚目を引き付けて、回り込んだLBとPVで縦の2対2、対角のRBで広い1対1", pov: ["RB"], trial3d: "pov-3d.html",
    povCards: [
      { pos: "RB", mirror: false, title: "👀 RB目線で見る", summary: "RBの目の高さから、誰を見て・どこにパスを出すかを体験する（RBの選択肢を収録）" },
      { pos: "RB", mirror: true, title: "👀 右ユーゴ（左右反転）RB目線で見る", summary: "右から始めるとRBが回り込み役。キャッチ前にどちらの3枚目が出るかを見て、ロング／対角へ／PVへを選ぶ" },
    ] },
  { id: "06", file: "06-side-yugo.js", title: "サイドユーゴ（6番）", summary: "片側にDFを寄せて、反対側で広い3対2を作る", pov: ["RB"], trial3d: "pov-3d.html?id=06",
    povCards: [
      { pos: "RB", mirror: false, title: "👀 RB目線で見る", summary: "反対側の3対2の受け手。右2・右1を見て、アウト割り／RW並行／PVポストパスを選ぶ" },
      { pos: "RB", mirror: true, title: "👀 右サイドユーゴ（左右反転）RB目線で見る", summary: "右から始めるとRBが始動役。センターへ移動してケンケン、3枚目を見てロング／PV／対角へを選ぶ" },
    ] },
  { id: "07", file: "07-center-side.js", title: "センターサイド（7番）", summary: "CBとRWのクロスで右2枚目を外に引っ張り、LBに最高のロングを打たせる" },
  { id: "08", file: "08-cc-dappo.js", title: "CCダッポ（8番）", summary: "LWのカラ走りから「急に」縦の2対2に持ち込む" },
];
