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

        this.content = makeDiv(null, 'page-content page-content-credits no-scrollbar pop');
        this.container.append(this.content);

        const credits = this.params.credits;
        credits.forEach(part => {
            let title = makeDiv(null, 'credits-title', part.title);
            let content = makeDiv(null, 'credits-content');
            this.content.append(title, content);

            part.content.forEach(e => {
                let entry = makeDiv(null, 'credits-entry');
                let role = makeDiv(null, 'credits-role', e.role);
                let name = makeDiv(null, 'credits-name', e.name);
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
                }
            });
        });
    }
}

export default Credits;