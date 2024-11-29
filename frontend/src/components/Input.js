import Component from "./base.js"
import SVGs from "./svgs.js"
import { validate } from "../utils/index.js"

const always_valid = () => true

class Input extends Component {
    static get observedAttributes() {
        return ['type', 'name', 'placeholder', 'required', 'autocomplete', 'value']
    }

    constructor() {
        super()
        this.displayError = this.displayError.bind(this)

        this.input = this.shadowRoot.firstElementChild
        const error = this.input.nextElementSibling
        const constraints = this.getAttribute('constraints')

        if (constraints && constraints.length) {
            const validate_ = () => {
                const errors = validate(this.input.value, constraints)
                if (errors.length) {
                    error.textContent = errors.toString()
                    error.classList.add('show')
                    this.input.classList.add('has_error')
                    return false
                }
                else {
                    error.classList.remove('show')
                    this.input.classList.remove('has_error')
                    return true
                }
            }
            this.validate = () => {
                const ret = validate_()

                this.validate = validate_

                this.input.oninput = () => {
                    this.value = this.input.value
                    this.validate()
                }
                return ret
            }
        }
        
        else this.validate = always_valid
    }
    
    connectedCallback()
    {
        const input = this.input
        input.oninput = () => {
            this.value = input.value 
        }
        input.onkeypress = e => {
            if (e.key != 'Enter') return
            this.dispatchEvent(new CustomEvent('send', { bubbles: true, composed: true }))
        }
        
        if (this.validate == always_valid)
            return

        input.onblur = () => {
            if (input.value.length == 0) return
            this.validate()
        }
    }

    displayError(message) {
        const error = this.shadowRoot.querySelector('.error')
        error.textContent = message
        error.classList.add('show')
        this.input.classList.add('has_error')
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.input.setAttribute(name, newValue)

        if (!this._is_password && name == 'type' && newValue == 'password') {
            this._is_password = true
            const wrapper = document.createElement('div')
            
            wrapper.innerHTML = `
                <div class='password'>
                    ${this.input.outerHTML}
                    <button>
                        ${ SVGs.password_eye() }
                    </button>
                </div>
            `
            this.input.replaceWith(wrapper.firstElementChild)
            this.input = this.shadowRoot.querySelector('input')
            this.input.nextElementSibling.onclick = () => {
                if (this.getAttribute('type') == 'password')
                    this.setAttribute('type', 'text')
                else this.setAttribute('type', 'password')
            }
        }
        else if (name == 'value')
            this.value = newValue
    }

    html() {
        const className = this.dataset.inputClass ?
                            `class="${this.dataset.inputClass}"`:''
        return /*html*/`
            <input ${ className } />
            <div class="error"></div>
            <style>
                @import url("/themes.css");
                :host {
                    display: flex;
                    flex-direction: column;
                }
                input {
                    padding: .75rem;
                    font-size: 1.25rem;
                    border: 0;
                    border-radius: .25rem;
                    background-color: #94b1b1;
                    font-family: "Montserrat";
                    transition: all .3s ease;
                }

                input:focus {
                    outline: 2px solid #f1f1e6a0;
                    outline-offset: 1px;
                }
                input.has_error {
                    background: #b19494;
                    outline: 2px solid #ff7373 !important;
                    outline-offset: 1px;
                }

                .password {
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .password button {
                    background: none;
                    border: none;
                    position: absolute;
                    top: 50%;
                    right: .5rem;
                    transform: translateY(-50%);
                    display: flex;
                    cursor: pointer;
                }

                input[type='password'] + button .closed {
                    display: none
                }
                input[type='text'] + button .opened {
                    display: none
                }

                .error {
                    display: none;
                    margin-top: .25rem;
                    color: #ff7373;
                    font-size: .8rem;
                    white-space: pre-wrap;
                }
                .error.show {
                    display: initial;
                }
            </style>
        `
    }
}

export default Input