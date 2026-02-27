window.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('viewport');
    const camera = document.getElementById('camera');
    const container = document.getElementById('graph-container');
    const svgCanvas = document.getElementById('svg-canvas');

    if (!camera || !viewport) return;

    // --- Viewport State ---
    let scale = 1.0;
    let translateX = window.innerWidth / 2;
    let translateY = window.innerHeight / 2;
    
    // --- Interaction State ---
    let isDragging = false;
    let lastX, lastY;
    let lastTouchDistance = 0; // For pinch-to-zoom

    function updateCamera() {
        camera.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    updateCamera();

    // --- MOUSE EVENTS ---
    viewport.onwheel = (e) => {
        e.preventDefault();
        const zoomSpeed = 0.0015;
        const deltaScale = -e.deltaY * zoomSpeed;
        zoomAt(e.clientX, e.clientY, deltaScale);
    };

    viewport.onmousedown = (e) => {
        if (e.button === 0) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    };

    window.onmousemove = (e) => {
        if (isDragging) {
            translateX += e.clientX - lastX;
            translateY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            updateCamera();
        }
    };

    window.onmouseup = () => { isDragging = false; };

    // --- TOUCH EVENTS (FOR IPHONE) ---
    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Start pinch-to-zoom
            lastTouchDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent page scroll/refresh
        
        if (e.touches.length === 1 && isDragging) {
            // One finger: PAN
            translateX += e.touches[0].clientX - lastX;
            translateY += e.touches[0].clientY - lastY;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            updateCamera();
        } else if (e.touches.length === 2) {
            // Two fingers: PINCH ZOOM
            const newDistance = getDistance(e.touches[0], e.touches[1]);
            const deltaDist = newDistance - lastTouchDistance;
            
            // Zoom at the midpoint between fingers
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const zoomAmount = deltaDist * 0.005; // Sensitivity
            zoomAt(midX, midY, zoomAmount);
            
            lastTouchDistance = newDistance;
        }
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
        isDragging = false;
        lastTouchDistance = 0;
    });

    // Helper: Zoom calculation
    function zoomAt(x, y, delta) {
        const oldScale = scale;
        scale = Math.min(Math.max(0.1, scale + delta), 5);
        
        const worldX = (x - translateX) / oldScale;
        const worldY = (y - translateY) / oldScale;

        translateX = x - worldX * scale;
        translateY = y - worldY * scale;
        updateCamera();
    }

    // Helper: Distance between two points
    function getDistance(p1, p2) {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    }

    // --- Graph Logic ---
    const nodeDataMap = {
        'root': [{ label: '[MUSIC]', type: 'music', content: 'Sonic exploration and temporal structures.' }],
        'music': [{ label: '[GRAVITY_2_PROJECT]', type: 'project', content: 'Video extension of musical concepts.', video: 'gravity_2.mp4' }],
        'project': [
            { label: '[REPETITION]', type: 'keyword' },
            { label: '[ENDURANCE]', type: 'keyword' },
            { label: '[RESILIENCE]', type: 'keyword' },
            { label: '[AUTHOR]', type: 'keyword' },
            { label: '[INSTRUCTIONS]', type: 'keyword' },
            { label: '[COLLECTIVE]', type: 'keyword' },
            { label: '[DECONSTRUCTION]', type: 'keyword' },
            { label: '[RECONSTRUCTION]', type: 'keyword' },
            { label: '[DATABASE]', type: 'keyword' },
            { label: '[WEB_VIEW]', type: 'link', url: 'https://thesis-webmv.vercel.app/' }
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

        newNode.onclick = (e) => {
            e.stopPropagation();
            toggleNode(newNode, data.type);
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
        root.onclick = (e) => {
            e.stopPropagation();
            toggleNode(root, 'root');
        };
    }
});
