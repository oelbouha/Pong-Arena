import { create_element, sleep } from "../utils/index.js"



export class MainNotifier {
    constructor (wrapper) {
        this.wrapper = wrapper
    }

    async notify(notification) {
        const notif = notification.domElment
        notif.classList.add('opacity-0', 'translate-y-10r', 'transition-slow')
        this.wrapper.append(notif)
        await sleep(10)
        notif.classList.remove('opacity-0', 'translate-y-10r')

        setTimeout(() => notif.remove(), 3000)
    }
}


export class Notification {
    static timeout = 2000
    constructor(text) {
        this.text = text
    }


    get html() {
        return /*html*/ `
            <div 
                class="notif flex p-1 gap-1 bg-glass-2 color-black rounded-0-5 fs-1-15"
                style="border-top: 10px solid green"
            >
                ${this.text}
            </div>
        `
    }

    get domElment() {
        return create_element(this.html)
    }
}

export default MainNotifier