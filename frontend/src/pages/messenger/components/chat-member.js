import { getCurrentTime, formatTime } from "./net.js"

export class chatMember extends HTMLElement {
	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = this.html()
        
        this.userData = {
            name: this.dataset.name || this.getAttribute('name'),
            username: this.dataset.username || this.getAttribute('username'),
            profile_image: this.dataset.image || this.getAttribute('image'),
            lastMessage: "",
            unreadMessagesCount: "",
            id: this.dataset.id || this.getAttribute('id'),
        }
        this.messageCounter = 0
        this.lastMessage = null
		this.isActive = false;
        this.render();
	}
    
	activate() {
        this.isActive = true;
		this.updateStyle();
	}
    
    displayIsTyping() {
        const msgIcon = this.shadowRoot.querySelector("#msg-icon")
        msgIcon.style.display = "none"
        const lastMessageTag = this.shadowRoot.querySelector("#msg-content");
        lastMessageTag.textContent = "typing..."
        lastMessageTag.style["color"] = "green";
    }
    
    stopIsTyping() {
        const lastMessageTag = this.shadowRoot.querySelector("#msg-content");
        if (!this.lastMessage) {
            lastMessageTag.textContent = ""
            return ;
        }
        this.updateLastMessage(this.lastMessage)
    }
    
	deactivate() {
        this.isActive = false;
		this.updateStyle();
	}
    
    displayMessageCounter(numberOfmessages, message, plus=false) {
        if (numberOfmessages <= 0)
            return
        const counterContainer = this.shadowRoot.querySelector("#msg-counter");
        counterContainer.style.display = "flex"

        plus = this.plus || plus
        this.plus = plus

        const counter = counterContainer.querySelector("#counter")
        this.messageCounter += numberOfmessages
        counter.innerHTML = `${plus?'<span style="margin-right: 2px">+</span>':''}${this.messageCounter}`

        const msgTime = this.shadowRoot.querySelector("#incoming-msg-time")

        msgTime.textContent = formatTime(message.time, "24-hour")
    }
    
    updateLastMessage(message) {
        if (!message) return

        if (message == "You blocked this user") {
            const lastMessageTag = this.shadowRoot.querySelector("#msg-content");
            lastMessageTag.textContent = "You blocked this user"
            return 
        }
        this.lastMessage = message

        const messageSts = this.shadowRoot.querySelector('.message-status-icon');
        const messageStatusIcon = this.shadowRoot.querySelector("#msg-icon")
        if (message.sender != this.userData.id) {
            messageStatusIcon.style.display = "block"
            messageSts.src = this.getMessageStatusIcon(message.status)
        }
        else
            messageStatusIcon.style.display = "none"

        const lastMessageTag = this.shadowRoot.querySelector("#msg-content");
        lastMessageTag.style["color"] = "#6c757d"
        
        if (message.tp == "IMG")  return lastMessageTag.textContent = "photo"
        if (message.tp == "VD") return lastMessageTag.textContent = "video"
        
        let msg = message.cnt
        if (message.cnt.length > 20) msg = msg.slice(0, 20) + "..."
        lastMessageTag.textContent = msg
    }

    hideMessageCounter() {
        const counterContainer = this.shadowRoot.querySelector("#msg-counter");
        this.messageCounter = 0
        counterContainer.style.display = "none"
        this.plus = false
    }

	updateStyle() {
        const lastMessageElement = this.shadowRoot.querySelector('.member').querySelector('.last-message');
        
		const member = this.shadowRoot.querySelector('.member');
		if (this.isActive) {
            member.classList.add('active');
            lastMessageElement.style["color"] = `white`;
        }
        else {
            member.classList.remove('active');
            lastMessageElement.style["color"] = `#6c757d`;
        }
	}

	handleClick() {
		const username = this.userData.username;
        const profile_image = this.userData.profile_image;
        const id = this.userData.id;

		this.dispatchEvent(new CustomEvent('memberClicked', {
			bubbles: true,
			composed: true,
			detail: { 
                username ,
                profile_image,
                id
            }
		}));
	}

	connectedCallback() {
		this.shadowRoot.querySelector('.member').addEventListener('click', this.handleClick.bind(this));
        this.memberId = this.getAttribute("id")
	}
	addUserInfo(user) {
        if (user) {
            this.userData = {
                ...this.userData,
                ...user
            }
        }
        this.render()
    }
	render() {
		const usernameElement = this.shadowRoot.querySelector('.user-name');
		const profile_imageElement = this.shadowRoot.querySelector('.user-image');

        if (this.userData.username)
		    usernameElement.textContent = this.userData.name;
		
        if (this.userData.profile_image) {
            profile_imageElement.src = this.userData.profile_image;
            profile_imageElement.onerror = () => profile_imageElement.src = '/assets/default-avatar.avif'
        }

		this.updateStyle();
	}

    getMessageStatusIcon(sts) {
        const status = sts.toLowerCase()
        if (['sn', 'seen'].includes(status)) return "/assets/read.svg";
        else if (['recv', 'recieved'].includes(status)) return "/assets/delivered.svg";
        else if (['st'].includes(status)) return "/assets/send-to-server.svg";
        else if (status == 'err') return "/assets/message-error.svg";
        return "/assets/not-send.svg"
    }

    html () {
        return /*html*/`
            <style>
                @import url('/themes.css');
                @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');

                .member:hover,
                .member.active {
                    background-color: var(--glass-color);
                    color: white;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }

                .profile-pic {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    margin-right: 14px;
                    overflow: hidden;
                    object-fit: cover;
                }

                .user-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .user-name {
                    font-weight: bold;
                }

                #msg-content {
                    font-size: 0.8em;
                    color: #6c757d;
                }

                .last-message {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 4px;
                }

                #msg-icon {
                    display: none;
                }

                .message-status-icon {
                    width: 15px;
                    height: 15px;
                }

                #msg-counter {
                    display: none;
                    flex-direction: column;
                    margin-left: auto;
                    justify-content: center;
                    align-items: center;
                }

                #incoming-msg-time {
                    color: #1D7512;
                    font-size: 13px;
                }

                #counter {
                    display: flex;
                    border-radius: 5rem;
                    background-color: #2aa81a;
                    justify-content: center;
                    align-items: center;
                    color: #022f40;
                    margin: 0;
                    padding: 4px 8px;
                    font-size: 11px;
                    font-weight: bold;
                }
            </style>

            <div class="member flex align-center p-2 pointer rounded-0-5 transition-med">
                <div class="profile-pic">
                    <img class="user-image" src="" alt="profile picture">
                </div>
                <div class="user-info">
                    <div class="user-name"></div>
                    <div class="last-message">
                        <div id="msg-icon">
                            <img class="message-status-icon" src="/assets/not-send.svg" />
                        </div>
                        <div id="msg-content"></div>
                    </div>
                </div>
                <div id="msg-counter">
                    <div id="incoming-msg-time"></div>
                    <div id="counter"></div>
                </div>
            </div>
        `
        
    }
}

