import { addClass, makeDiv, removeClass, wait } from "../utils/dom";
import { generateRandomInteger } from "../utils/math";

class Woodpigeon {
    constructor(options) {
        this.options = options;
        this.level = this.options.level;
        this.basemap = this.level.basemap;
        this.params = this.level.params;

        this.parent = this.level.tutorialcontainer;

        this.alive = true;
        this.state = 'walk';
        this.orientation = 'west';
        this.frame = 0;
        this.framenumber = 3;
        this.framerate = 200;

        this.container = makeDiv(null, 'woodpigeon-container');

        this.character = makeDiv(null, 'woodpigeon-character hidden');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'woody';
        this.character.append(this.charimage);

        this.bubble = makeDiv(null, 'woodpigeon-bubble');
        this.information = makeDiv(null, 'woodpigeon-infos hidden', 'Cliquez pour continuer.');
        this.container.append(this.bubble, this.character, this.information);

        this.parent.append(this.container);
        this.animateFrame();
        this.container.offsetWidth;
        removeClass(this.character, 'hidden');

        wait(3000, () => {
            this.frame = 0;
            this.framenumber = 2;
            this.framerate = 500;
            this.setState('idle');

            this.setText("Bonjour, je suis Paloma<br>C'est moi qui vais vous guider pendant ce tutoriel !");

            addClass(this.bubble, 'pop');
            removeClass(this.information, 'hidden');

            this.parent.addEventListener('click', () => {
                this.setText('Je suis un petit pigeon mignon.');

                let i = generateRandomInteger(0, 3);
                this.setOrientation(['north', 'south', 'west', 'east'][i]);
            });
        });
    }

    reload() {
        this.charimage.src = this.params.sprites[`woodpigeon:${this.state}_${this.orientation}_${this.frame}`];
    }

    setState(state) {
        this.state = state;
        this.reload();
    }

    setOrientation(orientation) {
        this.orientation = orientation;
        this.reload();
    }

    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    animateFrame() {
        this.startFrameAnimation = performance.now();
        let start = this.startFrameAnimation;
        const animation = () => {
            wait(this.framerate, () => {
                if (start === this.startFrameAnimation) {
                    this.frame = (this.frame + 1) % this.framenumber;
                    this.reload();
                    requestAnimationFrame(animation);
                }
            });
        };
        requestAnimationFrame(animation);
    }

    setText(text) {
        this.bubble.innerHTML = text;
    }
}

export default Woodpigeon;