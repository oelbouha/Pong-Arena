import { websocket } from "./net.js";
import { getData, formatTime, getCurrentTime, replaceChar, formatDate } from "./net.js"
import { getVideoThumbnail } from "../video_thumbnail.js"
import SVGs from "../../../components/svgs.js";
import { addEventListener, create_element, notify, user_defaults } from "../../../utils/index.js";
import DATA from "../../../store.js";
import API from "../../../networking.js"
import Component from "../../../components/base.js";
import { Notification } from "../../Notifier.js";
import { navigate_to } from "../../../router/utils.js";

let typingTimer;
const doneTypingInterval = 2000;
let typingTime;

function get_message_elem(root, id) {
    let messageComponent = root.querySelector(`wc-text-message[message-id="${id}`)
    if (messageComponent) return messageComponent
    
    messageComponent = root.querySelector(`wc-image-message[message-id="${id}`)
    if (messageComponent) return messageComponent

    messageComponent = root.querySelector(`wc-video-message[message-id="${id}`)
    if (messageComponent) return messageComponent

    messageComponent = root.querySelector(`wc-game-invite[message-id="${id}`)
    if (messageComponent) return messageComponent
}


function getTimestamp(format = 'ms') {
    return Date.now();
}

export class chat extends Component {
    constructor() {
        super();
        this.eventListeners = []
        

        this.conversations = []
        this.activeMember = null;

        // this.activeUser.id = null;
        this.activeMemberstatus = null
        this.activeUser = {}

        

        this.inviteDropDownActive = false;

        this.pendingGameInvite = false

        this.lastDate = null

        window.addEventListener('socket:message', e => {
            const message = e.detail
            if (message.m == "msg")
                this.handleIncomingMessage(message)
            else if (message.m == "st" || message.m == "sn" || message.m == "recv")
                this.handleMessageStatus(message)
            else if (message.m == "typ" || message.m == "styp")
                this.handleTyping(message)
            else if (message.m == 'err') {
                if (message.err == 'user is offline') {
                    notify(
                        new Notification('User is Offline, wait until he is online')
                    )
                } else if (message.err == 'pending invitation') {
                    notify(
                        new Notification('You Already have a pending invitation')
                    )
                }

                const msg_elem = get_message_elem(this.shadowRoot, message.identifier)
                if (!msg_elem) return
                msg_elem.append(create_element(/*html*/`<span class="fs-0-75 color-redd" slot="error">${message.err}</span>`))
                msg_elem.updateMessage({status: 'err'})
            } else if (message.m == 'inv_resp') {
                const content = JSON.parse(message.cnt)
                const invit = content.invitation
                const game = content.game
                const redir = game == 'slap' ? '/games/online_handslap/' : '/games/online_pong/'
                DATA.set('invitation_id', invit)
                navigate_to(redir)
            }
        })

        this.identifier = 0

        this.clientsMessages = new Map()
        this.databaseMessages = new Map()
        this.gameInvitaion = new Map()

        this.render();
        this.updateUnreadMemberMessages()
    }

    get me() {
        return DATA.get('auth_user')
    }

    connectedCallback() {
        this.setupEventListeners()

        const friendsList = this.shadowRoot.getElementById('friendsList')
        const friends = DATA.get('auth_user').friends
        friendsList.firstElementChild.innerHTML = friends.map(f => {
                const friend = user_defaults(f)
                return /*html*/ `
                    <wc-chat-member
                        data-name="${friend.first_name} ${friend.last_name}"
                        data-username="${friend.username}"
                        data-image="${friend.profile_image}"
                        data-id="${friend.id}"></wc-chat-member>
                `
            }).join('') || '<div class="text-center fs-3 color-glass p-3">You Don\'t Have Friends :(</div>'
        this.render()
    }
    disconnectedCallback() {
        this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
    }

    updateScroll() {
        const element = this.shadowRoot.querySelector("#chat-conversation");
        element.scrollTop = element.scrollHeight;
    }

    displayConvoHeader(event) {
        const profile_image = event.detail.profile_image;

        const userHeaderStatus = this.shadowRoot.querySelector(".convo-user-status")
        if (!userHeaderStatus) return

        if (DATA.get('online_users').includes(parseInt(this.activeUser.id))) {
            this.activeMemberstatus = "online"
            userHeaderStatus.textContent = this.activeMemberstatus
            userHeaderStatus.style["color"] = "green"
        } else {
            this.activeMemberstatus = "offline"
            userHeaderStatus.textContent = this.activeMemberstatus
            userHeaderStatus.style["color"] = "red"
        }

        const chatConversation = this.shadowRoot.querySelector('#convo-messages-container');
        // display header and message input 
        const convoHeader = chatConversation.querySelector('#user-header-container');
        convoHeader.style.display = 'block';
        const inputMessage = chatConversation.querySelector('#input-message-container');
        inputMessage.style.display = `flex`;

        // display user image and name
        const userProfileImg = convoHeader.querySelector('#user-image');
        userProfileImg.src = profile_image;
        const username = convoHeader.querySelector('.convo-username');
        username.textContent = this.activeUser.username;
    }

    displayClientProfile(event) {
        const userProfile = this.shadowRoot.querySelector('#user-profile');
        userProfile.style.display = 'flex';

        const profileInfo = userProfile.querySelector(".profile-info")
        profileInfo.innerHTML = ``

        const profileComponent = document.createElement('wc-chat-profile');
        const data = {
            username: this.activeUser.username,
            "name": this.activeUser.name,
            "profilePic": this.activeUser.profile_image,
            "phoneNumber": "0639316995",
            "description": "this is description ..."
        }
        profileComponent.addUserInfo(data)
        profileInfo.appendChild(profileComponent);

        // for invite game request
        const inviteContainer = this.shadowRoot.querySelector(".invite-game-container")

        inviteContainer.innerHTML = ``
        const comp = this.gameInvitaion.get(Number(this.activeUser.id))
        if (comp) {
            inviteContainer.appendChild(comp)
        }

        const blockedContainer = this.shadowRoot.querySelector(".block-container")
        if (this.activeMemberBlocked) {
            blockedContainer.style.display = "flex"
        }
        else {
            blockedContainer.style.display = "none"
        }
    }

    async fetchData(userId, clientId) {
        let data = await getData(userId, clientId);
        if (!data) return
        this.databaseMessages.set(clientId, data)
        for (let message of data)
            this.storeMessage(clientId, message)
    }

    handleMemberClick(event) {
        if (this.activeUser.id == event.detail.id) return

        this.lastDate = null
        if (this.activeMember) {
            this.activeMember.deactivate();
        }

        let convo = this.conversations.find(convo => convo.user.id == event.detail.id)
        if (!convo) {
            convo = {
                user: {
                    username: event.detail.username,
                    id: event.detail.id,
                    profile_image: event.detail.profile_image,
                    blocked: false,
                    in_convo_list: false
                },
                last_msg: null
            }
            const clickedMember = event.target.closest('wc-chat-member')
            clickedMember.activate();
            this.activeMember = clickedMember
        } else {
            const member = this.shadowRoot.querySelector(`wc-chat-member[username="${convo.user.username}"`)
            member.activate()
            this.activeMember = member
        }

        this.activeUser = convo.user
        this.activeMemberBlocked = convo.user.blocked
        this.activeUser.id = event.detail.id
        this.activeUser.username = event.detail.username

        this.displayConvoHeader(event)
        this.renderActiveUserMessages()
        this.displayClientProfile(event)
        this.handleOverlayClick();
    }

    handleUserSearch(event) {
        const searchQuery = event.target.value.toLowerCase();
        const membersContainer = this.shadowRoot.querySelector('.members-container');
        const members = membersContainer.querySelectorAll('wc-chat-member');

        members.forEach(member => {
            const username = member.getAttribute('username').toLowerCase();
            if (username.includes(searchQuery)) {
                member.style.display = '';
            } else {
                member.style.display = 'none';
            }
        });
    }

    setupEventListeners() {
        const mainSearch = this.shadowRoot.querySelector('#convo-search');
        const profileIcon = this.shadowRoot.querySelector('.profile-icon');
        const sendBtn = this.shadowRoot.querySelector('#send-btn-icon');
        const inputMessage = this.shadowRoot.querySelector('#message-input');
        const listOffcanvas = this.shadowRoot.querySelector('.list-icon');
        const overlay = this.shadowRoot.querySelector('#overlay');
        const returnIcon = this.shadowRoot.querySelector(".return-icon")
        const inviteGame = this.shadowRoot.querySelector("#invite-game-icon")
        const pingPongTag = this.shadowRoot.querySelector("#ping-pong")
        const slapHandTag = this.shadowRoot.querySelector("#slap-hand")
        const unblockBtn = this.shadowRoot.querySelector("#unblock-btn")
        const showFriendsListElem = this.shadowRoot.querySelector('#showFriendsList')
        const conversation = this.shadowRoot.querySelector('#chat-conversation');
        
        this.eventListeners.push(
            addEventListener(this.shadowRoot, 'memberClicked', this.handleMemberClick.bind(this)),
            addEventListener(overlay, 'click', this.handleOverlayClick.bind(this)),
            addEventListener(listOffcanvas, 'click', this.showMembersDivElement.bind(this)),
            addEventListener(mainSearch, 'input', this.handleUserSearch.bind(this)),
            addEventListener(unblockBtn, 'click', this.handleUnblockBtn.bind(this)),
            addEventListener(slapHandTag, 'click', this.sendGameInvite.bind(this)),
            addEventListener(pingPongTag, 'click', this.sendGameInvite.bind(this)),
            addEventListener(inviteGame, 'click', this.handleInvitebtnClick.bind(this)),
            addEventListener(profileIcon, 'click', this.showUserProfile.bind(this)),
            addEventListener(sendBtn, 'click', this.sendMessage.bind(this)),
            addEventListener(inputMessage, 'input', this.handleMessageSendbtn.bind(this)),
            addEventListener(inputMessage, 'keypress', (e) => {
                if (e.key == "Enter")
                    this.sendMessage(e);
            }),
            addEventListener(window, 'resize', () => {
                if (window.innerWidth > 800) {
                    this.handleOverlayClick();
                }
            }),
            addEventListener(showFriendsListElem, 'click', () => {
                const friends = this.shadowRoot.getElementById('friends')
                if (friends.classList.contains('grow'))
                    friends.classList.remove('grow')
                else
                    friends.classList.add('grow')
            }),
            addEventListener(conversation, 'scroll', () => {
                if (!this.activeUser || this.activeUser.end_msgs == true) return
                if (conversation.scrollTop == 0) {
                    if (conversation.querySelector('#loader')) return

                    const loader = SVGs.make(
                        SVGs.loading({
                            id: 'loader',
                            width: '100%',
                            height: '2rem',
                            class:"mb-0-5"
                        })
                    )
                    this.scrollBottom = conversation.scrollHeight - conversation.scrollTop
                    conversation.prepend(loader)
                    
                    ;(async () => {
                        this.renderMoreMessages()
                    })()
                }
            })
        )
        returnIcon && this.eventListeners.push(
            addEventListener(returnIcon, 'click', this.showMembersDivElement.bind(this)),
        )

        const observer = new MutationObserver(() => {
            setTimeout(() => {
                conversation.scrollTop = conversation.scrollHeight - (this.scrollBottom || 0)
            }, 0);
        });

        observer.observe(conversation, { childList: true });
    }
    

    handleUnblockBtn() {
    }

    sendGameInvite(event) {
        const dropdown = this.shadowRoot.querySelector('.dropdown-content')
        const id = event.target.id
        const game = id == "slap-hand" ? 'slap' : 'pong'
        dropdown.style.display = "none"
        if (this.pendingGameInvite) {
            this.inviteDropDownActive = false
            this.displayErrorMessage(`you have a pending request to ${this.activeUser.username}`)
            return
        }
        const message = {
            "m": "msg",
            game,
            "clt": this.activeUser.id,
            "cnt": "game invite",
            "tp": "INVITE",
            "status": "pending",
            "time": getCurrentTime(),
            "identifier": this.activeUser.username + getTimestamp()
        }
        websocket.send(JSON.stringify(message));
        let iconPath = "/assets/ping-pong.svg"
        if (id == "slap-hand")
            iconPath = "/assets/slap.svg"
        // this.addInviteGameMessage(message, "user", iconPath)
        // this.pendingGameInvite = true;
        // this.inviteDropDownActive = false

    }

    handleInvitebtnClick() {
        if (this.activeMemberBlocked) {
            this.inviteDropDownActive = false
            return this.displayErrorMessage(`Unblock ${this.activeUser.username} to send a message`)
        }
        const dropdown = this.shadowRoot.querySelector('.dropdown-content')
        if (this.inviteDropDownActive) {
            dropdown.style.display = "none"
            this.inviteDropDownActive = false
        }
        else {
            dropdown.style.display = "flex"
            this.inviteDropDownActive = true;
        }
    }

    displayErrorMessage(error) {
        const chat = this.shadowRoot.querySelector("#chat-conversation")
        const popUp = document.createElement('wc-popup-modal')
        popUp.addMessage(error)
        chat.appendChild(popUp)
    }
    addInviteGameMessage(message, user, iconPath) {
        const userProfile = this.shadowRoot.querySelector("#user-profile")
        const inviteGameContainer = userProfile.querySelector(".invite-game-container")

        const profileInviteComponent = document.createElement('wc-profile-invite');
        profileInviteComponent.addMessage(user, iconPath);
        profileInviteComponent.setAttribute("message-id", message.identifier);
        if (message.msg)
            profileInviteComponent.setAttribute("message-id", message.msg);
        inviteGameContainer.innerHTML = ``
        // inviteGameContainer.appendChild(profileInviteComponent)
        this.gameInvitaion.set(Number(this.activeUser.id), profileInviteComponent)
        this.updateScroll()
        this.displayUserMessage(message)
    }

    displayUserIsTyping(clientId) {
        if (!this.activeMember || this.activeUser.id != clientId) return

        const userHeaderStatus = this.shadowRoot.querySelector(".convo-user-status")
        if (!userHeaderStatus) return

        userHeaderStatus.textContent = "typing..."
        userHeaderStatus.style["color"] = "green"
    }
    hideIsTyping(clientId) {
        if (!this.activeMember || this.activeUser.id != clientId) return

        const userHeaderStatus = this.shadowRoot.querySelector(".convo-user-status")
        if (!userHeaderStatus) return

        if (userHeaderStatus.textContent == "typing...")
            userHeaderStatus.textContent = "online" // update it to the last status the user was

        // update the status of the user
        userHeaderStatus.textContent = "online"
        userHeaderStatus.style["color"] = "green"
    }

    handleTyping(message) {
        const membersContainer = this.shadowRoot.querySelector('.members-container');
        const memberElement = membersContainer.querySelector(`wc-chat-member[id="${message.clt}"]`);

        if (!memberElement) return

        if (message.m == "typ") {
            clearTimeout(typingTime)
            memberElement.displayIsTyping()
            this.displayUserIsTyping(message.clt)

            typingTime = setTimeout(() => {
                memberElement.stopIsTyping()
                this.hideIsTyping(message.clt)
            }, doneTypingInterval)
        }
        else {
            memberElement.stopIsTyping()
            this.hideIsTyping(message.clt)
        }
    }

    displayIncomingMessage(message) {
        const conversation = this.shadowRoot.querySelector('#chat-conversation');
        if (!conversation) return

        if (message.tp == "TXT") {
            const textMessageComponent = document.createElement('wc-text-message')
            textMessageComponent.addMessage(message, "client")
            conversation.appendChild(textMessageComponent)
        }
        else if (message.tp == "IMG") {
            const imageMessageComponent = document.createElement('wc-image-message')
            imageMessageComponent.addMessage(message.cnt, message, "client")
            conversation.appendChild(imageMessageComponent)
        }
        else if (message.tp == "VD") {
            const videoComponent = document.createElement('wc-video-message')
            videoComponent.addMessage(message.cnt, message, "client")
            conversation.appendChild(videoComponent)
        }
        else if (message.tp == "INVITE") {
            const content = JSON.parse(message.cnt)
            const inviteComponent = create_element(/*html*/ `
                <wc-game-request data-game="${content.game}" data-invite="${content.invitation}">
                </wc-game-request>
            `)
            conversation.appendChild(inviteComponent)
        }
    }

    handleIncomingMessage(message) {
        message["sender"] = message.clt
        message["recipient"] = this.me.id
        message["time"] = (new Date()).toString()

        this.storeMessage(message.clt, message)
        this.markeAsRecieved(message)

        const usersContainer = this.shadowRoot.querySelector('.members-container');

        let convo = this.conversations.find(convo => convo.user.id == message.clt)
        if (!convo) {
            const u = this.me.getFriendById(message.clt)
            convo = {
                user: {
                    username: u.username,
                    id: u.id,
                    profile_image: u.profile_image,
                    blocked: false,
                    in_convo_list: false
                },
                last_msg: {}
            }
            this.conversations.push(convo)
            const recipient = convo.user
            const membersContainer = this.shadowRoot.querySelector('.members-container');
            const member = create_element(/*html*/ `
                <wc-chat-member username="${recipient.username}" data-username="${recipient.username}"   data-image="${recipient.profile_image}" data-id="${recipient.id}" id="${recipient.id}"></wc-chat-member>
            `)
            membersContainer.prepend(member)

            if (recipient.id == this.activeUser.id) {
                this.activeMember.deactivate()
                member.activate()
                this.activeMember = member
            }
        }
        const recipient = convo.user

        const recipientComponent = usersContainer.querySelector(`wc-chat-member[username="${recipient.username}"]`);
        if (!this.activeUser.id || recipient.id != this.activeUser.id) {
            this.updateUnreadMessages(recipient, message)
            return
        }
        this.displayIncomingMessage(message)
        this.activeMember.updateLastMessage(message)
        recipientComponent.hideMessageCounter()
        this.markeAsRead(message)
    }

    markeAsRead(message) {
        message["status"] = "sn"
        const response = {
            "m": "sn",
            "clt": message.sender,
            "msg": message.msg
        }
        websocket.send(JSON.stringify(response));
    }
    markeAsRecieved(message) {
        message["status"] = "recv"
        const response = {
            "m": "recv",
            "clt": message.sender,
            "msg": message.msg
        }
        websocket.send(JSON.stringify(response));
    }


    updateUnreadMessages(recipient, message) {
        const usersContainer = this.shadowRoot.querySelector('.members-container');
        const recipientComponent = usersContainer.querySelector(`wc-chat-member[username="${recipient.username}"]`);

        recipientComponent.displayMessageCounter(1, message)
        recipientComponent.updateLastMessage(message)

        this.moveMemberElementToTop(recipient)
    }

    moveMemberElementToTop(targrtClient) {
        const membersContainer = this.shadowRoot.querySelector('.members-container');
        const memberElement = membersContainer.querySelector(`wc-chat-member[username="${targrtClient.username}"]`);

        if (memberElement == membersContainer.firstElementChild) return

        membersContainer.removeChild(memberElement)
        membersContainer.prepend(memberElement)

        const userIndex = this.conversations.findIndex(user => user.username === targrtClient.username);
        if (userIndex !== -1) {
            const user = this.conversations.splice(userIndex, 1)[0];
            this.conversations.unshift(user);
        }
    }

    storeMessage(key, messages) {
        const uniform_key = key.toString()

        if (!Array.isArray(messages))
            messages = [messages]
        
        if (!this.clientsMessages.has(uniform_key)) 
            this.clientsMessages.set(uniform_key, []);

        const res = this.clientsMessages.get(uniform_key)
        res.unshift(...messages)
    }
    async getMessagesById(id) {
        const map = this.clientsMessages
        if (!map.has(id.toString())) {
            const res = await API.get(API.urls.messages(id))
            if (res.ok) this.storeMessage(id, res.body.reverse())
        }
        return map.get(id.toString())
    }

    updateMessage(messageToUpdate) {
        const conversation = this.shadowRoot.querySelector("#chat-conversation")
        const usersContainer = this.shadowRoot.querySelector('.members-container');

        let messageComponent = null
        let identifierAttribute = null
        let idAttribute = null
        if (messageToUpdate.tp == "TXT") {
            identifierAttribute = `wc-text-message[message-id="${messageToUpdate.identifier}"]`
            idAttribute = `wc-text-message[message-id="${messageToUpdate.msg}"]`
        }
        else if (messageToUpdate.tp == "IMG") {
            identifierAttribute = `wc-image-message[message-id="${messageToUpdate.identifier}"]`
            idAttribute = `wc-image-message[message-id="${messageToUpdate.msg}"]`
        }
        else if (messageToUpdate.tp == "VD") {
            identifierAttribute = `wc-video-message[message-id="${messageToUpdate.identifier}"]`
            idAttribute = `wc-video-message[message-id="${messageToUpdate.msg}"]`
        }
        else if (messageToUpdate.tp == "INVITE") {
            identifierAttribute = `wc-game-invite[message-id="${messageToUpdate.identifier}"]`
            idAttribute = `wc-game-invite[message-id="${messageToUpdate.msg}"]`
        }
        messageComponent = conversation.querySelector(`${identifierAttribute}`)
        if (!messageComponent)
            messageComponent = conversation.querySelector(`${idAttribute}`)
        if (messageComponent)
            messageComponent.updateMessage(messageToUpdate)
    }
    async handleMessageStatus(message) {
        const userId = message.clt
        const activeMemberMessages = await this.getMessagesById(userId)
        if (!activeMemberMessages) {
            return
        }

        let messageToUpdate = activeMemberMessages.find(msg => msg.msg == message.msg)
        if (!messageToUpdate) {
            messageToUpdate = activeMemberMessages.find(msg => msg.identifier == message.identifier)
        }

        let targetMessageIndex = activeMemberMessages.findIndex(msg => msg.identifier == message.identifier)
        if (!targetMessageIndex)
            targetMessageIndex = activeMemberMessages.findIndex(msg => msg.msg == message.msg)


        if (!messageToUpdate) {
            return
        }
        messageToUpdate["status"] = message.m
        messageToUpdate["msg"] = message.msg

        const convo = this.conversations.find(convo => convo.user.id == message.clt)
        if (!convo) {
            return
        }
        const usersContainer = this.shadowRoot.querySelector('.members-container');
        const recipientComponent = usersContainer.querySelector(`wc-chat-member[username="${convo.user.username}"]`);
        recipientComponent.updateLastMessage(messageToUpdate)

        if (messageToUpdate.recipient != this.activeUser.id) {
            return // the conversation is not open so update last message and return
        }

        this.updateMessage(messageToUpdate)
        if (targetMessageIndex == -1) return
        for (let i = targetMessageIndex; i >= 0; --i) {
            if (this.isMessageSeen(activeMemberMessages[i].status))
                break ;
            if (activeMemberMessages[i].status != message.status) {
                this.updateMessage(activeMemberMessages[i])
                activeMemberMessages[i].status = message.status
            }
        }
        this.updateScroll()
    }

    getUnreadMessagesCount(id) {
        const array = this.databaseMessages.get(id)
        if (!array) return 0
        let count = 0

        for (let i = array.length - 1; i >= 0; --i) {
            const item = array[i]
            if (item.sender == id) {
                if (this.isMessageSeen(item.status)) {
                    return count
                }
                if (!this.isMessageRecieved(item.status))
                    this.markeAsRecieved(item)
                count++;
            }
            else
                return count
        }
        return count;
    }

    isMessageSeen(status) {
        const messageStatus = status.toLowerCase()
        if (["sn", "seen"].includes(messageStatus))
            return true
        return false
    }
    isMessageRecieved(status) {
        const messageStatus = status.toLowerCase()
        if (["recv", "recieved"].includes(messageStatus))
            return true
        return false
    }

    
    createMessageElement(message) {
        const transformers = {
            TXT: (message) => {
                const messageComponent = document.createElement('wc-text-message')
                // messageComponent.dataset.invite = message.cnt.invition
                if (message.sender == this.activeUser.id) {
                    messageComponent.addMessage(message, "client")
                }
                else {
                    messageComponent.addMessage(message);
                }
                messageComponent.setAttribute("message-id", message.identifier);
                if (message.msg)
                    messageComponent.setAttribute("message-id", message.msg);
                return messageComponent
            },
            INVITE: (message) => {
                const content = JSON.parse(message.cnt)
                const messageComponent = create_element(/*html*/ `
                    <wc-game-request data-game="${content.game}" data-invite="${content.invitation}">
                    </wc-game-request>
                `)
                if (message.sender == this.activeUser.id) {
                    messageComponent.addMessage(message, "client")
                }
                else {
                    messageComponent.addMessage(message)
                }
                messageComponent.setAttribute("message-id", message.identifier)
                if (message.msg)
                    messageComponent.setAttribute("message-id", message.msg)
        
                return messageComponent
            }
        }
        let el = transformers[message.tp](message)

        if (message.sender == this.activeUser.id && !this.isMessageSeen(message.status)) {
            this.markeAsRead(message)
        }
        return el ? [el] : []
    }
    renderClientMessages(messages, prepend=true) {
        if (!messages) return

        const conversation = this.shadowRoot.querySelector('#chat-conversation');
        if (!conversation) return

        const loader = conversation.querySelector('#loader')
        if (loader) loader.remove()

        let m = messages[messages.length - 1]
        if (m) {
            const d = formatDate(m.time)
            if (d == this.lastDate) {
                const dateElem = conversation.querySelector('wc-message-date')
                dateElem && dateElem.remove()
            }
        }

        const children = []
        messages.forEach(message => {
            children.push(...this.createMessageElement(message))
        });

        if (prepend) conversation.prepend(...children)
        else conversation.append(...children)
    }
    async renderMoreMessages() {
        const first = (await this.getMessagesById(this.activeUser.id))[0]
        const res = await API.get(API.urls.messages(this.activeUser.id, first.msg))
        if (!res.ok) return
        if (res.body.length == 0) this.activeUser.end_msgs = true

        const messages = res.body.reverse()

        this.storeMessage(this.activeUser.id, messages)
        this.renderClientMessages(messages)
    }
    async renderActiveUserMessages() {

        const chatConversation = this.shadowRoot.querySelector("#convo-messages-container")
        const messagesBody = chatConversation.querySelector('#chat-conversation');
        messagesBody.innerHTML = ``

        let targetMemberMessages = await this.getMessagesById(this.activeUser.id)
        if (!targetMemberMessages || targetMemberMessages.length == 0) {
            return
        }

        this.activeMember.hideMessageCounter()

        const lastMessage = targetMemberMessages[targetMemberMessages.length - 1]
        this.renderClientMessages(targetMemberMessages)
        this.activeMember.updateLastMessage(lastMessage)
        this.updateScroll()
        const loader = SVGs.make(
                        SVGs.loading({
                            id: 'loader',
                            width: '100%',
                            height: '2rem',
                            class:"mb-0-5"
                        })
                    )
        messagesBody.prepend(loader)
        setTimeout(() => {
            if (messagesBody.scrollTop == 0) {
                this.renderMoreMessages()
            } else {
                loader.remove()
            }
        }, 500)
    }


    displayUserMessage(message) {
        if (!message.time) message.time = (new Date()).toString()
        this.renderClientMessages([message], false)
        this.activeMember.updateLastMessage(message)

        message["sender"] = this.me.id
        message["recipient"] = this.activeUser.id
        this.storeMessage(this.activeUser.id, message)
        this.updateScroll()
        this.moveMemberElementToTop(this.activeUser)
    }

    sendMessage(event) {
        const input = this.shadowRoot.querySelector('#message-input');

        if (this.activeUser.in_convo_list === false) {
            delete this.activeUser.in_convo_list
            this.conversations.push({
                user: this.activeUser,
                last_msg: null
            })
            const membersContainer = this.shadowRoot.querySelector('.members-container');
            const member = create_element(/*html*/ `
                <wc-chat-member username="${this.activeUser.username}" data-username="${this.activeUser.username}"   data-image="${this.activeUser.profile_image}" data-id="${this.activeUser.id}" id="${this.activeUser.id}"></wc-chat-member>
            `)
            membersContainer.prepend(member)
            this.activeMember.deactivate()
            member.activate()
            this.activeMember = member
        }

        const message = input.value;
        input.value = "";
        input.focus();

        if (message) {
            if (this.activeMemberBlocked) {
                return this.displayErrorMessage(`Unblock ${this.activeUser.username} to send a message`)
            }
            const response = {
                "m": "msg",
                "clt": this.activeUser.id,
                "tp": "TXT",
                "identifier": this.me.username + getTimestamp(),
                "cnt": message,
                "status": "pending",
                "time": (new Date()).toString()
            }
            websocket.send(JSON.stringify(response));
            this.displayUserMessage(response)
        }
    }

    handleMessageSendbtn(event) {
        clearTimeout(typingTimer);

        const message = event.target.value;
        if (message) {
            websocket.send(JSON.stringify({
                "m": "typ", "clt": this.activeUser.id
            }));

            if (typingTimer)
                clearTimeout(typingTimer);

            typingTimer = setTimeout(() => {
                websocket.send(JSON.stringify({
                    "m": "styp", "clt": this.activeUser.id
                }));
            }
                , doneTypingInterval);

        }
    }

    showMembersDivElement(event) {
        const offcanvas = this.shadowRoot.querySelector("#convo-list");
        offcanvas.style["left"] = "0";
        this.showOverlay();
    }


    handleProfileCloseOffcanvas(event) {
        const offcanvas = this.shadowRoot.querySelector('#profileOffcanvas');
        offcanvas.classList.remove('show');
        this.hideOverlay();
    }

    hideMembersDivElement(event) {
        const element = this.shadowRoot.querySelector('#convo-list');
        element.style["left"] = "-200%"
        this.hideOverlay();
    }

    hideProfile(event) {
        const element = this.shadowRoot.querySelector('#user-profile');
        element.style["right"] = "-200%"
        this.hideOverlay();
    }

    showUserProfile(event) {
        const userProfile = this.shadowRoot.querySelector('#user-profile');
        userProfile.style["right"] = "0"
        this.showOverlay();
    }

    showOverlay() {
        const overlay = this.shadowRoot.querySelector('.overlay');
        overlay.classList.add('show');
    }
    hideOverlay() {
        const overlay = this.shadowRoot.querySelector('.overlay');
        overlay.classList.remove('show');
    }
    handleOverlayClick() {
        this.hideProfile();
        this.hideMembersDivElement();
    }

    createChatMember(user) {

    }
    async render() {
        if (this.conversations.length == 0) {
            const res = await API.get(API.urls.conversations)
            if (!res.ok) {
                return;
            }
            this.conversations = res.body.map(
                convo => {
                    return {...convo, user: user_defaults(convo.user)}
                }
            )
        }
        const membersContainer = this.shadowRoot.querySelector('.members-container');
        membersContainer.replaceChildren()

        this.conversations.forEach(convo => {
            const user = convo.user
            const memberElement = create_element(/*html*/ `
                <wc-chat-member
                    username="${user.username}"
                    name="${user.first_name} ${user.last_name}"
                    image="${user.profile_image}"
                    id="${user.id}"></wc-chat-member>

            `)
            membersContainer.appendChild(memberElement);
            const lastMessage = {
                status: convo.last_msg.status,
                cnt: convo.last_msg.content,
                tp: convo.last_msg.type,
                sender: convo.last_msg.sender,
                time: convo.last_msg.time
            }
            memberElement.updateLastMessage(lastMessage)
            if (convo.unseen_msgs) memberElement.displayMessageCounter(1, lastMessage, true)
        });

        const active = DATA.get('chat_active_user')
        if (active) {
            const event = {
                detail: {
                    ...active
                }
            }
            this.handleMemberClick(event)
        }
        DATA.set('chat_active_user', null)
    }

    
    async updateUnreadMemberMessages() {
        const membersContainer = this.shadowRoot.querySelector('.members-container');

        await Promise.all(this.conversations.map(async (user) => {
            if (!user.id || !user.username) {
                return
            }
            if (!this.databaseMessages.has(user.id)) {
                await this.fetchData(this.me.id, user.id)

                const member = membersContainer.querySelector(`wc-chat-member[username="${user.username}"]`);
                if (!member) {
                    return
                }

                const messages = this.databaseMessages.get(user.id)
                if (!messages || messages.length == 0) {
                    if (user.blocked == "true")
                        member.updateLastMessage("You blocked this user")
                    return
                }

                const unreadMessagesCount = this.getUnreadMessagesCount(user.id)
                const lastMessage = messages.at(-1)
                user.unreadMessagesCount = unreadMessagesCount
                user.lastMessage = lastMessage
                if (user.blocked == "true")
                    user.lastMessage = "You blocked this user"

                member.displayMessageCounter(unreadMessagesCount, lastMessage)
                member.updateLastMessage(user.lastMessage)
            }
        }))
    }

    get styles() {
        return /*css*/ `
        @import url('/themes.css');
        @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
        :host {
            display: block;
            height: 100%;
            width: 100%;
        }


        .members-container {
            overflow: auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
        }

        .chat-header {
            height: 50px;
            color: #385a64;
        }

        .search-container {
            position: relative;
            color: white;
            display: flex;
        }

        #chat-conversation {
            position: absolute;
            top : 0;
            left: 0;
            height: 100%;
            width: 100%;

            overflow: auto;
        }

        #input-message-container {
            display: none;
        }

        #user-profile {
            min-width: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: width 0.3s ease;
            overflow: auto;
            gap: 8px;
            height: 100%;
        }
        .profile-wrapper {
            position: absolute;
            width: 100%;
            left: 0;
            top: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            justify-content: center;
            align-items: center;
        }

        .profile-info {
            width: 100%;
        }

        .invite-game-container {
            width: 100%;
        }


        .search-icon {
            position: absolute;
            left: 1em;
            top: 50%;
            transform: translateY(-50%);
            width: 1.5rem;
            height: 1.5rem;
            pointer-events: none;
        }

        #convo-search:focus {
            outline: none;
            border-color: #ccc;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
        }

        #convo-search {
            padding: 10px;
            padding-left: 3rem;
            width: 100%;
        }

        .member {
            width: 100%;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 0.5em;
        }

        .profile-pic {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 14px;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        #user-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .convo-username {
            font-weight: bold;
        }

        .convo-user-status {
            font-size: 12px;
        }

        #user-convo-header {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 2px;
        }

        #list-icon-container .list-icon,
        .profile-icon-container .profile-icon {
            display: none;
        }

        /* profile offcanvas */


        #conversation-background {
            object-fit: contain;
            width: 100%;
            height: 100%;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 5;
            display: none;
        }

        .overlay.show {
            display: block;
        }

        #user-profile,
        #user-header-container {
            display: none;
        }


        #unblock-btn {
            border-radius: 6px;
        }
        /* input message */



        #message-input:focus {
            outline: none;
            border-color: #ccc;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
        }

        .last-message {
            font-size: 0.8em;
            color: #6c757d;
        }

        .add-file-icon {
            cursor: pointer;
        }

        #send-btn-icon {
            cursor: pointer;
            display: block;
        }

        #send-btn-icon.visible {
            display: block;
        }

        .custom-file-upload {
            background-color: blue;
            border: 1px solid #ccc;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }

        input[type="file"] {
            display: none;
        }

        .return-icon-container {
            display: none;
        }
        #invite-game-container {
            display: none;
        }
        #invite-game-icon {
            cursor: pointer;
        }


        /*  drop down content */

        .dropdown-content {
            display: none;
            position: absolute;
            background-color: #022f40;
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
            flex-direction: column;
            z-index: 15;
            border-radius: 12.5px;
            border-bottom-left-radius: 12.5px;
            border: 1px solid #161720;
            bottom: 100%;
            border-bottom-left-radius: 0px;
            left: 0;
            transition: all 0.3s ease-in-out;
        }

        .dropdown-content dt:hover {
            background: #e0e0e0;
            color: #022f40;
            cursor: pointer;
        }

        .dropdown-content dt {
            color: white;
            font-size: 14px;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
        }

        .dropdown-content h5 {
            border-top-right-radius: 7.5px;
            border-top-left-radius: 7.5px;
            color: white;
            padding: 10px 10px;
            display: block;
            background-color: #161720;
        }

        .block-container {
            background: #022f40;
            background-color: var(--glass-color);
            width: 100%;
            color: white;
            padding: 10px;
            border-radius: 7.5px;
            padding-right: 10px;
            display: none;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            justify-content: space-evenly;
        }

        .invite-game-container {
            transition: all 0.3s ease;
        }

        #friends .up { display: none}
        #friends.grow .up { display: initial; }
        #friends.grow .down { display: none; }
        #friends #friendsList { opacity: 0; }
        #friends.grow #friendsList { opacity: 1; }
        #friendsList > div {
            scrollbar-width: thin;
            scrollbar-color: var(--glass-color) transparent;
            scrollbar-gutter: stable;
        }
        #friendsList > div::-webkit-scrollbar-thumb {
            background: lime;
            border-radius: 4rem;
        }
        #friendsList > div::-webkit-scrollbar {
            background: lime;
            width: 4px;
        }

        /* break points */
        @media (max-width: 1200px) {
            #user-profile {
                position: absolute;
                top: 0;
                right: -200%;
                height: 100%;
                transition: right 0.3s ease-in-out;
                z-index: 20000;
                background-color: var(--glass-color);
            }

            .profile-icon-container .profile-icon {
                display: initial !important;
                width: 30px;
                height: 30px;
            }
        }


        @media (max-width: 800px) {
            #convo-list {
                position: absolute;
                top: 0;
                left: -200%;
                height: 100%;
                transition: right 0.3s ease-in-out;
                z-index: 20000;
                box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
                background-color: var(--dark-color-3) !important;
                padding: .75rem;
            }

            #min {
                width: 100px;
                height: 100px;
                background-color: red;
            }

            #list-icon-container .list-icon,
            .profile-icon-container .profile-icon {
                display: initial !important;
                cursor: pointer;
                margin-right: 10px;
            }

            .return-icon-container {
                display: initial !important;
                position: fixed;
                top: 2%;
                left: 2%;
                cursor: pointer;
            }

            .return-icon {
                width: 2.5rem;
            }
        }
        `
    }
    get conversationsHtml() {
        const friends = DATA.get('auth_user').friends
        return /*html*/ `
            <div id="convo-list" class="column gap-2 transition-med mh-100">
                
                <div class="search-container">
                    <svg class="search-icon" stroke="white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <input type="search" id="convo-search" placeholder="Search" class="color-light-1 bg-none border-glass rounded-0-5">
                </div>
                <div class="column grow gap-2">
                    <div id="friends" class="relative column transition-med">
                        <div class="overflow-hidden column grow">
                            <div class="column grow border-glass rounded-0-5 pointer hover-brighten transition-med">
                                <div id="showFriendsList" class="flex space-between p-2 align-center">
                                    <h4 class="fw-300 m-0">Friends</h4>
                                    ${
                                        SVGs.chevron_down({ width: '1.5rem', stroke: 'silver', class: "down" })
                                    }
                                    ${
                                        SVGs.chevron_up({ width: '1.5rem', stroke: 'silver', class: "up" })
                                    }
                                </div>
                                <div id="friendsList" class="relative grow transition-fast">
                                    <div class="absolute top-0 left-0 p-0-5 pe-0 w-100 h-100 overflow-auto">
                                        ${
                                            friends.map(f => {
                                                const friend = user_defaults(f)
                                                return /*html*/ `
                                                    <wc-chat-member
                                                        data-name="${friend.first_name} ${friend.last_name}"
                                                        data-username="${friend.username}"
                                                        data-image="${friend.profile_image}"
                                                        data-id="${friend.id}"></wc-chat-member>
                                                `
                                            }).join('') || '<div class="text-center fs-3 color-glass p-3">You Don\'t Have Friends :(</div>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="relative grow">
                        <div class="members-container" style="gap: 2px;">
                            ${
                                SVGs.loading({
                                    width: '2rem',
                                    class: 'align-self-center'
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        `
    }
    
    html() {
        return /*html*/`                
            <style>
                ${ this.styles }
            </style>
            <div class="chat-container relative flex gap-0-5 h-100 w-100 p-0-5 overflow-hidden">
                ${ this.conversationsHtml }

                <div id="convo-messages-container" class="h-100 column gap-0-5 grow transition-med">
                    
                    <div id="user-header-container" class="border-glass rounded-0-5">
                        <div class="member">
                            <div id="user-convo-header">
                                <div id="list-icon-container">
                                    <svg class="list-icon" fill="silver" width="2.5rem" viewBox="0 0 256 256" id="Flat">
                                        <path 
                                            stroke-width="12" stroke-linecap="round" stroke="silver"
                                            d="M28 64 h200 M28 128 h200 M28 192 h200"  />
                                    </svg>
                                </div>
                                <div class="profile-pic">
                                    <img id="user-image" src="/assets/after.png" alt="profile picture" class="img-fluid">
                                </div>
                                <div class="convo-user-heaader-info">
                                    <div class="convo-username">username</div>
                                    <div class="convo-user-status"> online</div>
                                </div>
                            </div>
                            <div class="profile-icon-container p-2">
                                <img class="profile-icon" src="/assets/info.svg">
                            </div>
                        </div>
                    </div>

                    <div class="relative grow">
                            <div id="chat-conversation" class="p-3 border-glass rounded-0-5" class="position-relative">
                    

                            <img id="conversation-background" src="/assets/back.svg" />
                            <div class="return-icon-container p-2">
                                <svg class="return-icon" fill="silver" viewBox="0 0 256 256" id="Flat">
                                    <path 
                                        stroke-width="12" stroke-linecap="round" stroke="silver"
                                        d="M28 64 h200 M28 128 h200 M28 192 h200"  />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div id="input-message-container" class="align-center">
                        <div class="dropdown">
                            ${
                                SVGs.game_pad({
                                    id:"invite-game-icon",
                                    fill: 'white',
                                    width: '2.5rem'
                                })
                            }
                            <div class="dropdown-content">
                                <h5>Invite Friend</h5>
                                <dl>
                                    <dt id="ping-pong">Ping pong</dt>
                                    <dt id="slap-hand">Hand Slap</dt>
                                </dl>
                            </div>
                        </div>

                        <input id="message-input" type="text" placeholder="Type a message" class="bg-glass border-0 grow p-3 rounded-0-5 color-light-1 ml-0-5">
                        ${
                            SVGs.send({
                                id: "send-btn-icon",
                                width: '3rem',
                                stroke: 'white',
                                class: 'ml-0-5'
                            })
                        }
                        </svg>
                    </div>
                </div>

                <div id="user-profile" class="p-2">
                    <div class="relative grow" style="height: 100% ;width: 100%;">
                         <div class="profile-wrapper" style="">
                            <div class="profile-info"></div>
                            <div class="invite-game-container"></div>
                            <div class="block-container">
                                you blocked this Contact
                                <button id="unblock-btn" class="btn btn-danger"> unblock </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="overlay" id="overlay"></div>
            </div>
        `
    }
}