import Basemap from '../cartography/map';
import Rabbits from '../layers/rabbits';

import Page from "../pages/page";
import Levels from '../pages/levels';
import Score from "../cartography/score";
import Target from '../characters/target';

import { pointExtent, randomPointInCircle, within } from "../cartography/analysis";
import { addClass, easingIncrement, makeDiv, removeClass, wait } from "../utils/dom";
import { ajaxPost } from '../utils/ajax';
import { easeInOutSine, easeOutExpo } from '../utils/math';
import Hint from './hint';

class Level extends Page {
    constructor(options, callback) {
        super(options, callback);
        this.params = this.options.app.options;
        this.levels = this.options.levels;

        this.tier = this.options.tier;
        this.level = this.options.level;
        this.parameters = this.app.options.levels[this.tier].content[this.level];

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
            this.phase2(() => {
                wait(300, () => {
                    this.ending();
                });
            });
        });

        // this.phase2(() => {
        //     wait(300, () => {
        //         this.ending();
        //     });
        // });
    }

    phase1(callback) {
        callback = callback || function () { };
        this.phase = 1;

        this.score.pop();
        this.score.setState('default');
        this.score.start();

        this.basemap.enableInteractions();

        this.hint = new Hint({ level: this });

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
        this.basemap.addListener('click', selectionListener);

        this.listening = true;
    }

    phase2(callback) {
        callback = callback || function () { };

        this.score.pop();
        this.score.setState('default');
        this.score.start();

        this.phase = 2;
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

        this.basemap.player.spawn(() => {
            this.dataExtent = this.basemap.getExtentForData();
            this.basemap.fit(this.dataExtent, {
                easing: easeInOutSine,
                padding: { top: 100, bottom: 50, left: 50, right: 50 }
            }, () => {
                this.basemap.setMinZoom(this.basemap.getZoom());

                this.basemap.target.spawn(() => {
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
                });
            })
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
                                this.toLevels();
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

    toLevels() {
        this.basemap.unsetMinZoom();
        this.destroy();

        this.basemap.fit(this.params.interface.map.levels, {
            easing: easeInOutSine
        }, () => {
            this.app.page = new Levels({
                app: this.app,
                position: 'current',
                update: true
            });
        });
    }
}

export default Level;