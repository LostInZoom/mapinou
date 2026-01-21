import Levels from "../pages/levels";
import Page from "../pages/page";
import { ajaxPost } from "../utils/ajax";
import { addClass, addClassList, clearElement, makeDiv, removeClass, removeClassList, wait } from "../utils/dom";
import { easeInOutSine, generateRandomInteger } from "../utils/math";

class Piaget extends Page {
    /**
     * Constructor for the Piaget experience.
     *
     * @param {Object} options - Object containing all the necessary options for the experience.
     * @param {function} callback - Callback function to be executed when the experience is finished.
     */
    constructor(options, callback) {
        super(options, callback);
        this.elements = this.options.elements;
        this.stage = this.options.stage;
        this.answers = {};
        this.answers = [];

        // Number of piaget tests
        this.testnumber = 5;

        // DOM elements
        this.content = makeDiv(null, 'page-content piaget pop');
        this.container.append(this.content);

        // If we currently are in the presentation stage
        if (this.stage === 'presentation') {
            // Fly to a random center
            let centers = this.app.options.interface.map.start.centers;
            let i = generateRandomInteger(0, centers.length - 1);
            this.basemap.fly({
                easing: easeInOutSine,
                center: centers[i],
                zoom: this.app.options.interface.map.start.zoom
            }, () => {
                // After the fly animation, create the presentation
                this.createPresentation();
            });
        }
        else {
            // If we are in the tutorial stage, create all DOM elements
            this.topcontent = makeDiv(null, 'experience-content piaget top pop');
            this.back = makeDiv(null, 'page-button page-button-back', 'Retour');
            this.toptext = makeDiv(null, 'experience-text top nobutton pop');
            this.topcontent.append(this.back, this.toptext);
            this.content.append(this.topcontent);

            let toplabel = makeDiv(null, 'piaget-tutorial', this.elements.top);
            this.topbottle = makeDiv(null, 'piaget-bottle reference', this.app.options.svgs.piaget);

            this.toptext.append(toplabel, this.topbottle);

            this.bottomcontent = makeDiv(null, 'experience-content piaget bottom pop');
            this.content.append(this.bottomcontent);

            // Store the start time
            this.start = Date.now();
            // Create the first bottom panel
            this.createBottomPanel(1);

            // Pop the bottom panel after the fly animation is done
            wait(this.app.options.interface.transition.page, () => {
                addClass(this.bottomtext, 'pop');
            });
        }
    }

    /**
     * Create the presentation for the Piaget experience.
     *
     * This function creates all the necessary DOM elements for the presentation of the experience and adds them to the page.
     * It also adds event listeners to the buttons and waits for the fly animation to finish before popping the bottom panel.
     */
    createPresentation() {
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

        addClass(text, 'pop');
        wait(300, () => {
            removeClass(text, 'nobutton');
            addClass(back, 'pop');
            addClass(pursue, 'pop');
            this.listen = true;

            // Add the listener for the back button
            back.addEventListener('click', () => {
                this.listen = false;
                // Play a sound on click
                this.playButtonSound();
                // If there are top and/or bottom content, unpop the element
                if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
                if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
                else { removeClass(this.content, 'pop'); }

                // Wait for the animation to finish
                wait(500, () => {
                    // Destroy the page
                    this.destroy();
                    // Animate the map then create the levels page
                    this.basemap.fit(this.params.interface.map.levels, {
                        easing: easeInOutSine
                    }, () => {
                        this.app.page = new Levels({ app: this.app, position: 'current', update: false });
                    });
                });
            }, { once: true });

            // Listener for the continue button
            pursue.addEventListener('click', () => {
                this.playButtonSound();
                this.listen = false;
                let o = this.options;
                // Set the stage to tutorial
                o.stage = 'tutorial';
                o.position = 'next';
                // Create the next page of the Piaget experience
                this.next = new Piaget(o);
                this.slideNext();
            }, { once: true });
        });
    }

    /**
     * Creates the bottom panel of the Piaget experience with the drawing task.
     * Adds event listeners to the buttons and waits for the fly animation to finish before popping the bottom panel.
     * @param {number} index The index of the current test
     */
    createBottomPanel(index) {
        let pursue = makeDiv(null, 'page-button page-button-continue', 'Continuer');
        this.bottomtext = makeDiv(null, 'experience-text bottom nobutton');

        // Pop the bottom window is index is greater than 1
        if (index > 1) { addClass(this.bottomtext, 'pop'); }

        this.bottomcontent.append(this.bottomtext, pursue);
        let bottomlabel = makeDiv(null, 'piaget-tutorial', this.elements.bottom);
        let bottombottle = makeDiv(null, 'piaget-bottle draw', this.app.options.svgs['piaget' + index]);
        let title = makeDiv(null, 'piaget-title', `${index}/${this.testnumber}`);
        this.bottomtext.append(title, bottomlabel, bottombottle);

        // Create the SVG container for the bottle the user will draw on
        let namespace = 'http://www.w3.org/2000/svg';
        let svgcontainer = makeDiv(null, 'piaget-svg-container');
        let svg = document.createElementNS(namespace, 'svg');
        svgcontainer.append(svg);
        bottombottle.append(svgcontainer);

        // Store the start time
        const questionstart = Date.now();

        // Pop the bottom panel if index is greater than 1
        if (index > 1) { addClass(this.bottomcontent, 'pop'); }

        // Set up the SVG parameters
        const vb = bottombottle.querySelector('svg').viewBox.baseVal;
        svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
        svg.setAttribute('width', '800');
        svg.setAttribute('height', '800');

        // Storages for lines and points displayed on the SVG
        let lines = [];
        let start = [];
        let end = [];

        /**
         * Destroys the lines and points displayed on the SVG by popping them off the arrays and removing them from the DOM.
         * Also resets the lines, start and end point arrays.
         */
        const destroyElements = () => {
            // If there are lines, pop them off the array and remove them from the DOM
            if (lines.length > 0) {
                let oldline = lines.pop();
                addClass(oldline, 'hide');
                wait(200, () => { oldline.remove(); })
            }
            // If there are start and/or end points, pop them off the array and remove them from the DOM
            if (start.length > 0) {
                let oldstart = start.pop();
                addClass(oldstart, 'hide');
                wait(200, () => { oldstart.remove(); })
            }
            if (end.length > 0) {
                let oldend = end.pop();
                addClass(oldend, 'hide');
                wait(200, () => { oldend.remove(); })
            }
            // Reset the storages
            lines = [];
            start = [];
            end = [];
        }

        /**
         * Creates a line and two points on the SVG, and adds them to the lines, start and end arrays.
         * The line and points are initially hidden, then revealed after a short delay.
         * @param {number} x - The x-coordinate of the line and points.
         * @param {number} y - The y-coordinate of the line and points.
         */
        const createElements = (x, y) => {
            // Create the line on the SVG
            let l = document.createElementNS(namespace, 'line');
            l.setAttribute('x1', x);
            l.setAttribute('y1', y);
            l.setAttribute('x2', x);
            l.setAttribute('y2', y);
            lines.push(l);
            // Create the start and end points
            let p1 = document.createElementNS(namespace, 'circle');
            p1.setAttribute('cx', x);
            p1.setAttribute('cy', y);
            start.push(p1);
            let p2 = document.createElementNS(namespace, 'circle');
            p2.setAttribute('cx', x);
            p2.setAttribute('cy', y);
            end.push(p2);
            // Keep the line and points hidden
            addClassList([p1, p2, l], 'hide');
            // Add the line and points to the SVG
            svg.append(l, p1, p2);
            svgcontainer.offsetHeight;
            // Display the line and points
            removeClassList([p1, p2, l], 'hide');
        }

        /**
         * Event listener when the user starts drawing the bottle.
         * @param {Event} e - The event that triggered the function
         */
        const down = (e) => {
            e.preventDefault();
            // Destroy the previous line and points
            destroyElements();
            // Remove user input listeners
            bottombottle.removeEventListener('touchstart', down);
            bottombottle.removeEventListener('mousedown', down);
            // Get the coordinates of the event in pixels
            const [x, y] = this.getRelativeCoordinates(bottombottle, e);
            // Create the line and points
            createElements(x, y);
            // Add listeners when drawing the line and when stopping
            bottombottle.addEventListener('touchmove', move);
            bottombottle.addEventListener('mousemove', move);
            bottombottle.addEventListener('touchend', up);
            bottombottle.addEventListener('mouseup', up);
        }

        /**
         * Event listener when the user is drawing the bottle.
         * @param {Event} e - The event that triggered the function
         */
        const move = (e) => {
            e.preventDefault();
            // Get the coordinates of the event in pixels
            const [x, y] = this.getRelativeCoordinates(bottombottle, e);
            // Update the line and points
            lines[0].setAttribute('x2', x);
            lines[0].setAttribute('y2', y);
            end[0].setAttribute('cx', x);
            end[0].setAttribute('cy', y);
        }

        /**
         * Event listener when the user stops drawing the bottle.
         * @param {Event} e - The event that triggered the function
         */
        const up = (e) => {
            e.preventDefault();
            // Remove move and mouse up/touch end listeners
            bottombottle.removeEventListener('touchmove', move);
            bottombottle.removeEventListener('mousemove', move);
            bottombottle.removeEventListener('touchend', up);
            bottombottle.removeEventListener('mouseup', up);

            // Calculate the length of the line
            const length = Math.hypot(lines[0].x2.baseVal.value - lines[0].x1.baseVal.value, lines[0].y2.baseVal.value - lines[0].y1.baseVal.value);
            // If the length is less than 10% of the width of the SVG, destroy the line and points
            if (length < 10 * vb.width / 100) {
                destroyElements();
                removeClass(pursue, 'pop');
                addClass(this.bottomtext, 'nobutton');
            } else {
                addClass(pursue, 'pop');
                removeClass(this.bottomtext, 'nobutton');

                // Calculate the angle of the line as the difference from the horizontal
                const [x1, y1] = [parseFloat(lines[0].getAttribute('x1')), parseFloat(lines[0].getAttribute('y1'))];
                const [x2, y2] = [parseFloat(lines[0].getAttribute('x2')), parseFloat(lines[0].getAttribute('y2'))];
                let angle = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
                if (angle > 180) angle = 360 - angle;
                if (angle > 90) angle = 180 - angle;

                // Create the answer object
                this.answer = {
                    // Stores the coordinates of the line
                    x1: x1, y1: y1, x2, x2, y2: y2,
                    difference: angle,
                    // Stores the height percentage of the average y of the start and end point of the line
                    heightPercentage: 100 - (((y1 * 100 / vb.height) + (y2 * 100 / vb.height)) / 2),
                    // Stores the time taken to answer
                    elapsed: Math.round(Date.now() - questionstart),
                    time: new Date().toISOString()
                };
            }

            // Add the event listener when the user starts drawing the bottle
            bottombottle.addEventListener('touchstart', down);
            bottombottle.addEventListener('mousedown', down);
        }

        // Initialize the answer object
        this.answer = {};
        // Add the event listener when the user starts drawing the bottle
        bottombottle.addEventListener('touchstart', down);
        bottombottle.addEventListener('mousedown', down);

        // Add the event listener when the user clicks the pursue button
        pursue.addEventListener('click', () => {
            this.playButtonSound();
            // Add the answer to the answers array
            this.answers.push(this.answer);

            // If the current test is the last one, finish the experience
            if (index >= this.testnumber) {
                // Progress the application to the next level
                this.app.progress();
                this.listen = false;
                // Hide the top and bottom panels
                if (this.topcontent) { removeClass(this.topcontent, 'pop'); }
                if (this.bottomcontent) { removeClass(this.bottomcontent, 'pop'); }
                else { removeClass(this.content, 'pop'); }

                // Define the number of tasks to clear
                const clearing = 2;
                // Current task
                let cleared = 0;

                /**
                 * Function to check if we reached the last task and continue
                 */
                const pursue = () => {
                    // If the last task is reached
                    if (++cleared >= clearing) {
                        // Destroy the current page
                        this.destroy();
                        // Fit the map to the levels page center
                        this.basemap.fit(this.params.interface.map.levels, {
                            easing: easeInOutSine
                        }, () => {
                            // Create the Levels page
                            this.app.page = new Levels({ app: this.app, position: 'current', update: true });
                        });
                    }
                }

                // Save the start time
                this.start = Date.now();
                // Save the end time
                this.end = Date.now();
                // Stores the results of the experience
                const results = {
                    session: this.params.session.index,
                    game: this.params.game,
                    start: new Date(this.start).toISOString(),
                    end: new Date(this.end).toISOString(),
                    duration: this.end - this.start,
                    answers: this.answers
                }

                // Post the results of the experience before continuing, task 1
                ajaxPost('piaget', results, pursue, pursue);
                // Task 2, just waiting for the animation
                wait(500, pursue);
            }
            // Here, the current test is not the last one
            else {
                // hide the bottom panel
                removeClass(this.bottomcontent, 'pop');
                wait(500, () => {
                    // Clear the bottom panel and create a new one
                    clearElement(this.bottomcontent);
                    this.createBottomPanel(++index);
                });
            }
        }, true);
    }

    /**
     * Transforms the coordinates of an event into the relative coordinates of a given container.
     * @param {HTMLElement} container - The container element to get the relative coordinates from.
     * @param {Event} event - The event to get the coordinates from.
     * @returns {Array<number>} - The relative coordinates [x, y] of the event in the container.
     */
    getRelativeCoordinates(container, event) {
        const touch = event.touches ? event.touches[0] : event;
        const rect = container.getBoundingClientRect();
        const xRel = touch.clientX - rect.left;
        const yRel = touch.clientY - rect.top;
        const vb = container.querySelector('svg').viewBox.baseVal;
        const x = xRel / rect.width * vb.width + vb.x;
        const y = yRel / rect.height * vb.height + vb.y;
        return [x, y];
    }
}

export default Piaget;