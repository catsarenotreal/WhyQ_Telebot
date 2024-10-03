import { Bot, Context, InlineKeyboard, Keyboard } from "grammy";
import express from "express";
import cron from "node-cron";
import mysql from "mysql2";
import { Menu, FeedbackData } from "./types";
import { TELEGRAM_URL, BOT_TOKEN, CHAT_ID } from "./constants";
import { beginBot, getUpdates, sendMessage } from "./services/axios";
// ===================================

// Global Stuff

const app = express();
app.use(express.json());

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "telebot_schema",
});

module.exports = connection;

const date_today = new Date().toLocaleDateString("sv-SE"); // sv's format is in yyyy-mm-dd

// const command_start = {
//   name: "start",
//   description: "talks shit about justin",
//   usage: "/start",
//   example: "/start",
//   handler: async (ctx : Context) => {
//     await ctx.reply("justin is trash")
//   }
// }

const bot = new Bot(BOT_TOKEN);

// ===================================

// Get ChatIds for private messages and put into a database because there is no API for this (also only one group so manual)
const getPMChatId = () => {
  getUpdates();
};

bot.on("message", () => {
  getPMChatId();
});

// ===================================

// Function to remind Justin --> only Mondays, Tuesdays, Wednesdays

const SubmitWhyQFoodReminder = () => {
  const day_today = new Date().getDay();

  let reminder_message;

  if (day_today === 1) {
    reminder_message = "Justin it's Monday please submit your WhyQ";
  } else if (day_today === 2) {
    reminder_message =
      "Justin stop trying to edge yourself it's Tuesday submit your WhyQ can";
  } else if (day_today === 3) {
    reminder_message =
      "Justin if you don't submit the WhyQ now it's gonna be joever";
  }

  sendMessage(reminder_message);
};

// Function to remind people to do the daily survey --> everyday, send at 1.20pm

const SubmitFeedbackReminder = () => {
  const reminder_message: string =
    "Hi pretty please please please submit your WhyQ survey for today's (" +
    date_today +
    ") food\n" +
    "Also, if you want to get the leftover foods now is probably the time to go for it\n" +
    ">>>> And avoid Lihoon <<<<";

  sendMessage(reminder_message, true);
};

// Function to conduct survey, the actual form--> takes fooditems that is known to have been on the menu on today's date

async function RequestFoodFeedback() {
  // Payload Template

  const feedbackData: FeedbackData = {
    FoodItem: "If you're reading this I fucked up somewhere: FoodItem", // takes the local index
    Rating: "If you're reading this I fucked up somewhere: Rating",
    WouldOrderAgain:
      "If you're reading this I fucked somewhere: WouldOrderAgain",
  };

  // State of the menu interface that should be displayed

  var menuState: number = 1;

  // Menu Text

  const menuText = (
    qn_num: number,
    foodInput: string = "temp",
    ratingInput: string = "temp",
  ): string => {
    if (qn_num === 1) {
      return "<b> What did you eat today? </b>\n" + menu_list_text;
    } else if (qn_num === 2) {
      return (
        "<b> How was your lunch today? (1 for worst, 5 for best) </b>\n\nYou have eaten:\n" +
        foodInput
      );
    } else if (qn_num === 3) {
      return (
        "<b> Will you order it again? </b>  \n\nYou have eaten:\n" +
        foodInput +
        "\nYou rated it:\n" +
        ratingInput
      );
    }
    return "";
  };

  // Completed Survey Text

  const completeSurveyText = (foodInput, ratingInput, wouldOrderInput) =>
    "SURVEY SUBMITTED FOR " +
    date_today +
    "\n" +
    "==============================\n" +
    "Food: " +
    foodInput +
    "\n" +
    "Rating: " +
    ratingInput +
    "\n" +
    "Would Order Again: " +
    wouldOrderInput;
  "==============================\n" +
    "Reminder: Go get the leftovers if you haven't already";

  // Button (Keyboard) Texts

  var filtered_data = (await retrieveMenuItems()) as Menu[];

  var num_to_item = new Map(); // local index --> food item name -->

  var menu_list_text = "";
  for (let i = 0; i < filtered_data.length; i++) {
    menu_list_text += i + ": " + filtered_data[i]["menu_item"] + "\n";
    num_to_item.set(i.toString(), [
      filtered_data[i]["menu_item"],
      filtered_data[i]["item_id"],
    ]);
  }

  let num = 0;

  const food_options = filtered_data.map((entry) => [
    (++num).toString(),
    num.toString(),
  ]);

  const rating_options = [
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["4", "4"],
    ["5", "5"],
  ];
  const yesno = [
    ["Yes", "Yes"],
    ["No", "No"],
  ];

  // Creating the Keyboards with above texts

  const backButton = InlineKeyboard.text("Back", "Back");

  const foodButtonRows = food_options.reduce<any>((acc, [txt, data], i) => {
    if (i % 5 === 0) acc.push([]); // Start a new sublist every 5 elements
    acc[acc.length - 1].push(InlineKeyboard.text(txt, data)); // Push the current number into the last sublist
    return acc;
  }, []);
  const food_keyboard = InlineKeyboard.from(foodButtonRows);

  const numberButtonRows = rating_options.map(([txt, data]) => [
    InlineKeyboard.text(txt, data),
  ]);
  numberButtonRows.push([backButton]);
  const rating_keyboard = InlineKeyboard.from(numberButtonRows);

  const yesNoButtonRows = yesno.map(([txt, data]) => [
    InlineKeyboard.text(txt, data),
  ]);
  yesNoButtonRows.push([backButton]);
  const yesno_keyboard = InlineKeyboard.from(yesNoButtonRows);

  // To initialise the /survey command. Creates a new survey and can only be used within a PM (as opposed to group)

  bot
    .command("survey", async (ctx) => {
      await ctx.reply(menuText(1), {
        parse_mode: "HTML",
        reply_markup: food_keyboard,
      });
    })
    .chatType("private");

  // For Back Button

  bot.callbackQuery("Back", async (ctx) => {
    //Update message content with corresponding menu section
    await ctx.editMessageText(
      menuState === 2
        ? menuText(1)
        : menuText(2, num_to_item.get(feedbackData["FoodItem"])[0]),
      {
        reply_markup: menuState === 2 ? food_keyboard : rating_keyboard, // If not 2 then is 3 alr
        parse_mode: "HTML",
      },
    );
    menuState--;
  });

  // Automatic progression in submission

  bot.on("callback_query:data", async (ctx) => {
    if (menuState === 3) {
      console.log("done");
      feedbackData["WouldOrderAgain"] = ctx.callbackQuery.data;

      await ctx
        .editMessageText(
          completeSurveyText(
            num_to_item.get(feedbackData["FoodItem"])[0],
            feedbackData["Rating"],
            feedbackData["WouldOrderAgain"],
          ),
        )
        .then(() => {
          // console.log(feedbackData)
          feedbackData["FoodItem"] = num_to_item.get(
            feedbackData["FoodItem"],
          )[1];
        });
      menuState = 1;

      addReview(feedbackData);
      return;
    }

    await ctx.editMessageText(
      menuState === 1
        ? menuText(2, num_to_item.get(ctx.callbackQuery.data)[0])
        : menuText(
            3,
            num_to_item.get(feedbackData["FoodItem"])[0],
            ctx.callbackQuery.data,
          ),
      {
        reply_markup: menuState === 1 ? rating_keyboard : yesno_keyboard,
        parse_mode: "HTML",
      },
    );

    if (menuState === 1) {
      feedbackData["FoodItem"] = ctx.callbackQuery.data;
    } else if (menuState === 2) {
      feedbackData["Rating"] = ctx.callbackQuery.data;
    }

    menuState++;
  });
}

// ===================================

// Enabled Commands

beginBot();
RequestFoodFeedback(); // The feedback form

// ===================================

// Cron jobs

const justin_reminder_cron = cron.schedule("30 11 * * 1-3", () => {
  // Monday to Wednesday, 11.30am -- Sent in group
  SubmitWhyQFoodReminder();
  console.log("Justin reminder Sent!");
});

const feedback_reminder_cron = cron.schedule("20 13 * * 1-5", () => {
  // Monday to Friday, 1.20pm -- Sent only via PM
  SubmitFeedbackReminder();
  console.log("Feedback reminder Sent!");
});

// ===================================

// Start bot

bot.start();
