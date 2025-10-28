import { Content, Footer, Header } from "./elements.js";
import { addClass, clearElement, makeDiv, removeClass } from "../utils/dom.js";
import { generateRandomInteger } from "../utils/math.js";

class Page {
    constructor(options, callback) {
        this.options = options || {};
        this.callback = callback || function () { };
        this.listen = true;

        this.app = this.options.app;
        this.params = this.app.options;
        this.basemap = this.app.basemap;
        this.position = this.options.position;

        // Create DOM Element
        this.container = makeDiv(null, 'page ' + this.position);
        this.app.container.append(this.container);
        this.container.offsetWidth;
    }

    getWidth() {
        return this.container.offsetWidth;
    }

    getHeight() {
        return this.container.offsetHeight;
    }

    addHeader(justification = 'center') {
        this.header = new Header(this);
        this.header.setJustification(justification);
    }

    addContent(justification = 'center') {
        this.content = new Content(this);
        this.content.setJustification(justification);
    }

    addFooter(justification = 'center') {
        this.footer = new Footer(this);
        this.footer.setJustification(justification);
    }

    setPosition(position) {
        ['previous', 'current', 'next'].forEach((p) => { removeClass(this.container, p); })
        addClass(this.container, position);
    }

    slideNext() {
        this.app.slide({
            position: 'previous',
            page: this.next
        });
    }

    slidePrevious() {
        this.app.slide({
            position: 'next',
            page: this.previous
        });
    }

    playButtonSound() {
        this.app.sounds.playFile({ src: this.app.uipool[generateRandomInteger(0, this.app.uipool.length - 1)], volume: 0.6 });
    }

    playSound(options) {
        return this.app.sounds.playFile(options);
    }

    clear() {
        clearElement(this.container);
    }

    destroy() {
        this.container.remove();
    }
}

export default Page;