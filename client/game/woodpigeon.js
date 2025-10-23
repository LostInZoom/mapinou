import { makeDiv, wait } from "../utils/dom";

class Woodpigeon {
    constructor(options) {
        this.options = options;
        this.page = this.options.page;
        this.parent = this.options.parent;

        this.frame = 0;
        this.framenumber = 2;
        this.framerate = 500;

        this.character = makeDiv(null, 'credits-woodpigeon');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'woody';
        this.character.append(this.charimage);

        this.parent.append(this.character);
        this.animateFrame();
        this.character.offsetWidth;

        let sing = false;
        this.character.addEventListener('click', () => {
            if (!sing) {
                sing = true;
                this.page.app.sounds.playFile({ src: 'columbapalumbus' }, () => { sing = false; });
            }
        });
    }

    reload() {
        this.charimage.src = this.page.params.sprites[`woodpigeon:idle_east_${this.frame}`];
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

export default Woodpigeon;