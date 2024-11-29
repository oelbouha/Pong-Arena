import { Link } from "../router/index.js"
import Component from "./base.js"

export class SvgButtonLink extends Link {
    html() {
       return /*html*/`
            <style>
                @import url("/themes.css");
                :host {
                    position: relative;
                    display: grid;
                    padding: 1px;
                    border-radius: 4px;
                    background: conic-gradient(from 45deg, var(--dark-color-3), var(--dark-color-5), var(--dark-color-3), var(--dark-color-5), var(--dark-color-3));
                    animation: spin 2s linear infinite;
                    aspect-ratio: 1 / 1;
                    box-sizing: border-box;
                    animation: bg-spin 3s linear infinite alternate;
                }
                button {
                    position: relative;
                    display: grid;
                    border: none;
                    background: transparent;
                    border-radius: 3px;
                    justify-content: center;
                    align-items: center;
                    aspect-ratio: 1 / 1;
                    background: var(--dark-color-3);
                    cursor: pointer;
                }
                svg {
                    fill: ${this.dataset.fill || "silver"};
                }
                @keyframes bg-spin {
                    to {
                      --border-angle: 1turn;
                    }
                }
            </style>
            <button>
                <slot></slot>
            </button>
        `
    }
}

export class SvgButton extends Component {
    html() {
       return /*html*/`
            <style>
                @import url("/themes.css");
                :host {
                    position: relative;
                    display: grid;
                    padding: 1px;
                    border-radius: 4px;
                    background: conic-gradient(from 45deg, var(--dark-color-3), var(--dark-color-5), var(--dark-color-3), var(--dark-color-5), var(--dark-color-3));
                    animation: spin 2s linear infinite;
                    aspect-ratio: 1 / 1;
                    box-sizing: border-box;
                }
                button {
                    position: relative;
                    display: grid;
                    border: none;
                    background: transparent;
                    border-radius: 3px;
                    justify-content: center;
                    align-items: center;
                    aspect-ratio: 1 / 1;
                    background: var(--dark-color-3);
                    cursor: pointer;
                }
                svg {
                    fill: ${this.dataset.fill || "silver"};
                }
            </style>
            <button>
                <slot></slot>
            </button>
        `
    }
}

class Button extends Link {
    html() {
       return /*html*/`
            <style>
                @import url("/themes.css");
                :host {
                    position: relative;
                    display: grid;
                    justify-content: center;
                    align-items: center;
                    padding: 1px;
                    border-radius: 4px;
                    background: conic-gradient(from 45deg, var(--dark-color-3), var(--dark-color-5), var(--dark-color-3), var(--dark-color-5), var(--dark-color-3));
                    animation: spin 2s linear infinite;
                    box-sizing: border-box;
                    cursor: pointer;
                }
                div {
                    position: relative;
                    display: grid;
                    border: none;
                    background: transparent;
                    border-radius: 3px;
                    justify-content: center;
                    align-items: center;
                    background: var(--dark-color-3);
                    padding: ${this.getAttribute('padding') || '.5rem 1rem'}
                }
            </style>
            <div>
                <slot></slot>
            </div>
        `
    }
}
customElements.define('wc-button', Button)

export default SvgButtonLink