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

        this.flowers = [];

        this.invulnerable = false;
        this.originColor = this.getColor();
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
        // TODO: OPTIMIZE THE MOVEMENT -> PRECALCULATE THE POSITIONS AND REDUCE THE FPS

        callback = callback || function () { };

        // Set routing button to moving mode
        this.level.moving();
        // Set the sprite to moving state
        this.setState('move');
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

                        this.layer.basemap.helpers.handle(this);
                        this.layer.basemap.enemies.handle(this);

                        // If target is in range, win the level
                        if (within(this.position, this.layer.basemap.target.getCoordinates(), this.params.game.tolerance.target)) {
                            this.stop();
                            callback(true);
                        }
                    }
                    requestAnimationFrame(animation);
                }
                else {
                    this.setCoordinates(vertexes[vertexes.length - 1]);
                    this.stop();
                    callback();
                }
            }
        };
        requestAnimationFrame(animation);
    }

    travel(destination, callback) {
        callback = callback || function () { };

        if (this.traveling) { this.stop(); }
        this.traveling = true;

        this.start = performance.now();
        let start = this.start;
        this.destination = destination;

        // Show the routing button and set it to routing mode
        this.level.activateMovementButton();
        this.level.routing();

        // Calculate the route using the router (AJAX)
        this.router.calculateRoute(destination, (route) => {
            // Make sure the map hasn't been clicked while fetching the route
            if (destination === this.destination) {
                // Change the score increment
                this.level.score.setState('movement');
                this.move(route, start, callback);
            }
        });
    }
}

export default Player;