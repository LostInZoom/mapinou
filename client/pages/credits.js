import Page from "./page";
import { addClass, makeDiv, removeClass, wait } from "../utils/dom";
import Title from "./title";

class Credits extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.bottombuttons = makeDiv(null, 'credits-bottom-buttons');
        this.buttonscroll = makeDiv(null, 'credits-scroll pop', this.params.svgs.scroll);
        this.buttonTitle = makeDiv(null, 'credits-button-title pop', 'Menu principal');

        this.bottombuttons.append(this.buttonscroll, this.buttonTitle);
        this.container.append(this.bottombuttons);

        this.content = makeDiv(null, 'page-content page-content-credits pop');
        this.container.append(this.content);

        let title = makeDiv(null, 'credits-title', 'Crédits');
        this.scrollbox = makeDiv(null, 'credits-scrollbox no-scrollbar');
        let spacertop = makeDiv(null, 'credits-spacer');
        let text = makeDiv(null, 'credits-text');
        let spacerbottom = makeDiv(null, 'credits-spacer');

        this.scrollbox.append(spacertop, text, spacerbottom);
        this.content.append(title, this.scrollbox);

        const credits = this.params.credits;
        credits.forEach(part => {
            let group = makeDiv(null, 'credits-group');
            let grouptitle = makeDiv(null, 'credits-group-title');
            let maintitle = makeDiv(null, 'credits-group-maintitle', part.title);
            grouptitle.append(maintitle);

            if ('subtitle' in part) {
                let subtitle = makeDiv(null, 'credits-group-subtitle', part.subtitle);
                grouptitle.append(subtitle);
            }

            let content = makeDiv(null, 'credits-content');
            group.append(grouptitle, content);
            text.append(group);

            part.content.forEach(e => {
                let entry = makeDiv(null, 'credits-entry');
                let role = makeDiv(null, 'credits-role', e.role);
                let name = makeDiv(null, 'credits-name');
                let label = makeDiv(null, 'credits-label', e.name);
                name.append(label);
                if ('link' in e) {
                    let link = makeDiv(null, 'credits-hyperlink', this.params.svgs.hyperlink);
                    name.append(link);
                    link.addEventListener('click', (evt) => {
                        evt.stopPropagation();
                        window.open(e.link, '_blank');
                    });
                }
                entry.append(role, name);
                content.append(entry);
            });
        });

        wait(this.params.interface.transition.page, () => {
            this.listen = true;
            this.buttonTitle.addEventListener('click', () => {
                if (this.listen) {
                    this.listen = false;
                    this.next = new Title({ app: this.app, position: 'next' });
                    this.slideNext();
                    wait(this.params.interface.transition.page, () => {
                        this.stopScroll();
                    });
                }
            });

            this.animate();

            this.buttonscroll.addEventListener('click', () => {
                if (this.scrolling) {
                    this.stopScroll();
                    this.scrolling = false;
                    addClass(this.buttonscroll, 'active');
                }
                else {
                    this.startScroll();
                    this.scrolling = true;
                    removeClass(this.buttonscroll, 'active');
                }
            });
        });
    }

    startScroll() {
        this.scrollbox.scrollTop += 1;
        if (this.scrollbox.scrollTop + this.scrollbox.clientHeight >= this.scrollbox.scrollHeight) {
            this.scrollbox.scrollTop = 0;
        }
        this.scroller = requestAnimationFrame(() => { this.startScroll(); });
    }

    stopScroll() {
        if (this.scroller) { cancelAnimationFrame(this.scroller); }
    }

    animate() {
        this.scrolling = true;
        this.scroller = requestAnimationFrame(() => { this.startScroll(); });

        const touchstart = () => {
            if (this.scrolling) { this.stopScroll(); }
        }

        const touchend = () => {
            if (this.scrolling) { this.startScroll(); }
        }

        this.scrollbox.addEventListener('touchstart', touchstart);
        this.scrollbox.addEventListener('touchend', touchend);
    }
}

export default Credits;