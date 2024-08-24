const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../db");
const { Profile } = require("./user");

const Category = sequelize.define("category", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

const Blog = sequelize.define("blog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  content: {
    type: DataTypes.TEXT, // Store HTML content
    allowNull: false,
  },
  excerpt: {
    type: DataTypes.TEXT, // Short summary
    allowNull: true,
  },
  featuredImage: {
    type: DataTypes.STRING, // URL to the image
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING), // Array of tags/keywords
    allowNull: true,
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM("draft", "published", "pending"),
    defaultValue: "draft",
  },
  commentsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  seoMetaDescription: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Profile,
      key: "id",
    },
  },
  categoryId: {
    type: DataTypes.UUID,
    references: {
      model: Category,
      key: "id",
    },
    allowNull: true,
  },
});

// Associations
Profile.hasMany(Blog, { foreignKey: "authorId" });
Blog.belongsTo(Profile, { foreignKey: "authorId" });

Category.hasMany(Blog, { foreignKey: "categoryId" });
Blog.belongsTo(Category, { foreignKey: "categoryId" });

module.exports = {
  Blog,
  Category,
};
