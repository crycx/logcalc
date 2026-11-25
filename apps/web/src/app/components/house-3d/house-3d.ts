import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DETAIL, extCut, type HouseModel3D, type Member3D, type MemberLayer, type PieceDetail, type Wall3D } from '@logcalc/calc-engine';
import type * as THREE_NS from 'three';
import { logProfile } from '../../helpers/log-profile';
import { roofAtFn, underRoof } from '../../helpers/roof-cut';

type Three = typeof THREE_NS;
type Controls = import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;

/** Katuse paksus joonisel (mm), kui katuselaudu pole (katus välja lülitatud arvutusest) */
const ROOF_T = 30;

/** Nähtavuse kihid: seinad (palgid, avad, tuuleliistud), katus (lauad, pärlinid, räästalauad), põrand, vundament */
export type Layer = 'walls' | 'roof' | 'cover' | 'floor' | 'foundation';
const LAYER_OF: Record<MemberLayer, Layer> = { foundation: 'foundation', floor: 'floor', roof: 'roof', trim: 'walls', cover: 'cover' };
export const LAYER_LABELS: { key: Layer; label: string }[] = [
  { key: 'walls', label: 'Seinad' },
  { key: 'roof', label: 'Katus' },
  { key: 'cover', label: 'Katusepapp' },
  { key: 'floor', label: 'Põrand' },
  { key: 'foundation', label: 'Vundament' },
];
/** muu puidu värvid materjali kaupa */
const MEMBER_COLORS: Record<string, number> = {
  vundament: 0x7d8a55,
  porandaLauad: 0xe9d3a8,
  terrassiLauad: 0xb58a5c,
  katuseLauad: 0xc9a576,
  katuseLauadOrg: 0xc9a576,
  katusepapp: 0x3b4048,
  postid: 0xd9b27a,
  kasipuud: 0xd4ad74,
  postijalg: 0x55595e,
  parlinid: 0xa8773f,
  toelaud38: 0x9a7448,
  toelaud95: 0xb08a5a,
  esiraastalaud: 0xe2cfa8,
  papikinnituslaud: 0xd4bd92,
  tuuleLiist: 0xe2cfa8,
};

/**
 * 3D vaade mootori mudelist (houseModel3d): palgid oma kohal, avad, katusepinnad. Hiirega pööramine ja suum.
 * Three.js laaditakse alles vaate avamisel (eraldi tükk, põhipakett ei kasva).
 */
@Component({
  selector: 'app-house-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatCheckboxModule],
  templateUrl: './house-3d.html',
  styleUrl: './house-3d.scss',
})
export class House3d {
  readonly model = input.required<HouseModel3D>();
  /** esiletõstetud tähis (lõikenimekirjast), nt "1LG-3"; null = kõik tavalised */
  readonly highlight = input<string | null>(null);
  /** klõps palgil: selle tähis (sama uuesti / tühi koht = null) */
  readonly pick = output<string | null>();
  protected readonly highlightCount = signal(0);

  /** nähtavad kihid */
  protected readonly layers = signal<Record<Layer, boolean>>({ walls: true, roof: true, cover: false, floor: true, foundation: true });
  protected readonly layerLabels = LAYER_LABELS;
  /** mudelis olemas olevad kihid (põrand/vundament ainult siis, kui arvutatud) */
  protected readonly presentLayers = signal<Set<Layer>>(new Set(['walls', 'roof']));

  protected setLayer(k: Layer, on: boolean): void {
    this.layers.update((l) => ({ ...l, [k]: on }));
  }
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('canvasHost');
  private three: Three | null = null;
  private renderer: THREE_NS.WebGLRenderer | null = null;
  private scene: THREE_NS.Scene | null = null;
  private camera: THREE_NS.PerspectiveCamera | null = null;
  private controls: Controls | null = null;
  private house: THREE_NS.Group | null = null;
  private roof: THREE_NS.Group | null = null;
  private groups: Partial<Record<Layer, THREE_NS.Group>> = {};
  private fitted = false;
  private resize: ResizeObserver | null = null;
  /** palgitükkide võrgud tähisega (esiletõstmine, klõpsuga valik) */
  private pieces: { mesh: THREE_NS.Mesh; edges: THREE_NS.LineSegments; mark: string; base: THREE_NS.Material }[] = [];
  private hiMat: THREE_NS.Material | null = null;
  private dimMat: THREE_NS.Material | null = null;
  private roofMat: THREE_NS.MeshStandardMaterial | null = null;
  private down: { x: number; y: number } | null = null;

  constructor() {
    afterNextRender(() => void this.init());
    effect(() => {
      const m = this.model();
      if (this.three) this.build(m);
    });
    effect(() => {
      const h = this.highlight();
      this.applyHighlight(h);
    });
    effect(() => {
      const l = this.layers();
      for (const k of Object.keys(this.groups) as Layer[]) this.groups[k]!.visible = l[k];
      this.render();
    });
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  private async init(): Promise<void> {
    try {
      const [THREE, { OrbitControls }] = await Promise.all([import('three'), import('three/examples/jsm/controls/OrbitControls.js')]);
      this.three = THREE;
      const el = this.host().nativeElement;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0xf3f5f8);
      el.appendChild(renderer.domElement);
      this.renderer = renderer;

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(-0.6, 1, 0.8);
      scene.add(sun);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(40, 1, 50, 200_000);
      this.camera = camera;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.maxPolarAngle = Math.PI * 0.495;
      controls.addEventListener('change', () => this.render());
      this.controls = controls;
      // klõps (mitte lohistamine) palgil -> tähis
      renderer.domElement.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
      renderer.domElement.addEventListener('pointerup', (e) => {
        const d = this.down;
        this.down = null;
        if (e.button !== 0 || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
        this.onClick(e);
      });
      this.hiMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x7a2e00, roughness: 0.6 });
      this.dimMat = new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.9, transparent: true, opacity: 0.14, depthWrite: false });

      this.resize = new ResizeObserver(() => this.onResize());
      this.resize.observe(el);
      this.onResize();
      this.build(this.model());
      this.loading.set(false);
    } catch {
      this.error.set('3D vaadet ei saanud avada (brauser ei toeta WebGL-i?).');
      this.loading.set(false);
    }
  }

  private onResize(): void {
    const el = this.host().nativeElement;
    if (!this.renderer || !this.camera) return;
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private render(): void {
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }

  /** Mudel -> stseen. Mootori (x, y, z) -> three (x, z, y): y üles, esisein vaataja poole. */
  private build(m: HouseModel3D): void {
    const THREE = this.three!;
    const scene = this.scene!;
    for (const g of [this.house, ...Object.values(this.groups)]) {
      if (g) {
        scene.remove(g);
        disposeGroup(g);
      }
    }
    // house = maapind (alati nähtav); kihid eraldi gruppides
    const house = new THREE.Group();
    const groups: Record<Layer, THREE_NS.Group> = {
      walls: new THREE.Group(),
      roof: new THREE.Group(),
      cover: new THREE.Group(),
      floor: new THREE.Group(),
      foundation: new THREE.Group(),
    };
    const roofGroup = groups.roof;
    this.pieces = [];

    const mat = {
      log: new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.85 }),
      // pool palki ja viilupalgid on sama puit (sama värv)
      half: new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.85 }),
      gable: new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.85 }),
      window: new THREE.MeshStandardMaterial({ color: 0x9cc6e6, transparent: true, opacity: 0.55, roughness: 0.1 }),
      door: new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.7 }),
      panel: new THREE.MeshStandardMaterial({ color: 0x6a4729, roughness: 0.75 }),
      handle: new THREE.MeshStandardMaterial({ color: 0x2f2a24, roughness: 0.35, metalness: 0.6 }),
      frame: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.6 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 1 }),
      ground: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 1 }),
    };
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a6a3c, transparent: true, opacity: 0.45 });

    for (const w of m.walls) this.addWall(THREE, groups.walls, w, mat, edgeMat);

    // muu puit: prussid, põranda-/katuselauad, pärlinid, räästa- ja toelauad, tuuleliistud
    const members = m.members ?? [];
    const memberMat = new Map<string, THREE_NS.Material>();
    for (const x of members) {
      let mm = memberMat.get(x.key);
      if (!mm) {
        mm = new THREE.MeshStandardMaterial({ color: MEMBER_COLORS[x.key] ?? 0xcfae80, roughness: 0.85 });
        memberMat.set(x.key, mm);
      }
      this.addMember(THREE, groups[LAYER_OF[x.layer]], x, mm, edgeMat);
    }
    this.presentLayers.set(new Set<Layer>(['walls', 'roof', ...members.map((x) => LAYER_OF[x.layer])]));

    // katusepinnad (kui katuselaudu pole – katus arvutusest välja lülitatud): alumine pind, paksus ülespoole
    const hasRoofBoards = members.some((x) => x.key === 'katuseLauad');
    for (const r of hasRoofBoards ? [] : m.roofs) {
      const p = r.pts.map(([x, y, z]) => new THREE.Vector3(x, z, y));
      const up = new THREE.Vector3(0, ROOF_T, 0);
      const q = p.map((v) => v.clone().add(up));
      const pos: number[] = [];
      const quad = (a: THREE_NS.Vector3, b: THREE_NS.Vector3, c: THREE_NS.Vector3, d: THREE_NS.Vector3) =>
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      quad(q[0]!, q[1]!, q[2]!, q[3]!);
      quad(p[3]!, p[2]!, p[1]!, p[0]!);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        quad(p[i]!, p[j]!, q[j]!, q[i]!);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      roofGroup.add(new THREE.Mesh(geo, mat.roof));
    }
    const vis = this.layers();
    for (const k of Object.keys(groups) as Layer[]) groups[k].visible = vis[k];

    // maapind
    const b = m.bounds;
    const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 3, size * 3), mat.ground);
    ground.rotation.x = -Math.PI / 2;
    // maapind vundamendi prusside all
    const zLow = Math.min(0, ...members.map((x) => x.c[2] - Math.abs(x.size[2]) / 2));
    ground.position.set((b.x0 + b.x1) / 2, zLow - 1, (b.y0 + b.y1) / 2);
    house.add(ground);

    scene.add(house, ...Object.values(groups));
    this.house = house;
    this.roof = roofGroup;
    this.groups = groups;
    this.roofMat = mat.roof;
    this.applyHighlight(this.highlight(), false);

    if (!this.fitted) {
      this.fit(m);
      this.fitted = true;
    }
    this.render();
  }

  private addWall(
    THREE: Three,
    group: THREE_NS.Group,
    w: Wall3D,
    mat: Record<'log' | 'half' | 'gable' | 'window' | 'door' | 'panel' | 'handle' | 'frame', THREE_NS.Material>,
    edgeMat: THREE_NS.LineBasicMaterial,
  ): void {
    const u3 = new THREE.Vector3(w.u.x, 0, w.u.y);
    const up = new THREE.Vector3(0, 1, 0);
    const n3 = new THREE.Vector3(-w.u.y, 0, w.u.x);
    const basis = new THREE.Matrix4().makeBasis(u3, up, n3);
    // ristlõike alus (faasitud palgid): kuju x = −n, y = üles, pressimine piki u (determinant +1)
    const crossBasis = new THREE.Matrix4().makeBasis(n3.clone().negate(), up, u3);
    const origin = new THREE.Vector3(w.origin.x, 0, w.origin.y);
    const t = w.thickness;
    const place = (mesh: THREE_NS.Object3D, x: number, y: number, z: number) => {
      mesh.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
      mesh.applyMatrix4(basis);
      mesh.position.add(origin);
    };
    const roofAt = w.roofLine ? roofAtFn(w.roofLine) : () => Infinity;

    // palgi otsad (Revit seinajoonis / „Facia“ detail): seina otsas üla- ja alanurk kaldu (~15 mm, ridade vahel V),
    // pikendatud palk (varikatus) 45° alumisest nurgast; avade/jätkude kohal sirge
    type End = 'log' | 'ext' | 'plain';
    const endOf = (p: Wall3D['pieces'][number], start: boolean): End => {
      const x = start ? p.x0 : p.x1;
      if (start ? p.spliceStart : p.spliceEnd) return 'plain';
      if (start ? w.buttStart && Math.abs(x) < 1 : w.buttEnd && Math.abs(x - w.length) < 1) return 'plain';
      if (start ? x < -1 : x > w.length + 1) return 'ext';
      return Math.abs(start ? x : x - w.length) < 1 ? 'log' : 'plain';
    };
    const add = (geo: THREE_NS.BufferGeometry, material: THREE_NS.Material, mark: string, basisCross: boolean) => {
      const mesh = new THREE.Mesh(geo, material);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
      for (const o of [mesh, edges]) {
        if (basisCross) {
          o.applyMatrix4(crossBasis);
          o.position.add(origin);
        } else place(o, 0, 0, 0);
        group.add(o);
      }
      this.pieces.push({ mesh, edges, mark, base: material });
    };
    /** profiiliga palk: keskosa ristlõike pressimisena, otsad seina tasandi kujuna (kaldlõiked) läbi paksuse */
    /**
     * Profiiliga palk ühe kehana: ristlõige (kaldlõige, faasid, punnid, sooned) kogu pikkuses, otstes lõikavad
     * kaldtasandid (pikkuse suunas): seina otsas üla- ja alanurk ~15 mm (V ridade vahel), varikatusel alumine nurk
     * 45°. Punnid ja sooned lõigatakse tasandiga puhtalt läbi; keskosa ja otsa vahel pole joont.
     */
    const profiled = (p: Wall3D['pieces'][number], mark: string, material: THREE_NS.Material, ring: [number, number][], topAt: (a: number) => number, det?: PieceDetail) => {
      const h = p.y1 - p.y0;
      const c = Math.min(DETAIL.endChamfer, h * 0.2);
      const d = extCut(h);
      const T0 = (topAt(-t / 2) + topAt(t / 2)) / 2;
      const T1 = (topAt(t / 2) - topAt(-t / 2)) / t;
      const cons: Cons[] = [];
      ([[endOf(p, true), p.x0, 1], [endOf(p, false), p.x1, -1]] as const).forEach(([e, x, dir]) => {
        // kohalik s = dir × (S − x) ≥ 0 otsast sisse; g = ka·a + kz·z + ks·S + k0 ≥ 0
        if (e === 'log') {
          cons.push({ ka: T1, kz: -1, ks: dir, k0: T0 - c - dir * x }); // z ≤ T(a) − c + s
          cons.push({ ka: 0, kz: 1, ks: dir, k0: -(p.y0 + c) - dir * x }); // z ≥ y0 + c − s
        } else if (e === 'ext') {
          cons.push({ ka: 0, kz: 1, ks: dir, k0: -(p.y0 + d) - dir * x }); // z ≥ y0 + d − s
        }
      });
      // sälgud (nurgaliide peal/all h/4, ukse kohal alt vajumisvaru): selles vahemikus ristlõige lühem
      const cuts: RingCut[] = (det?.notches ?? []).map((n) => ({
        s0: n.x - n.w / 2,
        s1: n.x + n.w / 2,
        h: n.side === 'top' ? { ka: 0, kz: -1, k0: p.y1 - n.depth } : { ka: 0, kz: 1, k0: -(p.y0 + n.depth) },
      }));
      add(logSolid(THREE, ring, p.x0, p.x1, cons, cuts), material, mark, true);
    };

    w.pieces.forEach((p, i) => {
      const mark = w.marks[i] ?? '';
      const material = p.kind === 'half' ? mat.half : p.kind === 'gable' ? mat.gable : mat.log;
      let geo: THREE_NS.BufferGeometry;
      // räästa lõik (mitte viilupalk): ristlõike faas; muidu katusejoon piki seina
      const rc = p.kind === 'gable' ? undefined : w.roofCross.find((s) => Math.min(p.x1, s.x1) - Math.max(p.x0, s.x0) > 1);
      const cut = !rc && w.roofLine ? underRoof(p, w.roofLine, roofAt) : null;
      if (cut === 'none') return;
      if (cut) {
        // palk katusejoone all: otsad kaldu (viilupalgid, viilu täisrea otsad nurkades); kontuuris alt sälgud
        // (nurgaliide, ukse vajumisvaru) ja pealt pärlinite pilud
        const det = w.details[i];
        const rings = cutOutline(cut, p.y0, det?.notches.filter((n) => n.side === 'bottom') ?? [], det?.slots ?? []);
        geo = new THREE.ExtrudeGeometry(
          rings.map((r) => shapeOf(THREE, r)),
          { depth: t, bevelEnabled: false },
        );
        geo.translate(0, 0, -t / 2);
      } else if (rc && p.y1 > Math.min(rc.z0 - rc.k * (t / 2), rc.z0 + rc.k * (t / 2)) + 0.5) {
        // räästaseina ülemine palk: katus toetub siseservale, välisserv lõigatud kaldu (faas)
        const zs = (s: number) => Math.max(p.y0, Math.min(p.y1, rc.z0 + rc.k * s));
        // ristlõige (a, z), a = −s (alus −n, üles, u -> parempoolne), pressitud piki seina
        // all sooned ja faasid (profiil), pealt kaldlõige
        profiled(p, mark, material, logProfile(t, p.y0, p.y1, { grooves: true, tongues: false, top: (a) => zs(-a) }), (a) => zs(-a), w.details[i]);
        return;
      } else {
        // palgi profiil (Revit „Log Profile“): peal kaks punni, all kaks soont, servad faasitud; pool palki alt sile
        profiled(p, mark, material, logProfile(t, p.y0, p.y1, { grooves: p.kind !== 'half', tongues: true }), () => p.y1, w.details[i]);
        return;
      }
      const mesh = new THREE.Mesh(geo, material);
      place(mesh, 0, 0, 0);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
      place(edges, 0, 0, 0);
      group.add(edges);
      this.pieces.push({ mesh, edges, mark, base: material });
    });

    /** kast seina koordinaatides: x, z (kõrgus) vahemikud, s = keskkoht risti seinaga, d = paksus */
    const box = (x0: number, x1: number, z0: number, z1: number, s: number, d: number, m: THREE_NS.Material, edges = false) => {
      const geo = new THREE.BoxGeometry(x1 - x0, z1 - z0, d);
      geo.translate((x0 + x1) / 2, (z0 + z1) / 2, s);
      const mesh = new THREE.Mesh(geo, m);
      place(mesh, 0, 0, 0);
      group.add(mesh);
      if (edges) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), doorEdge);
        place(e, 0, 0, 0);
        group.add(e);
      }
    };
    const doorEdge = new THREE.LineBasicMaterial({ color: 0x3b2814 });
    for (const o of w.openings) {
      const W = o.x1 - o.x0;
      const H = o.z1 - o.z0;
      if (o.kind === 'window') {
        // klaas, raam ja ristpostid
        const f = Math.min(45, W * 0.08, H * 0.08);
        const d = t * 0.5;
        box(o.x0, o.x1, o.z0, o.z1, 0, t * 0.12, mat.window);
        box(o.x0, o.x1, o.z0, o.z0 + f, 0, d, mat.frame);
        box(o.x0, o.x1, o.z1 - f, o.z1, 0, d, mat.frame);
        box(o.x0, o.x0 + f, o.z0, o.z1, 0, d, mat.frame);
        box(o.x1 - f, o.x1, o.z0, o.z1, 0, d, mat.frame);
        const mx = (o.x0 + o.x1) / 2;
        const mz = (o.z0 + o.z1) / 2;
        box(mx - f / 3, mx + f / 3, o.z0, o.z1, 0, d * 0.8, mat.frame);
        box(o.x0, o.x1, mz - f / 3, mz + f / 3, 0, d * 0.8, mat.frame);
        continue;
      }
      // uks: tiivad (topelt – kaks poolt, vahe keskel), paneelid ja käepidemed mõlemal pool
      const n = o.leaves ?? 1;
      const lw = W / n;
      const d = t * 0.35;
      const gap = 6;
      for (let i = 0; i < n; i++) {
        const lx0 = o.x0 + i * lw + (i > 0 ? gap / 2 : 0);
        const lx1 = o.x0 + (i + 1) * lw - (i < n - 1 ? gap / 2 : 0);
        box(lx0, lx1, o.z0, o.z1, 0, d, mat.door, true);
        const pw = (lx1 - lx0) * 0.6;
        const pc = (lx0 + lx1) / 2;
        for (const side of [-1, 1]) {
          const s = side * (d / 2 + 2);
          box(pc - pw / 2, pc + pw / 2, o.z0 + H * 0.08, o.z0 + H * 0.44, s, 4, mat.panel, true);
          box(pc - pw / 2, pc + pw / 2, o.z0 + H * 0.52, o.z0 + H * 0.92, s, 4, mat.panel, true);
          const handleLeft = n === 2 ? i === 1 : o.hinge === 'end';
          const hx = handleLeft ? lx0 + Math.min(70, lw * 0.12) : lx1 - Math.min(70, lw * 0.12);
          const hz = o.z0 + Math.min(1050, H * 0.52);
          box(hx - 12, hx + 12, hz - 60, hz + 60, side * (d / 2 + 12), 20, mat.handle);
        }
      }
    }
  }

  /** Muu puidu tükk: orienteeritud kast (mootori x, y, z -> three x, z, y) */
  private addMember(THREE: Three, group: THREE_NS.Group, x: Member3D, material: THREE_NS.Material, edgeMat: THREE_NS.LineBasicMaterial): void {
    const to3 = (v: readonly [number, number, number]) => new THREE.Vector3(v[0], v[2], v[1]);
    const u = to3(x.u).normalize();
    const v = to3(x.v).normalize();
    const w = new THREE.Vector3().crossVectors(u, v).normalize();
    const m4 = new THREE.Matrix4().makeBasis(u, v, w).setPosition(to3(x.c));
    // pärlin: otstes alumine nurk lõigatud (65 püsti + 45°), harjal terav tipp (Revit Details 2)
    let geo: THREE_NS.BufferGeometry;
    if (x.detail) {
      const [L, wd, ht] = x.size;
      const side = x.detail.pointedSide;
      const ring: [number, number][] = side
        ? [[-wd / 2, -ht / 2], [wd / 2, -ht / 2], [wd / 2, -ht / 2 + side], [0, ht / 2], [-wd / 2, -ht / 2 + side]]
        : [[-wd / 2, -ht / 2], [wd / 2, -ht / 2], [wd / 2, ht / 2], [-wd / 2, ht / 2]];
      const k = x.detail.cut;
      const cons: Cons[] = k > 0
        ? [
            { ka: 0, kz: 1, ks: 1, k0: -(-ht / 2 + k) + L / 2 }, // algus: z ≥ −h/2 + k − (s + L/2)
            { ka: 0, kz: 1, ks: -1, k0: -(-ht / 2 + k) + L / 2 }, // lõpp: z ≥ −h/2 + k − (L/2 − s)
          ]
        : [];
      // pärlini sälgud alt viiluseinte kohal
      const cuts: RingCut[] = x.detail.notches.map((n) => ({ s0: n.x - n.w / 2 - L / 2, s1: n.x + n.w / 2 - L / 2, h: { ka: 0, kz: 1, k0: -(-ht / 2 + n.depth) } }));
      geo = logSolid(THREE, ring, -L / 2, L / 2, cons, cuts);
      // ristlõike koordinaadid (a = v, z = u × v, s = u)
      const v3 = to3(x.v).normalize();
      const u3 = to3(x.u).normalize();
      const w3 = new THREE.Vector3().crossVectors(u3, v3).normalize();
      const m4c = new THREE.Matrix4().makeBasis(v3, w3, u3).setPosition(to3(x.c));
      const mesh = new THREE.Mesh(geo, material);
      mesh.applyMatrix4(m4c);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
      edges.applyMatrix4(m4c);
      group.add(mesh, edges);
      this.pieces.push({ mesh, edges, mark: x.mark, base: material });
      return;
    }
    geo = new THREE.BoxGeometry(x.size[0], x.size[1], x.size[2]);
    const mesh = new THREE.Mesh(geo, material);
    mesh.applyMatrix4(m4);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    edges.applyMatrix4(m4);
    group.add(mesh, edges);
    this.pieces.push({ mesh, edges, mark: x.mark, base: material });
  }

  /** Esiletõstmine: valitud tähisega tükid oranžid, ülejäänud läbipaistvad, katus peaaegu nähtamatu */
  private applyHighlight(mark: string | null, render = true): void {
    if (!this.hiMat || !this.dimMat) return;
    let n = 0;
    for (const p of this.pieces) {
      const hit = !!mark && p.mark === mark;
      if (hit) n++;
      p.mesh.material = !mark ? p.base : hit ? this.hiMat : this.dimMat;
      p.edges.visible = !mark || hit;
    }
    if (this.roofMat) {
      this.roofMat.opacity = mark ? 0.12 : 1;
      this.roofMat.depthWrite = !mark;
    }
    this.highlightCount.set(n);
    if (render) this.render();
  }

  /** Klõps: lähim palgitükk kiirel -> tähis (sama tähis uuesti või tühi koht -> tühista) */
  private onClick(e: PointerEvent): void {
    const THREE = this.three;
    if (!THREE || !this.camera || !this.renderer) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const cur = this.highlight();
    // esiletõstmise ajal on läbipaistvad tükid ka klõpsatavad (valitud tükid eelistatud)
    // ainult nähtavad kihid
    const hits = ray.intersectObjects(this.pieces.filter((p) => p.mesh.parent?.visible !== false).map((p) => p.mesh), false);
    const hit = hits.find((h) => !cur || this.pieces.find((p) => p.mesh === h.object)?.mark === cur) ?? hits[0];
    const mark = hit ? (this.pieces.find((p) => p.mesh === hit.object)?.mark ?? null) : null;
    this.pick.emit(mark && mark !== cur ? mark : null);
  }

  /** Kaamera eest-vasakult ülevalt, kogu maja kaadris */
  private fit(m: HouseModel3D): void {
    const THREE = this.three!;
    const b = m.bounds;
    const center = new THREE.Vector3((b.x0 + b.x1) / 2, (b.z1 + b.z0) / 2.5, (b.y0 + b.y1) / 2);
    const size = Math.max(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
    const dir = new THREE.Vector3(-0.55, 0.45, 1).normalize();
    this.camera!.position.copy(center.clone().add(dir.multiplyScalar(size * 2)));
    this.controls!.target.copy(center);
    this.controls!.update();
  }

  /** Vaade algasendisse */
  protected reset(): void {
    if (!this.three) return;
    this.fit(this.model());
    this.render();
  }

  private dispose(): void {
    this.resize?.disconnect();
    this.controls?.dispose();
    for (const g of [this.house, ...Object.values(this.groups)]) if (g) disposeGroup(g);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}

/** Lineaarne piirang g = ka·a + kz·z + ks·s + k0 ≥ 0 (a, z ristlõikes, s piki palki) */
interface Cons {
  ka: number;
  kz: number;
  ks: number;
  k0: number;
}

/** Sälk palgi lõigus s0…s1: ristlõikest jääb alles osa, kus ka·a + kz·z + k0 ≥ 0 */
interface RingCut {
  s0: number;
  s1: number;
  h: { ka: number; kz: number; k0: number };
}

/** Hulknurga lõikamine sirgega: jääb f ≥ 0 (f lineaarne) – Sutherland–Hodgman */
function clipPoly(poly: [number, number][], f: (p: [number, number]) => number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i]!;
    const Q = poly[(i + 1) % poly.length]!;
    const fp = f(P);
    const fq = f(Q);
    if (fp >= 0) out.push(P);
    if ((fp >= 0) !== (fq >= 0)) {
      const k = fp / (fp - fq);
      out.push([P[0] + k * (Q[0] - P[0]), P[1] + k * (Q[1] - P[1])]);
    }
  }
  return out;
}

/**
 * Prisma: ristlõige `ring` (a, z) pressitud s0 … s1, lõigatud piirangutega (pooltasandid). Küljed, lõiketahud ja
 * otsatahud ühe geomeetriana (koordinaadid nagu ExtrudeGeometry: x = a, y = z, z = s – paigutus crossBasis'ega).
 */
function logSolid(THREE: Three, ring: [number, number][], s0: number, s1: number, cons: Cons[], cuts: RingCut[] = []): THREE_NS.BufferGeometry {
  const pos: number[] = [];
  const n = ring.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += ring[i]![0] * ring[(i + 1) % n]![1] - ring[(i + 1) % n]![0] * ring[i]![1];
  const sg = Math.sign(area) || 1;
  const g = (k: Cons, a: number, z: number, s: number) => k.ka * a + k.kz * z + k.ks * s + k.k0;
  const tri = (P: number[], Q: number[], R: number[], out: number[]) => {
    const ux = Q[0]! - P[0]!, uy = Q[1]! - P[1]!, uz = Q[2]! - P[2]!;
    const vx = R[0]! - P[0]!, vy = R[1]! - P[1]!, vz = R[2]! - P[2]!;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (Math.hypot(nx, ny, nz) < 1e-9) return;
    if (nx * out[0]! + ny * out[1]! + nz * out[2]! < 0) [Q, R] = [R, Q];
    pos.push(...P, ...Q, ...R);
  };
  const dedupe = (poly: [number, number][]) =>
    poly.filter((p, i) => {
      const q = poly[(i + poly.length - 1) % poly.length]!;
      return Math.abs(p[0] - q[0]) > 1e-6 || Math.abs(p[1] - q[1]) > 1e-6;
    });
  /** tasapinnaline tahk: hulknurk (a, z) -> kolmnurgad, s = sOf(a, z) */
  const face = (poly: [number, number][], sOf: (a: number, z: number) => number, out: number[]) => {
    const pts = dedupe(poly);
    if (pts.length < 3) return;
    const faces = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []);
    for (const [i, j, k] of faces) {
      const P = pts[i]!, Q = pts[j]!, R = pts[k]!;
      tri([P[0], P[1], sOf(P[0], P[1])], [Q[0], Q[1], sOf(Q[0], Q[1])], [R[0], R[1], sOf(R[0], R[1])], out);
    }
  };
  // lõigud piki palki: sälkude vahemikes ristlõige lõigatud (pealt / alt), lõikude vahel sälgu seinad
  const lin = (h: RingCut['h']) => ([a, z]: [number, number]) => h.ka * a + h.kz * z + h.k0;
  const bps = [...new Set([s0, s1, ...cuts.flatMap((c) => [c.s0, c.s1]).filter((x) => x > s0 + 1e-6 && x < s1 - 1e-6)])].sort((x, y) => x - y);
  const segs = bps.slice(1).map((sb, i) => {
    const sa = bps[i]!;
    const active = cuts.filter((c) => c.s0 <= sa + 1e-6 && c.s1 >= sb - 1e-6);
    let r = ring.slice();
    for (const c of active) r = clipPoly(r, lin(c.h));
    return { sa, sb, active, ring: dedupe(r) };
  });
  for (const seg of segs) {
    const rg = seg.ring;
    if (rg.length < 3) continue;
    // küljed: iga ristlõike serv ribana (u ∈ 0…1, s), lõigatud piirangutega
    for (let i = 0; i < rg.length; i++) {
      const [ai, zi] = rg[i]!;
      const [aj, zj] = rg[(i + 1) % rg.length]!;
      const da = aj - ai;
      const dz = zj - zi;
      if (Math.hypot(da, dz) < 1e-9) continue;
      let poly: [number, number][] = [[0, seg.sa], [1, seg.sa], [1, seg.sb], [0, seg.sb]];
      for (const k of cons) poly = clipPoly(poly, ([u, sv]) => g(k, ai + u * da, zi + u * dz, sv));
      poly = dedupe(poly);
      if (poly.length < 3) continue;
      const P3 = poly.map(([u, sv]) => [ai + u * da, zi + u * dz, sv]);
      const out = [dz * sg, -da * sg, 0];
      for (let k = 1; k + 1 < P3.length; k++) tri(P3[0]!, P3[k]!, P3[k + 1]!, out);
    }
    // lõiketahud: piirangu tasandil, s = s_k(a, z)
    cons.forEach((k, ki) => {
      if (Math.abs(k.ks) < 1e-9) return;
      const sOf = (a: number, z: number) => -(k.ka * a + k.kz * z + k.k0) / k.ks;
      let poly = rg.slice();
      poly = clipPoly(poly, ([a, z]) => sOf(a, z) - seg.sa);
      poly = clipPoly(poly, ([a, z]) => seg.sb - sOf(a, z));
      cons.forEach((m, mi) => {
        if (mi !== ki) poly = clipPoly(poly, ([a, z]) => g(m, a, z, sOf(a, z)));
      });
      face(poly, sOf, [-k.ka, -k.kz, -k.ks]);
    });
  }
  // sälgu seinad lõikude vahel: suurema ristlõike osa, mis väiksemast puudub
  for (let i = 0; i + 1 < segs.length; i++) {
    const L = segs[i]!;
    const R = segs[i + 1]!;
    const s = L.sb;
    for (const [big, small, dir] of [[L, R, 1], [R, L, -1]] as const) {
      for (const c of small.active) {
        if (big.active.includes(c)) continue;
        let poly = big.ring.slice();
        poly = clipPoly(poly, ([a, z]) => -lin(c.h)([a, z]));
        for (const k of cons) poly = clipPoly(poly, ([a, z]) => g(k, a, z, s));
        face(poly, () => s, [0, 0, dir]);
      }
    }
  }
  // otsatahud
  for (const [seg, s, dir] of [[segs[0], s0, -1], [segs[segs.length - 1], s1, 1]] as const) {
    if (!seg) continue;
    let poly = seg.ring.slice();
    for (const k of cons) poly = clipPoly(poly, ([a, z]) => g(k, a, z, s));
    face(poly, () => s, [0, 0, dir]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Viilupalgi kontuur (seina tasand X, Z; [alumine serv vasakult paremale, siis ülemine murdjoon paremalt vasakule])
 * lõigetega: alumisse serva sälgud (ristkülikud), ülemisse serva pärlinite pilud (nelinurk [all, all, üleval, üleval]).
 * Kui pilu läbib palgi kogu kõrguses (pilu põhi alumises reas), jääb palgist kaks eraldi osa.
 */
function cutOutline(ring: [number, number][], y0: number, bottom: { x: number; w: number; depth: number }[], slots: [number, number][][]): [number, number][][] {
  let out = ring.slice();
  // alumine serv: esimene serv (out[0] -> out[1]) kõrgusel y0
  if (bottom.length && out.length >= 3 && Math.abs(out[0]![1] - y0) < 1 && Math.abs(out[1]![1] - y0) < 1) {
    const xa = out[0]![0];
    const xb = out[1]![0];
    const ins: [number, number][] = [];
    for (const n of [...bottom].sort((p, q) => p.x - q.x)) {
      const n0 = Math.max(xa, n.x - n.w / 2);
      const n1 = Math.min(xb, n.x + n.w / 2);
      if (n1 - n0 < 1) continue;
      ins.push([n0, y0], [n0, y0 + n.depth], [n1, y0 + n.depth], [n1, y0]);
    }
    out = [out[0]!, ...ins, ...out.slice(1)];
  }
  let rings: [number, number][][] = [out];
  for (const s of slots) {
    if (s.length !== 4) continue;
    const [a, b, c, d] = s as [[number, number], [number, number], [number, number], [number, number]];
    const mid: [number, number] = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4];
    /** pool sirgest p–q, kus keskpunkt ei ole (pilust väljas): ≥ 0 */
    const outside = (p: [number, number], q: [number, number]) => {
      const side = (r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const sm = Math.sign(side(mid)) || 1;
      return (r: [number, number]) => -sm * side(r);
    };
    if (Math.min(a[1], b[1]) < y0 + 1) {
      // pilu põhi selle palgi all: pilu läbib palgi kogu kõrguses -> kaks osa
      rings = rings.flatMap((r) => [clipPoly(r, outside(a, d)), clipPoly(r, outside(b, c))]).filter((r) => r.length >= 3 && Math.abs(polyArea(r)) > 1);
      continue;
    }
    rings = rings.map((r) => slotInto(r, a, b, c, d));
  }
  return rings;
}

/** Pilu (põhi palgi sees) ringi ülemisse serva: küljed a -> d ja b -> c üles kuni kontuurini, vahepealne osa välja */
function slotInto(out: [number, number][], a: [number, number], b: [number, number], c: [number, number], d: [number, number]): [number, number][] {
  const hit = (p: [number, number], q: [number, number]) => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    let best: { i: number; f: number; t: number; pt: [number, number] } | null = null;
    for (let i = 0; i < out.length; i++) {
      const e0 = out[i]!;
      const e1 = out[(i + 1) % out.length]!;
      const ex = e1[0] - e0[0];
      const ey = e1[1] - e0[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((e0[0] - p[0]) * ey - (e0[1] - p[1]) * ex) / den;
      const f = ((e0[0] - p[0]) * dy - (e0[1] - p[1]) * dx) / den;
      if (t <= 1e-6 || f < -1e-6 || f > 1 + 1e-6) continue;
      if (!best || t < best.t) best = { i, f, t, pt: [p[0] + dx * t, p[1] + dy * t] };
    }
    return best;
  };
  const h1 = hit(a, d);
  const h2 = hit(b, c);
  if (!h1 || !h2) return out;
  // ringil h1 -> h2 (lühem kaar = pilu kohal olev osa) asendatakse: h, alumised nurgad, h
  const n = out.length;
  const fwd = (h2.i + h2.f - (h1.i + h1.f) + n) % n;
  const [first, second, c1, c2] = fwd <= n / 2 ? [h1, h2, a, b] : [h2, h1, b, a];
  const next: [number, number][] = [second.pt];
  let k = (second.i + 1) % n;
  while (k !== (first.i + 1) % n) {
    next.push(out[k]!);
    k = (k + 1) % n;
  }
  next.push(first.pt, c1, c2);
  return next;
}

function polyArea(r: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i]!;
    const [x1, y1] = r[(i + 1) % r.length]!;
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

function shapeOf(THREE: Three, pts: [number, number][]): THREE_NS.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}

function disposeGroup(g: THREE_NS.Object3D): void {
  g.traverse((o) => {
    const m = o as THREE_NS.Mesh;
    m.geometry?.dispose();
  });
}
