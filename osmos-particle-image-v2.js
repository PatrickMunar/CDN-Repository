// Canvas class: webgl
// Image class: particle-image

// Math Functions
const lerp = (a, b, n) => {
return (1 - n) * a + n * b
}

const main = () => {
    // Canvas
    const canvas = document.querySelector(".webgl")

    // Scene
    const scene = new THREE.Scene()

    // Sizes
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight,
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
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight

        visibleSizes.height = 2 * Math.tan(vFOV / 2) * Math.abs(depth)
        visibleSizes.width = (visibleSizes.height * sizes.width) / sizes.height

        // Update camera
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()

        // Update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    // Texture Loader
    const textureLoader = new THREE.TextureLoader()

    // 3D Objects
    const images = document.querySelectorAll(".particle-image")
    const imagesData = []
    const webglImages = []

    // FBO Arrays
    let dataTextureCount = 0
    const data = []
    const dataTextures = []
    const renderTargetA = []
    const renderTargetB = []
    const simGeometry = []
    const simMaterial = []
    const sceneFBO = []
    const cameraFBO = []
    const simMesh = []
    const particleGeometry = []
    const particleMaterial = []
    const positions = []
    const uvs = []
    const particleImages = []
    const particlePairedIndex = []

    // Particle Parameters
    const particleSize = { value: 256 }

    const particleParameters = {
        size: particleSize.value,
        number: particleSize.value * particleSize.value,
        particleSize: 5,
        randomParticleSize: 0,
        distortionRadius: 2.5,
        inverseForcePush: 500,
        waveFrequency: 2,
        waveAmplitude: 0.001,
    }

    const imageToParticle = (imagesDataIndex) => {
        particlePairedIndex[dataTextureCount] = imagesDataIndex

        // Data Texture
        data[dataTextureCount] = new Float32Array(4 * particleParameters.number)
        for (let i = 0; i < particleParameters.size; i++) {
        for (let j = 0; j < particleParameters.size; j++) {
            const index = i * particleParameters.size + j

            data[dataTextureCount][4 * index] =
            lerp(-0.5, 0.5, j / (particleParameters.size - 1)) *
            imagesData[imagesDataIndex].size.w
            data[dataTextureCount][4 * index + 1] =
            lerp(-0.5, 0.5, i / (particleParameters.size - 1)) *
            imagesData[imagesDataIndex].size.h
            data[dataTextureCount][4 * index + 2] = 0
            data[dataTextureCount][4 * index + 3] = 1
        }
        }
        dataTextures[dataTextureCount] = new THREE.DataTexture(
        data[dataTextureCount],
        particleParameters.size,
        particleParameters.size,
        THREE.RGBAFormat,
        THREE.FloatType
        )
        dataTextures[dataTextureCount].needsUpdate = true

        // Sim Mesh
        simGeometry[dataTextureCount] = new THREE.PlaneGeometry(2, 2, 2, 2)
        simMaterial[dataTextureCount] = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uCurrentPositions: { value: dataTextures[dataTextureCount] },
            uOriginalPositions: { value: dataTextures[dataTextureCount] },
            uPointer: { value: new THREE.Vector3(0, 0, 0) },
            uDistortionRadius: { value: particleParameters.distortionRadius },
            uInverseForcePush: { value: particleParameters.inverseForcePush },
            uWaveFrequency: { value: particleParameters.waveFrequency },
            uWaveAmplitude: { value: particleParameters.waveAmplitude },
            uPicturePosition: {
            value: new THREE.Vector2(0, 0),
            },
            uRandomProgress: { value: 1 },
        },
        vertexShader: `
            varying vec2 vUv;

            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform sampler2D uCurrentPositions;
            uniform sampler2D uOriginalPositions;
            uniform vec3 uPointer;
            uniform sampler2D uRandomPositions;
            uniform float uRandomProgress;
            uniform vec2 uPicturePosition;

            uniform float uDistortionRadius;
            uniform float uInverseForcePush;
            uniform float uWaveFrequency;
            uniform float uWaveAmplitude;

            varying vec2 vUv;

            void main() {
                vec3 pointer = uPointer;
                pointer.xy -= uPicturePosition;

                vec2 currentPosition = texture2D(uCurrentPositions, vUv).xy;

                vec2 originalPosition = texture2D(uOriginalPositions, vUv).xy;
                // originalPosition += uPicturePosition;

                vec2 targetPosition = currentPosition;

                // Parameters
                float distortionRadius = uDistortionRadius;
                float inverseForcePush = uInverseForcePush;
                float waveFrequency = uWaveFrequency;
                float waveAmplitude = uWaveAmplitude;

                // Pointer
                pointer.x -= sin(vUv.x * 5. + uTime * waveFrequency) * waveAmplitude;
                pointer.y -= sin(vUv.y * 5. + uTime * waveFrequency) * waveAmplitude;
            
                // Force
                vec2 force = (targetPosition - pointer.xy);
                float forceLength = length(force);
                float forceFactor = 1./max(1., forceLength * inverseForcePush);
                // float forceFactor = 1.;

                vec2 positionToGo = originalPosition + (normalize(force) * distortionRadius * forceFactor) * uRandomProgress;

                // Wave
                positionToGo.x += sin(vUv.x * 5. + uTime * waveFrequency) * waveAmplitude;
                positionToGo.y += sin(vUv.y * 5. + uTime * waveFrequency) * waveAmplitude;

                targetPosition += (positionToGo - targetPosition) * 0.2;

                // Particle Size
                float z = 0.;
                z += sin(vUv.x * 5. + uTime * waveFrequency) * waveAmplitude;
                z += sin(vUv.y * 5. + uTime * waveFrequency) * waveAmplitude;

                gl_FragColor = vec4(targetPosition, z, 1.);
            }
        `,
        })
        simMesh[dataTextureCount] = new THREE.Mesh(
        simGeometry[dataTextureCount],
        simMaterial[dataTextureCount]
        )

        // Setup FBO
        sceneFBO[dataTextureCount] = new THREE.Scene()
        cameraFBO[dataTextureCount] = new THREE.OrthographicCamera(
        -1,
        1,
        1,
        -1,
        -2,
        2
        )
        cameraFBO[dataTextureCount].position.z = 1
        cameraFBO[dataTextureCount].lookAt(new THREE.Vector3(0, 0, 0))
        sceneFBO[dataTextureCount].add(simMesh[dataTextureCount])

        // Render Target
        renderTargetA[dataTextureCount] = new THREE.WebGLRenderTarget(
        particleParameters.size,
        particleParameters.size,
        {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }
        )

        renderTargetB[dataTextureCount] = new THREE.WebGLRenderTarget(
        particleParameters.size,
        particleParameters.size,
        {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }
        )

        // Points
        particleGeometry[dataTextureCount] = new THREE.BufferGeometry()
        positions[dataTextureCount] = new Float32Array(
        particleParameters.number * 3
        )
        uvs[dataTextureCount] = new Float32Array(particleParameters.number * 2)
        for (let i = 0; i < particleParameters.size; i++) {
        for (let j = 0; j < particleParameters.size; j++) {
            const index = i * particleParameters.size + j

            positions[dataTextureCount][3 * index] =
            j / particleParameters.size - 0.5
            positions[dataTextureCount][3 * index + 1] =
            i / particleParameters.size - 0.5
            positions[dataTextureCount][3 * index + 2] = 0

            uvs[dataTextureCount][2 * index] = j / (particleParameters.size - 1)
            uvs[dataTextureCount][2 * index + 1] = i / (particleParameters.size - 1)
        }
        }
        particleGeometry[dataTextureCount].setAttribute(
        "position",
        new THREE.BufferAttribute(positions[dataTextureCount], 3)
        )
        particleGeometry[dataTextureCount].setAttribute(
        "uv",
        new THREE.BufferAttribute(uvs[dataTextureCount], 2)
        )

        // Texture
        const texture = textureLoader.load(imagesData[imagesDataIndex].src)

        // Particle Material
        particleMaterial[dataTextureCount] = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: texture },
            uPositions: { value: dataTextures[dataTextureCount] },
            uParticleSize: { value: particleParameters.particleSize },
            uPicturePosition: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: `
            uniform sampler2D uPositions;

            uniform float uParticleSize;
            uniform float uRandomParticleSize;
            uniform vec2 uPicturePosition;

            varying vec2 vUv;

            float random(vec2 co){
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec3 newPosition = position;
                vec4 dataTexture = texture2D(uPositions, uv);
                newPosition = dataTexture.xyz;

                newPosition.x += uPicturePosition.x;
                newPosition.y += uPicturePosition.y;

                vec4 mvPosition = modelViewMatrix * vec4( newPosition, 1.0 );

                // Particle Size
                float particleSize = uParticleSize;

                gl_PointSize = ( particleSize / -mvPosition.z );

                gl_Position = projectionMatrix * mvPosition;

                vUv = uv;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uParticleOpacity;

            varying vec2 vUv;

            void main() {
                vec4 particleTexture = texture2D(uParticleTexture, gl_PointCoord);
                vec4 texture = texture2D(uTexture, vUv);

                gl_FragColor = vec4(texture.rgb, 1.);
            }
        `,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        })
        particleImages[dataTextureCount] = new THREE.Points(
        particleGeometry[dataTextureCount],
        particleMaterial[dataTextureCount]
        )

        scene.add(particleImages[dataTextureCount])

        dataTextureCount++
    }

    // Converts all images with class "webglActualImage" to WebGL meshes
    const convertImages = () => {
        for (let i = 0; i < images.length; i++) {
            // Instantiates an object that stores image data per image in images
            imagesData[i] = {
                position: { x: 0, y: 0 },
                size: { w: 0, h: 0 },
                src: "",
            }

            // Gets and stores converted image sizes
            imagesData[i].size.w =
                (images[i].clientWidth * visibleSizes.width) / sizes.width
            imagesData[i].size.h =
                (images[i].clientHeight * visibleSizes.height) / sizes.height

            // Gets and stores converted image positions from left and top
            imagesData[i].position.x =
                -visibleSizes.width / 2 +
                (images[i].getBoundingClientRect().left * visibleSizes.width) /
                sizes.width +
                imagesData[i].size.w / 2
            imagesData[i].position.y = -(
                -visibleSizes.height / 2 +
                (images[i].getBoundingClientRect().top * visibleSizes.height) /
                sizes.height +
                imagesData[i].size.h / 2
            )

            // Gets and stores loaded texture
            imagesData[i].src = images[i].src
            const texture = textureLoader.load(imagesData[i].src)

            imageToParticle(i)
        }
    }

    convertImages()

    // WebGL Image Resize and Repositioning
    let prevWidth = []

    const webglImageResize = () => {
        // Particle Images
        for (let a = 0; a < particleImages.length; a++) {
            // Image Sizes
            imagesData[particlePairedIndex[a]].size.w =
                (images[particlePairedIndex[a]].clientWidth * visibleSizes.width) /
                sizes.width
            imagesData[particlePairedIndex[a]].size.h =
                (images[particlePairedIndex[a]].clientHeight * visibleSizes.height) /
                sizes.height

            // Image Positions from Top and Left
            imagesData[particlePairedIndex[a]].position.x =
                -visibleSizes.width / 2 +
                (images[particlePairedIndex[a]].getBoundingClientRect().left *
                visibleSizes.width) /
                sizes.width +
                imagesData[particlePairedIndex[a]].size.w / 2
            imagesData[particlePairedIndex[a]].position.y = -(
                -visibleSizes.height / 2 +
                (images[particlePairedIndex[a]].getBoundingClientRect().top *
                visibleSizes.height) /
                sizes.height +
                imagesData[particlePairedIndex[a]].size.h / 2
            )

            if (prevWidth[a] != imagesData[particlePairedIndex[a]].size.w) {
                // Data Texture
                data[dataTextureCount] = new Float32Array(4 * particleParameters.number)
                for (let i = 0; i < particleParameters.size; i++) {
                for (let j = 0; j < particleParameters.size; j++) {
                    const index = i * particleParameters.size + j

                    data[a][4 * index] =
                    lerp(-0.5, 0.5, j / (particleParameters.size - 1)) *
                    imagesData[a].size.w
                    data[a][4 * index + 1] =
                    lerp(-0.5, 0.5, i / (particleParameters.size - 1)) *
                    imagesData[a].size.h
                    data[a][4 * index + 2] = 0
                    data[a][4 * index + 3] = 1
                }
                }
                dataTextures[a] = new THREE.DataTexture(
                data[a],
                particleParameters.size,
                particleParameters.size,
                THREE.RGBAFormat,
                THREE.FloatType
                )
                dataTextures[a].needsUpdate = true

                // Resize Data Textures
                particleImages[a].material.uniforms.uPositions.value = dataTextures[a]
                simMesh[a].material.uniforms.uOriginalPositions.value = dataTextures[a]

                prevWidth[a] = imagesData[particlePairedIndex[a]].size.w
            }

            // Update Picture Position
            particleImages[a].material.uniforms.uPicturePosition.value =
                new THREE.Vector2(
                imagesData[particlePairedIndex[a]].position.x,
                imagesData[particlePairedIndex[a]].position.y
                )
            simMesh[a].material.uniforms.uPicturePosition.value = new THREE.Vector2(
                imagesData[particlePairedIndex[a]].position.x,
                imagesData[particlePairedIndex[a]].position.y
            )
        }
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    })
    renderer.setClearColor(new THREE.Color(0xff0000), 0)
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

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
    const speedEaseFactor = 0.05

    const getMouseSpeed = () => {
        mouseSpeed =
        ((mouse.x - prevMouse.x) ** 2 + (mouse.y - prevMouse.y) ** 2) ** 0.5

        // Smoothen
        targetSpeed += speedEaseFactor * (mouseSpeed - targetSpeed)

        prevMouse.x = mouse.x
        prevMouse.y = mouse.y
    }

    // Raycaster
    const raycaster = new THREE.Raycaster()
    const pointer = {
        x: 0,
        y: 0,
    }

    // Raycaster Mesh
    const raycasterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial()
    )

    // Mouse Event Listeners Function
    const pointerMoveEvents = () => {
        // Not Mobile
        if (window.innerWidth > 900) {
        // Pointer Events
        document.addEventListener("pointermove", (e) => {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1
            pointer.y = -(e.clientY / sizes.height) * 2 + 1

            mouse.x = e.clientX / sizes.width
            mouse.y = -e.clientY / sizes.height + 1
        })
        }

        // Mobile Changes
        else {
        // Pointer Events - Mobile
        document.addEventListener("touchmove", (e) => {
            pointer.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1
            pointer.y = -(e.touches[0].clientY / sizes.height) * 2 + 1

            mouse.x = e.touches[0].clientX / sizes.width
            mouse.y = -e.touches[0].clientY / sizes.height + 1
        })
        }
    }

    pointerMoveEvents()

    /**
     * Animate
     */
    // ----------------------------------------------------------------
    let elapsedTime
    const clock = new THREE.Clock()

    const tick = () => {
        elapsedTime = clock.getElapsedTime()

        // Update Times
        for (let i = 0; i < webglImages.length; i++) {
            webglImages[i].material.uniforms.uTime.value = elapsedTime
        }

        // Get mouse speed
        getMouseSpeed()

        // WebGL Image Resize
        webglImageResize()

        // Raycaster
        raycaster.setFromCamera(pointer, camera)

        // FBO
        for (let i = 0; i < dataTextures.length; i++) {
            // Update Times
            simMesh[i].material.uniforms.uTime.value = elapsedTime

            // Update Mouse
            const intersects = raycaster.intersectObjects([raycasterMesh])
            if (intersects.length > 0) {
                simMesh[i].material.uniforms.uPointer.value = intersects[0].point
            }

            // FBO Render
            renderer.setRenderTarget(renderTargetA[i])
            renderer.render(sceneFBO[i], cameraFBO[i])

            // Swap Render Targets
            const temp = renderTargetA[i]
            renderTargetA[i] = renderTargetB[i]
            renderTargetB[i] = temp

            // Use rendered texture
            particleImages[i].material.uniforms.uPositions.value =
                renderTargetA[i].texture
            simMesh[i].material.uniforms.uCurrentPositions.value =
                renderTargetB[i].texture
        }

        // Render
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
        window.requestAnimationFrame(tick)
    }

    tick()
}

main()