// ユーゴ（5番） きっかけシートのデータ
// 座標はメートル。x: 0=左サイドライン 〜 20=右サイドライン。y: 0=ゴールライン 〜 下へ。
// DF番号は攻撃側から見てサイドライン側から1枚目。シート内の「4枚目」は左から数えた4人目＝右3枚目。
window.TACTICS = window.TACTICS || {};
window.TACTICS["05"] = {
  id: "05",
  title: "ユーゴ（5番）",
  purpose: "勢いのある2対2づくり。3枚目DFを引き付けて、3-3ポストと回り込んだLBで縦の2対2、対角のRBで広い1対1を作る",
  players: {
    LW: { x: 1.3, y: 2.2, team: "of" },
    LB: { x: 3.6, y: 9.0, team: "of" },
    CB: { x: 9.3, y: 9.6, team: "of" },
    PV: { x: 9.8, y: 6.2, team: "of" },
    RB: { x: 16.4, y: 9.0, team: "of" },
    RW: { x: 18.7, y: 2.2, team: "of" },
    L1: { x: 3.2, y: 3.2, team: "df", label: "左1" },
    L2: { x: 5.5, y: 5.4, team: "df", label: "左2" },
    L3: { x: 8.0, y: 6.6, team: "df", label: "左3" },
    R3: { x: 11.6, y: 6.6, team: "df", label: "右3" },
    R2: { x: 14.5, y: 5.4, team: "df", label: "右2" },
    R1: { x: 16.8, y: 3.2, team: "df", label: "右1" },
  },
  ball: "CB",
  steps: [
    // ---------------------------------------------------------------- (1)
    {
      title: "CBが3枚目を引き付けてRBに逆パス。LBは対角へ回り込み",
      pov: { LB: { cues: [
        // 反転版(右ユーゴ)のRB＝この LB 役。文は元の向きで書く(反転表示で左右が入れ替わる)
        { t: 0.0, face: "CB", look: "CB", say: "CBが前を狙って3枚目を引き付ける。RBへ逆パスが出たら回り込みを始める" },
        { t: 0.9, face: [11, 4], look: ["L3", "R3"], say: "CBの後ろを大きく回り込む。走りながら、どちらの3枚目が出そうか観察しておく" },
      ] }, RB: { cues: [
        { t: 0.0, face: "CB", look: "CB", say: "CBが前を狙う。逆パスが来るので手を上げて構える" },
        { t: 0.9 },
        { t: 1.7, look: "LB", say: "LBがCBの後ろを回り込んでくるコースを見て、次のパスの準備" },
      ] } },
      text: "PVは3-3（左3枚目と右3枚目の間）に立つ。CBが前を狙って3枚目を引き付け、RBへ逆パス。LBはCBの後ろを回り込んでセンターへ走る。",
      notes: [
        "左ユーゴ（図）の場合、コート右を広くする意識をもつ。",
        "CBが前を狙う意識が大切（縦の2対2で3枚目ロック）。",
        "PVを3-3に置くことで、4枚目DF（右3枚目）のアップを遅らせる。",
        "【ポイント】回り込んだLBの走るコースが重要。攻め所をわかりにくくしてDFの判断を遅らせる。ボールキャッチ前に観察しておくと次の選択準備につながる。",
      ],
      guides: [{ x: 8.6, y: 11.6, short: "回り込みコース", side: "below", label: "回り込むLBの走るコース", sub: "CBの後ろを大きく回り、攻め所をわかりにくくしてDFの判断を遅らせる。" }],
      actions: [
        { t: 0.0, dur: 0.8, type: "move", who: "CB", to: [[9.3, 8.2]] },
        { t: 0.3, dur: 0.6, type: "move", who: "L3", to: [[8.3, 7.4]] },
        { t: 0.3, dur: 0.6, type: "move", who: "R3", to: [[11.3, 7.2]] },
        { t: 0.9, dur: 0.8, type: "pass", from: "CB", to: "RB" },
        { t: 0.9, dur: 2.0, type: "move", who: "LB", to: [[5.0, 11.6], [8.6, 11.8], [9.6, 9.8]] },
        { t: 1.1, dur: 1.4, type: "move", who: "CB", to: [[6.4, 9.4], [4.8, 8.6]] },
        { t: 1.6, dur: 0.6, type: "move", who: "L3", to: [[8.0, 6.6]] },
        { t: 1.6, dur: 0.6, type: "move", who: "R3", to: [[11.6, 6.6]] },
      ],
      branches: [
        {
          group: "補足・展開パターン", label: "PVを2-3に置いて始める", from: 0.0,
          text: "PVを左2-3に置き、PV側から始める。CBはRBへパスした後、対角（右2枚目）にインブロックへ入る。回り込んだLBが数的優位で打つ。",
          actions: [
            { t: 0.0, dur: 0.8, type: "move", who: "PV", to: [[6.8, 6.1]] },
            { t: 0.9, dur: 0.8, type: "pass", from: "CB", to: "RB" },
            { t: 1.0, dur: 1.4, type: "block", who: "CB", to: [[12.0, 8.0], [13.8, 6.6]] },
            { t: 1.0, dur: 2.0, type: "move", who: "LB", to: [[5.0, 11.6], [8.6, 11.8], [9.6, 9.8]] },
            { t: 3.1, dur: 0.8, type: "pass", from: "RB", to: "LB" },
            { t: 4.0, dur: 0.7, type: "shoot", who: "LB" },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- (2)
    {
      title: "回り込んだLBが3枚目・4枚目と縦の2対2",
      pov: { LB: { cues: [
        // 顔は(11,4)に固定。ボールは右端から来る。左3枚目・右3枚目を見ながらキャッチ
        { t: 0.0, face: [11, 4], look: ["L3", "R3"], say: "回り込みながら、左3枚目と右3枚目のどちらが出てくるか見る。ボールは右から来る" },
        { t: 0.7, face: [11, 4], look: ["L3", "R3"], say: "キャッチ前に観察: 3枚目が出てくるか、どちらが出てくるか", stop: true },
        { t: 0.9, face: "GOAL", look: "PV", say: "PVと縦の2対2。3枚目が出なければロング、出たらその裏へPVがスライド" },
      ] }, RB: { cues: [
        { t: 0.0, face: "LB", look: "LB", say: "回り込んだLBへパス" },
        { t: 0.9, face: [12.5, 4.5], look: "R3", say: "すぐワイドに開いて1対1の準備。体はゴールに向けたまま、右3枚目が出るかを見る" },
      ] } },
      text: "RBからセンターへ回り込んだLBへパス。LBとPVで、左3枚目と右3枚目（4枚目）に対して縦の2対2を仕掛ける。対角のRBは1対1の準備。",
      notes: ["LBはボールキャッチ前に、3枚目が出てくるか・どちらが出てくるかを観察しておく。"],
      actions: [
        { t: 0.0, dur: 0.9, type: "zone", rect: [7.4, 4.6, 4.8, 6.4], label: "縦の2対2" },
        { t: 0.0, dur: 0.8, type: "pass", from: "RB", to: "LB" },
        { t: 0.9, dur: 0.7, type: "move", who: "LB", to: [[9.6, 8.6]] },
        { t: 0.9, dur: 0.8, type: "move", who: "RB", to: [[17.0, 8.2]] },
        { t: 0.0, dur: 1.7, type: "zone", rect: [7.4, 4.6, 4.8, 6.4], label: "縦の2対2" },
      ],
      branches: [
        { group: "LBの選択肢", label: "3枚目が出てこない → ロング", from: 1.7, text: "どちらの3枚目も出てこなければ、そのままロングシュート。",
          pov: { LB: { cues: [
            { t: 0.0, face: "GOAL", look: ["L3", "R3"], say: "どちらの3枚目も出てこない" },
            { t: 0.2, face: "GOAL", look: ["L3", "R3"], say: "3枚目が出てこない → そのままロングシュート", stop: true },
          ] } },
          actions: [{ t: 0.0, dur: 0.7, type: "shoot", who: "LB" }] },
        { group: "LBの選択肢", label: "右3枚目が出てきた → RBへパス＋PVスライド", from: 1.7,
          pov: { LB: { cues: [
            { t: 0.0, face: [14, 5], look: "R3", say: "右3枚目が出てきた → PVはその裏へスライド" },
            { t: 0.6, face: [14, 5], look: ["PV", "RB"], say: "右3枚目の裏にPVが入る。RBへパスして、RBからPVへポストパス", stop: true },
            { t: 2.4, face: [14, 5], look: "PV", say: "PVがシュート" },
          ] } },
          text: "右3枚目が出てきたら、PVはその裏へスライド。LBはRBへパスし、RBからPVへポストパス。",
          actions: [
            { t: 0.0, dur: 0.7, type: "move", who: "R3", to: [[10.0, 7.4]] },   // LBの正面に出る（RBへの横パスのコースは空く）
            { t: 0.4, dur: 0.9, type: "move", who: "PV", to: [[12.0, 6.3]] },
            { t: 0.8, dur: 0.8, type: "pass", from: "LB", to: "RB" },
            { t: 1.7, dur: 0.6, type: "pass", from: "RB", to: "PV" },
            { t: 2.4, dur: 0.6, type: "shoot", who: "PV" },
          ] },
        { group: "LBの選択肢", label: "左3枚目が出てきた → CBへパス＋PVスライド", from: 1.7,
          pov: { LB: { cues: [
            { t: 0.0, face: [5.5, 5.5], look: "L3", say: "左3枚目が出てきた → PVはその裏へスライド" },
            { t: 0.6, face: [5.5, 5.5], look: ["PV", "CB"], say: "左3枚目の裏にPVが入る。CBへパスして、CBからPVへポストパス", stop: true },
            { t: 2.3, face: [5.5, 5.5], look: "PV", say: "PVがシュート" },
          ] } },
          text: "左3枚目が出てきたら、PVはその裏へスライド。LBはCBへパスし、CBからPVへポストパス。",
          actions: [
            { t: 0.0, dur: 0.7, type: "move", who: "L3", to: [[9.2, 7.4]] },   // LBの正面に出る（CBへの横パスのコースは空く）
            { t: 0.4, dur: 0.9, type: "move", who: "PV", to: [[7.6, 6.3]] },
            { t: 0.8, dur: 0.7, type: "pass", from: "LB", to: "CB" },
            { t: 1.6, dur: 0.6, type: "pass", from: "CB", to: "PV" },
            { t: 2.3, dur: 0.6, type: "shoot", who: "PV" },
          ] },
        { group: "LBの選択肢", label: "右3枚目がけん制 → PV中間でもらって右側3対2", from: 1.7,
          pov: { LB: { cues: [
            { t: 0.0, face: [14, 5], look: "R3", say: "右3枚目がけん制に出てきた" },
            { t: 0.5, face: [14, 5], look: "PV", say: "PVが中間（右3枚目の前）でもらう → PVへパスして右側で3対2", stop: true },
            { t: 1.5, face: [14, 5], look: ["PV", "RB"], say: "PVからRBへ。右側で3対2" },
            { t: 2.8, face: [14, 5], look: "RB", say: "RBがシュート" },
          ] } },
          text: "右3枚目がけん制に出てきたら、PVが中間（右3枚目の前）でもらい、右側でRBと3対2を作る。",
          actions: [
            { t: 0.0, dur: 0.6, type: "move", who: "R3", to: [[10.4, 7.2]] },   // けん制で前に出る（PVへのコースは横に空く）
            { t: 0.2, dur: 0.7, type: "move", who: "PV", to: [[11.9, 8.0]] },
            { t: 0.9, dur: 0.5, type: "pass", from: "LB", to: "PV" },
            { t: 1.0, dur: 2.4, type: "zone", rect: [11.6, 1.2, 8.2, 7.6], label: "3対2" },
            { t: 1.5, dur: 0.7, type: "pass", from: "PV", to: "RB" },
            { t: 2.2, dur: 0.8, type: "move", who: "RB", to: [[17.4, 5.2]] },
            { t: 2.8, dur: 0.6, type: "shoot", who: "RB" },
          ] },
        { group: "LBの選択肢", label: "左3枚目がけん制 → 右側でもらって縦の2対1", from: 0.0,
          pov: { LB: { cues: [
            { t: 0.0, face: [11, 4], look: "L3", say: "左3枚目がけん制に出てくる → 右側に動いてボールをもらう" },
            { t: 1.0, face: "GOAL", look: ["R3", "PV"], say: "右3枚目に対して、PVと縦の2対1" },
            { t: 1.5, face: "GOAL", look: ["R3", "PV"], say: "右3枚目が出てきたら、その裏のPVへ", stop: true },
            { t: 2.7, face: "GOAL", look: "PV", say: "PVがシュート" },
          ] } },
          text: "左3枚目がけん制に出てくるなら、LBは右側でボールをもらい、右3枚目に対してPVと縦の2対1を作る。",
          actions: [
            { t: 0.0, dur: 0.8, type: "move", who: "LB", to: [[11.4, 9.2]] },
            { t: 0.2, dur: 0.8, type: "pass", from: "RB", to: "LB" },
            { t: 0.6, dur: 0.6, type: "move", who: "L3", to: [[8.8, 7.8]] },
            { t: 1.1, dur: 0.8, type: "move", who: "LB", to: [[11.4, 8.4]] },
            { t: 1.4, dur: 0.6, type: "move", who: "R3", to: [[12.4, 7.4]] },
            { t: 1.6, dur: 0.6, type: "move", who: "PV", to: [[11.2, 6.1]] },
            { t: 2.1, dur: 0.5, type: "pass", from: "LB", to: "PV" },
            { t: 2.7, dur: 0.6, type: "shoot", who: "PV" },
          ] },
      ],
    },
    // ---------------------------------------------------------------- (3)
    {
      title: "3枚目が釣れたら、対角のRBへパス",
      pov: { LB: { cues: [
        // 顔は(14,5)に固定。右3枚目と対角のRBを1つの視界で見る
        { t: 0.0, face: [14, 5], look: "R3", say: "右3枚目が自分に釣れて出てきた" },
        { t: 0.6, face: [14, 5], look: ["R3", "RB"], say: "3枚目が釣れた → 対角のRBへパス。PVはその裏へスライド", stop: true },
        { t: 1.7, face: [14, 5], look: "RB", say: "RBがワイドで広い1対1" },
      ] }, RB: { cues: [
        // 顔はゴール寄りの一定の向き(12.5,4.5)に固定。左端から来るボールと、正面〜右のDFを1つの視界で見る
        { t: 0.0, face: [12.5, 4.5], look: "R3", say: "右3枚目がLBに釣れて出た → 自分にパスが来る" },
        { t: 0.7, face: [12.5, 4.5], look: ["R2", "R1"], say: "DFを見ながらボールをもらう。右2枚目・右1枚目の位置を確認", stop: true },
        { t: 1.7, say: "ワイドで広い1対1" },
      ] } },
      text: "右3枚目がLBに釣れて出てきたら、LBは対角のRBへパス。PVはその裏（右3枚目の位置）へスライドする。RBはワイドで広い1対1。",
      notes: ["【ポイント】PVは縦の2対2から、すぐRBの1対1に加勢して2対1をつくる。"],
      actions: [
        { t: 0.0, dur: 0.7, type: "move", who: "R3", to: [[10.3, 7.2]] },   // LBの正面に釣れる（対角RBへのコースは空く）
        { t: 0.5, dur: 1.0, type: "move", who: "PV", to: [[12.4, 6.3]] },
        { t: 0.8, dur: 0.9, type: "pass", from: "LB", to: "RB" },
        { t: 0.8, dur: 0.8, type: "move", who: "RB", to: [[17.6, 7.4]] },
        { t: 1.6, dur: 0.6, type: "move", who: "R2", to: [[14.9, 5.8]] },
      ],
    },
    // ---------------------------------------------------------------- (4)
    {
      title: "アウト割り or 1枚目寄せてサイド落とし or PV",
      pov: { LB: { cues: [
        { t: 0.0, face: [14, 5], look: "RB", say: "RBの1対1を見る。戻りのパスやこぼれ球に備える", est: true },
      ] }, RB: { cues: [
        { t: 0.0, face: "GOAL", look: "R2", say: "右2枚目が寄ってくるか、右1枚目が出てくるかを見て選ぶ（アウト割り／PV／サイド落とし）" },
        { t: 1.2, face: "GOAL", look: "PV", say: "PVが加勢に来た" },
      ] } },
      text: "右側はRB・PV・RWに対してDFが2枚。RBはアウト割り、右1枚目を寄せてサイドへ落とす、PVへポストパス、から選ぶ。",
      actions: [
        { t: 0.0, dur: 2.0, type: "zone", rect: [11.8, 1.2, 8.0, 7.6], label: "広い1対1" },
        { t: 0.2, dur: 1.0, type: "move", who: "PV", to: [[13.6, 5.9]] },
      ],
      branches: [
        { group: "RBの選択肢", label: "①アウト割り", from: 2.0, text: "右1枚目と右2枚目の間を外側に割ってシュート。",
          pov: { RB: { cues: [
            { t: 0.0, face: "GOAL", look: ["R1", "R2"], say: "右2枚目は寄ってこない。右1枚目と右2枚目の間を見る" },
            { t: 0.3, face: "GOAL", look: ["R1", "R2"], say: "右1枚目と右2枚目の間が空いている → 外側に割って走り込む", stop: true },
            { t: 1.0, face: "GOAL", say: "シュート" },
          ] } },
          actions: [{ t: 0.0, dur: 1.0, type: "move", who: "RB", to: [[17.4, 4.8]] }, { t: 1.0, dur: 0.6, type: "shoot", who: "RB" }] },
        { group: "RBの選択肢", label: "②PVパス", from: 2.0, text: "右2枚目がRBに寄ってきたら、加勢に来たPVへポストパス。",
          pov: { RB: { cues: [
            { t: 0.0, face: "R2", look: "R2", say: "右2枚目が自分に寄ってくる" },
            { t: 0.7, face: "PV", look: "PV", say: "右2枚目が寄った → 空いたPVへポストパス", stop: true },
            { t: 0.8 },
            { t: 1.4, look: "PV", say: "PVがシュート" },
          ] } },
          actions: [
            { t: 0.0, dur: 0.7, type: "move", who: "R2", to: [[16.9, 6.3]] },   // RBとゴールの間に寄せる（目線でPVが見えるように）
            { t: 0.8, dur: 0.5, type: "pass", from: "RB", to: "PV", kind: "bounce" },   // 寄ってきた右2の横をバウンドで
            { t: 1.4, dur: 0.6, type: "shoot", who: "PV" },
          ] },
        { group: "RBの選択肢", label: "③1枚目寄せてサイド落とし", from: 2.0, text: "右1枚目をRBに寄せてから、空いたRWへサイド落とし。",
          pov: { RB: { cues: [
            // 顔はゴール右寄りの一点(15.5,1.3)に固定。左手前の右1枚目と、右のRWを1つの視界で見る
            { t: 0.0, face: [15.5, 1.3], look: "R1", say: "右1枚目に向かって攻めて、自分に寄せる" },
            { t: 0.8, face: [15.5, 1.3], look: ["R1", "RW"], say: "右1枚目が寄ってきた → 空いたRWへサイド落とし", stop: true },
            { t: 0.9, face: [15.5, 1.3], look: "RW" },
            { t: 1.8, face: [15.5, 1.3], look: "RW", say: "RWがシュート" },
          ] } },
          actions: [
            { t: 0.0, dur: 0.8, type: "move", who: "RB", to: [[18.0, 5.6]] },
            { t: 0.2, dur: 0.7, type: "move", who: "R1", to: [[16.9, 5.2]] },
            { t: 0.9, dur: 0.5, type: "pass", from: "RB", to: "RW" },
            { t: 1.2, dur: 0.6, type: "move", who: "RW", to: [[18.2, 3.2]] },
            { t: 1.8, dur: 0.6, type: "shoot", who: "RW" },
          ] },
      ],
    },
  ],
};
