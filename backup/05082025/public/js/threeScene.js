// Используем абсолютные CDN-ссылки
import { updateInfoPanelData } from './infoPanel.js';

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

const oivColors = {
    "OIV001": 0x3498db, // Синий
    "OIV002": 0xe74c3c, // Красный
    "OIV003": 0x2ecc71  // Зеленый
    // Добавьте цвета для других OIV
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

let selectedFilters = {
    complexes: [],
    oiv: [],
    themes: [],
    strategies: [],
	programs: []
};


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
    tooltip.style.whiteSpace = 'normal';
    tooltip.style.display = 'none';
    tooltip.style.lineHeight = '1.4';
    document.body.appendChild(tooltip);
    return tooltip;
}

async function init() {
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
    
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
        const responses = await Promise.all([
            fetch('/data/data.json').then(res => res.json()),
            fetch('/data/strategies.json').then(res => res.json()),
            fetch('/data/programs.json').then(res => res.json())
        //    fetch('/data/objects.json').then(res => res.json()),
        //    fetch('/data/parameters.json').then(res => res.json()),
        //    fetch('/data/indicators.json').then(res => res.json())
        ]);
        
        data = {
            ...responses[0], // data.json
            strategies: responses[1],
            programs: responses[2].filter(p => p.program_type === 0.0) // Фильтруем только program_type: 0.0
        //    objects: responses[3],
        //    parameters: responses[4],
        //    indicators: responses[5]
        };

        data.oiv.forEach(oiv => {
            oiv.programs = data.programs
                .filter(program => program.oiv_id === oiv.id)
                .map(program => program.name);
        });
        
        if (!data.themeColors) {
            data.themeColors = {};
            data.themes.forEach(theme => {
                data.themeColors[theme.id] = theme.color;
            });
        }
        
        create3DScene(data);
        if (window.updateInfoPanelData) {
            window.updateInfoPanelData(data, {});	
		}		
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
			complex: node.complex,
			c: node.strategies,
			programs: node.programs
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
                        color: new THREE.Color(oivColors[node.id] || 0x888888)
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

        scene.add(line);
        edgeLines[`${edge.source}-${edge.target}-${edge.theme}-${edge.id}`] = line;
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
                const [sourceId, targetId, theme, id] = lineKey.split('-');
                const edge = data.edges.find(e => e.id === id);
                
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
					<div style="margin-bottom: 3px;">Стратегии: <span style="color: #fff">${nodeData.strategies?.join(', ') || 'Неизвестно'}</span></div>
					<div style="margin-bottom: 3px;">Гос. программы: <span style="color: #fff">${nodeData.programs?.join(', ') || 'Неизвестно'}</span></div>
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

function updateFilterCount(containerId, count) {
    const filterGroup = document.getElementById(containerId)?.closest('.filter-group');
    if (filterGroup) {
        const header = filterGroup.querySelector('h3');
        if (header) {
            const oldCounter = header.querySelector('.filter-counter');
            if (oldCounter) oldCounter.remove();
            
            if (count > 0) {
                const counter = document.createElement('span');
                counter.className = 'filter-counter';
                counter.textContent = ` (${count})`;
                counter.style.marginLeft = '8px';
                counter.style.color = '#4a6da7';
                header.appendChild(counter);
            }
        }
    }
}

function selectOIV(oivIds) {
	selectedFilters.oiv = Array.isArray(oivIds) ? oivIds : [oivIds];	

    document.querySelectorAll('#oiv-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedFilters.oiv.includes(checkbox.value);
    });
    
    // Обновляем счетчик
    updateFilterCount('oiv-filters', selectedFilters.oiv.length);
    
    // Обновляем состояние кнопки сброса
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = selectedFilters.oiv.length === 0 && 
                              selectedFilters.complexes.length === 0 && 
                              selectedFilters.themes.length === 0 && 
                              selectedFilters.strategies.length === 0;
        resetAllBtn.classList.toggle('disabled', resetAllBtn.disabled);
    }

    resetSelection();

   	if (!oivIds || oivIds.length === 0) return; 
	
    const selectedOIVs = Array.isArray(oivIds) ? oivIds : [oivIds];
    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const connectedEdges = new Set();
    const relatedEdgeIds = []; // Для хранения ID связанных связей
	
    selectedOIVs.forEach(oivId => {
        visibleNodes.add(oivId);
        const node = nodeMeshes[oivId];
        if (node) visibleComplexes.add(node.userData.complex);
        
        data.edges.forEach(edge => {
            if (edge.source === oivId || edge.target === oivId) {
                connectedEdges.add(edge);
                relatedEdgeIds.push(edge.id); // Сохраняем ID связи
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
					// Убираем изменение emissive цвета, оставляем только исходный цвет
					child.material.emissive.setHex(0x000000);
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
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId, theme, id] = lineKey.split('-');
            const isVisibleEdge = Array.from(connectedEdges).some(edge => edge.id === id);
            
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
	
    if (window.updateInfoPanelData) {
        // Передаем полные данные об OIV, связях и ID связей
        const selectedOIVData = data.oiv.filter(oiv => oivIds.includes(oiv.id));
        window.updateInfoPanelData(data, { 
            oiv: selectedOIVData,
            oivIds: oivIds,
            edges: relatedEdgeIds // Передаем ID связанных связей
        });
    }
}

function selectTheme(theme) {
	selectedFilters.themes = Array.isArray(theme) ? theme : [theme];

    document.querySelectorAll('#theme-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedFilters.themes.includes(checkbox.value);
    });
    
    // Обновляем счетчик
    updateFilterCount('theme-filters', selectedFilters.themes.length);
    
    // Обновляем состояние кнопки сброса
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = selectedFilters.oiv.length === 0 && 
                              selectedFilters.complexes.length === 0 && 
                              selectedFilters.themes.length === 0 && 
                              selectedFilters.strategies.length === 0;
        resetAllBtn.classList.toggle('disabled', resetAllBtn.disabled);
    }
	
    resetSelection();
    if (!theme) return;

    const selectedThemes = Array.isArray(theme) ? theme : [theme];
    if (selectedThemes.length === 0) return;

    const themeEdges = data.edges.filter(edge => selectedThemes.includes(edge.theme));
    if (themeEdges.length === 0) return;

    const visibleNodes = new Set();
    const visibleComplexes = new Set();
    const themeColors = {};
	const selectedEdgeIds = []; // Сохраняем ID выбранных связей

    themeEdges.forEach(edge => {
        visibleNodes.add(edge.source);
        visibleNodes.add(edge.target);
		selectedEdgeIds.push(edge.id); // Сохраняем ID связи
		
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
            const [sourceId, targetId, themeKey, id] = lineKey.split('-');
            const isThemeEdge = themeEdges.some(edge => edge.id === id);
            
            line.visible = isThemeEdge;
            if (isThemeEdge) {
                const edge = themeEdges.find(e => e.id === id);
                
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

    if (window.updateInfoPanelData) {
        window.updateInfoPanelData(data, { 
            themes: selectedThemes,
            edges: selectedEdgeIds // Передаем ID выбранных связей
        });
	}
}

function selectStrategy(strategyNames) {
	selectedFilters.strategies = Array.isArray(strategyNames) ? strategyNames : [strategyNames];

    document.querySelectorAll('#strategy-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedFilters.strategies.includes(checkbox.value);
    });
    
    // Обновляем счетчик
    updateFilterCount('strategy-filters', selectedFilters.strategies.length);
    
    // Обновляем состояние кнопки сброса
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = selectedFilters.oiv.length === 0 && 
                              selectedFilters.complexes.length === 0 && 
                              selectedFilters.themes.length === 0 && 
                              selectedFilters.strategies.length === 0;
        resetAllBtn.classList.toggle('disabled', resetAllBtn.disabled);
    }
	
    resetSelection();
    if (!strategyNames || strategyNames.length === 0) return;

    const selectedStrategies = Array.isArray(strategyNames) ? strategyNames : [strategyNames];
    
    // Находим OIV с выбранными стратегиями
    const oivWithStrategies = data.oiv.filter(oiv => 
        oiv.strategies && oiv.strategies.some(strategy => 
            selectedStrategies.includes(strategy)
        )
    );
    
    if (oivWithStrategies.length === 0) return;

    const visibleOIVIds = new Set(oivWithStrategies.map(oiv => oiv.id));
    const visibleComplexes = new Set();
    const connectedEdges = new Set();

    // Добавляем связанные OIV и комплексы
    oivWithStrategies.forEach(oiv => {
        visibleComplexes.add(oiv.complex);
        
        data.edges.forEach(edge => {
            if (edge.source === oiv.id || edge.target === oiv.id) {
                connectedEdges.add(edge);
                visibleOIVIds.add(edge.source === oiv.id ? edge.target : edge.source);
                const relatedNode = nodeMeshes[edge.source === oiv.id ? edge.target : edge.source];
                if (relatedNode) visibleComplexes.add(relatedNode.userData.complex);
            }
        });
    });

    // Обновляем видимость узлов
    Object.values(nodeMeshes).forEach(node => {
        const isSelected = oivWithStrategies.some(oiv => oiv.id === node.userData.id);
        const isConnected = visibleOIVIds.has(node.userData.id);
        
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

    // Обновляем видимость комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const isVisible = visibleComplexes.has(sphere.userData.id);
        sphere.visible = isVisible;
        
        if (isVisible) {
            sphere.material.opacity = oivWithStrategies.some(oiv => {
                const node = nodeMeshes[oiv.id];
                return node && node.userData.complex === sphere.userData.id;
            }) ? 0.8 : 0.3;
            sphere.material.needsUpdate = true;
        }
    });

    // Обновляем видимость связей
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId, theme, id] = lineKey.split('-');
            const isVisibleEdge = Array.from(connectedEdges).some(edge => edge.id === id);
            
            line.visible = isVisibleEdge;
            if (isVisibleEdge) {
                line.material.opacity = 
                    (oivWithStrategies.some(oiv => oiv.id === sourceId) || 
                     oivWithStrategies.some(oiv => oiv.id === targetId)) ? 1.0 : 0.6;
                line.material.needsUpdate = true;
            }
        }
    });

    // Центрируем камеру на выбранных объектах
    const objectsToFocus = [];
    
    Array.from(visibleOIVIds).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
    Array.from(connectedEdges).forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}-${edge.theme}-${edge.id}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);

    if (window.updateInfoPanelData) {
        window.updateInfoPanelData(data, { strategies: Array.isArray(strategyNames) ? strategyNames : [strategyNames] });
    }
	
}

function selectProgram(programNames) {
    selectedFilters.programs = Array.isArray(programNames) ? programNames : [programNames];

    document.querySelectorAll('#program-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedFilters.programs.includes(checkbox.value);
    });
    
    // Обновляем счетчик
    updateFilterCount('program-filters', selectedFilters.programs.length);
    
    // Обновляем состояние кнопки сброса
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = selectedFilters.oiv.length === 0 && 
                              selectedFilters.complexes.length === 0 && 
                              selectedFilters.themes.length === 0 && 
                              selectedFilters.strategies.length === 0 &&
                              selectedFilters.programs.length === 0;
        resetAllBtn.classList.toggle('disabled', resetAllBtn.disabled);
    }
    
    resetSelection();
    if (!programNames || programNames.length === 0) return;

    const selectedPrograms = Array.isArray(programNames) ? programNames : [programNames];
    
    // Находим OIV с выбранными программами
    const oivWithPrograms = data.oiv.filter(oiv => 
        oiv.programs && oiv.programs.some(program => 
            selectedPrograms.includes(program)
        )
    );
    
    if (oivWithPrograms.length === 0) return;

    const visibleOIVIds = new Set(oivWithPrograms.map(oiv => oiv.id));
    const visibleComplexes = new Set();
    const connectedEdges = new Set();

    // Добавляем связанные OIV и комплексы
    oivWithPrograms.forEach(oiv => {
        visibleComplexes.add(oiv.complex);
        
        data.edges.forEach(edge => {
            if (edge.source === oiv.id || edge.target === oiv.id) {
                connectedEdges.add(edge);
                visibleOIVIds.add(edge.source === oiv.id ? edge.target : edge.source);
                const relatedNode = nodeMeshes[edge.source === oiv.id ? edge.target : edge.source];
                if (relatedNode) visibleComplexes.add(relatedNode.userData.complex);
            }
        });
    });

    // Обновляем видимость узлов
    Object.values(nodeMeshes).forEach(node => {
        const isSelected = oivWithPrograms.some(oiv => oiv.id === node.userData.id);
        const isConnected = visibleOIVIds.has(node.userData.id);
        
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

    // Обновляем видимость комплексов
    Object.values(complexSpheres).forEach(sphere => {
        const isVisible = visibleComplexes.has(sphere.userData.id);
        sphere.visible = isVisible;
        
        if (isVisible) {
            sphere.material.opacity = oivWithPrograms.some(oiv => {
                const node = nodeMeshes[oiv.id];
                return node && node.userData.complex === sphere.userData.id;
            }) ? 0.8 : 0.3;
            sphere.material.needsUpdate = true;
        }
    });

    // Обновляем видимость связей
    Object.values(edgeLines).forEach(line => {
        const lineKey = Object.keys(edgeLines).find(key => edgeLines[key] === line);
        if (lineKey) {
            const [sourceId, targetId, theme, id] = lineKey.split('-');
            const isVisibleEdge = Array.from(connectedEdges).some(edge => edge.id === id);
            
            line.visible = isVisibleEdge;
            if (isVisibleEdge) {
                line.material.opacity = 
                    (oivWithPrograms.some(oiv => oiv.id === sourceId) || 
                     oivWithPrograms.some(oiv => oiv.id === targetId)) ? 1.0 : 0.6;
                line.material.needsUpdate = true;
            }
        }
    });

    // Центрируем камеру на выбранных объектах
    const objectsToFocus = [];
    
    Array.from(visibleOIVIds).forEach(id => {
        const node = nodeMeshes[id];
        if (node) objectsToFocus.push(node);
    });
    
    Array.from(visibleComplexes).forEach(id => {
        const complex = complexSpheres[id];
        if (complex) objectsToFocus.push(complex);
    });
    
    Array.from(connectedEdges).forEach(edge => {
        const line = edgeLines[`${edge.source}-${edge.target}-${edge.theme}-${edge.id}`];
        if (line) objectsToFocus.push(line);
    });
    
    centerOnObjects(objectsToFocus);

    if (window.updateInfoPanelData) {
        window.updateInfoPanelData(data, { programs: Array.isArray(programNames) ? programNames : [programNames] });
    }
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
	selectedFilters.complexes = selectedIds || [];

    document.querySelectorAll('#complex-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedFilters.complexes.includes(checkbox.value);
    });
    
    // Обновляем счетчик
    updateFilterCount('complex-filters', selectedFilters.complexes.length);
    
    // Обновляем состояние кнопки сброса
    const resetAllBtn = document.getElementById('reset-all-filters');
    if (resetAllBtn) {
        resetAllBtn.disabled = selectedFilters.oiv.length === 0 && 
                              selectedFilters.complexes.length === 0 && 
                              selectedFilters.themes.length === 0 && 
                              selectedFilters.strategies.length === 0;
        resetAllBtn.classList.toggle('disabled', resetAllBtn.disabled);
    }
	
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
            const [sourceId, targetId, theme, id] = lineKey.split('-');
            const isRelatedEdge = relatedEdges.some(edge => edge.id === id);
            
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
	
    if (window.updateInfoPanelData) {
        window.updateInfoPanelData(data, { complexes: selectedIds });
    }	
}

export function init3DScene() {
    if (!sceneInitialized) {
        init();
        sceneInitialized = true;
    }
}

window.selectOIV = selectOIV;
window.selectTheme = selectTheme;
window.selectStrategy = selectStrategy;
window.selectProgram = selectProgram;
window.resetSelection = resetSelection;
window.resetCameraPosition = resetCameraPosition;
window.updateSelectedComplexes = updateSelectedComplexes;

window.updateInfoPanelData = updateInfoPanelData;