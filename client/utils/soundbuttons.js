import Sound from "./sounds";
import { addClass, makeDiv, removeClass, setStorage, wait } from "../utils/dom";

class SoundButton {
    constructor(options) {
        this.app = options.app;
        this.parent = options.parent;
        this.svg = options.svg;

        this.button = makeDiv(null, 'audio-button-container');
        this.buttonchild = makeDiv(null, 'audio-button', this.svg);
        this.button.append(this.buttonchild);
        this.parent.append(this.button);

        this.active = false;
        this.pending = false;
    }

    isActive() {
        return this.active;
    }

    isPending() {
        return this.pending;
    }

    display(callback) {
        addClass(this.button, 'pop');
        wait(300, callback);
    }

    hide(callback) {
        removeClass(this.button, 'pop');
        wait(300, callback);
    }

    activate(callback) {
        addClass(this.button, 'active');
        this.active = true;
        wait(300, callback);
    }

    deactivate(callback) {
        removeClass(this.button, 'active');
        this.active = false;
        wait(300, callback);
    }
}

class Music extends SoundButton {
    constructor(options) {
        super(options);
        addClass(this.button, 'audio-button-music');
        this.sound = new Sound(options);

        this.buttonListener = () => {
            if (this.sound.isPlaying()) { this.pause(); }
            else { this.play(); }
        }
        this.pauseListener = () => {
            removeClass(this.button, 'active');
            this.active = false;
            setStorage('music', false);
        }
        this.playListener = () => {
            addClass(this.button, 'active');
            this.active = true;
            setStorage('music', true);
        }

        this.enableListeners();
    }

    play() {
        this.sound.play();
    }

    pause() {
        this.sound.pause();
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

        this.buttonListener = () => {
            if (this.active) {
                this.app.pauseSounds();
                removeClass(this.button, 'active');
                this.active = false;
                setStorage('sounds', false);
            } else {
                this.app.playSounds();
                addClass(this.button, 'active');
                this.active = true;
                setStorage('sounds', true);
            }
        }
        this.button.addEventListener('click', this.buttonListener);
    }

    playFile(options) {
        if (this.active) {
            return new Sound(options).play();
        }
    }
}

export { Music, SoundEffects }