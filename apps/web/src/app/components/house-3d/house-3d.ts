import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { HouseModel3D, Wall3D } from '@logcalc/calc-engine';
import type * as THREE_NS from 'three';
import { roofAtFn, underRoof } from '../../helpers/roof-cut';

type Three = typeof THREE_NS;
type Controls = import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;

/** Katuse paksus joonisel (mm): katus palkide peal, viilupalgid lõigatud katuse alumise pinnani */
const ROOF_T = 30;

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

  protected readonly showRoof = signal(true);
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
  private fitted = false;
  private resize: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => void this.init());
    effect(() => {
      const m = this.model();
      if (this.three) this.build(m);
    });
    effect(() => {
      const on = this.showRoof();
      if (this.roof) {
        this.roof.visible = on;
        this.render();
      }
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
    for (const g of [this.house, this.roof]) {
      if (g) {
        scene.remove(g);
        disposeGroup(g);
      }
    }
    const house = new THREE.Group();
    const roofGroup = new THREE.Group();

    const mat = {
      log: new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.85 }),
      half: new THREE.MeshStandardMaterial({ color: 0xcfa66c, roughness: 0.85 }),
      gable: new THREE.MeshStandardMaterial({ color: 0xe0bd88, roughness: 0.85 }),
      window: new THREE.MeshStandardMaterial({ color: 0x9cc6e6, transparent: true, opacity: 0.55, roughness: 0.1 }),
      door: new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.9, side: THREE.DoubleSide }),
      ground: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 1 }),
    };
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8a6a3c, transparent: true, opacity: 0.45 });

    for (const w of m.walls) this.addWall(THREE, house, w, mat, edgeMat);

    // katusepinnad (alumine pind mudelist, paksus ülespoole)
    for (const r of m.roofs) {
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
    roofGroup.visible = this.showRoof();

    // maapind
    const b = m.bounds;
    const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 3, size * 3), mat.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((b.x0 + b.x1) / 2, -1, (b.y0 + b.y1) / 2);
    house.add(ground);

    scene.add(house, roofGroup);
    this.house = house;
    this.roof = roofGroup;

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
    mat: Record<'log' | 'half' | 'gable' | 'window' | 'door', THREE_NS.Material>,
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

    for (const p of w.pieces) {
      const material = p.kind === 'half' ? mat.half : p.kind === 'gable' ? mat.gable : mat.log;
      let geo: THREE_NS.BufferGeometry;
      // räästa lõik (mitte viilupalk): ristlõike faas; muidu katusejoon piki seina
      const rc = p.kind === 'gable' ? undefined : w.roofCross.find((s) => Math.min(p.x1, s.x1) - Math.max(p.x0, s.x0) > 1);
      const cut = !rc && w.roofLine ? underRoof(p, w.roofLine, roofAt) : null;
      if (cut === 'none') continue;
      if (cut) {
        // palk katusejoone all: otsad kaldu (viilupalgid, viilu täisrea otsad nurkades)
        const shape = new THREE.Shape();
        shape.moveTo(cut[0]![0], cut[0]![1]);
        for (const [x, z] of cut.slice(1)) shape.lineTo(x, z);
        shape.closePath();
        geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
        geo.translate(0, 0, -t / 2);
      } else if (rc && p.y1 > Math.min(rc.z0 - rc.k * (t / 2), rc.z0 + rc.k * (t / 2)) + 0.5) {
        // räästaseina ülemine palk: katus toetub siseservale, välisserv lõigatud kaldu (faas)
        const zs = (s: number) => Math.max(p.y0, Math.min(p.y1, rc.z0 + rc.k * s));
        // ristlõige (a, z), a = −s (alus −n, üles, u -> parempoolne), pressitud piki seina
        const shape = new THREE.Shape();
        shape.moveTo(t / 2, p.y0);
        shape.lineTo(-t / 2, p.y0);
        shape.lineTo(-t / 2, zs(t / 2));
        shape.lineTo(t / 2, zs(-t / 2));
        shape.closePath();
        geo = new THREE.ExtrudeGeometry(shape, { depth: p.x1 - p.x0, bevelEnabled: false });
        geo.translate(0, 0, p.x0);
        const mesh = new THREE.Mesh(geo, material);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
        for (const o of [mesh, edges]) {
          o.applyMatrix4(crossBasis);
          o.position.add(origin);
          group.add(o);
        }
        continue;
      } else {
        geo = new THREE.BoxGeometry(p.x1 - p.x0, p.y1 - p.y0, t);
        geo.translate((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0);
      }
      const mesh = new THREE.Mesh(geo, material);
      place(mesh, 0, 0, 0);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
      place(edges, 0, 0, 0);
      group.add(edges);
    }

    for (const o of w.openings) {
      const geo = new THREE.BoxGeometry(o.x1 - o.x0, o.z1 - o.z0, o.kind === 'window' ? t * 0.15 : t * 0.3);
      geo.translate((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2, 0);
      const mesh = new THREE.Mesh(geo, o.kind === 'window' ? mat.window : mat.door);
      place(mesh, 0, 0, 0);
      group.add(mesh);
    }
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
    for (const g of [this.house, this.roof]) if (g) disposeGroup(g);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}

function disposeGroup(g: THREE_NS.Object3D): void {
  g.traverse((o) => {
    const m = o as THREE_NS.Mesh;
    m.geometry?.dispose();
  });
}
