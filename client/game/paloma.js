import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";

class Paloma {
    constructor(options) {
        // TODO: DESTROY WOODPIGEON !! 
        this.options = options;
        this.level = this.options.level;
        this.basemap = this.level.basemap;
        this.params = this.level.params;

        this.parent = this.level.tutorialcontainer;

        this.alive = true;
        this.state = 'walk';
        this.orientation = 'east';
        this.frame = 0;
        this.framenumber = 3;
        this.framerate = 200;

        this.container = makeDiv(null, 'paloma-container pop');

        this.character = makeDiv(null, 'paloma-character out-left');
        this.charimage = document.createElement('img');
        this.reload();
        this.charimage.alt = 'paloma';
        this.character.append(this.charimage);

        this.bubblecontainer = makeDiv(null, 'paloma-bubble-container');
        this.bubble = makeDiv(null, 'paloma-bubble');
        this.bubblecontainer.append(this.bubble);
        this.information = makeDiv(null, 'paloma-infos hidden', 'Cliquez pour continuer.');
        this.container.append(this.bubblecontainer, this.character, this.information);

        this.parent.append(this.container);
        this.animateFrame();
        this.container.offsetWidth;
    }

    async walkIn() {
        removeClass(this.character, 'out-left');
        this.setState('walk');
        this.setOrientation('east');
        await waitPromise(2000);
        this.frame = 0;
        this.setState('idle');
    }

    async walkOut() {
        addClass(this.character, 'out-left');
        this.setState('walk');
        this.setOrientation('west');
        await waitPromise(2000);
        this.frame = 0;
        this.setState('idle');
    }

    async flyOut() {
        addClass(this.character, 'out-right');
        this.setState('fly');
        this.setOrientation('east');
        await waitPromise(1000);
        this.frame = 0;
        this.setState('idle');
    }

    async flyIn() {
        removeClass(this.character, 'out-right');
        this.setState('fly');
        this.setOrientation('west');
        await waitPromise(1000);
        this.frame = 0;
        this.setState('idle');
    }

    async displayBubble() {
        addClass(this.bubblecontainer, 'pop');
        await waitPromise(300);
    }

    async hideBubble() {
        removeClass(this.bubblecontainer, 'pop');
        await waitPromise(300);
    }

    async displayInformation() {
        removeClass(this.information, 'hidden');
        await waitPromise(300);
    }

    async hideInformation() {
        addClass(this.information, 'hidden');
        await waitPromise(300);
    }

    async focusBubble() {
        addClass(this.bubblecontainer, 'focus');
        await waitPromise(100);
        removeClass(this.bubblecontainer, 'focus');
        await waitPromise(200);
    }

    async setTransparent() {
        addClass(this.bubble, 'transparent');
    }

    async unsetTransparent() {
        removeClass(this.bubble, 'transparent');
    }

    display(callback) {
        callback = callback || function () { };
        removeClass(this.container, 'hidden');
        wait(300, callback);
    }

    hide(callback) {
        callback = callback || function () { };
        addClass(this.container, 'hidden');
        wait(300, callback);
    }

    reload() {
        this.charimage.src = this.params.sprites[`woodpigeon:${this.state}_${this.orientation}_${this.frame}`];
    }

    setState(state) {
        if (state === 'idle') { this.framenumber = 2; this.framerate = 500; }
        else { this.framenumber = 3; this.framerate = 200; }
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

    destroy() {
        this.startFrameAnimation = 0;
    }
}

export default Paloma;