require("dotenv").config();
const express = require("express");
const { createClient } = require("redis");
const cors = require("cors");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
const redisClient = await connectRedis();
let seriesToClear = [];

// Set  our default port
app.set("port", process.env.PORT || 3456);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/flush/", async function (req, res) {
    console.log('[' + new Date().toUTCString() + '] '+'Recieved Clear Request',req.body);
    let series = req.body.series;
    let chap = req.body.chapter;
    if (series == null) res.sendStatus(422);

    seriesToClear.push({
        id: series,
        chapter: chap,
        tries: 0,
        cleared: false,
    });

    res.sendStatus(200);
});

app.get("/", function (req, res) {
    res.send("Cache-kun gommene! キャッシュ,");
});

cron.schedule("*/5 * * * *", async () => {
    console.log("[" + new Date().toUTCString() + "] " + "Cron job");
    if (seriesToClear.length > 0) {

        for (let i = 0; i < seriesToClear.length; i++) {
            let s = seriesToClear[i].id;
            console.log("[" + new Date().toUTCString() + "] " + "Checking series-" + s + " chapter-" + seriesToClear[i].chapter);
            await axios.get(process.env.API_URL+'chapter/check/'+seriesToClear[i].chapter).then( async res => {
                if(res.data.message){
                    seriesToClear[i].tries++;
                    return;
                }else {
                    if(res.data.uploaded == 1){
                        await redisClient.del("series-" + s);
                        seriesToClear[i].cleared = true;
                    }
                    seriesToClear[i].tries++;
                }
            });
            if(seriesToClear[i].tries === 3){
                seriesToClear[i].cleared = true;
            }
            console.log("[" + new Date().toUTCString() + "] " + "[Try "+seriesToClear[i].tries+"]Series-" + s + (seriesToClear[i].cleared ? " cleard." : " not cleard."));
        }

        seriesToClear = seriesToClear.filter(e => e.cleared === false);

        await redisClient.del("homepage-latest");
        await redisClient.del("homepage-week");
        await redisClient.del("homepage-all");
    }
});

// Initialize our server
app.listen(app.get("port"), (err) => {
    // If something goes wrong when initializing the server
    if (err) console.log(`Server failure due to ${err.message}`);
    console.log(`Server running on port ${app.get("port")}`);
});

async function connectRedis() {
    let client = createClient();
    client.on("ready", () => {
        console.log("Connected to redis");
    });
    client.on("error", (err) => console.log("[My Plugin] Redis Client Error", err));
    await client.connect();
    return client;
}
