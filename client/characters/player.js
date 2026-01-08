import * as turf from "@turf/turf";

import { angle, within } from "../cartography/analysis.js";
import Rabbit from "./rabbit.js";
import Router from "../cartography/routing.js";
import Flower from "./flower.js";
import { checkAvailability, createValidation, wait } from "../utils/dom.js";

class Player extends Rabbit {
    /**
     * Player class which is a specific rabbit and is allowed methods like
     * traveling to a point on the map, invulnerability frames, etc.
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.level = options.level;

        // Instanciate the router object
        this.router = new Router({
            basemap: this.layer.basemap,
            player: this,
            position: this.coordinates
        });

        // Storage for the target destination
        this.destination = undefined;
        // Flag to know if player is currently traveling
        this.traveling = false;
        // Flag to listen to outside event
        this.listen = true;

        // Stores travelled distance
        this.distance = 0;
        // Stores position
        this.position = this.coordinates;
        // Storage for movement start time
        this.start = 0;

        // Storage for the position history -> the traveled journey
        this.journey = [this.coordinates];
        // Storages for number of enemies and vegetables encountered
        this.enemies = 0;
        this.helpers = 0;

        // Storage for destination flowers
        this.flowers = [];

        // Flag to trigger invulnerability
        this.invulnerable = false;
        // Stores the starting color of the rabbit (used during invulnerability frames)
        this.originColor = this.getColor();
    }

    /**
     * Add enemies to the count
     */
    incrementEnemies() {
        ++this.enemies;
    }

    /**
     * Add helper (vegetable) to the count
     */
    incrementHelpers() {
        ++this.helpers;
    }

    /**
     * Get the number of encountered enemies
     * @returns {int}
     */
    getEnemiesNumber() {
        return this.enemies;
    }

    /**
     * Get the number of consumed vegetables
     * @returns {int}
     */
    getHelpersNumber() {
        return this.helpers;
    }

    /**
     * Get the traveled journey as an Array of coordinates
     * @returns {Array}
     */
    getJourney() {
        return this.journey;
    }

    /**
     * Despawn the fading router line
     */
    despawnRouter() {
        this.router.despawnJourney();
    }

    /**
     * Check if the player is currently invulnerable
     * @returns {boolean}
     */
    isInvulnerable() {
        return this.invulnerable;
    }

    /**
     * Make the player vulnerable again
     */
    makeVulnerable() {
        this.invulnerable = false;
        this.setColor(this.originColor);
    }

    /**
     * Make the player invulnerable and make its sprite blink red
     * @param {int} duration duration in ms
     * @param {int} blink duration of the blinks in ms
     * @param {Function} callback 
     */
    makeInvulnerable(duration, blink, callback) {
        callback = callback || function () { };

        this.invulnerable = true;
        // Stores start time
        const start = performance.now();
        let lastBlink = start;

        // Set the color to red
        this.setColor('red');
        let visible = false;

        const animate = (time) => {
            // If the player is still invulnerable
            if (this.invulnerable) {
                const elapsed = time - start;

                // If the elapsed time is above the provided duration
                if (elapsed >= duration) {
                    // Make vulnerable again
                    this.invulnerable = false;
                    this.setColor(this.originColor);
                    callback();
                } else {
                    // If the current time exceeded the blink time
                    if (time - lastBlink >= blink) {
                        // Reverse the blink state and flip color
                        visible = !visible;
                        this.setColor(visible ? this.originColor : 'red');
                        lastBlink = time;
                    }
                    // Continue the animation
                    requestAnimationFrame(animate);
                }
            }
        };

        // Launch blinking animation at the next frame
        requestAnimationFrame(animate);
    }

    /**
     * Stop the player if traveling
     */
    stop() {
        // If a clic interaction has been set up
        if (this.clic) {
            // Check that the recorder is actually recording
            if (this.layer.basemap.recorder.isActive()) {
                // Save the clic interaction
                const end = Date.now();
                this.clic.duration = end - this.clic.start;
                this.clic.start = new Date(this.clic.start).toISOString();
                this.clic.end = new Date(end).toISOString();
                // If the computing time has not been calculated, it means the player
                // clicked while the routing ajax sent to the provider wasn't returned.
                // We set it to now as the previous ajax will be ignored
                if (this.clic.computing === undefined) { this.clic.computing = performance.now() - this.start }
                this.layer.basemap.recorder.insertCustomClic(this.clic);
            }
        }

        // Reset the start time to 0
        this.start = 0;

        // If flowers are present on the map
        if (this.flowers.length > 0) {
            // Remove the first one and destroy it
            this.flowers.shift().decay();
        }
        // Increment the traveled distance
        this.travelled += this.distance;

        // Set router position
        this.router.setPosition(this.getCoordinates());
        // Set state of rabbit to idle
        this.setState('idle');

        // Deactivate the movement button on screen
        this.level.deactivateMovementButton();
        this.level.score.setState('default');
        // Fade the trailing journey
        this.router.fadeJourney();

        this.traveling = false;
    }

    /**
     * Moves the player sprite on screen following the provided route
     * @param {Object} route The route object calculated by the Router object
     * @param {Number} start Start time of the click to travel
     * @param {Function} callback 
     */
    move(route, start, callback) {
        callback = callback || function () { };

        // If both values are not equal, the movement has been cancelled
        if (this.start === start) {
            // Change the score increment
            this.level.score.setState('movement');
            // Set routing button to moving mode
            this.level.moving();
            // Set the sprite to moving state
            this.setState('move');
            this.level.score.start();
            // Fade the trailing journey
            this.router.stopFadeJourney();

            // Retrieve the vertexes composing the calculated route
            let vertexes = route.geometry.coordinates;
            const destination = vertexes[vertexes.length - 1];

            // Create a flower where the player has clicked
            let flower = new Flower({
                level: this.level,
                layer: this.layer.basemap.flowers,
                coordinates: destination
            });
            // Add the flower at the end of the list
            this.flowers.push(flower);

            // Create the path line and calculate its length
            const line = turf.lineString(vertexes);
            // Create a simplified journey to keep the player sprite from switching too often
            const simplified = turf.simplify(line, { tolerance: 0.0002 });
            const svertexes = simplified.geometry.coordinates;

            // Calculate the length of the journey
            const length = turf.length(line, { units: 'meters' });

            // Pre-calculate every angles along the simplified line
            const angles = [];
            for (let i = 0; i < svertexes.length - 1; i++) {
                angles[i] = angle(svertexes[i], svertexes[i + 1]);
            }
            angles[svertexes.length - 1] = angles[svertexes.length - 2];

            // Resample the original line in chunks of 3 meters
            const STEP = 3;
            const sampled = [];
            for (let d = 0; d < length; d += STEP) {
                const pt = turf.along(line, d, { units: "meters" }).geometry.coordinates;
                sampled.push(pt);
            }
            sampled.push(destination);

            // Pre-calculate the orientation of the player at every vertex of the resampled line
            // by matching the resampled line with the closest vertex from the simplified line.
            // This solution can be a good option to alleviate computation during movement
            // that might cause stutters.
            const orientation = [];
            for (let i = 0; i < sampled.length; i++) {
                const np = turf.nearestPointOnLine(simplified, sampled[i]);
                const seg = np.properties.index;
                orientation[i] = angles[seg];
            }

            let lastTime = performance.now(); // retrieve time
            const speed = this.params.game.speed.travel / 3.6; // speed in m/s
            this.distance = 0; // distance counter

            const animation = (time) => {
                // If the start time has changed, it means the movement has started again
                // or has been stopped, thus we don't continue
                if (this.start !== start) return;

                // Calculate the elapsed time in seconds
                const elapsed = (time - lastTime) / 1000;
                // Calculate the distance traveled depending on the elapsed time and the speed
                this.distance += elapsed * speed;
                // Set the previous time as the current one
                lastTime = time;

                // If the travelled distance is below the length of the route, continue the animation
                if (this.distance <= length) {
                    // This check is here to prevent treating frames that didn't produce any movement
                    if (this.distance > 0) {
                        // Get the associated vertex of the sampled line
                        let idx = Math.floor(this.distance / STEP);
                        if (idx >= sampled.length) idx = sampled.length - 1;
                        this.position = sampled[idx];

                        // Change the position of the player
                        this.setCoordinates(this.position);
                        // Change the orientation of the player based on the precalculated angle
                        this.setOrientationFromAngle(orientation[idx]);

                        // Update the trailing journey
                        this.router.updateJourney(this.position);
                        // Update the player traveled journey
                        this.journey.push(this.position);

                        // Handles enemies and vegetables if some are close-by
                        this.layer.basemap.helpers.handle(this);
                        this.layer.basemap.enemies.handle(this);

                        // If target is in range, win the level
                        if (within(this.position, this.layer.basemap.target.getCoordinates(), this.params.game.tolerance.target)) {
                            // Interaction state is won
                            if (this.clic) this.clic.state = 'won';
                            // Stop the player movement
                            this.stop();
                            // Reset the provider to default if it was changed
                            this.router.setProvider('ign');
                            callback('win');
                        }
                    }
                    // Continue the animation
                    requestAnimationFrame(animation);
                }
                else {
                    // Here, the player has reached the clicked target on screen
                    this.setCoordinates(vertexes[vertexes.length - 1]);
                    // Interaction state is reached
                    if (this.clic) { this.clic.state = 'reached'; }
                    // Stop the player movement
                    this.stop();
                    callback('continue');
                }
            };
            // Launch the animation on the next frame
            requestAnimationFrame(animation);
        }
    }

    /**
     * Make the player travel to the provided coordinates
     * @param {Array} destination coordinates
     * @param {Function} callback 
     */
    travel(destination, callback) {
        callback = callback || function () { };

        // Stop the player if currently traveling
        if (this.traveling) { this.stop(); }

        // Check that player is listening
        if (this.listen) {
            this.listen = false;

            // Check if the server is available
            checkAvailability(online => {
                this.listen = true;

                // Continue if the server is available
                if (online) {
                    this.traveling = true;

                    // Starts the recording of the movement interaction
                    this.clic = {
                        start: Date.now(),
                        pixel: this.layer.basemap.getPixelAtCoordinates(destination),
                        coordinates: destination,
                        provider: this.router.getProvider(),
                        state: 'initial'
                    }

                    // Stores the start time
                    this.start = performance.now();
                    let start = this.start;
                    // Stores the destination
                    this.destination = destination;

                    // Show the routing button and set it to routing mode
                    this.level.activateMovementButton();
                    this.level.routing();
                    this.level.score.stop();

                    let success = false;
                    const calculate = () => {
                        // Calculate the route using the router (AJAX)
                        this.router.calculateRoute(destination,
                            (route) => {
                                success = true;
                                // Make sure the map hasn't been clicked while fetching the route
                                if (destination === this.destination) {
                                    // State of the clic is set to computed
                                    this.clic.state = 'computed';
                                    this.clic.route = route.geometry.coordinates;
                                    this.clic.provider = this.router.getProvider();
                                    // Stores computing time
                                    this.clic.computing = performance.now() - start;
                                    this.move(route, start, callback);
                                }
                            },
                            () => {
                                // If router couldn't calculate the route, stop the player
                                this.stop();
                            }
                        );
                    }

                    // Launch the route calculation
                    calculate();

                    // Get the routing provider
                    let provider = this.router.getProvider();

                    // Wait for the provider waiting threshold
                    wait(this.router.getWaitingThreshold(), () => {
                        // If route was not succesfully calculated and the player didn't cancel or tried to calculate a new route
                        if (!success && destination === this.destination && provider === this.router.getProvider() && start === this.start) {
                            // Switch the provider
                            this.router.switchProvider();
                            this.clic.state = 'switched';
                            // Stop the player
                            this.stop();
                            // Start the travel again with the new provider
                            this.travel(destination, callback);
                        }
                    });
                } else {
                    // Here, the server is not reachable, displaying a popup informing the server is not reachable
                    createValidation(document.body, 'Impossible de continuer, vérifiez votre connexion internet.',
                        ['Réessayer', 'Arrêter'],
                        choice => {
                            if (choice === 1) {
                                // Stop was chosen, callback
                                callback('canceled');
                            }
                        }
                    )
                }
            });
        }
    }

    /**
     * Play the hurt sound, used when meeting an enemy on the way
     */
    playSound() {
        this.layer.basemap.app.sounds.playFile({
            src: 'lapinou-hurt',
            format: 'mp3',
            amount: 3
        });
    }
}

export default Player;