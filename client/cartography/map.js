import { Map } from 'maplibre-gl';

import Enemies from '../layers/enemies.js';
import Player from '../characters/player.js';
import Target from '../characters/target.js';
import Helpers from '../layers/helpers.js';
import Position from '../game/position.js';
import { addClass, hasSameKeys, makeDiv, removeClass, wait } from '../utils/dom.js';
import Rabbits from '../layers/rabbits.js';
import { mergeExtents, project } from './analysis.js';
import { easeInOutCubic, easeOutCirc, remap } from '../utils/math.js';
import Flowers from '../layers/flowers.js';
import Recorder from './recorder.js';

class Basemap {
    constructor(options, callback) {
        callback = callback || function () { };
        this.options = options || {};
        this.app = this.options.app;
        this.params = this.app.options;

        this.minAnimationDuration = this.params.interface.map.animation.minspeed;
        this.maxAnimationDuration = this.params.interface.map.animation.maxspeed;
        this.animationCurve = 2;
        this.animationSpeed = 5;

        this.spritesheets = ['rabbits', 'enemies', 'vegetables', 'flower', 'ptsot', 'woodpigeon', 'fire'];
        this.protectedLayers = ['basemap'];

        this.parent = this.options.parent;

        this.container = makeDiv(null, 'map');
        if (options.class) {
            addClass(this.container, options.class);
            if (options.class === 'minimap') {
                this.mask = makeDiv(null, 'minimap-mask');
                this.parent.append(this.mask);
            }
        }
        this.parent.append(this.container);

        let center = this.options.center || [0, 0];
        let zoom = this.options.zoom || 1;
        let extent = this.options.extent;
        let padding = this.options.padding;

        let style = {
            'version': 8,
            'sources': {
                'PLANIGN': {
                    'type': 'raster',
                    'tiles': [
                        "https://data.geopf.fr/wmts?" +
                        "layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
                        "&style=normal" +
                        "&tilematrixset=PM" +
                        "&Service=WMTS" +
                        "&Request=GetTile" +
                        "&Version=1.0.0" +
                        "&Format=image/png" +
                        "&TileMatrix={z}" +
                        "&TileCol={x}" +
                        "&TileRow={y}"
                    ],
                    'tileSize': 256,
                }
            },
            'layers': [
                {
                    'id': 'basemap',
                    'type': 'raster',
                    'source': 'PLANIGN',
                    'minzoom': 0,
                    'maxzoom': 22
                }
            ],
            "fadeDuration": 0
        };

        if (extent) {
            this.map = new Map({
                container: this.container,
                interactive: true,
                bounds: extent,
                fitBoundsOptions: { padding: padding || 0 },
                canvasContextAttributes: { antialias: true },
                style: style,
            });
        } else {
            this.map = new Map({
                container: this.container,
                interactive: true,
                center: center,
                zoom: zoom,
                canvasContextAttributes: { antialias: true },
                style: style,
                attributionControl: false
            });
        }

        this.setMaxZoom(17);

        this.map.on('load', () => {
            this.map.boxZoom.disable();
            this.map.dragRotate.disable();
            this.map.keyboard.disable();
            this.map.touchPitch.disable();
            this.map.doubleClickZoom.disable();

            if (!this.options.interactive) {
                this.map.scrollZoom.disable();
                this.map.dragPan.disable();
                this.map.touchZoomRotate.disable();
                this.map.touchZoomRotate.disableRotation();
            }

            this.loaded();
            callback();
        });

        this.recorder = new Recorder({ basemap: this });

        this.listeners = [];
        this.routable = false;

        this.maskcontainer = makeDiv(null, 'map-mask-container');
        this.east = makeDiv(null, 'map-mask meridian east');
        this.west = makeDiv(null, 'map-mask meridian west');
        this.north = makeDiv(null, 'map-mask parallel north');
        this.south = makeDiv(null, 'map-mask parallel south');
        this.maskcontainer.append(this.east, this.west, this.north, this.south);
        this.container.append(this.maskcontainer);
    }

    loading() {
        if (this.options.class === 'minimap') {
            removeClass(this.mask, 'loaded');
        }
    }

    loaded() {
        if (this.options.class === 'minimap') {
            addClass(this.mask, 'loaded');
        }
    }

    render() {
        this.map.triggerRepaint();
    }

    remove() {
        this.map.remove();
    }

    getContainer() {
        return this.map.getContainer();
    }

    setCenter(center) {
        this.map.setCenter(center);
    }

    getCenter() {
        return this.map.getCenter();
    }

    setZoom(zoom) {
        this.map.setZoom(zoom);
    }

    getZoom() {
        return this.map.getZoom();
    }

    getMaxZoom() {
        return this.map.getMaxZoom();
    }

    setMaxZoom(zoom) {
        this.map.setMaxZoom(zoom);
    }

    unsetMaxZoom() {
        this.map.setMaxZoom(22);
    }

    getMinZoom() {
        return this.map.getMinZoom();
    }

    setMinZoom(zoom) {
        this.map.setMinZoom(zoom);
    }

    unsetMinZoom() {
        this.map.setMinZoom(0);
    }

    getExtentAsWKT() {
        const bounds = this.map.getBounds();
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();
        const wkt = `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
        return wkt;
    }

    getResolution() {
        const R = 6378137;
        const tileSize = 256;
        const zoom = this.map.getZoom();
        const res = (2 * Math.PI * R) / (tileSize * Math.pow(2, zoom));
        const lat = this.map.getCenter().lat * Math.PI / 180;
        const resLat = res * Math.cos(lat);
        return resLat;
    }

    getPixelAtCoordinates(coordinates) {
        let p = this.map.project(coordinates);
        return [p.x, p.y];
    }

    getCoordinatesAtPixel(coordinates) {
        return this.map.unproject(coordinates).toArray();
    }

    getWidth() {
        return this.getContainer().offsetWidth;
    }

    getHeight() {
        return this.getContainer().offsetHeight;
    }

    hasLayer(id) {
        return !!this.map.getLayer(id);
    }

    addLayer(layer) {
        if (!this.hasLayer(layer.getId())) {
            this.map.addSource(layer.getId(), layer.getSource());
            this.map.addLayer(layer.getLayer());
            if (layer.isProtected()) { this.protectedLayers.push(layer.getId()); }
        }
    }

    addAreaLayer(layer) {
        if (!this.hasLayer(layer.getId() + '-area')) {
            this.map.addSource(layer.getId() + '-area', layer.getAreaSource());
            this.map.addLayer(layer.getAreaLayer());
        }
    }

    removeLayer(layer) {
        this.map.removeLayer(layer.getId());
        this.map.removeSource(layer.getId());
    }

    removeLayers() {
        const indexes = this.map.getStyle().layers
            .filter(layer => !this.protectedLayers.includes(layer.id))
            .map(layer => layer.id);
        indexes.forEach(i => {
            this.map.removeLayer(i);
            this.map.removeSource(i);
        });
    }

    ease(options, callback) {
        callback = callback || function () { };
        if (options.duration === undefined) {
            options.duration = this.getAnimationDurationFromZoom(options.zoom);
        }
        this.map.easeTo(options);
        this.map.once('moveend', () => {
            if (callback) callback();
        });
    }

    fly(options, callback) {
        callback = callback || function () { };
        options.curve = options.curve ?? this.animationCurve;
        options.speed = options.curve ?? this.animationSpeed;
        if (options.duration === undefined) {
            options.duration = this.getAnimationDurationFromZoom(options.zoom);
        }
        this.map.flyTo(options);
        this.map.once('moveend', () => {
            if (callback) callback();
        });
    }

    fit(extent, options, callback) {
        callback = callback || function () { };
        let duration = options.duration;
        const view = this.map.cameraForBounds(extent);

        const z1 = this.getZoom().toFixed(10);
        const z2 = view.zoom.toFixed(10);
        const c1 = this.getCenter().toArray();
        const c2 = view.center.toArray();
        const [x1, y1] = [c1[0].toFixed(10), c1[1].toFixed(10)];
        const [x2, y2] = [c2[0].toFixed(10), c2[1].toFixed(10)];

        if (z1 === z2 && x1 === x2 && y1 == y2) {
            callback();
        } else {
            if (duration === undefined) {
                duration = this.getAnimationDurationFromZoom(view.zoom);
            }

            this.map.fitBounds(extent, {
                padding: options.padding ?? 0,
                duration: duration,
                easing: options.easing ?? (x => x),
                curve: options.curve ?? this.animationCurve,
                speed: options.speed ?? this.animationSpeed
            });
            this.map.once('moveend', () => {
                if (callback) callback();
            });
        }
    }

    slide(direction, callback) {
        let center = this.getCenter();
        let increment = this.getResolution() * 100;

        let p = project('4326', '3857', center.toArray());
        if (direction === 'right') { p[0] += increment; }
        else { p[0] -= increment; }

        let newcenter = project('3857', '4326', p);

        this.ease({
            center: newcenter,
            duration: 500,
            easing: easeInOutCubic
        }, callback);
    }

    enableInteractions() {
        this.map.scrollZoom.enable();
        this.map.dragPan.enable();
        this.map.touchZoomRotate.enable();
        this.map.touchZoomRotate.disableRotation();
    }

    disableInteractions() {
        this.map.scrollZoom.disable();
        this.map.dragPan.disable();
        this.map.touchZoomRotate.disable();
    }

    addListener(type, listener) {
        this.map.on(type, listener);
        this.listeners.push({
            type: type,
            listener: listener
        });
    }

    removeListener(type, listener) {
        this.map.off(type, listener);
        let index = this.listeners.indexOf({
            type: type,
            listener: listener
        });
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    removeListeners() {
        for (let i = 0; i < this.listeners.length; i++) {
            const l = this.listeners[i];
            this.map.off(l.type, l.listener);
        }
        this.listeners = [];
    }

    isVisible(position, padding = 50) {
        let visible = false;
        let width = this.getWidth();
        let height = this.getHeight();
        let [minx, maxy] = this.getCoordinatesAtPixel([padding, padding]);
        let [maxx, miny] = this.getCoordinatesAtPixel([width - padding, height - padding]);
        let [x, y] = position;
        if (x > minx && x < maxx && y > miny && y < maxy) { visible = true; }
        return visible;
    }

    createCharacters(level, options) {
        this.flowers = new Flowers({
            id: 'level-flowers',
            basemap: this,
            level: level
        });

        this.enemies = new Enemies({
            id: 'level-enemies',
            basemap: this,
            level: level,
            elements: options.enemies
        });
        this.enemies.setOrientationFromCoordinates(options.player);
        this.enemies.orderByDistance(options.player);

        this.helpers = new Helpers({
            id: 'level-helpers',
            basemap: this,
            level: level,
            coordinates: options.helpers,
            minZoom: this.params.game.routing.minzoom
        });

        this.rabbits = new Rabbits({
            id: 'level-rabbits',
            basemap: this,
            level: level
        });

        this.target = new Target({
            layer: this.rabbits,
            colors: this.params.game.colors.classics.filter(c => c !== this.params.game.color),
            color: 'random',
            coordinates: options.target
        });

        this.player = new Player({
            level: level,
            layer: this.rabbits,
            color: this.params.game.color,
            coordinates: options.player
        });
        this.player.setOrientationFromCoordinates(options.target);
        this.helpers.handle(this.player);
    }

    getExtentForData() {
        let extents = [];
        if (this.rabbits) {
            let re = this.rabbits.getLayerExtent();
            if (re != null) extents.push(re);
        }
        if (this.enemies) {
            let ee = this.enemies.getLayerExtent();
            if (ee != null) extents.push(ee);
        }
        if (this.helpers) {
            let he = this.helpers.getLayerExtent();
            if (he != null) extents.push(he);
        }
        return mergeExtents(extents);
    }

    enableMovement(callback) {
        callback = callback || function () { };

        const routingHelp = makeDiv(null, 'level-routing-hint');
        const routingLabel = makeDiv(null, 'level-routing-label');
        routingHelp.append(routingLabel);
        this.container.append(routingHelp);

        let last = 0;
        const movement = (e) => {
            if (this.routable) {
                let destination = e.lngLat.toArray();
                this.player.travel(destination, callback);
            } else {
                if (this.getZoom() >= this.params.game.routing.minzoom) {
                    routingLabel.innerHTML = "Déplacement impossible : vous devez dézoomer un peu.";
                }
                if (this.getZoom() <= this.params.game.routing.maxzoom) {
                    routingLabel.innerHTML = "Déplacement impossible : vous devez zoomer davantage.";
                }
                if (!this.isVisible(this.player.getCoordinates(), 0)) {
                    routingLabel.innerHTML = "Déplacement impossible : Lapinou doit être visible pour se déplacer.";
                }

                last = Date.now();
                const current = last;
                addClass(routingLabel, 'reveal');
                wait(1200, () => {
                    if (current === last) { removeClass(routingLabel, 'reveal'); }
                });
            }
        }
        this.addListener('click', movement);

        this.position = new Position({
            basemap: this,
            player: this.player
        });

        const routing = () => {
            const zoom = this.getZoom();
            const isClose = zoom >= this.params.game.routing.minzoom && zoom <= this.params.game.routing.maxzoom;
            const isVisible = this.isVisible(this.player.getCoordinates(), 0);
            if (isClose && isVisible) { this.makeRoutable(); }
            else { this.makeUnroutable(); }
            this.position.update();
        }
        this.addListener('render', routing);
    }

    isRoutable() {
        return this.routable;
    }

    makeRoutable(callback) {
        callback = callback || function () { };
        if (this.routable) { callback(); }
        else {
            this.routable = true;
            addClass(this.maskcontainer, 'routable');
            wait(500, callback);
        }
    }

    makeUnroutable(callback) {
        callback = callback || function () { };
        if (!this.routable) { callback(); }
        else {
            this.routable = false;
            removeClass(this.maskcontainer, 'routable');
            wait(500, () => { callback(); });
        }
    }

    clear(callback) {
        callback = callback || function () { };
        let cleared = 0;
        const clearing = 4;

        const checkDone = () => {
            if (++cleared === clearing) {
                wait(300, () => {
                    this.rabbits.destroy();
                    this.helpers.destroy();
                    this.enemies.destroy();
                    this.removeLayers();
                    callback();
                });
            };
        };

        if (this.player) { if (this.player.traveling) { this.player.stop(); } }

        const tasks = [
            this.rabbits ? (cb) => this.rabbits.despawnCharacters(cb) : null,
            this.enemies ? (cb) => {
                this.enemies.hideAreas();
                this.enemies.despawnCharacters(cb);
            } : null,
            this.helpers ? (cb) => this.helpers.despawnCharacters(cb) : null,
            this.position ? (cb) => this.position.destroy(cb) : null
        ];

        tasks.forEach(task => task ? task(checkDone) : checkDone());
    }

    getAnimationDurationFromZoom(zoom) {
        const [z1, z2] = [this.getZoom(), zoom];
        const d = Math.abs(z1 - z2);
        // Remap to [0, 1]
        const r = remap(d, 0, 19, 0, 1);
        // Apply easing so higher zoom levels don't have much impact
        const eased = easeOutCirc(r);
        return remap(eased, 0, 1, this.minAnimationDuration, this.maxAnimationDuration);
    }

    async addSprites(sprites) {
        this.app.options.sprites = {};
        for (let name in sprites) {
            for (let i = 0; i < sprites[name].length; i++) {
                const s = sprites[name][i];
                const image = new Image();
                image.src = s.image;
                image.onload = async () => {
                    if (!this.map.hasImage(s.name)) {
                        this.map.addImage(s.name, image, s.properties);
                    }
                };
                this.app.options.sprites[s.name] = s.image;
            }
        }
    }

    async loadSprites() {
        let s = JSON.parse(localStorage.getItem('sprites'));
        if (s && hasSameKeys(s, this.spritesheets)) {
            this.addSprites(s);
        } else {
            let sprites = {};

            for (let i = 0; i < this.spritesheets.length; i++) {
                const name = this.spritesheets[i];
                sprites[name] = [];

                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = './sprites/' + name + '.png';

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                let json = await fetch('./sprites/' + name + '.json');
                let data = await json.json();

                for (const key in data) {
                    const icon = data[key];

                    const canvas = document.createElement('canvas');
                    canvas.width = icon.width;
                    canvas.height = icon.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(
                        img,
                        icon.x, icon.y, icon.width, icon.height,
                        0, 0, icon.width, icon.height
                    );

                    let sprite = {
                        name: `${name}:${key}`,
                        image: canvas.toDataURL("image/png"),
                        properties: {
                            x: icon.x,
                            y: icon.y,
                            width: icon.width,
                            height: icon.height,
                            pixelRatio: icon.pixelRatio
                        }
                    }
                    sprites[name].push(sprite);
                }
            }

            localStorage.setItem('sprites', JSON.stringify(sprites));
            this.addSprites(sprites);
        }
    }
}

export default Basemap;