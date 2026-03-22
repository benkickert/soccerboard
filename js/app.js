/* ============================================================
   11v11 Soccer Tactics Board
   - Split HTML, CSS, and JS for easier maintenance.
   - Updated starting layouts and mobile control behavior.
   - Added a controls toggle and responsive pitch orientation.
   ============================================================ */

const PITCH_LEN = 105;
const PITCH_WID = 68;
const GOAL_MARGIN = 1;   // +/-1m horizontally
const TOUCH_MARGIN = 3;  // +/-3m vertically
const MID_X = PITCH_LEN/2;           // 52.5
const CIRCLE_R = 9.15;               // 10 yards
const GK_X_LEFT  = 6;
const GK_X_RIGHT = PITCH_LEN - GK_X_LEFT;
let isPitchPortrait = false;

const COLOR_MAP = {
  blue:   {fill:'#1e88e5'},
  red:    {fill:'#e53935'},
  black:  {fill:'#212121'},
  white:  {fill:'#ffffff'},
  yellow: {fill:'#ffeb3b'}
};
function textColorFor(hex){
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16)/255;
  const g = parseInt(c.slice(2,4),16)/255;
  const b = parseInt(c.slice(4,6),16)/255;
  const l = 0.2126*r + 0.7152*g + 0.0722*b;
  return (l>0.6) ? '#111' : '#fff';
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function clampX(x){ return clamp(x, -GOAL_MARGIN, PITCH_LEN + GOAL_MARGIN); }
function clampY(y){ return clamp(y, -TOUCH_MARGIN, PITCH_WID + TOUCH_MARGIN); }
function lerp(a,b,t){ return a + (b-a)*t; }

/* ---------- Base lateral anchors (Y in [0,1]) ---------- */
const Y = {
  VERY_WIDE_TOP: 0.14, VERY_WIDE_BOT: 0.86,
  WIDE_TOP: 0.18,      WIDE_BOT: 0.82,
  EQ1: 0.16, EQ2: 0.38, EQ3: 0.62, EQ4: 0.84,
  MID_TOP: 0.28, MID_BOT: 0.72,
  CENTRE: 0.50
};

/* ---------- Formation templates ---------- */
const FORMATIONS = {
  '4-4-2 (Flat)': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.EQ1},
    {label:'LCB', sideId:'LCB', t:0.00, y:Y.EQ2},
    {label:'RCB', sideId:'RCB', t:0.00, y:Y.EQ3},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.EQ4},
    {label:'LW',  sideId:'LW',  t:0.52, y:0.24},
    {label:'LCM', sideId:'LCM', t:0.52, y:0.42},
    {label:'RCM', sideId:'RCM', t:0.52, y:0.58},
    {label:'RW',  sideId:'RW',  t:0.52, y:0.76},
    {label:'LS',  sideId:'LS',  t:1.00, y:0.40},
    {label:'RS',  sideId:'RS',  t:1.00, y:0.60},
  ],
  '4-4-2 (Diamond)': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.EQ1},
    {label:'LCB', sideId:'LCB', t:0.00, y:Y.EQ2},
    {label:'RCB', sideId:'RCB', t:0.00, y:Y.EQ3},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.EQ4},
    {label:'CDM', sideId:'CDM', t:0.36, y:Y.CENTRE},
    {label:'LCM', sideId:'LCM', t:0.55, y:0.36},
    {label:'RCM', sideId:'RCM', t:0.55, y:0.64},
    {label:'CAM', sideId:'CAM', t:0.70, y:Y.CENTRE},
    {label:'LS',  sideId:'LS',  t:1.00, y:0.40},
    {label:'RS',  sideId:'RS',  t:1.00, y:0.60},
  ],
  '4-3-3': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.WIDE_TOP},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.40},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.60},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.WIDE_BOT},
    {label:'LM',  sideId:'LM',  t:0.56, y:0.34},
    {label:'CM',  sideId:'CM',  t:0.46, y:Y.CENTRE},
    {label:'RM',  sideId:'RM',  t:0.56, y:0.66},
    {label:'LW',  sideId:'LW',  t:1.00, y:0.22},
    {label:'ST',  sideId:'ST',  t:1.00, y:Y.CENTRE},
    {label:'RW',  sideId:'RW',  t:1.00, y:0.78},
  ],
  '4-2-3-1': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.WIDE_TOP},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.40},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.60},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.WIDE_BOT},
    {label:'CDM', sideId:'LCDM',t:0.42, y:0.44},
    {label:'CDM', sideId:'RCDM',t:0.42, y:0.56},
    {label:'LW',  sideId:'LW',  t:0.71, y:0.24},
    {label:'CAM', sideId:'CAM', t:0.71, y:Y.CENTRE},
    {label:'RW',  sideId:'RW',  t:0.71, y:0.76},
    {label:'ST',  sideId:'ST',  t:1.00, y:Y.CENTRE},
  ],
  '3-5-2': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.34},
    {label:'CB',  sideId:'CB',  t:0.00, y:Y.CENTRE},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.66},
    {label:'LWB', sideId:'LWB', t:0.56, y:Y.WIDE_TOP},
    {label:'RWB', sideId:'RWB', t:0.56, y:Y.WIDE_BOT},
    {label:'LCM', sideId:'LCM', t:0.60, y:0.40},
    {label:'CM',  sideId:'CM',  t:0.52, y:Y.CENTRE},
    {label:'RCM', sideId:'RCM', t:0.60, y:0.60},
    {label:'LS',  sideId:'LS',  t:1.00, y:0.40},
    {label:'RS',  sideId:'RS',  t:1.00, y:0.60},
  ],
  '3-4-3 (Flat)': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.34},
    {label:'CB',  sideId:'CB',  t:0.00, y:Y.CENTRE},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.66},
    {label:'LWB', sideId:'LWB', t:0.58, y:Y.WIDE_TOP},
    {label:'LCM', sideId:'LCM', t:0.54, y:0.42},
    {label:'RCM', sideId:'RCM', t:0.54, y:0.58},
    {label:'RWB', sideId:'RWB', t:0.58, y:Y.WIDE_BOT},
    {label:'LW',  sideId:'LW',  t:1.00, y:0.24},
    {label:'ST',  sideId:'ST',  t:1.00, y:Y.CENTRE},
    {label:'RW',  sideId:'RW',  t:1.00, y:0.76},
  ],
  '3-4-3 (Diamond)': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.34},
    {label:'CB',  sideId:'CB',  t:0.00, y:Y.CENTRE},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.66},
    {label:'CDM', sideId:'CDM', t:0.40, y:Y.CENTRE},
    {label:'LCM', sideId:'LCM', t:0.57, y:0.36},
    {label:'RCM', sideId:'RCM', t:0.57, y:0.64},
    {label:'CAM', sideId:'CAM', t:0.74, y:Y.CENTRE},
    {label:'LW',  sideId:'LW',  t:1.00, y:0.22},
    {label:'ST',  sideId:'ST',  t:1.00, y:Y.CENTRE},
    {label:'RW',  sideId:'RW',  t:1.00, y:0.78},
  ],
  '4-1-3-2': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.WIDE_TOP},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.40},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.60},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.WIDE_BOT},
    {label:'CDM', sideId:'CDM', t:0.30, y:Y.CENTRE},
    {label:'LM',  sideId:'LM',  t:0.60, y:0.32},
    {label:'CAM', sideId:'CAM', t:0.60, y:Y.CENTRE},
    {label:'RM',  sideId:'RM',  t:0.60, y:0.68},
    {label:'LS',  sideId:'LS',  t:1.00, y:0.42},
    {label:'RS',  sideId:'RS',  t:1.00, y:0.58},
  ],
  '4-3-2-1': [
    {label:'GK', sideId:'GK', t:null, y:Y.CENTRE},
    {label:'LB',  sideId:'LB',  t:0.00, y:Y.WIDE_TOP},
    {label:'LCB', sideId:'LCB', t:0.00, y:0.40},
    {label:'RCB', sideId:'RCB', t:0.00, y:0.60},
    {label:'RB',  sideId:'RB',  t:0.00, y:Y.WIDE_BOT},
    {label:'LCM', sideId:'LCM', t:0.50, y:0.34},
    {label:'CDM', sideId:'CDM', t:0.38, y:Y.CENTRE},
    {label:'RCM', sideId:'RCM', t:0.50, y:0.66},
    {label:'LAM', sideId:'LAM', t:0.72, y:0.45},
    {label:'RAM', sideId:'RAM', t:0.72, y:0.55},
    {label:'ST',  sideId:'ST',  t:1.00, y:Y.CENTRE},
  ],
};

/* ---------- Role grouping for visibility ordering ---------- */
const GROUPS = {
  GK: new Set(['GK']),
  BACK: new Set(['LB','LCB','CB','RCB','RB','LWB','RWB']),
  MID: new Set(['CDM','CM','LCM','RCM','CAM','LM','RM','LAM','RAM']),
  FWD: new Set(['LW','RW','ST','CF','LS','RS'])
};
function groupIndexForRole(role){
  if(GROUPS.GK.has(role))  return 0;
  if(GROUPS.BACK.has(role))return 1;
  if(GROUPS.MID.has(role)) return 2;
  if(GROUPS.FWD.has(role)) return 3;
  return 4;
}

/* ---------- Team model ---------- */
class Team {
  constructor(opts){
    this.id = opts.id;                // 'left' | 'right'
    this.attack = opts.attack;        // +1 (right) | -1 (left)
    this.layer = opts.layer;
    this.colorKey = opts.colorKey;
    this.color = COLOR_MAP[this.colorKey].fill;
    this.textColor = textColorFor(this.color);
    this.formationKey = opts.formationKey;

    this.depthVal = 0.5;              // [0,1]
    this.widthVal = 0.5;              // [0,1]
    this.positionVal = 0.5;           // [0,1] (Away mirrored in mapping)
    this.anchorU = 25;                // last defender anchor from own goal line
    this.gkX = (this.attack===+1) ? GK_X_LEFT : GK_X_RIGHT;

    this.players = [];
    this.visUI = {grid: null, showAllBtn:null, hideAllBtn:null, cbMap:{}};
    this.buildPlayers();
  }

  setColor(key){
    this.colorKey = key;
    this.color = COLOR_MAP[key].fill;
    this.textColor = textColorFor(this.color);
    for(const p of this.players){
      p.circ.setAttribute('fill', this.color);
      p.text.setAttribute('fill', this.textColor);
    }
  }
  setFormation(key){
    this.formationKey = key;
    this.buildPlayers();
    this.updatePositions();
    if(this.visUI.grid){
      this.players.forEach(p=>{ p.visible = true; });
      this.rebuildVisibilityUI();
    }
  }

  uToX(u){ return (this.attack===+1) ? u : (PITCH_LEN - u); }

  spanForDepth(e){
    const toHalf = MID_X - this.anchorU;
    const toGoal = PITCH_LEN - this.anchorU;
    if(e <= 0.5) return 2*e*toHalf;
    return toHalf + 2*(e-0.5)*(toGoal - toHalf);
  }
  deltaRange(span){
    return {min: -this.anchorU, max: PITCH_LEN - (this.anchorU + span)};
  }
  deltaUForPosition(p, span){
    const {min, max} = this.deltaRange(span);
    const t = (this.attack===+1) ? p : (1 - p); // mirror for Away
    return lerp(min, max, t);
  }

  widthScale(w){
    if(w <= 0.5) return w/0.5;              // [0..1]
    return 1 + ((w-0.5)/0.5) * 0.3;         // (1..1.3]
  }

  computeFontSize(label){
    const n = label.length;
    if(n <= 2) return 1.45;
    if(n === 3) return 1.20;
    return 1.10;
  }

  buildPlayers(){
    while(this.layer.firstChild) this.layer.removeChild(this.layer.firstChild);
    this.players = [];
    const roles = FORMATIONS[this.formationKey];

    for(const r of roles){
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
      const txt  = document.createElementNS('http://www.w3.org/2000/svg','text');
      circ.setAttribute('r', 1.9);
      circ.setAttribute('fill', this.color);
      circ.setAttribute('stroke', '#000');
      circ.setAttribute('stroke-width','0.18');
      circ.style.cursor = 'grab';
      txt.setAttribute('font-size', String(this.computeFontSize(r.label)));
      txt.setAttribute('font-weight','800');
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('dominant-baseline','central');
      txt.setAttribute('fill', this.textColor);
      txt.textContent = r.label;

      g.appendChild(circ);
      g.appendChild(txt);
      this.layer.appendChild(g);

      const p = {
        team: this,
        role: r.label, sideId: r.sideId, t: r.t, yNorm: r.y,
        g, circ, text: txt,
        x: 0, y: 0,
        dragDX: 0, dragDY: 0,
        dragged: false,
        lastTapAt: 0,
        hasBall: false,
        visible: true
      };
      this.attachDragHandlers(p);
      this.players.push(p);
    }
  }

  handlePlayerDoubleAction(p){
    if(ball.attachedTo === p){
      detachBallWithSideDrop(p);
    }else{
      this.setPlayerVisibility(p, false);
    }
  }

  computeLayout(){
    const span = this.spanForDepth(this.depthVal);
    const deltaU = this.deltaUForPosition(this.positionVal, span);
    const s = this.widthScale(this.widthVal);

    const pts = [];
    for(const pl of this.players){
      let x, y;
      // Away team is mirrored so left/right roles stay correct from their perspective.
      const baseYNorm = (this.attack===+1) ? pl.yNorm : (1 - pl.yNorm);
      if(pl.t === null){
        x = this.gkX;
        y = clampY(baseYNorm * PITCH_WID);
      } else {
        const u = this.anchorU + pl.t * span + deltaU;
        x = this.uToX(clamp(u, 0, PITCH_LEN));   // base layout stays within the lines
        const yNorm = 0.5 + (baseYNorm - 0.5) * s;
        y = clampY(yNorm * PITCH_WID);
      }
      pts.push({pl, x, y});
    }
    return pts;
  }

  updatePositions(){
    const layout = this.computeLayout();
    for(const item of layout){
      const pl = item.pl;
      if(!pl.visible){ pl.g.style.display='none'; continue; }
      pl.g.style.display='block';

      const x = item.x + pl.dragDX;
      const y = item.y + pl.dragDY;
      pl.x = clampX(x);
      pl.y = clampY(y);
      pl.circ.setAttribute('cx', pl.x);
      pl.circ.setAttribute('cy', pl.y);
      pl.text.setAttribute('x', pl.x);
      pl.text.setAttribute('y', pl.y + 0.03);
      if(isPitchPortrait){
        // Counter-rotate labels so text remains readable in portrait view.
        pl.text.setAttribute('transform', `rotate(-90 ${pl.x} ${pl.y})`);
      }else{
        pl.text.removeAttribute('transform');
      }

      if(pl.hasBall && ball.attachedTo === pl){
        positionBallAtPlayer(pl);
      }
    }
  }

  setPlayerVisibility(pl, vis){
    pl.visible = !!vis;
    pl.g.style.display = vis ? 'block' : 'none';
    if(!vis && pl.hasBall) detachBall();
    const cb = this.visUI.cbMap[pl.sideId];
    if(cb) cb.checked = vis;
  }

  showAllPlayers(){ for(const p of this.players) this.setPlayerVisibility(p, true); }
  hideAllPlayers(){ for(const p of this.players) this.setPlayerVisibility(p, false); }

  attachDragHandlers(pl){
    const onDown = (ev)=>{
      ev.preventDefault();
      pl.g.setPointerCapture(ev.pointerId);
      pl.g.style.cursor = 'grabbing';
      let start = svgPointFromEvent(ev);
      const startDX = pl.dragDX, startDY = pl.dragDY;
      let moved = false;
      const move = (e)=>{
        const pt = svgPointFromEvent(e);
        if(!moved && Math.hypot(pt.x - start.x, pt.y - start.y) > 0.2) moved = true;
        pl.dragDX = startDX + (pt.x - start.x);
        pl.dragDY = startDY + (pt.y - start.y);
        const layout = this.computeLayout().find(it=>it.pl===pl);
        let nx = clampX(layout.x + pl.dragDX);
        let ny = clampY(layout.y + pl.dragDY);
        pl.dragDX = nx - layout.x;
        pl.dragDY = ny - layout.y;
        pl.dragged = true;
        this.updatePositions();
      };
      const cleanup = ()=> {
        pl.g.style.cursor = 'grab';
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', cancel);
      };
      const up = (e)=>{
        if(pl.g.hasPointerCapture(e.pointerId)) pl.g.releasePointerCapture(e.pointerId);
        cleanup();
        const dx = pl.x - ball.x, dy = pl.y - ball.y;
        if(dx*dx + dy*dy <= (1.9*1.9)) attachBall(pl);
        if(pl.hasBall && ball.attachedTo === pl) positionBallAtPlayer(pl);

        // Tablet-friendly double-tap / desktop double-click equivalent.
        if(!moved){
          const now = Date.now();
          if(now - pl.lastTapAt <= 320){
            pl.lastTapAt = 0;
            this.handlePlayerDoubleAction(pl);
          }else{
            pl.lastTapAt = now;
          }
        }else{
          pl.lastTapAt = 0;
        }
      };
      const cancel = (e)=>{
        if(pl.g.hasPointerCapture(e.pointerId)) pl.g.releasePointerCapture(e.pointerId);
        cleanup();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', cancel);
    };
    pl.g.addEventListener('pointerdown', onDown);
  }

  /* ----- Visibility UI ----- */
  connectVisibilityUI(gridEl, showAllBtn, hideAllBtn){
    this.visUI = {grid: gridEl, showAllBtn, hideAllBtn, cbMap:{}};
    this.rebuildVisibilityUI();
    showAllBtn.addEventListener('click', ()=> this.showAllPlayers());
    hideAllBtn.addEventListener('click', ()=> this.hideAllPlayers());
  }

  rebuildVisibilityUI(){
    const grid = this.visUI.grid;
    if(!grid) return;
    grid.innerHTML = '';
    this.visUI.cbMap = {};

    // Order: GK; backs L->R; mids L->R; forwards L->R
    const ordered = this.players.slice().sort((a,b)=>{
      const ga = groupIndexForRole(a.role), gb = groupIndexForRole(b.role);
      if(ga !== gb) return ga - gb;
      if(a.yNorm !== b.yNorm) return a.yNorm - b.yNorm;
      return a.role.localeCompare(b.role);
    });

    // Column-major fill: set rows then append in order
    const rows = Math.ceil(ordered.length / 3);
    grid.style.gridTemplateRows = `repeat(${rows}, auto)`;

    const labelCounts = {};
    for(const p of ordered){
      const label = p.role;
      labelCounts[label] = (labelCounts[label]||0) + 1;
      const suffix = (labelCounts[label] > 1) ? ` (${labelCounts[label]})` : '';
      const id = `${this.id}-vis-${p.sideId}`;

      const item = document.createElement('div');
      item.className = 'vis-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.checked = p.visible;
      cb.dataset.sideId = p.sideId;
      const lab = document.createElement('label');
      lab.setAttribute('for', id);
      lab.textContent = label + suffix;

      cb.addEventListener('change', (e)=> this.setPlayerVisibility(p, e.target.checked));

      item.appendChild(cb);
      item.appendChild(lab);
      grid.appendChild(item);
      this.visUI.cbMap[p.sideId] = cb;
    }
  }

  resetDraggedToSliders(){
    for(const pl of this.players){
      if(pl.dragged){ pl.dragDX=0; pl.dragDY=0; pl.dragged=false; }
    }
    this.updatePositions();
  }

  resetPosExpToKickoffOnly(){
    // Reset pos/exp + drags; preserve formation & color
    for(const pl of this.players){ pl.dragDX=0; pl.dragDY=0; pl.dragged=false; }
    this.depthVal = 0.5;
    this.widthVal = 0.5;
    this.positionVal = 0.5;
    this.anchorU = 25;
    this.updatePositions();
  }
}

/* ---------- Ball ---------- */
const ball = {
  layer: document.getElementById('ballLayer'),
  g:null, circ:null, halo:null,
  x: MID_X, y: PITCH_WID/2, r: 1.1,
  attachedTo: null,
  haloActive: true,
  draggedOnce: false
};
function buildBall(){
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  const halo = document.createElementNS('http://www.w3.org/2000/svg','circle');
  halo.setAttribute('r', ball.r + 0.45);
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', '#ffb300');
  halo.setAttribute('stroke-width', '0.20');
  halo.setAttribute('opacity', '0.85');
  halo.style.pointerEvents = 'none';

  const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r', ball.r);
  c.setAttribute('fill', '#ffffff');
  c.setAttribute('stroke', '#111111');
  c.setAttribute('stroke-width','0.35');
  c.setAttribute('filter','url(#drop)');
  c.style.cursor='grab';

  g.appendChild(halo);
  g.appendChild(c);
  ball.layer.appendChild(g);
  ball.g=g; ball.circ=c; ball.halo=halo;
  positionBall(ball.x, ball.y);
  setBallHaloVisible(true);

  const onDown = (ev)=>{
    ev.preventDefault();
    g.setPointerCapture(ev.pointerId);
    g.style.cursor='grabbing';
    const start = svgPointFromEvent(ev);
    const sx=ball.x, sy=ball.y;
    let moved = false;

    const move = (e)=>{
      const pt = svgPointFromEvent(e);
      let nx = clampX(sx + (pt.x-start.x));
      let ny = clampY(sy + (pt.y-start.y));
      if(Math.hypot(nx - sx, ny - sy) > 0.2) moved = true;
      positionBall(nx, ny);
      if(ball.attachedTo) detachBall();
    };
    const cleanup = ()=>{
      g.style.cursor='grab';
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
    const up = (e)=>{
      if(g.hasPointerCapture(e.pointerId)) g.releasePointerCapture(e.pointerId);
      cleanup();
      const hit = hitTestPlayers(ball.x, ball.y);
      if(hit) attachBall(hit);
      if(moved && !ball.draggedOnce){
        ball.draggedOnce = true;
        setBallHaloVisible(false);
      }
    };
    const cancel = (e)=>{
      if(g.hasPointerCapture(e.pointerId)) g.releasePointerCapture(e.pointerId);
      cleanup();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
  };
  g.addEventListener('pointerdown', onDown);
  g.addEventListener('dblclick', ()=> detachBall());
}
function setBallHaloVisible(on){
  ball.haloActive = on;
  ball.halo.style.display = on ? 'block' : 'none';
}
function positionBall(x,y){
  ball.x = clampX(x);
  ball.y = clampY(y);
  ball.circ.setAttribute('cx', ball.x);
  ball.circ.setAttribute('cy', ball.y);
  ball.halo.setAttribute('cx', ball.x);
  ball.halo.setAttribute('cy', ball.y);
}
function attackSideOffsetFor(team){ return (team.attack===+1) ? +2.3 : -2.3; }
function safeDropOffsetFor(team){
  const playerR = 1.9, ballR = 1.1, margin = 0.25;
  const dist = playerR + ballR + margin; // 3.25m
  return (team.attack===+1) ? +dist : -dist;
}
function positionBallAtPlayer(pl){ positionBall(pl.x + attackSideOffsetFor(pl.team), pl.y); }
function attachBall(pl){
  detachBall();
  ball.attachedTo = pl;
  pl.hasBall = true;
  positionBallAtPlayer(pl);
  if(!ball.draggedOnce){
    ball.draggedOnce = true;
    setBallHaloVisible(false);
  }
}
function detachBall(){
  if(ball.attachedTo){
    ball.attachedTo.hasBall = false;
    ball.attachedTo = null;
  }
}
function detachBallWithSideDrop(pl){
  if(ball.attachedTo === pl){
    pl.hasBall = false;
    ball.attachedTo = null;
    positionBall(pl.x + safeDropOffsetFor(pl.team), pl.y);
  }
}
function hitTestPlayers(x,y){
  const all = teams.left.players.concat(teams.right.players);
  for(const p of all){
    if(!p.visible) continue;
    const dx = p.x - x, dy = p.y - y;
    if(dx*dx + dy*dy <= (1.9*1.9)) return p;
  }
  return null;
}

/* ---------- SVG helpers ---------- */
const svg = document.getElementById('pitch');
const scene = document.getElementById('scene');
const canvasWrap = document.querySelector('.canvas-wrap');
function svgPointFromEvent(ev){
  const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(scene.getScreenCTM().inverse());
}
function updatePitchOrientation(){
  if(!canvasWrap || !svg || !scene) return;
  const rect = canvasWrap.getBoundingClientRect();
  if(rect.width <= 0 || rect.height <= 0) return;

  const areaRatio = rect.width / rect.height;
  const landscapeRatio = PITCH_LEN / PITCH_WID; // 105/68
  const portraitRatio = PITCH_WID / PITCH_LEN;  // 68/105

  // Compare relative distance to both target ratios.
  const distLandscape = Math.abs(Math.log(areaRatio / landscapeRatio));
  const distPortrait = Math.abs(Math.log(areaRatio / portraitRatio));
  const portrait = distPortrait < distLandscape;

  const changed = portrait !== isPitchPortrait;
  isPitchPortrait = portrait;
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  if(portrait){
    svg.setAttribute('viewBox', '0 0 68 105');
    scene.setAttribute('transform', 'matrix(0 1 -1 0 68 0)');
  }else{
    svg.setAttribute('viewBox', '0 0 105 68');
    scene.removeAttribute('transform');
  }
  if(changed && typeof teams !== 'undefined'){
    teams.left.updatePositions();
    teams.right.updatePositions();
  }
}

/* ---------- App state ---------- */
const layers = { left: document.getElementById('teamLeftLayer'), right: document.getElementById('teamRightLayer') };
const teams = {
  left:  new Team({id:'left',  attack:+1, layer: layers.left,  colorKey:'red',  formationKey:'4-4-2 (Flat)'}), // Home = Red
  right: new Team({id:'right', attack:-1, layer: layers.right, colorKey:'blue', formationKey:'4-3-3'})  // Away = Blue
};
buildBall();

/* ---------- Controls ---------- */
const leftFormationSel  = document.getElementById('leftFormation');
const rightFormationSel = document.getElementById('rightFormation');
const leftColorSel      = document.getElementById('leftColor');
const rightColorSel     = document.getElementById('rightColor');
const leftExpand        = document.getElementById('leftExpand');
const rightExpand       = document.getElementById('rightExpand');
const leftWidth         = document.getElementById('leftWidth');
const rightWidth        = document.getElementById('rightWidth');
const leftPosition      = document.getElementById('leftPosition');
const rightPosition     = document.getElementById('rightPosition');
const btnResetDragged   = document.getElementById('btnResetDragged');
const btnResetAll       = document.getElementById('btnResetAll');
const focusModeToggle   = document.getElementById('focusModeToggle');
const instructionsPanel = document.getElementById('instructionsPanel');
const btnCloseInstructions = document.getElementById('btnCloseInstructions');
const licenseModal = document.getElementById('licenseModal');
const licenseInfoButton = document.getElementById('licenseInfoButton');
const closeLicenseModal = document.getElementById('closeLicenseModal');

const leftVisGrid  = document.getElementById('leftVisGrid');
const rightVisGrid = document.getElementById('rightVisGrid');
const leftShowAll  = document.getElementById('leftShowAll');
const leftHideAll  = document.getElementById('leftHideAll');
const rightShowAll = document.getElementById('rightShowAll');
const rightHideAll = document.getElementById('rightHideAll');

function setInstructionsVisible(visible){
  if(!instructionsPanel) return;
  instructionsPanel.style.display = visible ? '' : 'none';
}
if(instructionsPanel) setInstructionsVisible(true);
if(btnCloseInstructions){
  btnCloseInstructions.addEventListener('click', ()=> setInstructionsVisible(false));
}

function setLicenseModalVisible(visible){
  if(!licenseModal) return;
  licenseModal.hidden = !visible;
  document.body.classList.toggle('modal-open', visible);
  if(visible){
    closeLicenseModal?.focus();
  }else{
    licenseInfoButton?.focus();
  }
}
if(licenseInfoButton && licenseModal){
  licenseInfoButton.addEventListener('click', ()=> setLicenseModalVisible(true));
}
if(closeLicenseModal){
  closeLicenseModal.addEventListener('click', ()=> setLicenseModalVisible(false));
}
if(licenseModal){
  licenseModal.addEventListener('click', (event)=>{
    if(event.target === licenseModal) setLicenseModalVisible(false);
  });
}
document.addEventListener('keydown', (event)=>{
  if(event.key === 'Escape' && licenseModal && !licenseModal.hidden){
    setLicenseModalVisible(false);
  }
});

function setFocusMode(on){
  const controlsVisible = !!on;
  document.body.classList.toggle('focus-mode', !controlsVisible);
  if(focusModeToggle) focusModeToggle.checked = controlsVisible;
  updatePitchOrientation();
}
if(focusModeToggle){
  setFocusMode(true);
  focusModeToggle.addEventListener('change', e=> setFocusMode(e.target.checked));
}

function populateFormationOptions(){
  const keys = Object.keys(FORMATIONS);
  for(const k of keys){
    const o1 = document.createElement('option'); o1.value=k; o1.textContent=k; leftFormationSel.appendChild(o1);
    const o2 = document.createElement('option'); o2.value=k; o2.textContent=k; rightFormationSel.appendChild(o2);
  }
  leftFormationSel.value = teams.left.formationKey;
  rightFormationSel.value = teams.right.formationKey;
}
populateFormationOptions();

function initControls(){
  // Colors
  leftColorSel.value = teams.left.colorKey;
  rightColorSel.value = teams.right.colorKey;
  leftColorSel.addEventListener('change', e=>{ teams.left.setColor(e.target.value); });
  rightColorSel.addEventListener('change', e=>{ teams.right.setColor(e.target.value); });

  // Formations
  leftFormationSel.addEventListener('change', e=>{ teams.left.setFormation(e.target.value); });
  rightFormationSel.addEventListener('change', e=>{ teams.right.setFormation(e.target.value); });

  // Sliders
  leftExpand.addEventListener('input', e=>{ teams.left.depthVal = parseFloat(e.target.value); teams.left.updatePositions(); });
  rightExpand.addEventListener('input', e=>{ teams.right.depthVal = parseFloat(e.target.value); teams.right.updatePositions(); });

  leftWidth.addEventListener('input', e=>{ teams.left.widthVal = parseFloat(e.target.value); teams.left.updatePositions(); });
  rightWidth.addEventListener('input', e=>{ teams.right.widthVal = parseFloat(e.target.value); teams.right.updatePositions(); });

  leftPosition.addEventListener('input', e=>{ teams.left.positionVal = parseFloat(e.target.value); teams.left.updatePositions(); });
  rightPosition.addEventListener('input', e=>{ teams.right.positionVal = parseFloat(e.target.value); teams.right.updatePositions(); });

  // Visibility UIs
  teams.left.connectVisibilityUI(leftVisGrid, leftShowAll, leftHideAll);
  teams.right.connectVisibilityUI(rightVisGrid, rightShowAll, rightHideAll);

  // Resets
  btnResetDragged.addEventListener('click', ()=>{
    teams.left.resetDraggedToSliders();
    teams.right.resetDraggedToSliders();
  });
  btnResetAll.addEventListener('click', ()=> resetAllToKickoff() );
}
initControls();

/* ---------- Kickoff layout helpers ---------- */
function setPositionForFrontlineAtCircleEdge(team, posSliderEl){
  const targetX = (team.attack===+1) ? (MID_X - CIRCLE_R) : (MID_X + CIRCLE_R);
  const span = team.spanForDepth(team.depthVal);
  const {min, max} = team.deltaRange(span);
  const uFrontTarget = (team.attack===+1) ? targetX : (PITCH_LEN - targetX);
  const desiredDelta = clamp(uFrontTarget - (team.anchorU + span), min, max);
  const t = (desiredDelta - min) / (max - min);
  const p = (team.attack===+1) ? t : (1 - t);
  team.positionVal = clamp(p, 0, 1);
  posSliderEl.value = String(team.positionVal);
  team.updatePositions();
}

/* ---------- Reset All: pos/exp + drags + ball; ALSO re-show hidden players ---------- */
function resetAllToKickoff(){
  // Reset pos/exp & drag offsets
  teams.left.resetPosExpToKickoffOnly();
  teams.right.resetPosExpToKickoffOnly();

  leftExpand.value = rightExpand.value = 0.5;
  leftWidth.value  = rightWidth.value  = 0.5;
  leftPosition.value = rightPosition.value = 0.5;

  // Ball back to center; halo visible again
  detachBall(); positionBall(MID_X, PITCH_WID/2);
  ball.draggedOnce = false; setBallHaloVisible(true);

  // Front lines to edge of center circle for both teams
  setPositionForFrontlineAtCircleEdge(teams.left, leftPosition);
  setPositionForFrontlineAtCircleEdge(teams.right, rightPosition);

  // Re-show ALL players & sync checkboxes
  teams.left.showAllPlayers();
  teams.right.showAllPlayers();
  if(teams.left.visUI.grid)  teams.left.rebuildVisibilityUI();
  if(teams.right.visUI.grid) teams.right.rebuildVisibilityUI();
}
resetAllToKickoff();

updatePitchOrientation();
if(typeof ResizeObserver !== 'undefined' && canvasWrap){
  const ro = new ResizeObserver(()=> updatePitchOrientation());
  ro.observe(canvasWrap);
}
window.addEventListener('resize', ()=> updatePitchOrientation());
