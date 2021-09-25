const express = require("express");
let { createClient } = require("redis");
var cors = require("cors");
let bodyParser = require("body-parser");

const app = express();
// Set  our default port
app.set("port", process.env.PORT || 3456);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.post('/flush/', async function(req, res){
    console.log(req.body);
    let series = JSON.parse(req.body.series);
    if(series==null) res.sendStatus(422);
    let redisClient  = await connectRedis();
    
    for (let i = 0; i < series.length; i++) {
        let s = series[i];
        await redisClient.del('series-'+s);
    }

    await redisClient.del('homepage-latest');
    await redisClient.del('homepage-week');
    await redisClient.del("homepage-all");

    res.sendStatus(200);
})

app.get('/', function(req, res){
    res.send('Cache-kun gommene!');
});

// Initialize our server
app.listen(app.get("port"), err => {
  // If something goes wrong when initializing the server
  if (err) console.log(`Server failure due to ${err.message}`);
  console.log(`Server running on port ${app.get("port")}`);
});

async function connectRedis(){
    let client = createClient();
    client.on("ready", () => {
        console.log("Connected to redis");
    });
    client.on("error", (err) => console.log("[My Plugin] Redis Client Error", err));
    await client.connect();
    return client;
}