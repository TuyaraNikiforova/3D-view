// Используем абсолютные CDN-ссылки
import { initSearch } from './search.js';

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
    "OIV001": "/models/DF.fbx",
    "OIV002": "/models/GKU.fbx",
    "OIV003": "/models/OATI.fbx"
};

let scene, camera, renderer, controls;
let nodeMeshes = {};
let edgeLines = {};
let complexSpheres = {};
let selectedNodeId = null;
let selectedComplexIds = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let sceneScaleFactor = 5;
let data = {};
let sceneInitialized = false;
let tooltip = null;
let initialCameraPosition = null;
let initialControlsTarget = null;
let isMovingCamera = false;
let mouseDownPosition = null;
const MOUSE_MOVE_THRESHOLD = 5;

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
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 10000);
    camera.position.z = 500 * sceneScaleFactor;
    initialCameraPosition = camera.position.clone();
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    renderer.setSize(containerWidth, containerHeight);
    container.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10 * sceneScaleFactor;
    controls.maxDistance = 320 * sceneScaleFactor;
    initialControlsTarget = controls.target.clone();

    renderer.domElement.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
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
        if (event.button === 0) {
            if (!isMovingCamera) {
                handleSingleClick(event);
            }
            mouseDownPosition = null;
            isMovingCamera = false;
        }
    });
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    loadData();
    
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        Object.values(edgeLines).forEach(line => {
            if (line.material && line.material.resolution) {
                line.material.resolution.set(width, height);
            } else if (line.children && line.children[0]?.material?.resolution) {
                line.children[0].material.resolution.set(width, height);
            }
        });
    });
    
    renderer.domElement.addEventListener('dblclick', (event) => {
        event.preventDefault();
        resetCameraPosition();
        resetSelection();
    });
    
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseout', () => {
        if (tooltip) tooltip.style.display = 'none';
    });
    
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

    const nodeCreationPromises = config.oiv.map(async (node) => {
        const complex = config.complexes.find(c => c.id === node.complex);
        if (!complex) return;

        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(
            node.position.x * scaleFactor,
            node.position.y * scaleFactor,
            node.position.z * scaleFactor
        );

        const sphereGeometry = new THREE.SphereGeometry(3 * scaleFactor, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(complex.color),
            transparent: true,
            opacity: 0.05,
            wireframe: true
        });
        const containerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		containerSphere.userData = {
			id: node.id,
			type: 'container',
			name: node.name,
			complex: node.complex
		};
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

    await Promise.all(nodeCreationPromises);
    createEdges(config.edges);
    centerCamera();
}

function createEdges(edges) {
    if (!edges || !Array.isArray(edges)) {
        console.error('Invalid edges data:', edges);
        return;
    }

    // Очищаем существующие связи
    Object.values(edgeLines).forEach(line => scene.remove(line));
    edgeLines = {};

    edges.forEach(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];

        if (!sourceNode || !targetNode) return;

        const sourcePos = sourceNode.position;
        const targetPos = targetNode.position;
        const sourceRadius = sourceNode.children[0]?.geometry?.parameters?.radius || 5 * sceneScaleFactor;
        const targetRadius = targetNode.children[0]?.geometry?.parameters?.radius || 5 * sceneScaleFactor;

        const startPoint = getSphereSurfacePoint(sourcePos, sourceRadius, targetPos);
        const endPoint = getSphereSurfacePoint(targetPos, targetRadius, sourcePos);

        const color = new THREE.Color(data.themeColors[edge.theme] || '#999999');
        const line = createLine(startPoint, endPoint, color);
        
        // Добавляем уникальный идентификатор связи
        const edgeId = `${edge.source}-${edge.target}-${edge.id}`;
        
        scene.add(line);
        edgeLines[edgeId] = line;
        line.userData = {
            source: edge.source,
            target: edge.target,
            theme: edge.theme,
            label: edge.label,
            id: edge.id
        };
    });
}

function getSphereSurfacePoint(center, radius, targetCenter = null) {
    const point = new THREE.Vector3();
    
    if (targetCenter) {
        const direction = new THREE.Vector3().subVectors(targetCenter, center).normalize();
        point.copy(center).add(direction.multiplyScalar(radius));
    } else {
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

    return new THREE.Line(geometry, material);
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

function handleSingleClick(event) {
    if (isMovingCamera) return;
    
    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
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
            selectOIV([nodeObj.userData.id]);
            return;
        }
    }
    
    const complexIntersects = raycaster.intersectObjects(
        Object.values(complexSpheres), 
        true
    );
    
    if (complexIntersects.length > 0) {
        const object = complexIntersects[0].object;
        if (object.visible) {
            updateSelectedComplexes([object.userData.id]);
            return;
        }
    }
    
    const edgeIntersects = raycaster.intersectObjects(
        Object.values(edgeLines), 
        true
    );
    
    if (edgeIntersects.length > 0) {
        const line = edgeIntersects[0].object;
        if (line.visible) {
            const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
            if (lineKey) {
                const [sourceId, targetId] = lineKey.split('-');
                const edge = data.edges.find(e => 
                    (e.source === sourceId && e.target === targetId) ||
                    (e.source === targetId && e.target === sourceId));
                
                if (edge) {
                    selectTheme([edge.theme]);
                    return;
                }
            }
        }
    }
    
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
    
    // Проверяем пересечения с контейнерными сферами
    const containerSpheres = Object.values(nodeMeshes)
        .map(node => node.children.find(child => child.isMesh && child.userData?.type === 'container'))
        .filter(Boolean);
    
    const containerIntersects = raycaster.intersectObjects(containerSpheres, true);
    
    const nodeIntersects = raycaster.intersectObjects(Object.values(nodeMeshes), true);
    const complexIntersects = raycaster.intersectObjects(Object.values(complexSpheres), true);
    const edgeIntersects = raycaster.intersectObjects(Object.values(edgeLines), true);

    const allIntersects = [...containerIntersects, ...nodeIntersects, ...complexIntersects, ...edgeIntersects];
    
    const filteredIntersects = allIntersects.filter(intersect => {
        const obj = intersect.object;
        if (obj.material) {
            return obj.material.opacity > 0.1;
        }
        if (obj.children && obj.children[0]?.material) {
            return obj.children[0].material.opacity > 0.1;
        }
        return true;
    });

    if (filteredIntersects.length > 0) {
        const object = filteredIntersects[0].object;
        let tooltipHtml = '';

        // Обработка наведения на контейнерную сферу
        if (containerIntersects.includes(filteredIntersects[0])) {
            const nodeId = object.userData.id;
            const nodeData = data.oiv.find(oiv => oiv.id === nodeId);
            const complexId = nodeData?.complex;
            const complexData = complexId ? data.complexes.find(c => c.id === complexId) : null;
            
            if (nodeData) {
                tooltipHtml = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${nodeData.name}</div>
                    <div style="margin-bottom: 3px;">Комплекс: <span style="color: ${complexData?.color || '#fff'}">${complexData?.name || 'Неизвестно'}</span></div>
                    <div style="font-size: 0.9em;">ID: ${nodeData.id}</div>
                `;
            }
        }
        // Остальные случаи (узлы, комплексы, связи)
        else if (nodeIntersects.includes(filteredIntersects[0])) {
            let node = object;
            // Ищем родительский узел, если текущий объект - часть группы
            while (node.parent && !node.userData?.id) {
                node = node.parent;
            }
            
            if (node.userData?.id) {
                const nodeData = data.oiv.find(oiv => oiv.id === node.userData.id);
                const complexId = nodeData?.complex;
                const complexData = complexId ? data.complexes.find(c => c.id === complexId) : null;
                
                tooltipHtml = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${node.userData.name}</div>
                    <div style="margin-bottom: 3px;">Комплекс: <span style="color: ${complexData?.color || '#fff'}">${complexData?.name || 'Неизвестно'}</span></div>
                `;
            }
        }
        else if (complexIntersects.includes(filteredIntersects[0])) {
            const complexData = data.complexes.find(c => c.id === object.userData.id);
            const oivInComplex = data.oiv.filter(oiv => oiv.complex === object.userData.id);
            
            if (object.visible) {
                tooltipHtml = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${object.userData.name}</div>
                    <div style="margin-bottom: 3px;">Органов власти: ${oivInComplex.length}</div>
                `;
            }
        }
        else if (edgeIntersects.includes(filteredIntersects[0])) {
            const edgeKey = Object.entries(edgeLines).find(([key, line]) => line === object || line.children?.includes(object))?.[0];
            if (edgeKey) {
                const [sourceId, targetId] = edgeKey.split('-');
                const edgeData = data.edges.find(edge => 
                    (edge.source === sourceId && edge.target === targetId) || 
                    (edge.source === targetId && edge.target === sourceId));
                
                if (object.visible) {
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

function selectOIV(oivIds) {
    resetSelection();
    if (!oivIds || oivIds.length === 0) return;

    const selectedOIVs = Array.isArray(oivIds) ? oivIds : [oivIds];
    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const connectedEdges = new Set();

    selectedOIVs.forEach(oivId => {
        visibleNodes.add(oivId);
        const node = nodeMeshes[oivId];
        if (node) visibleComplexes.add(node.userData.complex);
        
	Object.values(edgeLines).forEach(line => {
		if (line.userData.source === oivId || line.userData.target === oivId) {
			connectedEdges.add(line.userData);
                visibleNodes.add(edge.source === oivId ? edge.target : edge.source);
                const relatedNode = nodeMeshes[edge.source === oivId ? edge.target : edge.source];
                if (relatedNode) visibleComplexes.add(relatedNode.userData.complex);
            }
        });
    });

    Object.values(nodeMeshes).forEach(node => {
        const isSelected = selectedOIVs.includes(node.userData.id);
        const isConnected = visibleNodes.has(node.userData.id);
        
        node.visible = isSelected || isConnected;
        
        if (node.visible) {
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

    Object.values(edgeLines).forEach(line => {
		const lineKey = Object.keys(edgeLines).find(key => {
			const [sourceId, targetId, theme] = key.split('-');
			return (sourceId === edge.source && targetId === edge.target && theme === edge.theme) ||
				   (sourceId === edge.target && targetId === edge.source && theme === edge.theme);
		});
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

    const objectsToFocus = [];
    
    Array.from(visibleNodes).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
    Array.from(connectedEdges).forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);
}

function selectTheme(theme) {
    resetSelection();
    if (!theme) return;

    const selectedThemes = Array.isArray(theme) ? theme : [theme];
    if (selectedThemes.length === 0) return;

    const themeEdges = data.edges.filter(edge => selectedThemes.includes(edge.theme));
    if (themeEdges.length === 0) return;

    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const themeColors = {};

    themeEdges.forEach(edge => {
        visibleNodes.add(edge.source);
        visibleNodes.add(edge.target);
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];
        if (sourceNode) visibleComplexes.add(sourceNode.userData.complex);
        if (targetNode) visibleComplexes.add(targetNode.userData.complex);
        themeColors[edge.theme] = data.themeColors[edge.theme] || '#999999';
    });

    Object.values(nodeMeshes).forEach(node => {
        const isVisible = visibleNodes.has(node.userData.id);
        node.visible = isVisible;
        
        if (isVisible) {
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
    
    Object.values(complexSpheres).forEach(sphere => {
        const isVisible = visibleComplexes.has(sphere.userData.id);
        sphere.visible = isVisible;
        
        if (isVisible) {
            sphere.material.opacity = 0.5;
            sphere.material.needsUpdate = true;
        }
    });
    
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId] = lineKey.split('-');
            const isThemeEdge = themeEdges.some(edge => 
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId));
            
            line.visible = isThemeEdge;
            if (isThemeEdge) {
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
    
    const objectsToFocus = [];
    
    Array.from(visibleNodes).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
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
        camera.position.set(center.x, center.y, center.z + cameraZ);
        controls.target.set(center.x, center.y, center.z);
        controls.update();
    }
}

function resetSelection() {
    selectedNodeId = null;
    selectedComplexIds = [];
    
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = true;
        mesh.traverse(child => {
            if (child.isMesh) {
                child.material.emissive.setHex(0x000000);
                child.material.needsUpdate = true;
            }
        });
        
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

function updateSelectedComplexes(selectedIds) {
    resetSelection();
    selectedComplexIds = selectedIds || [];
    
    if (selectedComplexIds.length === 0) {
        resetSelection();
        return;
    }
    
    Object.values(complexSpheres).forEach(sphere => {
        const isSelected = selectedComplexIds.includes(sphere.userData.id);
        sphere.visible = isSelected;
        
        if (isSelected) {
            sphere.material.opacity = 0.8;
            sphere.material.needsUpdate = true;
        }
    });

    const complexOIVs = Object.values(nodeMeshes).filter(node => 
        selectedComplexIds.includes(node.userData.complex));
    const complexOIVIds = complexOIVs.map(node => node.userData.id);

    const relatedEdges = data.edges.filter(edge => 
        complexOIVIds.includes(edge.source) || complexOIVIds.includes(edge.target));
    
    const relatedOIVIds = new Set(complexOIVIds);
    relatedEdges.forEach(edge => {
        relatedOIVIds.add(edge.source);
        relatedOIVIds.add(edge.target);
    });

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

    const objectsToFocus = [
        ...selectedComplexIds.map(id => complexSpheres[id]).filter(Boolean),
        ...complexOIVs,
        ...relatedEdges.map(edge => edgeLines[`${edge.source}-${edge.target}`]).filter(Boolean)
    ];
    
    centerOnObjects(objectsToFocus);
}

export function init3DScene() {
    if (!sceneInitialized) {
        init();
        sceneInitialized = true;
    }
}

export { 
    nodeMeshes, 
    edgeLines as edgeArrows, 
    complexSpheres, 
    data 
};

window.selectOIV = selectOIV;
window.selectTheme = selectTheme;
window.resetSelection = resetSelection;
window.resetCameraPosition = resetCameraPosition;
window.updateSelectedComplexes = updateSelectedComplexes;