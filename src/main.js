import './styles.css'
import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const canvas = document.querySelector('#scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.85
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x111826, 0.00042)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000)
camera.position.set(30, 18, 44)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(0, 4, 0)
controls.minDistance = 8
controls.maxDistance = 220
controls.maxPolarAngle = Math.PI * 0.495

const ambient = new THREE.HemisphereLight(0x9bb8ff, 0x05070b, 0.3)
scene.add(ambient)

const moonLight = new THREE.DirectionalLight(0xffffff, 1.4)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(2048, 2048)
moonLight.shadow.camera.near = 1
moonLight.shadow.camera.far = 400
moonLight.shadow.camera.left = -150
moonLight.shadow.camera.right = 150
moonLight.shadow.camera.top = 150
moonLight.shadow.camera.bottom = -150
scene.add(moonLight)
scene.add(moonLight.target)

const sky = new Sky()
sky.scale.setScalar(10000)
scene.add(sky)

const sun = new THREE.Vector3()
const pmrem = new THREE.PMREMGenerator(renderer)
let skyEnvTarget = null

const waterNormals = new THREE.TextureLoader().load(
  'https://threejs.org/examples/textures/waternormals.jpg',
  (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  }
)
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

const waterGeometry = new THREE.PlaneGeometry(12000, 12000)
const water = new Water(waterGeometry, {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x0b1f33,
  distortionScale: 3.7,
  fog: true,
})
water.rotation.x = -Math.PI / 2
scene.add(water)

const oceanFloor = new THREE.Mesh(
  new THREE.CircleGeometry(2800, 128),
  new THREE.MeshStandardMaterial({
    color: 0x0e1620,
    roughness: 1,
    metalness: 0,
  })
)
oceanFloor.rotation.x = -Math.PI / 2
oceanFloor.position.y = -140
oceanFloor.receiveShadow = true
scene.add(oceanFloor)

const causticDisk = new THREE.Mesh(
  new THREE.CircleGeometry(1800, 96),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#8de8ff') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      float pattern(vec2 p) {
        float a = sin(p.x * 22.0 + uTime * 1.4);
        float b = sin(p.y * 18.0 - uTime * 1.15);
        float c = sin((p.x + p.y) * 26.0 + uTime * 1.8);
        return smoothstep(1.55, 2.35, a + b + c + 1.3);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float radial = smoothstep(1.0, 0.15, length(uv));
        float c = pattern(vUv * 2.5);
        float alpha = c * radial * 0.16;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  })
)
causticDisk.rotation.x = -Math.PI / 2
causticDisk.position.y = -118
scene.add(causticDisk)

function makeRock(x, y, z, scale, color = 0x0c1218) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(scale * 0.8, scale * 2.4, 5),
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 })
  )
  mesh.position.set(x, y, z)
  mesh.rotation.y = Math.random() * Math.PI
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

const rockGroup = new THREE.Group()
for (const [x, y, z, s] of [
  [0, 8, -45, 9],
  [-120, 18, -220, 24],
  [150, 15, -260, 20],
  [260, 14, 120, 18],
  [-310, 10, 80, 14],
]) {
  rockGroup.add(makeRock(x, y, z, s))
}
scene.add(rockGroup)

const buoyGroup = new THREE.Group()
const buoyBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.7, 7, 24),
  new THREE.MeshStandardMaterial({ color: 0xf06d4f, roughness: 0.62, metalness: 0.08 })
)
buoyBody.castShadow = true
buoyBody.receiveShadow = true
buoyBody.position.y = 3.5
const buoyStripe = new THREE.Mesh(
  new THREE.CylinderGeometry(1.28, 1.58, 1.1, 24),
  new THREE.MeshStandardMaterial({ color: 0xf8f4ed, roughness: 0.4, metalness: 0.02 })
)
buoyStripe.position.y = 5.3
const buoyPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, 4.6, 12),
  new THREE.MeshStandardMaterial({ color: 0x404856, roughness: 0.55, metalness: 0.35 })
)
buoyPole.position.y = 7.7
const buoyLamp = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xffd17a, emissive: 0x8e4d08, emissiveIntensity: 1.1 })
)
buoyLamp.position.y = 10.2
buoyGroup.add(buoyBody, buoyStripe, buoyPole, buoyLamp)
scene.add(buoyGroup)

const beacon = new THREE.PointLight(0xffcc7a, 30, 120, 2)
beacon.position.set(0, 10.2, 0)
scene.add(beacon)

const farGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 36),
  new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.22 })
)
farGlow.position.set(0, 18, -170)
scene.add(farGlow)

const starField = new THREE.BufferGeometry()
const starCount = 1000
const starPositions = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  const radius = 2500 + Math.random() * 1500
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI * 0.45
  starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * radius
  starPositions[i * 3 + 1] = Math.cos(phi) * radius * 0.8 + 800
  starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius
}
starField.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
const stars = new THREE.Points(
  starField,
  new THREE.PointsMaterial({ color: 0xd9ebff, size: 6, sizeAttenuation: true, transparent: true, opacity: 0.9 })
)
scene.add(stars)

const presets = {
  Tropical: {
    elevation: 5,
    azimuth: 182,
    exposure: 0.95,
    waterColor: 0x1b6f8f,
    distortionScale: 2.2,
    size: 0.8,
    fog: 0.00035,
    beacon: 0xe7fff8,
    skyTop: 10,
    ambient: 0.42,
  },
  Storm: {
    elevation: 2,
    azimuth: 178,
    exposure: 0.55,
    waterColor: 0x0a1726,
    distortionScale: 5.4,
    size: 1.55,
    fog: 0.00075,
    beacon: 0xcde8ff,
    skyTop: 4,
    ambient: 0.18,
  },
  Sunset: {
    elevation: 1.5,
    azimuth: 200,
    exposure: 0.88,
    waterColor: 0x3a295a,
    distortionScale: 3.4,
    size: 1.05,
    fog: 0.00045,
    beacon: 0xffd39a,
    skyTop: 3,
    ambient: 0.26,
  },
  Moonlight: {
    elevation: 6,
    azimuth: 214,
    exposure: 0.62,
    waterColor: 0x081a2f,
    distortionScale: 4.1,
    size: 1.12,
    fog: 0.00042,
    beacon: 0xffcc7a,
    skyTop: 8,
    ambient: 0.22,
  },
}

const params = {
  preset: 'Moonlight',
  underwater: false,
  followBuoy: false,
  distortionScale: presets.Moonlight.distortionScale,
  size: presets.Moonlight.size,
  elevation: presets.Moonlight.elevation,
  azimuth: presets.Moonlight.azimuth,
  exposure: presets.Moonlight.exposure,
}

function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - params.elevation)
  const theta = THREE.MathUtils.degToRad(params.azimuth)
  sun.setFromSphericalCoords(1, phi, theta)

  sky.material.uniforms.sunPosition.value.copy(sun)
  water.material.uniforms.sunDirection.value.copy(sun).normalize()
  moonLight.position.copy(sun).multiplyScalar(260)
  moonLight.target.position.set(0, 0, 0)

  if (skyEnvTarget) skyEnvTarget.dispose()
  skyEnvTarget = pmrem.fromScene(sky)
  scene.environment = skyEnvTarget.texture
}

function applyPreset(name) {
  const p = presets[name]
  if (!p) return
  params.preset = name
  params.elevation = p.elevation
  params.azimuth = p.azimuth
  params.exposure = p.exposure
  params.distortionScale = p.distortionScale
  params.size = p.size

  renderer.toneMappingExposure = p.exposure
  water.material.uniforms.waterColor.value.setHex(p.waterColor)
  water.material.uniforms.distortionScale.value = p.distortionScale
  water.material.uniforms.size.value = p.size
  scene.fog.density = p.fog
  beacon.color.setHex(p.beacon)
  beacon.intensity = name === 'Storm' ? 20 : 30
  ambient.intensity = p.ambient
  stars.material.opacity = name === 'Tropical' ? 0.18 : 0.9
  farGlow.material.opacity = name === 'Storm' ? 0.08 : 0.22

  const turbidity = name === 'Storm' ? 11 : name === 'Sunset' ? 12 : 8
  const rayleigh = name === 'Tropical' ? 1.6 : name === 'Sunset' ? 0.75 : 0.45
  const mieCoefficient = name === 'Storm' ? 0.012 : 0.005
  const mieDirectionalG = name === 'Storm' ? 0.92 : 0.8

  sky.material.uniforms.turbidity.value = turbidity
  sky.material.uniforms.rayleigh.value = rayleigh
  sky.material.uniforms.mieCoefficient.value = mieCoefficient
  sky.material.uniforms.mieDirectionalG.value = mieDirectionalG

  updateSun()
  controllers.forEach((c) => c.updateDisplay())
}

function setUnderwater(enabled) {
  params.underwater = enabled
  scene.fog.color.set(enabled ? 0x08334a : 0x111826)
  scene.fog.density = enabled ? 0.0038 : presets[params.preset].fog
  camera.position.y = enabled ? -14 : Math.max(camera.position.y, 18)
  controls.maxPolarAngle = enabled ? Math.PI * 0.97 : Math.PI * 0.495
  farGlow.visible = !enabled
  stars.visible = !enabled
  controllers.forEach((c) => c.updateDisplay())
}

function waveHeightAt(x, z, time) {
  return (
    Math.sin(x * 0.032 + time * 0.9) * 0.9 +
    Math.sin(z * 0.041 - time * 1.15) * 0.75 +
    Math.sin((x + z) * 0.02 + time * 0.6) * 1.15
  )
}

const gui = new GUI({ title: 'Water' })
const controllers = [
  gui.add(params, 'preset', Object.keys(presets)).name('preset').onChange(applyPreset),
  gui.add(params, 'elevation', 0, 25, 0.1).name('elevation').onChange(updateSun),
  gui.add(params, 'azimuth', 0, 360, 0.1).name('azimuth').onChange(updateSun),
  gui.add(params, 'exposure', 0.35, 1.2, 0.01).name('exposure').onChange((v) => (renderer.toneMappingExposure = v)),
  gui.add(params, 'distortionScale', 0.5, 8, 0.1).name('distortion').onChange((v) => (water.material.uniforms.distortionScale.value = v)),
  gui.add(params, 'size', 0.1, 2.5, 0.01).name('size').onChange((v) => (water.material.uniforms.size.value = v)),
  gui.add(params, 'underwater').name('underwater').onChange(setUnderwater),
  gui.add(params, 'followBuoy').name('follow buoy'),
]

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset))
})

document.querySelector('#underwater-toggle').addEventListener('click', () => setUnderwater(!params.underwater))
document.querySelector('#camera-toggle').addEventListener('click', () => {
  params.followBuoy = !params.followBuoy
  controllers.forEach((c) => c.updateDisplay())
})
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'u') setUnderwater(!params.underwater)
})

applyPreset('Moonlight')

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  water.material.uniforms.time.value = elapsed / 2.2
  causticDisk.material.uniforms.uTime.value = elapsed

  const buoyX = 0
  const buoyZ = 0
  const buoyY = waveHeightAt(buoyX, buoyZ, elapsed)
  const dx = waveHeightAt(buoyX + 2, buoyZ, elapsed) - waveHeightAt(buoyX - 2, buoyZ, elapsed)
  const dz = waveHeightAt(buoyX, buoyZ + 2, elapsed) - waveHeightAt(buoyX, buoyZ - 2, elapsed)
  buoyGroup.position.set(buoyX, buoyY - 2.4, buoyZ)
  buoyGroup.rotation.z = dx * 0.05
  buoyGroup.rotation.x = -dz * 0.05
  buoyGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.08
  beacon.position.copy(buoyGroup.position).add(new THREE.Vector3(0, 10.2, 0))

  farGlow.lookAt(camera.position)

  if (params.followBuoy) {
    controls.target.lerp(new THREE.Vector3(0, buoyGroup.position.y + 4, 0), 0.08)
  } else {
    controls.target.lerp(new THREE.Vector3(0, params.underwater ? -8 : 3.5, -20), 0.04)
  }

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
