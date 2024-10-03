import axios from "axios";
import { TELEGRAM_URL, BOT_TOKEN, CHAT_ID } from "../constants";

export const getUpdates = () => {
  axios.get(TELEGRAM_URL + "/getUpdates").then((result) => {
    // var res = JSON.stringify(result.data.message);
    console.log(result.data);
    // console.log(result.data)
    // console.log(res)
    // console.log(res.result[0].message.chat.id.toString());
  });
};

export const beginBot = () => {
  axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    // This begins the bot. Only posts once.
    chat_id: CHAT_ID,
    text: "Bot Begin",
  });
};

export const sendMessage = (message: string, isPrivate: boolean = false) => {
  axios.post(TELEGRAM_URL + "/sendMessage", {
    chat_id: CHAT_ID,
    text: message,
  });
};
