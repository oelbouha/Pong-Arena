import Route from "../../router/route.js"
import SVGs from "../../components/svgs.js"
import API, { get_auth_stage } from "../../networking.js"
import { addEventListener, displayInputsErrors } from "../../utils/index.js"
import { get_validated_data, loading } from "./helpers.js"
import { navigate_to } from "../../router/utils.js"
import { routes } from "../../config.js"



class PasswordReset extends Route {

    constructor()
    {
        super()
        this.eventListeners = []
    }

    connectedCallback() {
        const sendEmailForm = this.shadowRoot.getElementById('sendEmailForm')
        const resetPasswordForm = this.shadowRoot.getElementById('resetPasswordForm')

        const sendEmailHandler = e => {
            e.preventDefault()
            e.stopPropagation()

            const data = get_validated_data(sendEmailForm)
            if (!data) return

            this.sendEmail(data)
        }

        const resetPasswordHandler = e => {
            e.preventDefault()
            e.stopPropagation()

            const data = get_validated_data(this.shadowRoot)
            if (!data) return

            ;(async () => {
                const res = await API.post(API.urls.reset_password, data)

                if (res.status == 200) {
                    // TODO: notify that password has been reset
                    navigate_to(routes.login)
                }
                else {
                    res.body.detail && alert(res.body.alert)
                    displayInputsErrors(this.shadowRoot, res.body)
                }
            })()
        }

        this.eventListeners.push(
            addEventListener(sendEmailForm, 'submit', sendEmailHandler),
            addEventListener(sendEmailForm, 'send', sendEmailHandler),
            addEventListener(resetPasswordForm, 'submit', resetPasswordHandler),
            addEventListener(resetPasswordForm, 'send', resetPasswordHandler)
        )
    }

    async sendEmail(data) {
        const res = await API.post(API.urls.send_reset_password_email, data)

        if (res.status == 200) {

        }
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

    shouldRedirect() {
        return get_auth_stage() != 'oauth-follow'
    }

    html() {
        return /*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    display: flex;
                    flex-direction: column;
                    width: 24rem;
                    max-width: 100%;
                }
            </style>
            <h1 class="mb-1">Reset Password</h1>
            <div id="content">
                <form id="sendEmailForm" class="column gap-0-5">
                    <p style="margin: 0;">
                    Enter your email here
                    </p>
                    <div class="flex gap-0-5">
                        <wc-input name="email" type="email" placeholder="Email" constraints="required | email" class="grow"></wc-input>
                        <button type="submit" style="height: 3rem; width: 3rem;" class="bg-silver hover-brighten pointer rounded-0-25  border-0 transition-med">
                            <svg height="100%" width="100%" viewBox="0 0 24 24" fill="none" style="display: grid;">
                                <path d="M20.7639 12H10.0556M3 8.00003H5.5M4 12H5.5M4.5 16H5.5M9.96153 12.4896L9.07002 15.4486C8.73252 16.5688 8.56376 17.1289 8.70734 17.4633C8.83199 17.7537 9.08656 17.9681 9.39391 18.0415C9.74792 18.1261 10.2711 17.8645 11.3175 17.3413L19.1378 13.4311C20.059 12.9705 20.5197 12.7402 20.6675 12.4285C20.7961 12.1573 20.7961 11.8427 20.6675 11.5715C20.5197 11.2598 20.059 11.0295 19.1378 10.5689L11.3068 6.65342C10.2633 6.13168 9.74156 5.87081 9.38789 5.95502C9.0808 6.02815 8.82627 6.24198 8.70128 6.53184C8.55731 6.86569 8.72427 7.42461 9.05819 8.54246L9.96261 11.5701C10.0137 11.7411 10.0392 11.8266 10.0493 11.9137C10.0583 11.991 10.0582 12.069 10.049 12.1463C10.0387 12.2334 10.013 12.3188 9.96153 12.4896Z" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>
                    </div>
                </form>
                <form id="resetPasswordForm" class="column gap-0-5 mt-0-5">
                    <p style="margin: 0;">
                    Enter your new password here
                    </p>
                    <wc-input 
                        name="password" 
                        type="password" 
                        placeholder="New Password" 
                        autocomplete="new password"
                        constraints=""
                    ></wc-input>
                    <p style="margin: 0;">
                        Enter the six-digit code sent to your email address.
                        Alternatively, if you have a static code available, please enter that instead.
                    </p>
                    <wc-input
                        name="code" 
                        type="text" 
                        placeholder="Enter Code"
                        autocomplete="off"
                        constraints="required | min:6 | max:8"
                    ></wc-input>
                    <button type="submit" class="action-btn">reset password</button>
                </form>
            </div>
        `
    }
}

customElements.define('wc-password-reset', PasswordReset)