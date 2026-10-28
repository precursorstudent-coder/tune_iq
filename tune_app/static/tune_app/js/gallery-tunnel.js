/*
  GalleryTunnel — vanilla JS + Three.js scroll-through image tunnel.
  Ported from a Framer/React component. Requires Three.js loaded first:

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="{% static 'tune_app/js/gallery-tunnel.js' %}"></script>

  Usage:
    <div id="galleryTunnel" style="width:100%; height:500px;"></div>
    <script>
      initGalleryTunnel('galleryTunnel', {
        images: [
          "{% static 'tune_app/images/music1.jpg' %}",
          "{% static 'tune_app/images/music2.jpg' %}",
          "{% static 'tune_app/images/music3.jpg' %}",
          "{% static 'tune_app/images/earth.jpg' %}"
        ],
        labelText: "Scroll or press to move"
      });
    </script>
*/

function initGalleryTunnel(containerId, userOptions = {}) {
    const TUNNEL_WIDTH = 2;
    const TUNNEL_HEIGHT = 1.8;
    const SEGMENT_DEPTH = 1;
    const NUM_SEGMENTS = 15;
    const LINE_RADIUS = 0.003;
    const SCROLL_TO_Z = 0.05;
    const CAMERA_CHASE = 0.1;
    const FADE_IN = 1;
    const FOG_FAR = NUM_SEGMENTS * SEGMENT_DEPTH * 0.95;

    const defaults = {
        images: [],
        colors: ["#FF6A00", "#AB54F7", "#EA3737", "#0072E3", "#00AA3C", "#FFB200"],
        background: "rgb(20, 19, 19)",
        lineColor: "#605d5d",
        lineOpacity: 50,
        grid: 4,
        speed: 15,
        boost: 77,
        fade: 97,
        label:false,

        
    };
    const opts = { ...defaults, ...userOptions };

    if (typeof THREE === "undefined") {
        console.error("GalleryTunnel: Three.js must be loaded before this script.");
        return;
    }

    const frame = document.getElementById(containerId);
    if (!frame) {
        console.error(`GalleryTunnel: no element with id "${containerId}" found`);
        return;
    }
    frame.style.position = "relative";
    frame.style.overflow = "hidden";
    frame.style.cursor = "default";

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    frame.appendChild(canvas);

    let cursorEl = null;
    if (opts.label) {
        cursorEl = document.createElement("div");
        cursorEl.textContent = opts.labelText;
        Object.assign(cursorEl.style, {
            position: "absolute", top: "0", left: "0",
            transform: "translate(0%, -100%) scale(1)",
            pointerEvents: "none", opacity: "0",
            background: opts.labelFill, borderRadius: "9999px",
            padding: "10px 20px", transition: "transform 0.1s ease, opacity 0.2s ease",
            whiteSpace: "nowrap", userSelect: "none",
            fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: "500",
            color: opts.labelColor,
        });
        frame.appendChild(cursorEl);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.background);
    const fogNear = Math.min(FOG_FAR * (1 - Math.min(100, Math.max(0, opts.fade)) / 100), FOG_FAR - 0.01);
    scene.fog = new THREE.Fog(new THREE.Color(opts.background), fogNear, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const lineMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(opts.lineColor), transparent: true,
        opacity: Math.min(100, Math.max(0, opts.lineOpacity)) / 100,
    });

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const fading = [];

    let imageIndex = 0, colorIndex = 0, populateIndex = 0, scrollPos = 0;
    let raf = 0, last = 0, pressed = false, alive = true;

    const hw = TUNNEL_WIDTH / 2, hh = TUNNEL_HEIGHT / 2;
    const cols = Math.max(1, Math.round(opts.grid));
    const rows = Math.max(1, Math.round(opts.grid));
    const colW = TUNNEL_WIDTH / cols, rowH = TUNNEL_HEIGHT / rows;

    const geoFloor = new THREE.PlaneGeometry(colW, SEGMENT_DEPTH);
    const geoWall = new THREE.PlaneGeometry(SEGMENT_DEPTH, rowH);
    const geoTubeZ = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-SEGMENT_DEPTH)), 1, LINE_RADIUS, 8);
    const geoTubeX = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(TUNNEL_WIDTH,0,0)), 1, LINE_RADIUS, 8);
    const geoTubeY = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,TUNNEL_HEIGHT,0)), 1, LINE_RADIUS, 8);

    const colorMats = opts.colors.map(hex => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), side: THREE.DoubleSide }));
    const imageMats = (opts.images.length ? opts.images : []).map(url => {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });
        loader.load(url, (tex) => {
            if (!alive) { tex.dispose(); return; }
            tex.minFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.needsUpdate = true;
            fading.push(mat);
        }, undefined, () => {});
        return mat;
    });
    // if no images provided, tunnel still works using only colors
    const hasImages = imageMats.length > 0;

    function tube(geo, x, y, z = 0) {
        const m = new THREE.Mesh(geo, lineMaterial);
        m.position.set(x, y, z);
        return m;
    }

    const SLOTS = [];
    {
        const z = -SEGMENT_DEPTH / 2;
        for (let i = 0; i < cols; i++) {
            const x = -hw + i * colW + colW / 2;
            SLOTS.push({ geo: geoFloor, pos: new THREE.Vector3(x, -hh, z), rot: new THREE.Euler(-Math.PI/2, 0, 0) });
            SLOTS.push({ geo: geoFloor, pos: new THREE.Vector3(x, hh, z), rot: new THREE.Euler(Math.PI/2, 0, 0) });
        }
        for (let i = 0; i < rows; i++) {
            const y = -hh + i * rowH + rowH / 2;
            SLOTS.push({ geo: geoWall, pos: new THREE.Vector3(-hw, y, z), rot: new THREE.Euler(0, Math.PI/2, 0) });
            SLOTS.push({ geo: geoWall, pos: new THREE.Vector3(hw, y, z), rot: new THREE.Euler(0, -Math.PI/2, 0) });
        }
    }

    function populate(group) {
        const takesSlabs = populateIndex % 2 === 0;
        populateIndex++;
        const slabs = group.userData.slabs;
        for (const slab of slabs) {
            if (!takesSlabs || Math.random() > 0.5) { slab.visible = false; continue; }
            slab.visible = true;
            if (!hasImages || Math.random() > 0.5) {
                slab.material = colorMats[(5 * colorIndex) % colorMats.length];
                colorIndex++;
            } else {
                slab.material = imageMats[(3 * imageIndex) % imageMats.length];
                imageIndex++;
            }
        }
    }

    function createSegment(z) {
        const group = new THREE.Group();
        group.position.z = z;
        for (let i = 0; i <= cols; i++) {
            const x = -hw + i * colW;
            group.add(tube(geoTubeZ, x, -hh));
            group.add(tube(geoTubeZ, x, hh));
        }
        for (let i = 1; i < rows; i++) {
            const y = -hh + i * rowH;
            group.add(tube(geoTubeZ, -hw, y));
            group.add(tube(geoTubeZ, hw, y));
        }
        group.add(tube(geoTubeX, -hw, -hh));
        group.add(tube(geoTubeX, -hw, hh));
        group.add(tube(geoTubeY, -hw, -hh));
        group.add(tube(geoTubeY, hw, -hh));

        const slabs = SLOTS.map(slot => {
            const m = new THREE.Mesh(slot.geo, colorMats[0]);
            m.position.copy(slot.pos);
            m.rotation.copy(slot.rot);
            m.visible = false;
            group.add(m);
            return m;
        });
        group.userData.slabs = slabs;
        populate(group);
        return group;
    }

    const segments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const g = createSegment(-i * SEGMENT_DEPTH);
        scene.add(g);
        segments.push(g);
    }

    function resize() {
        const w = Math.max(1, frame.clientWidth);
        const h = Math.max(1, frame.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(frame);
    resize();

    function animate(now) {
        if (!alive) return;
        raf = requestAnimationFrame(animate);
        const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
        last = now;

        const speed = Math.max(0, opts.speed) / 100;
        const boost = Math.max(0, opts.boost) / 10;
        scrollPos += pressed ? boost : speed;

        const want = -SCROLL_TO_Z * scrollPos;
        camera.position.z += CAMERA_CHASE * (want - camera.position.z);

        const span = NUM_SEGMENTS * SEGMENT_DEPTH;
        const z = camera.position.z;
        for (const seg of segments) {
            if (seg.position.z > z + SEGMENT_DEPTH) {
                let min = 0;
                for (const s of segments) min = Math.min(min, s.position.z);
                seg.position.z = min - SEGMENT_DEPTH;
                populate(seg);
            } else if (seg.position.z < z - span - SEGMENT_DEPTH) {
                let max = -999999;
                for (const s of segments) max = Math.max(max, s.position.z);
                seg.position.z = max + SEGMENT_DEPTH;
                populate(seg);
            }
        }

        for (let i = fading.length - 1; i >= 0; i--) {
            const m = fading[i];
            m.opacity = Math.min(1, m.opacity + dt / FADE_IN);
            if (m.opacity >= 1) fading.splice(i, 1);
        }

        renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    function onMove(e) {
        if (!cursorEl) return;
        const rect = frame.getBoundingClientRect();
        const sx = rect.width > 0 ? frame.clientWidth / rect.width : 1;
        const sy = rect.height > 0 ? frame.clientHeight / rect.height : 1;
        cursorEl.style.left = `${(e.clientX - rect.left) * sx}px`;
        cursorEl.style.top = `${(e.clientY - rect.top) * sy}px`;
    }
    function onEnter() { if (cursorEl) cursorEl.style.opacity = "1"; }
    function onLeave() {
        pressed = false;
        if (cursorEl) { cursorEl.style.opacity = "0"; cursorEl.style.transform = "translate(0%, -100%) scale(1)"; }
    }
    function onDown() { pressed = true; if (cursorEl) cursorEl.style.transform = "translate(0%, -100%) scale(0.85)"; }
    function onUp() { pressed = false; if (cursorEl) cursorEl.style.transform = "translate(0%, -100%) scale(1)"; }

    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerenter", onEnter);
    frame.addEventListener("pointerleave", onLeave);
    frame.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // optional cleanup handle, e.g. galleryTunnelHandle.destroy()
    return {
        destroy() {
            alive = false;
            cancelAnimationFrame(raf);
            ro.disconnect();
            frame.removeEventListener("pointermove", onMove);
            frame.removeEventListener("pointerenter", onEnter);
            frame.removeEventListener("pointerleave", onLeave);
            frame.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            geoFloor.dispose(); geoWall.dispose();
            geoTubeZ.dispose(); geoTubeX.dispose(); geoTubeY.dispose();
            colorMats.forEach(m => m.dispose());
            imageMats.forEach(m => { m.map?.dispose(); m.dispose(); });
            lineMaterial.dispose();
            renderer.dispose();
        }
    };
}