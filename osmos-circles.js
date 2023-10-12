  const lerp = (a, b, n) => {
    return (1 - n) * a + n * b
  }

  const main = () => {
    // Canvas
    const canvas = document.querySelectorAll(".webglCircle")

    // Scene
    const scene = new THREE.Scene()

    // Sizes
    const serviceCircle1 = document.querySelector('.service-circle-1')
    const serviceCircle2 = document.querySelector('.service-circle-2')
    const serviceCircle3 = document.querySelector('.service-circle-3')
    const sizes = {
      width: serviceCircle1.clientWidth * 1.03,
      height: serviceCircle1.clientHeight * 1.03,
    }

    // Base camera
    const camera = new THREE.PerspectiveCamera(
      45,
      sizes.width / sizes.height,
      0.1,
      100
    )
    camera.position.set(0, 0, 1.5)
    scene.add(camera)

    // Visible Sizes
    const visibleSizes = {
      width: 0,
      height: 0,
    }

    const depth = camera.position.z
    const vFOV = (camera.fov * Math.PI) / 180
    visibleSizes.height = 2 * Math.tan(vFOV / 2) * Math.abs(depth)
    visibleSizes.width = (visibleSizes.height * sizes.width) / sizes.height

    // Resize
    window.addEventListener("resize", () => {
      // Update sizes
      sizes.width = serviceCircle1.clientWidth * 1.03
      sizes.height = serviceCircle1.clientHeight * 1.03

      visibleSizes.height = 2 * Math.tan(vFOV / 2) * Math.abs(depth)
      visibleSizes.width = (visibleSizes.height * sizes.width) / sizes.height

      newMesh.material.uniforms.uSize.value = new THREE.Vector2(visibleSizes.width, visibleSizes.height)

      // Gets and stores converted image sizes
      meshData.size.w = visibleSizes.width
      meshData.size.h = visibleSizes.height

      // Sets new size and position
      newMesh.scale.set(
          meshData.size.w,
          meshData.size.h,
          1
      )

      // Update camera
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()

      for (let i = 0; i < canvas.length; i++) {
        // Update renderer
        renderer[i].setSize(sizes.width, sizes.height)
        renderer[i].setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }
    })

    // Creat Meshes
    const webglCircle = document.querySelector('.webgl-circle')
    const meshData = {
    position: { x: 0, y: 0 },
    size: { w: visibleSizes.width, h: visibleSizes.height },
    color1: new THREE.Color(0x12110f),
    color2: new THREE.Color(0x32312f),
    }

    const meshGeometry = new THREE.PlaneGeometry(3, 3, 256, 256)
    const meshMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: meshData.color1 },
            uColor2: { value: meshData.color2 },
            uOpacity: { value: 1 },
            uSize: { value: new THREE.Vector2(visibleSizes.width, visibleSizes.height) },
            uReposition: { value: new THREE.Vector2(0, 0) },
            uSpeed: {value: 0},
            uRipple: {value: 0.15}
        },
        vertexShader: `
            uniform float uTime;
            uniform vec2 uSize;
            uniform vec2 uReposition;
            uniform float uSpeed;
            uniform float uRipple;

            varying vec2 vUv;
            varying vec3 vPosition;
            varying float vAmp;

            float PI = 3.141592;
           
            void main() {
                vPosition = position;

                float distance = distance(vPosition.xy, uReposition);

                vAmp += sin(-uTime * 6.5 + distance * 25.) * 0.1;
                vAmp = max(vAmp, 0.) * max(0., uSize.x * 1.25 - distance) * uRipple;

                vPosition.z += vAmp;

                vec4 mvPosition = modelViewMatrix * vec4( vPosition, 1.0 );
                gl_Position = projectionMatrix * mvPosition;

                vUv = uv;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform float uOpacity;

            varying vec2 vUv;
            varying vec3 vPosition;
            varying float vAmp;

            float random(float x) {
            return fract(sin(x) * 5000.);
            }

            float noise(vec2 p) {
            return random(p.x + p.y * 5000.);
            }

            vec2 sw(vec2 p) { return vec2(floor(p.x), floor(p.y)); }
            vec2 se(vec2 p) { return vec2(ceil(p.x), floor(p.y)); }
            vec2 nw(vec2 p) { return vec2(floor(p.x), ceil(p.y)); }
            vec2 ne(vec2 p) { return vec2(ceil(p.x), ceil(p.y)); }

            float smoothNoise(vec2 p) {
            vec2 interp = smoothstep(0., 1., fract(p));
            float s = mix(noise(sw(p)), noise(se(p)), interp.x);
            float n = mix(noise(nw(p)), noise(ne(p)), interp.x);
            return mix(s, n, interp.y);
            }

            float fractalNoise(vec2 p) {
            float x = 0.;
            x += smoothNoise(p      );
            x += smoothNoise(p * 2. ) / 2.;
            x += smoothNoise(p * 4. ) / 4.;
            x += smoothNoise(p * 8. ) / 8.;
            x += smoothNoise(p * 16.) / 16.;
            x /= 1. + 1./2. + 1./4. + 1./8. + 1./16.;
            return x;
            }

            float movingNoise(vec2 p) {
            float x = fractalNoise(p + uTime);
            float y = fractalNoise(p - uTime);
            return fractalNoise(p + vec2(x, y));   
            }

            float nestedNoise(vec2 p) {
            float x = movingNoise(p);
            float y = movingNoise(p + 100.);
            return movingNoise(p + vec2(x, y));
            }

            void main() {
                float n = nestedNoise(vUv * 6.);
                gl_FragColor = vec4(mix(uColor1, uColor2, n) + vAmp, uOpacity);
            }
        `,
        transparent: true,
        // side: THREE.DoubleSide,
        // wireframe: true,
        })
    const newMesh = new THREE.Mesh(meshGeometry, meshMaterial)
    // Gets and stores converted image sizes
    meshData.size.w = visibleSizes.width
    meshData.size.h = visibleSizes.height

    newMesh.scale.set(
        meshData.size.w,
        meshData.size.h,
        1
    )

    scene.add(newMesh)

    // Mouse Speed
    const mouse = {
      x: 0,
      y: 0,
    }

    const prevMouse = {
      x: 0,
      y: 0,
    }

    let mouseSpeed = 0
    let targetSpeed = 0
    const speedEaseFactor = 0.01

    const getMouseSpeed = () => {
      mouseSpeed =
        ((mouse.x - prevMouse.x) ** 2 + (mouse.y - prevMouse.y) ** 2) ** 0.5

      targetSpeed += speedEaseFactor * (mouseSpeed - targetSpeed)

      prevMouse.x = mouse.x
      prevMouse.y = mouse.y

      newMesh.material.uniforms.uSpeed.value = targetSpeed
    }

    document.addEventListener("pointermove", (e) => {
        mouse.x = e.clientX / sizes.width
        mouse.y = -e.clientY / sizes.height + 1
      })

    // Renderer
    const renderer = []
    
    renderer[0] = new THREE.WebGLRenderer({
      canvas: canvas[0],
      antialias: true,
      alpha: true,
    })
    renderer[0].setClearColor(new THREE.Color(0x000000), 0)
    renderer[0].setSize(sizes.width, sizes.height)
    renderer[0].setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    renderer[1] = new THREE.WebGLRenderer({
      canvas: canvas[1],
      antialias: true,
      alpha: true,
    })
    renderer[1].setClearColor(new THREE.Color(0x000000), 0)
    renderer[1].setSize(sizes.width, sizes.height)
    renderer[1].setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    renderer[2] = new THREE.WebGLRenderer({
      canvas: canvas[2],
      antialias: true,
      alpha: true,
    })
    renderer[2].setClearColor(new THREE.Color(0x000000), 0)
    renderer[2].setSize(sizes.width, sizes.height)
    renderer[2].setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Animate
    let elapsedTime
    const clock = new THREE.Clock()
    let startFade = 0

    let onCircles = false
    document.querySelector('.circle-section').addEventListener('pointerover', () => {
      onCircles = true
    })
    document.querySelector('.circle-section').addEventListener('pointerleave', () => {
      onCircles = false
    })

    let currentCircle = 0
    let xDiff = visibleSizes.width * (serviceCircle1.getBoundingClientRect().left - serviceCircle2.getBoundingClientRect().left) / sizes.width
    serviceCircle1.addEventListener('pointerover', () => {
      newMesh.material.uniforms.uRipple.value = 0.25
      newMesh.position.x = -xDiff
        currentCircle = 0
    })

    serviceCircle2.addEventListener('pointerover', () => {
      newMesh.material.uniforms.uRipple.value = 0.15
      newMesh.position.x = 0
        currentCircle = 1
    })

    serviceCircle3.addEventListener('pointerover', () => {
      newMesh.material.uniforms.uRipple.value = 0.25
      newMesh.position.x = xDiff
        currentCircle = 2
    })

    const tick = () => {
      elapsedTime = clock.getElapsedTime()
      
      // Update Times
      newMesh.material.uniforms.uTime.value = elapsedTime * 0.5

      // Mouse Speed
      // getMouseSpeed()

      // Update Mesh
      // updateMesh()

      if (onCircles == true) {
        renderer[currentCircle].render(scene, camera)
      }

      window.requestAnimationFrame(tick)
    }

    tick()
  }

  main()