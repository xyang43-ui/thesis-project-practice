window.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('viewport');
    const camera = document.getElementById('camera');
    const container = document.getElementById('graph-container');
    const svgCanvas = document.getElementById('svg-canvas');

    if (!camera || !viewport) return;

    // --- State Management ---
    let scale = 1.0;
    let translateX = window.innerWidth / 2;
    let translateY = window.innerHeight / 2;
    
    // Tracking multiple pointers for pinch-to-zoom
    let evCache = [];
    let prevDiff = -1;
    let isDragging = false;
    let lastX, lastY;
    
    // To distinguish click from drag
    let dragDistance = 0;
    const DRAG_THRESHOLD = 10; // Pixels

    function updateCamera() {
        camera.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    updateCamera();

    // Helper: Zoom at specific screen point
    function zoomAt(x, y, delta) {
        const oldScale = scale;
        scale = Math.min(Math.max(0.1, scale + delta), 5);
        
        const worldX = (x - translateX) / oldScale;
        const worldY = (y - translateY) / oldScale;

        translateX = x - worldX * scale;
        translateY = y - worldY * scale;
        updateCamera();
    }

    // --- Unified Pointer Events ---
    viewport.onpointerdown = (e) => {
        evCache.push(e);
        if (evCache.length === 1) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            dragDistance = 0;
        }
    };

    viewport.onpointermove = (e) => {
        // Find this pointer in the cache and update its data
        const index = evCache.findIndex(ev => ev.pointerId === e.pointerId);
        if (index !== -1) evCache[index] = e;

        if (evCache.length === 1 && isDragging) {
            // SINGLE POINTER: PAN
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            translateX += dx;
            translateY += dy;
            lastX = e.clientX;
            lastY = e.clientY;
            dragDistance += Math.hypot(dx, dy);
            updateCamera();
        } else if (evCache.length === 2) {
            // MULTI POINTER: PINCH ZOOM
            const curDiff = Math.hypot(evCache[0].clientX - evCache[1].clientX, evCache[0].clientY - evCache[1].clientY);
            
            if (prevDiff > 0) {
                const midX = (evCache[0].clientX + evCache[1].clientX) / 2;
                const midY = (evCache[0].clientY + evCache[1].clientY) / 2;
                const zoomAmount = (curDiff - prevDiff) * 0.005;
                zoomAt(midX, midY, zoomAmount);
            }
            prevDiff = curDiff;
        }
    };

    viewport.onpointerup = viewport.onpointercancel = viewport.onpointerout = viewport.onpointerleave = (e) => {
        // Remove from cache
        const index = evCache.findIndex(ev => ev.pointerId === e.pointerId);
        if (index !== -1) evCache.splice(index, 1);
        
        if (evCache.length < 2) {
            prevDiff = -1;
        }
        if (evCache.length === 0) {
            isDragging = false;
        }
    };

    // Wheel support for desktop
    viewport.onwheel = (e) => {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, -e.deltaY * 0.0015);
    };

    // --- Graph Logic ---
    const nodeDataMap = {
        'root': [{ label: '[MUSIC]', type: 'music', content: 'Sonic exploration and temporal structures.' }],
        'music': [{ label: '[GRAVITY_2_PROJECT]', type: 'project', content: 'Video extension of musical concepts.', video: 'gravity_2.mp4' }],
        'project': [
            { label: '[REPETITION]', type: 'keyword' }, { label: '[ENDURANCE]', type: 'keyword' },
            { label: '[RESILIENCE]', type: 'keyword' }, { label: '[AUTHOR]', type: 'keyword' },
            { label: '[INSTRUCTIONS]', type: 'keyword' }, { label: '[COLLECTIVE]', type: 'keyword' },
            { label: '[DECONSTRUCTION]', type: 'keyword' }, { label: '[RECONSTRUCTION]', type: 'keyword' },
            { label: '[DATABASE]', type: 'keyword' }, { label: '[WEB_VIEW]', type: 'link', url: 'https://thesis-webmv.vercel.app/' }
        ]
    };

    function createConnection(x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        svgCanvas.appendChild(line);
        return line;
    }

    function createNode(parentNode, data) {
        const parentX = parseFloat(parentNode.style.left) || 0;
        const parentY = parseFloat(parentNode.style.top) || 0;
        const distance = 250 + Math.random() * 350;
        const angle = Math.random() * Math.PI * 2;
        const targetX = parentX + Math.cos(angle) * distance;
        const targetY = parentY + Math.sin(angle) * distance;

        const newNode = document.createElement('div');
        newNode.className = 'node';
        newNode.style.left = `${targetX}px`;
        newNode.style.top = `${targetY}px`;
        newNode.innerHTML = `
            <div class="node-label">${data.label}</div>
            ${data.video ? `<video class="node-video" src="${data.video}" autoplay loop muted playsinline></video>` : ''}
            ${data.url ? `<a href="${data.url}" target="_blank" class="node-link">URL: EXTERNAL_VIEW</a>` : ''}
            <div class="node-content"></div>
        `;
        container.appendChild(newNode);
        const line = createConnection(parentX, parentY, targetX, targetY);
        newNode._line = line; newNode._children = [];
        parentNode._children.push(newNode);

        // Click handler with drag protection
        newNode.onpointerup = (e) => {
            if (dragDistance < DRAG_THRESHOLD) {
                e.stopPropagation();
                toggleNode(newNode, data.type);
            }
        };

        const contentText = data.content || `SYSLOG: ${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
        let charIndex = 0;
        const contentContainer = newNode.querySelector('.node-content');
        function type() {
            if (charIndex < contentText.length) {
                contentContainer.textContent += contentText[charIndex];
                charIndex++;
                setTimeout(type, 10);
            }
        }
        type();
        return newNode;
    }

    function toggleNode(node, type) {
        if (node._children && node._children.length > 0) {
            removeChildren(node);
        } else {
            const subData = nodeDataMap[type];
            if (subData) {
                subData.forEach(data => createNode(node, data));
            } else {
                for (let i = 0; i < 2; i++) {
                    createNode(node, { label: `[EXT_INFO]`, type: 'none' });
                }
            }
        }
    }

    function removeChildren(node) {
        if (!node._children) return;
        node._children.forEach(child => {
            removeChildren(child); 
            if (child._line && svgCanvas.contains(child._line)) svgCanvas.removeChild(child._line);
            if (container.contains(child)) container.removeChild(child);
        });
        node._children = [];
    }

    const root = document.getElementById('root');
    if (root) {
        root.style.left = "0px";
        root.style.top = "0px";
        root._children = [];
        root.onpointerup = (e) => {
            if (dragDistance < DRAG_THRESHOLD) {
                e.stopPropagation();
                toggleNode(root, 'root');
            }
        };
    }
});
