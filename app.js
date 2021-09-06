const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const dbPath = path.join(__dirname, "carRental.db");
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//User registration API
app.post("/register/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const dbUser = await db.get(checkUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
        INSERT INTO user ( username, password)
        VALUES
        ( "${username}", "${hashedPassword}");`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
//User login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const dbUser = await db.get(checkUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (isPasswordValid === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "AnirudhCarRental");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//authenticateToken user
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "AnirudhCarRental", async (error, payload) => {
      if (error) {
        console.log(jwtToken);
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//getting the data

app.get("/users", authenticateToken, async (request, response) => {
  const getUsersQuery = `SELECT * FROM user`;
  const users = await db.all(getUsersQuery);
  response.send(users);
});

//filtered baded on brands

app.get("/cars/", authenticateToken, async (request, response) => {
  const { search_q = "" } = request.query;
  const getCarsQuery = `SELECT * FROM cars WHERE carbrand LIKE '%${search_q}%'`;
  const carbrand = await db.all(getCarsQuery);
  response.send(carbrand);
});

//rent a car

app.post("/rental/:carId/", authenticateToken, async (request, response) => {
  const { carId } = request.params;

  let { username } = request;
  const getSelectedCars = `SELECT * FROM cars where carId=${carId}`;
  const carIds = await db.get(getSelectedCars);
  const getUserDetails = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(getUserDetails);

  if (carIds === undefined) {
    response.status(400);
    response.send("Invalid carsId");
  } else {
    const { hours, useraddress, rentprice } = request.body;
    console.log(hours);
    const postRentalCars = `INSERT INTO rentalHours(hours,useraddress,rentprice)
    VALUES(${hours},'${useraddress}',${rentprice})`;
    await db.run(postRentalCars);
    response.send("post successfully");
  }
});
