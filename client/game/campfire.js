import { makeDiv, wait } from "../utils/dom";

class Campfire {
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.parent = this.options.parent;

        this.frame = 0;
        this.framenumber = 5;
        this.framerate = 100;

        this.character = makeDiv(null, 'credits-campfire');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'campfire';
        this.character.append(this.charimage);

        this.parent.append(this.character);
        this.animateFrame();
        this.character.offsetWidth;
    }

    reload() {
        this.charimage.src = this.page.params.sprites[`fire:${this.frame}`];
    }

    setFrame(frame) {
        this.frame = frame;
        this.reload();
    }

    destroy() {
        this.startFrameAnimation = 0;
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
}

export default Campfire;