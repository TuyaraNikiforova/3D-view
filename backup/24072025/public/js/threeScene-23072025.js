// Используем абсолютные CDN-ссылки
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/+esm');
const { OrbitControls } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/controls/OrbitControls.js/+esm');
const { FBXLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/loaders/FBXLoader.js/+esm');
const fbxLoader = new FBXLoader();


let scene, camera, renderer, controls;
let nodeMeshes = {};
let edgeArrows = {};
let complexSpheres = {};
let indicatorSpheres = {};
let indicatorGroups = {};
let selectedNodeId = null;
let selectedTheme = null;
let selectedComplex = null;
let selectedStrategy = null;
let selectedProgram = null;
let selectedProject = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let isComplexZoomed = false;
let originalCameraPosition = new THREE.Vector3();
let originalControlsTarget = new THREE.Vector3();
let focusMode = false;
let focusNodeId = null;
let focusScale = 1.5;
let connectedoivScale = 1.2;
let sceneScaleFactor = 5;
let data = {};
let sceneInitialized = false;

function init() {
    // Проверка контейнера
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
    renderer.sortObjects = true;
    renderer.setSize(containerWidth, containerHeight);
    container.appendChild(renderer.domElement);
    
    // Управление
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Настраиваем ограничения камеры и масштабирования
    controls.minDistance = 10 * sceneScaleFactor;
    controls.maxDistance = 320 * sceneScaleFactor;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    
    controls.addEventListener('change', function() {
        if (camera.position.length() < controls.minDistance) {
            camera.position.normalize().multiplyScalar(controls.minDistance);
        }
        if (camera.position.length() > controls.maxDistance) {
            camera.position.normalize().multiplyScalar(controls.maxDistance);
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
    });
    
    // Обработчики событий
    renderer.domElement.addEventListener('click', onCanvasClick, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onMouseWheel, false);
    
    // Анимация
    animate();
	
	document.addEventListener('filterChange', function(e) {
		const { type, id, checked } = e.detail;
		
		if (type === 'complex') {
			if (checked) {
				// Можно добавить подсветку выбранного комплекса
				const complex = complexSpheres[id];
				if (complex) {
					complex.material.opacity = 0.6;
					complex.material.needsUpdate = true;
				}
			} else {
				// Сброс подсветки
				const complex = complexSpheres[id];
				if (complex) {
					complex.material.opacity = 0.3;
					complex.material.needsUpdate = true;
				}
			}
		}
	});
	
	document.getElementById('back-btn').addEventListener('click', function() {
		resetSelection();
		animateCameraTo(originalCameraPosition, originalControlsTarget);
		this.style.display = 'none';
		isComplexZoomed = false;
		focusMode = false;
	});	
}

// Загрузка данных
async function loadData() {
    try {
        const response = await fetch('/data/data.json');
        data = await response.json();
        console.log('Data loaded:', data);
        
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

// Создание 3D сцены
function create3DScene(config) {
    const scaleFactor = sceneScaleFactor;

    // Создаем комплексы (сферы)
    config.complexes.forEach(complex => {
        const geometry = new THREE.SphereGeometry(complex.radius * scaleFactor, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color(complex.color),
            transparent: true,
            opacity: 0.3,
            wireframe: false,
            specular: new THREE.Color(0x111111),
            shininess: 50
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            complex.position.x * scaleFactor, 
            complex.position.y * scaleFactor, 
            complex.position.z * scaleFactor
        );

        mesh.userData = { 
            id: complex.id,
            name: complex.name,
            type: 'complex',
            originalPosition: { ...complex.position },
            originalRadius: complex.radius
        };

        scene.add(mesh);
        complexSpheres[complex.id] = mesh;
    });

    // Создаем узлы внутри комплексов
	config.oiv.forEach(node => {
		const complex = config.complexes.find(c => c.id === node.complex);
		if (!complex) return;

		const x = node.position.x * scaleFactor;
		const y = node.position.y * scaleFactor;
		const z = node.position.z * scaleFactor;

		// Загружаем FBX модель вместо создания сферы
		fbxLoader.load(
			'/models/oiv_model.fbx', // Путь к вашей FBX модели
			(fbx) => {
				fbx.scale.set(0.5 * scaleFactor, 0.5 * scaleFactor, 0.5 * scaleFactor);
				fbx.position.set(x, y, z);
				
				// Настройка материала (если нужно)
				fbx.traverse(child => {
					if (child.isMesh) {
						child.material = new THREE.MeshPhongMaterial({ 
							color: new THREE.Color(complex.color),
							emissive: 0x000000,
							specular: 0xffffff,
							shininess: 50,
							flatShading: false
						});
					}
				});

				fbx.userData = { 
					id: node.id, 
					name: node.name, 
					complex: node.complex,
					complexName: complex.name,
					strategies: node.strategies,
					programs: node.programs,
					projects: node.projects,
					indicators: node.indicators,
					type: 'node',
					originalPosition: { x, y, z }
				};

				scene.add(fbx);
				nodeMeshes[node.id] = fbx;
				createNodeIndicators(node.id, node);
			},
			(xhr) => {
				console.log((xhr.loaded / xhr.total * 100) + '% loaded');
			},
			(error) => {
				console.error('Error loading FBX model:', error);
				// В случае ошибки загрузки FBX, создаем сферу как резервный вариант
				createFallbackSphere(node, complex, x, y, z);
			}
		);
	});

	function createFallbackSphere(node, complex, x, y, z) {
		const color = new THREE.Color(complex.color);
		const geometry = new THREE.SphereGeometry(3*scaleFactor, 32, 32);
		const material = new THREE.MeshPhongMaterial({ 
			color: color,
			emissive: 0x000000,
			specular: 0xffffff,
			shininess: 50,
			flatShading: false
		});

		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(x, y, z);
		mesh.userData = { 
			id: node.id, 
			name: node.name, 
			complex: node.complex,
			complexName: complex.name,
			strategies: node.strategies,
			programs: node.programs,
			projects: node.projects,
			indicators: node.indicators,
			type: 'node',
			originalPosition: { x, y, z }
		};

		scene.add(mesh);
		nodeMeshes[node.id] = mesh;
		createNodeIndicators(node.id, node);
	}

    // Создаем стрелки для связей
    config.edges.forEach(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];

        if (sourceNode && targetNode) {
            const direction = new THREE.Vector3().subVectors(
                targetNode.position,
                sourceNode.position
            ).normalize();

            const start = new THREE.Vector3().copy(sourceNode.position)
                .addScaledVector(direction, 3 * sceneScaleFactor);

            const end = new THREE.Vector3().copy(targetNode.position)
                .addScaledVector(direction, -3 * sceneScaleFactor);

            const color = new THREE.Color(data.themeColors[edge.theme] || '#999999');
            const arrow = createArrow(start, end, color, edge.label, edge.theme);

            arrow.userData = { 
                id: `${edge.source}-${edge.target}-${edge.theme}-${edge.label.replace(/\s+/g, '-')}`,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                theme: edge.theme,
                type: 'arrow',
                sameComplex: sourceNode.userData.complex === targetNode.userData.complex
            };

            scene.add(arrow);
            edgeArrows[`${edge.source}-${edge.target}-${edge.theme}-${edge.label.replace(/\s+/g, '-')}`] = arrow;
        }
    });

    centerCamera();
}

// Функция для создания стрелки между двумя точками
function createArrow(from, to, color, label, theme) {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    const arrowLength = Math.min(length * 0.2, 3);
    const arrowRadius = 0.5;
    
    direction.normalize();
    
    const arrowGroup = new THREE.Group();
    
    // Создаем линию (стержень стрелки)
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: color,
        linewidth: 2,
        transparent: true,
        opacity: 0.3,
        depthTest: false,
        depthWrite: false
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    arrowGroup.add(line);
    
    // Создаем конус (наконечник стрелки)
    const coneGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.3, 
        depthTest: false,
        depthWrite: false
    });
    
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    const conePosition = new THREE.Vector3().copy(to);
    conePosition.addScaledVector(direction, -arrowLength * 0.5);
    
    cone.position.copy(conePosition);
    cone.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
    );
    
    arrowGroup.add(cone);
    arrowGroup.userData = {
        type: 'arrow',
        source: from,
        target: to,
        label: label,
        theme: theme
    };
    
    return arrowGroup;
}

// Создание индикаторов для узла
function createNodeIndicators(nodeId, nodeData) {
    const nodeMesh = nodeMeshes[nodeId];
    if (!nodeMesh || !nodeData.indicators || nodeData.indicators.length === 0) return;
    
    const indicatorGroup = new THREE.Group();
    indicatorGroup.position.copy(nodeMesh.position);
    indicatorGroup.userData = { nodeId: nodeId };
    
    nodeData.indicators.forEach((indicator, index) => {
        const angle = (index / nodeData.indicators.length) * Math.PI * 2;
        const distance = 2.5;
        
        const indicatorPos = new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            0
        );
        
        const indicatorSphere = createIndicatorSphere(
            indicatorPos,
            indicator.color,
            indicator.value
        );
        
        indicatorSphere.userData.name = indicator.name;
        indicatorSphere.userData.value = indicator.value;
        
        indicatorGroup.add(indicatorSphere);
        indicatorSpheres[`${nodeId}-indicator-${index}`] = indicatorSphere;
    });
    
    scene.add(indicatorGroup);
    indicatorGroups[nodeId] = indicatorGroup;
}

// Создание сферы-показателя
function createIndicatorSphere(position, color, value) {
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(color),
        emissive: 0x000000,
        specular: 0x111111,
        shininess: 30,
        flatShading: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = {
        type: 'indicator',
        value: value
    };
    
    return mesh;
}

// Центрирование камеры
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

    originalCameraPosition.copy(camera.position);
    originalControlsTarget.copy(controls.target);
}

// Обработчики событий
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
        showNodeInfo(object.userData.id);
        return;
    }
    
    // Проверяем клик по индикаторам
    const indicatorIntersects = raycaster.intersectObjects(
        Object.values(indicatorSpheres), 
        true
    );
    
    if (indicatorIntersects.length > 0) {
        const object = indicatorIntersects[0].object;
        // Показываем информацию о показателе
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
    if (!isComplexZoomed) {
        resetSelection();
        hideNodeInfo();
    }
}

function onMouseMove(event) {
    if (controls.enabled) {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const tooltip = document.getElementById('node-tooltip');
        
        // Проверяем пересечение с узлами
        const nodeIntersects = raycaster.intersectObjects(Object.values(nodeMeshes));
        
        if (nodeIntersects.length > 0) {
            const object = nodeIntersects[0].object;
            tooltip.textContent = object.userData.name;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY}px`;
            return;
        }
        
        // Проверяем пересечение с индикаторами
        const indicatorIntersects = raycaster.intersectObjects(Object.values(indicatorSpheres));
        
        if (indicatorIntersects.length > 0) {
            const object = indicatorIntersects[0].object;
            tooltip.textContent = `${object.userData.name}: ${object.userData.value}`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY}px`;
            return;
        }
        
        // Проверяем пересечение с комплексами
        const complexIntersects = raycaster.intersectObjects(Object.values(complexSpheres));
        
        if (complexIntersects.length > 0) {
            const object = complexIntersects[0].object;
            tooltip.textContent = object.userData.name;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY}px`;
            return;
        }
        
        // Проверяем пересечение со стрелками
        const arrowIntersects = raycaster.intersectObjects(Object.values(edgeArrows));
        
        if (arrowIntersects.length > 0) {
            const object = arrowIntersects[0].object;
            tooltip.textContent = `${object.userData.label} (${object.userData.theme})`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY}px`;
            return;
        }
        
        // Скрываем тултип
        tooltip.style.display = 'none';
    }
}

function onMouseWheel(event) {
    event.preventDefault();
    const delta = event.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    camera.position.sub(controls.target).multiplyScalar(zoomFactor).add(controls.target);
    controls.update();
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    
    // В режиме фокуса применяем масштабирование к узлам
    if (focusMode && focusNodeId) {
        const centerNode = nodeMeshes[focusNodeId];
        if (centerNode) {
            const targetScale = focusScale;
            centerNode.scale.lerp(
                new THREE.Vector3(targetScale, targetScale, targetScale),
                0.1
            );
            
            // Находим связанные узлы
            const connectedEdges = data.edges.filter(edge => 
                edge.source === focusNodeId || edge.target === focusNodeId
            );
            const connectedNodeIds = new Set();
            connectedEdges.forEach(edge => {
                connectedNodeIds.add(edge.source === focusNodeId ? edge.target : edge.source);
            });
            
            // Связанные узлы - немного крупнее
            connectedNodeIds.forEach(nodeId => {
                const node = nodeMeshes[nodeId];
                if (node) {
                    node.scale.lerp(
                        new THREE.Vector3(connectedoivScale, connectedoivScale, connectedoivScale),
                        0.1
                    );
                }
            });
        }
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// Функции для работы с узлами
function selectNode(nodeId) {
    resetSelection();
    
    selectedNodeId = nodeId;
    focusNodeId = nodeId;
    const nodeMesh = nodeMeshes[nodeId];
    if (!nodeMesh) return;

    document.getElementById('back-btn').style.display = 'block';
    focusMode = true;

    // 1. Подсветка выбранного узла
    nodeMesh.traverse(child => {
        if (child.isMesh) {
            child.material.color.setHex(0xffffff);
            child.material.needsUpdate = true;
        }
    });

    // 2. Увеличение радиуса выбранного узла
    animateNodeScale(nodeMesh, focusScale);

    // 3. Подсветка комплекса выбранного узла
    const complexSphere = complexSpheres[nodeMesh.userData.complex];
    if (complexSphere) {
        complexSphere.material.opacity = 0.3;
        complexSphere.material.needsUpdate = true;
    }

    // 4. Находим все связанные узлы
    const connectedEdges = data.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
    );
    
    const connectedNodeIds = new Set();
    connectedEdges.forEach(edge => {
        connectedNodeIds.add(edge.source === nodeId ? edge.target : edge.source);
    });

    // 5. Применяем визуальные эффекты к связанным узлам
    connectedNodeIds.forEach(otherNodeId => {
        const otherNode = nodeMeshes[otherNodeId];
        if (otherNode) {
            otherNode.material.emissive.setHex(0x333333);
            otherNode.material.needsUpdate = true;
        }
    });

    // Обновляем видимость элементов
    updateVisibilityForFocus(nodeId, Array.from(connectedNodeIds));

    // Добавляем отметку чекбокса для выбранного ОИВ в фильтрах
    const oivCheckbox = document.querySelector(`input[name="oiv"][value="${nodeId}"]`);
    if (oivCheckbox) {
        // Сбрасываем все чекбоксы ОИВ
        document.querySelectorAll('input[name="oiv"]').forEach(cb => {
            cb.checked = false;
        });
        // Ставим чекбокс для выбранного ОИВ
        oivCheckbox.checked = true;
        
        // Триггерим событие изменения фильтра
        const event = new Event('change');
        oivCheckbox.dispatchEvent(event);
    }
}

function animateNodeScale(nodeMesh, targetScale) {
    const startScale = 1;
    const duration = 500;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentScale = startScale + (targetScale - startScale) * progress;

        nodeMesh.scale.set(currentScale, currentScale, currentScale);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function animateNodeRadius(nodeMesh, targetRadius) {
    const startRadius = 3;
    const duration = 500;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentRadius = startRadius + (targetRadius - startRadius) * progress;

        const newGeometry = new THREE.SphereGeometry(currentRadius, 32, 32);
        nodeMesh.geometry.dispose();
        nodeMesh.geometry = newGeometry;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function calculateCameraPosition(nodeId) {
    const nodeMesh = nodeMeshes[nodeId];
    if (!nodeMesh) return { position: new THREE.Vector3(0, 0, 100), lookAt: new THREE.Vector3(0, 0, 0) };

    const connectedEdges = data.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
    );
    
    const connectedNodeIds = new Set();
    connectedEdges.forEach(edge => {
        connectedNodeIds.add(edge.source === nodeId ? edge.target : edge.source);
    });

    const boundingBox = new THREE.Box3().setFromPoints([nodeMesh.position]);
    
    Array.from(connectedNodeIds).forEach(otherNodeId => {
        const otherNode = nodeMeshes[otherNodeId];
        if (otherNode) {
            boundingBox.expandByPoint(otherNode.position);
        }
    });

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
    
    cameraZ = Math.max(30, Math.min(cameraZ, 200));
    
    const targetPosition = new THREE.Vector3(
        center.x + size.x * 0.3,
        center.y + size.y * 0.2,
        center.z + cameraZ
    );
    
    return {
        position: targetPosition,
        lookAt: center
    };
}

function updateVisibilityForFocus(centerNodeId, connectedNodeIds) {
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = false;
    });
    
    Object.values(edgeArrows).forEach(arrow => {
        arrow.visible = false;
    });
    
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = false;
    });

    const centerNode = nodeMeshes[centerNodeId];
    if (centerNode) {
        centerNode.visible = true;
        
        const complex = complexSpheres[centerNode.userData.complex];
        if (complex) {
            complex.visible = true;
        }
    }

    connectedNodeIds.forEach(nodeId => {
        const node = nodeMeshes[nodeId];
        if (node) {
            node.visible = true;
            
            const complex = complexSpheres[node.userData.complex];
            if (complex) {
                complex.visible = true;
            }
        }
    });

    data.edges.forEach(edge => {
        if ((edge.source === centerNodeId && connectedNodeIds.includes(edge.target)) || 
            (edge.target === centerNodeId && connectedNodeIds.includes(edge.source))) {
            
            const arrowId = `${edge.source}-${edge.target}-${edge.theme}-${edge.label.replace(/\s+/g, '-')}`;
            const arrow = edgeArrows[arrowId];
            if (arrow) {
                arrow.visible = true;
            }
        }
    });
}

function zoomToComplex(complexId) {
    const complex = complexSpheres[complexId];
    if (!complex) return;

    document.getElementById('back-btn').style.display = 'block';
    selectComplex(complexId);
    
    // Обновляем фильтры
    const checkboxes = document.querySelectorAll('input[name="complexes"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checkbox.value === complexId;
    });
}

function animateCameraTo(position, target) {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = Date.now();
    const duration = 800;
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        camera.position.lerpVectors(startPosition, position, progress);
        controls.target.lerpVectors(startTarget, target, progress);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function selectComplex(complexId) {
    resetSelection();
    selectedComplex = complexId;
    
    Object.values(nodeMeshes).forEach(mesh => {
        mesh.visible = false;
    });
    
    Object.values(edgeArrows).forEach(arrow => {
        arrow.visible = false;
    });
    
    Object.values(complexSpheres).forEach(sphere => {
        sphere.visible = false;
    });
    
    Object.values(indicatorGroups).forEach(group => {
        group.visible = false;
    });
    
    const complexSphere = complexSpheres[complexId];
    if (complexSphere) {
        complexSphere.visible = true;
        complexSphere.material.opacity = 0.3;
        complexSphere.material.needsUpdate = true;
    }
    
    const complexoiv = data.oiv.filter(node => node.complex === complexId);
    
    complexoiv.forEach(node => {
        const nodeMesh = nodeMeshes[node.id];
        if (nodeMesh) {
            nodeMesh.visible = true;
            nodeMesh.material.emissive.setHex(0x111111);
            nodeMesh.material.needsUpdate = true;
            
            const indicatorGroup = indicatorGroups[node.id];
            if (indicatorGroup) {
                indicatorGroup.visible = true;
                indicatorGroup.children.forEach(indicator => {
                    indicator.material.opacity = 0.6;
                    indicator.material.needsUpdate = true;
                });
            }
        }
    });
    
    const complexEdges = data.edges.filter(edge => {
        const sourceNode = nodeMeshes[edge.source];
        const targetNode = nodeMeshes[edge.target];
        return sourceNode && targetNode && 
               (sourceNode.userData.complex === complexId || 
                targetNode.userData.complex === complexId);
    });
    
    complexEdges.forEach(edge => {
        const arrowId = `${edge.source}-${edge.target}-${edge.theme}-${edge.label.replace(/\s+/g, '-')}`;
        const arrow = edgeArrows[arrowId];
        if (arrow) {
            arrow.visible = true;
            
            arrow.traverse(child => {
                if (child.material) {
                    child.material.opacity = 0.6;
                    child.material.needsUpdate = true;
                }
            });
        }
    });
    
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
    
    connectedComplexes.forEach(complexId => {
        const complexSphere = complexSpheres[complexId];
        if (complexSphere) {
            complexSphere.visible = true;
            complexSphere.material.opacity = 0.3;
            complexSphere.material.needsUpdate = true;
        }
        
        data.oiv.filter(node => node.complex === complexId).forEach(node => {
            const nodeMesh = nodeMeshes[node.id];
            if (nodeMesh) {
                const hasConnection = data.edges.some(edge => 
                    (edge.source === node.id && complexoiv.some(n => n.id === edge.target)) ||
                    (edge.target === node.id && complexoiv.some(n => n.id === edge.source))
                );
                
                if (hasConnection) {
                    nodeMesh.visible = true;
                    nodeMesh.material.emissive.setHex(0x111111);
                    nodeMesh.material.needsUpdate = true;
                    
                    const indicatorGroup = indicatorGroups[node.id];
                    if (indicatorGroup) {
                        indicatorGroup.visible = true;
                        indicatorGroup.children.forEach(indicator => {
                            indicator.material.opacity = 0.6;
                            indicator.material.needsUpdate = true;
                        });
                    }
                }
            }
        });
    });
}

function resetSelection() {
    focusMode = false;
    focusNodeId = null;
    isComplexZoomed = false;
    
    document.querySelectorAll('input[name="oiv"]').forEach(cb => {
        cb.checked = false;
    });
	
    Object.values(nodeMeshes).forEach(mesh => {
        const complexColor = new THREE.Color(data.complexes.find(c => c.id === mesh.userData.complex)?.color || '#7FB3D5');
        
        // Обновляем материалы для FBX модели
        mesh.traverse(child => {
            if (child.isMesh) {
                child.material.color.copy(complexColor);
                child.material.emissive.setHex(0x000000);
                child.material.opacity = 1.0;
                child.material.transparent = false;
                child.material.needsUpdate = true;
            }
        });
        
        mesh.scale.set(1, 1, 1);
        mesh.visible = true;
    });
    
    Object.values(edgeArrows).forEach(arrow => {
        arrow.visible = true;
        arrow.traverse(child => {
            if (child.material) {
                child.material.opacity = child instanceof THREE.Line ? 0.2 : 0.8;
                child.material.needsUpdate = true;
            }
        });
    });
    
    Object.values(complexSpheres).forEach(sphere => {
        sphere.material.opacity = 0.3;
        sphere.visible = true;
        sphere.material.needsUpdate = true;
    });
    
    Object.values(indicatorGroups).forEach(group => {
        group.visible = true;
        group.children.forEach(indicator => {
            indicator.material.opacity = 1.0;
            indicator.material.needsUpdate = true;
        });
    });
    
    selectedNodeId = null;
    selectedTheme = null;
    selectedComplex = null;
    selectedStrategy = null;
    selectedProgram = null;
    selectedProject = null;
}
export function update3DScene(data) {
    if (!sceneInitialized) {
        console.warn('3D scene not initialized yet');
        return;
    }
    console.log('Updating 3D scene with new data', data);
    // Здесь должна быть логика обновления сцены
}

// Экспорт функции для инициализации сцены
export function init3DScene() {
    if (!sceneInitialized) {
        init(); // Вызываем основную функцию инициализации
        sceneInitialized = true;
    }
}



window.zoomToComplex = zoomToComplex;
window.resetSelection = resetSelection;
