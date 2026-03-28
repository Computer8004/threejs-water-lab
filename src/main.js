import './styles.css'
import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const canvas = document.querySelector('#scene')
const body = document.body

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.62
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x111826, 0.00042)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000)
camera.position.set(30, 18, 44)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(0, 4, -20)
controls.minDistance = 8
controls.maxDistance = 220
controls.maxPolarAngle = Math.PI * 0.495

const ambient = new THREE.HemisphereLight(0x9bb8ff, 0x05070b, 0.22)
scene.add(ambient)

const directional = new THREE.DirectionalLight(0xffffff, 1.4)
directional.castShadow = true
directional.shadow.mapSize.set(2048, 2048)
directional.shadow.camera.near = 1
directional.shadow.camera.far = 400
directional.shadow.camera.left = -150
directional.shadow.camera.right = 150
directional.shadow.camera.top = 150
directional.shadow.camera.bottom = -150
scene.add(directional)
scene.add(directional.target)

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

const water = new Water(new THREE.PlaneGeometry(12000, 12000), {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x081a2f,
  distortionScale: 4.1,
  fog: true,
  alpha: 0.94,
})
water.rotation.x = -Math.PI / 2
scene.add(water)

const oceanFloor = new THREE.Mesh(
  new THREE.CircleGeometry(2800, 128),
  new THREE.MeshStandardMaterial({ color: 0x0e1620, roughness: 1, metalness: 0 })
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
      uIntensity: { value: 0.16 },
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
      uniform float uIntensity;
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
        float alpha = c * radial * uIntensity;
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
  return mesh
}

const rocks = new THREE.Group()
for (const [x, y, z, s] of [
  [0, 8, -45, 9],
  [-120, 18, -220, 24],
  [150, 15, -260, 20],
  [260, 14, 120, 18],
  [-310, 10, 80, 14],
]) rocks.add(makeRock(x, y, z, s))
scene.add(rocks)

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

let underwaterParticles = null
function rebuildUnderwaterParticles() {
  if (underwaterParticles) {
    underwaterParticles.geometry.dispose()
    underwaterParticles.material.dispose()
    scene.remove(underwaterParticles)
  }
  const count = Math.max(10, Math.floor(underwater.particleCount))
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * underwater.farDistance
    positions[i * 3 + 1] = (Math.random() - 0.5) * underwater.farDistance * 0.5
    positions[i * 3 + 2] = (Math.random() - 0.5) * underwater.farDistance
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: underwater.particleColor,
    transparent: true,
    opacity: underwater.particleOpacity,
    size: underwater.particleSize,
    sizeAttenuation: true,
    depthWrite: false,
  })
  underwaterParticles = new THREE.Points(geometry, material)
  underwaterParticles.visible = false
  scene.add(underwaterParticles)
}

const presetConfigs = {
  arctic: { elevation: 8, azimuth: 210, exposure: 0.58, waterColor: '#0f3650', distortionScale: 2.6, size: 0.9, fog: 0.00035, beacon: '#d6f3ff', ambient: 0.2, cloudCoverage: 0.22, particleColor: '#d6f2ff' },
  choppy: { elevation: 6, azimuth: 190, exposure: 0.62, waterColor: '#0d2038', distortionScale: 5.5, size: 1.5, fog: 0.00048, beacon: '#ffe1a1', ambient: 0.2, cloudCoverage: 0.28, particleColor: '#a7d7df' },
  foggy: { elevation: 4, azimuth: 200, exposure: 0.52, waterColor: '#102434', distortionScale: 3.8, size: 1.2, fog: 0.00095, beacon: '#f5f0d8', ambient: 0.24, cloudCoverage: 0.55, particleColor: '#b5d2d8' },
  hurricane: { elevation: 2, azimuth: 182, exposure: 0.44, waterColor: '#07111d', distortionScale: 7.2, size: 1.8, fog: 0.0011, beacon: '#c9e4ff', ambient: 0.12, cloudCoverage: 0.74, particleColor: '#93bdcb' },
  moonlit: { elevation: 6, azimuth: 214, exposure: 0.62, waterColor: '#081a2f', distortionScale: 4.1, size: 1.12, fog: 0.00042, beacon: '#ffcc7a', ambient: 0.22, cloudCoverage: 0.2, particleColor: '#9ecfd8' },
  seaOfThieves: { elevation: 7, azimuth: 235, exposure: 0.68, waterColor: '#0b4357', distortionScale: 4.7, size: 1.18, fog: 0.00045, beacon: '#ffe89d', ambient: 0.28, cloudCoverage: 0.33, particleColor: '#90d5c0' },
  storm: { elevation: 2, azimuth: 178, exposure: 0.55, waterColor: '#0a1726', distortionScale: 5.4, size: 1.55, fog: 0.00075, beacon: '#cde8ff', ambient: 0.18, cloudCoverage: 0.62, particleColor: '#9bbdc9' },
  sunset: { elevation: 1.5, azimuth: 200, exposure: 0.88, waterColor: '#3a295a', distortionScale: 3.4, size: 1.05, fog: 0.00045, beacon: '#ffd39a', ambient: 0.26, cloudCoverage: 0.36, particleColor: '#c4d5bb' },
  tranquil: { elevation: 10, azimuth: 195, exposure: 0.76, waterColor: '#18435d', distortionScale: 1.8, size: 0.7, fog: 0.00028, beacon: '#fff0c3', ambient: 0.35, cloudCoverage: 0.14, particleColor: '#b1d7d6' },
  tropical: { elevation: 5, azimuth: 182, exposure: 0.95, waterColor: '#1b6f8f', distortionScale: 2.2, size: 0.8, fog: 0.00035, beacon: '#e7fff8', ambient: 0.42, cloudCoverage: 0.12, particleColor: '#b8efe5' },
}

const general = {
  preset: 'moonlit',
  quality: 'high',
  wireframe: false,
  clipPlaneDistance: 1000,
}
const waves = {
  animationSpeed: 1,
  amplitude: 1,
  choppiness: 0.72,
  directionalSpreading: 20,
  standingWaveRatio: 0,
  windSpeed: 18,
  windDirection: 214,
}
const appearance = {
  alpha: 0.94,
  deepWaterColor: '#081a2f',
  shallowWaterColor: '#1b6f8f',
  transmissionColor: '#6de2d8',
  depthFalloff: 0.8,
  normalStrength: 1,
  fresnelPower: 3,
  sparkleEnabled: true,
  sparkleIntensity: 1,
  sparkleFadeDistance: 500,
  ssrStrength: 0.8,
  sunIntensity: 1.4,
}
const foam = {
  surfaceEnabled: true,
  surfaceCoverage: 0.4,
  surfaceOpacity: 0.35,
  surfaceSize: 100,
  wavesEnabled: true,
  crestCoverage: 0.55,
  peakIntensity: 0.8,
  shorelineEnabled: true,
  shorelineRange: 220,
  shorelineOpacity: 0.3,
}
const underwater = {
  enabled: false,
  fogDensity: 0.0038,
  fogColor: '#0a425a',
  waterlineEnabled: true,
  sunShaftsEnabled: true,
  sunShaftsIntensity: 0.3,
  surfaceGlowEnabled: true,
  surfaceGlowIntensity: 5.8,
  particlesEnabled: true,
  particleCount: 220,
  particleSize: 1.4,
  particleOpacity: 0.22,
  particleColor: '#9ecfd8',
  nearDistance: 2,
  farDistance: 90,
}
const floor = {
  depth: 140,
  causticsEnabled: true,
  causticsIntensity: 0.16,
  displacementStrength: 0.2,
  tileSize: 400,
}
const skyState = {
  elevation: 6,
  azimuth: 214,
  skyBrightness: 0.62,
  turbidity: 8,
  rayleighCoefficient: 0.45,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  cloudCoverage: 0.2,
  cloudSpeed: 0.05,
}
const buoyancy = {
  followBuoy: false,
  heightOffset: -2.4,
  heightSmoothing: 0.15,
  rotationInfluence: 0.5,
  rotationSmoothing: 0.2,
}
const debug = {
  stars: true,
  glowPanel: true,
}

function applyQuality() {
  const dpr = { low: 1, medium: 1.25, high: Math.min(window.devicePixelRatio, 2), ultra: Math.min(window.devicePixelRatio, 2.5) }[general.quality]
  renderer.setPixelRatio(dpr)
}

function updateSunAndSky() {
  const phi = THREE.MathUtils.degToRad(90 - skyState.elevation)
  const theta = THREE.MathUtils.degToRad(skyState.azimuth)
  sun.setFromSphericalCoords(1, phi, theta)
  sky.material.uniforms.sunPosition.value.copy(sun)
  water.material.uniforms.sunDirection.value.copy(sun).normalize()
  directional.position.copy(sun).multiplyScalar(260)
  directional.target.position.set(0, 0, 0)

  sky.material.uniforms.turbidity.value = skyState.turbidity
  sky.material.uniforms.rayleigh.value = skyState.rayleighCoefficient
  sky.material.uniforms.mieCoefficient.value = skyState.mieCoefficient
  sky.material.uniforms.mieDirectionalG.value = skyState.mieDirectionalG

  if (skyEnvTarget) skyEnvTarget.dispose()
  skyEnvTarget = pmrem.fromScene(sky)
  scene.environment = skyEnvTarget.texture
}

function updateAppearance() {
  water.material.uniforms.alpha.value = appearance.alpha
  water.material.uniforms.waterColor.value.set(appearance.deepWaterColor)
  water.material.uniforms.distortionScale.value = 2 + appearance.normalStrength * waves.choppiness * 3.5
  water.material.uniforms.size.value = THREE.MathUtils.clamp(2.2 - waves.amplitude - waves.choppiness * 0.6, 0.35, 2.2)
  water.material.uniforms.sunColor.value.set(appearance.sparkleEnabled ? 0xffffff : 0xaaaaaa)
  directional.intensity = appearance.sunIntensity
  beacon.intensity = 20 + appearance.sparkleIntensity * 15
  oceanFloor.material.color.set(appearance.shallowWaterColor)
}

function updateFloor() {
  oceanFloor.position.y = -floor.depth
  causticDisk.position.y = -floor.depth + 22
  causticDisk.visible = floor.causticsEnabled
  causticDisk.material.uniforms.uIntensity.value = floor.causticsIntensity
  oceanFloor.scale.setScalar(Math.max(0.5, floor.tileSize / 400))
}

function updateFoamVisuals() {
  const foamGlow = THREE.MathUtils.clamp((foam.surfaceCoverage + foam.crestCoverage + foam.shorelineOpacity) / 3, 0, 1)
  farGlow.material.opacity = debug.glowPanel ? 0.08 + foamGlow * 0.18 : 0
}

function updateUnderwaterVisuals() {
  const enabled = underwater.enabled
  body.classList.toggle('underwater', enabled)
  document.querySelector('.underwater-waterline').style.display = enabled && underwater.waterlineEnabled ? 'block' : 'none'
  scene.fog.color.set(enabled ? underwater.fogColor : 0x111826)
  scene.fog.density = enabled ? underwater.fogDensity : presetConfigs[general.preset].fog
  stars.visible = !enabled && debug.stars
  farGlow.visible = !enabled || underwater.surfaceGlowEnabled
  if (underwaterParticles) {
    underwaterParticles.visible = enabled && underwater.particlesEnabled
    underwaterParticles.material.opacity = underwater.particleOpacity
    underwaterParticles.material.size = underwater.particleSize
    underwaterParticles.material.color.set(underwater.particleColor)
  }
  controls.maxPolarAngle = enabled ? Math.PI * 0.97 : Math.PI * 0.495
  controls.target.y = enabled ? -8 : 4
}

function applyPreset(name) {
  const preset = presetConfigs[name]
  if (!preset) return
  general.preset = name
  skyState.elevation = preset.elevation
  skyState.azimuth = preset.azimuth
  skyState.skyBrightness = preset.exposure
  waves.choppiness = THREE.MathUtils.clamp((preset.distortionScale - 1.5) / 5.5, 0.2, 1.2)
  waves.amplitude = THREE.MathUtils.clamp((preset.size + preset.distortionScale) / 3.4, 0.5, 1.6)
  waves.windSpeed = 12 + waves.choppiness * 18
  waves.windDirection = preset.azimuth
  appearance.deepWaterColor = preset.waterColor
  appearance.shallowWaterColor = name === 'tropical' ? '#37d5cc' : name === 'sunset' ? '#8f65b0' : '#295a7a'
  appearance.transmissionColor = name === 'arctic' ? '#c8f0ff' : '#7be3d8'
  appearance.sunIntensity = 0.9 + preset.exposure
  appearance.sparkleIntensity = 0.7 + preset.exposure
  foam.surfaceCoverage = 0.25 + waves.choppiness * 0.28
  foam.crestCoverage = 0.35 + waves.choppiness * 0.4
  foam.shorelineOpacity = 0.22 + waves.amplitude * 0.12
  floor.causticsIntensity = name === 'storm' || name === 'hurricane' ? 0.05 : 0.16
  floor.tileSize = name === 'tranquil' ? 520 : 400
  underwater.particleColor = preset.particleColor
  ambient.intensity = preset.ambient
  renderer.toneMappingExposure = preset.exposure
  scene.fog.density = preset.fog
  beacon.color.set(preset.beacon)
  skyState.cloudCoverage = preset.cloudCoverage
  skyState.turbidity = name === 'storm' || name === 'hurricane' ? 11 : name === 'sunset' ? 12 : 8
  skyState.rayleighCoefficient = name === 'tropical' ? 1.2 : name === 'sunset' ? 0.7 : 0.45
  skyState.mieCoefficient = name === 'storm' || name === 'hurricane' ? 0.012 : 0.005
  skyState.mieDirectionalG = name === 'storm' || name === 'hurricane' ? 0.92 : 0.8
  updateSunAndSky()
  updateAppearance()
  updateFloor()
  updateFoamVisuals()
  rebuildUnderwaterParticles()
  updateUnderwaterVisuals()
  syncGui()
}

function syncGui() {
  controllers.forEach((c) => c.updateDisplay())
}

function setUnderwater(enabled) {
  underwater.enabled = enabled
  if (enabled) camera.position.y = Math.min(camera.position.y, -12)
  else camera.position.y = Math.max(camera.position.y, 18)
  updateUnderwaterVisuals()
  syncGui()
}

function waveHeightAt(x, z, time) {
  const directionRad = THREE.MathUtils.degToRad(waves.windDirection)
  const dirX = Math.cos(directionRad)
  const dirZ = Math.sin(directionRad)
  const windFactor = waves.windSpeed / 20
  const a = Math.sin((x * dirX * 0.03 + z * dirZ * 0.03) + time * 0.9 * waves.animationSpeed) * 0.9
  const b = Math.sin((z * 0.041 - time * 1.15 * waves.animationSpeed) + directionRad) * 0.75
  const c = Math.sin((x + z) * 0.02 + time * 0.6 * waves.animationSpeed) * 1.15
  return (a + b + c) * waves.amplitude * (0.55 + windFactor * 0.25)
}

rebuildUnderwaterParticles()
applyQuality()
applyPreset('moonlit')

const gui = new GUI({ title: 'Water Pro-ish Controls' })
const controllers = []

const generalFolder = gui.addFolder('General')
controllers.push(
  generalFolder.add(general, 'preset', Object.keys(presetConfigs)).name('preset').onChange(applyPreset),
  generalFolder.add(general, 'quality', ['low', 'medium', 'high', 'ultra']).name('quality').onChange(applyQuality),
  generalFolder.add(general, 'wireframe').name('wireframe').onChange((v) => {
    oceanFloor.material.wireframe = v
    Array.from(rocks.children).forEach((rock) => (rock.material.wireframe = v))
  }),
  generalFolder.add(general, 'clipPlaneDistance', 100, 4000, 1).name('clipPlaneDistance').onChange((v) => {
    camera.far = v
    camera.updateProjectionMatrix()
  })
)

generalFolder.close()

const wavesFolder = gui.addFolder('Waves')
controllers.push(
  wavesFolder.add(waves, 'animationSpeed', 0, 3, 0.01).name('animationSpeed'),
  wavesFolder.add(waves, 'amplitude', 0.2, 2.5, 0.01).name('amplitude'),
  wavesFolder.add(waves, 'choppiness', 0.1, 1.5, 0.01).name('choppiness').onChange(updateAppearance),
  wavesFolder.add(waves, 'directionalSpreading', 0, 50, 0.1).name('directionalSpreading'),
  wavesFolder.add(waves, 'standingWaveRatio', 0, 1, 0.01).name('standingWaveRatio'),
  wavesFolder.add(waves, 'windSpeed', 1, 50, 0.1).name('windSpeed'),
  wavesFolder.add(waves, 'windDirection', 0, 360, 0.1).name('windDirection')
)

const appearanceFolder = gui.addFolder('Appearance')
controllers.push(
  appearanceFolder.addColor(appearance, 'deepWaterColor').name('deepWaterColor').onChange(updateAppearance),
  appearanceFolder.addColor(appearance, 'shallowWaterColor').name('shallowWaterColor').onChange(updateAppearance),
  appearanceFolder.addColor(appearance, 'transmissionColor').name('transmissionColor'),
  appearanceFolder.add(appearance, 'alpha', 0.1, 1, 0.01).name('alpha').onChange(updateAppearance),
  appearanceFolder.add(appearance, 'depthFalloff', 0, 2, 0.01).name('depthFalloff'),
  appearanceFolder.add(appearance, 'normalStrength', 0, 2, 0.01).name('normalStrength').onChange(updateAppearance),
  appearanceFolder.add(appearance, 'fresnelPower', 0.5, 8, 0.01).name('fresnel.power'),
  appearanceFolder.add(appearance, 'sparkleEnabled').name('sparkle.enabled').onChange(updateAppearance),
  appearanceFolder.add(appearance, 'sparkleIntensity', 0, 3, 0.01).name('sparkle.intensity').onChange(updateAppearance),
  appearanceFolder.add(appearance, 'sparkleFadeDistance', 50, 2000, 1).name('sparkle.fadeDistance'),
  appearanceFolder.add(appearance, 'ssrStrength', 0, 1.5, 0.01).name('ssr.strength'),
  appearanceFolder.add(appearance, 'sunIntensity', 0, 3, 0.01).name('sun.intensity').onChange(updateAppearance)
)

const foamFolder = gui.addFolder('Foam')
controllers.push(
  foamFolder.add(foam, 'surfaceEnabled').name('foam.surface.enabled').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'surfaceCoverage', 0, 1, 0.01).name('foam.surface.coverage').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'surfaceOpacity', 0, 1, 0.01).name('foam.surface.opacity').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'surfaceSize', 20, 300, 1).name('foam.surface.size').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'wavesEnabled').name('foam.waves.enabled').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'crestCoverage', 0, 1, 0.01).name('foam.waves.crestCoverage').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'peakIntensity', 0, 2, 0.01).name('foam.waves.peakIntensity').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'shorelineEnabled').name('foam.shoreline.enabled').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'shorelineRange', 20, 600, 1).name('foam.shoreline.range').onChange(updateFoamVisuals),
  foamFolder.add(foam, 'shorelineOpacity', 0, 1, 0.01).name('foam.shoreline.opacity').onChange(updateFoamVisuals)
)

const underwaterFolder = gui.addFolder('Underwater')
controllers.push(
  underwaterFolder.add(underwater, 'enabled').name('underwater.enabled').onChange(setUnderwater),
  underwaterFolder.addColor(underwater, 'fogColor').name('underwater.fog.color').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'fogDensity', 0.0005, 0.01, 0.0001).name('underwater.fog.density').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'waterlineEnabled').name('waterline.enabled').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'sunShaftsEnabled').name('sunShafts.enabled'),
  underwaterFolder.add(underwater, 'sunShaftsIntensity', 0, 1, 0.01).name('sunShafts.intensity'),
  underwaterFolder.add(underwater, 'surfaceGlowEnabled').name('surfaceGlow.enabled').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'surfaceGlowIntensity', 0, 10, 0.01).name('surfaceGlow.intensity'),
  underwaterFolder.add(underwater, 'particlesEnabled').name('particles.enabled').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'particleCount', 20, 500, 1).name('particles.count').onFinishChange(rebuildUnderwaterParticles),
  underwaterFolder.add(underwater, 'particleSize', 0.1, 4, 0.01).name('particles.size').onChange(updateUnderwaterVisuals),
  underwaterFolder.add(underwater, 'particleOpacity', 0, 1, 0.01).name('particles.opacity').onChange(updateUnderwaterVisuals),
  underwaterFolder.addColor(underwater, 'particleColor').name('particles.color').onFinishChange(rebuildUnderwaterParticles),
  underwaterFolder.add(underwater, 'nearDistance', 0.1, 10, 0.1).name('particles.nearDistance'),
  underwaterFolder.add(underwater, 'farDistance', 10, 200, 1).name('particles.farDistance').onFinishChange(rebuildUnderwaterParticles)
)

const floorFolder = gui.addFolder('Ocean Floor')
controllers.push(
  floorFolder.add(floor, 'depth', 40, 300, 1).name('depth').onChange(updateFloor),
  floorFolder.add(floor, 'causticsEnabled').name('caustics.enabled').onChange(updateFloor),
  floorFolder.add(floor, 'causticsIntensity', 0, 0.5, 0.01).name('caustics.intensity').onChange(updateFloor),
  floorFolder.add(floor, 'displacementStrength', 0, 1, 0.01).name('displacementStrength'),
  floorFolder.add(floor, 'tileSize', 100, 800, 1).name('tileSize').onChange(updateFloor)
)

const skyFolder = gui.addFolder('Sky')
controllers.push(
  skyFolder.add(skyState, 'elevation', 0, 25, 0.1).name('sun.elevation').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'azimuth', 0, 360, 0.1).name('sun.azimuth').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'skyBrightness', 0.35, 1.3, 0.01).name('atmosphere.skyBrightness').onChange((v) => (renderer.toneMappingExposure = v)),
  skyFolder.add(skyState, 'turbidity', 1, 20, 0.1).name('atmosphere.turbidity').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'rayleighCoefficient', 0, 2, 0.01).name('atmosphere.rayleigh').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'mieCoefficient', 0, 0.03, 0.0001).name('atmosphere.mieCoefficient').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'mieDirectionalG', 0, 0.99, 0.001).name('atmosphere.mieDirectionalG').onChange(updateSunAndSky),
  skyFolder.add(skyState, 'cloudCoverage', 0, 1, 0.01).name('clouds.coverage'),
  skyFolder.add(skyState, 'cloudSpeed', 0, 1, 0.01).name('clouds.speed')
)

const buoyancyFolder = gui.addFolder('Buoyancy')
controllers.push(
  buoyancyFolder.add(buoyancy, 'followBuoy').name('follow buoy'),
  buoyancyFolder.add(buoyancy, 'heightOffset', -6, 2, 0.01).name('heightOffset'),
  buoyancyFolder.add(buoyancy, 'heightSmoothing', 0, 1, 0.01).name('heightSmoothing'),
  buoyancyFolder.add(buoyancy, 'rotationInfluence', 0, 1, 0.01).name('rotationInfluence'),
  buoyancyFolder.add(buoyancy, 'rotationSmoothing', 0, 1, 0.01).name('rotationSmoothing')
)

const debugFolder = gui.addFolder('Debug')
controllers.push(
  debugFolder.add(debug, 'stars').name('stars').onChange((v) => { if (!underwater.enabled) stars.visible = v }),
  debugFolder.add(debug, 'glowPanel').name('far glow').onChange(updateFoamVisuals)
)

function handlePresetButton(name) {
  applyPreset(name)
}

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => handlePresetButton(button.dataset.preset))
})
document.querySelector('#underwater-toggle').addEventListener('click', () => setUnderwater(!underwater.enabled))
document.querySelector('#camera-toggle').addEventListener('click', () => {
  buoyancy.followBuoy = !buoyancy.followBuoy
  syncGui()
})
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'u') setUnderwater(!underwater.enabled)
})

const clock = new THREE.Clock()
let smoothedBuoyY = 0
let smoothedRotX = 0
let smoothedRotZ = 0

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  water.material.uniforms.time.value = (elapsed / 2.2) * waves.animationSpeed
  causticDisk.material.uniforms.uTime.value = elapsed * (0.6 + skyState.cloudSpeed * 2)

  const buoyX = 0
  const buoyZ = 0
  const buoyY = waveHeightAt(buoyX, buoyZ, elapsed)
  const dx = waveHeightAt(buoyX + 2, buoyZ, elapsed) - waveHeightAt(buoyX - 2, buoyZ, elapsed)
  const dz = waveHeightAt(buoyX, buoyZ + 2, elapsed) - waveHeightAt(buoyX, buoyZ - 2, elapsed)
  smoothedBuoyY = THREE.MathUtils.lerp(smoothedBuoyY, buoyY, 1 - buoyancy.heightSmoothing)
  smoothedRotZ = THREE.MathUtils.lerp(smoothedRotZ, dx * 0.05 * buoyancy.rotationInfluence, 1 - buoyancy.rotationSmoothing)
  smoothedRotX = THREE.MathUtils.lerp(smoothedRotX, -dz * 0.05 * buoyancy.rotationInfluence, 1 - buoyancy.rotationSmoothing)

  buoyGroup.position.set(buoyX, smoothedBuoyY + buoyancy.heightOffset, buoyZ)
  buoyGroup.rotation.z = smoothedRotZ
  buoyGroup.rotation.x = smoothedRotX
  buoyGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.08
  beacon.position.copy(buoyGroup.position).add(new THREE.Vector3(0, 10.2, 0))

  if (underwaterParticles) {
    underwaterParticles.position.copy(camera.position)
    underwaterParticles.rotation.y = elapsed * 0.03
  }

  farGlow.lookAt(camera.position)

  if (buoyancy.followBuoy) {
    controls.target.lerp(new THREE.Vector3(0, buoyGroup.position.y + 4, 0), 0.08)
  } else {
    controls.target.lerp(new THREE.Vector3(0, underwater.enabled ? -8 : 4, -20), 0.04)
  }

  updateAppearance()
  controls.update()
  renderer.render(scene, camera)
}

updateUnderwaterVisuals()
animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  applyQuality()
})
