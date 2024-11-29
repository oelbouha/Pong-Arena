import Component from "./base.js";
import { addEventListener, notify } from "../utils/index.js";
import { logout } from "../networking.js";
import { redirect } from "../router/utils.js";
import DATA from "../store.js";
import { Notification } from "../pages/Notifier.js";

class UserModal extends Component
{
    connectedCallback() {
        if (!this.eventListeners) this.eventListeners = []
        
        const actions = this.shadowRoot.getElementById('actions')
        const logoutBtn = this.shadowRoot.getElementById('logoutBtn')
        const hideOverlay = () => {
            const evt = new CustomEvent('remove:overlay', { composed: true, bubbles: true, cancelable: true})
            this.dispatchEvent(evt)
        }
        this.eventListeners.push(
            addEventListener(actions, 'link:click', () => {
                this.classList.add(this.dataset.hideClass)
                hideOverlay()
            }),
            addEventListener(logoutBtn, 'click', async () => {
                const logged_out = await logout()
                if (logged_out) redirect(false)
                else notify(new Notification('Error Occured'))
                hideOverlay()
            }),
            {
                unregister: DATA.observe('auth_user', (old, user) => {
                    if (old) {
                        const avatar = this.shadowRoot.getElementById('meAvatar')
                        if (avatar) avatar.setAttribute('data-image', user.profile_image)
                        const profileLink = this.shadowRoot.getElementById('profileLink')
                        if (profileLink) profileLink.setAttribute('data-to', `/users/${user.username}/`)
                    }
                })
            }
        )

        
    }

    html() {
        const me = DATA.get('auth_user')

        return /*html*/`            
            <style>
                @import url('/themes.css');
                :host {
                    display: flex;
                    position: absolute;
                    left: calc(100% + 12px);
                    top: 0;

                    font-family: "Montserrat";
                    background: conic-gradient(from 45deg, var(--dark-color-3), var(--dark-color-5), var(--dark-color-3), var(--dark-color-5), var(--dark-color-3));
                    border-radius: 8px;
                    padding: 1px;
                    z-index: 3;
                }
                wc-link svg, button svg {
                    --color: var(--text-light-2);
                }
            </style>
            <div class="bg-dark-3 rounded-0-5 p-1">
                <div id="user" class="flex align-center gap-1">
                    <wc-avatar
                        id="meAvatar"
                        class="block h-6r"
                        data-no-animation 
                        data-image="${me.profile_image}"
                    ></wc-avatar>
                    <h2 class="fw-400 color-light-1">${me.first_name} ${me.last_name}</h2>
                </div>
                <div id="actions" class="column gap-0-5 mt-1">
                    <wc-link id="profileLink" class="flex align-center gap-1 fs-1-25 bg-dark-4 rounded-0-25 transition-med color-light-1 p-0-5 hover-brighten" data-to="/users/${me.username}/">
                        <svg width="32px"viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="6" r="4" stroke="var(--color)" stroke-width="1.5"/>
                            <ellipse cx="12" cy="17" rx="7" ry="4" stroke="var(--color)" stroke-width="1.5"/>
                        </svg>
                        <span>Profile</span>
                    </wc-link>
                    <wc-link class="flex align-center gap-1 fs-1-25 bg-dark-4 rounded-0-25 transition-med color-light-1 p-0-5 hover-brighten" data-to="/settings">
                        <svg width="32px"viewBox="0 0 24 24" fill="none">
                            <path d="M7.84308 3.80211C9.8718 2.6007 10.8862 2 12 2C13.1138 2 14.1282 2.6007 16.1569 3.80211L16.8431 4.20846C18.8718 5.40987 19.8862 6.01057 20.4431 7C21 7.98943 21 9.19084 21 11.5937V12.4063C21 14.8092 21 16.0106 20.4431 17C19.8862 17.9894 18.8718 18.5901 16.8431 19.7915L16.1569 20.1979C14.1282 21.3993 13.1138 22 12 22C10.8862 22 9.8718 21.3993 7.84308 20.1979L7.15692 19.7915C5.1282 18.5901 4.11384 17.9894 3.55692 17C3 16.0106 3 14.8092 3 12.4063V11.5937C3 9.19084 3 7.98943 3.55692 7C4.11384 6.01057 5.1282 5.40987 7.15692 4.20846L7.84308 3.80211Z" stroke="var(--color)" stroke-width="1.5"/>
                            <circle cx="12" cy="12" r="3" stroke="var(--color)" stroke-width="1.5"/>
                        </svg>
                        <span>Settings</span>
                    </wc-link>
                    <button class="flex align-center gap-1 fs-1-25 bg-dark-4 rounded-0-25 transition-med color-light-1 p-0-5 hover-brighten" id="logoutBtn">
                        <svg width="32px"viewBox="0 0 24 24" fill="none">
                            <path d="M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4" stroke="var(--color)" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M10 12H20M20 12L17 9M20 12L17 15" stroke="var(--color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        `
    }
}

export default UserModal