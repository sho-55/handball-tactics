// 描画エンジン: SVGコート + ステップ再生 + 分岐再生
(function () {
  const M = 50;                 // 1m = 50px
  const CW = 20, CH = 14;       // コート幅・表示する縦の長さ(m)
  const GOAL = { x: 10, y: 0 };
  const svgNS = "http://www.w3.org/2000/svg";
  const PLAYER_R = 0.58;

  function el(name, attrs, parent) {
    const e = document.createElementNS(svgNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const px = (v) => (v * M).toFixed(1);
  const ease = (u) => (u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function pointOnPath(pts, u) {
    // pts: [[x,y],...] ポリライン。u: 0..1
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d); total += d;
    }
    if (total === 0) return { x: pts[0][0], y: pts[0][1] };
    let dist = u * total;
    for (let i = 0; i < seg.length; i++) {
      if (dist <= seg[i] || i === seg.length - 1) {
        const f = seg[i] === 0 ? 1 : clamp(dist / seg[i], 0, 1);
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f };
      }
      dist -= seg[i];
    }
    const last = pts[pts.length - 1]; return { x: last[0], y: last[1] };
  }

  function duration(actions) {
    let d = 0; for (const a of actions) d = Math.max(d, a.t + a.dur); return d;
  }

  // 状態計算: startState から actions を t 秒進めた状態を返す
  function stateAt(startState, actions, t) {
    const pos = {}; for (const id in startState.pos) pos[id] = { ...startState.pos[id] };
    let holder = startState.holder, ballPos = null, shotDone = false;
    const zones = [], activeMoves = [], notes = [], blocks = [];
    const sorted = [...actions].sort((a, b) => a.t - b.t);
    for (const a of sorted) {
      if (t < a.t) continue;
      let u = clamp((t - a.t) / a.dur, 0, 1); if (u > 1 - 1e-6) u = 1;
      if (a.type === "move") {
        const start = pos[a.who];
        const p = pointOnPath([[start.x, start.y], ...a.to], ease(u));
        pos[a.who] = p; if (u < 1) activeMoves.push(a.who);
      } else if (a.type === "pass") {
        const from = pos[a.from], to = pos[a.to];
        if (u < 1) { holder = null; ballPos = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u }; }
        else holder = a.to;
      } else if (a.type === "fake") {
        const from = pos[a.from], to = pos[a.to];
        const k = 0.35 * Math.sin(Math.PI * u);
        if (u < 1) ballPos = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      } else if (a.type === "shoot") {
        const from = pos[a.who];
        if (u < 1) { holder = null; ballPos = { x: from.x + (GOAL.x - from.x) * u, y: from.y + (GOAL.y + 0.3 - from.y) * u }; }
        else { holder = null; ballPos = { x: GOAL.x, y: GOAL.y + 0.3 }; shotDone = true; }
      } else if (a.type === "zone") {
        zones.push(a);
      } else if (a.type === "note") {
        if (u < 1) notes.push(a);
      } else if (a.type === "block") {
        // ブロック(スクリーン): 指定位置へ移動し、着いたらバーを表示
        const start = pos[a.who];
        const p = pointOnPath([[start.x, start.y], ...a.to], ease(u));
        pos[a.who] = p; if (u < 1) activeMoves.push(a.who); else blocks.push({ who: a.who, x: p.x, y: p.y });
      }
      // wait: 何もしない（間を作る）
    }
    return { pos, holder, ballPos, zones, activeMoves, shotDone, notes, blocks };
  }

  // 経路の見た目(ポリライン・パス線)をステップ開始状態から計算
  function pathsFor(startState, actions) {
    const moves = [], passes = [];
    const sorted = [...actions].sort((a, b) => a.t - b.t);
    for (const a of sorted) {
      if (a.type === "move" || a.type === "block") {
        const s = stateAt(startState, actions, a.t).pos[a.who];
        moves.push({ who: a.who, team: startState.team[a.who], pts: [[s.x, s.y], ...a.to], t: a.t, end: a.t + a.dur });
      } else if (a.type === "pass" || a.type === "fake") {
        const s = stateAt(startState, actions, a.t).pos, e = stateAt(startState, actions, a.t + a.dur).pos;
        passes.push({ from: s[a.from], to: e[a.to], t: a.t, end: a.t + a.dur, fake: a.type === "fake" });
      } else if (a.type === "shoot") {
        const s = stateAt(startState, actions, a.t).pos[a.who];
        passes.push({ from: s, to: { x: GOAL.x, y: GOAL.y + 0.3 }, t: a.t, end: a.t + a.dur, shoot: true });
      }
    }
    return { moves, passes };
  }

  // ---------------------------------------------------------------- Court
  function drawCourt(svg) {
    svg.setAttribute("viewBox", `0 -40 ${CW * M} ${CH * M + 40}`);
    const g = el("g", { id: "court" }, svg);
    el("rect", { x: 0, y: -40, width: CW * M, height: CH * M + 40, fill: "#fff" }, g);
    el("rect", { x: 0, y: 0, width: CW * M, height: CH * M, fill: "#f9f9f6", stroke: "#333", "stroke-width": 3 }, g);
    // 6m ゴールエリア
    el("path", { d: `M ${px(2.5)} 0 A ${px(6)} ${px(6)} 0 0 0 ${px(8.5)} ${px(6)} L ${px(11.5)} ${px(6)} A ${px(6)} ${px(6)} 0 0 0 ${px(17.5)} 0`,
      fill: "#eef2f9", stroke: "#333", "stroke-width": 2.5 }, g);
    // 9m フリースローライン
    el("path", { d: `M 0 ${px(2.96)} A ${px(9)} ${px(9)} 0 0 0 ${px(8.5)} ${px(9)} L ${px(11.5)} ${px(9)} A ${px(9)} ${px(9)} 0 0 0 ${px(20)} ${px(2.96)}`,
      fill: "none", stroke: "#333", "stroke-width": 2.5, "stroke-dasharray": "14 10" }, g);
    // 7m, 4m
    el("line", { x1: px(9.5), y1: px(7), x2: px(10.5), y2: px(7), stroke: "#333", "stroke-width": 3 }, g);
    el("line", { x1: px(9.85), y1: px(4), x2: px(10.15), y2: px(4), stroke: "#333", "stroke-width": 3 }, g);
    // ゴール
    el("rect", { x: px(8.5), y: -30, width: px(3), height: 30, fill: "#222" }, g);
    el("rect", { x: px(8.5), y: -30, width: px(3), height: 30, fill: "url(#net)" }, g);
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "net", width: 8, height: 8, patternUnits: "userSpaceOnUse" }, defs);
    el("path", { d: "M0 0 L8 8 M8 0 L0 8", stroke: "#888", "stroke-width": 1 }, pat);
    for (const [id, color] of [["arrowMove", "#1f2d5c"], ["arrowPass", "#d64545"], ["arrowShoot", "#d64545"]]) {
      const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0 0 L10 5 L0 10 z", fill: color }, m);
    }
    // 目安のラベル
    el("text", { x: px(0.4), y: px(6.4), "font-size": 20, fill: "#777" }, g).textContent = "6m";
    el("text", { x: px(0.4), y: px(9.4), "font-size": 20, fill: "#777" }, g).textContent = "9m";
    el("g", { id: "zones" }, svg);
    el("g", { id: "paths" }, svg);
    el("g", { id: "guides" }, svg);
    el("g", { id: "players" }, svg);
    el("g", { id: "ball" }, svg);
  }

  // ---------------------------------------------------------------- Player
  class Player {
    constructor(data, hostEl) {
      this.data = data; this.svg = hostEl;
      this.stepIndex = 0; this.speed = 1; this.auto = false; this.runId = 0;
      this.reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.branch = null; this.t = 0; this.playing = false; this.lastTs = 0;
      this.onChange = () => {};
      drawCourt(hostEl);
      this.layers = { zones: hostEl.querySelector("#zones"), paths: hostEl.querySelector("#paths"), guides: hostEl.querySelector("#guides"),
        players: hostEl.querySelector("#players"), ball: hostEl.querySelector("#ball") };
      this.buildPlayers();
      this.computeStepStates();
      this.gotoStep(0, true);
    }
    buildPlayers() {
      this.nodes = {};
      for (const id in this.data.players) {
        const p = this.data.players[id];
        const g = el("g", { class: "player " + p.team }, this.layers.players);
        el("circle", { r: px(PLAYER_R), fill: p.team === "of" ? "#3b8ee8" : "#ef8a3c", stroke: p.team === "of" ? "#1b4f8f" : "#9a4a12", "stroke-width": 3 }, g);
        const label = p.team === "of" ? id : (p.label || "");
        el("text", { "text-anchor": "middle", dy: p.team === "of" ? 7 : 6, "font-size": p.team === "of" ? 22 : 18, "font-weight": 700, fill: "#fff" }, g).textContent = label;
        const ring = el("circle", { r: px(PLAYER_R) + 6, fill: "none", stroke: "#ffd23f", "stroke-width": 4, opacity: 0 }, g);
        this.nodes[id] = { g, ring };
      }
      const bg = el("g", {}, this.layers.ball);
      el("circle", { r: 11, fill: "#ffd23f", stroke: "#7a5a00", "stroke-width": 2.5 }, bg);
      this.ballNode = bg;
    }
    initialState() {
      const pos = {}, team = {};
      for (const id in this.data.players) { pos[id] = { x: this.data.players[id].x, y: this.data.players[id].y }; team[id] = this.data.players[id].team; }
      return { pos, holder: this.data.ball, team };
    }
    computeStepStates() {
      this.stepStarts = []; let s = this.initialState();
      for (const step of this.data.steps) {
        this.stepStarts.push(s);
        const end = stateAt(s, step.actions, duration(step.actions));
        s = { pos: end.pos, holder: end.holder, team: s.team };
      }
    }
    get step() { return this.data.steps[this.stepIndex]; }
    currentSequence() {
      const start = this.stepStarts[this.stepIndex];
      if (this.branch) {
        const base = stateAt(start, this.step.actions, this.branch.from);
        return { start: { pos: base.pos, holder: base.holder, team: start.team }, actions: this.branch.actions };
      }
      return { start, actions: this.step.actions };
    }
    gotoStep(i, play = true) {
      this.stepIndex = clamp(i, 0, this.data.steps.length - 1);
      this.branch = null; this.restart(play);
    }
    // 分岐の仕様:
    //  - 分岐は本線の `from` 秒時点の配置（関係ない選手も含めて）から始まり、シュートで終わってその場で止まる
    //  - 別の分岐を選ぶと、その分岐の `from` 時点まで巻き戻してから再生する
    //  - 「次へ」は分岐を捨てて次ステップの本線へ。「前へ」は分岐中なら同じステップの本線に戻る
    //  - 自動再生は本線のみを流し、分岐点で止まらない。分岐をタップしたら自動再生は止まる
    playBranch(b) { this.auto = false; clearTimeout(this.autoTimer); this.branch = b; this.restart(true); }
    backToMain() { this.branch = null; this.restart(true); }
    restart(play = true) {
      this.playing = false; this.runId++; clearTimeout(this.autoTimer);
      this.seq = this.currentSequence();
      this.total = duration(this.seq.actions);
      this.t = 0; this.drawStatic(); this.render(); this.onChange();
      if (play) this.play();
    }
    play() {
      if (this.playing) return;                       // 連打しても二重ループにしない
      if (this.reducedMotion) { this.t = this.total; this.render(); this.finished(); return; }
      this.playing = true; this.lastTs = 0; const id = ++this.runId;
      requestAnimationFrame((ts) => this.frame(ts, id));
    }
    pause() { this.playing = false; }
    finished() {
      if (this.auto && !this.branch) {
        if (this.stepIndex < this.data.steps.length - 1) this.autoTimer = setTimeout(() => { if (this.auto) this.gotoStep(this.stepIndex + 1); }, 1400 / this.speed);
        else { this.auto = false; this.onChange(); }
      }
    }
    frame(ts, id) {
      if (!this.playing || id !== this.runId) return;
      if (this.lastTs) this.t += ((ts - this.lastTs) / 1000) * this.speed;
      this.lastTs = ts;
      if (this.t >= this.total) {
        this.t = this.total; this.playing = false; this.render(); this.finished();
        return;
      }
      this.render();
      requestAnimationFrame((t2) => this.frame(t2, id));
    }
    setAuto(on) { this.auto = on; clearTimeout(this.autoTimer); if (on && !this.playing) { if (this.t >= this.total) this.gotoStep(this.stepIndex < this.data.steps.length - 1 ? this.stepIndex + 1 : 0); else this.play(); } this.onChange(); }
    drawStatic() {
      const { paths, guides, zones } = this.layers;
      paths.innerHTML = ""; guides.innerHTML = ""; zones.innerHTML = "";
      const pf = pathsFor(this.seq.start, this.seq.actions);
      for (const m of pf.moves) {
        el("polyline", { points: m.pts.map((p) => `${px(p[0])},${px(p[1])}`).join(" "), fill: "none",
          stroke: m.team === "of" ? "#1f2d5c" : "#b85c1a", "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round",
          opacity: 0.55, "marker-end": "url(#arrowMove)", "stroke-dasharray": m.team === "of" ? "" : "8 6" }, paths);
      }
      for (const p of pf.passes) {
        el("line", { x1: px(p.from.x), y1: px(p.from.y), x2: px(p.to.x), y2: px(p.to.y), stroke: "#d64545", "stroke-width": p.shoot ? 5 : 3.5,
          "stroke-dasharray": p.fake ? "4 6" : "12 8", opacity: p.fake ? 0.5 : 0.75, "marker-end": "url(#arrowPass)" }, paths);
      }
      const gs = this.branch ? [] : (this.step.guides || []);
      for (const g of gs) {
        const grp = el("g", {}, guides);
        el("circle", { cx: px(g.x), cy: px(g.y), r: 16, fill: "none", stroke: "#0a9d6c", "stroke-width": 3, "stroke-dasharray": "5 4" }, grp);
        el("circle", { cx: px(g.x), cy: px(g.y), r: 4, fill: "#0a9d6c" }, grp);
        const lx = px(g.lx != null ? g.lx : g.x + 1.6), ly = px(g.ly != null ? g.ly : g.y + 2.6);
        el("line", { x1: px(g.x), y1: px(g.y) + 16, x2: lx + 20, y2: ly - 40, stroke: "#0a9d6c", "stroke-width": 2, "stroke-dasharray": "4 4" }, grp);
        const w = Math.max(g.label.length * 24, (g.sub || "").length * 18) + 28;
        el("rect", { x: lx, y: ly - 40, width: w, height: g.sub ? 68 : 44, rx: 8, fill: "rgba(255,255,255,.94)", stroke: "#0a9d6c", "stroke-width": 2 }, grp);
        const tx = el("text", { x: lx + 14, y: ly - 12, "font-size": 24, "font-weight": 700, fill: "#0a7a55" }, grp); tx.textContent = g.label;
        if (g.sub) { const t2 = el("text", { x: lx + 14, y: ly + 16, "font-size": 18, fill: "#0a7a55" }, grp); t2.textContent = g.sub; }
      }
    }
    render() {
      const st = stateAt(this.seq.start, this.seq.actions, this.t);
      for (const id in st.pos) {
        const n = this.nodes[id], p = st.pos[id];
        n.g.setAttribute("transform", `translate(${px(p.x)} ${px(p.y)})`);
        n.ring.setAttribute("opacity", st.holder === id ? 1 : 0);
      }
      let b = st.ballPos;
      if (!b && st.holder) { const h = st.pos[st.holder]; b = { x: h.x + 0.45, y: h.y - 0.45 }; }
      if (b) { this.ballNode.setAttribute("transform", `translate(${px(b.x)} ${px(b.y)})`); this.ballNode.setAttribute("opacity", 1); }
      else this.ballNode.setAttribute("opacity", 0);
      // zones
      const zl = this.layers.zones; zl.innerHTML = "";
      for (const z of st.zones) {
        const [x, y, w, h] = z.rect;
        el("rect", { x: px(x), y: px(y), width: px(w), height: px(h), rx: 14, fill: "rgba(255,196,0,.12)", stroke: "#f2a900", "stroke-width": 4 }, zl);
        if (z.label) el("text", { x: px(x + w) - 10, y: px(y) + 30, "text-anchor": "end", "font-size": 24, "font-weight": 700, fill: "#c98600" }, zl).textContent = z.label;
      }
      for (const b of st.blocks) {
        el("rect", { x: px(b.x) - 34, y: px(b.y) - 44, width: 68, height: 8, rx: 3, fill: "#1f2d5c" }, zl);
      }
      for (const n of st.notes) {
        const w = n.text.length * 20 + 20;
        el("rect", { x: px(n.x), y: px(n.y) - 26, width: w, height: 36, rx: 8, fill: "rgba(31,45,92,.9)" }, zl);
        el("text", { x: px(n.x) + 10, y: px(n.y), "font-size": 20, "font-weight": 700, fill: "#fff" }, zl).textContent = n.text;
      }
      if (st.shotDone) {
        el("text", { x: px(GOAL.x), y: -50 + 42, "text-anchor": "middle", "font-size": 26, "font-weight": 700, fill: "#d64545" }, zl).textContent = "シュート！";
      }
    }
  }

  window.TacticEngine = { Player, stateAt, duration };
})();
