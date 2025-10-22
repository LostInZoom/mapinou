import { addClass, makeDiv, wait } from "../utils/dom";
import Page from "./page";

class Custom extends Page {
    constructor(options, callback) {
        super(options, callback);

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        this.text = makeDiv(null, 'form-text');
        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        let choosecontainer = makeDiv(null, 'levels-rabbit-container');
        let choosewindow = makeDiv(null, 'levels-rabbit-window');
        choosecontainer.append(choosewindow);
        let chooserabbits = makeDiv(null, 'levels-rabbit-rabbits');

        let rabbitlist = [];
        this.params.game.colors.forEach(c => {
            let chooserabbit = makeDiv(null, 'levels-rabbit-individual');
            if (c === this.params.game.color) { addClass(chooserabbit, 'active'); }
            let chooseimage = document.createElement('img');
            let src = this.params.sprites[`rabbits:${c}_idle_east_0`]
            chooseimage.src = src;
            chooseimage.alt = 'Lapinou';
            chooserabbit.append(chooseimage);
            chooserabbits.append(chooserabbit);
            rabbitlist.push(chooserabbit);

            chooserabbit.addEventListener('click', () => {
                if (!hasClass(chooserabbit)) {
                    rabbitlist.forEach(r => { removeClass(r, 'active'); })
                    addClass(chooserabbit, 'active');
                    this.params.game.color = c;
                    localStorage.setItem('color', c);
                }
            });
        });

        choosewindow.append(chooserabbits);
        this.text.append(choosecontainer);

        wait(this.app.options.interface.transition.page, () => {
            addClass(this.back, 'pop');
            addClass(this.continue, 'pop');
        });
    }
}

export default Custom;