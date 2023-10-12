// Canvas class: webgl
// Image class: particle-image

console.log('x')

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

        for (let i = 0; i < webglImages.length; i++) {
            // Image Sizes
            imagesData[i].size.w =
                (images[i].clientWidth * visibleSizes.width) /
                sizes.width
            imagesData[i].size.h =
                (images[i].clientHeight * visibleSizes.height) /
                sizes.height

            webglImages[i].scale.set(
                imagesData[i].size.w,
                imagesData[i].size.h,
                1
            )
        }

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

            // Make Mesh
            const meshGeometry = new THREE.PlaneGeometry(1, 1, 64, 64)
            const meshMaterial = new THREE.ShaderMaterial({
              uniforms: {
                uTime: { value: 0 },
                uSize: {
                  value: new THREE.Vector2(visibleSizes.width, visibleSizes.height),
                },
                uTexture: { value: texture },
                uPosition: {
                  value: new THREE.Vector2(
                    imagesData[i].position.x,
                    imagesData[i].position.y
                  ),
                },
                uSize: {
                  value: new THREE.Vector2(
                    imagesData[i].size.w,
                    imagesData[i].size.h
                  ),
                },
                uResizeMultiplier: { value: 1 },
                uScrollProgress: { value: 0 },
              },
            vertexShader: `
                uniform float uTime;
            
                varying vec2 vUv;
            
                float PI = 3.141592;
            
                void main() {
                    vec3 newPosition = position;
            
                    newPosition.z +=  sin(uTime * 2. + uv.y * 8.) * 0.005;
            
                    vec4 mvPosition = modelViewMatrix * vec4( newPosition, 1.);
            
                    gl_Position = projectionMatrix * mvPosition;
            
                    vUv = uv;
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
            
                varying vec2 vUv;
            
                void main() {
                    vec4 texture = texture2D(uTexture, vUv);
                    gl_FragColor = vec4(texture);
                }
            `,
              transparent: true,
              // side: THREE.DoubleSide,
              wireframe: false,
            })
            webglImages[i] = new THREE.Mesh(meshGeometry, meshMaterial)
            webglImages[i].scale.set(
                imagesData[i].size.w,
                imagesData[i].size.h,
                1
            )
            webglImages[i].position.set(
                imagesData[i].position.x,
                imagesData[i].position.y,
                0
            )

            scene.add(webglImages[i])
        }
    }

    convertImages()

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

            // WebGL Image Resize and Repositioning
            imagesData[i].position.x =
                -visibleSizes.width / 2 +
                (images[i].getBoundingClientRect().left *
                visibleSizes.width) /
                sizes.width +
                imagesData[i].size.w / 2
            imagesData[i].position.y = -(
                -visibleSizes.height / 2 +
                (images[i].getBoundingClientRect().top *
                visibleSizes.height) /
                sizes.height +
                imagesData[i].size.h / 2
            )

            webglImages[i].position.x = imagesData[i].position.x
            webglImages[i].position.y = imagesData[i].position.y
        }

        // Render
        renderer.render(scene, camera)
        window.requestAnimationFrame(tick)
    }

    tick()
}

main()