// サイドユーゴ（6番） きっかけシートのデータ
// 座標はメートル。x: 0=左サイドライン(LW側) 〜 20=右サイドライン。y: 0=ゴールライン 〜 下へ。
// DF番号は攻撃側から見てサイドライン側から 1枚目。L1..L3 = 左1〜3枚目、R3..R1 = 右3〜1枚目。
window.TACTICS = window.TACTICS || {};
window.TACTICS["06"] = {
  id: "06",
  title: "サイドユーゴ（6番）",
  purpose: "片側にDFを寄せて反対側で広い3対2を作る",
  players: {
    LW: { x: 1.3, y: 2.2, team: "of" },
    LB: { x: 3.6, y: 8.8, team: "of" },
    CB: { x: 9.0, y: 10.3, team: "of" },
    PV: { x: 10.0, y: 6.4, team: "of" },
    RB: { x: 16.4, y: 8.8, team: "of" },
    RW: { x: 18.7, y: 2.2, team: "of" },
    L1: { x: 3.2, y: 3.2, team: "df", label: "左1" },
    L2: { x: 5.4, y: 5.4, team: "df", label: "左2" },
    L3: { x: 7.9, y: 6.3, team: "df", label: "左3" },
    R3: { x: 12.1, y: 6.3, team: "df", label: "右3" },
    R2: { x: 14.6, y: 5.4, team: "df", label: "右2" },
    R1: { x: 16.8, y: 3.2, team: "df", label: "右1" },
  },
  ball: "LB",
  steps: [
    // ---------------------------------------------------------------- (1)
    {
      title: "LBからLWで始動",
      text: "LBがLWにパス。LBはセンターへ移動。CBはLBの後ろを回り込んで（回り込み）、左45の位置でロングの準備をする。",
      notes: [
        "ユーゴ（5番）を縦半面で行う。ユーゴとは狙いが違う。",
        "LWは、左2枚目が前を気にしていればカットインを狙う。",
      ],
      actions: [
        { t: 0.0, dur: 0.7, type: "pass", from: "LB", to: "LW" },
        { t: 0.3, dur: 1.6, type: "move", who: "LB", to: [[6.5, 9.6], [9.3, 9.6]] },
        { t: 0.3, dur: 2.3, type: "move", who: "CB", to: [[7.2, 12.0], [4.6, 12.3], [3.0, 10.6], [3.6, 8.6]] },
      ],
      branches: [
        {
          group: "LWの選択肢", label: "カットイン", from: 0.8,
          text: "左2枚目が前（CBやLB）を気にして出ていれば、LWは6mラインに沿って内側へ切れ込んでシュート。",
          actions: [
            { t: 0.0, dur: 0.8, type: "move", who: "L2", to: [[5.0, 7.4]] },
            { t: 0.2, dur: 1.0, type: "move", who: "LW", to: [[2.4, 3.6], [3.6, 4.6]] },
            { t: 1.3, dur: 0.6, type: "shoot", who: "LW" },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- (2)
    {
      title: "LWからCBへ。CBが1対1、PVは左2枚目裏へスライド",
      text: "LWからCBへパス。CBは9mアークの真ん中（サイドライン〜ゴールポスト間の中央）で左2枚目と1対1。CBからLBへパスすると同時に、PVは左2枚目の裏へスライドする。",
      notes: [
        "PVはスライド後、ターン準備。",
        "左3枚目の足が6mにあれば無理せず逆展開を待つ。",
        "LBはコート縦中央で待つ。けん制が来たらニアへ。",
        "PVの粘りが大事。",
      ],
      guides: [
        { x: 4.25, y: 7.93, short: "ここで1対1", label: "CBの1対1の位置", sub: "サイドライン〜ゴールポスト間の中央、9mアーク上。ワイドすぎるとLBへけん制が入りやすく、内側すぎると対角が狭い3対2になる。" },
      ],
      actions: [
        { t: 0.0, dur: 0.7, type: "pass", from: "LW", to: "CB" },
        { t: 0.8, dur: 0.8, type: "move", who: "CB", to: [[4.4, 8.0]] },
        { t: 0.9, dur: 0.8, type: "move", who: "L2", to: [[4.7, 7.1]] },
        { t: 1.9, dur: 0.7, type: "pass", from: "CB", to: "LB" },
        { t: 1.9, dur: 0.6, type: "move", who: "LB", to: [[10.3, 8.8]] },
        { t: 2.0, dur: 1.0, type: "move", who: "PV", to: [[6.0, 6.3]] },
        { t: 2.2, dur: 0.8, type: "move", who: "L3", to: [[7.0, 6.5]] },
      ],
      branches: [
        {
          group: "CBの選択肢", label: "①ロング", from: 1.9,
          text: "左2枚目が出てこなければ、9mの外からロングシュート。",
          actions: [
            { t: 0.0, dur: 0.5, type: "move", who: "L2", to: [[5.2, 6.0]] },
            { t: 0.4, dur: 0.7, type: "shoot", who: "CB" },
          ],
        },
        {
          group: "CBの選択肢", label: "②スライドPVにパス", from: 1.9,
          text: "PVが左2枚目の裏にスライドし、左3枚目がついてこなければPVへパス。PVはターンしてシュート。",
          actions: [
            { t: 0.0, dur: 0.9, type: "move", who: "PV", to: [[6.0, 6.3]] },
            { t: 1.0, dur: 0.6, type: "pass", from: "CB", to: "PV" },
            { t: 1.7, dur: 0.6, type: "shoot", who: "PV" },
          ],
        },
        {
          group: "CBの選択肢", label: "③アウト割りサイドパス", from: 1.9,
          text: "CBが左1枚目と左2枚目の間を外側（アウト）に割る。左1枚目が寄ってきたらLWへパスしてLWがシュート。",
          actions: [
            { t: 0.0, dur: 0.9, type: "move", who: "CB", to: [[2.8, 6.2]] },
            { t: 0.2, dur: 0.8, type: "move", who: "L1", to: [[2.9, 4.6]] },
            { t: 1.0, dur: 0.5, type: "pass", from: "CB", to: "LW" },
            { t: 1.3, dur: 0.6, type: "move", who: "LW", to: [[1.6, 3.6]] },
            { t: 1.9, dur: 0.6, type: "shoot", who: "LW" },
          ],
        },
        {
          group: "CBの選択肢", label: "④イン攻め→LB並行", from: 1.9,
          text: "CBが内側（イン）に攻めて左3枚目を寄せる。左3枚目が寄ったらLBへパス。LBは左3枚目と右3枚目の間に並行で走り込んでシュート。",
          actions: [
            { t: 0.0, dur: 0.9, type: "move", who: "CB", to: [[6.0, 7.8]] },
            { t: 0.2, dur: 0.8, type: "move", who: "L3", to: [[7.1, 7.3]] },
            { t: 1.0, dur: 0.6, type: "pass", from: "CB", to: "LB" },
            { t: 1.0, dur: 1.0, type: "move", who: "LB", to: [[8.7, 6.9]] },
            { t: 2.0, dur: 0.6, type: "shoot", who: "LB" },
          ],
        },
        {
          group: "CBの選択肢", label: "⑤PVスライドに左3が寄ったらLB並行", from: 1.9,
          text: "PVのスライドに左3枚目がついて行ったら、空いた中央へLBが並行で走り込む。CBからLBへパスしてシュート。",
          actions: [
            { t: 0.0, dur: 0.9, type: "move", who: "PV", to: [[6.0, 6.3]] },
            { t: 0.2, dur: 0.9, type: "move", who: "L3", to: [[6.8, 6.5]] },
            { t: 1.0, dur: 0.6, type: "pass", from: "CB", to: "LB" },
            { t: 1.0, dur: 1.0, type: "move", who: "LB", to: [[9.0, 6.6]] },
            { t: 2.0, dur: 0.6, type: "shoot", who: "LB" },
          ],
        },
        {
          group: "補足・展開パターン", label: "PVのスライドが早すぎた時", from: 0.0,
          text: "PVのスライドが早すぎてCBに渡す前に左2枚目裏に入ってしまった場合は、LWからPVへ直接パス。",
          actions: [
            { t: 0.0, dur: 0.8, type: "move", who: "PV", to: [[6.0, 6.3]] },
            { t: 0.9, dur: 0.7, type: "pass", from: "LW", to: "PV" },
            { t: 1.7, dur: 0.6, type: "shoot", who: "PV" },
          ],
        },
        {
          group: "補足・展開パターン", label: "PVが中間で受けて右へ", from: 1.9,
          text: "左3枚目に6mを守られ、右3枚目がLBのけん制に出てくるなら、PVは中間（左3枚目の前）で受ける。右へ入るLBにつないで3-3の間を割ると3対2につながる。",
          actions: [
            { t: 0.0, dur: 0.9, type: "move", who: "PV", to: [[7.8, 7.9]] },
            { t: 0.0, dur: 0.7, type: "move", who: "R3", to: [[11.5, 7.6]] },
            { t: 0.9, dur: 0.6, type: "pass", from: "CB", to: "PV" },
            { t: 1.0, dur: 1.1, type: "move", who: "LB", to: [[11.8, 8.4], [13.2, 6.4]] },
            { t: 1.6, dur: 0.6, type: "pass", from: "PV", to: "LB" },
            { t: 2.3, dur: 0.6, type: "shoot", who: "LB" },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- (3)
    {
      title: "LBはケンケンで前を狙う。PVは右3枚目裏へ再スライド",
      text: "LBは「ケンケン」で前を狙いながらPVの再スライドを待つ。右3枚目がLBにけん制で出てきたら、PVはその裏へ再スライド。RBはワイドに開き、LBからRBへパス。",
      notes: [
        "スライド後、休まず再スライド（PVの粘り）。",
        "LB並行の場合、RBはワイドに。PVは右3枚目裏へ再スライド。",
      ],
      actions: [
        { t: 0.0, dur: 0.6, type: "move", who: "LB", to: [[10.2, 8.3]] },
        { t: 0.2, dur: 0.7, type: "move", who: "R3", to: [[11.3, 7.6]] },
        { t: 0.3, dur: 0.8, type: "move", who: "L2", to: [[5.3, 5.8]] },
        { t: 0.7, dur: 1.2, type: "move", who: "PV", to: [[11.9, 6.4]] },
        { t: 0.6, dur: 0.9, type: "move", who: "RB", to: [[17.6, 7.4]] },
        { t: 1.9, dur: 0.8, type: "pass", from: "LB", to: "RB" },
        { t: 2.0, dur: 0.6, type: "move", who: "R2", to: [[15.6, 5.7]] },
      ],
      branches: [
        {
          group: "LBの選択肢", label: "①ロング（右3が出ない）", from: 0.0,
          text: "右3枚目がけん制に出てこなければ、LBはケンケンからそのままロングシュート。",
          actions: [
            { t: 0.0, dur: 0.6, type: "move", who: "LB", to: [[10.6, 7.9]] },
            { t: 0.6, dur: 1.2, type: "move", who: "PV", to: [[11.9, 6.4]] },
            { t: 1.0, dur: 0.7, type: "shoot", who: "LB" },
          ],
        },
        {
          group: "LBの選択肢", label: "②PVスライドパス", from: 0.0,
          text: "PVが右3枚目の裏に再スライド。右3枚目がLBに出てきて裏が空いたらPVへパス。PVがシュート。",
          actions: [
            { t: 0.0, dur: 0.6, type: "move", who: "LB", to: [[10.6, 7.9]] },
            { t: 0.2, dur: 0.7, type: "move", who: "R3", to: [[11.6, 7.4]] },
            { t: 0.6, dur: 1.2, type: "move", who: "PV", to: [[11.9, 6.4]] },
            { t: 1.9, dur: 0.6, type: "pass", from: "LB", to: "PV" },
            { t: 2.6, dur: 0.6, type: "shoot", who: "PV" },
          ],
        },
        {
          group: "LBの選択肢", label: "③右2-3割（＋RB並行）", from: 0.0,
          text: "LBが右2枚目と右3枚目の間を割って攻める。右2枚目が寄ってきたら、右1枚目との間に並行で走り込むRBへパス。",
          actions: [
            { t: 0.0, dur: 1.0, type: "move", who: "LB", to: [[12.8, 7.3]] },
            { t: 0.2, dur: 0.7, type: "move", who: "R3", to: [[11.6, 7.4]] },
            { t: 0.4, dur: 0.7, type: "move", who: "R2", to: [[14.1, 6.2]] },
            { t: 0.9, dur: 1.0, type: "move", who: "RB", to: [[15.8, 5.2]] },
            { t: 1.2, dur: 0.6, type: "pass", from: "LB", to: "RB" },
            { t: 1.9, dur: 0.6, type: "shoot", who: "RB" },
          ],
        },
        {
          group: "LBの選択肢", label: "④頭上パスフェイク→RB並行", from: 0.0,
          text: "右3枚目の頭の上を通すパスフェイクで右2枚目をRB側に寄せる。空いた右2枚目と右3枚目の間にRBが並行で走り込み、LBからパスしてシュート。",
          actions: [
            { t: 0.0, dur: 0.6, type: "move", who: "LB", to: [[10.6, 7.9]] },
            { t: 0.2, dur: 0.7, type: "move", who: "R3", to: [[11.6, 7.4]] },
            { t: 0.8, dur: 0.7, type: "fake", from: "LB", to: "RB" },
            { t: 1.0, dur: 0.7, type: "move", who: "R2", to: [[15.7, 6.6]] },
            { t: 1.3, dur: 1.0, type: "move", who: "RB", to: [[13.8, 6.3]] },
            { t: 1.9, dur: 0.6, type: "pass", from: "LB", to: "RB" },
            { t: 2.6, dur: 0.6, type: "shoot", who: "RB" },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- (4)
    {
      title: "反対側で広い3対2",
      text: "右側にDFが2枚しか残らず、PV・RB・RWの3人で広い3対2ができる。RBまでボールが渡ればLWとCBは戻ってDFの準備。",
      notes: [
        "RBまで渡ればLW/CBはDF。",
      ],
      actions: [
        { t: 0.0, dur: 3.0, type: "zone", rect: [11.8, 1.2, 8.0, 7.2], label: "3対2" },
        { t: 0.3, dur: 1.6, type: "move", who: "LW", to: [[1.3, 12.8]] },
        { t: 0.3, dur: 1.6, type: "move", who: "CB", to: [[4.8, 12.8]] },
      ],
      branches: [
        {
          group: "RBの選択肢", label: "①アウト割り", from: 3.0,
          text: "右1枚目と右2枚目の間を外側に割ってシュート。",
          actions: [
            { t: 0.0, dur: 1.0, type: "move", who: "RB", to: [[17.0, 4.8]] },
            { t: 1.0, dur: 0.6, type: "shoot", who: "RB" },
          ],
        },
        {
          group: "RBの選択肢", label: "②RW並行", from: 3.0,
          text: "右1枚目がRBに出てきたら、RWが右1枚目の内側に並行で走り込む。RBからRWへパスしてシュート。",
          actions: [
            { t: 0.0, dur: 0.7, type: "move", who: "R1", to: [[17.2, 5.0]] },
            { t: 0.3, dur: 1.0, type: "move", who: "RW", to: [[16.3, 3.5]] },
            { t: 1.0, dur: 0.5, type: "pass", from: "RB", to: "RW" },
            { t: 1.6, dur: 0.6, type: "shoot", who: "RW" },
          ],
        },
        {
          group: "RBの選択肢", label: "③PVポストパス", from: 3.0,
          text: "右2枚目がRBに寄ってきたら、右3枚目の裏にいるPVへポストパス。PVがターンしてシュート。",
          actions: [
            { t: 0.0, dur: 0.7, type: "move", who: "R2", to: [[16.4, 6.6]] },
            { t: 0.2, dur: 0.8, type: "move", who: "PV", to: [[13.4, 6.0]] },
            { t: 1.0, dur: 0.6, type: "pass", from: "RB", to: "PV" },
            { t: 1.7, dur: 0.6, type: "shoot", who: "PV" },
          ],
        },
      ],
    },
  ],
};
