// Используем абсолютные CDN-ссылки
if (!window.THREE) {
    window.THREE = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/+esm');
}

let TWEEN;
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
let selectedComplexId = null;
let selectedComplexIds = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let sceneScaleFactor = 5;
let data = {};
let sceneInitialized = false;
let tooltip = null;
let initialCameraPosition = null;
let initialControlsTarget = null;
let lastClickTime = 0;
let clickTimeout = null;
let isMovingCamera = false;
let mouseDownPosition = null;
const MOUSE_MOVE_THRESHOLD = 5; // пикселей
let selectedTheme = null;
let focusMode = false;
let focusNodeId = null;

function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'node-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '8px 12px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontFamily = 'Arial, sans-serif';
    tooltip.style.fontSize = '14px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '100';
    tooltip.style.maxWidth = '300px';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    return tooltip;
}

async function init() {
    if (!window.TWEEN) {
        const TweenModule = await import('https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js');
        window.TWEEN = TweenModule.default;
    }
    TWEEN = window.TWEEN;
    
    tooltip = document.getElementById('node-tooltip') || createTooltip();
    
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
    initialCameraPosition = camera.position.clone();
    
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
    initialControlsTarget = controls.target.clone();

    renderer.domElement.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Левая кнопка мыши
            isMovingCamera = false;
            mouseDownPosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    });

    renderer.domElement.addEventListener('mousemove', (event) => {
        if (mouseDownPosition && event.buttons === 1) {
            const dx = Math.abs(event.clientX - mouseDownPosition.x);
            const dy = Math.abs(event.clientY - mouseDownPosition.y);
            
            if (dx > MOUSE_MOVE_THRESHOLD || dy > MOUSE_MOVE_THRESHOLD) {
                isMovingCamera = true;
            }
        }
    });

    renderer.domElement.addEventListener('mouseup', (event) => {
        if (event.button === 0) { // Левая кнопка мыши
            if (!isMovingCamera) {
                // Это был клик, а не перемещение
                handleSingleClick(event);
            }
            mouseDownPosition = null;
            isMovingCamera = false;
        }
    });
    
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
    renderer.domElement.addEventListener('dblclick', (event) => {
        event.preventDefault();
        resetCameraPosition();
        resetSelection();
        selectedComplexId = null;
    });
    
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseout', () => {
        if (tooltip) tooltip.style.display = 'none';
    });
    
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
            opacity: 0.6,
            wireframe: false
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
            opacity: 0.05,
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

function updateSelectedComplexes() {
    // 1. Сначала скрываем все элементы
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = false;
    });
    
    Object.values(nodeMeshes).forEach(node => {
        node.visible = false;
    });
    
    Object.values(edgeLines).forEach(line => {
        line.visible = false;
    });

    // Если нет выбранных комплексов, показываем все
    if (selectedComplexIds.length === 0) {
        Object.values(complexSpheres).forEach(sphere => {
            sphere.visible = true;
            sphere.material.opacity = 0.6;
            sphere.material.needsUpdate = true;
        });
        
        Object.values(nodeMeshes).forEach(node => {
            node.visible = true;
        });
        
        Object.values(edgeLines).forEach(line => {
            line.visible = true;
        });
        return;
    }

    // 2. Показываем выбранные комплексы
    selectedComplexIds.forEach(complexId => {
        const complex = complexSpheres[complexId];
        if (complex) {
            complex.visible = true;
            complex.material.opacity = 0.8;
            complex.material.needsUpdate = true;
        }
    });

    // 3. Собираем все OIV выбранных комплексов
    const complexOIVs = Object.values(nodeMeshes).filter(node => 
        selectedComplexIds.includes(node.userData.complex));
    const complexOIVIds = complexOIVs.map(node => node.userData.id);

    // 4. Показываем OIV выбранных комплексов
    complexOIVs.forEach(node => {
        node.visible = true;
    });

    // 5. Находим все связанные линии (между OIV выбранных комплексов и другими OIV)
    const relatedEdges = data.edges.filter(edge => 
        complexOIVIds.includes(edge.source) || complexOIVIds.includes(edge.target));

    // 6. Собираем все связанные OIV (через линии)
    const relatedOIVIds = new Set(complexOIVIds);
    relatedEdges.forEach(edge => {
        relatedOIVIds.add(edge.source);
        relatedOIVIds.add(edge.target);
    });

    // 7. Показываем связанные OIV (но не из выбранных комплексов)
    Array.from(relatedOIVIds).forEach(oivId => {
        const node = nodeMeshes[oivId];
        if (node && !selectedComplexIds.includes(node.userData.complex)) {
            node.visible = true;
        }
    });

    // 8. Показываем все связанные линии
    relatedEdges.forEach(edge => {
        const lineKey = `${edge.source}-${edge.target}`;
        const line = edgeLines[lineKey];
        if (line) {
            line.visible = true;
        }
    });
}

function selectComplex(complexId) {
    resetSelection();
    selectedComplexId = complexId;
    
    if (!complexSpheres[complexId]) return;
    
    // 1. Сначала скрываем все элементы
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = false;
    });
    
    Object.values(edgeLines).forEach(line => {
        line.visible = false;
    });
    
    // Скрываем все комплексы (изменение: теперь скрываем все, а не только делаем невидимыми)
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = false;
    });
    
    // 2. Показываем выбранный комплекс
    const complexSphere = complexSpheres[complexId];
    if (complexSphere) {
        complexSphere.visible = true;
        complexSphere.material.opacity = 0.3;
        complexSphere.material.needsUpdate = true;
    }	
    
    // 3. Показываем узлы этого комплекса
    const complexOIVs = data.oiv.filter(node => node.complex === complexId);
    const complexOIVIds = complexOIVs.map(node => node.id);
    
    complexOIVs.forEach(node => {
        const nodeMesh = nodeMeshes[node.id];
        if (nodeMesh) {
            nodeMesh.visible = true;
            
            // Подсветка сферы-контейнера
            const containerSphere = nodeMesh.children[0];
            if (containerSphere && containerSphere.isMesh) {
                containerSphere.material.opacity = 0.3;
                containerSphere.material.needsUpdate = true;
            }
            
            // Подсветка модели
            nodeMesh.traverse(child => {
                if (child.isMesh && child !== containerSphere) {
                    child.material.emissive.setHex(0x111111);
                    child.material.needsUpdate = true;
                }
            });
        }
    });
    
    // 4. Показываем все линии, связанные с узлами этого комплекса
    const complexEdges = data.edges.filter(edge => 
        complexOIVIds.includes(edge.source) || complexOIVIds.includes(edge.target)
    );
    
    complexEdges.forEach(edge => {
        const lineKey = `${edge.source}-${edge.target}`;
        const line = edgeLines[lineKey];
        if (line) {
            line.visible = true;
            line.material.opacity = 0.6;
            line.material.needsUpdate = true;
        }
    });
    
    // 5. Показываем только комплексы, с которыми есть связи
    const connectedComplexes = new Set();
    complexEdges.forEach(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];
        
        if (sourceNode.userData.complex !== complexId) {
            connectedComplexes.add(sourceNode.userData.complex);
        }
        if (targetNode.userData.complex !== complexId) {
            connectedComplexes.add(targetNode.userData.complex);
        }
    });
    
    connectedComplexes.forEach(connectedComplexId => {
        const complexSphere = complexSpheres[connectedComplexId];
        if (complexSphere) {
            complexSphere.visible = true;
            complexSphere.material.opacity = 0.3;
            complexSphere.material.needsUpdate = true;
        }
        
        // Показываем узлы этих комплексов, которые связаны с нашим комплексом
        data.oiv.filter(node => node.complex === connectedComplexId).forEach(node => {
            const nodeMesh = nodeMeshes[node.id];
            if (nodeMesh) {
                const hasConnection = data.edges.some(edge => 
                    (edge.source === node.id && complexOIVIds.includes(edge.target)) ||
                    (edge.target === node.id && complexOIVIds.includes(edge.source))
                );
                
                if (hasConnection) {
                    nodeMesh.visible = true;
                    
                    // Подсветка сферы-контейнера
                    const containerSphere = nodeMesh.children[0];
                    if (containerSphere && containerSphere.isMesh) {
                        containerSphere.material.opacity = 0.1;
                        containerSphere.material.needsUpdate = true;
                    }
                    
                    // Подсветка модели
                    nodeMesh.traverse(child => {
                        if (child.isMesh && child !== containerSphere) {
                            child.material.emissive.setHex(0x111111);
                            child.material.needsUpdate = true;
                        }
                    });
                }
            }
        });
    });
    
    // Центрируем камеру на видимых элементах
    const objectsToFocus = [complexSphere];
    complexOIVs.forEach(node => {
        const nodeMesh = nodeMeshes[node.id];
        if (nodeMesh) objectsToFocus.push(nodeMesh);
    });
    complexEdges.forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);
}

function handleSingleClick(event) {
    if (isMovingCamera) return; // Игнорируем клики при перемещении камеры
    
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // 1. Проверяем клик по узлам (OIV)
    const nodeIntersects = raycaster.intersectObjects(
        Object.values(nodeMeshes), 
        true
    );
    
    const visibleNodeIntersect = nodeIntersects.find(intersect => {
        let obj = intersect.object;
        while (obj && !nodeMeshes[obj.userData?.id]) {
            obj = obj.parent;
        }
        return obj && obj.visible;
    });
    
    if (visibleNodeIntersect) {
        let nodeObj = visibleNodeIntersect.object;
        while (nodeObj && !nodeMeshes[nodeObj.userData?.id]) {
            nodeObj = nodeObj.parent;
        }
        if (nodeObj) {
            selectNode(nodeObj.userData.id);
            return;
        }
    }
    
    // 2. Проверяем клик по комплексам
    const complexIntersects = raycaster.intersectObjects(
        Object.values(complexSpheres), 
        true
    );
    
    if (complexIntersects.length > 0) {
        const object = complexIntersects[0].object;
        if (object.visible) {
            selectComplex(object.userData.id);
            return;
        }
    }
    
    // 3. Проверяем клик по линиям связей
    const edgeIntersects = raycaster.intersectObjects(
        Object.values(edgeLines), 
        true
    );
    
    if (edgeIntersects.length > 0) {
        const line = edgeIntersects[0].object;
        if (line.visible) {
            // Находим тему этой линии
            const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
            if (lineKey) {
                const [sourceId, targetId] = lineKey.split('-');
                const edge = data.edges.find(e => 
                    (e.source === sourceId && e.target === targetId) ||
                    (e.source === targetId && e.target === sourceId));
                
                if (edge) {
                    selectTheme(edge.theme);
                    return;
                }
            }
        }
    }
    
    // 4. Клик в пустую область - сбрасываем только если не перемещали камеру
    if (!isMovingCamera) {
        resetSelection();
    }
}

function onMouseMove(event) {
    if (!tooltip || isMovingCamera) return;
    
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Проверяем пересечение с узлами, комплексами и линиями
    const nodeIntersects = raycaster.intersectObjects(Object.values(nodeMeshes), true);
    const complexIntersects = raycaster.intersectObjects(Object.values(complexSpheres), true);
    const edgeIntersects = raycaster.intersectObjects(Object.values(edgeLines), true);

    // Фильтруем пересечения по видимости и прозрачности
    const filteredIntersects = [...nodeIntersects, ...complexIntersects, ...edgeIntersects].filter(intersect => {
        if (intersect.object.material) {
            return intersect.object.material.opacity > 0.5;
        }
        // Для объектов с несколькими материалами проверяем первый материал
        if (intersect.object.children && intersect.object.children[0]?.material) {
            return intersect.object.children[0].material.opacity > 0.5;
        }
        return true;
    });

    if (filteredIntersects.length > 0) {
        const object = filteredIntersects[0].object;
        let tooltipHtml = '';

        // Для OIV (органов власти)
        if (nodeIntersects.includes(filteredIntersects[0])) {  // <-- Added missing parenthesis
            const node = object.parent;
            const nodeData = data.oiv.find(oiv => oiv.id === node.userData.id);
            const complexData = data.complexes.find(c => c.id === node.userData.complex);
            
            // Проверяем, что узел видим и не полупрозрачный
            if (node.visible && (!node.children[0]?.material?.transparent || node.children[0]?.material?.opacity > 0.5)) {
                tooltipHtml = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${node.userData.name}</div>
                    <div style="margin-bottom: 3px;">Комплекс: <span style="color: ${complexData?.color || '#fff'}">${complexData?.name || 'Неизвестно'}</span></div>
                `;
            }
        }
        // Для комплексов
        else if (complexIntersects.includes(filteredIntersects[0])) {
            const complexData = data.complexes.find(c => c.id === object.userData.id);
            const oivInComplex = data.oiv.filter(oiv => oiv.complex === object.userData.id);
            
            // Проверяем, что комплекс видим и не полупрозрачный
            if (object.visible && object.material.opacity > 0.5) {
                tooltipHtml = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${object.userData.name}</div>
                    <div style="margin-bottom: 3px;">Органов власти: ${oivInComplex.length}</div>
                `;
            }
        }
        // Для связей
        else if (edgeIntersects.includes(filteredIntersects[0])) {
            const edgeKey = Object.entries(edgeLines).find(([key, line]) => line === object || line.children?.includes(object))?.[0];
            if (edgeKey) {
                const [sourceId, targetId] = edgeKey.split('-');
                const edgeData = data.edges.find(edge => 
                    (edge.source === sourceId && edge.target === targetId) || 
                    (edge.source === targetId && edge.target === sourceId));
                
                // Проверяем, что связь видима и не полупрозрачная
                if (object.visible && object.material.opacity > 0.5) {
                    tooltipHtml = `
                        <div style="margin-bottom: 3px;">Тема: <span style="color: ${data.themeColors[edgeData.theme] || '#fff'}">${edgeData.theme}</span></div>
                        <div style="font-size: 0.9em; max-width: 250px; white-space: normal;">${edgeData.label}</div>
                    `;
                }
            }
        }

        if (tooltipHtml) {
            tooltip.innerHTML = tooltipHtml;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY}px`;
        } else {
            tooltip.style.display = 'none';
        }
    } else {
        tooltip.style.display = 'none';
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (window.TWEEN) window.TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
}

function selectNode(nodeId) {
    resetSelection();
    
    selectedNodeId = nodeId;
    focusNodeId = nodeId;
    const nodeMesh = nodeMeshes[nodeId];
    if (!nodeMesh) return;

    focusMode = true;

    // 1. Обработка выбранного узла
    const containerSphere = nodeMesh.children[0];
    if (containerSphere && containerSphere.isMesh) {
        containerSphere.material.opacity = 0.3;
        containerSphere.material.needsUpdate = true;
    }

    // Подсветка модели узла
    nodeMesh.traverse(child => {
        if (child.isMesh && child !== containerSphere) {
            child.material.emissive.setHex(0x888888);
            child.material.needsUpdate = true;
        }
    });

    // 2. Подсветка комплекса выбранного узла
    const complexSphere = complexSpheres[nodeMesh.userData.complex];
    if (complexSphere) {
        complexSphere.material.opacity = 0.3;
        complexSphere.material.needsUpdate = true;
    }

    // 3. Находим все связанные узлы
    const connectedEdges = data.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
    );
    
    const connectedNodeIds = new Set();
    connectedEdges.forEach(edge => {
        connectedNodeIds.add(edge.source === nodeId ? edge.target : edge.source);
    });

    // 4. Применяем визуальные эффекты к связанным узлам
    connectedNodeIds.forEach(otherNodeId => {
        const otherNode = nodeMeshes[otherNodeId];
        if (otherNode) {
            const otherContainerSphere = otherNode.children[0];
            if (otherContainerSphere && otherContainerSphere.isMesh) {
                otherContainerSphere.material.opacity = 0.1;
                otherContainerSphere.material.needsUpdate = true;
            }
            
            otherNode.traverse(child => {
                if (child.isMesh && child !== otherContainerSphere) {
                    child.material.emissive.setHex(0x333333);
                    child.material.needsUpdate = true;
                }
            });
        }
    });

    // 5. Обновляем видимость элементов
    updateVisibilityForFocus(nodeId, Array.from(connectedNodeIds));
}

function selectOIV(oivIds) {
    resetSelection();
    if (!oivIds || oivIds.length === 0) return;

    // Находим все выбранные OIV
    const selectedOIVs = Array.isArray(oivIds) ? oivIds : [oivIds];
    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const connectedEdges = new Set();

    // Собираем все связанные элементы
    selectedOIVs.forEach(oivId => {
        visibleNodes.add(oivId);
        
        // Добавляем комплекс для этого OIV
        const node = nodeMeshes[oivId];
        if (node) visibleComplexes.add(node.userData.complex);
        
        // Находим все связи для этого OIV
        data.edges.forEach(edge => {
            if (edge.source === oivId || edge.target === oivId) {
                connectedEdges.add(edge);
                visibleNodes.add(edge.source === oivId ? edge.target : edge.source);
                
                // Добавляем комплексы для связанных OIV
                const relatedNode = nodeMeshes[edge.source === oivId ? edge.target : edge.source];
                if (relatedNode) visibleComplexes.add(relatedNode.userData.complex);
            }
        });
    });

    // 1. Показываем только выбранные и связанные OIV
    Object.values(nodeMeshes).forEach(node => {
        const isSelected = selectedOIVs.includes(node.userData.id);
        const isConnected = visibleNodes.has(node.userData.id);
        
        node.visible = isSelected || isConnected;
        
        if (node.visible) {
            // Подсветка узла
            const containerSphere = node.children[0];
            if (containerSphere && containerSphere.isMesh) {
                containerSphere.material.opacity = isSelected ? 0.3 : 0.1;
                containerSphere.material.needsUpdate = true;
            }
            
            node.traverse(child => {
                if (child.isMesh && child !== containerSphere) {
                    child.material.emissive.setHex(isSelected ? 0x888888 : 0x333333);
                    child.material.needsUpdate = true;
                }
            });
        }
    });

    // 2. Показываем только комплексы выбранных и связанных OIV
    Object.values(complexSpheres).forEach(sphere => {
        const isVisible = visibleComplexes.has(sphere.userData.id);
        sphere.visible = isVisible;
        
        if (isVisible) {
            sphere.material.opacity = selectedOIVs.some(oivId => {
                const node = nodeMeshes[oivId];
                return node && node.userData.complex === sphere.userData.id;
            }) ? 0.8 : 0.3;
            sphere.material.needsUpdate = true;
        }
    });

    // 3. Показываем только связи между выбранными и связанными OIV
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId] = lineKey.split('-');
            const isVisibleEdge = Array.from(connectedEdges).some(edge => 
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId));
            
            line.visible = isVisibleEdge;
            if (isVisibleEdge) {
                line.material.opacity = 
                    (selectedOIVs.includes(sourceId) || selectedOIVs.includes(targetId)) ? 1.0 : 0.6;
                line.material.needsUpdate = true;
            }
        }
    });

    // Центрируем камеру на видимых элементах
    const objectsToFocus = [];
    
    // Добавляем видимые узлы
    Array.from(visibleNodes).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    // Добавляем видимые комплексы
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
    // Добавляем видимые линии
    Array.from(connectedEdges).forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);
}

function updateVisibilityForFocus(centerNodeId, connectedNodeIds) {
    // Сначала скрываем все элементы
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = false;
    });
    
    Object.values(edgeLines).forEach(line => {
        line.visible = false;
    });
    
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = false;
    });

    // Показываем выбранный узел
    const centerNode = nodeMeshes[centerNodeId];
    if (centerNode) {
        centerNode.visible = true;
        
        // Показываем его комплекс
        const complex = complexSpheres[centerNode.userData.complex];
        if (complex) {
            complex.visible = true;
        }
    }

    // Показываем связанные узлы
    connectedNodeIds.forEach(nodeId => {
        const node = nodeMeshes[nodeId];
        if (node) {
            node.visible = true;
            
            // Показываем их комплексы
            const complex = complexSpheres[node.userData.complex];
            if (complex) {
                complex.visible = true;
            }
        }
    });

    // Показываем линии между выбранным узлом и связанными узлами
    data.edges.forEach(edge => {
        if ((edge.source === centerNodeId && connectedNodeIds.includes(edge.target)) || 
            (edge.target === centerNodeId && connectedNodeIds.includes(edge.source))) {
            
            const lineKey = `${edge.source}-${edge.target}`;
            const line = edgeLines[lineKey];
            if (line) {
                line.visible = true;
                line.material.opacity = 1.0;
                line.material.needsUpdate = true;
            }
        }
    });

    // Центрируем камеру на выбранных элементах
    const objectsToFocus = [centerNode];
    connectedNodeIds.forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    data.edges.forEach(edge => {
        if ((edge.source === centerNodeId && connectedNodeIds.includes(edge.target)) || 
            (edge.target === centerNodeId && connectedNodeIds.includes(edge.source))) {
            const line = edgeLines[`${edge.source}-${edge.target}`];
            if (line) objectsToFocus.push(line);
        }
    });
    
    centerOnObjects(objectsToFocus);
}

function selectTheme(theme) {
    resetSelection();
    if (!theme) return;

    // Если theme - массив, значит выбрано несколько тем
    const selectedThemes = Array.isArray(theme) ? theme : [theme];
    if (selectedThemes.length === 0) return;

    // Находим все связи выбранных тем
    const themeEdges = data.edges.filter(edge => selectedThemes.includes(edge.theme));
    if (themeEdges.length === 0) return;

    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const themeColors = {};

    // Собираем все узлы и комплексы, участвующие в связях этих тем
    themeEdges.forEach(edge => {
        visibleNodes.add(edge.source);
        visibleNodes.add(edge.target);
        
        // Добавляем комплексы для этих узлов
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];
        if (sourceNode) visibleComplexes.add(sourceNode.userData.complex);
        if (targetNode) visibleComplexes.add(targetNode.userData.complex);
        
        // Сохраняем цвета тем
        themeColors[edge.theme] = data.themeColors[edge.theme] || '#999999';
    });

    // 1. Показываем только узлы, участвующие в связях выбранных тем
    Object.values(nodeMeshes).forEach(node => {
        const isVisible = visibleNodes.has(node.userData.id);
        node.visible = isVisible;
        
        if (isVisible) {
            // Подсветка узла
            const containerSphere = node.children[0];
            if (containerSphere && containerSphere.isMesh) {
                containerSphere.material.opacity = 0.3;
                containerSphere.material.needsUpdate = true;
            }
            
            node.traverse(child => {
                if (child.isMesh && child !== containerSphere) {
                    child.material.emissive.setHex(0x444444);
                    child.material.needsUpdate = true;
                }
            });
        }
    });
    
    // 2. Показываем только комплексы, связанные с выбранными темами
    Object.values(complexSpheres).forEach(sphere => {
        const isVisible = visibleComplexes.has(sphere.userData.id);
        sphere.visible = isVisible;
        
        if (isVisible) {
            sphere.material.opacity = 0.5;
            sphere.material.needsUpdate = true;
        }
    });
    
    // 3. Показываем только линии выбранных тем и делаем их более яркими
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId] = lineKey.split('-');
            const isThemeEdge = themeEdges.some(edge => 
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId));
            
            line.visible = isThemeEdge;
            if (isThemeEdge) {
                // Устанавливаем цвет в зависимости от темы
                const edge = themeEdges.find(e => 
                    (e.source === sourceId && e.target === targetId) ||
                    (e.source === targetId && e.target === sourceId));
                
                if (edge) {
                    line.material.color.set(themeColors[edge.theme]);
                    line.material.opacity = 1.0;
                    line.material.needsUpdate = true;
                }
            }
        }
    });
    
    // 4. Центрируем камеру на видимых элементах
    const objectsToFocus = [];
    
    // Добавляем видимые узлы
    Array.from(visibleNodes).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    // Добавляем видимые комплексы
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
    // Добавляем видимые линии
    themeEdges.forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);
}

function centerOnObjects(objects) {
    if (!objects || objects.length === 0) return;

    const bbox = new THREE.Box3();
    objects.forEach(obj => bbox.expandByObject(obj));
    
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
    selectedNodeId = null;
    selectedComplexId = null;
    selectedComplexIds = [];
    selectedTheme = null;
    focusMode = false;
    focusNodeId = null;
    
    // Восстанавливаем видимость всех элементов
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = true;
        mesh.traverse(child => {
            if (child.isMesh) {
                child.material.emissive.setHex(0x000000);
                child.material.needsUpdate = true;
            }
        });
        
        // Восстанавливаем сферу-контейнер
        const containerSphere = mesh.children[0];
        if (containerSphere && containerSphere.isMesh) {
            containerSphere.material.opacity = 0.05;
            containerSphere.material.needsUpdate = true;
        }
    });
    
    Object.values(edgeLines).forEach(line => {
        line.visible = true;
        line.material.opacity = 0.8;
        line.material.needsUpdate = true;
    });
    
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = true;
        sphere.material.opacity = 0.6;
        sphere.material.needsUpdate = true;
    });
}

function resetCameraPosition() {
    if (!initialCameraPosition || !initialControlsTarget) return;

    if (TWEEN) {
        new TWEEN.Tween(camera.position)
            .to(initialCameraPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(controls.target)
            .to(initialControlsTarget, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    } else {
        camera.position.copy(initialCameraPosition);
        controls.target.copy(initialControlsTarget);
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
    // Сбрасываем выделение при применении фильтров
    resetSelection();
    
    // Обновляем выбранные комплексы
    selectedComplexIds = filters.complexes || [];
    
    // 1. Фильтрация комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const shouldShow = !filters.complexes || filters.complexes.length === 0 || 
                          filters.complexes.includes(sphere.userData.id);
        sphere.visible = shouldShow;
        
        if (shouldShow) {
            sphere.material.opacity = filters.complexes && filters.complexes.includes(sphere.userData.id) ? 0.8 : 0.6;
            sphere.material.needsUpdate = true;
        }
    });

    // 2. Фильтрация OIV
    Object.values(nodeMeshes).forEach(node => {
        const nodeData = data.oiv.find(oiv => oiv.id === node.userData.id);
        if (!nodeData) return;
        
        // Проверяем фильтры
        const complexFilterPass = !filters.complexes || filters.complexes.length === 0 || 
                               filters.complexes.includes(node.userData.complex);
        const oivFilterPass = !filters.oiv || filters.oiv.length === 0 || 
                            filters.oiv.includes(node.userData.id);
        
        // Для фильтрации по темам находим все OIV, участвующие в связях с выбранными темами
        let themeFilterPass = true;
        if (filters.themes && filters.themes.length > 0) {
            const themeEdges = data.edges.filter(edge => 
                filters.themes.includes(edge.theme));
            const themeOIVs = new Set();
            themeEdges.forEach(edge => {
                themeOIVs.add(edge.source);
                themeOIVs.add(edge.target);
            });
            themeFilterPass = themeOIVs.has(node.userData.id);
        }
        
        const shouldShow = complexFilterPass && oivFilterPass && themeFilterPass;
        
        node.visible = shouldShow;
        
        if (shouldShow) {
            const containerSphere = node.children[0];
            if (containerSphere && containerSphere.isMesh) {
                containerSphere.material.opacity = 0.05;
                containerSphere.material.needsUpdate = true;
            }
            
            node.traverse(child => {
                if (child.isMesh && child !== containerSphere) {
                    child.material.emissive.setHex(0x000000);
                    child.material.needsUpdate = true;
                }
            });
        }
    });

    // 3. Фильтрация линий по темам
    Object.entries(edgeLines).forEach(([key, line]) => {
        const [sourceId, targetId] = key.split('-');
        const edgeData = data.edges.find(edge => 
            (edge.source === sourceId && edge.target === targetId) ||
            (edge.source === targetId && edge.target === sourceId));
            
        if (!edgeData) {
            line.visible = false;
            return;
        }

        // Основной критерий - тема
        const themeFilterPass = !filters.themes || filters.themes.length === 0 || 
                              filters.themes.includes(edgeData.theme);
        
        // Видимость узлов
        const sourceVisible = nodeMeshes[sourceId]?.visible;
        const targetVisible = nodeMeshes[targetId]?.visible;
        
        // Дополнительные условия для showOnlyConnections
        let shouldShowLine = themeFilterPass && sourceVisible && targetVisible;
        
        if (filters.showOnlyConnections) {
            const selectedOIVs = filters.oiv && filters.oiv.length > 0 ? filters.oiv : 
                               Object.values(nodeMeshes).filter(n => n.visible).map(n => n.userData.id);
            
            shouldShowLine = shouldShowLine && 
                           selectedOIVs.includes(sourceId) && 
                           selectedOIVs.includes(targetId);
        }
        
        line.visible = shouldShowLine;
        
        if (line.visible) {
            line.material.opacity = filters.themes && filters.themes.includes(edgeData.theme) ? 1.0 : 0.8;
            line.material.needsUpdate = true;
        }
    });
    
    // Если выбрана только одна тема - выделяем ее
    if (filters.themes && filters.themes.length === 1) {
        selectTheme(filters.themes[0]);
    } else {
        // Центрируем камеру на видимых элементах
        const visibleObjects = [];
        Object.values(complexSpheres).forEach(sphere => {
            if (sphere.visible) visibleObjects.push(sphere);
        });
        Object.values(nodeMeshes).forEach(node => {
            if (node.visible) visibleObjects.push(node);
        });
        Object.values(edgeLines).forEach(line => {
            if (line.visible) visibleObjects.push(line);
        });
        
        centerOnObjects(visibleObjects);
    }
	
    // Если выбраны OIV - применяем их выделение
    if (filters.oiv && filters.oiv.length > 0) {
        selectOIV(filters.oiv);
    } 
    // Иначе если выбраны только темы - применяем их выделение
    else if (filters.themes && filters.themes.length === 1) {
        selectTheme(filters.themes[0]);
    } else {
        // Центрируем камеру на видимых элементах
        const visibleObjects = [];
        Object.values(complexSpheres).forEach(sphere => {
            if (sphere.visible) visibleObjects.push(sphere);
        });
        Object.values(nodeMeshes).forEach(node => {
            if (node.visible) visibleObjects.push(node);
        });
        Object.values(edgeLines).forEach(line => {
            if (line.visible) visibleObjects.push(line);
        });
        
        centerOnObjects(visibleObjects);
    }
	
}

export function init3DScene() {
    if (!sceneInitialized) {
        init();
        sceneInitialized = true;
    }
}

window.selectComplex = selectComplex;
window.selectNode = selectNode;
window.selectOIV = selectOIV;
window.selectTheme = selectTheme;
window.resetSelection = resetSelection;
window.resetCameraPosition = resetCameraPosition;
window.updateSelectedComplexes = function(selectedIds) {
    // Сбрасываем выделение
    resetSelection();
    selectedComplexIds = selectedIds || [];
    
    // Если нет выбранных комплексов, показываем все
    if (selectedComplexIds.length === 0) {
        resetSelection();
        return;
    }
    
    // 1. Фильтрация комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const isSelected = selectedComplexIds.includes(sphere.userData.id);
        sphere.visible = isSelected;
        
        if (isSelected) {
            sphere.material.opacity = 0.8;
            sphere.material.needsUpdate = true;
        }
    });

    // 2. Собираем все OIV выбранных комплексов
    const complexOIVs = Object.values(nodeMeshes).filter(node => 
        selectedComplexIds.includes(node.userData.complex));
    const complexOIVIds = complexOIVs.map(node => node.userData.id);

    // 3. Находим все связанные линии
    const relatedEdges = data.edges.filter(edge => 
        complexOIVIds.includes(edge.source) || complexOIVIds.includes(edge.target));
    
    // 4. Собираем все связанные OIV
    const relatedOIVIds = new Set(complexOIVIds);
    relatedEdges.forEach(edge => {
        relatedOIVIds.add(edge.source);
        relatedOIVIds.add(edge.target);
    });

    // 5. Применяем визуальные эффекты
    Object.values(nodeMeshes).forEach(node => {
        const isComplexOIV = complexOIVIds.includes(node.userData.id);
        const isRelatedOIV = relatedOIVIds.has(node.userData.id) && !isComplexOIV;
        
        node.visible = isComplexOIV || isRelatedOIV;
        
        if (node.visible) {
            const containerSphere = node.children[0];
            if (containerSphere && containerSphere.isMesh) {
                containerSphere.material.opacity = isComplexOIV ? 0.3 : 0.1;
                containerSphere.material.needsUpdate = true;
            }
            
            node.traverse(child => {
                if (child.isMesh && child !== containerSphere) {
                    child.material.emissive.setHex(isComplexOIV ? 0x111111 : 0x111111);
                    child.material.needsUpdate = true;
                }
            });
        }
    });

    // 6. Обработка линий
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId] = lineKey.split('-');
            const isRelatedEdge = relatedEdges.some(edge => 
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId));
            
            line.visible = isRelatedEdge;
            if (isRelatedEdge) {
                line.material.opacity = 0.6;
                line.material.needsUpdate = true;
            }
        }
    });

    // 7. Показываем комплексы связанных OIV
    const relatedComplexes = new Set();
    Array.from(relatedOIVIds).forEach(oivId => {
        const node = nodeMeshes[oivId];
        if (node) relatedComplexes.add(node.userData.complex);
    });
    
    relatedComplexes.forEach(complexId => {
        if (!selectedComplexIds.includes(complexId)) {
            const complex = complexSpheres[complexId];
            if (complex) {
                complex.visible = true;
                complex.material.opacity = 0.3;
                complex.material.needsUpdate = true;
            }
        }
    });

    // Центрируем камеру
    const objectsToFocus = [
        ...selectedComplexIds.map(id => complexSpheres[id]).filter(Boolean),
        ...complexOIVs,
        ...relatedEdges.map(edge => edgeLines[`${edge.source}-${edge.target}`]).filter(Boolean)
    ];
    
    centerOnObjects(objectsToFocus);
};

// Добавляем глобальную функцию для вызова из фильтров
window.applyMultiComplexSelection = function(selectedComplexes) {
    window.updateSelectedComplexes(selectedComplexes);
};