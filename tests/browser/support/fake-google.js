/*
 * Stand-in for the Google Maps JavaScript API, for browser tests only.
 *
 * The real API needs a key and the network, and its imagery changes, so the tests load
 * this instead: the app's own bundle runs untouched against it. It implements just what
 * the property map uses (Map, Polyline, AdvancedMarkerElement, InfoWindow, overlay map
 * types, spherical geometry, a place search box) with the same Web Mercator math, drawn
 * with plain DOM and SVG over a generated "aerial" background.
 *
 * What it proves: the app's layout, labels and interactions in a real browser.
 * What it does not prove: anything about Google's own rendering (vector maps, overlay
 * tiles, real imagery, attribution). That needs a run with a real key.
 */
(() => {
    const TILE = 256;
    const world = ({ lat, lng }, zoom) => {
        const size = TILE * 2 ** zoom;
        const sin = Math.sin((lat * Math.PI) / 180);
        return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
    };
    const unworld = ({ x, y }, zoom) => {
        const size = TILE * 2 ** zoom;
        const n = Math.PI * (1 - (2 * y) / size);
        return { lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI, lng: (x / size) * 360 - 180 };
    };
    const literal = (value) => (typeof value.lat === 'function' ? { lat: value.lat(), lng: value.lng() } : { lat: value.lat, lng: value.lng });
    const latLng = (value) => {
        const point = literal(value);
        return { lat: () => point.lat, lng: () => point.lng, toJSON: () => ({ ...point }) };
    };

    class Emitter {
        constructor() {
            this.handlers = {};
        }

        addListener(name, handler) {
            (this.handlers[name] ||= new Set()).add(handler);
            return { remove: () => this.handlers[name].delete(handler) };
        }

        emit(name, payload) {
            [...(this.handlers[name] || [])].forEach((handler) => handler(payload));
        }
    }

    const SVG = 'http://www.w3.org/2000/svg';

    class FakeMap extends Emitter {
        constructor(element, options = {}) {
            super();
            this.element = element;
            this.options = { draggable: true, ...options };
            this.center = literal(options.center || { lat: 0, lng: 0 });
            this.zoom = options.zoom ?? 20;
            this.polylines = new Set();
            this.markers = new Set();

            element.style.position = element.style.position || 'relative';
            element.innerHTML = '';
            this.root = document.createElement('div');
            this.root.className = 'gm-style';
            this.root.style.cssText = 'position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;';
            this.tiles = document.createElement('div');
            this.tiles.style.cssText = 'position:absolute;inset:0;';
            this.overlay = document.createElement('div');
            this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
            this.svg = document.createElementNS(SVG, 'svg');
            this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
            this.markerLayer = document.createElement('div');
            this.markerLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
            this.attribution = document.createElement('div');
            this.attribution.textContent = 'Test imagery (not Google)';
            this.attribution.style.cssText = 'position:absolute;right:0;bottom:0;padding:1px 6px;font:10px sans-serif;background:rgba(255,255,255,.7);color:#333;pointer-events:none;';
            this.root.append(this.tiles, this.overlay, this.svg, this.markerLayer, this.attribution);
            element.appendChild(this.root);

            const layers = [];
            this.overlayMapTypes = {
                getArray: () => layers,
                getLength: () => layers.length,
                insertAt: (index, type) => {
                    layers.splice(index, 0, type);
                    this.renderOverlay();
                },
                removeAt: (index) => {
                    layers.splice(index, 1);
                    this.renderOverlay();
                },
            };

            this.bindPointer();
            new ResizeObserver(() => this.render()).observe(element);
            this.render();
            window.__fakeMap = this;
            setTimeout(() => {
                this.emit('tilesloaded');
                this.emit('idle');
            }, 0);
        }

        size() {
            return { width: this.element.clientWidth, height: this.element.clientHeight };
        }

        // Pixel inside the map element for a location, and back.
        toPixel(value) {
            const origin = world(this.center, this.zoom);
            const point = world(literal(value), this.zoom);
            const { width, height } = this.size();
            return { x: width / 2 + point.x - origin.x, y: height / 2 + point.y - origin.y };
        }

        toLatLng(pixel) {
            const origin = world(this.center, this.zoom);
            const { width, height } = this.size();
            return unworld({ x: origin.x + pixel.x - width / 2, y: origin.y + pixel.y - height / 2 }, this.zoom);
        }

        // Same, in viewport coordinates (what getBoundingClientRect uses).
        toClient(value) {
            const box = this.element.getBoundingClientRect();
            const pixel = this.toPixel(value);
            return { x: box.left + pixel.x, y: box.top + pixel.y };
        }

        fromClient(x, y) {
            const box = this.element.getBoundingClientRect();
            return this.toLatLng({ x: x - box.left, y: y - box.top });
        }

        render() {
            // Generated aerial look: lawns, a few roofs and a street, fixed to the ground.
            const origin = world(this.center, this.zoom);
            const { width, height } = this.size();
            const k = 2 ** (this.zoom - 20);
            const lot = 420 * k;
            const x = -(origin.x - width / 2) % lot;
            const y = -(origin.y - height / 2) % lot;
            this.tiles.style.background = [
                `linear-gradient(90deg, transparent 0 ${lot * 0.86}px, #6f716c ${lot * 0.86}px ${lot}px) ${x}px ${y}px / ${lot}px ${lot}px`,
                `radial-gradient(circle at 30% 35%, #8d8473 0 ${lot * 0.16}px, transparent ${lot * 0.165}px) ${x}px ${y}px / ${lot}px ${lot}px`,
                `radial-gradient(circle at 62% 70%, #2f4a2c 0 ${lot * 0.07}px, transparent ${lot * 0.075}px) ${x}px ${y}px / ${lot}px ${lot}px`,
                `linear-gradient(0deg, #4f6a45, #5d7751) ${x}px ${y}px / ${lot}px ${lot}px`,
            ].join(',');
            this.polylines.forEach((line) => line.render());
            this.markers.forEach((marker) => marker.render());
        }

        renderOverlay() {
            this.overlay.innerHTML = '';
            for (const type of this.overlayMapTypes.getArray()) {
                const tile = type.getTile({ x: 0, y: 0 }, Math.round(this.zoom), document);
                tile.style.width = '100%';
                tile.style.height = '100%';
                tile.style.position = 'absolute';
                tile.dataset.overlay = type.name || '';
                this.overlay.appendChild(tile);
            }
        }

        mouseEvent(domEvent) {
            return { latLng: latLng(this.fromClient(domEvent.clientX, domEvent.clientY)), domEvent };
        }

        bindPointer() {
            let down = null;
            this.tiles.style.pointerEvents = 'auto';
            this.tiles.addEventListener('mousedown', (event) => this.emit('mousedown', this.mouseEvent(event)));
            this.tiles.addEventListener('mouseup', (event) => this.emit('mouseup', this.mouseEvent(event)));
            this.tiles.addEventListener('mousemove', (event) => this.emit('mousemove', this.mouseEvent(event)));
            this.tiles.addEventListener('mouseleave', (event) => this.emit('mouseout', this.mouseEvent(event)));
            this.tiles.addEventListener('pointerdown', (event) => {
                down = { x: event.clientX, y: event.clientY, center: world(this.center, this.zoom), moved: false };
                this.tiles.setPointerCapture?.(event.pointerId);
            });
            this.tiles.addEventListener('pointermove', (event) => {
                if (!down) {
                    return;
                }
                const dx = event.clientX - down.x;
                const dy = event.clientY - down.y;
                if (Math.hypot(dx, dy) > 4) {
                    down.moved = true;
                }
                if (down.moved && this.options.draggable !== false) {
                    this.center = unworld({ x: down.center.x - dx, y: down.center.y - dy }, this.zoom);
                    this.render();
                }
            });
            this.tiles.addEventListener('pointerup', (event) => {
                const wasDown = down;
                down = null;
                if (!wasDown) {
                    return;
                }
                if (!wasDown.moved) {
                    this.emit('click', this.mouseEvent(event));
                } else if (this.options.draggable !== false) {
                    this.emit('idle');
                }
            });
            this.root.addEventListener('wheel', (event) => {
                event.preventDefault();
                this.setZoom(this.zoom + (event.deltaY < 0 ? 1 : -1));
            }, { passive: false });
        }

        getDiv() {
            return this.element;
        }

        getZoom() {
            return this.zoom;
        }

        setZoom(zoom) {
            const next = Math.max(this.options.minZoom ?? 0, Math.min(this.options.maxZoom ?? 22, zoom));
            if (next === this.zoom) {
                return;
            }
            this.zoom = next;
            this.render();
            this.emit('zoom_changed');
            this.emit('idle');
        }

        getCenter() {
            return latLng(this.center);
        }

        setCenter(center) {
            this.center = literal(center);
            this.render();
            this.emit('idle');
        }

        panTo(center) {
            this.setCenter(center);
        }

        getBounds() {
            const { width, height } = this.size();
            return {
                contains: (value) => {
                    const pixel = this.toPixel(value);
                    return pixel.x >= 0 && pixel.y >= 0 && pixel.x <= width && pixel.y <= height;
                },
            };
        }

        setOptions(options) {
            Object.assign(this.options, options);
            this.tiles.style.cursor = options.draggableCursor || '';
        }

        getTilt() {
            return 0;
        }

        setTilt() {}

        getHeading() {
            return 0;
        }

        setHeading() {}
    }

    class Polyline extends Emitter {
        constructor(options = {}) {
            super();
            this.options = { strokeColor: '#000000', strokeOpacity: 1, strokeWeight: 3, clickable: true };
            this.path = [];
            this.map = null;
            this.node = document.createElementNS(SVG, 'g');
            this.line = document.createElementNS(SVG, 'line');
            this.dot = document.createElementNS(SVG, 'circle');
            this.node.append(this.line, this.dot);
            this.line.addEventListener('click', (event) => this.emit('click', this.map.mouseEvent(event)));
            this.setOptions(options);
        }

        setOptions(options) {
            const { map, path, ...rest } = options;
            Object.assign(this.options, rest);
            if (path) {
                this.path = path.map(literal);
            }
            if (map !== undefined) {
                this.setMap(map);
            } else {
                this.render();
            }
        }

        setPath(path) {
            this.path = path.map(literal);
            this.render();
        }

        getMap() {
            return this.map;
        }

        setMap(map) {
            if (this.map === map) {
                this.render();
                return;
            }
            this.map?.polylines.delete(this);
            this.node.remove();
            this.map = map;
            if (map) {
                map.polylines.add(this);
                map.svg.appendChild(this.node);
                this.render();
            }
        }

        render() {
            if (!this.map || this.path.length < 2) {
                this.line.setAttribute('visibility', 'hidden');
                this.dot.setAttribute('visibility', 'hidden');
                return;
            }
            const [a, b] = [this.map.toPixel(this.path[0]), this.map.toPixel(this.path[this.path.length - 1])];
            const { strokeColor, strokeOpacity, strokeWeight, icons, zIndex, clickable } = this.options;
            const icon = icons?.[0];
            const dashed = strokeOpacity === 0 && icon;
            const isDot = Boolean(icon && /A/.test(icon.icon.path));
            this.node.style.zIndex = zIndex ?? 0;
            this.node.dataset.z = zIndex ?? 0;
            this.line.setAttribute('visibility', 'visible');
            this.line.setAttribute('x1', a.x);
            this.line.setAttribute('y1', a.y);
            this.line.setAttribute('x2', b.x);
            this.line.setAttribute('y2', b.y);
            this.line.setAttribute('stroke', dashed ? icon.icon.strokeColor : strokeColor);
            this.line.setAttribute('stroke-opacity', dashed ? icon.icon.strokeOpacity ?? 1 : strokeOpacity);
            this.line.setAttribute('stroke-width', dashed ? icon.icon.strokeWeight : strokeWeight);
            this.line.setAttribute('stroke-linecap', dashed ? 'butt' : 'round');
            this.line.setAttribute('stroke-dasharray', dashed ? `${2 * (icon.icon.scale || 1)} ${parseFloat(icon.repeat) - 2 * (icon.icon.scale || 1)}` : '');
            this.line.style.pointerEvents = clickable === false ? 'none' : 'stroke';
            this.dot.setAttribute('visibility', isDot ? 'visible' : 'hidden');
            if (isDot) {
                this.dot.setAttribute('cx', a.x);
                this.dot.setAttribute('cy', a.y);
                this.dot.setAttribute('r', icon.icon.scale || 2);
                this.dot.setAttribute('fill', icon.icon.fillColor);
            }
            // SVG paints in document order: keep the layers sorted like Google's zIndex.
            const siblings = [...this.map.svg.children];
            const after = siblings.find((node) => Number(node.dataset.z) > Number(this.node.dataset.z));
            if (after !== this.node.nextSibling || this.node.parentNode !== this.map.svg) {
                this.map.svg.insertBefore(this.node, after || null);
            }
        }
    }

    class AdvancedMarkerElement extends Emitter {
        constructor(options = {}) {
            super();
            // Google anchors a marker's content by its bottom centre.
            this.wrapper = document.createElement('div');
            this.wrapper.style.cssText = 'position:absolute;transform:translate(-50%,-100%);pointer-events:auto;';
            this.wrapper.dataset.marker = '';
            this.state = { map: null, position: null, content: null, zIndex: 0, title: '', gmpDraggable: false };
            this.bindPointer();
            for (const [name, value] of Object.entries(options)) {
                this[name] = value;
            }
        }

        get map() {
            return this.state.map;
        }

        set map(map) {
            if (this.state.map === map) {
                return;
            }
            this.state.map?.markers.delete(this);
            this.wrapper.remove();
            this.state.map = map;
            if (map) {
                map.markers.add(this);
                map.markerLayer.appendChild(this.wrapper);
                this.render();
            }
        }

        get position() {
            return this.state.position;
        }

        set position(value) {
            this.state.position = value ? literal(value) : null;
            this.render();
        }

        get content() {
            return this.state.content;
        }

        set content(node) {
            this.state.content = node;
            this.wrapper.replaceChildren(node);
        }

        get zIndex() {
            return this.state.zIndex;
        }

        set zIndex(value) {
            this.state.zIndex = value;
            this.wrapper.style.zIndex = value;
        }

        get title() {
            return this.state.title;
        }

        set title(value) {
            this.state.title = value;
            this.wrapper.title = value;
        }

        get gmpDraggable() {
            return this.state.gmpDraggable;
        }

        set gmpDraggable(value) {
            this.state.gmpDraggable = Boolean(value);
        }

        render() {
            if (!this.state.map || !this.state.position) {
                return;
            }
            const pixel = this.state.map.toPixel(this.state.position);
            this.wrapper.style.left = `${pixel.x}px`;
            this.wrapper.style.top = `${pixel.y}px`;
        }

        bindPointer() {
            let drag = null;
            this.wrapper.addEventListener('pointerdown', (event) => {
                const anchor = this.state.map.toClient(this.state.position);
                drag = { dx: anchor.x - event.clientX, dy: anchor.y - event.clientY, x: event.clientX, y: event.clientY, moved: false };
                this.wrapper.setPointerCapture?.(event.pointerId);
                event.stopPropagation();
            });
            this.wrapper.addEventListener('pointermove', (event) => {
                if (!drag || !this.state.gmpDraggable) {
                    return;
                }
                if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) {
                    drag.moved = true;
                    this.emit('dragstart', {});
                }
                if (drag.moved) {
                    this.position = this.state.map.fromClient(event.clientX + drag.dx, event.clientY + drag.dy);
                    this.emit('drag', { latLng: latLng(this.state.position) });
                }
            });
            this.wrapper.addEventListener('pointerup', () => {
                const was = drag;
                drag = null;
                if (was?.moved) {
                    this.emit('dragend', { latLng: latLng(this.state.position) });
                } else if (was) {
                    this.emit('click', {});
                }
            });
        }
    }

    class InfoWindow {
        constructor() {
            this.node = document.createElement('div');
            this.node.style.cssText = 'position:absolute;transform:translate(-50%,-130%);background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.4);z-index:99;pointer-events:auto;';
        }

        setContent(content) {
            this.node.replaceChildren(content);
        }

        open({ map, anchor }) {
            const pixel = map.toPixel(anchor.position);
            this.node.style.left = `${pixel.x}px`;
            this.node.style.top = `${pixel.y}px`;
            map.markerLayer.appendChild(this.node);
        }

        close() {
            this.node.remove();
        }
    }

    class Size {
        constructor(width, height) {
            this.width = width;
            this.height = height;
        }
    }

    const spherical = {
        // Straight in latitude and longitude: the same as a great circle across a yard.
        // Like Google's, it gives back the start point when the ends are closer than a
        // millionth of a radian (about 21 ft): the app must not place anything with it.
        interpolate(a, b, t) {
            const [from, to] = [literal(a), literal(b)];
            if (this.computeDistanceBetween(a, b) / 6378137 < 1e-6) {
                return latLng(from);
            }
            return latLng({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t });
        },
        computeDistanceBetween(a, b) {
            const [from, to] = [literal(a), literal(b)];
            const rad = Math.PI / 180;
            const h = Math.sin(((to.lat - from.lat) * rad) / 2) ** 2
                + Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(((to.lng - from.lng) * rad) / 2) ** 2;
            return 2 * 6378137 * Math.asin(Math.sqrt(h));
        },
    };

    if (!customElements.get('gmp-place-autocomplete')) {
        customElements.define('gmp-place-autocomplete', class extends HTMLElement {
            connectedCallback() {
                if (!this.firstChild) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = this.getAttribute('placeholder') || '';
                    input.style.cssText = 'width:100%;min-height:44px;padding:0 12px;border:1.5px solid #263166;border-radius:6px;font:inherit;box-sizing:border-box;';
                    this.appendChild(input);
                }
            }
        });
    }

    class Geocoder {
        async geocode() {
            return { results: [] };
        }
    }

    const libraries = {
        maps: { Map: FakeMap, Polyline, InfoWindow },
        marker: { AdvancedMarkerElement },
        geometry: { spherical },
        places: { PlaceAutocompleteElement: customElements.get('gmp-place-autocomplete') },
        geocoding: { Geocoder },
        core: { Size },
    };

    window.google = {
        maps: {
            importLibrary: async (name) => libraries[name],
            Size,
            MapTypeControlStyle: { HORIZONTAL_BAR: 1 },
            ControlPosition: { TOP_RIGHT: 3 },
            event: {
                addListenerOnce(target, name, handler) {
                    const listener = target.addListener(name, (payload) => {
                        listener.remove();
                        handler(payload);
                    });
                    return listener;
                },
            },
            __fake: true,
        },
    };
})();
