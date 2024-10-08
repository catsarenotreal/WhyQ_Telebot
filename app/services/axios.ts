import axios from "axios";
import { TELEGRAM_URL, BOT_TOKEN, CHAT_ID } from "../constants";

export const getUpdates = () => { // TODO : figure out now what i can do with this anymore
  axios.get(TELEGRAM_URL + "/getUpdates").then((result) => {
    // var res = JSON.stringify(result.data.message);
    console.log(result.data);
    // console.log(result.data)
    // console.log(res)
    // console.log(res.result[0].message.chat.id.toString());
  });
};

export const beginBot = () => {
  axios.post(TELEGRAM_URL + '/sendMessage', {
    // This begins the bot. Only posts once.
    chat_id: CHAT_ID,
    text: "Bot has begun! Fuck you Justin",
  });
};

export const sendPrivateChatMessage = (private_chat_id: string, message: string) => { 
  // Used for broadcasting


  axios.post(TELEGRAM_URL + "/sendMessage", {
    chat_id: private_chat_id,
    text: message,
  });
}

export const sendMessage = (message: string) => {  // only for group
  axios.post(TELEGRAM_URL + "/sendMessage", {
    chat_id: CHAT_ID,
    text: message,
  });
};
