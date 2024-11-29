import Component from "../../components/base.js";
import SVGs from "../../components/svgs.js";
import API from "../../networking.js"
import { addEventListener, countdownButton, notify } from "../../utils/index.js";
import { Notification } from "../Notifier.js";
import { get_validated_data } from "../auth/helpers.js";

const contentObserver = new ResizeObserver(function(entries) {
    entries.forEach(entry => {
        const target = entry.target
        const parent = target.parentElement
        parent.style.height = `${target.offsetHeight}px`;
    })
})


class Security extends Component
{
    get eventListeners() {
        if (!this._evs) this._evs = []
        return this._evs
    }
    set eventListeners(v) {
        this._evs = v
    }

    connectedCallback()
    {
        ;(async () => {
            const res = await API.get('/api/auth/me/')

            this.state = {
                authenticator: res.body.devices.totp,
                email: res.body.devices.email,
                static_codes: res.body.devices.static
            }
            
            const authenticator = this.shadowRoot.querySelector('security-authenticator')
            authenticator.setAttribute('active', this.state.authenticator?'true':'false')

            const email = this.shadowRoot.querySelector('security-email')
            email.setAttribute('active', this.state.email?'true':'false')
            
            const staticCodes = this.shadowRoot.querySelector('security-static-codes')
            staticCodes.setAttribute('active', this.state.static_codes?'true':'false')

            const passwordInputs = this.shadowRoot.getElementById('password_input')
            const submit = passwordInputs.querySelector('button')
            this.eventListeners.push(
                addEventListener(submit, 'click', () => {
                    const data = get_validated_data(passwordInputs)
                    if (!data) return
                    this.changePassword(data)
                })
            )

        })()
    }

    async changePassword(data) {
        if (!data.old_password) data.old_password = ""
        const res = await API.post(API.urls.change_password, data)
        const passwordInputs = this.shadowRoot.querySelectorAll('#password_input wc-input')
        if (res.ok) {
            notify(
                new Notification('Password Changed Successfully')
            )
            passwordInputs.forEach(inp => inp.setAttribute('value', ''))
        } else {
            if (res.body.old_password) passwordInputs[0].displayError(res.body.old_password)
            else if (res.body.new_password) passwordInputs[0].displayError(res.body.new_password)
            else notify(
                new Notification(res.body.detail)
            )
        }
    }

    get styles() {
        return /*css*/ `
            @import url("/themes.css");
            :host {
                min-width: min(100%, 30rem);
            }
            #password_input {
                position: relative;
                display: flex;
                flex-direction: column;
                
                align-self: center;
                width: 100%;
                padding: 1rem;
                border: 1px solid;
            }
            .inputs {
                max-width: min(100%, 25rem);
                width: 25rem;
                margin-left: auto;
                margin-right: auto;
            }
            .close {
                position: relative;
                background: transparent;
                border: none;
                padding: 1rem;
                display: grid;
                border-radius: 50%;
            }
        `
    }

    html() {
        const html = /*html*/`
            <style> ${ this.styles } </style>
            <div id="security" class="column gap-1">
                <div id="password_input" class="mt-1 border-glass rounded-1">
                    <div class="flex space-between align-center ps-1 pt-0-5">
                        <h2 class="color-light-5 fw-300">Change or Setup Password</h2>
                    </div>
                    <div class="inputs column gap-0-5 p-2 px-1">
                        <wc-input 
                            name="old_password" 
                            type="password" 
                            placeholder="Old Password"
                            data-input-class="bg-silver"
                            constraints="min:5"
                            autocomplete="current-password"
                        ></wc-input>
                        <wc-input 
                            name="new_password" 
                            type="password" 
                            placeholder="New Password"
                            data-input-class="bg-silver"
                            constraints="min:5"
                            autocomplete="new-password"
                        ></wc-input>
                        <button class="action-btn">save</button>
                    </div>
                </div>
                <div class="column gap-1">
                    <security-authenticator></security-authenticator>
                    <security-email></security-email>
                    <security-static-codes></security-static-codes>
                </div>
            </div>
        `
        return html
    }
}

class MFAOption extends Component
{
    static get observedAttributes() {
        return ['active']
    }
    get isLocked() { return this.locked_until > Date.now() }

    constructor() {
        super();
        this.eventListeners = []
        this.state = {
            expanded: false,
            active: this.getAttribute('active') == 'true'
        },
        this.elems = {
            activateElm: this.shadowRoot.querySelector('.activate'),
            deactivateElm: this.shadowRoot.querySelector('.deactivate'),
        }
    }
    

    connectedCallback() {
        const header = this.shadowRoot.querySelector('.header')
        const wrapper = this.shadowRoot.querySelector('.wrapper')
        const content = this.shadowRoot.querySelector('.content')

        content.classList.add('hidden')

        header.onclick = () => {
            if (this.getAttribute('active') == undefined) return
            this.state.expanded = !this.state.expanded
            if (!this.state.expanded) {
                content.classList.add('hidden')
                wrapper.style.height = `0px`
                contentObserver.unobserve(content)
            }
            else {
                this.onExpandedChange()
                content.classList.remove('hidden')
                this.shadowRoot
                    .querySelectorAll('wc-input')
                    .forEach(input => input.setAttribute('value', ''))
                wrapper.style.height = `${content.clientHeight}px`
                contentObserver.observe(content)
            }
        }
        this.shadowRoot
            .querySelectorAll('wc-input')
            .forEach(input => input.setAttribute('value', ''))
    }

    attributeChangedCallback(name, oVal, nVal) {
        if (!nVal) return
        this.state.active = nVal == 'true'
        this.change_state()
    }

    change_state() {
        const status = this.state.active
        const content = this.shadowRoot.querySelector('.content')
        const activeStatus = this.shadowRoot.querySelector('.active-status')
        const activeText = this.shadowRoot.querySelector('.active-text')

        activeStatus.replaceChildren()

        if (status) {
            activeStatus.classList.remove('inactive')
            activeStatus.classList.add('active')
            activeText.textContent = 'active'
            content.replaceChildren(this.elems.deactivateElm)
        } else {
            activeStatus.classList.remove('active')
            activeStatus.classList.add('inactive')
            activeText.textContent = 'inactive'
            content.replaceChildren(this.elems.activateElm)
        }

        this.register_form_events()
    }

    async send(data) {
        const res = await API.post( this.endpoint, data )
        if (res.status == 200)
            this.state.active = !this.state.active

        this.responseHandler(res)
    
        if (res.status == 200)
            this.change_state()

        else {
            if (res.body.locked_until) {
                this.locked_until = new Date(res.body.locked_until)
                const submit = this.shadowRoot.querySelector('form button[type="submit"]')
                countdownButton(submit, this.locked_until, `${submit.innerText} in {{counter}}`)
            }
            for (const key in res.body) {
                const input = this.shadowRoot.querySelector(`wc-input[name="${key}"]`)
                if (input) {
                    input.displayError(res.body[key])
                    delete res.body[key]
                }
            }
        }
    }

    register_form_events() {
        this.eventListeners.forEach(listener => listener.unregister() )

        const onsubmit = e => {
            e.preventDefault()
            if (this.isLocked) return
            let data = get_validated_data(this.shadowRoot)
            if (!data) return
            data.action = this.state.active?'deactivate':'activate'
            this.send(data)
        }

        const form = this.shadowRoot.querySelector(this.state.active?".deactivate form":".activate form")

        this.eventListeners.push(
            addEventListener(form, 'submit', onsubmit),
            addEventListener(form, 'send', onsubmit),
        )

    }
}

class Authenticator extends MFAOption
{
    get endpoint() { return API.urls.authenticator_endpoint }

    async onExpandedChange() {
        const status = this.state.active
        
        if (status) return

        const res = await API.get(API.urls.authenticator_endpoint)
        if (res.ok) {
            const img = document.createElement('img')
            img.src = res.body.qrcode
            this.elems.activateElm.prepend(img)
        }
    }

    responseHandler(res) {
        const status = this.state.active
        if (res.ok) this.onExpandedChange(status)
    }

    get styles() {
        return /*css*/ `
        @import url("/themes.css");

        :host {
            display: block;
            font-family: "Montserrat";
        }

        * {
            margin: 0;
            padding: 0;
        }

        .wrapper {
            position: relative;
            height: 0;
            max-width: 100%;
            overflow: hidden;
            transition: height .4s ease;
        }

        .content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
            transition: height .3s ease;
        }

        #authenticator .qr-code.center {
            justify-content: center;
            align-items: center;
        }

        #authenticator img {
            max-width: 12rem;
            background: white;
            border-radius: 1rem;
            min-width: 12rem;
        }

        .wrapper .content p {
            max-width: 30ch;
        }

        .active-status {
            border-radius: 50%;
            --size: 6px;
        }

        .active-status.active {
            width: var(--size);
            height: var(--size);
            background-color: #00b500;
        }

        .active-status.inactive {
            width: var(--size);
            height: var(--size);
            background-color: #ff2800;
        }

        .resend {
            background: none;
            color: silver;
            font-size: .9rem;
            padding: .25rem;
            opacity: .6;
            cursor: default;
            border: none;
        }
        `
    }
    html() {
        return /*html*/`
            <style> ${this.styles} </style>
            <div id="authenticator" class="card p-0 gap-0">
                <div class="header p-2 bg-dark-4 bg-opacity-50  hover-brighten transition-med pointer">
                    <h3 class="fw-400">Authenticator 2FA</h3>
                    <div class="flex space-between mt-1">
                        <span class="fw-300">status</span>
                        <div class="flex align-center gap-0-5 fw-500">
                            <div class="active-status flex">${ SVGs.loading({width: "1rem"}) }</div>
                            <span class="active-text lh-1">
                                <span class="fw-300 fs-0-75 color-light-6">loading...</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="wrapper">
                    <div class="content p-1">
                        <div class="activate flex align-center gap-2 justify-center wrap">
                            <form class="column gap-0-5">
                                <p>
                                    Scan the code and enter the app code to enable 2FA.
                                </p>
                                <wc-input type="text" name="code" placeholder="code"
                                    constraints="required | min:6 | max:6 | include:0-9"></wc-input>
                                <button type="submit" class="action-btn">activate</button>
                            </form>
                        </div>
                        <div class="deactivate flex align-center gap-1 justify-center">
                            <form class="column gap-0-5">
                                <p>
                                    Provide You password to <u>deactivate</u>
                                    <br>
                                    <small>* password can be empty</small>    
                                </p>
                                <wc-input type="password" name="password" placeholder="password" autocomplete="current-password"></wc-input>
                                <button type="submit" class="action-btn">deactivate</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}
customElements.define('security-authenticator', Authenticator)


class Email extends MFAOption
{
    get endpoint() { return API.urls.email_endpoint }
    
    onExpandedChange() {
        const sendEmail = async () => {
            const res = await API.post(this.endpoint, { action: 'resend' })
            if (res.status == 200) {
                content.replaceChildren(this.elems.activateElm)
                
                const resendBtn = this.shadowRoot.querySelector('.resend-btn')
                let sending = false
    
                const resendEmail = async () => {
                    const res = await sendEmail()
                    sending = false;
                    if (res.status != 200 && res.body.locked_until) {
                        const date = new Date(res.body.locked_until)
                        countdownButton(resendBtn, date, 'Resend Email in {{counter}}')
                    }
                }
    
                this.eventListeners.push(
                    addEventListener(resendBtn, 'click', () => {
                        if (sending) return
                        sending = true
                        resendEmail()
                    })
                )
            }

            return res
        }

        if (this.state.active) return  

        const content = this.shadowRoot.querySelector('.content')
        const div = document.createElement('div')
        div.innerText = 'Sending Email'
        div.className = 'text-center'
        content.replaceChildren(
            SVGs.make(
                SVGs.loading({
                    height: "8rem",
                    style: "padding: 3rem; width: 100%;"
                })
            )
        )
        content.appendChild(div)
        
        ;(async () => {
            const res = await sendEmail()
            if (res.status == 200) return

            if (res.body.locked_until) {
                const date = new Date(res.body.locked_until)
                countdownButton(div, date, 'Sending Email is locked for {{counter}}s')
                setTimeout(sendEmail, date - Date.now() + 100)
            }
        })()
    }

    responseHandler(res) {
        if (res.status == 200)
            this.onExpandedChange()
    }

    html() {
        return /*html*/`
        <style>
                @import url("/themes.css");

                :host {
                    display: block;
                    font-family: "Montserrat";
                }

                * {
                    margin: 0;
                    padding: 0;
                }

                .wrapper {
                    position: relative;
                    height: 0;
                    max-width: 100%;
                    overflow: hidden;
                    transition: height .4s ease;
                }

                .content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    max-width: 100%;
                    transition: height .3s ease;
                }

                .wrapper .content p {
                    max-width: 30ch;
                }

                .active-status {
                    border-radius: 50%;
                    --size: 6px;
                }

                .active-status.active {
                    width: var(--size);
                    height: var(--size);
                    background-color: #00b500;
                }

                .active-status.inactive {
                    width: var(--size);
                    height: var(--size);
                    background-color: #ff2800;
                }
            </style>
            <div id="email" class="card p-0 gap-0">
            <div class="header p-2 bg-dark-4 bg-opacity-50  hover-brighten transition-med pointer">
                <h3 class="fw-400">Email 2FA</h3>
                <div class="flex space-between mt-1">
                    <span class="fw-300">status</span>
                    <div class="flex align-center gap-0-5 fw-500">
                        <div class="active-status flex">${ SVGs.loading({width: "1rem"}) }</div>
                        <span class="active-text lh-1">
                            <span class="fw-300 fs-0-75 color-light-6">loading...</span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="wrapper">
                <div class="content p-1">
                    <div class="activate flex align-center gap-2 justify-center">
                        <form class="column gap-0-5">
                            <p>Enter the six-digit code sent to your email address.</p>
                            <wc-input type="text" name="code" placeholder="code" constraints="required | min:6 | max:6"></wc-input>
                            <button class="action-btn" type='submit'>activate</button>
                            <button class="resend-btn active mt-0" type="button">Resend Email</button>
                        </form>
                    </div>
                    <div class="deactivate flex align-center gap-1 justify-center">
                        <form class="column gap-0-5">
                            <p>
                                Provide You password to <u>deactivate</u>
                                <br>
                                <small>* password can be empty</small>
                            </p>
                            <wc-input type="password" name="password" placeholder="password" autocomplete="current-password"></wc-input>
                            <button class="action-btn" type='submit'>deactivate</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        `
    }
}
customElements.define('security-email', Email)


class StaticCodes extends MFAOption
{
    get endpoint() { return API.urls.static_codes_endpoint }
    
    async onExpandedChange() {
        const status = this.state.active
        if (!status) return

        const res = await API.get(this.endpoint)
        if (res.status == 200) {
            this.appendTokens(res.body.tokens)
        }

        const regenBtn = this.shadowRoot.querySelector('.regen')
        this.eventListeners.push(
            addEventListener(regenBtn, 'click', () => {
                const data = get_validated_data(this.shadowRoot)
                if (!data) return
                data.action = 'regenerate'

                ;(async () => {
                    const res = await API.post(this.endpoint, data)
                    if (res.status == 200)
                        this.appendTokens(res.body.tokens)
                    else {
                        if (res.body.locked_until) {
                            this.locked_until = new Date(res.body.locked_until)
                            countdownButton(regenBtn, this.locked_until, `${submit.innerText} in {{counter}}`)
                        }
                        for (const key in res.body) {
                            const input = this.shadowRoot.querySelector(`wc-input[name="${key}"]`)
                            if (input) {
                                input.displayError(res.body[key])
                                delete res.body[key]
                            }
                        }
                    }
                })()

            })
        )
    }

    responseHandler(res) {
        const status = this.state.active
        const success = res.status == 200

        if (success && status) 
            this.appendTokens(res.body.tokens)
    }

    appendTokens(tokens_arr) {
        let tokensDiv = this.elems.deactivateElm.querySelector('.tokens')
        if (tokensDiv) tokensDiv.remove()
        else {
            tokensDiv = document.createElement('div')
            tokensDiv.className = "tokens column rounded-2 border-1 border-dark-4 w-40ch"
            tokensDiv.innerHTML = /*html*/`
                <h3 class="text-center w-100 p-1 border-b0 border-dark-5">Available Codes</h3>
                <div class="flex gap-2 wrap justify-center p-1 px-2"></div>
            `
        }

        
        const svg = SVGs.make(
            SVGs.loading({
                width: "6rem",
                style: "padding:2rem;"
            })
        )
        this.elems.deactivateElm.prepend( svg )

        const tokens = tokens_arr.map(token => {
            const div = document.createElement('div')
            div.className = 'static_token'
            div.innerText = token
            return div
        })

        tokensDiv.children[1].replaceChildren(...tokens)
        setTimeout(() => svg.replaceWith(tokensDiv), 1500)
    }

    html() {
        return /*html*/`
            <style>
                @import url("/themes.css");

                :host {
                    display: block;
                    font-family: "Montserrat";
                }

                * {
                    margin: 0;
                    padding: 0;
                }

                .wrapper {
                    position: relative;
                    height: 0;
                    max-width: 100%;
                    overflow: hidden;
                    transition: height .4s ease;
                }

                .content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    max-width: 100%;
                    transition: height .3s ease;
                }
                .wrapper .content p {
                    max-width: 30ch;
                }

                .active-status {
                    border-radius: 50%;
                    --size: 6px;
                }

                .active-status.active {
                    width: var(--size);
                    height: var(--size);
                    background-color: #00b500;
                }

                .active-status.inactive {
                    width: var(--size);
                    height: var(--size);
                    background-color: #ff2800;
                }
            </style>
            <div id="static_codes" class="card p-0 gap-0">
                <div class="header p-2 bg-dark-4 bg-opacity-50  hover-brighten transition-med pointer">
                    <h3 class="fw-400">Static Codes 2FA</h3>
                    <div class="flex space-between mt-1">
                        <span class="fw-300">status</span>
                        <div class="flex align-center gap-0-5 fw-500">
                            <div class="active-status flex">${ SVGs.loading({width: "1rem"}) }</div>
                            <span class="active-text lh-1">
                                <span class="fw-300 fs-0-75 color-light-6">loading...</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="wrapper">
                    <div class="content p-1">
                        <div class="activate flex align-center gap-2 justify-center">
                            <form class="column gap-0-5">
                                <p>
                                    Provide You password to <u>activate</u>
                                    <br>
                                    <small>* password can be empty</small>
                                </p>
                                <wc-input type="password" name="password" placeholder="password" autocomplete="current-password"></wc-input>
                                <button class="action-btn" type="submit">activate</button>
                            </form>
                        </div>
                        <div class="deactivate column align-center gap-1 justify-center">
                            <form class="column gap-0-5">
                                <p>
                                    Provide You password to <u>deactivate</u>
                                    <br>
                                    <small>* password can be empty</small>
                                </p>
                                <wc-input type="password" name="password" placeholder="password" autocomplete="current-password"></wc-input>
                                <button class="action-btn" type="submit">deactivate</button>
                                <button class="regen action-btn bg-dark-5" type="button">regenerate</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}
customElements.define('security-static-codes', StaticCodes)


customElements.define('wc-security', Security)