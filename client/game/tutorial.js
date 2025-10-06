import { centroid, within } from "../cartography/analysis";
import Score from "../cartography/score";
import Levels from "../pages/levels";
import Page from "../pages/page";
import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { easeInOutSine } from "../utils/math";
import { TutorialMask } from "../utils/svg";
import Hint from "./hint";
import Woodpigeon from "./woodpigeon";

class Tutorial extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.params = this.options.app.options;
        this.levels = this.options.levels;

        this.tier = this.options.tier;
        this.level = this.options.level;
        this.parameters = this.app.options.levels[this.tier];
        this.first = this.options.first;

        this.options.app.forbidRabbits();
        this.score = new Score({
            level: this,
            parent: this.options.app.header,
            state: 'stopped'
        });

        this.back = makeDiv(null, 'header-button left', this.params.svgs.cross);
        this.options.app.header.insert(this.back);
        this.back.offsetWidth;
        addClass(this.back, 'pop');

        this.tutorialcontainer = makeDiv(null, 'tutorial-container hidden');
        this.app.container.append(this.tutorialcontainer);
        this.tutorialcontainer.offsetWidth;

        this.mask = new TutorialMask({ parent: this.tutorialcontainer });
        this.paloma = new Woodpigeon({ level: this });
        this.hint = new Hint({ level: this });

        // Cancel current game and go back to level selection
        this.listening = false;
        this.back.addEventListener('click', () => {
            if (this.listening) {
                this.listening = false;
                this.clear(() => {
                    this.toLevels();
                });
            }
        });

        this.phase1(() => {
            this.phase2(() => { this.ending() });
        });
    }

    async phase1(callback) {
        callback = callback || function () { };
        this.phase = 1;
        this.displayTutorial();

        let activeWrong = false;
        const selectionListener = (e) => {
            let target = e.lngLat.toArray();
            let player = this.parameters.player;
            if (within(target, player, this.params.game.tolerance.target)) {
                this.score.unpop();
                this.score.stop();

                this.mask.reveal().then(() => {
                    this.hint.end(callback);
                });
            } else {
                if (!activeWrong) {
                    activeWrong = true;
                    addClass(this.basemap.getContainer(), 'wrong');
                    this.score.addModifier('position');
                    wait(500, () => { removeClass(this.basemap.getContainer(), 'wrong'); });
                    this.hint.injure(300, () => {
                        activeWrong = false;
                    });
                }
            }
        }

        await this.paloma.walkIn();
        this.paloma.setText("Bonjour, je suis Paloma.<br>Je vais vous guider pendant ce tutoriel !");
        await waitPromise(300);
        this.paloma.setOrientation('south');
        this.paloma.displayBubble();
        await this.paloma.displayInformation();

        const tuto11 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto11);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            this.paloma.setState('fly');
            await waitPromise(1000);
            await this.paloma.flyOut();
            await this.hideTutorial();
            this.paloma.flyIn();

            this.displayPhase(1, () => {
                this.score.reset();
                this.score.pop();
                this.score.setState('default');
                this.score.start();

                this.basemap.enableInteractions();
                this.basemap.addListener('click', selectionListener);
                this.hint.activateUpdate();
                this.basemap.render();
                this.hint.displayBubble();
            });
        }

        const tuto10 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto10);
            this.paloma.setText("Bonne recherche !");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto11);
        }

        const tuto9 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto9);
            this.paloma.setText("Il vous donnera des indications au fur et à mesure que vous zoomerez.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto10);
        }

        const tuto8 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto8);
            await this.paloma.hideBubble();
            await waitPromise(300);
            this.paloma.setOrientation('south');
            await waitPromise(300);
            this.paloma.setText("Pouvez-vous aidez Lapinou à se localiser sur la carte ?");
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto9);
        };

        const tuto7 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto7);
            await this.hint.hideBubble();
            this.paloma.setText("Pas de problème ! On va t'aider.");
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto8);
        };

        const tuto6 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto6);
            await this.paloma.hideBubble();
            this.hint.setText("Bin oui, je suis perdu...");
            await this.hint.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto7);
        };

        const tuto5 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto5);
            this.paloma.hideBubble();
            await this.hint.hideBubble();
            await waitPromise(300);
            this.paloma.setOrientation('west');
            await waitPromise(300);
            this.paloma.setText("Tu as l'air inquiet Lapinou...");
            this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto6);
        };

        const tuto4 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto4);
            this.paloma.hideBubble();
            await this.hint.walkIn();
            this.paloma.setText('Voici Lapinou.');
            await this.paloma.displayBubble();
            await waitPromise(500);
            this.hint.setText("Salut !");
            await this.hint.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto5);
        }

        const tuto3 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto3);
            this.score.stop();
            this.score.unpop();
            this.paloma.hideBubble();
            await this.mask.unset();
            this.paloma.setText('Maintenant, commençons !');
            this.paloma.hideInformation();
            await this.paloma.setTransparent();
            await this.mask.hide();
            this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto4);
        };

        const tuto2bis = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto2bis);
            await this.paloma.hideBubble();
            await this.mask.unset();
            await this.mask.set({ cx: this.score.getLeftPosition(), cy: "2.25rem", rx: "4rem", ry: "3rem" });
            this.score.pop();
            this.score.setState('default');
            this.score.start();
            this.paloma.setText('Votre score apparaît ici. Gardez-le le plus bas possible.');
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto3);
        };

        const tuto2 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto2);
            this.paloma.hideBubble();
            await this.mask.unset();
            this.paloma.setText('Vous pouvez annuler la partie en cours en haut à gauche.');
            await this.mask.set({ cx: "2.25rem", cy: "2.25rem", r: '3rem' });
            this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto2bis);
        };

        const tuto1 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto1);
            await this.paloma.hideBubble();
            await this.mask.set({ cx: 'calc(100% - 4rem)', cy: "2.25rem", rx: '4rem', ry: '3rem' });
            this.paloma.setText('Vous pouvez activer ou désactiver la musique et les effets sonores en haut à droite.');
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto2);
        };

        this.tutorialcontainer.addEventListener('click', tuto1);
    }

    async phase2(callback) {
        callback = callback || function () { };
        this.phase = 2;

        this.paloma.unsetTransparent();
        this.paloma.walkIn();
        this.paloma.setOrientation('west');

        this.basemap.disableInteractions();
        this.basemap.createCharacters(this, this.parameters);

        this.canceler = makeDiv(null, 'level-cancel-button', this.params.svgs.helm);
        this.container.append(this.canceler);
        this.canceler.addEventListener('click', () => {
            if (this.basemap.player.traveling) { this.basemap.player.stop(); }
        });

        let visible = false;
        this.listening = true;
        let helperTutorial = false;

        const vege2 = async () => {
            this.tutorialcontainer.removeEventListener('click', vege2);
            this.mask.unset();
            await this.paloma.hideBubble();
            this.hideTutorial();
            helperTutorial = true;
            this.basemap.addListener('render', mapListener);
        };

        const vege1 = async () => {
            this.tutorialcontainer.removeEventListener('click', vege1);
            this.paloma.setText(`Les manger fera baisser votre score de ${Math.abs(this.params.game.score.modifier['helpers'])} points.`);
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', vege2);
        };

        const mapListener = async () => {
            let threshold = this.params.game.routing;
            let zoom = this.basemap.getZoom();
            if (zoom >= threshold && !visible) {
                visible = true;
                this.basemap.helpers.reveal();
                this.basemap.enemies.revealAreas();
            }
            else if (zoom < threshold && visible) {
                visible = false;
                this.basemap.helpers.hide();
                this.basemap.enemies.hideAreas();
            }

            if (!helperTutorial) {
                let visible = this.basemap.helpers.getVisibleHelpers();
                if (visible.length > 0) {
                    let h = visible[0];
                    if (this.basemap.isVisible(h.getCoordinates(), 50)) {
                        this.basemap.player.stop();
                        this.paloma.unsetTransparent();

                        this.mask.reveal();
                        let px = this.basemap.getPixelAtCoordinates(h.getCoordinates());
                        if (px[0] < this.mask.getWidth() / 2) { this.paloma.setOrientation('west'); }
                        else { this.paloma.setOrientation('east'); }

                        await this.displayTutorial();
                        await this.mask.set({ cx: px[0], cy: px[1], rx: '3rem', ry: '3rem' });
                        this.basemap.removeListener('render', mapListener);

                        this.paloma.setText("Vous pouvez trouver des légumes sur votre chemin.");
                        await this.paloma.displayBubble();
                        this.paloma.displayInformation();
                        this.tutorialcontainer.addEventListener('click', vege1);
                    }
                }
            }
        }

        this.basemap.addListener('render', mapListener);

        const endtuto = async () => {
            this.tutorialcontainer.removeEventListener('click', endtuto);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            this.paloma.setState('fly');
            await waitPromise(1000);
            await this.paloma.flyOut();
            await this.hideTutorial();
            this.paloma.flyIn();

            this.displayPhase(2, () => {
                this.score.start();
                this.score.pop();
                this.basemap.enableInteractions();
                this.basemap.enableMovement(win => {
                    if (win) { this.clear(callback); }
                });
            });
        }

        const tuto9 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto9);
            this.score.setState('default');
            this.score.unpop(() => { this.score.stop(); });
            removeClass(this.basemap.maskcontainer, 'routable');
            await this.paloma.hideBubble();
            await this.hideTutorial();

            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                duration: 1000,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, async () => {
                this.centerWoodpigeon();
                this.paloma.unsetTransparent();
                this.mask.reveal();
                await this.displayTutorial();
                this.paloma.setText("Bonne route !");
                await this.paloma.displayBubble();
                this.paloma.displayInformation();
                this.tutorialcontainer.addEventListener('click', endtuto);
            });
        }

        const tuto8 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto8);
            this.score.setState('movement');
            this.paloma.setText("Lors de vos déplacements, votre score augmente plus rapidement.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto9);

        }

        const tuto7 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto7);
            this.score.pop();
            this.score.start();
            this.paloma.setText("Quand vous êtes immobile, votre score augmente d'un point par seconde.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto8);
        }

        const tuto6 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto6);
            await this.paloma.hideBubble();

            this.basemap.ease({
                center: this.basemap.player.getCoordinates(),
                duration: 1000
            }, async () => {
                addClass(this.basemap.maskcontainer, 'routable');
                this.paloma.setText("Lorsque des bordures sont visibles autour de l'écran, vous pouvez vous déplacer sur la carte.");
                await this.paloma.displayBubble();
                this.tutorialcontainer.addEventListener('click', tuto7);
            });
        }

        const tuto5bis = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto5bis);
            this.paloma.setText(`Traverser cette zone fera augmenter votre score de ${this.params.game.score.modifier['enemies']} points.`);
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto6);
        };

        const tuto5 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto5);
            let centers = [];
            let enemies = this.basemap.enemies.getCharacters();
            enemies.forEach(e => { centers.push(e.getCoordinates()) });

            await this.paloma.hideBubble();
            this.paloma.setOrientation('north');
            await waitPromise(300);

            this.basemap.ease({
                center: centroid(centers),
                zoom: this.params.game.routing,
                duration: 1000,
                padding: { top: 0, bottom: 50, left: 0, right: 0 }
            }, async () => {
                this.paloma.setText("Cette zone n'est visible qu'à partir d'un certain niveau de zoom.");
                await this.paloma.displayBubble();
                this.paloma.setOrientation('south');
                this.tutorialcontainer.addEventListener('click', tuto5bis);
            });
        }

        const tuto4 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto4);
            this.paloma.setText("Chacun possède une zone de chasse de taille différente.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto5);
        }

        const tuto3 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto3);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            await this.mask.unset();
            await this.hideTutorial();
            this.mask.hide();

            this.basemap.enemies.spawn(1000, async () => {
                this.endWoodpigeon();
                this.paloma.setOrientation('south');
                this.paloma.setTransparent();
                await this.displayTutorial();
                this.paloma.setText("Attention, il y a des prédateurs sur votre chemin : des serpents, des aigles et des chasseurs.");
                await this.paloma.displayBubble();
                this.tutorialcontainer.addEventListener('click', tuto4);
            });
        }

        const tuto2 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto2);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            await this.mask.unset();
            let px = this.basemap.getPixelAtCoordinates(this.basemap.target.getCoordinates());
            if (px[0] < this.mask.getWidth() / 2) { this.paloma.setOrientation('west'); }
            else { this.paloma.setOrientation('east'); }
            await this.mask.set({ cx: px[0], cy: px[1], rx: '3rem', ry: '3rem' });
            this.basemap.target.spawn(async () => {
                this.paloma.setText('Et voilà son ami. Allez le retrouver !');
                await this.paloma.displayBubble();
                this.paloma.displayInformation();
                this.tutorialcontainer.addEventListener('click', tuto3);
            });
        };

        const tuto1 = async () => {
            await this.displayTutorial();
            let px = this.basemap.getPixelAtCoordinates(this.basemap.player.getCoordinates());
            if (px[0] < this.mask.getWidth() / 2) { this.paloma.setOrientation('west'); }
            else { this.paloma.setOrientation('east'); }
            await this.mask.set({ cx: px[0], cy: px[1], rx: '3rem', ry: '3rem' });
            this.paloma.setText('Bravo ! Vous avez trouvé Lapinou !');
            this.paloma.displayInformation();
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto2);
        };

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                padding: { top: 100, bottom: 150, left: 50, right: 50 }
            }, tuto1);
        });
    }

    async ending() {
        const tuto4 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto4);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            this.paloma.setState('fly');
            await waitPromise(1000);
            await this.paloma.flyOut();
            await this.hideTutorial();

            this.toLevels();
        }

        const tuto3 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto3);
            this.paloma.setText("Amusez-vous bien !");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto4);
        }

        const tuto2 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto2);
            this.paloma.setText("Par contre, vous ne pouvez faire chaque niveau qu'une fois.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto3);
        }

        const tuto1 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto1);
            this.paloma.setText("Vous pouvez refaire ce tutoriel avec moi quand vous voulez.");
            await this.paloma.focusBubble();
            this.tutorialcontainer.addEventListener('click', tuto2);
        }

        this.paloma.walkIn();

        this.centerWoodpigeon();
        this.paloma.setOrientation('south');
        await this.displayTutorial();
        this.paloma.setText("Bravo, vous avez retrouvé l'ami de Lapinou !");
        await this.paloma.displayBubble();
        this.paloma.displayInformation();

        this.tutorialcontainer.addEventListener('click', tuto1);
    }

    async displayTutorial() {
        removeClass(this.tutorialcontainer, 'hidden');
        await waitPromise(300);
    }

    async hideTutorial() {
        addClass(this.tutorialcontainer, 'hidden');
        await waitPromise(300);
    }

    async displayPhase(number) {
        let phasecontainer = makeDiv(null, 'level-phase-container');
        let title = makeDiv(null, 'level-phase-title', 'Phase ' + number);
        let text;
        if (number === 1) { text = "Retrouvez la position de Lapinou en navigant sur la carte" }
        else { text = "Rejoignez votre ami lapin en vous déplaçant sur la carte" }
        let subtitle = makeDiv(null, 'level-phase-subtitle', text);
        phasecontainer.append(title, subtitle);
        this.container.append(phasecontainer);
        this.container.offsetWidth;
    }

    routing() {
        if (this.canceler) {
            removeClass(this.canceler, 'moving');
            addClass(this.canceler, 'routing');
        }
    }

    moving() {
        if (this.canceler) {
            removeClass(this.canceler, 'routing');
            addClass(this.canceler, 'moving');
        }
    }

    activateMovementButton() {
        if (this.canceler) {
            addClass(this.canceler, 'active');
        }
    }

    deactivateMovementButton() {
        if (this.canceler) {
            removeClass(this.canceler, 'moving');
            removeClass(this.canceler, 'routing');
            removeClass(this.canceler, 'active');
        }
    }

    clear(callback) {
        callback = callback || function () { };
        removeClass(this.back, 'pop');
        this.basemap.disableInteractions();
        this.basemap.removeListeners();

        const tasks = [
            (cb) => wait(300, cb),
            (cb) => this.score.destroy(cb),
        ];

        if (this.phase === 1) {
            tasks.push((cb) => this.hint.end(cb));
        }
        else if (this.phase === 2) {
            tasks.push((cb) => this.basemap.clear(cb));
            tasks.push((cb) => this.basemap.makeUnroutable(cb));
        }

        let cleared = 0;
        const clearing = tasks.length;
        const checkDone = () => {
            if (++cleared === clearing) {
                this.back.remove();
                callback();
            };
        };
        tasks.forEach(task => task(checkDone));
    }

    endWoodpigeon() {
        addClass(this.tutorialcontainer, 'end');
    }

    centerWoodpigeon() {
        removeClass(this.tutorialcontainer, 'end');
    }

    toLevels() {
        this.destroy();

        this.basemap.fit(this.params.interface.map.levels, {
            easing: easeInOutSine
        }, () => {
            if (this.first) { this.app.progress(); }
            this.app.page = new Levels({
                app: this.app,
                position: 'current',
                update: this.first
            });
        });
    }

    async displayPhase(number, callback) {
        callback = callback || function () { };

        let phasecontainer = makeDiv(null, 'level-phase-container');
        let textcontainer = makeDiv(null, 'level-phase-text');
        let title = makeDiv(null, 'level-phase-title', 'Phase ' + number);
        let text;
        if (number === 1) { text = "Retrouvez la position de Lapinou en navigant sur la carte" }
        else { text = "Rejoignez votre ami lapin en vous déplaçant sur la carte" }
        let subtitle = makeDiv(null, 'level-phase-subtitle', text);
        let clicktocontinue = makeDiv(null, 'level-phase-continue', 'Cliquez pour continuer');
        textcontainer.append(title, subtitle);
        phasecontainer.append(textcontainer, clicktocontinue);
        this.container.append(phasecontainer);
        this.container.offsetWidth;

        addClass(textcontainer, 'reveal');
        await waitPromise(1000);
        addClass(subtitle, 'reveal');
        addClass(clicktocontinue, 'reveal');

        const listener = () => {
            phasecontainer.removeEventListener('click', listener);
            removeClass(clicktocontinue, 'reveal');
            addClass(textcontainer, 'hide');
            wait(1000, () => {
                phasecontainer.remove();
                callback();
            });
        }

        phasecontainer.addEventListener('click', listener);
    }
}

export default Tutorial;