// Используем абсолютные CDN-ссылки
if (!window.THREE) {
    window.THREE = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/+esm');
}

let TWEEN;
if (!window.THREE) {
    window.THREE = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/+esm');
}

const { OrbitControls } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/controls/OrbitControls.js/+esm');
const { FBXLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/loaders/FBXLoader.js/+esm');
const { Line2 } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/lines/Line2.js/+esm');
const { LineMaterial } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/lines/LineMaterial.js/+esm');
const { LineGeometry } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/lines/LineGeometry.js/+esm');


const fbxLoader = new FBXLoader();

// Карта соответствия OIV и их моделей
const oivModels = {
    "OIV001": "/models/DF.fbx", // Департамент финансов города Москвы
    "OIV002": "/models/GKU.fbx", // Главное контрольное управление города Москвы
    "OIV003": "/models/OATI.fbx" // Объединение административно-технических инспекций города Москвы
};

let scene, camera, renderer, controls;
let nodeMeshes = {};
let edgeLines = {};
let complexSpheres = {};
let selectedNodeId = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let sceneScaleFactor = 5;
let data = {};
let sceneInitialized = false;


class TextSprite extends THREE.Sprite {
    constructor(parameters) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);

        super(new THREE.SpriteMaterial({ map: texture }));

        this.setText(parameters);
    }

    setText(parameters) {
        const { text, fontFamily = 'Arial', fontSize = 24, color = '#ffffff', 
                backgroundColor = 'rgba(0,0,0,0)', backgroundOpacity = 0 } = parameters;

        const canvas = this.material.map.image;
        const context = canvas.getContext('2d');
        
        // Размеры canvas
        const margin = 4;
        const textWidth = context.measureText(text).width;
        canvas.width = textWidth + margin * 2;
        canvas.height = fontSize + margin * 2;
        
        // Фон
        context.fillStyle = backgroundColor;
        context.globalAlpha = backgroundOpacity;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1;
        
        // Текст
        context.font = `${fontSize}px ${fontFamily}`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        this.material.map.needsUpdate = true;
        this.scale.set(canvas.width, canvas.height, 1);
    }
}

async function init() {
    if (!window.TWEEN) {
        const TweenModule = await import('https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js');
        window.TWEEN = TweenModule.default;
    }
    TWEEN = window.TWEEN;
	
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error('Canvas container not found');
        return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Камера
    camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 10000);
    camera.position.z = 500 * sceneScaleFactor;
    
    // Рендерер
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    renderer.setSize(containerWidth, containerHeight);
    container.appendChild(renderer.domElement);
    
    // Управление камерой
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10 * sceneScaleFactor;
    controls.maxDistance = 320 * sceneScaleFactor;
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Загрузка данных
    loadData();
    
    // Обработка ресайза
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        // Обновляем resolution для всех линий
        Object.values(edgeLines).forEach(line => {
            if (line.material && line.material.resolution) {
                line.material.resolution.set(width, height);
            } else if (line.children && line.children[0] && line.children[0].material && line.children[0].material.resolution) {
                line.children[0].material.resolution.set(width, height);
            }
        });
    });
    
    // Обработчики событий
    renderer.domElement.addEventListener('click', onCanvasClick, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Анимация
    animate();
}

async function loadData() {
    try {
        const response = await fetch('/data/data.json');
        data = await response.json();
        
        if (!data.themeColors) {
            data.themeColors = {};
            data.themes.forEach(theme => {
                data.themeColors[theme.id] = theme.color;
            });
        }
        
        create3DScene(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function create3DScene(config) {
    const scaleFactor = sceneScaleFactor;

    // 1. Сначала создаем все комплексы
    config.complexes.forEach(complex => {
        const sphereGeometry = new THREE.SphereGeometry(complex.radius * scaleFactor, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(complex.color),
            transparent: true,
            opacity: 0.3,
            wireframe: false // Изменено с true на false для видимости сфер
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(
            complex.position.x * scaleFactor,
            complex.position.y * scaleFactor,
            complex.position.z * scaleFactor
        );
        
        sphere.userData = {
            id: complex.id,
            type: 'complex',
            name: complex.name
        };
        
        scene.add(sphere);
        complexSpheres[complex.id] = sphere;
    });

    // 2. Затем создаем все узлы (дожидаемся загрузки всех моделей)
    const nodeCreationPromises = config.oiv.map(async (node) => {
        const complex = config.complexes.find(c => c.id === node.complex);
        if (!complex) return;

        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(
            node.position.x * scaleFactor,
            node.position.y * scaleFactor,
            node.position.z * scaleFactor
        );

        // Создаем сферу-контейнер
        const sphereGeometry = new THREE.SphereGeometry(3 * scaleFactor, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(complex.color),
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        const containerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        nodeGroup.add(containerSphere);

        try {
            const modelPath = oivModels[node.id] || '/models/default.fbx';
            const fbx = await new Promise((resolve, reject) => {
                fbxLoader.load(modelPath, resolve, null, reject);
            });
            
            fbx.scale.set(0.5 * scaleFactor, 0.5 * scaleFactor, 0.5 * scaleFactor);
            fbx.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: new THREE.Color(complex.color)
                    });
                }
            });
            
            nodeGroup.add(fbx);
        } catch (error) {
            console.error('Error loading model:', error);
            // Запасной вариант - простая сфера
            const sphereGeometry = new THREE.SphereGeometry(3 * scaleFactor, 16, 16);
            const sphereMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(complex.color)
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            nodeGroup.add(sphere);
        }

        nodeGroup.userData = {
            id: node.id,
            type: 'node',
            name: node.name,
            complex: node.complex
        };

        scene.add(nodeGroup);
        nodeMeshes[node.id] = nodeGroup;
    });

    // Ждем завершения создания всех узлов
    await Promise.all(nodeCreationPromises);
    console.log('All nodes created:', nodeMeshes);

    // 3. Только после этого создаем связи (без подписей)
    createEdges(config.edges);
    centerCamera();
}

function createEdges(edges) {
    if (!edges || !Array.isArray(edges)) {
        console.error('Invalid edges data:', edges);
        return;
    }

    edges.forEach(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];

        if (!sourceNode) {
            console.error('Source node not found:', edge.source);
            return;
        }
        if (!targetNode) {
            console.error('Target node not found:', edge.target);
            return;
        }

        const sourcePos = sourceNode.position;
        const targetPos = targetNode.position;
        const sourceRadius = sourceNode.children[0]?.geometry?.parameters?.radius || 5 * sceneScaleFactor;
        const targetRadius = targetNode.children[0]?.geometry?.parameters?.radius || 5 * sceneScaleFactor;

        const startPoint = getSphereSurfacePoint(sourcePos, sourceRadius, targetPos);
        const endPoint = getSphereSurfacePoint(targetPos, targetRadius, sourcePos);

        const color = new THREE.Color(data.themeColors[edge.theme] || '#999999');
        const line = createLine(startPoint, endPoint, color);

        scene.add(line);
        edgeLines[`${edge.source}-${edge.target}`] = line;
    });
}

function getSphereSurfacePoint(center, radius, targetCenter = null) {
    const point = new THREE.Vector3();
    
    if (targetCenter) {
        // Направление от текущей сферы к целевой
        const direction = new THREE.Vector3().subVectors(targetCenter, center).normalize();
        point.copy(center).add(direction.multiplyScalar(radius));
    } else {
        // Случайная точка на поверхности
        point.set(
            center.x + (Math.random() * 2 - 1) * radius,
            center.y + (Math.random() * 2 - 1) * radius,
            center.z + (Math.random() * 2 - 1) * radius
        ).sub(center).normalize().multiplyScalar(radius).add(center);
    }
    
    return point;
}

function createLine(from, to, color) {
    // Упрощенная версия без подписей
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    positions[0] = from.x;
    positions[1] = from.y;
    positions[2] = from.z;
    positions[3] = to.x;
    positions[4] = to.y;
    positions[5] = to.z;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    return line;
}

function centerCamera() {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    cameraZ *= sceneScaleFactor;

    camera.position.z = cameraZ;
    controls.target.copy(center);
    controls.update();
}

function onCanvasClick(event) {
    event.preventDefault();
    
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Проверяем клик по узлам
    const nodeIntersects = raycaster.intersectObjects(
        Object.values(nodeMeshes), 
        true
    );
    
    if (nodeIntersects.length > 0) {
        const object = nodeIntersects[0].object;
        selectNode(object.userData.id);
        return;
    }
    
    // Проверяем клик по комплексам
    const complexIntersects = raycaster.intersectObjects(
        Object.values(complexSpheres), 
        true
    );
    
    if (complexIntersects.length > 0) {
        const object = complexIntersects[0].object;
        zoomToComplex(object.userData.id);
        return;
    }
    
    // Клик в пустую область
    resetSelection();
}

function onMouseMove(event) {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const tooltip = document.getElementById('node-tooltip');
    if (!tooltip) return; // Если элемент не найден, выходим

    // Проверяем пересечение с узлами, комплексами и линиями
    const intersects = [
        ...raycaster.intersectObjects(Object.values(nodeMeshes), true),
        ...raycaster.intersectObjects(Object.values(complexSpheres), true),
        ...raycaster.intersectObjects(Object.values(edgeLines), true)
    ];

    if (intersects.length > 0) {
        const object = intersects[0].object;
        tooltip.textContent = object.userData.name || object.userData.label || '';
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY}px`;
    } else {
        tooltip.style.display = 'none';
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (window.TWEEN) window.TWEEN.update(); // Используем window.TWEEN для безопасности
    controls.update();
    renderer.render(scene, camera);
}

function selectNode(nodeId) {
    resetSelection();
    
    selectedNodeId = nodeId;
    const nodeMesh = nodeMeshes[nodeId];
    if (!nodeMesh) return;

    // 1. Подсветка выбранного узла
    nodeMesh.traverse(child => {
        if (child.isMesh) {
            child.material.color.setHex(0xffffff);
            child.material.emissive.setHex(0x888888);
            child.material.needsUpdate = true;
        }
    });

    // 2. Подсветка комплекса
    const complexSphere = complexSpheres[nodeMesh.userData.complex];
    if (complexSphere) {
        complexSphere.material.opacity = 0.6;
        complexSphere.material.needsUpdate = true;
    }

    // 3. Находим связанные узлы
    const relatedEdges = data.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId);
    
    const relatedNodeIds = new Set();
    relatedEdges.forEach(edge => {
        relatedNodeIds.add(edge.source);
        relatedNodeIds.add(edge.target);
    });

    // 4. Устанавливаем видимость
    Object.entries(nodeMeshes).forEach(([id, mesh]) => {
        const isRelated = relatedNodeIds.has(id) || id === nodeId;
        mesh.traverse(child => {
            if (child.isMesh) {
                child.material.transparent = !isRelated;
                child.material.opacity = isRelated ? 1.0 : 0.2;
                child.material.needsUpdate = true;
            }
        });
    });

    // 5. Центрируем камеру
    const relatedNodes = Array.from(relatedNodeIds).map(id => nodeMeshes[id]).filter(Boolean);
    centerOnObjects([nodeMesh, ...relatedNodes]);
}

// Новая вспомогательная функция для центрирования камеры
function centerOnObjects(objects) {
    if (!objects || objects.length === 0) return;

    const bbox = new THREE.Box3();
    objects.forEach(obj => bbox.expandByObject(obj));
	
    if (window.TWEEN) {
        new window.TWEEN.Tween(camera.position)
            .to({ x: center.x, y: center.y, z: center.z + cameraZ }, 1000)
            .easing(window.TWEEN.Easing.Quadratic.Out)
            .start();
    }
    // Добавляем связанные линии
    if (selectedNodeId) {
        data.edges.forEach(edge => {
            if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
                const line = edgeLines[`${edge.source}-${edge.target}`];
                if (line) bbox.expandByObject(line);
            }
        });
    }

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    // Анимация
    if (TWEEN) {
        new TWEEN.Tween(camera.position)
            .to({ x: center.x, y: center.y, z: center.z + cameraZ }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(controls.target)
            .to({ x: center.x, y: center.y, z: center.z }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    } else {
        // Fallback без анимации
        camera.position.set(center.x, center.y, center.z + cameraZ);
        controls.target.set(center.x, center.y, center.z);
        controls.update();
    }
}

function resetSelection() {
    // Сброс всех OIV
    Object.values(nodeMeshes).forEach(mesh => {
        const complexColor = new THREE.Color(data.complexes.find(c => c.id === mesh.userData.complex)?.color || '#7FB3D5');
        
        mesh.traverse(child => {
            if (child.isMesh) {
                child.material.color.copy(complexColor);
                child.material.emissive.setHex(0x000000);
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.needsUpdate = true;
            }
        });
    });
    
    // Сброс всех комплексов
    Object.values(complexSpheres).forEach(sphere => {
        sphere.material.opacity = 0.3;
        sphere.material.needsUpdate = true;
    });
    
    selectedNodeId = null;
}

function zoomToComplex(complexId) {
    const complex = complexSpheres[complexId];
    if (!complex) return;

    // 1. Установка прозрачности для комплексов
    Object.values(complexSpheres).forEach(sphere => {
        sphere.material.opacity = sphere === complex ? 0.8 : 0.1;
        sphere.material.needsUpdate = true;
    });

    // 2. Находим все OIV комплекса
    const complexOIVs = Object.values(nodeMeshes).filter(node => 
        node.userData.complex === complexId);
    const complexOIVIds = complexOIVs.map(node => node.userData.id);

    // 3. Устанавливаем видимость OIV
    Object.values(nodeMeshes).forEach(node => {
        const isRelated = complexOIVs.includes(node);
        node.traverse(child => {
            if (child.isMesh) {
                child.material.transparent = !isRelated;
                child.material.opacity = isRelated ? 1.0 : 0.1;
                child.material.needsUpdate = true;
            }
        });
    });

    // 4. Находим все связи между OIV комплекса и связи с другими комплексами
    const relatedEdges = data.edges.filter(edge => 
        complexOIVIds.includes(edge.source) || complexOIVIds.includes(edge.target));

    // 5. Устанавливаем видимость линий
    Object.entries(edgeLines).forEach(([key, line]) => {
        const [sourceId, targetId] = key.split('-');
        const isRelatedEdge = relatedEdges.some(edge => 
            (edge.source === sourceId && edge.target === targetId) ||
            (edge.source === targetId && edge.target === sourceId));
        
        line.material.transparent = !isRelatedEdge;
        line.material.opacity = isRelatedEdge ? 1.0 : 0.1;
        line.material.needsUpdate = true;
    });

    // 6. Находим связанные комплексы (через связи OIV)
    const relatedComplexes = new Set();
    relatedEdges.forEach(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];
        if (sourceNode) relatedComplexes.add(sourceNode.userData.complex);
        if (targetNode) relatedComplexes.add(targetNode.userData.complex);
    });

    // 7. Подсветка связанных комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const isRelated = relatedComplexes.has(sphere.userData.id);
        sphere.material.opacity = isRelated ? 0.6 : 0.1;
        sphere.material.needsUpdate = true;
    });

    // 8. Собираем все объекты для центрирования: выбранный комплекс, его OIV и связанные OIV
    const allRelatedNodes = Object.values(nodeMeshes).filter(node => 
        complexOIVIds.includes(node.userData.id) || 
        Array.from(relatedComplexes).includes(node.userData.complex));

    // 9. Центрируем камеру на выбранном комплексе, но включаем в расчет и связанные
    const objectsToCenter = [complex, ...allRelatedNodes];
    
    // Уменьшаем расстояние камеры для более близкого вида
    const bbox = new THREE.Box3();
    objectsToCenter.forEach(obj => bbox.expandByObject(obj));
    
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8; // Уменьшенный коэффициент для приближения

    // Анимация перемещения камеры
    if (TWEEN) {
        new TWEEN.Tween(camera.position)
            .to({ 
                x: center.x, 
                y: center.y, 
                z: center.z + cameraZ 
            }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(controls.target)
            .to({ 
                x: complex.position.x, // Центрируем на выбранном комплексе
                y: complex.position.y,
                z: complex.position.z
            }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    } else {
        camera.position.set(center.x, center.y, center.z + cameraZ);
        controls.target.set(complex.position.x, complex.position.y, complex.position.z);
        controls.update();
    }
}

export function update3DScene(newData, filters) {
    if (!sceneInitialized) {
        console.warn('3D scene not initialized yet');
        return;
    }
    
    // Обновляем данные
    data = newData || data;
    
    // Применяем фильтры к видимости объектов
    applyFiltersToScene(filters);
}

function applyFiltersToScene(filters = {}) {
    // 1. Фильтрация комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const shouldShow = !filters.complexes || filters.complexes.length === 0 || 
                          filters.complexes.includes(sphere.userData.id);
        sphere.visible = shouldShow;
    });

    // 2. Фильтрация OIV
    Object.values(nodeMeshes).forEach(node => {
        const shouldShow = (!filters.oiv || filters.oiv.length === 0 || 
                          filters.oiv.includes(node.userData.id)) &&
                          (!filters.complexes || filters.complexes.length === 0 || 
                          filters.complexes.includes(node.userData.complex));
        node.visible = shouldShow;
    });

    // 3. Фильтрация линий
    Object.entries(edgeLines).forEach(([key, line]) => {
        const [sourceId, targetId] = key.split('-');
        const sourceVisible = nodeMeshes[sourceId]?.visible;
        const targetVisible = nodeMeshes[targetId]?.visible;
        
        // Проверяем фильтры по темам
        const edgeData = data.edges.find(edge => 
            edge.source === sourceId && edge.target === targetId);
        const themeFilterPass = !filters.themes || filters.themes.length === 0 || 
                              (edgeData && filters.themes.includes(edgeData.theme));
        
        line.visible = sourceVisible && targetVisible && themeFilterPass;
    });
}

export function init3DScene() {
    if (!sceneInitialized) {
        init();
        sceneInitialized = true;
    }
}

window.zoomToComplex = zoomToComplex;
window.resetSelection = resetSelection;