import Page from "./page";
import { addClass, isAppInstalled, isOverflown, makeDiv, removeClass, wait } from "../utils/dom";
import Title from "./title";

class About extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.content = makeDiv(null, 'page-content page-content-about pop');
        this.buttontitle = makeDiv(null, 'about-button-title pop', 'Menu principal');
        this.container.append(this.content, this.buttontitle);

        let title = makeDiv(null, 'about-title', 'À propos');
        let text = makeDiv(null, 'about-text no-scrollbar');
        this.scrollindicator = makeDiv(null, 'about-scroll-indicator', '▼');

        this.content.append(title, text, this.scrollindicator);

        const about = this.params.about;
        about.forEach(e => {
            if (e.type === 'paragraph') {
                let entry = makeDiv(null, 'about-paragraph');
                text.append(entry);
                if ('title' in e) {
                    let t = makeDiv(null, 'about-paragraph-title', e.title);
                    entry.append(t);
                }
                let p = makeDiv(null, 'about-paragraph-text', e.content);
                entry.append(p);
            } else if (e.type === 'vectors') {
                let entry = makeDiv(null, 'about-vectors');
                text.append(entry);

                e.content.forEach(vector => {
                    let v = makeDiv(null, `about-svg ${vector.src}`, this.params.svgs[vector.src]);
                    let l = makeDiv(null, 'about-link', this.params.svgs.hyperlink);
                    v.append(l);
                    v.addEventListener('click', evt => {
                        evt.stopPropagation();
                        if (isAppInstalled()) {
                            navigator.share({
                                title: vector.info,
                                url: vector.link
                            });
                        } else {
                            window.open(vector.link, '_blank');
                        }
                    });
                    entry.append(v);
                });
            }
        });

        wait(this.params.interface.transition.page, () => {
            this.observer = new ResizeObserver(() => {
                if (isOverflown(text)) {
                    addClass(this.scrollindicator, 'active');
                } else {
                    removeClass(this.scrollindicator, 'active');
                }
            }).observe(text);

            this.scrollindicator.addEventListener('click', () => {
                this.playButtonSound();
                text.scrollBy({
                    top: 100,
                    behavior: 'smooth'
                });
            });

            this.buttontitle.addEventListener('click', () => {
                if (this.listen) {
                    if (this.observer) this.observer.unobserve(text);
                    addClass(this.buttontitle, 'clicked');
                    this.buttontitle.addEventListener('animationend', () => { removeClass(this.buttontitle, 'clicked'); });
                    this.playButtonSound();
                    this.listen = false;
                    this.next = new Title({ app: this.app, position: 'next' });
                    this.slideNext();
                }
            });
        });
    }
}

export default About;