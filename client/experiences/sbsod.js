import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, isOverflown, makeDiv, removeClass, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger, remap } from "../utils/math";

class SantaBarbara extends Page {
    /**
     * Constructor for the Santa Barbara experience.
     *
     * @param {Object} options - Object containing all the necessary options for the experience.
     * @param {function} callback - Callback function to be executed when the experience is finished.
     */
    constructor(options, callback) {
        super(options, callback);
        this.stage = this.options.stage;
        this.elements = this.options.elements;
        this.answers = this.options.answers ?? new Array(this.elements.content.length).fill(undefined);

        this.content = makeDiv(null, 'page-content pop');
        this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
        this.continue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        this.text = makeDiv(null, 'experience-text');
        if (this.stage === 'form') { addClass(this.text, 'pop'); }
        this.content.append(this.back, this.text, this.continue);
        this.container.append(this.content);

        // If this is the presentation stage
        if (this.stage === 'presentation') {
            // Fly to a random center
            let centers = this.app.options.interface.map.start.centers;
            let i = generateRandomInteger(0, centers.length - 1);
            this.basemap.fly({
                easing: easeInOutSine,
                center: centers[i],
                zoom: this.app.options.interface.map.start.zoom
            }, () => {
                // Create the presentation
                this.createPresentation();
            });
        }
        // If this is the form stage
        else if (this.stage === 'form') {
            addClass(this.text, 'sbsod');
            this.createForm();
        }
    }

    /**
     * Creates the presentation for the Santa Barbara experience.
     */
    createPresentation() {
        // Create the presentation DOM elements
        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', this.elements.title);
        presentation.append(title);

        this.elements.presentation.forEach(p => {
            presentation.append(makeDiv(null, 'experience-presentation-paragraph', p));
        });

        this.text.append(presentation);

        this.back.offsetWidth;
        this.text.offsetWidth;
        this.continue.offsetWidth;

        // Wait for the pop animation to finish
        addClass(this.text, 'pop');
        wait(300, () => {
            addClass(this.back, 'pop');
            addClass(this.continue, 'pop');

            // Listener for the back button
            this.back.addEventListener('click', () => {
                this.playButtonSound();
                //Wait for the window to be hidden
                removeClass(this.content, 'pop');
                wait(500, () => {
                    // Destroy the page
                    this.destroy();
                    // Fit the map to the levels page
                    this.basemap.fit(this.params.interface.map.levels, {
                        easing: easeInOutSine
                    }, () => {
                        this.app.page = new Levels({ app: this.app, position: 'current' });
                    });
                });
            }, { once: true });

            // Listener for the continue button
            this.continue.addEventListener('click', () => {
                this.playButtonSound();
                let o = this.options;
                // Go to the form page
                o.stage = 'form';
                o.position = 'next';
                o.answers = this.answers;
                // Reload the experience
                this.next = new SantaBarbara(o);
                this.slideNext();
            }, { once: true })
        });
    }

    /**
     * Creates the form page for the Santa Barbara experience
     * @param {object} options - Options for the form page
     * @returns {void}
     */
    createForm() {
        let questions = makeDiv(null, 'sbsod-questions no-scrollbar');
        this.scrollindicator = makeDiv(null, 'sbsod-scroll-indicator', '▼');
        this.text.append(questions, this.scrollindicator);

        // Loop through the questions
        let content = this.elements.content;
        for (let c = 0; c < content.length; c++) {
            let chosen = this.answers[c] !== undefined ? true : false;

            // Create the question
            const q = content[c];
            let element = makeDiv(null, 'sbsod-element');
            let question = makeDiv(null, 'sbsod-question', q);
            let answers = makeDiv(null, 'sbsod-answers');

            // Create the answers
            let choice = makeDiv(null, 'sbsod-choice');
            let points = makeDiv(null, 'sbsod-points');
            let numbers = makeDiv(null, 'sbsod-numbers');
            // Create a slider of 7 answers
            for (let i = 0; i < 7; i++) {
                let p = makeDiv(null, 'sbsod-point');
                let n = makeDiv(null, 'sbsod-number', i + 1);
                points.append(p);
                numbers.append(n);

                // Activate the chosen answer if it was answered
                if (chosen && i === this.answers[c]) {
                    addClass(n, 'active');
                }

                // Click listener for the answer
                p.addEventListener('click', () => {
                    this.playButtonSound();

                    // Select all answers
                    let pointList = numbers.childNodes;
                    // Deactivate all answers
                    pointList.forEach(child => { removeClass(child, 'active'); });
                    // Activate the selected answer
                    addClass(pointList[i], 'active');

                    // Calculate the percentage of the left position of the answer
                    let perc = remap(i, 0, 6, 0, 100);
                    const width = answers.getBoundingClientRect().width / 7;
                    // Move the slider to reach the selected answer
                    choice.style.left = `calc(${perc}% - ${perc * width / 100}px)`;

                    // Mark the answer as chosen
                    if (!chosen) {
                        chosen = true;
                        addClass(choice, 'pop');
                    }

                    // Update the current answer
                    this.answers[c] = {
                        time: new Date().toISOString(),
                        answer: i
                    }

                    // If all question was answered, activate the continue button
                    let end = this.answers.every(v => v !== undefined);
                    if (end) { addClass(this.continue, 'pop'); }
                    // If one or more question was not answered, deactivate the continue button (unless debug mode is enabled)
                    else {
                        if (!this.app.debug) {
                            removeClass(this.continue, 'pop');
                        }
                    }
                });
            }

            // Create the answer scale labels
            let scale = makeDiv(null, 'sbsod-scale');
            let ptd = makeDiv(null, 'sbsod-label', "Pas du tout d'accord");
            let tfd = makeDiv(null, 'sbsod-label', "Tout à fait d'accord");
            scale.append(ptd, tfd);

            answers.append(points, choice, numbers);
            element.append(question, answers, scale);
            questions.append(element);

            // If the answer has been answered
            if (chosen) {
                wait(this.app.options.interface.transition.page, () => {
                    // Animate the chosen answer
                    addClass(choice, 'pop');
                    let perc = remap(this.answers[c], 0, 6, 0, 100);
                    const width = answers.getBoundingClientRect().width / 7;
                    choice.style.left = `calc(${perc}% - ${perc * width / 100}px)`;
                });
            }
        };

        // Wait for the page to be ready
        wait(this.app.options.interface.transition.page, () => {
            this.start = Date.now();

            // If all question was answered, activate the continue button
            let end = this.answers.every(v => v !== undefined);
            if (end) { addClass(this.continue, 'pop'); }
            addClass(this.back, 'pop');

            // Create an observer that watches the questions container if it is resized
            this.observer = new ResizeObserver(() => {
                // If the questions container is overflown, display the scroll indicator
                if (isOverflown(questions)) {
                    addClass(this.scrollindicator, 'active');
                } else {
                    removeClass(this.scrollindicator, 'active');
                }

                // Resize every answer scale for each answered question
                for (let i = 0; i < this.answers.length; i++) {
                    const a = this.answers[i];
                    if (a !== undefined) {
                        let answers = questions.childNodes[i].querySelector('.sbsod-answers');
                        let choice = answers.querySelector('.sbsod-choice');
                        let perc = remap(a, 0, 6, 0, 100);
                        const width = answers.getBoundingClientRect().width / 7;
                        // Redefine the position of the answer slider to avoid weird behaviors
                        choice.style.left = `calc(${perc}% - ${perc * width / 100}px)`;
                    }
                }
            }).observe(this.container);

            // When clicking the scoll indicator, scroll by 100 px smoothly
            this.scrollindicator.addEventListener('click', () => {
                this.playButtonSound();
                questions.scrollBy({
                    top: 100,
                    behavior: 'smooth'
                });
            });

            // Add the listener for the back button
            this.back.addEventListener('click', () => {
                this.playButtonSound();
                // Unobserve the questions container size change
                if (this.observer) this.observer.unobserve(this.container);
                let o = this.options;
                // Go back to the presentation page
                o.stage = 'presentation';
                o.position = 'previous';
                o.answers = this.answers;
                // Reload the experience
                this.previous = new SantaBarbara(o);
                this.slidePrevious();
            }, { once: true });

            // Add the listener for the continue button
            this.continue.addEventListener('click', () => {
                this.playButtonSound();
                // Progress the game
                this.app.progress();
                removeClass(this.content, 'pop');

                this.end = Date.now();
                // Create the results object
                const results = {
                    session: this.params.session.index,
                    game: this.params.game,
                    start: new Date(this.start).toISOString(),
                    end: new Date(this.end).toISOString(),
                    duration: this.end - this.start,
                    answers: this.answers
                }

                // Number of tasks to clear before continuing
                const clearing = 2;
                // Current task cleared
                let cleared = 0;

                /**
                 * Execute after each task
                 */
                const pursue = () => {
                    // If all tasks were treated
                    if (++cleared >= clearing) {
                        // Destroy the experience
                        this.destroy();
                        // Animate the map to the levels page
                        this.basemap.fit(this.params.interface.map.levels, {
                            easing: easeInOutSine
                        }, () => {
                            // Create the levels page
                            this.app.page = new Levels({
                                app: this.app,
                                position: 'current',
                                update: true
                            });
                        });
                    }
                }

                // Send the results
                ajaxPost('sbsod', results, pursue, pursue);
                // Wait for the animation
                wait(500, pursue);
            }, { once: true });
        });
    }
}

export default SantaBarbara;