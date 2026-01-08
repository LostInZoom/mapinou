import { generateRandomInteger } from "../utils/math.js";
import Character from "./character.js";

class Rabbit extends Character {
    /**
     * Rabbit class with specific methods and properties
     * @param {Object} options 
     */
    constructor(options) {
        super(options);

        // Define the speed of rabbits in px/s
        this.speed = options.speed || 20;
        // Number of frames in the spritesheet
        this.framenumber = 4;
        // Set available colors => default being classic colors (no special unlockables)
        this.colors = options.colors || this.params.game.colors.classics;
        // Color of the rabbit
        this.color = options.color || this.params.game.color;

        // If a random color is selected, selecting it
        if (this.color === 'random') {
            let i = generateRandomInteger(0, this.colors.length - 1);
            this.color = this.colors[i];
        }

        // Set different allowed moving states with their relative weight
        this.weights = [1, 10, 30];
        this.statespool = ['move', 'graze', 'idle'];

        // Sprite properties
        this.size = 52;
        this.offset = [0, -10];
        this.state = options.state || 'idle';
        // Rabbits are orientable, default to south
        this.orientable = true;
        this.orientation = options.orientation || 'south';

        // Set the feature properties
        this.feature.properties.color = this.color;
        this.feature.properties.state = this.state;
        this.feature.properties.orientation = this.orientation;
        this.feature.properties.frame = this.frame;
        this.feature.properties.scale = this.scale;
        this.feature.properties.offset = this.offset;
        this.feature.properties.opacity = this.opacity;

        this.layer.addCharacter(this);
        this.animateFrame();
    }

    /**
     * Get the color of the rabbit
     * @returns {string}
     */
    getColor() {
        return this.color;
    }

    /**
     * Set the color of the rabbit
     * @param {string} color 
     */
    setColor(color) {
        this.color = color;
        this.feature.properties.color = color;
        // Update the feature source
        this.layer.updateSource();
    }
}

export default Rabbit;