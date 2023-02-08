//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const axios = require('axios');
const { response } = require("express");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


mongoose.connect("mongodb://127.0.0.1:27017/roxilerDB", {useNewUrlParser: true});

const productSchema = {
    title:String,
    price:Number,
    description: String,
    category:String,
    image:String,
    sold:Boolean,
    dateOfSale:String,
    monthOfSale:String

};

const Product = mongoose.model("Product", productSchema);

app.get('/initdb', async (req, res) => {
  // Fetch the JSON from the third party API
  const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
  const months = [];
  months.push('', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')

  // Initialize the database with seed data

  const data = response.data;
  data.forEach(async (item) => {
    const product = new Product({
      title: item.title,
      price: item.price,
      description: item.description,
      category: item.category,
      image: item.image,
      sold: item.sold,
      dateOfSale: item.dateOfSale,
      monthOfSale: months[Number(item.dateOfSale.split('-')[1])]
    });
    await product.save();
  });

  res.send('Database initialized');
});

// Route to fetch all the products

app.get("/products", function(req,res){
    Product.find(function(err, foundArticles){
        if(!err){
            res.send(foundArticles);
        }
        else{
            console.log(err);
        }
    });
});

// Route to Create an API for statistics

app.get("/stats/:month", function(req,res){
    Product.find({monthOfSale: req.params.month}, function(err, foundArticles){
        if(!err){
            let totalAmount = 0;
            let totalSold = 0;
            let totalUnSold = 0;
            foundArticles.forEach((item)=>{
                totalAmount += item.price
                if(item.sold){
                    totalSold += 1

                }
                else{
                    totalUnSold += 1
                }

            });
            res.send({totalAmount, totalSold, totalUnSold});

        }
        else{
            console.log(err);
        }
    });
});


// Route to create API for BAR CHART


app.get("/barChart/:month", function(req,res){
    Product.find({monthOfSale: req.params.month}, function(err, foundArticles){
        if(!err){
            let priceRangeCount=[0,0,0,0,0,0,0,0,0,0]
            let priceRange = ["0 - 100", "101 - 200", "201 - 300", "301 - 400", "401 - 500", "501 - 600", "601 - 700", "701 - 800", "801 - 900", "900 - above" ]
            foundArticles.forEach((item) => {
                let p=item.price
                let px = 0
                if(p > 0){
                    
                    px = Math.floor((p-1)/100)
                }
                priceRangeCount[px] += 1
                
            })
            let result = {}
            priceRange.forEach((pr, i) => {
                result[pr] = priceRangeCount[i]
            })
            res.send(result);

        }
        else{
            console.log(err);
        }
    });
});


//Route to create API for PIE CHART


app.get("/pieChart/:month", function(req,res){
    Product.find({monthOfSale: req.params.month}, function(err, foundArticles){
        if(!err){
            result={}
            foundArticles.forEach((item) => {
                let c=item.category
                if(result[c] != undefined){
                    result[c] += 1
                }
                else{
                    result[c] = 1
                }

            })
            res.send(result);

        }
        else{
            console.log(err);
        }
    });
});


// Route to create API for combined data


app.get("/combined_data/:month", async(req, res)=>{
    q=req.params.month
    const stats = await axios.get('http://localhost:3000/stats/'+q);
    const barChart = await axios.get('http://localhost:3000/barChart/'+q);
    const pieChart = await axios.get('http://localhost:3000/pieChart/'+q);

    const data1=stats.data
    const data2=barChart.data
    const data3=pieChart.data

    res.send({data1, data2, data3});
 
    

})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});