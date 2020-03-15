const csv = require("csvtojson");
const express = require("express");
const request = require("request");
const MongoClient = require("mongodb").MongoClient;
const fetch = require("node-fetch");

let files = [];
let cdata = [];
let pdata = [];
const app = express();

const uri = process.env.MURL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.get("/", (req, res) => {
  fetch(
    "https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_daily_reports",
    {
      method: "GET"
    }
  )
    .then(res => res.json())
    .then(data => {
      data.forEach(file => {
        if (file.name.split(".")[1] === "csv") {
          files.push({ name: file.name.split(".")[0], url: file.download_url });
        }
      });
    })
    .then(() => {
      var current_file;
      var yesterday_file;
      if (files[files.length]) {
        current_file = files[files.length];
        yesterday_file = files[files.length - 1];
        csv()
          .fromStream(request.get(current_file.url))
          .subscribe(
            json => {
              cdata.push(json);
            },
            () => {},
            () => {
              const collection = client.db("COVID19").collection("daily");
              collection.deleteMany({}, function(err, results) {
                // console.log(results.result);
                console.log("DELETE OK");
              });
              collection.insertMany(cdata).then(d => {
                console.log("INSERT OK");
              });
            }
          );
        csv()
          .fromStream(request.get(yesterday_file.url))
          .subscribe(
            json => {
              pdata.push(json);
            },
            () => {},
            () => {
              const collection = client.db("COVID19").collection("previous");
              collection.deleteMany({}, function(err, results) {
                // console.log(results.result);
                console.log("DELETE OK");
              });
              collection.insertMany(pdata).then(d => {
                pdata = [];
                console.log("INSERT OK");
              });
            }
          );
        return res.json({ message: "Fucking awesome" });
      } else {
        current_file = files[files.length - 1];
        yesterday_file = files[files.length - 2];

        // today
        csv()
          .fromStream(request.get(current_file.url))
          .subscribe(
            json => {
              cdata.push(json);
            },
            () => {},
            () => {
              const collection = client.db("COVID19").collection("today");
              collection.deleteMany({}, function(err, results) {
                if (err) console.log(err);
                console.log(results.result);
              });
              collection.insertMany(cdata, function(err, results) {
                if (err) console.log(err);
                console.log(results.result);
                cdata = [];
              });
            }
          );
        // yesterday
        csv()
          .fromStream(request.get(yesterday_file.url))
          .subscribe(
            json => {
              pdata.push(json);
            },
            () => {},
            () => {
              const collection = client.db("COVID19").collection("yesterday");
              collection.deleteMany({}, function(err, results) {
                if (err) console.log(err);
                console.log(results.result);
              });
              collection.insertMany(pdata, function(err, results) {
                if (err) console.log(err);
                console.log(results.result);
                pdata = [];
              });
            }
          );
        return res.json({ message: "Fucking awesome" });
      }
    })
    .catch(err => console.log(err));
});

const port = process.env.PORT || 5500;
app.listen(port, () => {
  client.connect(err => {
    if (err) {
      console.log(err);
    } else {
      console.log("Connected to DB");
    }
  });
});
