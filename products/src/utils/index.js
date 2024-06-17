const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const amqplib = require('amqplib');
const {MSG_BROKER_URL,EXCHANGE_NAME,QUEUE_NAME} = require('../config');

const { APP_SECRET } = require("../config");

//Utility functions
module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
};

module.exports.GeneratePassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

module.exports.GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports.ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    console.log(signature);
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports.FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};

// module.exports.PublishCustomerEvents = async(payload) => {
//   try {
//     await axios.post('http://customer:/app-events', payload);
//     console.log('Customer events published successfully');
//   } catch (error) {
//     console.error('Error publishing customer events:', error);
//     throw error; // Optionally rethrow or handle the error as needed
//   }
// }

// module.exports.PublishShoppingEvents = async(payload) => {
//   try {
//     await axios.post('http://localhost:8000/shopping/app-events', payload);
//     console.log('Shopping events published successfully');
//   } catch (error) {
//     console.error('Error publishing shopping events:', error);
//     throw error; // Optionally rethrow or handle the error as needed
//   }
// }

// we will use message broker

module.exports.CreateChannel = async () => {
  try {
    const connection = await amqplib.connect(MSG_BROKER_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(EXCHANGE_NAME, "direct", { durable: true });
    return channel;
  } catch (err) {
    throw err;
  }
};

module.exports.PublishMessage = async (channel, binding_key, msg) => {
  await channel.publish(EXCHANGE_NAME, binding_key, Buffer.from(msg));
  console.log("Sent from products: ", msg);
};

module.exports.SubscribeMessage = async (channel, service, binding_key) => {
  const appQueue = await channel.assertQueue(QUEUE_NAME);
  channel.bindQueue(appQueue.queue, EXCHANGE_NAME, binding_key);
  channel.consume(appQueue.queue, data => {
    console.log("received data in product service");
    console.log(data.content.toString());
    channel.ack(data);
  })
}