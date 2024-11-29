import API from '../networking.js'
import SVGs from "../components/svgs.js";
import MainNotifier from './Notifier.js';
import DATA, { set_authenticated_user } from "../store.js";
import { Route } from "../router/index.js"
import { SvgButtonLink, SvgButton } from "../components/SvgButton.js"
import { addEventListener, set_notifier } from "../utils/index.js";
import { connect as connect_socket } from './messenger/components/net.js';

import './home.js'
import { navigate_to } from '../router/utils.js';

function setupModal(trigger, modal, overlay, tohide = [])
{
    function handler()
    {
        const hideClass = modal.dataset.hideClass || 'hidden'

        tohide.forEach(m => m.classList.add(hideClass))

        if (modal.classList.contains(hideClass)) {
            modal.classList.remove(hideClass)
            overlay.classList.remove(hideClass)
        }
        else {
            modal.classList.add(hideClass)
            overlay.classList.add(hideClass)
        }
    }
    return addEventListener(trigger, 'click', handler)
}

class Template extends Route {

    constructor() {
        super();
        this.variant = 'lg'
        this.observer = new ResizeObserver(entries => this.reArrange(entries[0]))
        
        this.hideMenu = this.hideMenu.bind(this)
        this.showMenu = this.showMenu.bind(this)

        this.eventListeners = []

        DATA.observe('auth_user', (old, user) => {
            if (old) {
                const avatar = this.shadowRoot.getElementById('meAvatar')
                if (avatar) avatar.setAttribute('data-image', user.profile_image)
            }
        })
    }

    get state() {
        if (!this._state) this._state = {}
        return this._state
    }
    get isLoading() {
        return this._state == undefined ? true : false;
    }

    setupChildren() {
        this.elms = {
            container: this.shadowRoot.getElementById("container"),
            main: this.shadowRoot.querySelector("main"),
            openMenuBtn: this.shadowRoot.getElementById("menuBtn"),
            closeMenuBtn: this.shadowRoot.getElementById("menuCloseBtn"),
            menuWrapper: this.shadowRoot.getElementById("menuWrapper"),
            side: this.shadowRoot.getElementById("side"),
            bottom: this.shadowRoot.getElementById("bottom")
        }
        this.elms.openMenuBtn.remove()
        this.elms.menuWrapper.remove()
        this.elms.closeMenuBtn.remove()

        this.elms.openMenuBtn.addEventListener('click', this.showMenu)
        this.elms.closeMenuBtn.addEventListener('click', this.hideMenu)
    }
    disconnectedCallback() {
        this.observer.unobserve(this)
        this.eventListeners.forEach(ev => ev.unregister())
    }

    async onConnected() {
        connect_socket()
        import('./socketEventsDispatcher.js')
        const res = await API.get(API.urls.me)
        const online_res = await API.get(API.urls.online_users)
        
        const me = set_authenticated_user(res.body)
        let online = []
        if (online_res.ok) online = online_res.body

        DATA.set('online_users', online_res.body)

        this._state = {
            me,
            online: online.map(id => me.getFriendById(id))
        }

        this.render()
        this.setupChildren()
        this.observer.observe(this)
        this.addEventListeners()

        const notifsWrapper = this.shadowRoot.getElementById('notifsWrapper')
        set_notifier(new MainNotifier(notifsWrapper))
    }

    addEventListeners() {
        const main = this.shadowRoot.getElementById('main')
        const avatar = this.shadowRoot.querySelector("#meAvatar")
        const notifsBtn = this.shadowRoot.querySelector("#notificationsBtn")
        const userModal = this.shadowRoot.querySelector("wc-user-modal")
        const notifsModal = this.shadowRoot.querySelector("wc-notifications")
        const overlay = this.shadowRoot.getElementById("overlay")
        const navs = Array.from(this.shadowRoot.querySelectorAll('.nav'))
        const chatNavBtn = this.shadowRoot.getElementById('chatNavBtn')
        const activeFriends = this.shadowRoot.getElementById('activeFriends')

        const hideModal = (modal) => {
            modal.dataset.hideClass && modal.classList.add(modal.dataset.hideClass)
            overlay.classList.add('hidden')
        }

        const hideModals = () => {
            hideModal(userModal)
            hideModal(notifsModal)
        }

        this.eventListeners.push(
            setupModal(avatar, userModal, overlay, [notifsModal]),
            setupModal(notifsBtn, notifsModal, overlay, [userModal]),
            addEventListener(notifsBtn, 'click', () => notifsBtn.firstElementChild.classList.add('hidden')),
            addEventListener(overlay, 'click', hideModals),
            addEventListener(activeFriends, 'click', e => {
                const avatar = e.target.closest('wc-avatar')
                if (avatar && avatar.dataset.id) {
                    const me = DATA.get('auth_user')
                    const user = me.friends.find(u => u.id == parseInt(avatar.dataset.id))
                    DATA.set('chat_active_user', user)
                    navigate_to('/chat/')
                }
            }),
            addEventListener([...navs], 'link:click', hideModals),
            addEventListener(this, 'remove:overlay',hideModals),
            addEventListener(window, 'remove:overlay', hideModals),
            addEventListener(window, 'router:routechange', e => {
                e.detail.mainScroll = main.scrollTop
                main.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                })
                if (e.detail.route.startsWith('/chat')) {
                    chatNavBtn.firstElementChild.classList.add('hidden')
                    const activeUsers = this.shadowRoot.querySelectorAll('.active-user')
                    activeUsers.forEach(au => au.hideActivity())
                }
            }),
            addEventListener(window, 'popstate', e => {
                main.scrollTo({
                    top: e.state.mainScroll,
                    left: 0,
                    behavior: 'smooth'
                })
            }),
            addEventListener(window, 'socket:message', e => {
                const msg = e.detail
                if (msg.m == 'online') {
                    this.state.online = this.state.online.filter(user => user.id != msg.clt)
                    const friend = this.state.me.getFriendById(msg.clt)
                    if (!friend) return
                    this.state.online.unshift(friend)
                    this.renderActiveFriends()
                }
                else if (msg.m == 'offline') {
                    this.state.online = this.state.online.filter(user => user.id != msg.clt)
                    this.renderActiveFriends()
                }
                else if (msg.m == 'msg') {
                    if (!location.pathname.startsWith('/chat')) {
                        chatNavBtn.firstElementChild.classList.remove('hidden')
                        const avatar = this.shadowRoot.querySelector(`wc-avatar[data-id='${msg.clt}']`)
                        avatar && avatar.showActivity()
                    }
                }
            }),
            addEventListener(window, "friendrequestaccepted", () => {
                notifsBtn.firstElementChild.classList.remove('hidden')
            }),
            addEventListener(window, "friendrequestreceived", () => {
                notifsBtn.firstElementChild.classList.remove('hidden')
            }),
            addEventListener(window, "notification", () => {
                notifsBtn.firstElementChild.classList.remove('hidden')
            }),
        )
    }


    // Responsive
    reArrange(entry)
    {
        if (entry.borderBoxSize[0].inlineSize <= 992) {
            if (this.variant == 'sm')
                return
            this.reArrangeToSmall()
            return
        }
        
        if (this.variant == 'lg')
            return
        this.reArrangeToLarge()
    }
    reArrangeToLarge() { 
        const activeFriends = this.shadowRoot.getElementById('activeFriends')
        const sideNav = this.shadowRoot.querySelector('#side .nav')
        const bottomNav = this.shadowRoot.querySelector('#bottom .nav')

        this.elms.menuWrapper.remove()
        this.elms.closeMenuBtn.remove()
        this.elms.openMenuBtn.remove()

        this.hideMenu()

        sideNav.onclick = null
        bottomNav.onclick = null

        this.elms.container.prepend(this.elms.side, this.elms.bottom)
        this.elms.bottom.append(activeFriends)

        this.variant = 'lg'
    }
    reArrangeToSmall()
    {
        const activeFriends = this.shadowRoot.getElementById('activeFriends')
        const sideNav = this.shadowRoot.querySelector('#side .nav')
        const bottomNav = this.shadowRoot.querySelector('#bottom .nav')
        const friendsWrapper = this.elms.menuWrapper.firstElementChild

        const elms = this.elms

        friendsWrapper.append(activeFriends)
        elms.openMenuBtn.remove()
        elms.container.prepend(elms.menuWrapper)
        elms.main.append(elms.openMenuBtn)
        elms.menuWrapper.prepend(elms.side, elms.bottom, friendsWrapper)
        bottomNav.append(elms.closeMenuBtn)
        
        const navClickHandler = e => {
            const btn = e.target.closest('wc-svg-btn-link')
            if (btn) this.hideMenu()
        }
        sideNav.onclick = navClickHandler
        bottomNav.onclick = navClickHandler

        this.variant = 'sm'
    }

    // Helpers
    hideMenu() {
        this.elms.main.classList.remove('hide')
        this.elms.menuWrapper.classList.remove('show')
    }
    showMenu() {
        this.elms.main.classList.add('hide')
        this.elms.menuWrapper.classList.add('show')
    }

    renderActiveFriends() {
        const activeFriends = this.shadowRoot.getElementById('activeFriends')
        activeFriends.innerHTML = this.friendsListHtml
    }

    get styles() {
        return /*css*/ `
            @import url("/themes.css");
            :host {
                display: flex;
            }
            #container,
            #menuWrapper {
                position: relative;
                display: grid;
                grid-template-columns: 64px auto;
                grid-template-rows: auto 64px;
            }

            #side,
            #bottom {
                background-color: rgba(var(--dark-color-2-rgb), .6);
                backdrop-filter: blur(8px);
            }

            #side {
                grid-row: span 2;
                position: relative;
                border-radius: 4px 4px 0 4px;
                box-shadow: 1px 0 1px inset var(--dark-color-3), -1px 0 1px inset var(--dark-color-3);
                z-index: 5 !important;
            }

            #bottom {
                grid-column: 2;
                grid-row: 2;
                display: flex;
                justify-content: space-between;
                border-radius: 0 4px 4px 0;
                box-shadow: 0 1px 1px inset var(--dark-color-3), 0 -1px 1px inset var(--dark-color-3);
            }

            #bottom #activeFriends {
                display: flex;
                gap: .5rem;
                justify-content: end;
            }

            #userAndNotifs {
                display: flex;
                flex-direction: column;
                gap: .5rem;
                z-index: 4;
            }

            #overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 4;
                background: rgba(0, 0, 0, 0.5);
            }

            .top-layer {
                position: relative;
                z-index: 5;
            }


            .nav {
                display: flex;
                gap: .5rem
            }

            #side .nav {
                flex-direction: column;
            }

            #bottom .nav {
                margin-left: .5rem;
            }

            wc-svg-btn-link,
            wc-svg-button {
                transition: filter .4s;
            }

            wc-svg-btn-link:hover,
            wc-svg-button:hover {
                filter: brightness(1.5)
            }

            #bottom .nav wc-svg-btn-link {
                width: 64px;
            }

            #container>* {
                z-index: 3;
            }

            main {
                position: relative;
                grid-row: 1;
                grid-column: 2;
                margin: 0 0 12px 12px;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 0 3rem var(--dark-color-4);
                z-index: 2 !important;
            }

            #main {
                position: absolute;
                height: 100%;
                width: 100%;
                overflow-y: auto;
                --opacity: .7;
                background-image: linear-gradient(to bottom right, rgba(var(--dark-color-2-rgb), var(--opacity)), rgba(var(--dark-color-3-rgb), var(--opacity)));
                backdrop-filter: blur(12px);
                scrollbar-width: thin;
                scrollbar-color: var(--dark-color-5) transparent;
                box-sizing: border-box;
            }

            #main::-webkit-scrollbar-thumb {
                background: var(--dark-color-5);
                border-radius: 4rem;
            }

            #main::-webkit-scrollbar {
                background: transparent;
                width: 4px;
            }

            #menuBtn {
                position: absolute;
                bottom: 1rem;
                left: 1rem;
                width: 64px;
                z-index: 10;
            }
            wc-route {
                height: 100%;
            }

            #notifsWrapper {
                position: absolute;
                top: 1rem;
                right: 1rem;
                width: 100%;
                max-width: 30rem;
                z-index: 1000;
            }
            .notif {
                backdrop-filter: blur(8px);
            }

            @media screen and (max-width: 992px) {
                #container {
                    padding: 0 !important;
                    overflow: hidden;
                }

                #menuWrapper,
                main {
                    grid-area: 1 / 1 / span 2 / span 2;
                    transition: all .5s cubic-bezier(.75, 0, .59, 1.1);
                    margin: 0;
                    border-radius: 0;
                }

                #menuWrapper {
                    max-width: 100vw;
                    max-height: 100vh;
                    padding: 1rem;
                    transform: translate(-100%);
                    z-index: 5;
                }

                #menuWrapper.show,
                main {
                    transform: translate(0);
                }

                main.hide {
                    transform: translate(100%);
                }

                #menuCloseBtn {
                    margin-left: auto;
                }

                #activeFriendsWrapper {
                    padding: 16px;
                    font-family: "Montserrat";
                    background: var(--dark-color-2);
                    --opacity: .6;
                    background: linear-gradient(to bottom right, rgba(var(--dark-color-2-rgb), var(--opacity)), rgba(var(--dark-color-3-rgb), var(--opacity)));
                    backdrop-filter: blur(12px);
                    margin: 0 0 12px 12px;
                    border-radius: 16px;
                    box-shadow: 0 0 3rem var(--dark-color-4);
                }

                #activeFriendsWrapper h2 {
                    margin: 0 0 8px;
                }

                #activeFriends {
                    display: flex;
                    gap: 8px;
                    height: 80px;
                    flex-wrap: wrap;
                    grid-row: 1;
                    grid-column: 2;
                }

                #bottom .nav {
                    width: 100%;
                }
            }
        `
    }

    get friendsListHtml() {
        return this.state.online.map( user => /*html*/ `
            <wc-avatar class="active-user" data-id="${user.id}" data-image="${user.profile_image}"></wc-avatar>
        `).join('')
    }

    get content() {
        const side = /*html*/ `
            <div id="side" class="column space-between gap-2">
                <div id="userAndNotifs" class="top-layer">
                    <wc-avatar
                        id="meAvatar"
                        data-image="${this.state.me.profile_image}"></wc-avatar>
                    <wc-svg-button id="notificationsBtn">
                        <div class="absolute rounded-pill bg-accent hidden" style="width:8px; height:8px; top: .5rem; right: .5rem;"></div>
                        <svg width="2rem" viewBox="0 0 24 24" fill="silver">
                            <path
                                d="M8.35179 20.2418C9.19288 21.311 10.5142 22 12 22C13.4858 22 14.8071 21.311 15.6482 20.2418C13.2264 20.57 10.7736 20.57 8.35179 20.2418Z" />
                            <path
                                d="M18.7491 9V9.7041C18.7491 10.5491 18.9903 11.3752 19.4422 12.0782L20.5496 13.8012C21.5612 15.3749 20.789 17.5139 19.0296 18.0116C14.4273 19.3134 9.57274 19.3134 4.97036 18.0116C3.21105 17.5139 2.43882 15.3749 3.45036 13.8012L4.5578 12.0782C5.00972 11.3752 5.25087 10.5491 5.25087 9.7041V9C5.25087 5.13401 8.27256 2 12 2C15.7274 2 18.7491 5.13401 18.7491 9Z" />
                        </svg>
                    </wc-svg-button>
                    <wc-user-modal
                        class="hidden"
                        data-hide-class="hidden"
                    ></wc-user-modal>
                    <wc-notifications class="hidden" data-hide-class="hidden"></wc-notifications>
                </div>
                <div class="nav top-layer">
                    <wc-svg-btn-link data-to="/games/">
                        <svg width="2.25rem" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M 12 4 V 4 H 14 C 17.7712 4 19.6569 4 20.8284 5.1716 C 22 6.3431 22 8.2288 22 12 C 22 15.7712 22 17.6569 20.8284 18.8284 C 19.6569 20 17.7712 20 14 20 H 10 C 6.2288 20 4.3431 20 3.1716 18.8284 C 2 17.6569 2 15.7712 2 12 C 2 8.2288 2 6.3431 3.1716 5.1716 C 4.3431 4 6.2288 4 10 4 H 12 Z M 8.75 10 C 8.75 9.5858 8.4142 9.25 8 9.25 C 7.5858 9.25 7.25 9.5858 7.25 10 V 11.05 C 7.25 11.1605 7.1605 11.25 7.05 11.25 H 6 C 5.5858 11.25 5.25 11.5858 5.25 12 C 5.25 12.4142 5.5858 12.75 6 12.75 H 7.05 C 7.1605 12.75 7.25 12.8395 7.25 12.95 V 14 C 7.25 14.4142 7.5858 14.75 8 14.75 C 8.4142 14.75 8.75 14.4142 8.75 14 V 12.95 C 8.75 12.8395 8.8395 12.75 8.95 12.75 H 10 C 10.4142 12.75 10.75 12.4142 10.75 12 C 10.75 11.5858 10.4142 11.25 10 11.25 H 8.95 C 8.8395 11.25 8.75 11.1605 8.75 11.05 V 10 Z M 15 11.5 C 15.5523 11.5 16 11.0523 16 10.5 C 16 9.9477 15.5523 9.5 15 9.5 C 14.4477 9.5 14 9.9477 14 10.5 C 14 11.0523 14.4477 11.5 15 11.5 Z M 18 13.5 C 18 14.0523 17.5523 14.5 17 14.5 C 16.4477 14.5 16 14.0523 16 13.5 C 16 12.9477 16.4477 12.5 17 12.5 C 17.5523 12.5 18 12.9477 18 13.5 Z" fill="silver"/>
                        </svg>
                    </wc-svg-btn-link>
                    <wc-svg-btn-link data-to="/tournaments/">
                        <svg width="2.25rem" viewBox="0 0 24 24">
                            <path d="M21.9999 8.16234L21.9999 8.23487C21.9999 9.09561 21.9999 9.52598 21.7927 9.8781C21.5855 10.2302 21.2093 10.4392 20.4569 10.8572L19.6636 11.298C20.2102 9.44984 20.3926 7.46414 20.4601 5.76597C20.4629 5.69316 20.4662 5.61945 20.4695 5.54497L20.4718 5.49279C21.1231 5.71896 21.4887 5.88758 21.7168 6.20408C22 6.59692 22 7.11873 21.9999 8.16234Z" fill="silver"/>
                            <path d="M2 8.16234L2 8.23487C2.00003 9.09561 2.00004 9.52598 2.20723 9.8781C2.41442 10.2302 2.79063 10.4392 3.54305 10.8572L4.33681 11.2982C3.79007 9.45001 3.60767 7.46422 3.54025 5.76597C3.53736 5.69316 3.5341 5.61945 3.53081 5.54497L3.5285 5.49266C2.87701 5.7189 2.51126 5.88752 2.2831 6.20408C1.99996 6.59692 1.99997 7.11873 2 8.16234Z" fill="silver"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16.3771 2.34674C15.2531 2.15709 13.7837 2 12.0002 2C10.2166 2 8.74724 2.15709 7.62318 2.34674C6.48445 2.53887 5.91508 2.63494 5.43937 3.22083C4.96365 3.80673 4.98879 4.43998 5.03907 5.70647C5.21169 10.0544 6.14996 15.4851 11.25 15.9657V19.5H9.8198C9.34312 19.5 8.93271 19.8365 8.83922 20.3039L8.65 21.25H6C5.58579 21.25 5.25 21.5858 5.25 22C5.25 22.4142 5.58579 22.75 6 22.75H18C18.4142 22.75 18.75 22.4142 18.75 22C18.75 21.5858 18.4142 21.25 18 21.25H15.35L15.1608 20.3039C15.0673 19.8365 14.6569 19.5 14.1802 19.5H12.75V15.9657C17.8503 15.4853 18.7886 10.0545 18.9612 5.70647C19.0115 4.43998 19.0367 3.80673 18.5609 3.22083C18.0852 2.63494 17.5159 2.53887 16.3771 2.34674Z" fill="silver"/>
                        </svg>
                    </wc-svg-btn-link>
                    <wc-svg-btn-link data-to="/">
                        <svg width="2.25rem" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M2.33537 7.87495C1.79491 9.00229 1.98463 10.3208 2.36407 12.9579L2.64284 14.8952C3.13025 18.2827 3.37396 19.9764 4.54903 20.9882C5.72409 22 7.44737 22 10.8939 22H13.1061C16.5526 22 18.2759 22 19.451 20.9882C20.626 19.9764 20.8697 18.2827 21.3572 14.8952L21.6359 12.9579C22.0154 10.3208 22.2051 9.00229 21.6646 7.87495C21.1242 6.7476 19.9738 6.06234 17.6731 4.69181L16.2882 3.86687C14.199 2.62229 13.1543 2 12 2C10.8457 2 9.80104 2.62229 7.71175 3.86687L6.32691 4.69181C4.02619 6.06234 2.87583 6.7476 2.33537 7.87495ZM8.2501 17.9998C8.2501 17.5856 8.58589 17.2498 9.0001 17.2498H15.0001C15.4143 17.2498 15.7501 17.5856 15.7501 17.9998C15.7501 18.414 15.4143 18.7498 15.0001 18.7498H9.0001C8.58589 18.7498 8.2501 18.414 8.2501 17.9998Z" fill="silver"/>
                        </svg>
                    </wc-svg-btn-link>
                </div>
            </div>
        `
        const bottom = /*html*/ `
            <div id="bottom">
                <div class="nav top-layer">
                    <wc-svg-btn-link  data-to="/users/">
                        <svg width="2.25rem" viewBox="0 0 24 24">
                            <circle cx="9.00098" cy="6" r="4" fill="silver"/>
                            <ellipse cx="9.00098" cy="17.001" rx="7" ry="4" fill="silver"/>
                            <path d="M20.9996 17.0005C20.9996 18.6573 18.9641 20.0004 16.4788 20.0004C17.211 19.2001 17.7145 18.1955 17.7145 17.0018C17.7145 15.8068 17.2098 14.8013 16.4762 14.0005C18.9615 14.0005 20.9996 15.3436 20.9996 17.0005Z" fill="silver"/>
                            <path d="M17.9996 6.00073C17.9996 7.65759 16.6565 9.00073 14.9996 9.00073C14.6383 9.00073 14.292 8.93687 13.9712 8.81981C14.4443 7.98772 14.7145 7.02522 14.7145 5.99962C14.7145 4.97477 14.4447 4.01294 13.9722 3.18127C14.2927 3.06446 14.6387 3.00073 14.9996 3.00073C16.6565 3.00073 17.9996 4.34388 17.9996 6.00073Z" fill="silver"/>
                        </svg>
                    </wc-svg-btn-link>
                    <wc-svg-btn-link  data-to="/chat/" id="chatNavBtn">
                        <div class="absolute rounded-pill bg-accent hidden" style="width:8px; height:8px; top: .5rem; right: .5rem;"></div>
                        <svg width="2.25rem" viewBox="0 0 24 24">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" fill="silver"/>
                        </svg>
                    </wc-svg-btn-link>
                </div>
                <div id="activeFriends" class="top-layer">
                    ${ this.friendsListHtml }
                </div>
            </div>
        `
        const router = /*html*/ `
            <wc-router id="main-router" class="mh-100">
                <wc-route data-path="/" data-exact-path="true" data-component="wc-home"></wc-route>
                <wc-route data-path="/games/{game:str}" data-component="wc-game"></wc-route>
                <wc-route data-path="/games" data-component="wc-games"></wc-route>
                <wc-route data-path="/tournaments/{tournamentId}" data-component="wc-tournament"></wc-route>
                <wc-route data-path="/tournaments" data-component="wc-tournaments"></wc-route>
                <wc-route data-path="/users/{username}/" data-component="wc-profile">friends</wc-route>
                <wc-route data-path="/users/" data-component="wc-users">Users</wc-route>
                <wc-route data-path="/chat/" data-component="wc-chat">chat</wc-route>
                <wc-route data-path="/settings" data-component="wc-settings"></wc-route>
                <wc-route data-path="/">Not Found</wc-route>
            </wc-router>
        `
        const notifications = /*html*/ `
            <div id="notifsWrapper" class="column fixed gap-1">
            </div>
        `

        return /*html*/`
            <style>
                ${this.styles}
            </style>
            ${ notifications }
            <div id="container" class="h-100 w-100 p-1 color-silver">
                ${side}
                <div id="overlay" class="hidden"></div>
                ${bottom}
                <div id="menuWrapper">
                    <div id="activeFriendsWrapper">
                        <h2>Active Friends</h2>
                    </div>
                </div>

                <main>
                    <div id="main" class="grid">
                        ${router}
                    </div>
                    <wc-svg-button id="menuBtn" > ${SVGs.menu({width: '2.5rem'})} </wc-svg-button>
                </main>
                <wc-svg-button id="menuCloseBtn" > ${SVGs.xmark({width: '2.25rem'})} </wc-svg-button>
            </div>
        `
    }

    get skeleton() {
        return /*html*/ `
            <style>
                ${this.styles}

                @keyframes skeleton-loading {
                    
                    100% {
                        background-color: var(--dark-color-3);
                    }
                }
                @keyframes flash {
                    0% {
                        transform: translate(-100%);
                    }
                    100% {
                        transform: translate(100%);
                    }
                }
                .parent {
                    overflow: hidden
                }
                .skeleton {
                    width: 100%;
                    height: 100%;
                    animation: skeleton-loading 1s linear infinite alternate;
                    display: none;
                }
                .flash {
                    width: 100%;
                    min-width: 20rem;
                    height: 100%;
                    background: linear-gradient(to right, transparent, rgba(var(--dark-color-3-rgb), .7), transparent);
                    animation: var(--dur) linear 0.5s infinite normal none running flash;
                }
            </style>
            <div id="container" class="h-100 w-100 p-1 color-silver">
                <div id="side" class="relative parent column space-between gap-2">
                    <div class="skeleton"></div>
                    <div class="flash" style="--dur: 1.5s;"></div>
                </div>
                <div id="bottom" class="relative parent">
                    <div class="skeleton"></div>
                    <div class="flash" style="--dur: 2s;"></div>
                </div>
                <main>
                    <div id="main" class="relative parent">
                        <div class="skeleton"></div>
                        <div class="flash" style="--dur: 2s;"></div>
                    </div>
                </main>
            </div>
        `
    }

    html() {
        return this.isLoading ? this.skeleton : this.content
    }
}


customElements.define('wc-svg-button', SvgButton)
customElements.define('wc-svg-btn-link', SvgButtonLink)

export default Template