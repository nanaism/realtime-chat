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
    this.spherical.radius = Math.max(20, Math.min(150, this.spherical.radius));
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
  }>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    controls: null,
    plane: null,
    avatarMeshes: {},
    avatarElements: {},
  });

  // 修正: ドラッグ状態とカメラ操作状態をuseStateで管理
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
    state.scene.fog = new THREE.FogExp2(0x00000a, 0.005);

    state.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    state.camera.position.set(0, 15, 60);

    state.renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    state.renderer.setSize(width, height);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.outputColorSpace = THREE.SRGBColorSpace;

    state.controls = new CameraController(
      state.camera,
      state.renderer.domElement
    );

    const renderPass = new RenderPass(state.scene, state.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.0,
      0.1,
      0.1
    );
    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(renderPass);
    state.composer.addPass(bloomPass);

    state.scene.add(new THREE.HemisphereLight(0xccccff, 0x080820, 0.8));
    const coreLight = new THREE.PointLight(0xfbbf24, 5, 50, 1.5);
    state.scene.add(coreLight);

    const starsGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 20000; i++) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(2000), // x
        THREE.MathUtils.randFloatSpread(2000), // y
        THREE.MathUtils.randFloatSpread(2000) // z
      );
    }
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );

    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true,
        opacity: 0.8,
      })
    );
    state.scene.add(stars);

    const dustGeometry = new THREE.BufferGeometry();
    const dustVertices = [];
    for (let i = 0; i < 500; i++) {
      dustVertices.push(
        THREE.MathUtils.randFloatSpread(100), // x
        THREE.MathUtils.randFloatSpread(100), // y
        THREE.MathUtils.randFloatSpread(100) // z
      );
    }
    dustGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(dustVertices, 3)
    );

    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.1,
        transparent: true,
        opacity: 0.5,
      })
    );
    state.scene.add(dust);

    const createNebula = (
      color1: number,
      color2: number,
      pos: THREE.Vector3,
      scale: number
    ) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 color1; uniform vec3 color2; varying vec2 vUv; float random(vec2 p){return fract(sin(dot(p.xy,vec2(12.9898,78.233)))*43758.5453123);} float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(random(i),random(i+vec2(1.,0.)),f.x),mix(random(i+vec2(0.,1.)),random(i+vec2(1.,1.)),f.x),f.y);} float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<5;++i){v+=a*noise(p);p=p*2.;a*=.5;}return v;} void main(){vec2 p=vUv*2.-1.;float n=fbm(p*2.5+time*.1);float dist=1.-length(p);vec3 color=mix(color1,color2,smoothstep(0.,1.,n));gl_FragColor=vec4(color,dist*n*.5);}`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebula = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 300),
        material
      );
      nebula.position.copy(pos);
      nebula.scale.setScalar(scale);
      return nebula;
    };
    state.scene.add(
      createNebula(0x8b5cf6, 0x3b82f6, new THREE.Vector3(150, 50, -250), 2.0)
    );
    state.scene.add(
      createNebula(0xf472b6, 0xfbbf24, new THREE.Vector3(-200, -30, -300), 2.5)
    );

    const stationGroup = new THREE.Group();
    state.scene.add(stationGroup);

    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xfbbf24) },
      },
      vertexShader: `varying vec3 vNormal; uniform float time; void main() { vNormal = normalize(normalMatrix * normal); float pulse = sin(time * 3.0 + position.y * 2.0) * 0.1 + 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position * pulse, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; uniform float time; uniform vec3 color; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); vec3 finalColor = color * (intensity + pow(sin(time * 5.0) * 0.5 + 0.5, 2.0) * 0.5); gl_FragColor = vec4(finalColor, 1.0); }`,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4, 5),
      coreMaterial
    );
    stationGroup.add(core);

    const createEnergyRing = (
      radius: number,
      color: THREE.Color,
      speed: number
    ) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          ringColor: { value: color },
          speed: { value: speed },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 ringColor; uniform float speed; float noise(vec2 p){return fract(sin(dot(p.xy,vec2(12.9898,78.233)))*43758.5453);} void main() { float pattern=noise(vec2(vUv.x*200.,time*speed)); float glow=pow(abs(vUv.y-.5)*2.,2.); float intensity=pattern*(1.-glow)*.7+.3; gl_FragColor=vec4(ringColor,intensity); }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.3, 32, 200),
        material
      );
    };
    const ring1 = createEnergyRing(25, new THREE.Color(0x60a5fa), 1.0);
    const ring2 = createEnergyRing(32, new THREE.Color(0xc084fc), -0.8);
    ring2.rotation.x = Math.PI / 2;
    const ring3 = createEnergyRing(39, new THREE.Color(0xf472b6), 0.6);
    ring3.rotation.y = Math.PI / 2;
    stationGroup.add(ring1, ring2, ring3);

    state.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    state.plane.rotation.x = -Math.PI / 2;
    state.scene.add(state.plane);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      state.controls?.update();

      stationGroup.rotation.y += delta * 0.05;
      stationGroup.children.forEach((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.ShaderMaterial
        ) {
          child.material.uniforms.time.value = time;
        }
      });

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
  }, []);

  // --- ユーザーの追加/削除/更新 ---
  useEffect(() => {
    const state = threeJsState.current;
    // 修正: NaNエラー防止のため、コンテナサイズが0の場合は処理を中断
    if (!state.scene || containerSize.width === 0 || containerSize.height === 0)
      return;

    const existingUserIds = new Set(users.map((u) => u.id));
    Object.keys(state.avatarMeshes).forEach((userId) => {
      if (!existingUserIds.has(userId)) {
        if (state.avatarMeshes[userId])
          state.scene!.remove(state.avatarMeshes[userId]);
        delete state.avatarMeshes[userId];
        delete state.avatarElements[userId];
      }
    });

    users.forEach((user) => {
      let group = state.avatarMeshes[user.id];
      if (!group) {
        group = new THREE.Group();
        group.userData = { userId: user.id };
        state.scene!.add(group);
        state.avatarMeshes[user.id] = group;
      }

      let { x, y } = user.position || { x: 0, y: 0 };
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        isNaN(x) ||
        isNaN(y)
      ) {
        x = 0;
        y = 0;
      }

      if (x === 0 && y === 0) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 40 + Math.random() * 40; // 可動域を広げる
        x = ((Math.cos(angle) * radius) / 200 + 0.5) * containerSize.width;
        y = ((Math.sin(angle) * radius) / 200 + 0.5) * containerSize.height;
      }

      // 修正: PlaneGeometryのサイズ(200x200)に合わせて係数を修正
      const worldX = (x / containerSize.width - 0.5) * 200;
      const worldZ = (y / containerSize.height - 0.5) * 200;
      group.position.set(worldX, 0, worldZ);
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
            // 修正: ワールド座標からピクセル座標への変換式を統一
            const x = (point.x / 200 + 0.5) * containerSize.width;
            const y = (point.z / 200 + 0.5) * containerSize.height;
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
      className="relative w-full h-full overflow-hidden bg-black select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* UIオーバーレイとタイトル */}
      <div className="absolute top-6 left-0 right-0 text-center z-10 pointer-events-none">
        <h2
          className="text-5xl font-black tracking-wider"
          style={{
            background:
              "linear-gradient(45deg, #60a5fa 0%, #c084fc 25%, #f472b6 50%, #60a5fa 75%, #c084fc 100%)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "gradient 5s ease infinite",
            textShadow: "0 0 40px rgba(139, 92, 246, 0.5)",
            filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.8))",
          }}
        >
          COSMIC NEXUS
        </h2>
        <p
          className="text-sm mt-2 font-mono opacity-70"
          style={{
            color: "#60a5fa",
            textShadow: "0 0 10px rgba(96, 165, 250, 0.8)",
          }}
        >
          DEEP SPACE COLLABORATION PLATFORM
        </p>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {users.map((user) => (
          <SpaceshipAvatar
            ref={(el) => {
              threeJsState.current.avatarElements[user.id] = el;
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
