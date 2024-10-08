import { Bot, Context, InlineKeyboard, Keyboard } from "grammy";
import express from "express";
import cron from "node-cron";
import { Menu, FeedbackData, PrivateChatId } from "./types";
import {
  TELEGRAM_URL,
  BOT_TOKEN,
  CHAT_ID,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
} from "./constants";
import { beginBot, getUpdates, sendMessage, sendPrivateChatMessage } from "./services/axios";
import { retrieveMenuItems, retrieveMenuItemsTestFunction, addReview, addNewUserChatId, retrieveAllPrivateUsers} from "./services/mysql";
// ===================================


// Global Stuff

const app = express();
app.use(express.json());

const currentDate = new Date().toLocaleDateString("sv-SE"); // sv's format is in yyyy-mm-dd
// ok so this needs to be re-called everyday because else it oesn't work
// TODO : figure out how this may need to work

const bot = new Bot(BOT_TOKEN);



// ===================================

// Function to remind Justin --> only Mondays, Tuesdays, Wednesdays

const SubmitWhyQFoodReminder = () => {
  const currentDay = new Date().getDay(); // TODO : settle this also

  const reminderMessage =
    currentDay === MONDAY
      ? "Justin it's Monday please submit your WhyQ"
      : currentDay === TUESDAY
        ? "Justin stop trying to edge yourself it's Tuesday submit your WhyQ can"
        : "Justin if you don't submit the WhyQ now it's gonna be joever";

  sendMessage(reminderMessage);
};

// Function to remind people to do the daily survey --> everyday, send at 1.20pm

async function broadcastPrivateChatMessage(message : string) {
  var all_private_chats = (await retrieveAllPrivateUsers()) as PrivateChatId[];

  all_private_chats.map((chat) => sendPrivateChatMessage(chat['chat_id'], message))
}

const SubmitFeedbackReminder = () => {
  const reminder_message: string =
    "Hi pretty please please please submit your WhyQ survey for today's (" +
    currentDate +
    ") food via /survey \n" +
    "Also, if you want to get the leftover foods now is probably the time to go for it\n" +
    ">>>> And avoid Lihoon <<<<";

  broadcastPrivateChatMessage(reminder_message)
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
    questionNumber: number,
    foodInput: string = "temp",
    ratingInput: string = "temp",
  ): string => {
    if (questionNumber === 1) {
      return "<b> What did you eat today? </b>\n" + menuList;
    } else if (questionNumber === 2) {
      return (
        "<b> How was your lunch today? (1 for worst, 5 for best) </b>\n\nYou have eaten:\n" +
        foodInput
      );
    } else if (questionNumber === 3) {
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
    currentDate +
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
    "Reminder: Go get the leftovers if you haven't already" +
    "\n" +
    "Also please don't submit multiple surveys a day - it seemed like a rabbit hole into other functions like edit so I didn't implement a check for this so please spare me the pain" +
    "\n" +
    "And doing so means database schema has to be changed and I can't store reviews anonymously so ^_^";

  // Button (Keyboard) Texts

  var filtered_data = (await retrieveMenuItemsTestFunction()) as Menu[]; // TODO : change to retrieveMenuItems() when not in testing

  var num_to_item = new Map(); // local index --> food item name -->

  var menuList = "";
  for (let i = 0; i < filtered_data.length; i++) {
    menuList += i + ": " + filtered_data[i]["menu_item"] + "\n";
    num_to_item.set(i.toString(), [
      filtered_data[i]["menu_item"],
      filtered_data[i]["item_id"],
    ]);
  }

  let num = 0;

  const foodOptions = filtered_data.map((entry) => [
    num.toString(),
    (num++).toString(),
  ]);

  const ratingOptions = [
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

  const foodButtonRows = foodOptions.reduce<any>((acc, [txt, data], i) => {
    if (i % 5 === 0) acc.push([]); // Start a new sublist every 5 elements
    acc[acc.length - 1].push(InlineKeyboard.text(txt, data)); // Push the current number into the last sublist
    return acc;
  }, []);
  const foodKeyboard = InlineKeyboard.from(foodButtonRows);

  const numberButtonRows = ratingOptions.map(([txt, data]) => [
    InlineKeyboard.text(txt, data),
  ]);
  numberButtonRows.push([backButton]);
  const ratingKeyboard = InlineKeyboard.from(numberButtonRows);

  const yesNoButtonRows = yesno.map(([txt, data]) => [
    InlineKeyboard.text(txt, data),
  ]);
  yesNoButtonRows.push([backButton]);
  const yesno_keyboard = InlineKeyboard.from(yesNoButtonRows);

  // To initialise the /survey command. Creates a new survey and can only be used within a PM (as opposed to group)
  // Only allows once a day. MAYBE TODO : implement a check for once a day per user

  bot
    .command("survey", async (ctx) => {
      await ctx.reply(menuText(1), {
        parse_mode: "HTML",
        reply_markup: foodKeyboard,
      });
    }) 
  

  // For Back Button
  bot.callbackQuery("Back", async (ctx) => {
    //Update message content with corresponding menu section
    await ctx.editMessageText(
      menuState === 2
        ? menuText(1)
        : menuText(2, num_to_item.get(feedbackData["FoodItem"])[0]),
      {
        reply_markup: menuState === 2 ? foodKeyboard : ratingKeyboard, // If not 2 then is 3 alr
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
        reply_markup: menuState === 1 ? ratingKeyboard : yesno_keyboard,
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

// Get ChatIds for private messages and put into a database because there is no API for this (also only one group so manual)

bot.command("start", (ctx) => {
  if (ctx.chat.type === "private") addNewUserChatId(ctx.chat.id.toString());
}); 


// ===================================

// Enabled Commands

beginBot(); // runs whenever the code executes, diff from bot.start() - should probably remove
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
