/**
 * Step 1
 * Monitor market data
 */
import axios from "axios";
import { WebSocket } from "ws";

const {
  STREAM_PAIR,
  API_KEY,
  API_SECRET,
  ACCOUNT_ID,
  SYMBOL,
  BUY_PRICE,
  PROFITABILITY,
} = process.env;

const BUY_PRICE_VALUE = parseFloat(BUY_PRICE);
const PROFITABILITY_VALUE = parseFloat(PROFITABILITY);
const BASE_ENDPOINT = "https://www.mercadobitcoin.net/api/v4";

let accessToken = "";
let sellPrice = 0;

login();

const ws = new WebSocket("wss://ws.mercadobitcoin.net/ws");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      subscription: {
        name: "ticker",
        id: STREAM_PAIR,
      },
    })
  );
};

ws.onmessage = (event) => {
  console.clear();
  const obj = JSON.parse(event.data);
  console.log(obj);
  console.log("Sell Price: ", sellPrice);

  if (obj.type !== "ticker") return;

  if (!sellPrice && parseFloat(obj.data.sell) <= BUY_PRICE_VALUE) {
    sellPrice = parseFloat(obj.data.sell) * PROFITABILITY_VALUE;
    console.log("Buying...");
    newOrder("buy");
  } else if (sellPrice && parseFloat(obj.data.buy) >= sellPrice) {
    newOrder("sell");
  }
};

/**
 * Step 2
 * Authenticate with exchange api
 */
async function login() {
  const url = `${BASE_ENDPOINT}/authorize`;
  const body = {
    login: API_KEY,
    password: API_SECRET,
  };

  const { data } = await axios.post(url, body);
  accessToken = data.access_token;
  console.log("Acesso autorizado!");
  console.log(accessToken);

  setTimeout(login, data.expiration * 1000 - Date.now());
}

async function getAccountId() {
  const url = `${BASE_ENDPOINT}/accounts`;
  const headers = { Authorization: "Bearer " + accessToken };
  const { data } = await axios.get(url, { headers });

  console.log(data);
  process.exit(0);
}

/**
 * Step 3
 * Place orders
 */
/**
 *
 * @param {string} side - buy or sell
 */
async function newOrder(side) {
  const url = `${BASE_ENDPOINT}/accounts/${ACCOUNT_ID}/${SYMBOL}/orders`;
  const body = {
    qty: process.env.BUY_QTY,
    side,
    type: "market",
  };
  const headers = { Authorization: "Bearer " + accessToken };

  try {
    const { data } = await axios.post(url, body, { headers });

    if (side === "sell") sellPrice = 0;

    return data;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    process.exit(0);
  }
}
