require('dotenv').config();
const path = require('path');
const mysql = require("mysql2");
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const https = require("https");
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const axios = require("axios");
const session = require('express-session');
const passport = require("passport");
const schedule = require('node-schedule');
const multer = require('multer');
const pdf = require("html-pdf");
const upload = multer({ dest: 'uploads/' });

const fs = require('fs')
const { resolve } = require('path');
const jwtSecret = process.env.JWT_Secret;


let knex = require("knex")({
  client:"mysql",
  connection:{
    server:"localhost",
    user: process.env.SQL_UN,
    password: process.env.SQL_PS,
    database: process.env.SQL_DB
  }
});

app.use(express.static("public"));
app.use(express.static('uploads'));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET' 
}));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  });

const connection = mysql.createConnection({
    host: "localhost",
    user: process.env.SQL_UN,
    password: process.env.SQL_PS,
    database: process.env.SQL_DB
});

connection.connect(function(error){
    if (error) throw error
    else console.log("Successfully connected to database");
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = process.env.CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRET;

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/news"
  },
  function(accessToken, refreshToken, profile, done) {
    // Extract the email from the profile object
    const email = profile.emails[0].value;

    // Here, you can store the email in the session or pass it as an argument to done()
    return done(null, email);
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/news',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Access the authenticated user's email via req.user
    const email = req.user;
    connection.query(
      "INSERT INTO users(email) VALUES (?)",
      [email]);
  
    const mailOptions = {
      from: process.env.MAIL,
      to: email,
      subject: "Login Notification",
      html: `
        <html>
          <body>
            <h1>Welcome to News App</h1>
            <p>Hello,</p>
            <p>You have successfully logged in to the News App.</p>
            <p>Stay Informed, Stay Ahead: Your Source for Breaking News</p>
            <img src="https://i.ibb.co/yfq03qn/logo.jpg" alt="News App Logo" width="300" height="300" />
            <p>Thank you for using our app!</p>
          </body>
        </html>
      `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Error sending email: ", error);
        res.status(500).send("Error sending email");
      } else {
        console.log("Email sent: ", info.response);
      }
    });

    // Generate and set the JWT token with the email
    const token = jwt.sign({ email: email }, jwtSecret, { expiresIn: "1h" });
    res.cookie("token", token);
    res.redirect('/news');
  }
);

app.get("/admin", function(req,res){
  res.render("admin");
})


app.get("/", function(req, res){
    res.render("home");
  });

app.get("/login", function(req, res){
    res.render("login");
  });

app.get("/register", function(req, res){
    res.render("register");
}); 
  

app.get('/logout', function(req, res) {
  res.cookie("token", '');
    res.redirect('/');
});

app.get("/news", verifyToken, function (req, res) {
  let type='news';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
    
    get_info(type, function( result){
      let data = result;
      type='bus';
      get_info(type, function( result){
        let datab = result;
        type='ent';
        get_info(type, function(result){
          let dataEnt = result;
          res.render("nhome",{dbData:data, dbDataBus: datab, dbDataEnt: dataEnt});
       });
        
     });
      
   });
});
app.get("/news/business",verifyToken, function (req, res){
  let type='bus';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
});  
app.get("/news/entertainment",verifyToken, function (req, res){
  let type='ent';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
  
});
app.get("/news/general",verifyToken, function (req, res){
  let type='gen';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
});
app.get("/news/health",verifyToken, function (req, res){
  let type='hlt';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
});
app.get("/news/science",verifyToken, function (req, res){
  let type='sci';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
});
app.get("/news/sports",verifyToken, function (req, res){
  let type='spt';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
  
});
app.get("/news/technology",verifyToken, function (req, res){
  let type='tech';
  const j = schedule.scheduleJob('*/30 * * * *', function(){
    readDataAndInsertIntoDB(type);
  });
  get_info(type,function(result){
    let data = result;
    res.render("news",{dbData:data});
 });
 
});

app.get('/download-pdf', (req, res) => {
  const ejsTemplate = fs.readFileSync('views/news.ejs', 'utf8');
  let type='news';
    get_info(type, function( result){
      let data = result;
      const renderedHtml = ejs.render(ejsTemplate, {dbData:data});

      pdf.create(renderedHtml).toStream((err, stream) => {
        if (err) {
          res.status(500).send('An error occurred');
          return;
        }
    
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');
    
        stream.pipe(res);
      });
   });

});

app.get("/news/weather",verifyToken,function(req,res){
  const cityName = req.query.cityName;
    const apiKey = process.env.OWM;
    const unit = "metric";
    const url = "https://api.openweathermap.org/data/2.5/weather?appid="+apiKey+"&q="+cityName+"&units=" +unit;
    https.get(url, function(response){
        response.on("data", function(data){
            const weatherData=JSON.parse(data);
            const temp = weatherData.main.temp;
            const weatherDescription = weatherData. weather[0].description;
            const icon = weatherData. weather[0].icon;
            const imageURL =  "https://openweathermap.org/img/wn/"+icon+"@2x.png";
            const feeltemp = weatherData.main.feels_like;
            const humd = weatherData.main.humidity;
            const pres = weatherData.main.pressure;
            const vis = weatherData.visibility;
            const wspeed = weatherData.wind.speed;
            res.render("weather",{cityName: cityName,Data:weatherData, temp:temp, dscr: weatherDescription, imgURL: imageURL,ftemp: feeltemp, humd:humd, pres: pres,vis:vis, wspeed: wspeed});
    });
});
});

app.get("/admin/adconfig", verifyToken, function(req,res){
  res.render("adconfig");
});

app.get("/admin/compose", verifyToken, function(req, res){
  res.render("compose")
});

app.post("/admin/compose", upload.single('urlImg'), function(req, res) {
  const s_name = 'Admin';
  const author = 'Yashwardhan Gaur';
  const title = req.body.title;
  const dscr = req.body.dscr;
  const url = req.body.url;
  const urlImg = req.body.urlImg;
  const publishedAt = req.body.publishedAt;
  const file = req.file; // Access the uploaded file information from req.file

  fs.rename(file.path, './uploads/' + file.originalname, (err) => {
    if (err) {
      // Handle the error if file renaming fails
      console.log("Error renaming file:", err);
      res.redirect("/admin/compose");
    } else {
      // Save the image path to the database
      const imagePath = file.originalname
      console.log("Image uploaded");

      connection.query(
        "INSERT INTO newsPosts(s_name, author, title, dscr, url, urlImg, publishedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [s_name, author, title, dscr, url, imagePath, publishedAt],
        function (error) {
          if (error) {
            console.log("Error in inserting the data:", error);
            res.redirect("/admin/compose");
          } else {
            res.redirect("/news");
          }
          res.end();
        }
      );
    }
  });
});

app.post("/login", function (req, res) {
  let email = req.body.username;
  let pass = req.body.password;
  connection.query(
    "SELECT * FROM users WHERE email = ? AND pass = ?",
    [email, pass],
    function (error, results, fields) {
      if (results.length > 0) {
        // Create JWT token and continue with the rest of the login logic
        // ...
        const token = jwt.sign({ email: email }, jwtSecret, {expiresIn: "1h" });// Set token expiration time
        res.cookie("token", token);
        res.redirect("/news");
      } else {
        console.log("Error: Invalid Credentials");
        res.redirect("/login");
      }
      res.end();
    }
  );
});
  
  
app.post("/register", function (req, res) {
let email = req.body.username;
let pass = req.body.password;
connection.query(
    "INSERT INTO users(email, pass) VALUES (?, ?)",
    [email, pass],
    function (error) {
    if (error) {
        res.redirect("/register");
    } else {
        // Create JWT token
        const mailOptions = {
          from: process.env.MAIL,
          to: email,
          subject: "Login Notification",
          html: `
            <html>
              <body>
                <h1>Welcome to News App</h1>
                <p>Hello,</p>
                <p>You have successfully logged in to the News App.</p>
                <p>Stay Informed, Stay Ahead: Your Source for Breaking News</p>
                <img src="https://i.ibb.co/yfq03qn/logo.jpg" alt="News App Logo" width="300" height="300" />
                <p>Thank you for using our app!</p>
              </body>
            </html>
          `,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log("Error sending email: ", error);
            res.status(500).send("Error sending email");
          } else {
            console.log("Email sent: ", info.response);
          }
        });
        const token = jwt.sign({ email: email }, jwtSecret, {
        expiresIn: "1h" // Set token expiration time
        });

        // Set the token as a cookie or in the response header
        res.cookie("token", token); // Example: using a cookie
        res.redirect("/news");
    }
    res.end();
    }
);
});

app.post("/news", function(req, res) {
  const query = req.body.cityName;
  res.redirect("/news/weather?cityName=" + query);
});

app.post("/admin", function(req, res) {
  let email = req.body.username;
  let pass = req.body.password;
  connection.query(
    "SELECT * FROM admin WHERE email = ?",
    [email],
    function(error, results, fields) {
      if (error) {
        console.log("Error: Invalid Credentials");
        res.redirect("/admin");
      } else {
        if (results.length > 0) {
          // Assuming the password is stored as plain text in the database
          const storedPassword = results[0].password;

          if (pass === storedPassword) {
            // Passwords match, proceed with login
            const token = jwt.sign({ email: email }, jwtSecret, { expiresIn: "1h" });
            res.cookie("token", token);
            res.redirect("/admin/adconfig");
          } else {
            // Passwords don't match, display an error message
            console.log("Error: Invalid Credentials");
            res.redirect("/admin");
          }
        } else {
          // No user found with the provided email
          console.log("Error: Invalid Credentials");
          res.redirect("/admin");
        }
      }
      res.end();
    }
  );
});


function verifyToken(req, res, next) {
  // Get the token from the request cookie or header
  const token = req.cookies.token || req.headers["authorization"];

  if (token) {
    jwt.verify(token, jwtSecret, function (error, decoded) {
      if (error) {
        // Invalid token
        console.log("Invalid");
        res.redirect("/login");
      } else {
        // Valid token
        req.email = decoded.email;
        next();
      }
    });
  } else {
    // No token provided
    console.log("No Token");
    res.redirect("/login");
  }
}

//Function to retrieve data from DB
function get_info(type,callback){      

  switch (type) {
  case 'news':
    var sql = "SELECT * FROM newsPosts ORDER BY id DESC LIMIT 36";
    break;
  case 'bus':
    var sql = "Select * from business limit 50";
    break;
  case 'ent':
    var sql = "Select * from entertainment limit 50";
    break;
  case 'gen':
    var sql = "Select * from general limit 50";
    break;
    case 'hlt':
    var sql = "Select * from health limit 50";
    break;
    case 'sci':
    var sql = "Select * from science limit 50";
    break;
    case 'spt':
    var sql = "Select * from sports limit 50";
    break;
    case 'tech':
    var sql = "Select * from technology limit 50";
    break;
          
  default:
    console.log("Not the right type");
    break;
}
  connection.query(sql, function(err, results){
        if (err){ 
          throw err;
        }
        return callback(results);
})
}

//Function to read data from News API
const readDataAndInsertIntoDB = (type) => {
  switch (type) {
    case 'news':
      var url = "https://newsapi.org/v2/everything?q='India'&sortBy=popularity&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db ='newsPosts';
      break;
    case 'bus':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'business';
      break;
    case 'ent':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=entertainment&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'entertainment';
      break;
    case 'gen':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=general&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'general';
      break;
      case 'hlt':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=health&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'health';
      break;
      case 'sci':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=science&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'science';
      break;
      case 'spt':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=sports&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'sports';
      break;
      case 'tech':
      var url = "https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=fb1a37495c0b410b9dd3d05f6ff604d0";
      var db = 'technology';
      break;
            
    default:
      console.log("Not the right type");
      break;
  }
  return new Promise((resolve, reject) => {
    axios.get(url)
      .then((result) => {
        const articles = result.data.articles;
        const dataToBeInserted = articles
          .filter(column => column.urlToImage !== null) // Filter records where urlImg is not null
          .map(column => ({
            title: column.title,
            s_name: column.source.name,
            author: column.author,
            dscr: column.description,
            url: column.url,
            urlImg: column.urlToImage,
            publishedAt: column.publishedAt
          }));

        knex(db)
          .insert(dataToBeInserted.slice(0, 200))
          .returning("id")
          .then(id => {
            knex.destroy();
            resolve(1);
          });
      });
  });
};


app.listen(3000, function() {
    console.log("Server started on port 3000.");
  });


