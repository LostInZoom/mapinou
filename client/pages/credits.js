import Consent from "./consent";
import Form from "./form";
import Levels from "./levels";
import Page from "./page";

import { addClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { remap, easeOutCubic, easeInOutSine } from "../utils/math";
import { capitalizeFirstLetter, pxToRem } from "../utils/parse";
import Title from "./title";

class Credits extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.buttonTitle = makeDiv(null, 'credits-button-title pop', 'Menu principal');
        this.container.append(this.buttonTitle);

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
                let name = makeDiv(null, 'credits-name', e.name);
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
                        this.cancelAnimation();
                    });
                }
            });

            this.animate();
        });
    }

    animate() {
        const scroll = () => {
            this.scrollbox.scrollTop += 1;
            if (this.scrollbox.scrollTop + this.scrollbox.clientHeight >= this.scrollbox.scrollHeight) {
                this.scrollbox.scrollTop = 0;
            }
            this.scroller = requestAnimationFrame(scroll);
        }

        this.scrolling = true;
        this.scroller = requestAnimationFrame(scroll);

        const cancelscroll = () => {
            if (this.scroller) { cancelAnimationFrame(this.scroller); }
        }

        const touchstart = () => {
            if (this.scrolling) { cancelscroll(); }
        }

        const touchend = () => {
            if (this.scrolling) { scroll(); }
        }

        const click = () => {
            if (this.scrolling) {
                cancelscroll();
                this.scrolling = false;
            }
            else {
                scroll();
                this.scrolling = true;
            }
        }

        this.scrollbox.addEventListener('touchstart', touchstart);
        this.scrollbox.addEventListener('touchend', touchend);
        this.scrollbox.addEventListener('click', click);
    }

    cancelAnimation() {
        if (this.scroller) { cancelAnimationFrame(this.scroller); }
    }
}

export default Credits;