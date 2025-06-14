import { throttle } from "lodash";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import SpaceshipAvatar from "./spaceship-avatar";

// --- 型定義 ---
interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  position: { x: number; y: number };
}
interface SpaceStationProps {
  users: User[];
  currentUser: string | null;
  typingUsers: string[];
  onUserMove: (userId: string, newPosition: { x: number; y: number }) => void;
}

// --- 物理定数 ---
const G = 50; // 重力定数（シミュレーションのスケール調整用）
const BLACK_HOLE_MASS = 30; // ブラックホールの質量
const SPACESHIP_MASS = 1.0; // 宇宙船の質量
const INTER_AVATAR_GRAVITY_SCALE = 1; // アバター間の重力の影響度

// --- ビジュアル定数 ---
const EVENT_HORIZON_RADIUS = 7.5; // 事象の地平面の半径
const PHOTON_SPHERE_RADIUS = 8.0; // 光子球の半径
const ACCRETION_DISK_INNER_RADIUS = 8.5; // 降着円盤の内径
const ACCRETION_DISK_OUTER_RADIUS = 35; // 降着円盤の外径（外側のリングの端）
const JET_BASE_RADIUS = 1.0; // ジェットの根元の半径

const RESPAWN_RADIUS_MIN = 150; // リスポーンする最小半径
const RESPAWN_RADIUS_MAX = 220; // リスポーンする最大半径
const ORBIT_SPEED_SCALE = 0.7; // 公転速度の初期値にかける係数
const DAMPING = 0.99995; // 速度の減衰係数（1に近いほどゆっくり吸い込まれる）

// --- カメラコントローラークラス ---
class CameraController {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  isOrbiting: boolean = false;
  rotateSpeed: number = 1.0;
  zoomSpeed: number = 1.2;
  spherical: THREE.Spherical = new THREE.Spherical();
  sphericalDelta: THREE.Spherical = new THREE.Spherical();
  scale: number = 1;
  target: THREE.Vector3 = new THREE.Vector3();
  rotateStart: THREE.Vector2 = new THREE.Vector2();
  rotateEnd: THREE.Vector2 = new THREE.Vector2();
  rotateDelta: THREE.Vector2 = new THREE.Vector2();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.update();
  }
  update() {
    const offset = new THREE.Vector3()
      .copy(this.camera.position)
      .sub(this.target);
    this.spherical.setFromVector3(offset);
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, this.spherical.phi)
    );
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(50, Math.min(300, this.spherical.radius));
    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
  }
  onMouseDown(event: MouseEvent) {
    this.isOrbiting = true;
    this.rotateStart.set(event.clientX, event.clientY);
  }
  onMouseMove(event: MouseEvent) {
    if (!this.isOrbiting) return;
    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);
    const element = this.domElement;
    this.sphericalDelta.theta -=
      (2 * Math.PI * this.rotateDelta.x) / element.clientHeight;
    this.sphericalDelta.phi -=
      (2 * Math.PI * this.rotateDelta.y) / element.clientHeight;
    this.rotateStart.copy(this.rotateEnd);
  }
  onMouseUp() {
    this.isOrbiting = false;
  }
  onMouseWheel(event: WheelEvent) {
    if (event.deltaY < 0) {
      this.scale /= Math.pow(0.95, this.zoomSpeed);
    } else if (event.deltaY > 0) {
      this.scale *= Math.pow(0.95, this.zoomSpeed);
    }
  }
}

// --- メインコンポーネント ---
export default function SpaceStation({
  users,
  currentUser,
  typingUsers,
  onUserMove,
}: SpaceStationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const threeJsState = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    composer: EffectComposer | null;
    controls: CameraController | null;
    plane: THREE.Mesh | null;
    avatarMeshes: { [key: string]: THREE.Group };
    avatarElements: { [key: string]: HTMLDivElement | null };
    physicsState: {
      [key: string]: {
        velocity: THREE.Vector3;
      };
    };
    blackHoleGroup: THREE.Group | null;
    volumetricNebula: THREE.Mesh | null;
    stars: THREE.Points | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    controls: null,
    plane: null,
    avatarMeshes: {},
    avatarElements: {},
    physicsState: {},
    blackHoleGroup: null,
    volumetricNebula: null,
    stars: null,
  });

  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [isOrbitingCamera, setIsOrbitingCamera] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const throttledSendPosition = useRef(
    throttle((userId: string, newPosition: { x: number; y: number }) => {
      onUserMove(userId, newPosition);
    }, 50)
  ).current;

  // --- Three.js初期化 ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const state = threeJsState.current;
    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    state.scene = new THREE.Scene();
    state.scene.fog = new THREE.FogExp2(0x00000a, 0.006);
    state.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    state.camera.position.set(0, 50, 100);
    state.renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    state.renderer.setSize(width, height);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.outputColorSpace = THREE.SRGBColorSpace;
    state.controls = new CameraController(
      state.camera,
      state.renderer.domElement
    );
    const renderPass = new RenderPass(state.scene, state.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8,
      0.6,
      0.1
    );
    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(renderPass);
    state.composer.addPass(bloomPass);
    state.scene.add(new THREE.HemisphereLight(0x6080ff, 0x302040, 0.6));

    const starCount = 25000;
    const starVertices = [];
    const starColors = [];
    const starSizes = [];
    const baseColor = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(4000),
        THREE.MathUtils.randFloatSpread(4000),
        THREE.MathUtils.randFloatSpread(4000)
      );
      baseColor.setHSL(
        0.55 + Math.random() * 0.1,
        0.8,
        0.8 + Math.random() * 0.2
      );
      starColors.push(baseColor.r, baseColor.g, baseColor.b);
      starSizes.push(1.0 + Math.random() * 2.5);
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3)
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starSizes, 1)
    );
    const starsMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
            attribute float size;
            varying vec3 vColor;
            varying float vSize;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                vSize = size;
            }
        `,
      fragmentShader: `
            uniform float time;
            varying vec3 vColor;
            varying float vSize;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                float flicker = sin((time * vSize) + (vSize * 100.0)) * 0.5 + 0.5;
                float strength = 1.0 - smoothstep(0.4, 0.5, dist);
                gl_FragColor = vec4(vColor, strength * (flicker * 0.3 + 0.7));
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    state.stars = stars;
    state.scene.add(stars);

    const nebulaGeometry = new THREE.SphereGeometry(1500, 64, 64);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x100520) },
        nebulaColor1: { value: new THREE.Color(0x8a2be2) },
        nebulaColor2: { value: new THREE.Color(0x4a00e0) },
        cameraPos: { value: state.camera.position },
      },
      vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * viewMatrix * worldPosition; }`,
      fragmentShader: `varying vec3 vWorldPosition; uniform vec3 baseColor; uniform vec3 nebulaColor1; uniform vec3 nebulaColor2; uniform vec3 cameraPos; uniform float time; vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod(i, 289.0); vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0)); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_); vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw); vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww; vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m; return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))); } float fbm(vec3 p) { float value = 0.0; float amplitude = 0.5; for (int i = 0; i < 6; i++) { value += amplitude * snoise(p); p *= 2.0; amplitude *= 0.5; } return value; } void main() { vec3 viewDirection = normalize(vWorldPosition - cameraPos); vec3 step = viewDirection * 50.0; vec3 currentPos = vWorldPosition; float density = 0.0; for (int i = 0; i < 8; i++) { float noise = fbm(currentPos * 0.002 + time * 0.05); density += max(0.0, noise) * 0.05; currentPos -= step; } vec3 finalColor = mix(nebulaColor1, nebulaColor2, density); finalColor = mix(baseColor, finalColor, density); gl_FragColor = vec4(finalColor, density * 0.8); }`,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    state.volumetricNebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    state.scene.add(state.volumetricNebula);

    // ==================================================================
    // ★★★★★ ここからブラックホールのビジュアルを刷新 ★★★★★
    // ==================================================================
    state.blackHoleGroup = new THREE.Group();
    state.scene.add(state.blackHoleGroup);

    // 1. 事象の地平面 (黒い球)
    const eventHorizon = new THREE.Mesh(
      new THREE.SphereGeometry(EVENT_HORIZON_RADIUS, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    state.blackHoleGroup.add(eventHorizon);

    // 2. 降着円盤 (Accretion Disk) - 2層構造に
    const diskGeometry = new THREE.RingGeometry(
      ACCRETION_DISK_INNER_RADIUS,
      ACCRETION_DISK_OUTER_RADIUS,
      256,
      8
    );
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        // 3段階の色を設定 (内側 -> 中間 -> 外側)
        innerColor: { value: new THREE.Color(0xfff8e7) }, // 高温の白黄色
        midColor: { value: new THREE.Color(0xffb800) }, // 鮮やかなオレンジ
        outerColor: { value: new THREE.Color(0xe55b00) }, // 低温の赤みがかったオレンジ
        dopplerBlue: { value: new THREE.Color(0.8, 0.9, 1.5) },
        dopplerRed: { value: new THREE.Color(1.5, 0.9, 0.8) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec3 pos = position;
          vRadius = length(pos.xy);
          
          // 持ち上げ効果を弱め、より自然な円形に
          float z_world = (modelMatrix * vec4(pos, 1.0)).z;
          float bendFactor = pow(max(0.0, z_world / ${ACCRETION_DISK_OUTER_RADIUS.toFixed(
            1
          )}), 2.0) * 3.0;
          pos.y += bendFactor;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 innerColor;
        uniform vec3 midColor;
        uniform vec3 outerColor;
        uniform vec3 dopplerBlue;
        uniform vec3 dopplerRed;
        varying vec2 vUv;
        varying float vRadius;
        varying vec3 vWorldPosition;

        // 2D Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g; g.x  = a0.x  * x0.x + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // FBM (Fractal Brownian Motion) for complex patterns
        float fbm(vec2 p) {
            float value = 0.0; float amplitude = 0.5;
            for (int i = 0; i < 5; i++) { value += amplitude * snoise(p); p *= 2.0; amplitude *= 0.5; }
            return value;
        }

        void main() {
          float normalizedRadius = (vRadius - ${ACCRETION_DISK_INNER_RADIUS.toFixed(
            1
          )}) / (${(
        ACCRETION_DISK_OUTER_RADIUS - ACCRETION_DISK_INNER_RADIUS
      ).toFixed(1)});
          
          // --- 層の定義 ---
          float gap_start = 0.45;
          float gap_end = 0.5;
          float gap_width = 0.02;

          // 隙間部分のアルファを0にするマスク
          float gap_mask = 1.0 - smoothstep(gap_start - gap_width, gap_start, normalizedRadius) * (1.0 - smoothstep(gap_end, gap_end + gap_width, normalizedRadius));

          vec3 baseColor;
          float speed;
          float noise_scale;

          if (normalizedRadius < gap_start) {
            // 内側リング
            float innerNormalizedRadius = normalizedRadius / gap_start;
            baseColor = mix(innerColor, midColor, innerNormalizedRadius);
            speed = 0.4 / (innerNormalizedRadius + 0.1); // 速い回転
            noise_scale = 4.0;
          } else {
            // 外側リング
            float outerNormalizedRadius = (normalizedRadius - gap_end) / (1.0 - gap_end);
            baseColor = mix(midColor, outerColor, outerNormalizedRadius);
            speed = 0.15 / (outerNormalizedRadius + 0.2); // 遅い回転
            noise_scale = 6.0;
          }
          
          float angle = atan(vUv.y * 2.0 - 1.0, vUv.x * 2.0 - 1.0);
          float timeOffset = time * speed;
          
          vec2 noiseCoord = vec2(angle * 3.0, normalizedRadius * noise_scale - timeOffset);
          float noise = fbm(noiseCoord);
          noise = pow(noise, 3.0);

          vec3 finalColor = baseColor;
          
          float doppler = smoothstep(-${ACCRETION_DISK_OUTER_RADIUS.toFixed(
            1
          )}, ${ACCRETION_DISK_OUTER_RADIUS.toFixed(1)}, vWorldPosition.x);
          vec3 dopplerColor = mix(dopplerBlue, dopplerRed, doppler);
          finalColor *= dopplerColor;

          finalColor *= 1.0 + noise * 3.0;

          float edgeFade = smoothstep(0.0, 0.05, normalizedRadius) * smoothstep(1.0, 0.9, normalizedRadius);
          
          gl_FragColor = vec4(finalColor, edgeFade * gap_mask);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2.0;
    state.blackHoleGroup.add(accretionDisk);

    // 3. 光子リング (Photon Sphere)
    const photonRing = new THREE.Mesh(
      new THREE.TorusGeometry(PHOTON_SPHERE_RADIUS, 0.15, 32, 128),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
      })
    );
    photonRing.rotation.copy(accretionDisk.rotation);
    state.blackHoleGroup.add(photonRing);

    // 4. ジェット (Jet) - 点滅を穏やかに
    // ジェットのジオメトリを作成 - より精細な分割でスムーズに
    const jetGeometry = new THREE.CylinderGeometry(
      JET_BASE_RADIUS,
      0.1, // 先端を細く
      300, // 長さ
      32, // 円周方向の分割数
      64, // 高さ方向の分割数を増やしてよりスムーズに
      true // オープンエンド
    );
    const jetMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        uniform float time; 
        varying vec2 vUv; 
        void main() { 
          vUv = uv; 
          vec3 pos = position; 
          float twist = sin(pos.y * 0.05 + time * 3.0) * (1.0 - uv.y) * 2.0;
          float angle = atan(pos.x, pos.z);
          pos.x += cos(angle) * twist; 
          pos.z += sin(angle) * twist; 
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); 
        }
      `,
      fragmentShader: `
        varying vec2 vUv; 
        uniform float time; 
        void main() { 
          float pulse = sin(vUv.y * 25.0 - time * 2.5) * 0.5 + 0.5;
          float baseGlow = pow(1.0 - vUv.y, 2.0);
          float intensity = baseGlow * (pulse * 0.7 + 0.3) * 1.5;
          gl_FragColor = vec4(vec3(0.7, 0.85, 1.0) * intensity, baseGlow * 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const topJet = new THREE.Mesh(jetGeometry, jetMaterial);
    topJet.position.y = 150;
    const bottomJet = topJet.clone();
    bottomJet.position.y = -150;
    bottomJet.rotation.x = Math.PI;
    state.blackHoleGroup.add(topJet, bottomJet);
    // ==================================================================
    // ★★★★★ ブラックホールビジュアルの刷新ここまで ★★★★★
    // ==================================================================

    state.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    state.plane.rotation.x = -Math.PI / 2;
    state.scene.add(state.plane);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();
      state.controls?.update();

      if (state.blackHoleGroup) {
        state.blackHoleGroup.rotation.y += delta * 0.02;
        state.blackHoleGroup.children.forEach((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.ShaderMaterial
          ) {
            child.material.uniforms.time.value = time;
          }
        });
      }

      if (state.stars && state.stars.material instanceof THREE.ShaderMaterial) {
        state.stars.material.uniforms.time.value = time;
      }

      if (
        state.volumetricNebula &&
        state.volumetricNebula.material instanceof THREE.ShaderMaterial &&
        state.camera
      ) {
        state.volumetricNebula.material.uniforms.time.value = time;
        state.volumetricNebula.material.uniforms.cameraPos.value.copy(
          state.camera.position
        );
      }

      // 物理シミュレーション
      if (
        state.scene &&
        state.avatarMeshes &&
        Object.keys(state.avatarMeshes).length > 0
      ) {
        const userIds = Object.keys(state.avatarMeshes);
        const accelerations: { [key: string]: THREE.Vector3 } = {};
        userIds.forEach((id1) => {
          if (id1 === draggedUserId) return;
          accelerations[id1] = new THREE.Vector3();
          const mesh1 = state.avatarMeshes[id1];
          const pos1 = mesh1.position;
          const distToCenterSq = pos1.lengthSq();
          if (distToCenterSq > 0.1) {
            const forceMag =
              (G * BLACK_HOLE_MASS * SPACESHIP_MASS) / distToCenterSq;
            const forceDir = pos1.clone().normalize().multiplyScalar(-forceMag);
            accelerations[id1].add(forceDir);
          }
          userIds.forEach((id2) => {
            if (id1 === id2) return;
            const mesh2 = state.avatarMeshes[id2];
            const pos2 = mesh2.position;
            const distVec = new THREE.Vector3().subVectors(pos2, pos1);
            const distSq = distVec.lengthSq();
            if (distSq > 25) {
              const forceMag =
                (G *
                  SPACESHIP_MASS *
                  SPACESHIP_MASS *
                  INTER_AVATAR_GRAVITY_SCALE) /
                distSq;
              distVec.normalize().multiplyScalar(forceMag);
              accelerations[id1].add(distVec);
            }
          });
        });
        userIds.forEach((id) => {
          if (id === draggedUserId) return;
          const mesh = state.avatarMeshes[id];
          const physics = state.physicsState[id];
          if (!physics) return;
          physics.velocity.add(accelerations[id].multiplyScalar(delta));
          physics.velocity.multiplyScalar(DAMPING);
          mesh.position.add(physics.velocity.clone().multiplyScalar(delta));
          if (mesh.position.length() < EVENT_HORIZON_RADIUS) {
            const angle = Math.random() * Math.PI * 2;
            const radius =
              RESPAWN_RADIUS_MIN +
              Math.random() * (RESPAWN_RADIUS_MAX - RESPAWN_RADIUS_MIN);
            const respawnX = Math.cos(angle) * radius;
            const respawnZ = Math.sin(angle) * radius;
            mesh.position.set(respawnX, 0, respawnZ);
            const tangent = new THREE.Vector3(
              -respawnZ,
              0,
              respawnX
            ).normalize();
            const speed =
              Math.sqrt((G * BLACK_HOLE_MASS) / radius) * ORBIT_SPEED_SCALE;
            physics.velocity.copy(tangent.multiplyScalar(speed));
          }
        });
      }

      // UI更新
      if (state.camera && containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        Object.values(state.avatarMeshes).forEach((group) => {
          const element = state.avatarElements[group.userData.userId];
          if (element) {
            const screenPosition = group.position
              .clone()
              .project(state.camera!);
            const isVisible = screenPosition.z < 1;
            element.style.visibility = isVisible ? "visible" : "hidden";
            if (isVisible) {
              const x = (screenPosition.x * width) / 2 + width / 2;
              const y = -((screenPosition.y * height) / 2) + height / 2;
              element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
            }
          }
        });
      }
      state.composer?.render();
    };
    animate();
    const handleResize = () => {
      if (
        !containerRef.current ||
        !state.renderer ||
        !state.camera ||
        !state.composer
      )
        return;
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      setContainerSize({ width, height });
      state.camera.aspect = width / height;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(width, height);
      state.composer.setSize(width, height);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- ユーザーの追加/削除/更新 ---
  useEffect(() => {
    const state = threeJsState.current;
    if (!state.scene || containerSize.width === 0 || containerSize.height === 0)
      return;
    const existingUserIds = new Set(users.map((u) => u.id));
    Object.keys(state.avatarMeshes).forEach((userId) => {
      if (!existingUserIds.has(userId)) {
        if (state.avatarMeshes[userId])
          state.scene!.remove(state.avatarMeshes[userId]);
        delete state.avatarMeshes[userId];
        delete state.avatarElements[userId];
        delete state.physicsState[userId];
      }
    });
    users.forEach((user) => {
      let group = state.avatarMeshes[user.id];
      if (!group) {
        group = new THREE.Group();
        group.userData = { userId: user.id };
        state.scene!.add(group);
        state.avatarMeshes[user.id] = group;
        state.physicsState[user.id] = {
          velocity: new THREE.Vector3(),
        };
        const { x, y } = user.position || { x: 0, y: 0 };
        const planeSize = 500;
        if (x === 0 && y === 0) {
          const angle = Math.random() * Math.PI * 2;
          const radius =
            RESPAWN_RADIUS_MIN +
            Math.random() * (RESPAWN_RADIUS_MAX - RESPAWN_RADIUS_MIN);
          group.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          );
        } else {
          const worldX = (x / containerSize.width - 0.5) * planeSize;
          const worldZ = (y / containerSize.height - 0.5) * planeSize;
          group.position.set(worldX, 0, worldZ);
        }
        const position = group.position;
        const dist = position.length();
        if (dist > 0) {
          const tangent = new THREE.Vector3(
            -position.z,
            0,
            position.x
          ).normalize();
          const speed =
            Math.sqrt((G * BLACK_HOLE_MASS) / dist) * ORBIT_SPEED_SCALE;
          state.physicsState[user.id].velocity.copy(
            tangent.multiplyScalar(speed)
          );
        }
      }
    });
  }, [users, containerSize]);

  // --- マウスイベントハンドラー ---
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(".spaceship-anim-container"))
      return;
    setIsOrbitingCamera(true);
    threeJsState.current.controls?.onMouseDown(event.nativeEvent);
  }, []);
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const state = threeJsState.current;
      if (!containerRef.current || !state.camera || !state.plane) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      if (draggedUserId) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, state.camera);
        const intersects = raycaster.intersectObject(state.plane);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          const avatarGroup = state.avatarMeshes[draggedUserId];
          if (avatarGroup) {
            avatarGroup.position.x = point.x;
            avatarGroup.position.z = point.z;
            const physics = state.physicsState[draggedUserId];
            if (physics) {
              physics.velocity.set(0, 0, 0);
            }
            const planeSize = 500;
            const x = (point.x / planeSize + 0.5) * containerSize.width;
            const y = (point.z / planeSize + 0.5) * containerSize.height;
            throttledSendPosition(draggedUserId, { x, y });
          }
        }
      } else if (isOrbitingCamera) {
        state.controls?.onMouseMove(event.nativeEvent);
      }
    },
    [containerSize, throttledSendPosition, draggedUserId, isOrbitingCamera]
  );
  const handleMouseUp = useCallback(() => {
    if (isOrbitingCamera) {
      setIsOrbitingCamera(false);
      threeJsState.current.controls?.onMouseUp();
    }
    if (draggedUserId) {
      setDraggedUserId(null);
    }
  }, [isOrbitingCamera, draggedUserId]);
  const handleAvatarMouseDown = useCallback(
    (event: React.MouseEvent, userId: string) => {
      event.stopPropagation();
      if (userId === currentUser) {
        setDraggedUserId(userId);
      }
    },
    [currentUser]
  );
  const handleWheel = useCallback((event: React.WheelEvent) => {
    threeJsState.current.controls?.onMouseWheel(event.nativeEvent);
  }, []);
  const cursor = useMemo(() => {
    if (draggedUserId || isOrbitingCamera) return "grabbing";
    return "grab";
  }, [draggedUserId, isOrbitingCamera]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gradient-to-b from-gray-900 via-indigo-950 to-black select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {users.map((user) => (
          <SpaceshipAvatar
            ref={(el) => {
              if (threeJsState.current.avatarElements) {
                threeJsState.current.avatarElements[user.id] = el;
              }
            }}
            key={user.id}
            user={user}
            isCurrentUser={user.id === currentUser}
            isTyping={typingUsers.includes(user.name)}
            isBeingDragged={draggedUserId === user.id}
            onMouseDown={handleAvatarMouseDown}
          />
        ))}
      </div>
    </div>
  );
}
