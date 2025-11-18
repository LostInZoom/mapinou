import * as turf from "@turf/turf";

import Page from "../pages/page";
import Levels from '../pages/levels';
import Score from "../cartography/score";
import Hint from './hint';
import Recorder from '../cartography/recorder';
import Leaderboard from './leaderboard';

import { within } from "../cartography/analysis";
import { addClass, makeDiv, removeClass, wait, waitPromise } from "../utils/dom";
import { ajaxPost } from '../utils/ajax';
import { easeInOutSine } from '../utils/math';

class Level extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.params = this.options.app.options;
        this.levels = this.options.levels;
        this.tutorial = this.options.tutorial ?? false;

        this.tier = this.options.tier;
        this.level = this.options.level;
        this.parameters = this.app.options.levels[this.tier].content[this.level];

        this.options.app.forbidRabbits();
        this.score = new Score({
            level: this,
            parent: this.options.app.header,
            state: 'stopped'
        });
        this.recorder = new Recorder({ basemap: this.basemap });

        this.results = {
            session: this.params.session.index,
            game: this.params.game,
            tier: this.tier,
            level: this.level
        };

        this.back = makeDiv(null, 'header-button left', this.params.svgs.cross);
        this.options.app.header.insert(this.back);
        this.back.offsetWidth;
        addClass(this.back, 'pop');

        // Cancel current game and go back to level selection
        this.listening = false;
        this.back.addEventListener('click', () => {
            if (this.listening) {
                this.playButtonSound();
                this.listening = false;
                this.clear(() => {
                    this.toLevels(false);
                });
            }
        });

        this.phase1(() => {
            this.phase2(() => {
                wait(300, () => {
                    this.ending();
                });
            });
        });
    }

    async phase1(callback) {
        callback = callback || function () { };
        this.phase = 1;
        const start = Date.now();

        this.displayPhase(1, async () => {
            let activeWrong = false;
            const selectionListener = (e) => {
                let target = e.lngLat.toArray();
                let player = this.parameters.player;
                let clic = {
                    time: new Date().toISOString(),
                    pixel: [e.point.x, e.point.y],
                    coordinates: target
                }

                if (within(target, player, this.params.game.tolerance.click)) {
                    this.playSound({ src: 'lapinou-end', volume: 0.8 });

                    this.score.stop();
                    clic.correct = true;
                    this.basemap.recorder.insertCustomClic(clic);
                    this.basemap.recorder.off();
                    this.results.phase1 = this.basemap.recorder.get();

                    const end = Date.now();
                    this.results.phase1.duration = end - start;
                    this.results.phase1.start = new Date(start).toISOString();
                    this.results.phase1.end = new Date(end).toISOString();
                    this.results.phase1.score = this.score.get();

                    this.basemap.recorder.reset();
                    this.hint.end(callback);
                } else {
                    if (!activeWrong) {
                        activeWrong = true;
                        clic.correct = false;
                        this.basemap.recorder.insertCustomClic(clic);

                        this.playSound({ src: 'lapinou-hurt', amount: 3, volume: 0.8 });
                        addClass(this.basemap.getContainer(), 'wrong');
                        this.score.addModifier('position');
                        wait(500, () => { removeClass(this.basemap.getContainer(), 'wrong'); });
                        this.hint.injure(300, () => {
                            activeWrong = false;
                        });
                    }
                }
            }

            this.hint = new Hint({ level: this });
            await this.hint.walkIn();
            this.basemap.addListener('click', selectionListener);
            this.hint.activateUpdate();
            await this.hint.displayBubble();
            this.score.pop();
            this.score.setState('default');
            this.score.start();

            this.basemap.recorder.on();
            this.basemap.enableInteractions();
            this.listening = true;
        });
    }

    async phase2(callback) {
        callback = callback || function () { };
        this.phase = 2;
        const start = Date.now();
        this.basemap.recorder.reset();

        this.basemap.disableInteractions();
        this.basemap.createCharacters(this, this.parameters);

        this.canceler = makeDiv(null, 'level-cancel-button', this.params.svgs.helm);
        this.container.append(this.canceler);
        this.canceler.addEventListener('click', () => {
            this.playButtonSound();
            if (this.basemap.player.traveling) {
                this.basemap.player.stop();
                this.score.start();
            }
        });

        let visible = false;
        this.basemap.addListener('render', () => {
            let threshold = this.params.game.routing.minzoom;
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

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, () => {
                this.basemap.target.spawn(() => {
                    this.basemap.enemies.spawn(1000, () => {
                        this.displayPhase(2, () => {
                            this.score.start();
                            this.listening = true;
                            this.basemap.enableInteractions();
                            this.basemap.recorder.on();
                            this.basemap.enableMovement(state => {
                                if (state === 'win') {
                                    this.playSound({ src: 'lapinou-end', volume: 0.8 });

                                    const end = Date.now();
                                    this.basemap.recorder.off();
                                    this.results.phase2 = this.basemap.recorder.get();
                                    this.results.score = this.score.get();
                                    this.results.enemies = this.basemap.player.getEnemiesNumber();
                                    this.results.helpers = this.basemap.player.getHelpersNumber();

                                    this.results.phase2.duration = end - start;
                                    this.results.phase2.start = new Date(start).toISOString();
                                    this.results.phase2.end = new Date(end).toISOString();

                                    const j = this.basemap.player.getJourney();
                                    this.results.phase2.journey = j;
                                    this.results.phase2.distance = turf.length(turf.lineString(j), { units: 'meters' });
                                    this.results.phase2.score = this.score.get();

                                    this.basemap.recorder.reset();
                                    this.basemap.disableInteractions();
                                    this.score.stop();
                                    this.score.unpop(() => { this.score.destroy(); });
                                    this.clear(callback);
                                } else if (state === 'canceled') {
                                    this.back.click();
                                }
                            });
                        });
                    });
                });
            });
        });
    }

    ending() {
        const clearing = 2;
        let cleared = 0;
        const toLeaderBoard = () => {
            if (++cleared === clearing) { this.leaderboard(); }
        };

        ajaxPost('results', this.results, hs => {
            this.highscores = hs;
            toLeaderBoard();
        });

        this.basemap.fit(this.dataExtent, {
            easing: easeInOutSine,
            padding: { top: 100, bottom: 50, left: 50, right: 50 },
            curve: 1.42,
            speed: 1.2
        }, () => { toLeaderBoard(); });
    }

    leaderboard() {
        this.app.progress();
        if (this.canceler) { this.canceler.remove(); }

        this.leaderboard = new Leaderboard({
            page: this,
            results: this.results,
            highscores: this.highscores
        }, () => { this.toLevels(true); });
    }

    async displayPhase(number, callback) {
        callback = callback || function () { };

        let phasecontainer = makeDiv(null, 'level-phase-container');
        let textcontainer = makeDiv(null, 'level-phase-text');
        let title = makeDiv(null, 'level-phase-title', 'Phase ' + number);
        let text;
        if (number === 1) { text = "Retrouvez la position de Lapinou en navigant sur la carte" }
        else { text = "Naviguez sur la carte et guidez Lapinou pour l'aider à rejoindre son ami" }
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

        this.basemap.recorder.off();
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
        // this.app.music.fadeOut(500, true);
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

export default Level;