import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, hasClass, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";

class Purdue extends Page {
    /**
     * Constructor for the Purdue experience.
     *
     * @param {Object} options - Object containing all the necessary options for the experience.
     * @param {function} callback - Callback function to be executed when the experience is finished.
     */
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = this.options.answers ?? [];
        this.index = this.options.index ?? 0;
        this.listen = false;

        this.answer = undefined;

        this.content = makeDiv(null, 'page-content pop');
        this.container.append(this.content);

        // If we are in the presentation stage
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
        // If we are in the results stage, create results
        else if (this.stage === 'results') {
            this.createResults();
        }
        // Otherwise, create the test
        else {
            // Set the start time if not set
            if (this.options.start === undefined) { this.options.start = Date.now(); }
            this.createTest();
        }
    }

    /**
     * Creates the presentation for the Purdue experience.
     */
    createPresentation() {
        // Create the DOM elements
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        let text = makeDiv(null, 'experience-text nobutton');
        this.content.append(back, text, pursue);
        this.content.offsetWidth;

        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', this.elements.title);
        presentation.append(title);
        this.elements.presentation.forEach(t => {
            presentation.append(makeDiv(null, 'experience-presentation-paragraph', t));
        });
        text.append(presentation);

        // Wait for the popping of the window
        addClass(text, 'pop');
        wait(300, () => {
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            removeClass(text, 'nobutton');
            this.listen = true;

            // Listener for the back button to go back to the level page
            back.addEventListener('click', () => {
                this.playButtonSound();
                this.toLevels(false);
            }, { once: true });

            // Listener for the continue button
            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;
                let o = this.options;
                // Next stage is tutorial
                o.stage = 'tutorial';
                o.position = 'next';
                o.answers = this.answers;
                // Reload the experience
                this.next = new Purdue(o);
                this.slideNext();
            }, { once: true });
        });
    }

    /**
     * Creates the results page.
     */
    createResults() {
        // Stores the end time
        this.end = Date.now();
        // Construct the results to be sent to the server
        const results = {
            session: this.params.session.index,
            game: this.params.game,
            start: new Date(this.options.start).toISOString(),
            end: new Date(this.end).toISOString(),
            duration: this.end - this.options.start,
            answers: this.answers
        }

        // Create the DOM elements
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        let text = makeDiv(null, 'experience-text nobutton pop');
        this.content.append(text, pursue);
        this.content.offsetWidth;

        let presentation = makeDiv(null, 'experience-presentation');
        let title = makeDiv(null, 'experience-presentation-paragraph experience-presentation-title', 'Résultats');
        presentation.append(title);
        text.append(presentation);

        // Create a table that will display the results
        const container = makeDiv(null, 'purdue-results no-scrollbar');
        const table = document.createElement('table');
        addClass(table, 'purdue-metrics-container');

        const first = document.createElement('tr');
        addClass(first, 'purdue-type');
        const test = document.createElement('td');
        test.textContent = 'Test';
        const you = document.createElement('td');
        you.textContent = 'Vous';
        const all = document.createElement('td');
        all.textContent = 'Taux de bonnes réponses';
        first.append(test, you, all);
        table.append(first);

        // Loop through the user's answers
        this.answers.forEach((a, i) => {
            // Create a table entry for each answer
            const l = document.createElement('tr');
            const t = document.createElement('td');
            t.textContent = i + 1;

            // Display an icon indicating if the answer is correct or wrong
            const y = document.createElement('td');
            const svg = makeDiv(null, 'purdue-answer-svg', a.correct ? this.params.svgs.check : this.params.svgs.cross);
            addClass(svg, a.correct ? 'correct' : 'wrong');
            y.append(svg);

            // Create a bar that indicates the global percentage of correct answers
            const g = document.createElement('td');
            const cont = makeDiv(null, 'purdue-percentage-container');
            const value = makeDiv(null, 'purdue-percentage-filler');
            const label = makeDiv(null, 'purdue-percentage-label');
            cont.append(value, label);
            g.append(cont);
            l.append(t, y, g);
            table.append(l);
        });

        container.append(table);
        text.append(container);

        // Storage for the global results
        let percentages = [];

        // Tasks to execute before continuing
        const tasks = [
            // Post the results and get the global statistics
            cb => ajaxPost('purdue', results, r => { percentages = r.percentages; cb(); }),
            // Wait for the popping of the window
            cb => {
                wait(this.params.interface.transition.page, () => {
                    addClass(pursue, 'pop');
                    removeClass(text, 'nobutton');
                    addClass(text, 'noback');
                    cb();
                });
            }
        ]

        // The number of tasks to execute
        const clearing = tasks.length;
        // Current executed tasks
        let cleared = 0;

        /**
         * Function to fill the global percentage bars of correct answers
         */
        const fillPerc = () => {
            // If all tasks have been executed
            if (++cleared >= clearing) {
                // For each test
                percentages.forEach((p, i) => {
                    // Fill the bar
                    const perc = table.children[i + 1].lastElementChild.firstElementChild;
                    perc.firstElementChild.style.width = `${p}%`;
                    perc.lastElementChild.innerHTML = `${Math.round(p)}%`;
                });

                this.listen = true;
                // Display the continue button
                pursue.addEventListener('click', () => {
                    this.playButtonSound();
                    this.toLevels(true);
                }, { once: true });
            }
        }

        // Execute each task
        tasks.forEach(t => t(fillPerc));
    }

    /**
     * Creates a test interface for the Purdue experience.
     */
    createTest() {
        this.listen = false;
        let back = makeDiv(null, 'page-button page-button-back', 'Retour');
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');

        // Create the DOM elements
        let text = makeDiv(null, 'experience-text purdue pop noback nocontinue');
        this.content.append(back, text, pursue);
        this.content.offsetWidth;

        let testcontainer = makeDiv(null, 'purdue-test-container');

        // If it's the tutorial, display tutorial in the title
        if (this.stage === 'tutorial') {
            let title = makeDiv(null, 'purdue-title', 'Tutorial');
            let t1 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text1);
            testcontainer.append(title, t1);
        }
        // If it's a regular test, display the current test number
        else {
            let title = makeDiv(null, 'purdue-title', `Test ${this.index}/${this.elements.tests.length}`);
            testcontainer.append(title);
        }

        let examplescontainer = makeDiv(null, 'purdue-vector-container examples');

        // The example SVG
        let svg1 = this.app.options.svgs[`purdue${this.index}e0`];
        let example1 = makeDiv(null, 'purdue-vector example', svg1);
        // The rotation text
        let rotationto1 = makeDiv(null, 'purdue-label', 'pivote<br>et<br>devient');
        // The rotated SVG
        let svg2 = this.app.options.svgs[`purdue${this.index}e1`];
        let example2 = makeDiv(null, 'purdue-vector example answer', svg2);

        examplescontainer.append(example1, rotationto1, example2);
        testcontainer.append(examplescontainer);

        // If it's the tutorial, add a helping text
        if (this.stage === 'tutorial') {
            let t2 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text2);
            testcontainer.append(t2);
        }

        // The model SVG
        let modelscontainer = makeDiv(null, 'purdue-vector-container models');
        let model = makeDiv(null, 'purdue-vector model', this.app.options.svgs[`purdue${this.index}m`]);

        // If it's a regular test, display the rotation label
        if (this.stage === 'test') {
            let label = makeDiv(null, 'purdue-label', 'comme');
            let rotationto2 = makeDiv(null, 'purdue-label', 'pivote<br>et<br>devient');
            modelscontainer.append(label, model, rotationto2);
        } else {
            modelscontainer.append(model);
        }

        testcontainer.append(modelscontainer);

        // If it's the tutorial, add a helping text
        if (this.stage === 'tutorial') {
            let t3 = makeDiv(null, 'purdue-test-text', this.elements.tutorial.text3);
            testcontainer.append(t3);
        }

        // Containers for the answers (2 columns * 2 rows)
        let answers1 = makeDiv(null, 'purdue-vector-container answers');
        let answers2 = makeDiv(null, 'purdue-vector-container answers');
        let answers = [];

        /**
         * Event listener when click on an answer.
         * @param {Event} e - The event triggered by the button click
         */
        const answering = (e) => {
            // Make sure we are listening
            if (this.listen) {
                this.playButtonSound();

                // Retrieve the value
                const t = e.target;
                const value = parseInt(t.getAttribute('value'));

                // If the answer is already active, deactivate it
                if (hasClass(t, 'active')) {
                    removeClass(t, 'active');
                    removeClass(pursue, 'pop');
                    addClass(text, 'nocontinue');
                    this.answer = undefined;
                }
                // Else, activate it
                else {
                    // Deactivate all other answers
                    removeClassList(answers, 'active');
                    addClass(t, 'active');
                    const end = Date.now();
                    // Store the answer
                    this.answer = {
                        value: value,
                        // Check if the answer is correct
                        correct: this.elements.tests[this.index - 1] === value ? true : false,
                        time: new Date(end).toISOString(),
                        elapsed: Math.round(end - this.questionstart)
                    };

                    // If it's a tutorial, allows to continue only if the answer is correct
                    if (this.stage === 'tutorial') {
                        if (value === this.elements.tutorial.solution) {
                            addClass(pursue, 'pop');
                            removeClass(text, 'nocontinue');
                        } else {
                            removeClass(pursue, 'pop');
                            addClass(text, 'nocontinue');
                        }
                    }
                    // Pop the continue button whatever the answer
                    else {
                        addClass(pursue, 'pop');
                        removeClass(text, 'nocontinue');
                    }
                }
            }
        };

        // Create the first row of answers
        for (let i = 0; i < 2; i++) {
            // Get the correct SVG
            let svg = this.app.options.svgs[`purdue${this.index}a${i}`];
            let answer = makeDiv(null, 'purdue-vector answer', svg);
            answer.setAttribute('value', i);
            // Add the event listener
            answer.addEventListener('click', answering);
            answers.push(answer);
            answers1.append(answer);
        }

        // Create the second row of answers
        for (let i = 2; i < 4; i++) {
            // Get the correct SVG
            let svg = this.app.options.svgs[`purdue${this.index}a${i}`];
            let answer = makeDiv(null, 'purdue-vector answer', svg);
            answer.setAttribute('value', i);
            // Add the event listener
            answer.addEventListener('click', answering);
            answers.push(answer);
            answers2.append(answer);
        }

        testcontainer.append(answers1, answers2);
        text.append(testcontainer);

        // Wait for the transition
        wait(this.app.options.interface.transition.page, () => {
            this.questionstart = Date.now();
            this.listen = true;

            // If it's not a test, activate the back button
            if (this.stage !== 'test') {
                addClass(back, 'pop');
                removeClass(text, 'noback');

                const backListener = () => {
                    this.playButtonSound();
                    back.removeEventListener('click', backListener);
                    this.listen = false;
                    let o = this.options;
                    // Go back to the presentation page
                    o.stage = 'presentation';
                    o.position = 'previous';
                    o.answers = this.answers;
                    this.previous = new Purdue(o);
                    this.slidePrevious();
                }
                back.addEventListener('click', backListener);
            }

            // Listener for the continue button
            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;

                // If it's a test, stores the answer
                if (this.stage === 'test') {
                    this.answers.push(this.answer);
                }

                // If it's the last test, go to the results
                if (this.index >= this.elements.tests.length) {
                    // Progress the application
                    this.app.progress();
                    this.index = undefined;
                    let o = this.options;
                    // Go to the results page of the experience
                    o.stage = 'results';
                    o.position = 'next';
                    o.answers = this.answers;
                    // Reload the experience
                    this.next = new Purdue(o);
                    this.slideNext();
                } else {
                    // Here, we continue to the next test
                    let o = this.options;
                    o.stage = 'test';
                    o.position = 'next';
                    o.index = ++this.index;
                    o.answers = this.answers;
                    this.next = new Purdue(o);
                    this.slideNext();
                }
            }, { once: true });
        });
    }

    /**
     * Destroy the current page and navigate to the levels page.
     * @param {Function} update - The update function passed to the Levels page.
     */
    toLevels(update) {
        this.listen = false;
        this.index = undefined;
        // Hide top and bottom window
        if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
        if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
        else { removeClass(this.content, 'pop'); }

        // Wait for the page to be hidden
        wait(300, () => {
            // Destroy the page
            this.destroy();
            // Fit the map to the levels page
            this.basemap.fit(this.params.interface.map.levels, {
                easing: easeInOutSine
            }, () => {
                this.app.page = new Levels({ app: this.app, position: 'current', update: update });
            });
        });
    }
}

export default Purdue;