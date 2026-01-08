import Character from "./character.js";
import { buffer, bufferAroundPolygon } from "../cartography/analysis.js";
import { getColorsByClassNames } from "../utils/parse.js";

class Enemy extends Character {
    /**
     * Enemy character representing enemies of the player
     * on the map. Can be an snake, eagle or hunter
     * @param {Object} options 
     */
    constructor(options) {
        super(options);

        // Set the sprite size in px, idle state and south orientation by default
        this.size = 64;
        this.state = options.state || 'idle';
        this.orientation = options.orientation || 'south';

        // Update feature properties
        this.feature.properties.state = this.state;
        this.feature.properties.orientation = this.orientation;
        this.feature.properties.frame = this.frame;
        this.feature.properties.scale = this.scale;
        this.feature.properties.opacity = this.opacity;
    }

    /**
     * Create the area of the enemy, i.e. the circle around it that
     * reprensents the area that affects the player if it passes through
     */
    createAreas() {
        // Retrieve the associated CSS colors
        let colors = getColorsByClassNames('enemies-map', 'enemies-map-transparent');
        // Get the area size
        let sizeArea = this.params.game.tolerance.enemies[this.type];

        // Set the width of the area border in metres
        this.width1 = 15;

        // Area border is treated as a polygon disctinct from the area itself to have precise border end in metres
        // Calculate a buffer minus the border width
        let b1 = buffer(this.coordinates, sizeArea - this.width1);
        this.border1 = b1.geometry.coordinates;
        // Calculate the border as a buffer around the polygon
        this.border2 = bufferAroundPolygon(b1, this.width1).geometry.coordinates;

        // Set opacity to 0
        this.areaOpacity = 0;

        //Define the MapLibre features for the area and the border
        this.area1 = {
            type: 'Feature',
            properties: {
                color: colors['enemies-map-transparent'],
                opacity: this.areaOpacity
            },
            geometry: {
                type: 'Polygon',
                coordinates: this.border1
            }
        };
        this.area2 = {
            type: 'Feature',
            properties: {
                color: colors['enemies-map'],
                opacity: this.areaOpacity
            },
            geometry: {
                type: 'Polygon',
                coordinates: this.border2
            }
        };

        // Add the area to its layer
        this.layer.addArea(this);
    }

    /**
     * Returns the type of the enemy
     * @returns {string}
     */
    getType() {
        return this.type;
    }

    /**
     * Display the area with an opacity animation to 1
     * @param {Function} callback 
     */
    revealArea(callback) {
        this.animateAreaOpacity({
            value: 1
        }, callback);
    }

    /**
     * Hide the area with an opacity animation to 0
     * @param {Function} callback 
     */
    hideArea(callback) {
        this.animateAreaOpacity({
            value: 0
        }, callback);
    }

    /**
     * Set the opacity of the area
     * @param {Number} opacity 
     */
    setAreaOpacity(opacity) {
        this.areaOpacity = opacity;
        this.area1.properties.opacity = opacity;
        this.area2.properties.opacity = opacity;
        this.layer.updateSourceArea();
    }

    /**
     * Animate the opacity of the area with a custom easing function
     * @param {Object} options 
     * @param {Function} callback 
     */
    animateAreaOpacity(options, callback) {
        callback = callback || function () { };

        // Opacity value
        const value = options.value;
        // Store time
        const start = performance.now();
        this.startOpacityAnimation = start;

        // Store the starting opacity value
        const origin = this.areaOpacity;
        // Duration of the animation
        const duration = options.duration || 300;
        // Easing function
        const easing = options.easing || (x => x);

        const animation = (time) => {
            // If the start time has changed, it means the animation has started again
            // or has been stopped, thus we don't continue
            if (this.startOpacityAnimation === start) {
                // Calculate the new opacity value following the easing function 
                const elapsed = time - start;
                const t = Math.min(Math.max(elapsed / duration, 0), 1);
                const eased = easing(t);
                const opacity = origin + (value - origin) * eased;
                // Set the opacity
                this.setAreaOpacity(opacity);
                // Continue if the wanted opacity has not been reached
                if (t < 1) {
                    requestAnimationFrame(animation);
                } else {
                    this.setAreaOpacity(value);
                    callback();
                }
            } else {
                callback();
            }
        };

        // Launch the opacity animation on the next frame
        requestAnimationFrame(animation);
    }

    /**
     * Play the enemy sound
     */
    playSound() {
        this.layer.basemap.app.sounds.playFile({
            src: this.soundSrc,
            format: 'mp3',
            amount: this.soundAmount,
            volume: 0.8
        });
    }
}

class Hunter extends Enemy {
    /**
     * Hunter enemy class
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.type = 'hunter';
        this.createAreas();

        // Hunter is not orientable
        this.orientable = false;
        // Defining its specific frame properties
        this.framerate = 150;
        this.framenumber = 5;
        this.framescale = 0.9;
        this.offset = [0, -15];

        // Sound src
        this.soundSrc = 'shot';
        this.soundAmount = 4;

        this.feature.properties.type = 'hunter';
        this.feature.properties.offset = this.offset;

        this.layer.addCharacter(this);
        // Start its animation
        this.animateFrame();
    }
}

class Eagle extends Enemy {
    /**
     * Eagle enemy class
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.type = 'eagle';
        this.createAreas();

        // Eagle is not orientable
        this.orientable = false;
        // Defining its specific frame properties
        this.framerate = 200;
        this.framenumber = 3;
        this.framescale = 1;

        // Sound src
        this.soundSrc = 'eagle';
        this.soundAmount = 2;

        this.feature.properties.type = 'eagle';
        this.feature.properties.offset = this.offset;

        this.layer.addCharacter(this);
        // Start its animation
        this.animateFrame();
    }
}

class Snake extends Enemy {
    /**
     * Snake enemy class
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.type = 'snake';
        this.createAreas();

        // Snake is orientable, it can follow the player
        this.orientable = true;
        // Defining its specific frame properties
        this.framerate = 200;
        this.framenumber = 3;
        this.framescale = 0.8;

        // Sound src
        this.soundSrc = 'snake';
        this.soundAmount = 2;

        this.feature.properties.type = 'snake';
        this.feature.properties.offset = this.offset;

        this.layer.addCharacter(this);
        // Start its animation
        this.animateFrame();
    }
}

export { Enemy, Hunter, Eagle, Snake };