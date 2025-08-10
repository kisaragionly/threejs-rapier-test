import { useState, useRef, useEffect } from 'react';
import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d";
import './App.css';

class Camera {
  public field_of_view = 75;
  public near_clip = 0.1;
  public far_clip = 1000;

  public camera = new THREE.PerspectiveCamera(
    this.field_of_view,
    window.innerWidth / window.innerHeight,
    this.near_clip,
    this.far_clip
  );

  constructor() {
    this.camera.position.set(0, 20, 30)
    this.camera.rotateX(-0.7)
  }
}

class FPSTracker {
  public fps = 0;
  public frameCount = 0;
  public lastTime = performance.now();

  update(): number {
    const currentTime = performance.now();
    this.frameCount += 1;

    if (currentTime >= this.lastTime + 500) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    return this.fps
  }
}

function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const finishedSetup = useRef(false);
  const [fps, setFps] = useState(0);
  const [cubesAmount, setCubesAmount] = useState(0);

  useEffect(() => {
    // Initial Setup
    if (!canvasMountRef.current) return;
    if (finishedSetup.current) return;
    finishedSetup.current = true;

    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    const camera = new Camera();
    const fpsTracker = new FPSTracker();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasMountRef.current.appendChild(renderer.domElement);

    function handleResize() {
      camera.camera.aspect = window.innerWidth / window.innerHeight;
      camera.camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // Physics World
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    const world = new RAPIER.World(gravity);

    // Ground
    // Ground Graphics
    const groundGeometry = new THREE.BoxGeometry(50, 2, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.2, 1, 0.2) });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    scene.add(ground);
    // Ground Physics
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    const groundBody = world.createRigidBody(groundBodyDesc)
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(25.0, 1, 25.0);
    world.createCollider(groundColliderDesc, groundBody);

    // Cube Setup
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 0.1, 0.1) });
    const cubes: { mesh: THREE.Mesh; rigidBody: RAPIER.RigidBody }[] = [];

    function spawnCube() {
      // Cube Graphics
      if (fpsTracker.fps > 50) {
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        // Cube Physics
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.random() * 3, 15, Math.random() * 3);
        const rigidBody = world.createRigidBody(rigidBodyDesc);
        const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
        const cubeCollider = world.createCollider(cubeColliderDesc, rigidBody);
        cubeCollider.setRestitution(0.5);
        cubeCollider.setFriction(0.5);
        cubes.push({ mesh: cube, rigidBody });
        setCubesAmount(cubes.length);
      }
    }
    setInterval(spawnCube, 100);

    const fixedTimestep = 0.016;
    let accumulator = 0;
    function frame() {
      accumulator += clock.getDelta();
      setFps(fpsTracker.update());

      let steps = 0;
      while (accumulator >= fixedTimestep && steps < 5) {
        world.step();
        accumulator -= fixedTimestep;
        steps += 1;
      }

      cubes.forEach(({ mesh, rigidBody }) => {
        mesh.position.copy(rigidBody.translation());
        mesh.quaternion.copy(rigidBody.rotation());
      });

      renderer.render(scene, camera.camera);
    }

    renderer.setAnimationLoop(frame);
  }, []);

  return (
    <div className="app">
      <Stats fps={fps} cubesAmount={cubesAmount} />
      <div ref={canvasMountRef} />
    </div>
  )
}

function Stats({ fps, cubesAmount }: { fps: number, cubesAmount: number }) {
  return (
    <div className="stats">
      <p>FPS: {fps}</p>
      <p>Cubes: {cubesAmount}</p>
    </div>
  );
};

export default App
