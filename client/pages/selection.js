import translate from "translate";
import { generateId } from "zoo-ids";

import { addClass, hasClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { pxToRem, remToPx } from "../utils/parse";

class Selection {
    constructor(options) {
        this.options = options || {};
        this.page = this.options.page;
        this.params = this.page.params;
        this.parent = this.options.parent;

        this.classics = ['white', 'sand', 'brown', 'grey'];
        this.specials = ['pink', 'neon', 'cyan', 'yellow'];

        let rabbitcontainer = makeDiv(null, 'custom-rabbit-container');
        this.parent.append(rabbitcontainer);

        let rabbits = makeDiv(null, 'custom-rabbits classics');
        rabbitcontainer.append(rabbits);

        this.selectedName = this.params.session.name;
        this.selectedColor = this.params.game.color;

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
                    this.page.playSound({ src: 'lapinou-happy', volume: 0.6 });
                    rabbitlist.forEach(r => { removeClass(r, 'active'); })
                    addClass(rabbit, 'active');
                    this.selectedColor = c;
                }
            });
        });

        let pseudocontainer = makeDiv(null, 'custom-pseudo-container');
        this.parent.append(pseudocontainer);

        let pseudoback = makeDiv(null, 'custom-pseudo-back');
        let pseudoname = makeDiv(null, 'custom-pseudo-label', this.selectedName);
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

        let nameheight = getHeight('custom-pseudo-label', this.selectedName, pseudoback.offsetWidth - remToPx(2) + 'px');
        pseudoback.style.height = pxToRem(nameheight) + 1 + 'rem';

        let listen = true;
        const rename = async () => {
            if (listen) {
                listen = false;
                this.page.playButtonSound();
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
                        this.selectedName = translation;
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
    }

    getValues() {
        return [this.selectedColor, this.selectedName];
    }
}

export default Selection;