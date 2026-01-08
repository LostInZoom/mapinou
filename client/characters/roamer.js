import * as turf from '@turf/turf';

import { angle, randomPointInCircle } from "../cartography/analysis.js";
import { generateRandomInteger, weightedRandom } from "../utils/math.js";
import Rabbit from "./rabbit.js";
import { wait } from "../utils/dom.js";

class Roamer extends Rabbit {
    /**
     * Roamer class is a rabbit that can roam around the
     * screen or within a defined circle on the map
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        // Set a random orientation at creation
        this.setRandomOrientation();
    }

    /**
     * Make the rabbit roam around
     */
    roam() {
        // Stores start time
        this.start = performance.now();
        let start = this.start;
        // Choose what to do
        this.choose(start);
    }

    /**
     * Make the rabbit choose between the pool of available possibilities
     * which are move, graze or idle
     * @param {int} start 
     */
    choose(start) {
        // If the start time has changed, it means the roamind has canceled, thus we don't continue
        if (start === this.start) {
            // Reset the frame to 0
            this.setFrame(0);

            // Once out of for times, the rabbit will change its orientation randomly
            if (generateRandomInteger(0, 4) === 4) { this.setRandomOrientation(); }

            // Choose the next state using the available pool and its associated weights
            let choice = weightedRandom(this.statespool, this.weights.slice());

            // If the rabbit chooses to move
            if (choice === 'move') {
                let destination;

                // If the roamer is a target
                if (this.target) {
                    // Make the destination be a random point inside a circle around its position
                    destination = randomPointInCircle(this.origin, this.radius);
                } else {
                    // Select a random point inside the current screen with a padding equal to the sprite size
                    let e = this.layer.basemap.getContainer();
                    let x = generateRandomInteger(this.size, e.offsetWidth - this.size);
                    let y = generateRandomInteger(this.size, e.offsetHeight - this.size);
                    destination = this.layer.basemap.getCoordinatesAtPixel([x, y]);
                }

                // Set the sprite to move state
                this.setState('move');
                // Calculate the orientation based on the destination point
                this.setOrientationFromAngle(angle(this.coordinates, destination));

                // Create a line between the roamer and the destination
                const line = turf.lineString([this.coordinates, destination]);
                const length = turf.length(line, { units: 'meters' });

                let distance = 0;
                // Stores the start time
                let lastTime = performance.now();

                const animation = (time) => {
                    // If the start time has changed, it means the roaming has been canceled, thus we don't continue
                    if (start === this.start) {
                        // Calculate de distance roamed based on the rabbit speed and the elapsed time
                        let elapsed = (time - lastTime) / 1000;
                        if (elapsed < 0) { elapsed = 0; }
                        distance += this.speed * elapsed * this.layer.basemap.getResolution();

                        lastTime = time;
                        // Checks the moves distance is less than the line distance
                        if (distance < length) {
                            // Make sure the distance along the line is above 0
                            if (distance > 0) {
                                // Calculate the new position
                                let coords = turf.along(line, distance, { units: 'meters' }).geometry.coordinates;
                                this.setCoordinates(coords);
                            }
                            // Continue the animation
                            requestAnimationFrame(animation);
                        }
                        else {
                            // Here, destination has been reached
                            this.setCoordinates(destination);
                            // Choose again, no rest for the roamers
                            this.choose(start);
                        }
                    }
                };

                // Launch the animation on the next frame
                requestAnimationFrame(animation);
            } else {
                // Here the rabbit choose to be graze or idle
                this.setState(choice);
                // Wait for the animation to end before choosing again
                wait(4 * this.framerate, () => {
                    this.choose(start);
                });
            }
        }
    }
}

export default Roamer;