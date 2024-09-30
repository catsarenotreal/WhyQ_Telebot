import { Bot, Context, InlineKeyboard, Keyboard } from "grammy";
import express from "express";
import axios from "axios";
import menu_data from './2024-09-30_menu_data.json';

import cron from 'node-cron';


// Cron jobs

const justin_reminder_cron = cron.schedule('30 11 * * 1-3', () => {
  SubmitWhyQFoodReminder();
  console.log("Justin reminder Sent!")
})

const feedback_reminder_cron = cron.schedule('20 13 * * 1-5', () => {
  SubmitFeedbackReminder();
  console.log("Feedback reminder Sent!")
})




// Global Stuff

const app = express();
const token = "7920055205:AAEfvvxkKN9WjLydTOIP9djwLCph-CIE9D8"

const command_start = {
  name: "start",
  description: "talks shit about justin",
  usage: "/start",
  example: "/start",
  handler: async (ctx : Context) => {
    await ctx.reply("justin is trash")
  }
}

const bot = new Bot(token); 

bot.command("remind", () => {
  axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chat_id,
    text: "hell yeah"
  });
})
const telegram_url = "https://api.telegram.org/bot" + token 


// TODO: obtain chat id of the actual group
const chat_id = "-1002323410867" // testing group

const date_today = new Date().toLocaleDateString('sv-SE') // sv's format is in yyyy-mm-dd


// Function to post message

const postMessage = (message : string) => {
  
  axios.post(telegram_url + "/sendMessage", {
      chat_id: chat_id,
      text: message
    }
  );
  
}


// Function to remind Justin --> only Mondays, Tuesdays, Weds
// if new Date().getDay() < 3 , send this message at 11pm

const SubmitWhyQFoodReminder = () => { 

  const day_today = new Date().getDay()

  let reminder_message;

  if (day_today === 1) {
    reminder_message = "Justin it's Monday please submit your WhyQ"
  }
  else if (day_today === 2) {
    reminder_message = "Justin stop trying to test yourself it's Tuesday submit your WhyQ can"
  }
  else if (day_today === 3) {
    reminder_message = "Justin if you don't submit the WhyQ now it's gonna be joever"
  }

  postMessage(reminder_message)

}


// Function to remind people to do the daily survey --> everyday, send at 1.20pm

const SubmitFeedbackReminder = () => { // maybe also a reminder to kup leftover foods

  const reminder_message : string = "Hi pretty please please please submit your WhyQ survey for today's (" + date_today + ") food\n"+
                                    "Also, if you want to get the leftover foods now is probably the time to go for it"
  // TODO : include a link to the private chat

  postMessage(reminder_message)

}


// Function to conduct survey --> takes fooditems that is known to have been on the menu on today's date 
// comes together with the submitfeedbackreminder

const RequestFoodFeedback = () => {


  // Payload Template

  var feedbackData = { 
    'FoodItem': "If you're reading this I fucked up somewhere: FoodItem",
    'Rating' : "If you're reading this I fucked up somewhere: Rating",
    'WouldOrderAgain' : "If you're reading this I fucked somewhere: WouldOrderAgain"
  }

  var menuState : number = 1; // Which menu interface should be displayed


  // Menu Text

  const menuText = (qn_num : number, foodInput : string = "temp", ratingInput : string = "temp" ) : string => {
    if (qn_num === 1){
      return "<b> What did you eat today? </b>\n" + menu_list_text;
    }
    else if (qn_num === 2){
      return "<b> How was your lunch today? (1 for worst, 5 for best) </b>\n\nYou have eaten:\n" + foodInput
    }
    else if (qn_num === 3){
      return "<b> Will you order it again? </b>  \n\nYou have eaten:\n" + foodInput + "\nYou rated it:\n" + ratingInput
    }
    return ""
  }


  // Completed Survey Text

  const completeSurveyText = (foodInput, ratingInput, wouldOrderInput) => 
            "SURVEY SUBMITTED FOR " + date_today + "\n" +
            "==============================\n" +
            "Food: " + foodInput + "\n" +
            "Rating: " + ratingInput + "\n" +
            "Would Order Again: " + wouldOrderInput
            "==============================\n" +
            "Reminder: Go get the leftovers if you haven't already"
  


  // Button Text and values
  
  var filtered_data = menu_data.filter((entry) => entry['date'] == date_today) 


  // Creating the options for the different menu buttons

  var num_to_item = new Map()

  var menu_list_text = "";
  for (let i = 0; i < filtered_data.length; i++){
    menu_list_text += i + ": " + filtered_data[i]['menu item'].toString() + '\n'
    num_to_item.set(i.toString(), filtered_data[i]['menu item'].toString())
  }

  let num = 0;

  const food_options = filtered_data.map((entry) => 
     [(num++).toString(), num.toString()]
  )
  
  const rating_options = [
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["4", "4"],
    ["5", "5"]
  ]
  const yesno = [
    ["Yes", "Yes"],
    ["No", "No"]
  ]


  // Creating the Keyboards 
  const backButton = InlineKeyboard.text("Back", "Back")

  const foodButtonRows = food_options.reduce<any>((acc, [txt, data], i) => {
    if (i % 5 === 0) acc.push([]); // Start a new sublist every 5 elements
    acc[acc.length - 1].push(InlineKeyboard.text(txt, data)); // Push the current number into the last sublist
    return acc;
  }, []);
  const food_keyboard = InlineKeyboard.from(foodButtonRows)

  const numberButtonRows = rating_options.map(([txt, data]) => [InlineKeyboard.text(txt, data)])
  numberButtonRows.push([backButton])
  const rating_keyboard = InlineKeyboard.from(numberButtonRows)

  const yesNoButtonRows = yesno.map(([txt, data]) => [InlineKeyboard.text(txt, data)])
  yesNoButtonRows.push([backButton])
  const yesno_keyboard = InlineKeyboard.from(yesNoButtonRows)



  // To initialise the /menu command

  bot.command("menu", async (ctx) => {
    await ctx.reply(menuText(1), {
      parse_mode: "HTML",
      reply_markup: food_keyboard,
    });
  });


  // For Back Button

  bot.callbackQuery("Back", async (ctx) => {
    //Update message content with corresponding menu section
    await ctx.editMessageText(menuState === 2 ? menuText(1) : menuText(2, feedbackData['FoodItem']), {
      reply_markup: menuState === 2 ? food_keyboard : rating_keyboard, // If not 2 then is 3 alr
      parse_mode: "HTML",
    });
    menuState--;
  
  });


  // Automatic progression in submission

  bot.on("callback_query:data", async (ctx) => {

    if (menuState === 3){
      console.log("done");
      feedbackData['WouldOrderAgain'] = ctx.callbackQuery.data
      
      await ctx.editMessageText(completeSurveyText(feedbackData['FoodItem'], feedbackData['Rating'], feedbackData['WouldOrderAgain']))
      menuState = 1;


      // await axios.post("", feedbackData) // cannot transfer to cloud service as per rakuten policy lmao
      return;
    }

    await ctx.editMessageText(menuState === 1 ? menuText(2, num_to_item.get(ctx.callbackQuery.data)) : menuText(3, feedbackData['FoodItem'], ctx.callbackQuery.data), {
      reply_markup: menuState === 1 ? rating_keyboard : yesno_keyboard,
      parse_mode: "HTML",
    });

    if (menuState === 1){
      feedbackData['FoodItem'] = num_to_item.get(ctx.callbackQuery.data)
    }
    else if (menuState === 2){
      feedbackData['Rating'] = ctx.callbackQuery.data
    }

    menuState++;

  });

}





axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
  chat_id: chat_id,
  text: "start test"
});

RequestFoodFeedback();


bot.start()