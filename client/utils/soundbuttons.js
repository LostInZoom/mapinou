import Sound from "./sounds";
import { addClass, makeDiv, removeClass, wait } from "../utils/dom";

class SoundButton {
    constructor(options) {
        this.parent = options.parent;
        this.svg = options.svg;
        this.button = makeDiv(null, 'audio-button-container active');
        this.buttonchild = makeDiv(null, 'audio-button', this.svg);
        this.button.append(this.buttonchild);
        this.parent.append(this.button);

        this.active = true;
        this.pending = false;
    }

    isActive() {
        return this.active;
    }

    isPending() {
        return this.pending;
    }

    display(deactivate = true, callback) {
        callback = callback || function () { };
        addClass(this.button, 'pop');
        if (deactivate) {
            wait(300, () => {
                removeClass(this.button, 'active');
                this.active = false;
                callback();
            });
        } else {
            callback();
        }
    }
}

class Music extends SoundButton {
    constructor(options) {
        super(options);
        addClass(this.button, 'audio-button-music');
        this.sound = new Sound(options);

        this.buttonListener = () => {
            if (this.sound.isPlaying()) {
                this.sound.pause();
                this.active = false;
            }
            else {
                this.sound.play();
                this.active = true;
            }
        }
        this.pauseListener = () => {
            removeClass(this.button, 'active');
            this.active = false;
        }
        this.playListener = () => {
            addClass(this.button, 'active');
            this.active = true;
        }

        this.enableListeners();
    }

    enableListeners() {
        // Handle play and pause from the web app
        this.button.addEventListener('click', this.buttonListener);
        // Handle play and pause from outside the webapp
        this.sound.audio.addEventListener('pause', this.pauseListener);
        this.sound.audio.addEventListener('play', this.playListener);
    }

    disableListeners() {
        this.button.removeEventListener('click', this.buttonListener);
        this.sound.audio.removeEventListener('pause', this.pauseListener);
        this.sound.audio.removeEventListener('play', this.playListener);
    }

    fadeOut(duration, keepAlive, callback) {
        callback = callback || function () { };
        if (!this.sound.isPlaying()) return;
        if (keepAlive) {
            this.disableListeners();
            this.pending = true;
        }
        this.sound.fadeOut(duration, callback);
    }

    change(src, play) {
        this.sound.setSource(src, true, play);
        if (play) { this.pending = false; }
        this.enableListeners();
    }
}

class SoundEffects extends SoundButton {
    constructor(options) {
        super(options);
        addClass(this.button, 'audio-button-sounds');

        this.button.addEventListener('click', () => {
            if (this.active) {
                removeClass(this.button, 'active');
                this.active = false;
            } else {
                addClass(this.button, 'active');
                this.active = true;
            }
        });
    }

    playFile(options) {
        if (this.active) {
            new Sound(options).play();
        }
    }
}

export { Music, SoundEffects }