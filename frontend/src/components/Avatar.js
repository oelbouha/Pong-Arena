import Component from "./base.js"

class Avatar extends Component {
    static get observedAttributes() {
        return ['data-image']
    }

    get state() {
        return {
            image: this.dataset.image
        }
    }
    render() {
        this.shadowRoot.querySelectorAll('img').forEach(img => {
            img.src = this.state.image
        })
    }

    attributeChangedCallback(name, oldV, newV) {
        this.render()
    }

    showActivity() {
        const overlay = this.shadowRoot.getElementById('overlay')
        overlay.classList.remove('hidden')
    }
    hideActivity() {
        const overlay = this.shadowRoot.getElementById('overlay')
        overlay.classList.add('hidden')
    }

    
    get styles() {
        let base = /*css*/ `
            @import url('/themes.css');
            :host {
                position: relative;
                aspect-ratio: 1 / 1;
                max-height: 100%;
                max-width: 100%;
                display: grid;
            }
            .user {
                position: relative;
                display: grid;
                border: none;
                padding: 4px;
                background: transparent;
                border-radius: 4px;
                width: 100%;
                aspect-ratio: 1;
                ${ this.dataset.noAnimation == undefined  && "cursor: pointer;" }
            }
            .user div {
                max-width: 100%;
                max-height: 100%;
                height: 100%;
                overflow: hidden;
                border-radius: 4px;
                display: grid;
            }
            .user img {
                position: relative;
                max-width: 100%;
                max-height: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 4px;
                transform-origin: center center;
                transition: all .4s ease-in-out;
                z-index: 2;
            }
            .user .avatar_blur {
                position: absolute;
                top: 0;
                left: 0;
                padding: 1px;
                box-sizing: border-box;
                filter: blur(2px) opacity(0.5);
                z-index: 1;
            }
            #overlay {
                position: absolute;
                top: 4px;
                left: 4px;
                width: calc(100% - 8px);
                height: calc(100% - 8px);
                background: rgba(0,0,0,.5);
                z-index: 2;
            }
            @keyframes ping {
                from {
                   background: rgba(0, 0, 0, 1);
                }
                to {
                    background: rgba(255, 255, 255, 1);
                }
            }
            #buble {
                position: absolute;
                top: 4px;
                right: 4px;
                height: 12px;
                width: 12px;
                background: var(--accent-color);
                border-radius: 50%;
                z-index: 22222;
                animation: ping .5s ease alternate infinite;
            }
        `
        const animation = /*css*/ `
            .user:hover img.avatar_main {
                transform: scale(1.3);
                filter: brightness(1.2);
            }
            .user:hover img.avatar_blur {
                transform: scale(1.2);
                filter: blur(2px) opacity(0.5) brightness(1.2);
            }
        `
        if (this.dataset.noAnimation == undefined)
            base += animation

        return base
    }

    html () {
        return /*html*/`
            <style>
                ${this.styles}
            </style>
            <button class="user">
                <div>
                    <img class="avatar_main" src="${this.state.image}">
                </div>
                <div class="avatar_blur">
                    <img src="${this.state.image}" >
                </div>
            </button>
            <div id="overlay" class="hidden"> <div id="buble"></div> </div>
        `
    }
}

export default Avatar