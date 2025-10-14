import * as turf from "@turf/turf";

import { angle, within } from "../cartography/analysis.js";
import Rabbit from "./rabbit.js";
import Router from "../cartography/routing.js";
import Flower from "./flower.js";
import { wait } from "../utils/dom.js";

class Player extends Rabbit {
    constructor(options) {
        super(options);
        this.level = options.level;

        // Routing infos
        this.router = new Router({
            basemap: this.layer.basemap,
            player: this,
            position: this.coordinates
        });

        this.destination = undefined;
        this.traveling = false;

        this.distance = 0;
        this.position = this.coordinates;
        this.start = 0;
        this.journey = [this.coordinates];
        this.enemies = 0;
        this.helpers = 0;

        this.flowers = [];

        this.invulnerable = false;
        this.originColor = this.getColor();
    }

    incrementEnemies() {
        ++this.enemies;
    }

    incrementHelpers() {
        ++this.helpers;
    }

    getEnemiesNumber() {
        return this.enemies;
    }

    getHelpersNumber() {
        return this.helpers;
    }

    getJourney() {
        return this.journey;
    }

    despawnRouter() {
        this.router.despawnJourney();
    }

    isInvulnerable() {
        return this.invulnerable;
    }

    makeVulnerable() {
        this.invulnerable = false;
        this.setColor(this.originColor);
    }

    makeInvulnerable(duration, blink, callback) {
        callback = callback || function () { };

        this.invulnerable = true;
        const start = performance.now();
        let lastBlink = start;

        this.setColor('red');
        let visible = false;

        const animate = (time) => {
            if (this.invulnerable) {
                const elapsed = time - start;
                if (elapsed >= duration) {
                    this.invulnerable = false;
                    this.setColor(this.originColor);
                    callback();
                } else {
                    if (time - lastBlink >= blink) {
                        visible = !visible;
                        this.setColor(visible ? this.originColor : 'red');
                        lastBlink = time;
                    }
                    requestAnimationFrame(animate);
                }
            }
        };
        requestAnimationFrame(animate);
    }

    stop() {
        if (this.clic) {
            if (this.layer.basemap.recorder.isActive()) {
                const end = Date.now();
                this.clic.duration = end - this.clic.start;
                this.clic.start = new Date(this.clic.start).toISOString();
                this.clic.end = new Date(end).toISOString();
                if (this.clic.computing === undefined) { this.clic.computing = performance.now() - this.start }
                this.layer.basemap.recorder.insertCustomClic(this.clic);
            }
        }

        this.start = 0;

        if (this.flowers.length > 0) {
            this.flowers.shift().decay();
        }
        // Increment the traveled distance
        this.travelled += this.distance;

        // Set router position
        this.router.setPosition(this.getCoordinates());
        this.setState('idle');

        this.level.deactivateMovementButton();
        this.level.score.setState('default');
        this.router.fadeJourney();

        this.traveling = false;
    }

    move(route, start, callback) {
        callback = callback || function () { };

        if (this.start === start) {
            // Change the score increment
            this.level.score.setState('movement');
            // Set routing button to moving mode
            this.level.moving();
            // Set the sprite to moving state
            this.setState('move');
            this.level.score.start();
            this.router.stopFadeJourney();

            // Retrieve the vertexes composing the calculated route
            let vertexes = route.geometry.coordinates;
            const destination = vertexes[vertexes.length - 1];

            let flower = new Flower({
                level: this.level,
                layer: this.layer.basemap.flowers,
                coordinates: destination
            });
            this.flowers.push(flower);

            // Create the path line and calculate its length
            const line = turf.lineString(vertexes);
            const simplified = turf.simplify(line, { tolerance: 0.0002 });
            const svertexes = simplified.geometry.coordinates;
            const length = turf.length(line, { units: 'meters' });

            // Retrieve the time
            let lastTime = performance.now();

            // Get the speed in meters/second
            const speed = this.params.game.speed.travel / 3.6;

            // Start the distance counter
            this.distance = 0;

            // orientation fixe pour ce segment
            this.setOrientationFromAngle(angle(svertexes[0], svertexes[1]));
            let journey = [svertexes[0]];

            const animation = (time) => {
                if (this.start === start) {
                    // Calculate the elapsed time in seconds
                    const elapsed = (time - lastTime) / 1000;
                    // Calculate the distance traveled depending on the elapsed time and the speed
                    this.distance = this.distance + (elapsed * speed);
                    // Set the previous time as the current one
                    lastTime = time;

                    // If the travelled distance is below the length of the route, continue the animation
                    if (this.distance <= length) {
                        if (this.distance > 0) {
                            // Calculate the position of the point along the route line
                            let along = turf.along(line, this.distance, { units: 'meters' });
                            this.position = along.geometry.coordinates;

                            let projected = turf.nearestPointOnLine(simplified, along);
                            let i = projected.properties.index;
                            const before = svertexes[i];
                            const after = svertexes[i + 1];

                            if (!journey.includes(before)) {
                                this.setOrientationFromAngle(angle(before, after));
                                journey.push(before);
                            }

                            this.router.updateJourney(this.position);
                            this.setCoordinates(this.position);
                            this.journey.push(this.position);

                            this.layer.basemap.helpers.handle(this);
                            this.layer.basemap.enemies.handle(this);

                            // If target is in range, win the level
                            if (within(this.position, this.layer.basemap.target.getCoordinates(), this.params.game.tolerance.target)) {
                                if (this.clic) { this.clic.state = 'won'; }
                                this.stop();
                                this.router.setProvider('ign');
                                callback(true);
                            }
                        }
                        requestAnimationFrame(animation);
                    }
                    else {
                        this.setCoordinates(vertexes[vertexes.length - 1]);
                        if (this.clic) { this.clic.state = 'reached'; }
                        this.stop();
                        callback(false);
                    }
                }
            };
            requestAnimationFrame(animation);
        }
    }

    travel(destination, callback) {
        callback = callback || function () { };

        if (this.traveling) { this.stop(); }
        this.traveling = true;

        this.clic = {
            start: Date.now(),
            pixel: this.layer.basemap.getPixelAtCoordinates(destination),
            coordinates: destination,
            provider: this.router.getProvider(),
            state: 'initial'
        }

        this.start = performance.now();
        let start = this.start;
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
                        this.clic.state = 'computed';
                        this.clic.route = route.geometry.coordinates;
                        this.clic.provider = this.router.getProvider();
                        this.clic.computing = performance.now() - start;
                        this.move(route, start, callback);
                    }
                },
                () => { this.stop(); }
            );
        }
        calculate();

        let provider = this.router.getProvider();
        wait(this.router.getWaitingThreshold(), () => {
            if (!success && destination === this.destination && provider === this.router.getProvider() && start === this.start) {
                this.router.switchProvider();
                this.clic.state = 'switched';
                this.stop();
                this.travel(destination, callback);
            }
        });
    }
}

export default Player;