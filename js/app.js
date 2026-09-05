// 再生ページの UI
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "06";
  const entry = (window.TACTIC_LIST || []).find((t) => t.id === id);
  if (!entry) { document.body.innerHTML = "<p style='padding:20px'>セットが見つかりません。</p>"; return; }
  const s = document.createElement("script");
  s.src = "tactics/" + entry.file;
  s.onload = () => init(window.TACTICS[id]);
  document.head.appendChild(s);

  const $ = (sel) => document.querySelector(sel);
  const termRe = () => {
    const keys = Object.keys(window.GLOSSARY).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&"));
    return new RegExp("(" + keys.join("|") + ")", "g");
  };
  const RE = termRe();
  function markTerms(text) {
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc(text).replace(RE, (m) => `<span class="term" data-term="${m}">${m}</span>`);
  }

  function init(data) {
    document.title = data.title + " | ハンド動き解説";
    $("#title").textContent = data.title;
    $("#purpose").textContent = "ねらい: " + data.purpose;
    const player = new window.TacticEngine.Player(data, $("#court"));
    window.player = player;

    const dots = $("#dots");
    data.steps.forEach((st, i) => { const d = document.createElement("div"); d.className = "dot"; d.textContent = i + 1; d.onclick = () => player.gotoStep(i); dots.appendChild(d); });

    function renderPanel() {
      const i = player.stepIndex, step = player.step;
      [...dots.children].forEach((d, k) => { d.className = "dot" + (k === i ? " on" : k < i ? " done" : ""); });
      $("#mode").textContent = player.branch ? "分岐: " + player.branch.label : "本線";
      $("#stepTitle").innerHTML = `(${i + 1}) ` + markTerms(step.title);
      $("#stepText").innerHTML = markTerms(step.text);
      const bt = $("#branchText");
      if (player.branch) { bt.hidden = false; bt.innerHTML = `<b>${player.branch.label}</b>　` + markTerms(player.branch.text); }
      else bt.hidden = true;
      const gd = $("#guideBox");
      const guides = player.branch ? [] : (step.guides || []);
      gd.innerHTML = guides.map((g) => `<div class="guide"><b>◎ ${markTerms(g.label)}</b><br>${markTerms(g.sub || "")}</div>`).join("");
      $("#notes").innerHTML = (step.notes || []).map((n) => `<li>${markTerms(n)}</li>`).join("");
      // branches
      const box = $("#branches"); box.innerHTML = "";
      const groups = {};
      (step.branches || []).forEach((b) => { (groups[b.group] = groups[b.group] || []).push(b); });
      if (Object.keys(groups).length) {
        const mainChip = document.createElement("button"); mainChip.className = "chip main" + (player.branch ? "" : " on"); mainChip.textContent = "本線の動き";
        mainChip.onclick = () => player.backToMain();
        const h = document.createElement("h3"); h.textContent = "タップで分岐を再生"; box.appendChild(h);
        const row = document.createElement("div"); row.className = "chips"; row.appendChild(mainChip); box.appendChild(row);
        for (const g in groups) {
          const h3 = document.createElement("h3"); h3.textContent = g; box.appendChild(h3);
          const chips = document.createElement("div"); chips.className = "chips";
          groups[g].forEach((b) => { const c = document.createElement("button"); c.className = "chip" + (player.branch === b ? " on" : ""); c.textContent = b.label; c.onclick = () => player.playBranch(b); chips.appendChild(c); });
          box.appendChild(chips);
        }
      }
      $("#prev").disabled = i === 0 && !player.branch;
      $("#next").textContent = i === data.steps.length - 1 ? "最初へ" : "次へ ▶";
      $("#auto").classList.toggle("on", player.auto);
      $("#auto").textContent = player.auto ? "■ 停止" : "▶ 自動再生";
      $("#speed").textContent = "速さ " + player.speed + "x";
    }
    player.onChange = renderPanel;
    renderPanel();

    $("#prev").onclick = () => { player.auto = false; if (player.branch) player.backToMain(); else player.gotoStep(player.stepIndex - 1); };
    $("#next").onclick = () => { player.auto = false; player.gotoStep(player.stepIndex === data.steps.length - 1 ? 0 : player.stepIndex + 1); };
    $("#replay").onclick = () => player.restart(true);
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
    <p style="margin-top:10px">LW=左サイド / LB=左45 / CB=センター / PV=ポスト / RB=右45 / RW=右サイド<br>
    DFの番号は、攻める側から見てサイドライン側から「1枚目・2枚目・3枚目」。<br>
    <span style="color:#1b5fb3;border-bottom:2px dotted #3b8ee8">青い点線の言葉</span>はタップすると意味が出ます。</p>`;
  }
})();
