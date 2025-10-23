import translate from "translate";
import { generateId } from "zoo-ids";

import { addClass, hasClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import Page from "./page";
import { pxToRem, remToPx } from "../utils/parse";

class Custom extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Valider');

        this.text = makeDiv(null, 'form-text');
        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        this.classics = ['white', 'sand', 'brown', 'grey'];
        this.specials = ['pink', 'green', 'brown', 'grey'];

        let rabbitcontainer = makeDiv(null, 'custom-rabbit-container');
        this.text.append(rabbitcontainer);

        let rabbits = makeDiv(null, 'custom-rabbits classics');
        rabbitcontainer.append(rabbits);

        let rabbitlist = [];
        this.classics.forEach(c => {
            let rabbit = makeDiv(null, 'custom-rabbit-individual');
            if (c === this.params.game.color) { addClass(rabbit, 'active'); }
            let image = document.createElement('img');
            let src = this.params.sprites[`rabbits:${c}_idle_east_0`]
            image.src = src;
            image.alt = 'Lapinou';
            rabbit.append(image);
            rabbits.append(rabbit);
            rabbitlist.push(rabbit);

            rabbit.addEventListener('click', () => {
                if (!hasClass(rabbit)) {
                    rabbitlist.forEach(r => { removeClass(r, 'active'); })
                    addClass(rabbit, 'active');
                    this.params.game.color = c;
                    localStorage.setItem('color', c);
                }
            });
        });

        let pseudocontainer = makeDiv(null, 'custom-pseudo-container');
        this.text.append(pseudocontainer);

        let pseudoback = makeDiv(null, 'custom-pseudo-back');
        let pseudoname = makeDiv(null, 'custom-pseudo-label', this.params.session.name);
        pseudoback.append(pseudoname);
        let pseudorandomizer = makeDiv(null, 'custom-pseudo-randomizer', this.params.svgs.random);
        pseudocontainer.append(pseudoback, pseudorandomizer);

        const getHeight = (c, html, width) => {
            let node = makeDiv(null, c, html);
            node.style.width = width;
            document.body.append(node);
            let height = node.offsetHeight;
            node.remove();
            return height;
        }

        let nameheight = getHeight('custom-pseudo-label', this.params.session.name, pseudoback.offsetWidth - remToPx(2) + 'px');
        pseudoback.style.height = pxToRem(nameheight) + 1 + 'rem';

        let listen = true;
        const rename = async () => {
            if (listen) {
                listen = false;
                addClass(pseudoname, 'right');
                let translation;
                const tasks = [];
                tasks.push(async (c) => {
                    const animal = generateId(null, {
                        numAdjectives: 1,
                        caseStyle: 'titlecase',
                        delimiter: ' '
                    });
                    translate.engine = "google";
                    translation = await translate(animal, "fr");
                    c();
                });
                tasks.push((c) => { wait(200, c); });

                const clearing = tasks.length;
                let cleared = 0;
                const rename = async () => {
                    if (++cleared === clearing) {
                        let height = getHeight('custom-pseudo-label', translation, pseudoback.offsetWidth - remToPx(2) + 'px');
                        if (height !== nameheight) {
                            nameheight = height;
                            pseudoback.style.height = pxToRem(nameheight) + 1 + 'rem';
                            await waitPromise(100);
                        }
                        pseudoname.remove();
                        pseudoname = makeDiv(null, 'custom-pseudo-label left', translation);
                        pseudoback.append(pseudoname);
                        pseudoback.offsetWidth;
                        removeClass(pseudoname, 'left');
                        wait(200, () => { listen = true; })
                    }
                }
                tasks.forEach(t => t(rename))
            }
        };

        pseudorandomizer.addEventListener('click', rename);

        wait(this.app.options.interface.transition.page, () => {
            addClass(this.back, 'pop');
            addClass(this.continue, 'pop');
        });
    }
}

export default Custom;