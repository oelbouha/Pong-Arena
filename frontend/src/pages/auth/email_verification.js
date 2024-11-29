import Route from "../../router/route.js"
import { routes } from "../../config.js";
import { post, verify_account, urls, get_auth_stage, get_errors } from "../../networking.js"
import { navigate_to, redirect } from "../../router/utils.js";
import { addEventListener } from "../../utils/index.js"

const RESEND_INTERVAL = 5 * 1;
let can_resend = false

async function verify() {
    const data = this.getValidatedData()

    const verified = await verify_account(data)
    if (verified) {
        redirect(false)
        return
    }

    const errors = get_errors()
    const input = this.shadowRoot.querySelector('wc-input')
    input.displayError(errors.code)
}

async function resend_email() {
    if (! can_resend) return

    const res = await post(urls.resend_email)

    if (res.status == 200) return RESEND_INTERVAL
    if (res.status == 403 && res.body.cooldown) {
        const next = new Date(res.body.cooldown)
        return Math.ceil((next - Date.now()) / 1000)
    }
    return false
}

class EmailVerification extends Route {

    constructor()
    {
        super()
        this.eventListeners = []
    }

    connectedCallback()
    {
        if (get_auth_stage() != 'email-verification') {
            redirect()
            return
        }
        this.startTimer()

        const form = this.shadowRoot.querySelector('form')
        this.eventListeners.push(
            addEventListener(form, 'submit', e => {
                e.preventDefault()
                e.stopPropagation()
                verify.call(this)
            }) 
        )
        this.eventListeners.push(
            addEventListener(form, 'send', e => {
                e.stopPropagation()
                verify(this.getValidatedData())
            })
        )

        const resendBtn = this.shadowRoot.getElementById('resend')
        this.eventListeners.push(
            addEventListener(resendBtn, 'click', async () => {
                const cooldown = await resend_email()
                if (cooldown > 0) this.startTimer(cooldown)
                else navigate_to(routes.login)
            })
        )

    }
    disconnectedCallback()
    {
        this.eventListeners.forEach(listener => listener.unregister())
    }

    startTimer(cooldown = undefined) {
        can_resend = false;
        cooldown = cooldown || RESEND_INTERVAL
        
        const resendBtn = this.shadowRoot.getElementById('resend')
        resendBtn.innerHTML = 'resend email in <span id="time">04:53</span>'
        resendBtn.classList.remove('active')

        const timeClock = this.shadowRoot.getElementById('time')
        
        const t0 = Date.now()

        const updateClock = (time) => {
            const minutes = parseInt(time / 60)
            const seconds = (time % 60).toString().padStart(2, '0')
            const clock = minutes <= 0 ? seconds : `${minutes}:${seconds}`
            timeClock.innerText = clock
        }
        updateClock(cooldown)

        const intervalId = setInterval(() => {
            const remaining = parseInt(cooldown - (Date.now() - t0) / 1000)
            if (remaining <= 0) {
                resendBtn.innerHTML = 'resend email'
                resendBtn.classList.add('active')
                can_resend = true
                return clearInterval(intervalId)
            }
            updateClock(remaining)
        }, 200)
    }

    getValidatedData()
    {
        const input = this.shadowRoot.querySelector('wc-input')
        const err = !input.validate()
        if (err) return null

        return {
            code: input.value
        }
    }

    html() {
        return /*html*/`
            <style>        
                :host {
                    display: flex;
                    flex-direction: column;
                }

                #signupForm {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                button {
                    cursor: pointer;
                    font-family: Montserrat;
                    padding: .75rem;
                    font-size: 1.25rem;
                    border: 0;
                    border-radius: .25rem;
                    background: var(--accent-color);
                    color: black;
                    transition: filter .3s ease;
                }
                #signupForm button:hover {
                    filter: brightness(1.2);
                }
                #time_resend {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                #resend {
                    background: none;
                    color: silver;
                    font-size: .9rem;
                    margin-top: 1rem;
                    padding: .25rem;
                    opacity: .6;
                    cursor: default;
                }
                #resend.active {
                    opacity: 1;
                    cursor: pointer;
                }
                #resend.active:hover {
                    text-decoration: underline;
                    filter: brightness(1.2);
                }
                .error_msg {
                    display: none;
                    margin-top: .25rem;
                    color: #ff7373;
                    font-size: .8rem;
                }
                .column.error .error_msg {
                    display: initial;
                }
            </style>
            <h1>Verify Your Email</h1>
            <p>We have sent a code verification email to <strong>salmi19971@gmail.com</strong></p>
            <form id="signupForm">
                <wc-input 
                    id="code" 
                    name="code" 
                    type="text" 
                    placeholder="code" 
                    constraints="required | min:6 | max:10 | include:0-9"></wc-input>
                <button type="submit">verify</button>
            </form>
            <button id="resend">resend in <span id="time">04:53</span></button>
        `
    }
}

export default EmailVerification