
import API from "../../../networking.js";
import { notify } from "../../../utils/index.js";
import { Notification } from "../../Notifier.js";

let socket = null
let tries = 0

export let websocket = {
    send: (s) => {
        socket.send(s)
    }
}

export const connect = async () => {
    if (tries > 20) notify(new Notification('Websocket time out'))
    tries++
    const res = await API.get('/api/chat/ticket/')
    if (res.ok) {
        let url = `${location.origin}/ws/chat/room/${res.body.ticket}/`
        url = url.replace('http', 'ws')
        socket = new WebSocket(url);
        socket.onmessage = (e) => {
            const message = JSON.parse(e.data);
            window.dispatchEvent(new CustomEvent('socket:message', {
                composed: true,
                bubbles: true,
                cancelable: true,
                detail: message
            }))
        }
        socket.onclose = () => connect()
    }
}


export const soket = {
    send: () => {}
}

export function sendMessage(message) {
	// code
}


export   function  replaceChar(str, oldChar, newChar) {
    if (typeof str !== 'string') {
      return;
    }
  
    return str.replace(new RegExp(oldChar, 'g'), newChar);
}

export async function getData(user1, user2) {
	const url = `/api/chat/messages/?user1=${user1}&user2=${user2}`;
	try {
	  const response = await fetch(url);
	  if (!response.ok) {
		  throw new Error(`Response status: ${response.status}`);
		}
		
		const body = await response.json();
		if (body.message == "Invalid request: user1 and user2 are required")
			return null
		return body
	}
	catch (error) {
		return null
	}
}

export function getCurrentTime() {
    const now = Date.now();
    const formattedTime = new Date(now).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });
    return formattedTime
}


export function formatDate(date) {
    if (!date) return
    const today = new Date();
    const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const d = new Date(date);

    const same_month_and_year = (d1, d2) => {
        return d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear()
    }

    if (d.getDate() == today.getDate() && same_month_and_year(d, today)) {
        return "Today";
    }
    else if (d.getDate() == yesterday.getDate() && same_month_and_year(d, yesterday)) {
        return "Yesterday";
    }
    else {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
}


export function formatTime(time, format = '12-hour') {
    if (!time) return 
    // Check if the input is already in 12-hour format (HH:mm AM/PM)
    const twelveHourRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
    const match = time.match(twelveHourRegex);
    
    if (match) {
        const [_, hours, minutes, meridiem] = match;
        
        if (format === '24-hour') {
            // Convert from 12-hour to 24-hour
            let hour = parseInt(hours);
            if (meridiem === 'PM' && hour !== 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            return `${String(hour).padStart(2, '0')}:${minutes}`;
        }
        return time; // Return as-is if already in 12-hour format and 12-hour is requested
    }
    
    // Check if input is in 24-hour format (HH:mm)
    const twentyFourHourRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match24 = time.match(twentyFourHourRegex);
    
    if (match24) {
        const [_, hours, minutes] = match24;
        let hour = parseInt(hours);
        
        if (format === '12-hour') {
            // Convert from 24-hour to 12-hour
            const meridiem = hour >= 12 ? 'PM' : 'AM';
            if (hour > 12) hour -= 12;
            if (hour === 0) hour = 12;
            return `${hour}:${minutes} ${meridiem}`;
        }
        return `${String(hour).padStart(2, '0')}:${minutes}`; // Return as-is if 24-hour format is requested
    }
    
    // Try parsing as ISO string if neither format matches
    try {
        const date = new Date(time);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        const hours = date.getUTCHours();
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        
        if (format === '12-hour') {
            const meridiem = hours >= 12 ? 'PM' : 'AM';
            const hour = hours % 12 || 12;
            return `${hour}:${minutes} ${meridiem}`;
        } else {
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        }
    } catch (error) {
        return 'Invalid date';
    }
}