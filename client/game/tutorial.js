import { within } from "../cartography/analysis";
import Score from "../cartography/score";
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
                    this.toLevels(false);
                });
            }
        });

        this.phase1(() => {
            this.phase2(() => {

            });
        });

        // this.phase2(() => {

        // });
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
                this.hint.end(callback);
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

        // await this.hint.walkIn();
        // this.hint.activateUpdate();
        // this.basemap.addListener('click', selectionListener);
        // await this.hint.displayBubble();
        // this.basemap.enableInteractions();

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
            this.hideTutorial();
            await waitPromise(300);
            this.paloma.flyIn();




            this.basemap.enableInteractions();
            this.basemap.addListener('click', selectionListener);
            this.hint.activateUpdate();
            this.basemap.render();
            this.hint.displayBubble();
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

        // await this.mask.set({ cx: '50%', cy: '100%', rx: 'max(100%, calc(35rem + 20%))', ry: 'calc(min(25vw, 25vh, 10rem) + 2rem)' });

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
            this.paloma.hideBubble();
            await this.mask.unset();
            this.paloma.setText('Maintenant, commençons !');
            this.paloma.hideInformation();
            await this.paloma.setTransparent();
            await this.mask.hide();
            this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto4);
        };

        const tuto2 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto2);
            this.paloma.hideBubble();
            await this.mask.unset();
            this.paloma.setText('Vous pouvez annuler la partie en cours en haut à gauche.');
            await this.mask.set({ cx: 0, cy: 0, r: '6rem' });
            this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto3);
        };

        const tuto1 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto1)
            await this.paloma.hideBubble();
            await this.mask.set({ cx: '100%', cy: 0, rx: '10rem', ry: '6rem' });
            this.paloma.setText('Vous pouvez activer ou désactiver la musique et les effets sonores en haut à droite.');
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto2);
        };

        this.tutorialcontainer.addEventListener('click', tuto1);
    }

    async phase2(callback) {
        callback = callback || function () { };
        this.phase = 2;

        this.paloma.walkIn();
        this.paloma.setOrientation('west');

        this.score.pop();
        this.score.setState('default');
        this.score.start();

        this.basemap.disableInteractions();
        this.basemap.createCharacters(this, this.parameters);

        this.canceler = makeDiv(null, 'level-cancel-button', this.params.svgs.helm);
        this.container.append(this.canceler);
        this.canceler.addEventListener('click', () => {
            if (this.basemap.player.traveling) { this.basemap.player.stop(); }
        });

        let visible = false;
        this.basemap.addListener('render', () => {
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
        });

        const tuto3 = async () => {
            this.tutorialcontainer.removeEventListener('click', tuto3);
            this.paloma.hideInformation();
            await this.paloma.hideBubble();
            await this.hideTutorial();

            this.basemap.enemies.spawn(1000, () => {
                this.listening = true;
                this.basemap.enableInteractions();
                this.basemap.enableMovement(win => {
                    if (win) {
                        this.basemap.disableInteractions();
                        this.clear(callback);
                    }
                });
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
                this.paloma.setText('Et voilà son ami. Il va falloir que tu cours le retrouver !');
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
            this.paloma.setText('Bravo ! Tu as trouvé Lapinou !');
            this.paloma.displayInformation();
            await this.paloma.displayBubble();
            this.tutorialcontainer.addEventListener('click', tuto2);
        };

        //     this.basemap.enemies.spawn(1000, () => {
        //         this.listening = true;
        //         this.basemap.enableInteractions();
        //         this.basemap.enableMovement(win => {
        //             if (win) {
        //                 this.basemap.disableInteractions();
        //                 this.clear(callback);
        //             }
        //         });
        //     });

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, tuto1);
        });
    }

    ending() {
        this.score.stop()
        this.endScore = this.score.get();
        this.score.unpop(() => { this.score.destroy(); });

        let results = {
            session: this.params.session.index,
            tier: this.tier,
            level: this.level,
            score: this.endScore,
        }

        const clearing = 2;
        let cleared = 0;
        const toLeaderBoard = () => {
            if (++cleared === clearing) { this.leaderboard(); }
        };

        ajaxPost('results', results, hs => {
            this.highscores = hs.highscores;
            toLeaderBoard();
        });

        this.basemap.fit(this.dataExtent, {
            easing: easeInOutSine,
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            curve: 1.42,
            speed: 1.2
        }, toLeaderBoard);
    }

    leaderboard() {
        this.app.progress();
        this.canceler.remove();

        this.highscoreContainer = makeDiv(null, 'highscore-container');
        this.highscoreMap = makeDiv(null, 'highscore-map');
        this.highscoreScore = makeDiv(null, 'highscore-score', 0);
        this.highscoreLeaderboardContainer = makeDiv(null, 'highscore-leaderboard-container');
        this.highscoreLeaderboard = makeDiv(null, 'highscore-leaderboard no-scrollbar');
        this.continue = makeDiv(null, 'highscore-continue-button', "Continuer")

        this.highscoreLeaderboardContainer.append(this.highscoreScore, this.highscoreLeaderboard)
        this.highscoreContainer.append(this.highscoreMap, this.highscoreLeaderboardContainer, this.continue);
        this.container.append(this.highscoreContainer);

        this.highscoreContainer.offsetWidth;
        addClass(this.highscoreContainer, 'pop');

        let c = this.parameters.target;
        let r = this.params.game.tolerance.target;
        let hsmap = new Basemap({
            app: this.app,
            parent: this.highscoreMap,
            class: 'minimap',
            interactive: false,
            extent: pointExtent(c, r * 2)
        }, () => {
            hsmap.loadSprites().then(() => {
                let hsRabbits = new Rabbits({
                    id: 'leaderboard-rabbits',
                    basemap: hsmap,
                    level: this
                });
                let hsTarget = new Target({
                    layer: hsRabbits,
                    colors: ['brown', 'sand', 'grey'],
                    color: 'random',
                    coordinates: randomPointInCircle(c, r)
                });
                let hsPlayer = new Target({
                    layer: hsRabbits,
                    colors: ['brown', 'sand', 'grey'],
                    color: 'random',
                    coordinates: randomPointInCircle(c, r)
                });

                let delay = 300;
                wait(delay, () => {
                    hsTarget.spawn();
                    hsPlayer.spawn();
                });

                delay += 200;
                wait(delay, () => {
                    addClass(this.highscoreScore, 'pop');
                    addClass(this.continue, 'pop');
                });

                delay += 500;
                wait(delay, () => {
                    addClass(this.highscoreScore, 'incrementing');
                    easingIncrement({
                        element: this.highscoreScore,
                        maximum: this.endScore,
                        duration: 1000,
                        easing: easeOutExpo
                    }, () => {
                        removeClass(this.highscoreScore, 'incrementing');
                        addClass(this.highscoreScore, 'stop');
                        this.continue.addEventListener('click', () => {
                            removeClass(this.highscoreContainer, 'pop');
                            hsRabbits.despawnCharacters(() => {
                                hsRabbits.destroy();
                                hsmap.remove();
                                this.toLevels(true);
                            });
                        }, { once: true })
                    });
                })

                this.highscores.sort((a, b) => a.score - b.score);
                let personal;
                for (let e = 1; e < this.highscores.length; e++) {
                    let entry = this.highscores[e];
                    let boardEntry = makeDiv(null, 'highscore-leaderboard-entry');
                    let html = `${e}.`;
                    if (this.params.session.index === entry.session) {
                        html += ' Vous';
                        addClass(boardEntry, 'active');
                        personal = boardEntry;
                    }
                    let boardPlace = makeDiv(null, 'highscore-leaderboard-place', html);
                    let boardScore = makeDiv(null, 'highscore-leaderboard-score', entry.score);
                    boardEntry.append(boardPlace, boardScore);
                    this.highscoreLeaderboard.append(boardEntry);
                }

                // Scroll to the user result
                if (personal) {
                    let topScroll = personal.offsetTop;
                    this.highscoreLeaderboard.scrollTop = topScroll - this.highscoreLeaderboard.offsetHeight / 2;
                }
            });
        });
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

    toLevels(update) {
        this.basemap.unsetMinZoom();
        this.destroy();

        this.basemap.fit(this.params.interface.map.levels, {
            easing: easeInOutSine
        }, () => {
            this.app.page = new Levels({
                app: this.app,
                position: 'current',
                update: update
            });
        });
    }
}

export default Tutorial;