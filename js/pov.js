// 目線ビュー: 指定した選手(既定 RB)の位置から見た疑似3D。
// 既存の TacticEngine.Player の状態(stateAt)をそのまま受け取り、描画・視線・判断停止だけを足す。
(function () {
  const E = window.TacticEngine;
  const GOAL = E.GOAL, CW = E.CW;
  const EYE = 1.6, HEAD = 1.75, HFOV = (110 * Math.PI) / 180, NEAR = 0.3, HORIZON = 0.42;
  const COL = { of: "#3b8ee8", ofEdge: "#1b4f8f", df: "#ef8a3c", dfEdge: "#9a4a12", ball: "#ffd23f", ballEdge: "#7a5a00", floor: "#f2f1ea", area: "#e3e9f3", wall: "#d5dde8", line: "#2f2f2f" };
  const SMOOTH = 0.5, SAMPLES = 6;           // 顔の向き: 直近 0.5 秒を 6 点で平均
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (name, attrs, parent) => { const e = document.createElementNS(svgNS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (v) => { const l = Math.hypot(v.x, v.y); return l < 1e-9 ? null : { x: v.x / l, y: v.y / l }; };

  // ---------------------------------------------------------------- コートの線(メートル, z=0)
  function arc(cx, cy, r, a0, a1, n) { const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }
  const D = Math.PI / 180;
  const AREA6 = [...arc(8.5, 0, 6, 180 * D, 90 * D, 30), ...arc(11.5, 0, 6, 90 * D, 0, 30)];
  const a9 = Math.acos(-8.5 / 9);
  const LINE9 = [...arc(8.5, 0, 9, a9, 90 * D, 30), ...arc(11.5, 0, 9, 90 * D, Math.PI - a9, 30)];
  const LINES = [
    { pts: [[0, 0], [20, 0]], w: 3 }, { pts: [[0, 0], [0, 20]], w: 3 }, { pts: [[20, 0], [20, 20]], w: 3 }, { pts: [[0, 20], [20, 20]], w: 2 },
    { pts: AREA6, w: 2.5 }, { pts: LINE9, w: 2, dash: [10, 8] },
    { pts: [[9.5, 7], [10.5, 7]], w: 3 }, { pts: [[9.85, 4], [10.15, 4]], w: 3 },
  ];
  // ゴール(3D 線分): [x,y,z]-[x,y,z]
  const GL = 8.5, GR = 11.5, GH = 2, GD = -1;
  const GOAL_FRAME = [[[GL, 0, 0], [GL, 0, GH]], [[GR, 0, 0], [GR, 0, GH]], [[GL, 0, GH], [GR, 0, GH]]];
  const GOAL_NET = [[[GL, GD, 0], [GL, GD, GH]], [[GR, GD, 0], [GR, GD, GH]], [[GL, GD, GH], [GR, GD, GH]], [[GL, GD, 0], [GR, GD, 0]],
    [[GL, 0, GH], [GL, GD, GH]], [[GR, 0, GH], [GR, GD, GH]], [[GL, 0, 0], [GL, GD, 0]], [[GR, 0, 0], [GR, GD, 0]]];
  for (let i = 1; i < 6; i++) { const x = GL + (i * 3) / 6; GOAL_NET.push([[x, 0, GH], [x, GD, GH]], [[x, GD, 0], [x, GD, GH]]); }
  for (let i = 1; i < 4; i++) { const z = (i * GH) / 4; GOAL_NET.push([[GL, GD, z], [GR, GD, z]], [[GL, 0, z], [GL, GD, z]], [[GR, 0, z], [GR, GD, z]]); }

  class PovView {
    constructor(player, opts) {
      this.p = player; this.pos = opts.pos || "RB";
      this.canvas = opts.canvas; this.ctx = this.canvas.getContext("2d");
      this.mini = opts.minimap; this.callout = opts.callout; this.stopBox = opts.stopBox;
      this.format = opts.format || ((s) => s);
      this.reducedMotion = player.reducedMotion;
      this.passed = new Set(); this.lastT = -1; this.seqRef = null; this.stopped = null; this.stopTimer = null; this.inStop = false;
      this.buildMini();
      this.resize();
      window.addEventListener("resize", () => { this.resize(); this.redraw(); });
      const resume = (e) => { if (this.stopped) { e.preventDefault(); this.resume(); } };
      this.canvas.addEventListener("click", resume); this.stopBox.addEventListener("click", resume);
      player.onRender = (st, t) => this.onRender(st, t);
      this.redraw();
    }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      const W = this.canvas.clientWidth || 360, H = Math.round(W * 0.66);
      this.canvas.style.height = H + "px";
      this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
      this.W = W; this.H = H; this.dpr = dpr; this.F = W / 2 / Math.tan(HFOV / 2);
    }
    redraw() { const st = E.stateAt(this.p.seq.start, this.p.seq.actions, this.p.t); this.draw(st, this.p.t); }

    // ---------------------------------------------------------------- 視線データ(cue)
    cuesOf(node) { const pv = node && node.pov && node.pov[this.pos]; return pv && pv.cues ? [...pv.cues].sort((a, b) => a.t - b.t) : []; }
    // 現在のシーケンス(本線 or 分岐)と、境界のつながり用の「直前の文脈」
    contexts() {
      const p = this.p, i = p.stepIndex;
      const main = { start: p.stepStarts[i], actions: p.step.actions, cues: this.cuesOf(p.step) };
      if (p.branch) return { cur: { start: p.seq.start, actions: p.branch.actions, cues: this.cuesOf(p.branch) }, prev: main, prevEnd: p.branch.from };
      if (i > 0) { const ps = p.data.steps[i - 1]; return { cur: main, prev: { start: p.stepStarts[i - 1], actions: ps.actions, cues: this.cuesOf(ps) }, prevEnd: E.duration(ps.actions) }; }
      return { cur: main, prev: null, prevEnd: 0 };
    }
    cueAt(cues, t) { let c = null; for (const q of cues) { if (q.t <= t + 1e-9) c = q; else break; } return c; }
    // 顔の向きの目標(単位ベクトル)。cue の face → 既定ルール(他人が保持中はボール、自分が保持中はゴール)
    faceVec(ctx, t) {
      const st = E.stateAt(ctx.start, ctx.actions, t), me = st.pos[this.pos];
      const cue = this.cueAt(ctx.cues, t);
      let tg = null, face = cue && cue.face;
      if (face === "GOAL") tg = GOAL;
      else if (face === "BALL") tg = st.ballPos || (st.holder ? st.pos[st.holder] : null);
      else if (Array.isArray(face) && typeof face[0] === "string") {          // 複数の選手 → その中間を向く
        const ps = face.map((id) => st.pos[id]).filter(Boolean);
        if (ps.length) tg = { x: ps.reduce((a, q) => a + q.x, 0) / ps.length, y: ps.reduce((a, q) => a + q.y, 0) / ps.length };
      } else if (Array.isArray(face)) tg = { x: face[0], y: face[1] };
      else if (face && st.pos[face]) tg = st.pos[face];
      if (!tg) { if (st.holder === this.pos) tg = GOAL; else if (st.ballPos) tg = st.ballPos; else if (st.holder) tg = st.pos[st.holder]; else tg = GOAL; }
      const v = norm({ x: tg.x - me.x, y: tg.y - me.y });
      return v || norm({ x: GOAL.x - me.x, y: GOAL.y - me.y }) || { x: 0, y: -1 };
    }
    // なめらかな向き: t の純関数(直近 SMOOTH 秒の目標を新しいほど重く平均。t<0 は直前の文脈を参照)
    forwardAt(t) {
      const { cur, prev, prevEnd } = this.contexts();
      let sx = 0, sy = 0;
      for (let k = 0; k < SAMPLES; k++) {
        const ts = t - (SMOOTH * k) / (SAMPLES - 1), w = 1 - k / SAMPLES;
        let v;
        if (ts >= 0) v = this.faceVec(cur, ts);
        else if (prev) v = this.faceVec(prev, Math.max(0, prevEnd + ts));
        else v = this.faceVec(cur, 0);
        sx += v.x * w; sy += v.y * w;
      }
      return norm({ x: sx, y: sy }) || { x: 0, y: -1 };
    }

    // ---------------------------------------------------------------- 投影
    setCamera(st, t) {
      const me = st.pos[this.pos], fw = this.forwardAt(t);
      this.cam = { x: me.x, y: me.y, fw, rt: { x: -fw.y, y: fw.x } };
    }
    toCam(x, y, z) { const c = this.cam, rx = x - c.x, ry = y - c.y; return { d: rx * c.fw.x + ry * c.fw.y, l: rx * c.rt.x + ry * c.rt.y, z: z || 0 }; }
    proj(cp) { if (cp.d < NEAR - 1e-6) return null; return { x: this.W / 2 + (this.F * cp.l) / cp.d, y: HORIZON * this.H + (this.F * (EYE - cp.z)) / cp.d, d: cp.d }; }
    project(id) { const st = E.stateAt(this.p.seq.start, this.p.seq.actions, this.p.t); const q = st.pos[id]; return q ? this.proj(this.toCam(q.x, q.y, 0)) : null; }
    clipSeg(a, b) {   // 近平面 d=NEAR で切る
      if (a.d < NEAR && b.d < NEAR) return null;
      const lerp = (p, q, u) => ({ d: p.d + (q.d - p.d) * u, l: p.l + (q.l - p.l) * u, z: p.z + (q.z - p.z) * u });
      if (a.d < NEAR) { a = lerp(a, b, (NEAR - a.d) / (b.d - a.d)); a.d = NEAR; }
      if (b.d < NEAR) { b = lerp(b, a, (NEAR - b.d) / (a.d - b.d)); b.d = NEAR; }
      return [this.proj(a), this.proj(b)];
    }
    clipPoly(pts) {   // Sutherland–Hodgman(近平面のみ)
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ain = a.d >= NEAR, bin = b.d >= NEAR;
        const cross = () => { const u = (NEAR - a.d) / (b.d - a.d); return { d: NEAR, l: a.l + (b.l - a.l) * u, z: 0 }; };
        if (ain) out.push(a);
        if (ain !== bin) out.push(cross());
      }
      return out.map((c) => this.proj(c));
    }
    line3(seg, w, color, dash) {
      const r = this.clipSeg(this.toCam(...seg[0]), this.toCam(...seg[1])); if (!r) return;
      const g = this.ctx; g.beginPath(); g.moveTo(r[0].x, r[0].y); g.lineTo(r[1].x, r[1].y);
      g.lineWidth = w; g.strokeStyle = color; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]);
    }

    // ---------------------------------------------------------------- 描画
    onRender(st, t) {
      const p = this.p;
      if (this.seqRef !== p.seq || t < this.lastT - 1e-9) { this.passed.clear(); this.clearStop(); this.seqRef = p.seq; }
      if (this.stopped && p.playing) this.clearStop();          // 外から再生された
      if (!this.inStop && p.playing && !this.reducedMotion) {
        const cues = this.contexts().cur.cues;
        for (const c of cues) {
          if (c.stop && !this.passed.has(c) && this.lastT < c.t && c.t <= t + 1e-9 && c.t < p.total - 0.05) {
            this.passed.add(c); p.pause(); p.t = c.t; this.stopped = c;
            this.inStop = true; p.render(); this.inStop = false;
            this.showStop(c);
            if (p.auto) this.stopTimer = setTimeout(() => this.resume(), 1500 / p.speed);
            return;
          }
        }
      }
      this.lastT = t;
      this.draw(st, t);
    }
    showStop(c) {
      const who = [].concat(c.look || []).map((id) => this.label(id)).join("・");
      this.stopBox.innerHTML = `<div class="big">${who ? who + "を見る" : "ここで判断"}</div><div class="small">${this.p.auto ? "自動で続きます" : "タップで続き ▶"}</div>`;
      this.stopBox.hidden = false;
    }
    clearStop() { clearTimeout(this.stopTimer); this.stopped = null; this.stopBox.hidden = true; }
    resume() { if (!this.stopped) return; this.clearStop(); this.p.play(); }
    label(id) { const q = this.p.data.players[id]; return q ? (q.team === "of" ? id : q.label || id) : id; }

    draw(st, t) {
      this.setCamera(st, t);
      const g = this.ctx, W = this.W, H = this.H, hz = HORIZON * H;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      // 背景: 壁と床
      g.fillStyle = COL.wall; g.fillRect(0, 0, W, hz);
      g.fillStyle = COL.floor; g.fillRect(0, hz, W, H - hz);
      // 6m エリア(塗り)
      const poly = this.clipPoly([...AREA6, [17.5, 0], [2.5, 0]].map(([x, y]) => this.toCam(x, y, 0)));
      if (poly.length >= 3) { g.beginPath(); poly.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.fillStyle = COL.area; g.fill(); }
      // コートの線
      g.lineCap = "round"; g.lineJoin = "round";
      for (const L of LINES) for (let i = 1; i < L.pts.length; i++) this.line3([[...L.pts[i - 1], 0], [...L.pts[i], 0]], L.w, COL.line, L.dash);
      // ゴール
      for (const s of GOAL_NET) this.line3(s, 1, "#9aa3ad");
      for (const s of GOAL_FRAME) this.line3(s, 5, "#d64545");
      // 選手(遠い順)
      const cue = this.cueAt(this.contexts().cur.cues, t);
      const looks = new Set([].concat((cue && cue.look) || []));
      const sprites = [], chips = [];
      for (const id in st.pos) {
        if (id === this.pos) continue;
        const q = st.pos[id], team = this.p.data.players[id].team;
        const foot = this.toCam(q.x, q.y, 0), fp = this.proj(foot), hp = this.proj(this.toCam(q.x, q.y, HEAD));
        if (!fp || fp.x < -20 || fp.x > W + 20) {
          // 視野外: 味方・注目相手・ボール保持者だけ端のチップで示す(DF全員を出すと煩雑)
          if (team === "of" || looks.has(id) || st.holder === id) chips.push({ id, team, side: foot.l < 0 ? "L" : "R", look: looks.has(id) });
          continue;
        }
        sprites.push({ id, team, fp, hp, holder: st.holder === id, look: looks.has(id) });
      }
      sprites.sort((a, b) => b.fp.d - a.fp.d);
      for (const s of sprites) this.sprite(s, t);
      // 飛んでいるボール
      if (st.ballPos && !(st.holder === this.pos)) {
        const bp = this.proj(this.toCam(st.ballPos.x, st.ballPos.y, 1.2));
        if (bp) this.ball(bp.x, bp.y, clamp((this.F * 0.13) / bp.d, 3, 40));
      }
      // 視野外のチップ
      const slots = { L: 0, R: 0 };
      for (const c of chips) { c.slot = slots[c.side] * 24; slots[c.side]++; this.chip(c); }
      // 自分が持っている
      if (st.holder === this.pos) this.ball(W / 2, H - 26, 24);
      if (st.shotDone) { g.font = "700 22px -apple-system, 'Hiragino Sans', sans-serif"; g.textAlign = "center"; g.fillStyle = "#d64545"; g.fillText("シュート！", W / 2, 34); }
      this.drawMini(st);
      this.drawCallout(cue);
    }
    sprite(s, t) {
      const g = this.ctx, h = s.fp.y - s.hp.y, w = h * 0.55, cx = s.fp.x;
      const headR = h * 0.11, bodyTop = s.hp.y + h * 0.2, bodyH = s.fp.y - bodyTop;
      const fill = s.team === "of" ? COL.of : COL.df, edge = s.team === "of" ? COL.ofEdge : COL.dfEdge;
      // 注目リング
      if (s.look) {
        const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 180);
        g.beginPath(); g.ellipse(cx, s.hp.y + h / 2, w * 0.95 + 6, h * 0.6 + 6, 0, 0, Math.PI * 2);
        g.lineWidth = 4; g.strokeStyle = `rgba(255,210,63,${pulse})`; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
        const fs = clamp(h * 0.14, 11, 16); g.font = `700 ${fs}px -apple-system, 'Hiragino Sans', sans-serif`; g.textAlign = "center";
        const ty = clamp(s.hp.y - 10, fs + 4, this.H - 4); const tw = fs * 2.6;
        g.fillStyle = "#ffd23f"; this.rrect(cx - tw / 2, ty - fs - 2, tw, fs + 6, 4); g.fill();
        g.fillStyle = "#5a3d00"; g.fillText("見る", cx, ty);
      }
      // 体
      g.beginPath(); this.rrect(cx - w / 2, bodyTop, w, bodyH, Math.min(w / 2, 10));
      g.fillStyle = fill; g.fill(); g.lineWidth = s.holder ? 4 : 1.5; g.strokeStyle = s.holder ? COL.ball : edge; g.stroke();
      // 頭
      g.beginPath(); g.arc(cx, s.hp.y + headR, headR, 0, Math.PI * 2); g.fillStyle = "#f4d8bd"; g.fill(); g.lineWidth = 1.2; g.strokeStyle = "#8a6a4a"; g.stroke();
      // ラベル(胸。巨大なら画面内に収める)
      const fs = clamp(h * 0.16, 10, 26); g.font = `700 ${fs}px -apple-system, 'Hiragino Sans', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      const ly = clamp(bodyTop + bodyH * 0.3, fs, this.H - fs);
      g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.35)"; g.strokeText(this.label(s.id), cx, ly); g.fillStyle = "#fff"; g.fillText(this.label(s.id), cx, ly);
      g.textBaseline = "alphabetic";
      if (s.holder) this.ball(cx + w * 0.55, bodyTop + bodyH * 0.25, clamp(h * 0.08, 4, 22));
    }
    ball(x, y, r) { const g = this.ctx; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = COL.ball; g.fill(); g.lineWidth = Math.max(1.5, r * 0.12); g.strokeStyle = COL.ballEdge; g.stroke(); }
    chip(c) {
      const g = this.ctx, txt = c.side === "L" ? "◀ " + this.label(c.id) : this.label(c.id) + " ▶";
      g.font = "700 12px -apple-system, 'Hiragino Sans', sans-serif"; const w = g.measureText(txt).width + 14;
      const x = c.side === "L" ? 6 : this.W - 6 - w, y = HORIZON * this.H - 24 + (c.slot || 0);
      g.fillStyle = c.team === "of" ? COL.of : COL.df; this.rrect(x, y, w, 20, 6); g.fill();
      if (c.look) { g.lineWidth = 2.5; g.strokeStyle = COL.ball; g.stroke(); }
      g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(txt, x + 7, y + 10); g.textBaseline = "alphabetic";
    }
    rrect(x, y, w, h, r) { const g = this.ctx; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    drawCallout(cue) {
      const box = this.callout;
      if (!cue || !cue.say) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = (cue.look ? `<span class="tag">見る</span>` : "") + this.format(cue.say) + (cue.est ? `<span class="est">仮</span>` : "");
    }

    // ---------------------------------------------------------------- ミニマップ(上から図 + 視野)
    buildMini() {
      // ミニマップは Player が描いている #court SVG そのもの。視野の扇形と自分の強調だけ足す
      if (!this.mini) return;
      const players = this.mini.querySelector("#players");
      this.fov = el("g", { id: "fov" }, null); this.mini.insertBefore(this.fov, players);
    }
    drawMini(st) {
      if (!this.mini) return;
      const M = E.M, c = this.cam, R = 9, half = HFOV / 2, a0 = Math.atan2(c.fw.y, c.fw.x);
      let d = `M ${c.x * M} ${c.y * M}`;
      for (let i = 0; i <= 12; i++) { const a = a0 - half + (HFOV * i) / 12; d += ` L ${(c.x + R * Math.cos(a)) * M} ${(c.y + R * Math.sin(a)) * M}`; }
      this.fov.innerHTML = "";
      el("path", { d: d + " Z", fill: "rgba(255,210,63,.3)", stroke: "#e0b000", "stroke-width": 4 }, this.fov);
      el("circle", { cx: c.x * M, cy: c.y * M, r: 52, fill: "none", stroke: "#d64545", "stroke-width": 10 }, this.fov);
    }
  }
  window.PovView = PovView;
})();
