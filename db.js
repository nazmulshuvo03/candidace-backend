const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: "postgres",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    models: [__dirname + "/models/*.js"],
    logging: (msg) => {
      // console.log(sequelize.config);
      // console.log("Message: ", msg);
      return false;
    },
  }
);

module.exports = sequelize;
