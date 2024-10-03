import mysql from "mysql2";
import { FeedbackData } from "../types";
const SQL_CONNECTION = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "telebot_schema",
});

async function retrieveMenuItems() {
  // Get
  const [rows, fields] = await SQL_CONNECTION.promise().query(
    "select menu_item, restaurant, item_id from menuitems where date = curdate();",
  );
  return rows;
}

async function addReview(feedbackData: FeedbackData) {
  // Post

  await SQL_CONNECTION.promise().query(
    `insert into reviews (item_id, rating, order_again) values ( ${feedbackData["FoodItem"]}, ${feedbackData["Rating"]}, "${feedbackData["WouldOrderAgain"]}");`,
  );

  console.log("DONE!!!!!!!");
}
