import { Map } from 'maplibre-gl';

import Enemies from '../layers/enemies.js';
import Player from '../characters/player.js';
import Target from '../characters/target.js';
import Helpers from '../layers/helpers.js';
import Position from '../game/position.js';
import Rabbits from '../layers/rabbits.js';
import Flowers from '../layers/flowers.js';
import Recorder from './recorder.js';

import { addClass, hasSameKeys, makeDiv, removeClass, wait } from '../utils/dom.js';
import { mergeExtents, project } from './analysis.js';
import { easeInOutCubic, easeOutCirc, remap } from '../utils/math.js';

class Basemap {
    /**
     * Create a basemap.
     * @param {Object} options 
     * @param {Function} callback 
     */
    constructor(options, callback) {
        callback = callback || function () { };
        this.options = options || {};
        this.app = this.options.app;
        this.params = this.app.options;

        // Camera animation options 
        this.minAnimationDuration = this.params.interface.map.animation.minspeed;
        this.maxAnimationDuration = this.params.interface.map.animation.maxspeed;
        this.animationCurve = 2;
        this.animationSpeed = 5;

        // Define here the different spritesheets to load along with this basemap
        this.spritesheets = ['rabbits', 'enemies', 'vegetables', 'flower', 'ptsot', 'woodpigeon', 'fire'];
        // This layer will never be deleted even when clearing the layers
        this.protectedLayers = ['basemap'];

        this.parent = this.options.parent;
        this.container = makeDiv(null, 'map');

        // If a class has been specified, add the class name to the div
        if (options.class) {
            addClass(this.container, options.class);
            // If it's a minimap, add a mask as well
            if (options.class === 'minimap') {
                this.mask = makeDiv(null, 'minimap-mask');
                this.parent.append(this.mask);
            }
        }
        this.parent.append(this.container);
        this.container.offsetHeight;

        // Retrieve map specific options
        let center = this.options.center || [0, 0];
        let zoom = this.options.zoom || 1;
        let extent = this.options.extent;
        let padding = this.options.padding;

        // Define the MapLibre style
        let style = {
            'version': 8,
            'sources': {
                // Add the Plan IGN basemap
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
                    // Block the map to zoom 22 to avoid loading unexisting images
                    'maxzoom': 22
                }
            ],
            "fadeDuration": 0
        };

        // Vector tiles test (works but doesn't fit the game hints anymore)
        // style = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json';

        // If an extent has been set, define the map with it
        if (extent) {
            this.map = new Map({
                container: this.container,
                interactive: true,
                bounds: extent,
                fitBoundsOptions: { padding: padding || 0 },
                canvasContextAttributes: { antialias: true },
                style: style,
                attributionControl: false
            });
        }
        // If no extent is set, use the zoom/center
        else {
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

        // Set the max zoom to be 17
        this.setMaxZoom(17);

        // When the map is loaded
        this.map.on('load', () => {
            // Disable most interactions
            this.map.boxZoom.disable();
            this.map.dragRotate.disable();
            this.map.keyboard.disable();
            this.map.touchPitch.disable();
            this.map.doubleClickZoom.disable();

            // Disable all interaction if the map is not interactive
            if (!this.options.interactive) {
                this.map.scrollZoom.disable();
                this.map.dragPan.disable();
                this.map.touchZoomRotate.disable();
                this.map.touchZoomRotate.disableRotation();
            }

            // Set the map as being loaded
            this.loaded();
            callback();
        });

        // Define the recorder to record interactions on the map when needed
        this.recorder = new Recorder({ basemap: this });

        // Storage for all the listeners on the map
        this.listeners = [];

        // Flag to set the map as routable or not
        this.routable = false;

        // Create the mask
        this.maskcontainer = makeDiv(null, 'map-mask-container');
        this.east = makeDiv(null, 'map-mask meridian east');
        this.west = makeDiv(null, 'map-mask meridian west');
        this.north = makeDiv(null, 'map-mask parallel north');
        this.south = makeDiv(null, 'map-mask parallel south');
        this.maskcontainer.append(this.east, this.west, this.north, this.south);
        this.container.append(this.maskcontainer);
    }

    /**
     * Set the map state to loading
     */
    loading() {
        if (this.options.class === 'minimap') {
            removeClass(this.mask, 'loaded');
        }
    }

    /**
     * Set the map state as being loaded
     */
    loaded() {
        if (this.options.class === 'minimap') {
            addClass(this.mask, 'loaded');
        }
    }

    /**
     * Render the map
     */
    render() {
        this.map.triggerRepaint();
    }

    /**
     * Remove the map entirely
     */
    remove() {
        this.map.remove();
    }

    /**
     * Get the map container Element
     * @returns {Element}
     */
    getContainer() {
        return this.map.getContainer();
    }

    /**
     * Set the center of the map.
     * @param {LngLatLike} center 
     */
    setCenter(center) {
        this.map.setCenter(center);
    }

    /**
     * Get the center of the map.
     * @returns Center of the map
     */
    getCenter() {
        return this.map.getCenter();
    }

    /**
     * Set the zoom level.
     * @param {int} zoom 
     */
    setZoom(zoom) {
        this.map.setZoom(zoom);
    }

    /**
     * Return the zoom level
     * @returns {int} zoom level
     */
    getZoom() {
        return this.map.getZoom();
    }

    /**
     * Get the maximum allowed zoom
     * @returns {int}
     */
    getMaxZoom() {
        return this.map.getMaxZoom();
    }

    /**
     * Set the maximum allowed zoom
     * @param {int} zoom 
     */
    setMaxZoom(zoom) {
        this.map.setMaxZoom(zoom);
    }

    /**
     * Reset the maximum zoom level to 22
     */
    unsetMaxZoom() {
        this.map.setMaxZoom(22);
    }

    /**
     * Get the minimum allowed zoom
     * @returns {int}
     */
    getMinZoom() {
        return this.map.getMinZoom();
    }

    /**
     * Set the minimum allowed zoom
     * @param {int} zoom 
     */
    setMinZoom(zoom) {
        this.map.setMinZoom(zoom);
    }

    /**
     * Reset the minimum zoom level to 0
     */
    unsetMinZoom() {
        this.map.setMinZoom(0);
    }

    /**
     * Get the extent of the map as a Polygon in WKT string
     * @returns {str} Polygon as wkt string
     */
    getExtentAsWKT() {
        const bounds = this.map.getBounds();
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();
        const wkt = `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
        return wkt;
    }

    /**
     * Get the resolution of the map (metre/px)
     * @returns {Number}
     */
    getResolution() {
        const R = 6378137;
        const tileSize = 256;
        const zoom = this.map.getZoom();
        const res = (2 * Math.PI * R) / (tileSize * Math.pow(2, zoom));
        const lat = this.map.getCenter().lat * Math.PI / 180;
        const resLat = res * Math.cos(lat);
        return resLat;
    }

    /**
     * Get the pixel location of the given coordinates
     * @param {LngLatLike} coordinates 
     * @returns {Array}
     */
    getPixelAtCoordinates(coordinates) {
        let p = this.map.project(coordinates);
        return [p.x, p.y];
    }

    /**
     * Get the coordinates of the given pixel location
     * @param {Array} coordinates 
     * @returns {Array}
     */
    getCoordinatesAtPixel(coordinates) {
        return this.map.unproject(coordinates).toArray();
    }

    /**
     * Get the width of the map
     * @returns {int}
     */
    getWidth() {
        return this.getContainer().offsetWidth;
    }

    /**
     * Get the height of the map
     * @returns {int}
     */
    getHeight() {
        return this.getContainer().offsetHeight;
    }

    /**
     * Check if the given layer exists
     * @param {int} id layer index
     * @returns {boolean}
     */
    hasLayer(id) {
        return !!this.map.getLayer(id);
    }

    /**
     * Add a layer to the map
     * @param layer 
     */
    addLayer(layer) {
        if (!this.hasLayer(layer.getId())) {
            this.map.addSource(layer.getId(), layer.getSource());
            this.map.addLayer(layer.getLayer());
            if (layer.isProtected()) { this.protectedLayers.push(layer.getId()); }
        }
    }

    /**
     * Add an area layer to the map
     * @param layer 
     */
    addAreaLayer(layer) {
        if (!this.hasLayer(layer.getId() + '-area')) {
            this.map.addSource(layer.getId() + '-area', layer.getAreaSource());
            this.map.addLayer(layer.getAreaLayer());
        }
    }

    /**
     * Removes a layer from the map
     * @param layer 
     */
    removeLayer(layer) {
        this.map.removeLayer(layer.getId());
        this.map.removeSource(layer.getId());
    }

    /**
     * Removes every unprotected layers from the map
     */
    removeLayers() {
        const indexes = this.map.getStyle().layers
            .filter(layer => !this.protectedLayers.includes(layer.id))
            .map(layer => layer.id);
        indexes.forEach(i => {
            this.map.removeLayer(i);
            this.map.removeSource(i);
        });
    }

    /**
     * Animate the map with a simple eased animation
     * @param {Object} options 
     * @param {Function} callback 
     */
    ease(options, callback) {
        callback = callback || function () { };
        // Calculate the duration from the zoom/center gap if none was provided
        if (options.duration === undefined) {
            options.duration = this.getAnimationDurationFromZoom(options.zoom);
        }
        this.map.easeTo(options);
        this.map.once('moveend', () => {
            if (callback) callback();
        });
    }

    /**
     * Animate the map with a fly animation
     * @param {Object} options 
     * @param {Function} callback 
     */
    fly(options, callback) {
        callback = callback || function () { };
        options.curve = options.curve ?? this.animationCurve;
        options.speed = options.curve ?? this.animationSpeed;
        // Calculate the duration from the zoom/center gap if none was provided
        if (options.duration === undefined) {
            options.duration = this.getAnimationDurationFromZoom(options.zoom);
        }
        this.map.flyTo(options);
        this.map.once('moveend', () => {
            if (callback) callback();
        });
    }

    /**
     * Fit the map to the given extent with or without an animation
     * @param {Array} extent 
     * @param {Object} options 
     * @param {Function} callback 
     */
    fit(extent, options, callback) {
        callback = callback || function () { };
        let duration = options.duration;
        // Calculate the new view
        const view = this.map.cameraForBounds(extent);

        // Get current and wanted zoom level
        const z1 = this.getZoom().toFixed(10);
        const z2 = view.zoom.toFixed(10);
        const c1 = this.getCenter().toArray();
        const c2 = view.center.toArray();
        // Get current and wanted center coordinates
        const [x1, y1] = [c1[0].toFixed(10), c1[1].toFixed(10)];
        const [x2, y2] = [c2[0].toFixed(10), c2[1].toFixed(10)];

        // Callback if the given extent doesn't change the center and zoom of the map
        if (z1 === z2 && x1 === x2 && y1 == y2) {
            callback();
        } else {
            // Calculate the duration from the zoom/center gap if none was provided
            if (duration === undefined) {
                duration = this.getAnimationDurationFromZoom(view.zoom);
            }

            // Fit the map to the new extent
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

    /**
     * Apply a slide animation to the map. Used during page change animation.
     * @param {str} direction 
     * @param {Function} callback 
     */
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

    /**
     * Enable map interactions
     */
    enableInteractions() {
        this.map.scrollZoom.enable();
        this.map.dragPan.enable();
        this.map.touchZoomRotate.enable();
        this.map.touchZoomRotate.disableRotation();
    }

    /**
     * Disable map interactions
     */
    disableInteractions() {
        this.map.scrollZoom.disable();
        this.map.dragPan.disable();
        this.map.touchZoomRotate.disable();
    }

    /**
     * Add a listener to the map
     * @param {str} type 
     * @param {Function} listener 
     */
    addListener(type, listener) {
        this.map.on(type, listener);
        this.listeners.push({
            type: type,
            listener: listener
        });
    }

    /**
     * Removes a listener to the map
     * @param {str} type 
     * @param {Function} listener 
     */
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

    /**
     * Removes every listeners from the map
     */
    removeListeners() {
        for (let i = 0; i < this.listeners.length; i++) {
            const l = this.listeners[i];
            this.map.off(l.type, l.listener);
        }
        this.listeners = [];
    }

    /**
     * Returns whether or not the given coordinates if current visible
     * @param {Array} position 
     * @param {int} padding 
     * @returns {boolean}
     */
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

    /**
     * Create the characters layer from a given level
     * @param {Object} level 
     * @param {Object} options 
     */
    createCharacters(level, options) {
        // Create the flowers layer
        this.flowers = new Flowers({
            id: 'level-flowers',
            basemap: this,
            level: level
        });

        // Create the enemies on the map
        this.enemies = new Enemies({
            id: 'level-enemies',
            basemap: this,
            level: level,
            elements: options.enemies
        });
        // Orient enemies towards the player
        this.enemies.setOrientationFromCoordinates(options.player);
        // Reorder the enemies by distance from the player
        this.enemies.orderByDistance(options.player);

        // Create the helpers (vegetables) on the map
        this.helpers = new Helpers({
            id: 'level-helpers',
            basemap: this,
            level: level,
            coordinates: options.helpers,
            minZoom: this.params.game.routing.minzoom
        });

        // Layer for the rabbits, player and target
        this.rabbits = new Rabbits({
            id: 'level-rabbits',
            basemap: this,
            level: level
        });

        // Create the target
        this.target = new Target({
            layer: this.rabbits,
            colors: this.params.game.colors.classics.filter(c => c !== this.params.game.color),
            color: 'random',
            coordinates: options.target
        });

        // Create the player
        this.player = new Player({
            level: level,
            layer: this.rabbits,
            color: this.params.game.color,
            coordinates: options.player
        });
        // Orient the player towards the target
        this.player.setOrientationFromCoordinates(options.target);

        // Display helpers very close to player
        this.helpers.handle(this.player);
    }

    /**
     * Returns the extent from the data displayed on the map
     * @returns {Array}
     */
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

    /**
     * Enable player movement on the map
     * @param {Function} callback 
     */
    enableMovement(callback) {
        callback = callback || function () { };

        // Hint dom element displaying tips if needed
        const routingHelp = makeDiv(null, 'level-routing-hint');
        const routingLabel = makeDiv(null, 'level-routing-label');
        routingHelp.append(routingLabel);
        this.container.append(routingHelp);

        // Storage for time
        let last = 0;
        // Listener to move the player on click
        const movement = (e) => {
            // Check if the map is routable
            if (this.routable) {
                // Get the clicked position and trigger the moving of the player
                let destination = e.lngLat.toArray();
                this.player.travel(destination, callback);
            } else {
                // Display hint showing why the map is not routable
                if (this.getZoom() >= this.params.game.routing.minzoom) {
                    routingLabel.innerHTML = "Déplacement impossible : vous devez dézoomer un peu.";
                }
                if (this.getZoom() <= this.params.game.routing.maxzoom) {
                    routingLabel.innerHTML = "Déplacement impossible : vous devez zoomer davantage.";
                }
                if (!this.isVisible(this.player.getCoordinates(), 0)) {
                    routingLabel.innerHTML = "Déplacement impossible : Lapinou doit être visible pour se déplacer.";
                }

                // Update time
                last = Date.now();
                const current = last;
                addClass(routingLabel, 'reveal');
                wait(1200, () => {
                    // Check if listener hasn't been triggered once more
                    if (current === last) { removeClass(routingLabel, 'reveal'); }
                });
            }
        }
        // Add the listener on map click
        this.addListener('click', movement);

        // Create a position object that displays a trailing line
        this.position = new Position({
            basemap: this,
            player: this.player
        });

        // Listener that allows movement or prevents it
        const routing = () => {
            const zoom = this.getZoom();
            const isClose = zoom >= this.params.game.routing.minzoom && zoom <= this.params.game.routing.maxzoom;
            const isVisible = this.isVisible(this.player.getCoordinates(), 0);
            // Allow movement only if player is visible and zoom level is correct 
            if (isClose && isVisible) { this.makeRoutable(); }
            else { this.makeUnroutable(); }
            this.position.update();
        }
        // Add the listner on map render
        this.addListener('render', routing);
    }

    /**
     * Check if the map is routable
     * @returns {boolean}
     */
    isRoutable() {
        return this.routable;
    }

    /**
     * Make the map routable, allow movement
     * @param {Function} callback 
     */
    makeRoutable(callback) {
        callback = callback || function () { };
        if (this.routable) { callback(); }
        // If not already routable
        else {
            this.routable = true;
            // Display the mask borders
            addClass(this.maskcontainer, 'routable');
            wait(500, callback);
        }
    }

    /**
     * Make the map unroutable, prevent movement
     * @param {Function} callback 
     */
    makeUnroutable(callback) {
        callback = callback || function () { };
        if (!this.routable) { callback(); }
        // If the map is not already unroutable
        else {
            this.routable = false;
            // Hide the mask borders
            removeClass(this.maskcontainer, 'routable');
            wait(500, () => { callback(); });
        }
    }

    /**
     * Clear the map of characters and layers
     * @param {Function} callback 
     */
    clear(callback) {
        callback = callback || function () { };

        // Store current task index
        let cleared = 0;
        // Number of tasks to launch
        const clearing = 4;

        // Function to check if it's the last task to run
        const checkDone = () => {
            // If it's the last task
            if (++cleared === clearing) {
                wait(300, () => {
                    // Destroy every character
                    this.rabbits.destroy();
                    this.helpers.destroy();
                    this.enemies.destroy();
                    // Removes all layers
                    this.removeLayers();
                    callback();
                });
            };
        };

        // If the player is traveling, stop it
        if (this.player) { if (this.player.traveling) { this.player.stop(); } }

        // Defines each task
        const tasks = [
            // Despawn rabbits
            this.rabbits ? (cb) => this.rabbits.despawnCharacters(cb) : null,
            // Hide enemies areas and despawn enemies
            this.enemies ? (cb) => {
                this.enemies.hideAreas();
                this.enemies.despawnCharacters(cb);
            } : null,
            // Despawn vegetables
            this.helpers ? (cb) => this.helpers.despawnCharacters(cb) : null,
            // Destroy position object
            this.position ? (cb) => this.position.destroy(cb) : null
        ];

        // Launch each task
        tasks.forEach(task => task ? task(checkDone) : checkDone());
    }

    /**
     * Calculate the duration of the animation from a given zoom level
     * @param {int} zoom 
     * @returns {int}
     */
    getAnimationDurationFromZoom(zoom) {
        const [z1, z2] = [this.getZoom(), zoom];
        const d = Math.abs(z1 - z2);
        // Remap to [0, 1]
        const r = remap(d, 0, 19, 0, 1);
        // Apply easing so higher zoom levels don't have much impact
        const eased = easeOutCirc(r);
        return remap(eased, 0, 1, this.minAnimationDuration, this.maxAnimationDuration);
    }

    /**
     * Add the sprites as images to the application
     * @param {Object} sprites 
     */
    async addSprites(sprites) {
        // Storage for the sprites
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

    /**
     * Preload sprites when the application is first launched
     */
    async loadSprites() {
        // Retrieve the sprites from the local storage
        let s = JSON.parse(localStorage.getItem('sprites'));

        // If the sprites has already been calculated and they didn't change
        if (s && hasSameKeys(s, this.spritesheets)) {
            this.addSprites(s);
        } else {
            let sprites = {};

            // Loop through spritesheets name
            for (let i = 0; i < this.spritesheets.length; i++) {
                const name = this.spritesheets[i];
                sprites[name] = [];

                // Create the image and load the png
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = './sprites/' + name + '.png';

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                // Load the spritesheet position description from json
                let json = await fetch('./sprites/' + name + '.json');
                let data = await json.json();

                // Loop through each position
                for (const key in data) {
                    const icon = data[key];

                    // Generate a canvas object
                    const canvas = document.createElement('canvas');
                    canvas.width = icon.width;
                    canvas.height = icon.height;
                    const ctx = canvas.getContext('2d');
                    // Draw the single sprite image from the right spritesheet location
                    ctx.drawImage(
                        img,
                        icon.x, icon.y, icon.width, icon.height,
                        0, 0, icon.width, icon.height
                    );

                    // Define a sprite object with a name, the image and some properties
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
                    // Store the sprite
                    sprites[name].push(sprite);
                }
            }

            // Store the loaded sprites in the local storage
            localStorage.setItem('sprites', JSON.stringify(sprites));
            // Add the sprites to the application
            this.addSprites(sprites);
        }
    }
}

export default Basemap;