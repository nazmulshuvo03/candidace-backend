const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const Routes = require("./routes");
const sequelize = require("./db");
const { responseMiddleware } = require("./middlewares/Response");
const { requestLogger } = require("./middlewares/logger");
// const viewRoutes = require("./routes/view");
const { configureCors } = require("./middlewares/cors");
require("./schedule");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(configureCors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);
app.use(responseMiddleware);

// app.use("/", viewRoutes);
app.use("/api/v1", Routes);

// Initialize socket.io
initSocket(server);

sequelize
  .sync({ alter: true })
  .then(() => {
    try {
      console.log("Database connected!!");
      server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
      });
    } catch (err) {
      console.log(`Error in running server: ${err}`);
    }
  })
  .catch((error) => {
    console.error("Sequelize synchronization error: ", error);
  });
