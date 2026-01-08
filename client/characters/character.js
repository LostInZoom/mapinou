import { angle } from "../cartography/analysis.js";
import { wait } from "../utils/dom.js";

/**
 * Base class to create a new character on the map.
 */
class Character {
    /**
     * Base class to generate animated characters on the map
     * @param {Object} options 
     */
    constructor(options) {
        this.options = options || {};

        this.layer = this.options.layer;
        this.app = this.layer.basemap.app;
        this.params = this.layer.params;

        // Allowed orientations of the sprite
        this.orientations = ['north', 'south', 'east', 'west'];
        // Generates a unique Id if non is provided
        this.id = this.options.id || this.generateUniqueId();

        // Coordinates of the character
        this.coordinates = this.options.coordinates;
        // Origin coordinates for roaming characters
        this.origin = this.options.coordinates;

        this.zIndex = this.options.zIndex || 1;
        // Duration of the spawning animation
        this.spawnDuration = this.options.spawnDuration || 300;

        // Flag to see if it is active
        this.active = true;
        // Flag to see if it has been destroyed
        this.destroyed = false;

        // Store character movement start time
        this.start = 0;
        // Store the frame animation start time
        this.startFrameAnimation = 0;
        // Store the scale animation start time
        this.startScaleAnimation = 0;
        // Store the opacity animation start time
        this.startOpacityAnimation = 0;
        // Store if moving
        this.moving = false;

        // Defines whether the sprite animation should loop
        this.loop = this.loop !== undefined ? this.loop : true;
        // Frame position
        this.frame = this.options.frame || 0;
        // Frame rate of the animation (in ms)
        this.framerate = this.options.framerate || 200;
        // Sprite scale
        this.framescale = this.options.scale || 1;
        // Number of frame in the spritesheet
        this.framenumber = this.options.framenumber || 1;

        // Opacity of the character sprite
        this.opacity = this.options.opacity || 1;
        // Set the scale to zero because the character need to be spawned
        this.scale = 0;
        // Offset of the character sprite
        this.offset = [0, 0];

        // MapLibre feature object
        this.feature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: this.coordinates
            },
            properties: {
                id: this.id
            }
        };
    }

    /**
     * Generates a random index for the character
     * @returns {string}
     */
    generateUniqueId() {
        let id;
        do { id = crypto.randomUUID(); }
        while (this.layer.getFeatures().some(c => c.properties.id === id));
        return id;
    }

    /**
     * Get the character index
     * @returns {string}
     */
    getId() {
        return this.id;
    }

    /**
     * Activate the character
     */
    activate() {
        this.active = true;
    }

    /**
     * Deactivate the character
     */
    deactivate() {
        this.active = false;
    }

    /**
     * Checks whether the character is active
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }

    /**
     * Destroys the character
     */
    destroy() {
        this.active = false;
        // Stops current animation
        this.stopAnimations();
        // Removes the charcater from the layer
        this.layer.removeCharacter(this);
    }

    /**
     * Get the character's MapLibre associated feature
     * @returns {Object}
     */
    getFeature() {
        return this.feature;
    }

    /**
     * Get the state of the character sprite in the spritesheet
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * Set the state of the character sprite in the spritesheet
     * @param {string} state 
     */
    setState(state) {
        this.state = state;
        this.feature.properties.state = state;
        // Update the sprite source
        this.layer.updateSource();
    }

    /**
     * Get the orientation of the character sprite
     * @returns {string}
     */
    getOrientation() {
        return this.orientation;
    }

    /**
     * Set the orientation of the character sprite
     * @param {string} state 
     */
    setOrientation(orientation) {
        this.orientation = orientation;
        this.feature.properties.orientation = orientation;
        this.layer.updateSource();
    }

    /**
     * Set the orientation of the character's sprite
     * given a specific angle
     * @param {Number} angle 
     */
    setOrientationFromAngle(angle) {
        angle = (angle + 2 * Math.PI) % (2 * Math.PI);
        if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
            this.setOrientation('north');
        } else if (angle >= 3 * Math.PI / 4 && angle < 5 * Math.PI / 4) {
            this.setOrientation('west');
        } else if (angle >= 5 * Math.PI / 4 && angle < 7 * Math.PI / 4) {
            this.setOrientation('south');
        } else {
            this.setOrientation('east');
        }
    }

    /**
     * Set the orientation of the character's sprite
     * given a specific set of coordinates as if
     * the character faces the provided coordinates
     * @param {Array} coordinates 
     */
    setOrientationFromCoordinates(coordinates) {
        if (this.orientable) {
            this.setOrientationFromAngle(angle(this.coordinates, coordinates));
        }
    }

    /**
     * Set a random orientation to the character's sprite
     */
    setRandomOrientation() {
        let o = this.orientations[this.orientations.length * Math.random() | 0];
        this.setOrientation(o);
    }

    /**
     * Get the current sprite animation frame
     * @returns {int}
     */
    getFrame() {
        return this.frame;
    }

    /**
     * Set the current sprite animation frame
     * @param {int} frame 
     */
    setFrame(frame) {
        this.frame = frame;
        this.feature.properties.frame = frame;
        this.layer.updateSource();
    }

    /**
     * Get the current sprite scale
     * @returns {Number}
     */
    getScale() {
        return this.scale;
    }

    /**
     * Set the current sprite scale
     * @param {Number} scale 
     */
    setScale(scale) {
        this.scale = scale;
        this.feature.properties.scale = scale;
        this.layer.updateSource();
    }

    /**
     * Get the current sprite opacity
     * @returns {Number}
     */
    getOpacity() {
        return this.opacity;
    }

    /**
     * Set the current sprite opacity
     * @param {Number} opacity 
     */
    setOpacity(opacity) {
        this.opacity = opacity;
        this.feature.properties.opacity = opacity;
        this.layer.updateSource();
    }

    /**
     * Get the coordinates of the character
     */
    getCoordinates() {
        return this.coordinates;
    }

    /**
     * Set the coordinates of the character
     * @param {Array} coordinates 
     */
    setCoordinates(coordinates) {
        this.coordinates = coordinates;
        this.feature.geometry.coordinates = coordinates;
        this.layer.updateSource();
    }

    /**
     * Stop every animation the sprite is currently running (frame, scale, opacity)
     */
    stopAnimations() {
        this.stop();
        this.stopFrameAnimation();
        this.stopScaleAnimation();
        this.stopOpacityAnimation();
    }

    /**
     * Stop the movement of the character by resetting the movement start time
     */
    stop() {
        this.start = 0;
    }

    /**
     * Stop the frame animation by resetting the start time
     */
    stopFrameAnimation() {
        this.startFrameAnimation = 0;
    }

    /**
     * Stop the scale animation by resetting the start time
     */
    stopScaleAnimation() {
        this.startScaleAnimation = 0;
    }

    /**
     * Stop the opacity animation by resetting the start time
     */
    stopOpacityAnimation() {
        this.startOpacityAnimation = 0;
    }

    /**
     * Starts the sprite frame animation
     * @param {Function} callback 
     */
    animateFrame(callback) {
        // Store the start of the animation
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;

        const animation = () => {
            wait(this.framerate, () => {
                // If the start time has changed, it means the animation has started again
                // or has been stopped, thus we don't continue
                if (start === this.startFrameAnimation) {
                    // Set the frame as the next one in the spritesheet or 0
                    this.setFrame((this.frame + 1) % this.framenumber);
                    if (this.getFrame() === (this.framenumber - 1) && typeof callback === 'function') {
                        // If this is the last frame and a callback has been set, callback
                        callback();
                    } else {
                        // Continue the animation on the next frame
                        requestAnimationFrame(animation);
                    }
                }
            });
        };

        // Start the animation on the next frame
        requestAnimationFrame(animation);
    }

    /**
     * Spawn the character by animating its scale to the right value
     * @param {Function} callback 
     */
    spawn(callback) {
        callback = callback || function () { };
        this.animateScale({
            value: this.framescale,
            overshoot: 1.1
        }, callback);
    }

    /**
     * Despawn the character by animating its scale to 0
     * @param {Function} callback 
     */
    despawn(callback) {
        callback = callback || function () { };
        this.animateScale({
            value: 0,
            overshoot: 1.1
        }, callback);
    }

    /**
     * Get the duration in ms of the spawn animation
     * @returns {int}
     */
    getSpawnDuration() {
        return this.spawnDuration;
    }

    /**
     * Launch an breathing animation, i.e. a looping
     * animation that scale up and down the character sprite
     */
    breathe() {
        // Store the scale animation start
        this.startScaleAnimation = performance.now();
        let start = this.startScaleAnimation;

        // Parameters of the sinusoidal function
        const base = 0.95;
        const amplitude = 0.15;
        const period = 1000;
        // Launch the infinite animation as a sin function
        const animate = (time) => {
            // If the start time has changed, it means the animation has started again
            // or has been stopped, thus we don't continue
            if (start === this.startScaleAnimation) {
                // Calculate the new scale using the sin function
                const t = (time % period) / period;
                const scale = base + amplitude * Math.sin(t * Math.PI * 2);
                this.setScale(scale);
                // Continue the animation
                requestAnimationFrame(animate);
            }
        };

        // Launch the animation on the next scale
        requestAnimationFrame(animate);
    }

    /**
     * Animate the scale of the character sprite. It is possible
     * to set an overshoot value to enhance the animation.
     * @param {Object} options 
     * @param {Function} callback 
     */
    animateScale(options, callback) {
        callback = callback || function () { };
        // Store the scale animation start
        this.startScaleAnimation = performance.now();
        const start = this.startScaleAnimation;

        // Store the starting scale
        const origin = this.scale;
        // Store the current scale value
        const value = options.value;
        // Duration of the animation
        const duration = options.duration || (this.spawnDuration || 300);
        // Overshoot factor
        const k = (options.overshoot == null) ? 1 : options.overshoot;
        // Easing function
        const easing = options.easing || (t => t);
        // Minimum possible scale
        const minScale = (options.minScale != null) ? options.minScale : 0;
        // Maximum possible scale
        const maxScale = (options.maxScale != null) ? options.maxScale : Infinity;

        // Store the starting time
        const st = performance.now();
        // Linear interpolation function
        const lerp = (a, b, u) => a + (b - a) * u;

        // Animation function
        const animation = (time) => {
            if (start === this.startScaleAnimation) {
                const t = Math.min(Math.max((time - st) / duration, 0), 1);
                let s;
                if (k <= 1 || origin === value) {
                    // No overshoot
                    s = lerp(origin, value, easing(t));
                } else {
                    // Get the overshoot target
                    let overshootTarget;
                    if (origin < value) {
                        // spawn, overshoot based on final value
                        overshootTarget = value * k;
                    } else {
                        // despawn, overshoot based on origin value
                        overshootTarget = origin * k;
                    }

                    // phase 1 : origin -> overshootTarget (t in [0,0.5])
                    // phase 2 : overshootTarget -> value (t in (0.5,1])
                    if (t < 0.5) {
                        const u = easing(t / 0.5);
                        s = lerp(origin, overshootTarget, u);
                    } else {
                        const u = easing((t - 0.5) / 0.5);
                        s = lerp(overshootTarget, value, u);
                    }
                }

                // clamp to avoid negative value
                s = Math.max(minScale, Math.min(maxScale, s));

                // Set the new scale
                this.setScale(s);

                if (t < 1) {
                    requestAnimationFrame(animation);
                } else {
                    this.setScale(Math.max(minScale, Math.min(maxScale, value)));
                    callback();
                }
            };
        };

        // Launch the scale animation function on the next frame
        requestAnimationFrame(animation);
    }
}

export default Character;