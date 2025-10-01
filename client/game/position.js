import { radiansToDegrees } from "@turf/turf";
import { angle } from "../cartography/analysis";
import { addClass, removeClass, hasClass, wait, makeDiv } from "../utils/dom";
import { easeInOutSine } from "../utils/math";

class Position {
    constructor(options) {
        this.basemap = options.basemap;
        this.player = options.player;

        this.container = makeDiv(null, 'level-position-container');
        this.marker = makeDiv(null, 'level-position');
        this.container.append(this.marker);
        this.basemap.container.append(this.container);

        this.listen = true;
        this.container.addEventListener('click', () => {
            if (this.listen) {
                this.listen = false;
                const start = Date.now();
                const zoom1 = this.basemap.getZoom();
                const center1 = this.basemap.getCenter();
                this.basemap.ease({
                    center: this.player.getCoordinates(),
                    duration: 500,
                    easing: easeInOutSine,
                }, () => {
                    if (this.basemap.recorder.isActive()) {
                        const end = Date.now();
                        this.basemap.recorder.insertCustomInteraction({
                            type: 'position',
                            subtype: null,
                            start: new Date(start).toISOString(),
                            end: new Date(end).toISOString(),
                            duration: end - start,
                            center1: center1.toArray(),
                            center2: this.basemap.getCenter().toArray(),
                            zoom1: zoom1.toFixed(2),
                            zoom2: this.basemap.getZoom().toFixed(2)
                        });
                    }
                    this.listen = true;
                });
            }
        })

        this.padding = [72, 20, 20, 20];
        let width = this.basemap.getWidth();
        let height = this.basemap.getHeight();

        const center = [width / 2, height / 2];
        this.aNW = angle(center, [0, 0], false);
        this.aNE = angle(center, [width, 0], false);
        this.aSW = angle(center, [0, height], false);
        this.aSE = angle(center, [width, height], false);

        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
    }

    update() {
        if (this.basemap.isVisible(this.player.getCoordinates(), 0)) {
            this.hide();
        } else {
            this.reveal();

            let [x2, y2] = this.basemap.getPixelAtCoordinates(this.player.getCoordinates());
            let [x3, y3] = [undefined, undefined];
            let a = undefined;

            let paddingN = this.padding[0] + this.height / 2;
            let paddingE = this.padding[1] + this.width / 2;
            let paddingS = this.padding[2] + this.height / 2;
            let paddingW = this.padding[3] + this.width / 2;

            let [xmin, ymin] = [paddingW, paddingN];
            let [xmax, ymax] = [this.basemap.getWidth() - paddingE, this.basemap.getHeight() - paddingS]
            let rotation = 135;

            if (x2 < xmin) { x3 = xmin; a = 180; }
            if (x2 > xmax) { x3 = xmax; a = 0; }
            if (y2 < ymin) { y3 = ymin; a = 90; }
            if (y2 > ymax) { y3 = ymax; a = -90; }
            if (x3 && y3) { a = -radiansToDegrees(angle([x3, y3], [x2, y2], false)); }
            else {
                if (x3 === undefined) { x3 = x2; }
                if (y3 === undefined) { y3 = y2; }
            }

            this.container.style.top = y3 + 'px';
            this.container.style.left = x3 + 'px';
            this.container.style.transform = `translate(-50%, -50%) rotate(${rotation - a}deg)`;
        }
    }

    reveal(callback) {
        callback = callback || function () { };
        if (hasClass(this.marker, 'pop')) { callback(); }
        else {
            addClass(this.marker, 'pop');
            wait(300, callback);
        }
    }

    hide(callback) {
        callback = callback || function () { };
        if (!hasClass(this.marker, 'pop')) { callback(); }
        else {
            removeClass(this.marker, 'pop');
            wait(300, callback);
        }
    }

    destroy(callback) {
        callback = callback || function () { };
        this.hide(() => {
            this.container.remove();
            callback();
        });
    }
}

export default Position;