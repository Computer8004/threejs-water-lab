import './styles.css'
import * as THREE from 'three'
import GUI from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvas = document.querySelector('#scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2('#8bc8ff', 0.0025)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(18, 7.5, 18)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(0, 1.8, 0)
controls.maxPolarAngle = Math.PI * 0.49
controls.minDistance = 4
controls.maxDistance = 65

const ambientLight = new THREE.HemisphereLight('#9cd6ff', '#0b1320', 0.8)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight('#fff5d1', 1.6)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 90
sunLight.shadow.camera.left = -40
sunLight.shadow.camera.right = 40
sunLight.shadow.camera.top = 40
sunLight.shadow.camera.bottom = -40
scene.add(sunLight)
scene.add(sunLight.target)

const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 32, 32),
  new THREE.MeshBasicMaterial({ color: '#ffdba0', transparent: true, opacity: 0.95 })
)
scene.add(sunSphere)

const skyGeometry = new THREE.SphereGeometry(240, 48, 24)
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color('#72bfff') },
    horizonColor: { value: new THREE.Color('#d7efff') },
    bottomColor: { value: new THREE.Color('#03111f') },
    offset: { value: 18 },
    exponent: { value: 0.8 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;

    void main() {
      float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
      float horizonMix = clamp(pow(max(h, 0.0), exponent), 0.0, 1.0);
      vec3 color = mix(horizonColor, topColor, horizonMix);
      color = mix(bottomColor, color, smoothstep(-0.4, 0.18, h));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
})
scene.add(new THREE.Mesh(skyGeometry, skyMaterial))

const floorMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#113b49') },
    uColorB: { value: new THREE.Color('#0f1824') },
    uCausticColor: { value: new THREE.Color('#96fff2') },
    uDepthFade: { value: 24 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uCausticColor;
    uniform float uDepthFade;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    float caustic(vec2 p) {
      float waveA = sin(p.x * 12.0 + uTime * 1.6);
      float waveB = sin((p.y * 11.0 - uTime * 1.2) + waveA * 0.8);
      float waveC = sin((p.x + p.y) * 14.0 + uTime * 1.8);
      return smoothstep(1.4, 2.2, waveA + waveB + waveC + 1.2);
    }

    void main() {
      vec2 uv = vUv * 2.2;
      float c = caustic(uv + vec2(vWorldPos.x, vWorldPos.z) * 0.03);
      float depthMix = clamp((-vWorldPos.y) / uDepthFade, 0.0, 1.0);
      vec3 base = mix(uColorA, uColorB, depthMix);
      base += uCausticColor * c * (1.0 - depthMix) * 0.5;
      gl_FragColor = vec4(base, 1.0);
    }
  `,
})

const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 1, 1), floorMaterial)
floor.rotation.x = -Math.PI / 2
floor.position.y = -10
scene.add(floor)

const waterUniforms = {
  uTime: { value: 0 },
  uDeepColor: { value: new THREE.Color('#0d4a73') },
  uShallowColor: { value: new THREE.Color('#40d0d8') },
  uFoamColor: { value: new THREE.Color('#dffcff') },
  uSkyReflection: { value: new THREE.Color('#d7efff') },
  uSunDir: { value: new THREE.Vector3(0.6, 0.75, 0.3).normalize() },
  uSunColor: { value: new THREE.Color('#fff3be') },
  uWaveAmp: { value: 1.35 },
  uWaveScale: { value: 0.16 },
  uWaveSpeed: { value: 0.55 },
  uFoamAmount: { value: 0.68 },
  uChoppiness: { value: 0.72 },
  uDepthColorStrength: { value: 0.8 },
  uUnderwater: { value: 0 },
}

const waterMaterial = new THREE.ShaderMaterial({
  transparent: false,
  uniforms: waterUniforms,
  side: THREE.DoubleSide,
  vertexShader: `
    uniform float uTime;
    uniform float uWaveAmp;
    uniform float uWaveScale;
    uniform float uWaveSpeed;
    uniform float uChoppiness;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;
    varying vec2 vUv;

    vec2 waveDir(float angle) {
      return vec2(cos(angle), sin(angle));
    }

    float waveHeight(vec2 p) {
      float t = uTime * uWaveSpeed;
      float h = 0.0;
      h += sin(dot(p, waveDir(0.2)) * 1.2 + t * 1.8) * 0.55;
      h += sin(dot(p, waveDir(1.1)) * 1.9 - t * 1.4) * 0.35;
      h += sin(dot(p, waveDir(2.4)) * 2.8 + t * 1.2) * 0.2;
      h += sin(dot(p, waveDir(0.8)) * 5.2 + t * 2.6) * 0.08;
      return h;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      vec2 p = pos.xz * uWaveScale;
      float height = waveHeight(p) * uWaveAmp;
      pos.y += height;
      pos.x += sin(p.y * 3.0 + uTime * 1.2) * uChoppiness * 0.12;
      pos.z += cos(p.x * 2.6 + uTime * 1.1) * uChoppiness * 0.12;

      float eps = 0.08;
      float hx = waveHeight((pos.xz + vec2(eps, 0.0)) * uWaveScale) * uWaveAmp;
      float hz = waveHeight((pos.xz + vec2(0.0, eps)) * uWaveScale) * uWaveAmp;
      vec3 tangent = normalize(vec3(eps, hx - height, 0.0));
      vec3 bitangent = normalize(vec3(0.0, hz - height, eps));
      vec3 normal = normalize(cross(bitangent, tangent));

      vec4 world = modelMatrix * vec4(pos, 1.0);
      vWorldPos = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vHeight = height;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSkyReflection;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform float uFoamAmount;
    uniform float uDepthColorStrength;
    uniform float uUnderwater;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    varying float vHeight;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    void main() {
      vec3 normal = normalize(vNormalW);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.4);
      float crest = smoothstep(0.55, 1.15, vHeight);
      float foamNoise = hash21(vUv * 140.0 + uTime * 0.08 + vWorldPos.xz * 0.1);
      float foam = smoothstep(0.45, 0.98, crest + foamNoise * 0.6) * uFoamAmount;
      float depthTint = clamp((vWorldPos.y + 6.0) / 8.0, 0.0, 1.0);
      vec3 waterColor = mix(uDeepColor, uShallowColor, depthTint * uDepthColorStrength);

      vec3 halfVec = normalize(viewDir + normalize(uSunDir));
      float spec = pow(max(dot(normal, halfVec), 0.0), 120.0) * 1.8;
      spec += pow(max(dot(normal, halfVec), 0.0), 12.0) * 0.25;

      vec3 color = mix(waterColor, uSkyReflection, fresnel * 0.9);
      color += uSunColor * spec;
      color = mix(color, uFoamColor, foam);

      if (uUnderwater > 0.5) {
        float murk = smoothstep(-2.0, 1.5, vWorldPos.y);
        color = mix(vec3(0.01, 0.09, 0.16), color, 0.55);
        color += vec3(0.0, 0.12, 0.14) * (1.0 - murk);
      }

      gl_FragColor = vec4(color, 0.98);
    }
  `,
})

const waterGeometry = new THREE.PlaneGeometry(180, 180, 320, 320)
const water = new THREE.Mesh(waterGeometry, waterMaterial)
water.rotation.x = -Math.PI / 2
water.receiveShadow = true
scene.add(water)

const buoyGroup = new THREE.Group()
const buoyBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.48, 0.72, 2.8, 24),
  new THREE.MeshStandardMaterial({ color: '#ff6b4a', metalness: 0.1, roughness: 0.6 })
)
buoyBase.castShadow = true
buoyBase.receiveShadow = true
buoyBase.position.y = 1.4

const buoyStripe = new THREE.Mesh(
  new THREE.CylinderGeometry(0.53, 0.68, 0.45, 24),
  new THREE.MeshStandardMaterial({ color: '#fff8ef', metalness: 0.04, roughness: 0.48 })
)
buoyStripe.position.y = 2.0

const buoyTop = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 24, 24),
  new THREE.MeshStandardMaterial({ color: '#ffd35f', emissive: '#7a4700', emissiveIntensity: 0.4 })
)
buoyTop.position.y = 3.05

const buoyPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12),
  new THREE.MeshStandardMaterial({ color: '#3b4658', metalness: 0.5, roughness: 0.4 })
)
buoyPole.position.y = 2.6

const buoyRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.62, 0.06, 12, 36),
  new THREE.MeshStandardMaterial({ color: '#2f3846', metalness: 0.35, roughness: 0.48 })
)
buoyRing.rotation.x = Math.PI / 2
buoyRing.position.y = 1.5

buoyGroup.add(buoyBase, buoyStripe, buoyTop, buoyPole, buoyRing)
scene.add(buoyGroup)

const markerFloat = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 16),
  new THREE.MeshStandardMaterial({ color: '#bff6ff', emissive: '#50b4d1', emissiveIntensity: 1.4 })
)
markerFloat.castShadow = true
scene.add(markerFloat)

const presets = {
  Tropical: {
    skyTop: '#70c4ff',
    horizon: '#e5f7ff',
    fog: '#89d9ff',
    deep: '#0f5f88',
    shallow: '#3ff2d6',
    foam: '#f0ffff',
    caustic: '#91fff1',
    sun: '#ffe09e',
    sunPos: [22, 26, 10],
    exposure: 1.12,
    waveAmp: 1.05,
    speed: 0.52,
    choppiness: 0.55,
    foamAmount: 0.5,
  },
  Storm: {
    skyTop: '#2d4268',
    horizon: '#92a8c5',
    fog: '#61748e',
    deep: '#10233d',
    shallow: '#1b4f72',
    foam: '#eef8ff',
    caustic: '#6fd7ff',
    sun: '#d3e8ff',
    sunPos: [-18, 16, -8],
    exposure: 0.82,
    waveAmp: 1.95,
    speed: 0.82,
    choppiness: 1.05,
    foamAmount: 0.92,
  },
  Sunset: {
    skyTop: '#533c87',
    horizon: '#ffb17d',
    fog: '#b56f78',
    deep: '#1d2358',
    shallow: '#824e8f',
    foam: '#fff1de',
    caustic: '#ffcb97',
    sun: '#ffc27e',
    sunPos: [25, 8, 2],
    exposure: 1.0,
    waveAmp: 1.28,
    speed: 0.5,
    choppiness: 0.68,
    foamAmount: 0.62,
  },
  Moonlight: {
    skyTop: '#102041',
    horizon: '#5f80ba',
    fog: '#34507f',
    deep: '#081224',
    shallow: '#11417e',
    foam: '#e9f6ff',
    caustic: '#7dd4ff',
    sun: '#d9ecff',
    sunPos: [12, 22, -24],
    exposure: 0.78,
    waveAmp: 1.18,
    speed: 0.45,
    choppiness: 0.62,
    foamAmount: 0.56,
  },
}

const params = {
  preset: 'Tropical',
  underwater: false,
  followBuoy: false,
  waveAmp: 1.05,
  waveSpeed: 0.52,
  choppiness: 0.55,
  foamAmount: 0.5,
}

function setColor(target, value) {
  target.set(value)
}

function applyPreset(name) {
  const preset = presets[name]
  if (!preset) return

  params.preset = name
  params.waveAmp = preset.waveAmp
  params.waveSpeed = preset.speed
  params.choppiness = preset.choppiness
  params.foamAmount = preset.foamAmount

  setColor(skyMaterial.uniforms.topColor.value, preset.skyTop)
  setColor(skyMaterial.uniforms.horizonColor.value, preset.horizon)
  setColor(skyMaterial.uniforms.bottomColor.value, '#03101c')

  setColor(waterUniforms.uDeepColor.value, preset.deep)
  setColor(waterUniforms.uShallowColor.value, preset.shallow)
  setColor(waterUniforms.uFoamColor.value, preset.foam)
  setColor(waterUniforms.uSkyReflection.value, preset.horizon)
  setColor(waterUniforms.uSunColor.value, preset.sun)
  setColor(floorMaterial.uniforms.uColorA.value, preset.deep)
  setColor(floorMaterial.uniforms.uColorB.value, '#0a1320')
  setColor(floorMaterial.uniforms.uCausticColor.value, preset.caustic)

  scene.fog.color.set(preset.fog)
  renderer.toneMappingExposure = preset.exposure
  waterUniforms.uWaveAmp.value = preset.waveAmp
  waterUniforms.uWaveSpeed.value = preset.speed
  waterUniforms.uChoppiness.value = preset.choppiness
  waterUniforms.uFoamAmount.value = preset.foamAmount

  sunLight.position.set(...preset.sunPos)
  sunLight.target.position.set(0, 0, 0)
  sunLight.color.set(preset.sun)
  ambientLight.color.set(preset.horizon)
  ambientLight.groundColor.set('#08101d')
  ambientLight.intensity = name === 'Storm' ? 0.45 : 0.8

  sunSphere.position.copy(sunLight.position)
  sunSphere.material.color.set(preset.sun)
  waterUniforms.uSunDir.value.copy(sunLight.position).normalize()

  syncGui()
}

function syncGui() {
  controllers.forEach((controller) => controller.updateDisplay())
}

function setUnderwaterMode(enabled) {
  params.underwater = enabled
  waterUniforms.uUnderwater.value = enabled ? 1 : 0
  camera.position.y = enabled ? -1.5 : Math.max(camera.position.y, 4.5)
  controls.maxPolarAngle = enabled ? Math.PI * 0.96 : Math.PI * 0.49
  scene.fog.density = enabled ? 0.016 : 0.0025
  syncGui()
}

function waveHeightAt(x, z, time = clock.getElapsedTime()) {
  const scale = waterUniforms.uWaveScale.value
  const speed = waterUniforms.uWaveSpeed.value
  const amp = waterUniforms.uWaveAmp.value
  const t = time * speed
  const pX = x * scale
  const pZ = z * scale

  let h = 0
  h += Math.sin((pX * Math.cos(0.2) + pZ * Math.sin(0.2)) * 1.2 + t * 1.8) * 0.55
  h += Math.sin((pX * Math.cos(1.1) + pZ * Math.sin(1.1)) * 1.9 - t * 1.4) * 0.35
  h += Math.sin((pX * Math.cos(2.4) + pZ * Math.sin(2.4)) * 2.8 + t * 1.2) * 0.2
  h += Math.sin((pX * Math.cos(0.8) + pZ * Math.sin(0.8)) * 5.2 + t * 2.6) * 0.08
  return h * amp
}

const gui = new GUI({ title: 'Water Lab controls' })
const controllers = [
  gui.add(params, 'preset', Object.keys(presets)).name('Preset').onChange(applyPreset),
  gui.add(params, 'waveAmp', 0.5, 2.5, 0.01).name('Wave height').onChange((value) => {
    waterUniforms.uWaveAmp.value = value
  }),
  gui.add(params, 'waveSpeed', 0.2, 1.2, 0.01).name('Wave speed').onChange((value) => {
    waterUniforms.uWaveSpeed.value = value
  }),
  gui.add(params, 'choppiness', 0.1, 1.4, 0.01).name('Choppiness').onChange((value) => {
    waterUniforms.uChoppiness.value = value
  }),
  gui.add(params, 'foamAmount', 0.1, 1.2, 0.01).name('Foam').onChange((value) => {
    waterUniforms.uFoamAmount.value = value
  }),
  gui.add(params, 'underwater').name('Underwater').onChange(setUnderwaterMode),
  gui.add(params, 'followBuoy').name('Center buoy'),
]

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset))
})

document.querySelector('#underwater-toggle').addEventListener('click', () => {
  setUnderwaterMode(!params.underwater)
})

document.querySelector('#camera-toggle').addEventListener('click', () => {
  params.followBuoy = !params.followBuoy
  syncGui()
})

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'u') setUnderwaterMode(!params.underwater)
})

const clock = new THREE.Clock()
applyPreset('Tropical')

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  waterUniforms.uTime.value = elapsed
  floorMaterial.uniforms.uTime.value = elapsed

  const buoyX = 0
  const buoyZ = 0
  const buoyY = waveHeightAt(buoyX, buoyZ, elapsed)
  const sampleX = waveHeightAt(buoyX + 0.8, buoyZ, elapsed) - waveHeightAt(buoyX - 0.8, buoyZ, elapsed)
  const sampleZ = waveHeightAt(buoyX, buoyZ + 0.8, elapsed) - waveHeightAt(buoyX, buoyZ - 0.8, elapsed)

  buoyGroup.position.set(buoyX, buoyY - 0.65, buoyZ)
  buoyGroup.rotation.z = sampleX * 0.14
  buoyGroup.rotation.x = -sampleZ * 0.14
  buoyGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.06

  markerFloat.position.set(5.5, waveHeightAt(5.5, -3.5, elapsed) + 0.3, -3.5)

  if (params.followBuoy) {
    controls.target.lerp(new THREE.Vector3(0, buoyGroup.position.y + 1.4, 0), 0.08)
  } else {
    controls.target.lerp(new THREE.Vector3(0, params.underwater ? -0.3 : 1.8, 0), 0.05)
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
