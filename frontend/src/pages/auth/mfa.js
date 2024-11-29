import Component from "../../components/base.js";
import Route from "../../router/route.js"
import API from "../../networking.js"
import SVGs from "../../components/svgs.js";
import { get_auth_stage } from "../../networking.js"
import { redirect } from "../../router/utils.js";

import '../../router/URLlessRouter.js'
import { addEventListener, countdownButton } from "../../utils/index.js";
import { get_validated_data, loading } from "./helpers.js";


const verify = async (root, method, token) => {
    const data = get_validated_data(root.shadowRoot)
    if (!data || !data.code) return

    data.method = method

    const res = await loading(API.mfa_verify)(data, token)

    if (res.status == 200 || res.status == 401)
        redirect()
    else {
        if (res.body.locked_until) {
            const date = new Date(res.body.locked_until)
            root.lockSubmit(date)
            return
        }

        const errors = API.get_errors()
        for (const key in errors) {
            const input = root.shadowRoot.querySelector(`wc-input[name="${key}"]`)
            if (input) {
                input.displayError(errors[key])
                delete errors[key]
            }
        }

    }
}

let data = {}

class MultiFactorAuth extends Route {
    get methods() {
        if (this._methods)
            return this._methods

        return null
    }

    constructor()
    {
        super()
        this.eventListeners = []
    }

    connectedCallback()
    {
        if (!super.connectedCallback()) return

        data = this.shared.get('popup_data')
        if (data) {
            this._methods = data.methods
            this.render()
        }

        const mfaOptions = this.shadowRoot.querySelector('.mfa-options')
        this.eventListeners.push(
            addEventListener(mfaOptions, 'click', (e) => {
                const closestLink = e.target.closest('wc-silent-link')
                if (!closestLink || closestLink.getAttribute('disabled') != null) return

                const active = mfaOptions.querySelector('.active')
                active.classList.remove('active')
                closestLink.classList.add('active')
            })
        )
    }

    disconnectedCallback()
    {
        this.eventListeners.forEach(listener => listener.unregister())
    }

    shouldRedirect() {
        return get_auth_stage() != 'mfa'
    }

    html() {
        const methods = this.methods
        
        if (methods == null) return ''

        const authenticatorForm = /*html*/`
            <wc-route data-path="/mfa::authenticator" data-component="wc-mfa-authenticator" class="grow column">
            </wc-route>
        `
        const emailForm = /*html*/`
            <wc-route data-path="/mfa::email" data-component="wc-mfa-email" class="grow column">
            </wc-route>
        `
        const staticCodesForm = /*html*/`
            <wc-route data-path="/mfa::static" data-component="wc-mfa-static" class="grow column">
            </wc-route>
        `
        return /*html*/`
            <style>
                @import url('/themes.css');

                #mfaWrapper {
                    max-width: 100%;
                }
                hr {
                    width: 100%;
                    height: 1.5px;
                    background: linear-gradient(to right, transparent -40%, rgba(var(--dark-color-5-rgb), 1), transparent 100%);
                    border: none;
                    margin: 0;
                }
                p {
                    width: 40ch;
                    max-width: 100%;
                }
                .mfa-options wc-silent-link {
                    border: 0;
                    background: linear-gradient(to left, transparent, rgba(var(--dark-color-5-rgb), 0), transparent);
                    color: var(--text-light-2);
                    padding: 1rem 0rem;
                    font-size: 1rem;
                    transition: all .3s;
                }
                .mfa-options wc-silent-link[disabled] {
                    filter: brightness(0.5);
                    cursor: not-allowed;
                }
                .mfa-options wc-silent-link.available:hover {
                    color: var(--accent-color);
                }
                .mfa-options wc-silent-link.active {
                    text-decoration: underline;
                    text-underline-offset: 6px;
                    color: var(--accent-color);
                }

                wc-urlless-router {
                    align-self: start;
                }
            </style>

            <h2 class="mb-1">Multi-Factor Authentication</h2>
            <div id="mfaWrapper" class="column">
                <div class="mfa-options flex gap-2">
                    <wc-silent-link data-to="/mfa::authenticator" 
                        ${ methods.totp ? `class="active available"`: `disabled="" class="unavailable"` }
                    >
                        Authenticator
                    </wc-silent-link>
                    <wc-silent-link 
                        data-to="/mfa::email"
                        ${ methods.email?`class="${methods.totp?'':'active'} available"`: `disabled="" class="unavailable"` }
                    >
                        Email
                    </wc-silent-link>
                    <wc-silent-link 
                        data-to="/mfa::static" 
                        ${ methods.static?`class="${methods.totp || methods.email?'':'active'}available"`: `disabled="" class="unavailable"` } 
                    >
                        Static Codes
                    </wc-silent-link>
                </div>
                <wc-urlless-router data-root="">
                    ${ methods.totp?authenticatorForm:'' }
                    ${ methods.email?emailForm:'' }
                    ${ methods.static?staticCodesForm:'' }
                </wc-urlless-router>
            </div>
        `
    }
}

class MFAMethod extends Component {
    get isLocked() {
        return this.locked_until > Date.now()
    }
    constructor() {
        super()
        this.eventListeners = []
        this.locked_until = null
    }
    lockSubmit(date) {
        this.locked_until = date

        const submitBtn = this.shadowRoot.querySelector('form button[type="submit"]')
        const counter = submitBtn.querySelector('.counter')
        submitBtn.classList.add('inactive')

        const updateClock = (time) => {
            const minutes = parseInt(time / 60)
            const seconds = (time % 60).toString().padStart(2, '0')
            const clock = minutes <= 0 ? seconds : `${minutes}:${seconds}`
            counter.innerText = `in ${clock}`
        }
        const intervalId = setInterval(() => {
            const remaining = parseInt((this.locked_until - Date.now()) / 1000)
            if (remaining <= 0) {
                counter.innerText = ''
                submitBtn.classList.remove('inactive')
                return clearInterval(intervalId)
            }
            updateClock(remaining)
        }, 200)
    }

    connectedCallback() {
        const form = this.shadowRoot.querySelector('form')
        const submitHandler = e => {
            e.preventDefault()
            if (!this.isLocked) verify(this, this.method, data.token)
        }
        this.eventListeners.push(
            addEventListener(form, 'submit', submitHandler),
            addEventListener(form, 'send', submitHandler)
        )
    }
}

class Authenticator extends MFAMethod {
    get method() { return 'totp' }
    html() {
        return /*html*/`
            <link rel="stylesheet" href="/themes.css"></link>
            <form id="authenticatorForm" class="column gap-0-5 w-40ch">
                <p>
                    Enter the code from your authenticator app.
                </p>
                <wc-input
                    name="code" 
                    type="text" 
                    placeholder="code" 
                    constraints="required | min:6 | max:10 | include:0-9"></wc-input>
                <button class="action-btn" type="submit">
                    verify <span class="counter"></span>
                </button>
            </form>
    `
    }
}
customElements.define('wc-mfa-authenticator', Authenticator)


class Email extends MFAMethod {
    get method() { return 'email' }

    get isResendLocked() {
        return this.resend_locked_until > Date.now()
    }

    connectedCallback() {
        super.connectedCallback()
        this.resend_locked_until = null
        
        const resendBtn = this.shadowRoot.querySelector('.resend-btn')
        resendBtn.replaceChildren(SVGs.make(SVGs.loading({width: '1.25rem'})))

        const resendEmail = async () => {
            if (this.isResendLocked) return
            const res = await API.post(API.urls.email_resend_endpoint)
            if (res.status == 200) {
                resendBtn.innerText = 'resend email'
                resendBtn.classList.remove('inactive')
                resendBtn.classList.add('active')
            }
            else if (res.body.locked_until) {
                this.resend_locked_until = new Date(res.body.locked_until)
                countdownButton(resendBtn, this.resend_locked_until, 'resend email in {{counter}}')
            }
            return res
        }

        this.eventListeners.push(
            addEventListener(resendBtn, 'click', resendEmail)
        )

        resendEmail()
    }

    html() {
        return /*html*/`
            <link rel="stylesheet" href="/themes.css"></link>
            <form id="signupForm" class="column gap-0-5 w-40ch">
                <p>
                    Enter the six-digit code sent to your email address.
                </p>
                <wc-input 
                    id="code" 
                    name="code" 
                    type="text" 
                    placeholder="code"
                    autocomplete="off"
                    constraints="required | min:6 | max:10 | include:0-9"></wc-input>
                <button class="action-btn" type="submit">verify <span class="counter"></span></button>
                <button class="resend-btn mt-0" type="button"></button>
            </form>
    `
    }
}
customElements.define('wc-mfa-email', Email)


class Static extends MFAMethod {
    get method() { return 'static' }
    html() {
        return /*html*/`
            <link rel="stylesheet" href="/themes.css"></link>
            <form id="staticCodesForm" class="column gap-0-5 w-40ch">
                <p>
                    Enter any of the generated static codes.
                    <br>
                    <small>* A static code is valid for one-time use only.</small>
                </p>
                <wc-input 
                    id="code" 
                    name="code" 
                    type="text" 
                    placeholder="code" 
                    constraints="required | min:8 | max:8"></wc-input>
                <button class="action-btn" type="submit">verify  <span class="counter"></span></button>
            </form>
        `
    }
}
customElements.define('wc-mfa-static', Static)



export default MultiFactorAuth