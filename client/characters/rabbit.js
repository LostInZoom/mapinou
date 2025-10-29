import { generateRandomInteger } from "../utils/math.js";
import Character from "./character.js";

class Rabbit extends Character {
    constructor(options) {
        super(options);

        this.speed = options.speed || 20;
        this.framenumber = 4;
        this.colors = options.colors || this.params.game.colors.classics;
        this.color = options.color || this.params.game.color;

        if (this.color === 'random') {
            let i = generateRandomInteger(0, this.colors.length - 1);
            this.color = this.colors[i];
        }

        this.weights = [1, 10, 30];
        this.statespool = ['move', 'graze', 'idle'];

        this.size = 52;
        this.offset = [0, -10];

        this.state = options.state || 'idle';
        this.orientable = true;
        this.orientation = options.orientation || 'south';

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

    getColor() {
        return this.color;
    }

    setColor(color) {
        this.color = color;
        this.feature.properties.color = color;
        this.layer.updateSource();
    }
}

export default Rabbit;