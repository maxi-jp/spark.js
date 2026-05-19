class HTMLMenu {
    constructor(game, menuContainerSelector, canvasContainerSelector, canvas, coverCanvas = false) {
        this.game = game;

        this.container = document.querySelector(menuContainerSelector);
        this.canvasContainer = document.querySelector(canvasContainerSelector);

        this.elements = [];
        this.buttons = [];
        this.canvas = canvas;
        this.coverCanvas = coverCanvas;
    }

    Start() {
        this.buttons = [];

        // setup the size
        if (this.coverCanvas) {
            this.container.setAttribute('style', `width: ${this.canvas.width}px; height: ${this.canvas.height}px;`);
            this.canvasContainer.setAttribute('style', `width: ${this.canvas.width}px; height: ${this.canvas.height}px;`);
        }
    }

    SetupElements(elementsSelectors) {
        elementsSelectors.forEach(selector => {
            this.elements[selector] = document.querySelector(selector);
        });
    }

    SetupButtons(buttonsSelectorsAndCallbacks) {
        this.buttons = buttonsSelectorsAndCallbacks.map(button =>
            document.querySelector(button.selector));

        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].addEventListener('click', buttonsSelectorsAndCallbacks[i].callback);
        }
    }

    SetContainerStyle(style) {
        this.container.setAttribute('style', style);
    }

    HideMenu(style = 'opacity: 0; pointer-events: none;') {
        this.container.setAttribute('style', style);
    }
}
