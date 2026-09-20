// 再生ページの UI
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "06";
  const entry = (window.TACTIC_LIST || []).find((t) => t.id === id);
  if (!entry) { document.body.innerHTML = "<p style='padding:20px'>セットが見つかりません。</p>"; return; }
  const s = document.createElement("script");
  s.src = "tactics/" + entry.file + "?v=202609201201";
  s.onload = () => init(window.TACTICS[id]);
  document.head.appendChild(s);

  const $ = (sel) => document.querySelector(sel);
  const POV = !!document.getElementById("pov");            // 目線ページかどうか
  const POS = params.get("pos") || "RB";                    // 目線にする選手
  const termRe = () => {
    const keys = Object.keys(window.GLOSSARY).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&"));
    return new RegExp("(" + keys.join("|") + ")", "g");
  };
  const RE = termRe();
  // 左右反転時の文章: 左↔右、LW↔RW、LB↔RB を同時に入れ替える
  const SWAP = { "左": "右", "右": "左", "LW": "RW", "RW": "LW", "LB": "RB", "RB": "LB" };
  const swapText = (t) => t.replace(/LW|RW|LB|RB|左|右/g, (m) => SWAP[m]);
  let mirrored = false;
  function markTerms(text) {
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const src = mirrored ? swapText(text) : text;
    return esc(src).replace(RE, (m) => `<span class="term" data-term="${m}">${m}</span>`);
  }

  function init(data) {
    document.title = data.title + (POV ? `（${POS}目線）` : "") + " | ハンド動き解説";
    $("#title").textContent = data.title + (POV ? `　${POS}目線` : "");
    $("#purpose").textContent = "ねらい: " + data.purpose;
    const player = new window.TacticEngine.Player(data, $("#court"));
    window.player = player;
    // 左右反転（URL ?mirror=1 か前回の設定を復元）。反転ボタンの無いページ（目線ページ）では復元もしない
    const mirrorBtn = $("#mirrorBtn");
    if (mirrorBtn) {
      let saved = false; try { saved = localStorage.getItem("mirror") === "1"; } catch (e) {}
      if (params.get("mirror") === "1" || (params.get("mirror") == null && saved)) { mirrored = true; player.setMirror(true); }
      mirrorBtn.onclick = () => {
        mirrored = !mirrored; player.setMirror(mirrored); syncViewer();
        try { localStorage.setItem("mirror", mirrored ? "1" : "0"); } catch (e) {}
        const u = new URL(location.href); if (mirrored) u.searchParams.set("mirror", "1"); else u.searchParams.delete("mirror");
        history.replaceState(null, "", u);
      };
    }
    // 目線ビュー（pov.html）。反転時は「反転後にその位置に来る選手」＝データ上は反対側のID（RB→LB）を視点にする
    const viewerId = () => (mirrored ? window.TacticEngine.MIRROR_ID[POS] || POS : POS);
    function syncViewer() {
      if (!window.pov) return;
      window.pov.setViewer(viewerId());
      if (player.branch && !(player.branch.pov && player.branch.pov[viewerId()])) player.backToMain();
    }
    if (POV) {
      window.pov = new window.PovView(player, { pos: viewerId(), canvas: $("#pov"), minimap: $("#court"), callout: $("#callout"), stopBox: $("#stopBox"), format: markTerms });
      const back = $("#topLink"); if (back) back.href = "tactic.html?id=" + id + (mirrored ? "&mirror=1" : "");
    }
    // 上から図のページ → 目線ページへのリンク（index.js で pov を持つセットだけ）
    const povLink = $("#povLink");
    if (povLink && entry.pov && entry.pov.length) { povLink.hidden = false; povLink.href = `pov.html?id=${id}&pos=${entry.pov[0]}`; povLink.textContent = `👀 ${entry.pov[0]}目線`; }

    const dots = $("#dots");
    data.steps.forEach((st, i) => { const d = document.createElement("div"); d.className = "dot"; d.textContent = i + 1; d.onclick = () => player.gotoStep(i); dots.appendChild(d); });

    function renderPanel() {
      const i = player.stepIndex, step = player.step;
      [...dots.children].forEach((d, k) => { d.className = "dot" + (k === i ? " on" : k < i ? " done" : ""); });
      $("#mode").textContent = (player.branch ? "分岐: " + (mirrored ? swapText(player.branch.label) : player.branch.label) : "本線");
      if (mirrorBtn) { mirrorBtn.classList.toggle("on", mirrored); mirrorBtn.textContent = mirrored ? "⇄ 右から始動" : "⇄ 左右反転"; }
      $("#purpose").textContent = "ねらい: " + (mirrored ? swapText(data.purpose) : data.purpose) + (mirrored ? "　※左右を入れ替えたパターン" : "");
      if (POV) $("#title").textContent = data.title + `　${POS}目線` + (mirrored ? "（左右反転）" : "");
      $("#stepTitle").innerHTML = `(${i + 1}) ` + markTerms(step.title);
      $("#stepText").innerHTML = markTerms(step.text);
      const bt = $("#branchText");
      if (player.branch) { bt.hidden = false; bt.innerHTML = `<b>${mirrored ? swapText(player.branch.label) : player.branch.label}</b>　` + markTerms(player.branch.text); }
      else bt.hidden = true;
      const gd = $("#guideBox");
      const guides = player.branch ? [] : (step.guides || []);
      gd.innerHTML = guides.map((g) => `<div class="guide"><b>◎ ${markTerms(g.label)}</b><br>${markTerms(g.sub || "")}</div>`).join("");
      $("#notes").innerHTML = (step.notes || []).map((n) => `<li>${markTerms(n)}</li>`).join("");
      // branches
      const box = $("#branches"); box.innerHTML = "";
      const groups = {};
      // 目線ページでは、その目線の視線データ(pov)がある分岐だけ出す
      (step.branches || []).filter((b) => !POV || (b.pov && b.pov[viewerId()])).forEach((b) => { (groups[b.group] = groups[b.group] || []).push(b); });
      if (Object.keys(groups).length) {
        const mainChip = document.createElement("button"); mainChip.className = "chip main" + (player.branch ? "" : " on"); mainChip.textContent = "本線の動き";
        mainChip.onclick = () => player.backToMain();
        const h = document.createElement("h3"); h.textContent = "タップで分岐を再生"; box.appendChild(h);
        const row = document.createElement("div"); row.className = "chips"; row.appendChild(mainChip); box.appendChild(row);
        for (const g in groups) {
          const h3 = document.createElement("h3"); h3.textContent = mirrored ? swapText(g) : g; box.appendChild(h3);
          const chips = document.createElement("div"); chips.className = "chips";
          groups[g].forEach((b) => { const c = document.createElement("button"); c.className = "chip" + (player.branch === b ? " on" : ""); c.textContent = mirrored ? swapText(b.label) : b.label; c.onclick = () => player.playBranch(b); chips.appendChild(c); });
          box.appendChild(chips);
        }
      }
      $("#prev").disabled = i === 0 && !player.branch;
      // 判断で止まっている間の「次へ」は、同じステップの続き（ボールをもらう動きまで）を再生する
      const stopped = !!(window.pov && window.pov.stopped);
      $("#next").textContent = stopped ? "続き ▶" : i === data.steps.length - 1 ? "最初へ" : "次へ ▶";
      $("#next").classList.toggle("resume", stopped);
      $("#auto").classList.toggle("on", player.auto);
      $("#auto").textContent = player.auto ? "■ 停止" : "▶ 自動再生";
      $("#speed").textContent = "速さ " + player.speed + "x";
    }
    player.onChange = renderPanel;
    renderPanel();

    $("#prev").onclick = () => { player.auto = false; if (player.branch) player.backToMain(); else player.gotoStep(player.stepIndex - 1); };
    $("#next").onclick = () => {
      if (window.pov && window.pov.stopped) { window.pov.resume(); return; }     // 停止中は続きを再生
      player.auto = false; player.gotoStep(player.stepIndex === data.steps.length - 1 ? 0 : player.stepIndex + 1);
    };
    $("#replay").onclick = () => player.restart(true);
    // 最初から: ステップ1の頭に戻して再生（自動再生中ならそのまま続く）
    $("#restartBtn").onclick = () => { player.gotoStep(0, true); window.scrollTo({ top: 0, behavior: "smooth" }); };
    $("#auto").onclick = () => player.setAuto(!player.auto);
    const speeds = [0.5, 1, 1.5];
    $("#speed").onclick = () => { player.speed = speeds[(speeds.indexOf(player.speed) + 1) % speeds.length]; renderPanel(); };

    // 用語ヘルプ
    document.body.addEventListener("click", (e) => {
      const t = e.target.closest(".term"); if (!t) return;
      openSheet(t.dataset.term, window.GLOSSARY[t.dataset.term]);
    });
    $("#legendBtn").onclick = () => openSheet("見かた", null, true);
  }

  function openSheet(title, body, legend) {
    closeSheet();
    const scrim = document.createElement("div"); scrim.className = "scrim"; scrim.onclick = closeSheet; scrim.id = "scrim";
    const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
    sh.innerHTML = `<button class="close" aria-label="閉じる">✕</button><h4>${title}</h4>` + (body ? `<p>${body}</p>` : "") + (legend ? legendHtml() : "");
    sh.querySelector(".close").onclick = closeSheet;
    document.body.append(scrim, sh);
  }
  function closeSheet() { ["#scrim", "#sheet"].forEach((s) => { const e = document.querySelector(s); if (e) e.remove(); }); }
  function legendHtml() {
    return `<div class="legend">
      <div><span class="k" style="background:#3b8ee8"></span>攻撃（自分たち）</div>
      <div><span class="k" style="background:#ef8a3c"></span>DF（相手 6-0）</div>
      <div><span class="k" style="background:#ffd23f;border:2px solid #7a5a00"></span>ボール</div>
      <div><span class="k" style="background:none;border:3px solid #ffd23f"></span>ボールを持っている人</div>
      <div><span style="display:inline-block;width:26px;border-top:4px solid #1f2d5c;vertical-align:middle;margin-right:6px"></span>選手の動き</div>
      <div><span style="display:inline-block;width:26px;border-top:3px dashed #d64545;vertical-align:middle;margin-right:6px"></span>パス／シュート</div>
      <div><span class="k" style="background:none;border:3px dashed #0a9d6c"></span>ポイントの位置</div>
      <div><span class="k" style="background:rgba(255,196,0,.2);border:3px solid #f2a900;border-radius:6px"></span>3対2のエリア</div>
    </div>
    ${POV ? `<div style="margin-top:10px;font-size:13.5px;line-height:1.7"><b>目線ビューの見かた</b><br>
      画面は自分（${POS}）の目の高さから見た景色。近い人は大きく、遠い人は小さく見える。<br>
      <span class="k" style="background:none;border:3px dashed #ffd23f"></span>黄色の点線＋「見る」＝今見る相手。左右の端の「◀ LB」は視野の外にいる人。<br>
      右上の小さな図が上から見た位置と視野（黄色の扇）。<br>
      赤い「〇〇を見る」で一度止まる＝判断の場面。タップで続き（自動再生中は自動で続く）。<br>
      <span class="est" style="background:#ffd23f;color:#5a3d00;border-radius:4px;font-size:11px;padding:0 4px">仮</span>が付いた助言は、シートに書いていない推定（指導者確認中）。</div>` : ""}
    <p style="margin-top:10px">LW=左サイド / LB=左45 / CB=センター / PV=ポスト / RB=右45 / RW=右サイド<br>
    DFの番号は、攻める側から見てサイドライン側から「1枚目・2枚目・3枚目」。<br>
    <span style="color:#1b5fb3;border-bottom:2px dotted #3b8ee8">青い点線の言葉</span>はタップすると意味が出ます。</p>`;
  }
})();
