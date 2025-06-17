import { AnimatePresence, motion } from "framer-motion";
import { throttle } from "lodash";
import { Compass, Hand, Sparkles, X } from "lucide-react";
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
const G = 25;
const BLACK_HOLE_MASS = 25;
const SPACESHIP_MASS = 1.0;
const INTER_AVATAR_GRAVITY_SCALE = 0.5;

// --- ビジュアル定数 ---
const EVENT_HORIZON_RADIUS = 7.5;
const PHOTON_SPHERE_RADIUS = 8.0;
const ACCRETION_DISK_INNER_RADIUS = 8.5;
const ACCRETION_DISK_OUTER_RADIUS = 35;
const JET_BASE_RADIUS = 1.0;

// --- 挙動に関する定数 ---
const RESPAWN_RADIUS_MIN = 150;
const RESPAWN_RADIUS_MAX = 220;
const ORBIT_SPEED_SCALE = 0.6;
const DAMPING = 0.98;

// --- 挙動を「ゆったり」にするための定数調整 ---
const ORBIT_STABLE_RADIUS = 25.0;
const ORBIT_INFLUENCE_RADIUS = 50.0;
const ORBIT_PULL_FORCE = 0.5;
const ORBIT_VELOCITY_LERP_FACTOR = 0.03;

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
    targetPositions: { [key: string]: THREE.Vector3 };
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
    targetPositions: {},
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
    }, 30)
  ).current;

  const cursor = useMemo(() => {
    if (draggedUserId || isOrbitingCamera) return "grabbing";
    return "grab";
  }, [draggedUserId, isOrbitingCamera]);

  // ▼▼▼ 変更点: チュートリアルの状態管理を showTutorial のみに集約 ▼▼▼
  // チュートリアルの表示・非表示をこのstateで管理します
  const [showTutorial, setShowTutorial] = useState(true);
  // ▲▲▲ 変更ここまで ▲▲▲

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

    // ビジュアル要素の作成 (変更なし)
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

    state.blackHoleGroup = new THREE.Group();
    state.scene.add(state.blackHoleGroup);
    const eventHorizon = new THREE.Mesh(
      new THREE.SphereGeometry(EVENT_HORIZON_RADIUS, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    state.blackHoleGroup.add(eventHorizon);
    const diskGeometry = new THREE.RingGeometry(
      ACCRETION_DISK_INNER_RADIUS,
      ACCRETION_DISK_OUTER_RADIUS,
      256,
      32
    );
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xffffff) },
        color2: { value: new THREE.Color(0xfff06e) },
        color3: { value: new THREE.Color(0xff8c1a) },
        color4: { value: new THREE.Color(0x40a4df) },
        color5: { value: new THREE.Color(0x3643a5) },
        color6: { value: new THREE.Color(0x4b0082) },
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
        uniform vec3 color1, color2, color3, color4, color5, color6;
        uniform vec3 dopplerBlue, dopplerRed;
        varying vec2 vUv;
        varying float vRadius;
        varying vec3 vWorldPosition;
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) { const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v - i + dot(i, C.xx); vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m; m = m*m; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x  = a0.x  * x0.x + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g); }
        float fbm(vec2 p) { float value = 0.0; float amplitude = 0.5; for (int i = 0; i < 5; i++) { value += amplitude * snoise(p); p *= 2.0; amplitude *= 0.5; } return value; }
        void main() {
          float normalizedRadius = (vRadius - ${ACCRETION_DISK_INNER_RADIUS.toFixed(
            1
          )}) / (${(
        ACCRETION_DISK_OUTER_RADIUS - ACCRETION_DISK_INNER_RADIUS
      ).toFixed(1)});
          vec3 ringColor = vec3(0.0);
          float ringAlpha = 0.0;
          float speed = 0.0;
          float noise_scale = 0.0;
          if (normalizedRadius < 0.2) { float localRadius = normalizedRadius / 0.2; ringColor = mix(color1, color2, localRadius); speed = 0.8; noise_scale = 3.0; ringAlpha = smoothstep(0.0, 0.02, normalizedRadius) * (1.0 - smoothstep(0.18, 0.2, normalizedRadius)); }
          else if (normalizedRadius > 0.25 && normalizedRadius < 0.5) { float localRadius = (normalizedRadius - 0.25) / 0.25; ringColor = mix(color2, color3, localRadius); speed = 0.4; noise_scale = 5.0; ringAlpha = smoothstep(0.25, 0.27, normalizedRadius) * (1.0 - smoothstep(0.48, 0.5, normalizedRadius)); }
          else if (normalizedRadius > 0.55 && normalizedRadius < 0.75) { float localRadius = (normalizedRadius - 0.55) / 0.2; ringColor = mix(color4, color5, localRadius); speed = 0.2; noise_scale = 8.0; ringAlpha = smoothstep(0.55, 0.57, normalizedRadius) * (1.0 - smoothstep(0.73, 0.75, normalizedRadius)); }
          else if (normalizedRadius > 0.8 && normalizedRadius <= 1.0) { float localRadius = (normalizedRadius - 0.8) / 0.2; ringColor = mix(color5, color6, localRadius); speed = 0.1; noise_scale = 12.0; ringAlpha = smoothstep(0.8, 0.82, normalizedRadius) * (1.0 - smoothstep(0.98, 1.0, normalizedRadius)); }
          if (ringAlpha > 0.0) {
              float angle = atan(vUv.y * 2.0 - 1.0, vUv.x * 2.0 - 1.0);
              float timeOffset = time * speed;
              vec2 noiseCoord = vec2(angle * 3.0, normalizedRadius * noise_scale - timeOffset);
              float noise = fbm(noiseCoord);
              noise = pow(noise, 3.0);
              vec3 finalColor = ringColor;
              float doppler = smoothstep(-${ACCRETION_DISK_OUTER_RADIUS.toFixed(
                1
              )}, ${ACCRETION_DISK_OUTER_RADIUS.toFixed(1)}, vWorldPosition.x);
              vec3 dopplerColor = mix(dopplerBlue, dopplerRed, doppler);
              finalColor *= dopplerColor;
              finalColor *= 1.0 + noise * 3.0;
              gl_FragColor = vec4(finalColor, ringAlpha);
          } else { discard; }
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
    const photonRing = new THREE.Mesh(
      new THREE.TorusGeometry(PHOTON_SPHERE_RADIUS, 0.15, 32, 128),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
      })
    );
    photonRing.rotation.copy(accretionDisk.rotation);
    state.blackHoleGroup.add(photonRing);
    const jetGeometry = new THREE.CylinderGeometry(
      JET_BASE_RADIUS,
      0.1,
      300,
      32,
      64,
      true
    );
    const jetMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: ` uniform float time; varying vec2 vUv; void main() { vUv = uv; vec3 pos = position; float twist = sin(pos.y * 0.05 + time * 3.0) * (1.0 - uv.y) * 2.0; float angle = atan(pos.x, pos.z); pos.x += cos(angle) * twist; pos.z += sin(angle) * twist; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); } `,
      fragmentShader: ` varying vec2 vUv; uniform float time; void main() { float pulse = sin(vUv.y * 25.0 - time * 2.5) * 0.5 + 0.5; float baseGlow = pow(1.0 - vUv.y, 2.0); float intensity = baseGlow * (pulse * 0.7 + 0.3) * 1.5; gl_FragColor = vec4(vec3(0.7, 0.85, 1.0) * intensity, baseGlow * 0.8); } `,
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

      // (ビジュアル更新、物理シミュレーションのロジックは変更なし)
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

      if (
        state.scene &&
        state.avatarMeshes &&
        Object.keys(state.avatarMeshes).length > 0
      ) {
        const userIds = Object.keys(state.avatarMeshes);
        userIds.forEach((id) => {
          const mesh = state.avatarMeshes[id];
          const physics = state.physicsState[id];
          if (!mesh || !physics) return;
          if (id === currentUser && id !== draggedUserId) {
            const pos = mesh.position;
            const vel = physics.velocity;
            const acceleration = new THREE.Vector3();
            const distToCenter = pos.length();
            if (distToCenter < ORBIT_INFLUENCE_RADIUS) {
              const influenceFactor = THREE.MathUtils.smoothstep(
                distToCenter,
                ORBIT_INFLUENCE_RADIUS,
                ORBIT_STABLE_RADIUS
              );
              const orbitSpeed =
                Math.sqrt((G * BLACK_HOLE_MASS) / distToCenter) *
                ORBIT_SPEED_SCALE;
              const tangentDir = new THREE.Vector3(
                -pos.z,
                0,
                pos.x
              ).normalize();
              const idealVelocity = tangentDir.multiplyScalar(orbitSpeed);
              vel.lerp(
                idealVelocity,
                influenceFactor * ORBIT_VELOCITY_LERP_FACTOR
              );
              const radialOffset = distToCenter - ORBIT_STABLE_RADIUS;
              const pullForce = pos
                .clone()
                .normalize()
                .multiplyScalar(-radialOffset * ORBIT_PULL_FORCE);
              acceleration.add(pullForce.multiplyScalar(influenceFactor));
            } else {
              if (distToCenter > 0.1) {
                const forceMag =
                  (G * BLACK_HOLE_MASS * SPACESHIP_MASS) /
                  (distToCenter * distToCenter);
                const forceDir = pos
                  .clone()
                  .normalize()
                  .multiplyScalar(-forceMag);
                acceleration.add(forceDir);
              }
            }
            userIds.forEach((otherId) => {
              if (id === otherId) return;
              const otherMesh = state.avatarMeshes[otherId];
              if (!otherMesh) return;
              const otherPos = otherMesh.position;
              const distVec = new THREE.Vector3().subVectors(otherPos, pos);
              const distSq = distVec.lengthSq();
              if (distSq > 25) {
                const forceMag =
                  (G *
                    SPACESHIP_MASS *
                    SPACESHIP_MASS *
                    INTER_AVATAR_GRAVITY_SCALE) /
                  distSq;
                distVec.normalize().multiplyScalar(forceMag);
                acceleration.add(distVec);
              }
            });
            vel.add(acceleration.multiplyScalar(delta));
            vel.multiplyScalar(DAMPING);
            pos.add(vel.clone().multiplyScalar(delta));
            throttledSendPosition(id, { x: pos.x, y: pos.z });
          } else if (id !== currentUser) {
            const targetPosition = state.targetPositions[id];
            if (targetPosition) {
              const lerpFactor = 1.0 - Math.pow(0.01, delta);
              mesh.position.lerp(targetPosition, lerpFactor);
              const estimatedVelocity = targetPosition
                .clone()
                .sub(mesh.position)
                .divideScalar(delta);
              physics.velocity.lerp(estimatedVelocity, lerpFactor * 0.1);
            }
          }
        });
      }

      // UI更新
      if (state.camera && containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        Object.values(state.avatarMeshes).forEach((group) => {
          const userId = group.userData.userId;
          const element = state.avatarElements[userId];
          if (element) {
            const zIndex =
              userId === draggedUserId ? 30 : userId === currentUser ? 20 : 10;
            element.style.zIndex = String(zIndex);
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

  // --- ユーザーの追加/削除/更新 (変更なし) ---
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
        delete state.targetPositions[userId];
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

        if (user.position && (user.position.x !== 0 || user.position.y !== 0)) {
          group.position.set(user.position.x, 0, user.position.y);
        } else {
          const angle = Math.random() * Math.PI * 2;
          const radius =
            RESPAWN_RADIUS_MIN +
            Math.random() * (RESPAWN_RADIUS_MAX - RESPAWN_RADIUS_MIN);
          group.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          );
        }

        const position = group.position;
        const dist = position.length();

        if (user.id === currentUser && dist > 0) {
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

        if (user.id !== currentUser) {
          state.targetPositions[user.id] = group.position.clone();
        }
      } else {
        if (user.id !== currentUser && user.id !== draggedUserId) {
          if (user.position) {
            state.targetPositions[user.id] = new THREE.Vector3(
              user.position.x,
              0,
              user.position.y
            );
          }
        }
      }
    });
  }, [users, currentUser, containerSize, draggedUserId]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (
      (event.target as HTMLElement).closest(".spaceship-anim-container") ||
      (event.target as HTMLElement).closest(".tutorial-container")
    )
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
            if (state.targetPositions[draggedUserId]) {
              delete state.targetPositions[draggedUserId];
            }
            throttledSendPosition(draggedUserId, { x: point.x, y: point.z });
          }
        }
      } else if (isOrbitingCamera) {
        state.controls?.onMouseMove(event.nativeEvent);
      }
    },
    [throttledSendPosition, draggedUserId, isOrbitingCamera]
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

      {/* ▼▼▼ 変更点: チュートリアルUIの表示ロジックを修正 ▼▼▼ */}
      <div
        className="absolute bottom-8 right-8 pointer-events-auto z-40 tutorial-container"
        style={{ maxWidth: "calc(100vw - 64px)" }}
      >
        <AnimatePresence mode="wait">
          {showTutorial ? (
            <motion.div
              key="tutorial-card"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-80 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative"
            >
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full filter blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full filter blur-3xl" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.div>
                    <h3 className="text-white text-lg font-semibold font-sans bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                      あそびばチュートリアル
                    </h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowTutorial(false)}
                    className="text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3 group"
                  >
                    <motion.div
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0 group-hover:from-purple-500/30 group-hover:to-purple-600/30 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Hand className="w-5 h-5 text-purple-400" />
                    </motion.div>
                    <div>
                      <h4 className="text-white/90 font-medium mb-1">
                        アバターを移動
                      </h4>
                      <p className="text-white/60 text-sm leading-relaxed">
                        自分のアイコンをドラッグして、3D空間内を自由に移動できます
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-3 group"
                  >
                    <motion.div
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:from-blue-500/30 group-hover:to-blue-600/30 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Compass className="w-5 h-5 text-blue-400" />
                    </motion.div>
                    <div>
                      <h4 className="text-white/90 font-medium mb-1">
                        視点を変更
                      </h4>
                      <p className="text-white/60 text-sm leading-relaxed">
                        背景をドラッグして視点を回転、スクロールでズームイン/アウト
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reopen-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.2 }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/20 transition-all hover:shadow-lg hover:shadow-purple-500/20 group"
              onClick={() => setShowTutorial(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 to-blue-400/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ▲▲▲ 変更ここまで ▲▲▲ */}
    </div>
  );
}
