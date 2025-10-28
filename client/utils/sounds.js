import { generateRandomInteger } from "./math.js";

class Sound {
    constructor(options) {
        this.options = options || {};
        this.prefix = './sounds/';
        this.src = options.src;

        this.format = options.format ?? 'mp3';
        this.loop = options.loop ?? false;
        this.amount = options.amount ?? 1;
        this.volume = options.volume ?? 1;
        this.loadAudio();
    }

    loadAudio() {
        if (this.amount > 1) {
            this.file = `${this.prefix}${this.src}${generateRandomInteger(1, this.amount)}.${this.format}`;
        } else {
            this.file = `${this.prefix}${this.src}.${this.format}`;
        }

        this.audio = new Audio(this.file);
        if (this.volume !== 1) { this.audio.volume = this.volume; }

        this.audio.loop = this.loop;
        this.audio.autoplay = false;
    }

    getVolume() {
        return this.audio.volume;
    }

    setVolume(value) {
        this.audio.volume = value;
    }

    destroy() {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
        this.audio = null;
    }

    setSource(src, loop, play) {
        this.src = src;
        this.loop = loop;
        this.stop();
        this.loadAudio();
        if (play) this.play();
    }

    play(callback) {
        callback = callback || function () { };
        if (this.audio.paused) {
            this.audio.play();
            this.audio.addEventListener('ended', callback);
        } else {
            callback();
        }
    }

    pause() {
        if (!this.audio.paused) { this.audio.pause(); }
    }

    stop() {
        if (!this.audio.paused) { this.audio.pause(); }
        this.audio.currentTime = 0;
    }

    isPlaying() {
        return !this.audio.paused;
    }

    fadeIn(duration, callback) {
        callback = callback || function () { };
        const audio = this.audio;
        const targetVolume = this.volume;
        const startTime = performance.now();

        if (audio.paused) {
            audio.volume = 0;
            audio.play();
        }

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const newValue = targetVolume * progress;
            audio.volume = Math.min(1, Math.max(0, newValue));

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                audio.volume = targetVolume;
                callback();
            }
        };

        requestAnimationFrame(step);
    }

    fadeOut(duration, callback) {
        callback = callback || function () { };
        const audio = this.audio;
        const startVolume = audio.volume;
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const newValue = startVolume * (1 - progress);
            audio.volume = newValue > 1 ? 1 : newValue;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                audio.pause();
                audio.volume = startVolume;
                callback();
            }
        };

        requestAnimationFrame(step);
    }
}

export default Sound;