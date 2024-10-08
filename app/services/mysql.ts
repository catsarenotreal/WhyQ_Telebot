import mysql from "mysql2";
import { FeedbackData } from "../types";
const SQL_CONNECTION = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "telebot_schema",
});

export async function addNewUserChatId(chatId : string) {
  // Post

  await SQL_CONNECTION.promise().query(
    `insert ignore into chatids (chat_id) values (${chatId});`,
  );

  console.log('Added user')
}

export async function retrieveAllPrivateUsers() {
  // Get

  const [rows, fields] = await SQL_CONNECTION.promise().query(
    "select chat_id from chatids;", 
  );
  return rows;

}

export async function retrieveMenuItems() {
  // Get

  const [rows, fields] = await SQL_CONNECTION.promise().query(
    "select menu_item, restaurant, item_id from menuitems where date = curdate();", // NOTE : for testing, need to change date where the item exists
  );
  return rows;
}



export async function retrieveMenuItemsTestFunction() {
  // For testing only

  const [rows, fields] = await SQL_CONNECTION.promise().query(
    "select menu_item, restaurant, item_id from menuitems where date = date('2024-10-15');", // NOTE : for testing, need to change date where the item exists
  );
  return rows;

}

export async function addReview(feedbackData: FeedbackData) {
  // Post

  await SQL_CONNECTION.promise().query(
    `insert into reviews (item_id, rating, order_again) values ( ${feedbackData["FoodItem"]}, ${feedbackData["Rating"]}, "${feedbackData["WouldOrderAgain"]}");`,
  );

  console.log("Added review");
}
