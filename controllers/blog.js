const { BAD_REQUEST, NOT_FOUND } = require("../constants/errorCodes");
const { paginate } = require("../helpers/data");
const { isNonEmptyString } = require("../helpers/string");
const asyncWrapper = require("../middlewares/async");
const { Blog, Category } = require("../models/blog");
const { Profile } = require("../models/user");
const { Op } = require("sequelize");
const slugify = require("slugify");

const validateBlogData = (data) => {
  const errors = [];
  if (!isNonEmptyString(data.title)) {
    errors.push("Title is required and must be a non-empty string.");
  }
  if (!isNonEmptyString(data.content)) {
    errors.push("Content is required and must be a non-empty string.");
  }
  if (data.categoryId && typeof data.categoryId !== "string") {
    errors.push("Category ID must be a valid UUID string.");
  }
  return errors;
};

const getAllBlogs = asyncWrapper(async (req, res) => {
  const { page = 1, pageSize = 10, category, search } = req.query;
  const { offset, limit } = paginate(page, pageSize);

  const whereCondition = { status: "published" };

  if (category) {
    const categoryInstance = await Category.findOne({
      where: { slug: category },
    });
    if (categoryInstance) {
      whereCondition.categoryId = categoryInstance.id;
    }
  }

  if (search) {
    whereCondition[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { content: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const blogs = await Blog.findAndCountAll({
    where: whereCondition,
    include: [Category, Profile],
    offset,
    limit,
  });

  res.success({
    data: blogs.rows,
    meta: {
      total: blogs.count,
      page,
      pageSize,
    },
  });
});

const getBlogsByAuthor = asyncWrapper(async (req, res) => {
  const { authorId } = req.params;
  const askingUserId = res.locals.user?.id;

  // Fetch all blogs associated with this author
  const whereCondition = { authorId };
  if (authorId !== askingUserId) {
    whereCondition.status = "published"; // Only show published blogs to other users
  }

  const blogs = await Blog.findAll({
    where: whereCondition,
    include: [{ model: Category }, { model: Profile, as: "profile" }],
    order: [["createdAt", "DESC"]],
  });

  if (!blogs) {
    return res.fail("No blogs found for this author", NOT_FOUND);
  }

  // Fetch the author's profile
  const authorProfile = await Profile.findByPk(authorId);

  if (!authorProfile) {
    return res.fail("Author not found", NOT_FOUND);
  }

  res.success({
    author: authorProfile,
    blogs: blogs,
  });
});

const createBlog = asyncWrapper(async (req, res) => {
  const { title, content, categoryId, excerpt, featuredImage } = req.body;
  const authorId = res.locals.user.id;

  // Validate blog data
  const errors = validateBlogData({ title, content });
  if (errors.length > 0) {
    return res.fail(errors.join(" "), BAD_REQUEST);
  }

  if (categoryId) {
    const categoryExists = await Category.findByPk(categoryId);
    if (!categoryExists) {
      return res.fail(
        "Category does not exist. Please select a valid category.",
        BAD_REQUEST
      );
    }
  } else return res.fail("Category is not selected.", BAD_REQUEST);

  let baseSlug = slugify(title, { lower: true });
  let slug = baseSlug;

  // Find blogs with similar slugs
  const slugPattern = new RegExp(`^${baseSlug}(-\\d{2})?$`, "i");
  const existingSlugs = await Blog.findAll({
    where: {
      slug: {
        [Op.iRegexp]: slugPattern.source,
      },
    },
    attributes: ["slug"],
  });

  if (existingSlugs.length > 0) {
    const existingSlugNumbers = existingSlugs.map((blog) => {
      const match = blog.slug.match(/-(\d{2})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const maxExistingNumber = Math.max(...existingSlugNumbers);
    const nextNumber = (maxExistingNumber + 1).toString().padStart(2, "0");
    slug = `${baseSlug}-${nextNumber}`;
  }

  const created = await Blog.create({
    title,
    content,
    excerpt,
    featuredImage,
    categoryId,
    authorId,
    slug,
  });
  if (!created) return res.fail("Blog could not be added");
  res.success(created);
});

const getSingleBlog = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.fail("ID is not provided", BAD_REQUEST);
  const blog = await Blog.findOne({
    where: { id },
    include: [Category, Profile],
  });
  if (!blog) return res.fail("Blog not found", NOT_FOUND);
  res.success(blog);
});

const getBlogBySlug = asyncWrapper(async (req, res) => {
  const { slug } = req.params;
  if (!slug) return res.fail("Slug is not provided", BAD_REQUEST);

  const blog = await Blog.findOne({
    where: { slug },
    include: [Category, Profile],
  });
  if (!blog) return res.fail("Blog not found", NOT_FOUND);
  res.success(blog);
});

const updateBlog = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (!id) return res.fail("ID is not provided", BAD_REQUEST);

  const blog = await Blog.findByPk(id);
  if (!blog) return res.fail("Blog not found", NOT_FOUND);

  // Ensure the blog belongs to the user making the request
  if (blog.authorId !== res.locals.user.id) {
    return res.fail("You are not authorized to update this blog", FORBIDDEN);
  }

  // Check if the title has changed
  if (updatedData.title && updatedData.title !== blog.title) {
    let baseSlug = slugify(updatedData.title, { lower: true });
    let slug = baseSlug;

    // Ensure the slug is unique by checking for existing slugs (excluding the current blog's id)
    let slugExists = await Blog.findOne({
      where: { slug, id: { [Op.ne]: id } },
    });
    let counter = 1;

    while (slugExists) {
      slug = `${baseSlug}-${counter.toString().padStart(2, "0")}`;
      slugExists = await Blog.findOne({ where: { slug, id: { [Op.ne]: id } } });
      counter++;
    }

    updatedData.slug = slug; // Set the new slug if title changed
  }

  const updated = await blog.update(updatedData);
  res.success(updated);
});

const deleteBlog = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findByPk(id);
  if (!blog) return res.fail("Blog not found", NOT_FOUND);

  // Ensure the blog belongs to the user making the request
  if (blog.authorId !== res.locals.user.id) {
    return res.fail("You are not authorized to delete this blog", FORBIDDEN);
  }

  await blog.destroy();
  res.success("Deleted");
});

// Category Controllers
const getAllCategories = asyncWrapper(async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const { offset, limit } = paginate(page, pageSize);

  const categories = await Category.findAndCountAll(
    req.query.pageSize
      ? {
          offset,
          limit,
        }
      : {}
  );

  res.success({
    data: categories.rows,
    meta: {
      total: categories.count,
      page,
      pageSize,
    },
  });
});

const createCategory = asyncWrapper(async (req, res) => {
  const { name, slug } = req.body;

  if (!name) return res.fail("Name is required", BAD_REQUEST);

  // Check if the category name already exists
  const existingCategory = await Category.findOne({ where: { name } });
  if (existingCategory) {
    return res.success(existingCategory); // Return existing category
  }

  // Slugify if not provided
  const categorySlug = slug || slugify(name, { lower: true });

  const created = await Category.create({
    name,
    slug: categorySlug,
    createdBy: res.locals.user.id,
  });

  if (!created) return res.fail("Category could not be added");
  res.success(created);
});

const updateCategory = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  if (!id) return res.fail("ID is not provided", BAD_REQUEST);

  const found = await Category.findByPk(id);
  if (!found) return res.fail("Category not found", NOT_FOUND);

  // Ensure the user requesting the update is the creator
  if (found.createdBy !== res.locals.user.id) {
    return res.fail(
      "You are not authorized to update this category",
      FORBIDDEN
    );
  }

  if (updatedData.name) {
    updatedData.slug = slugify(updatedData.name, { lower: true });
  }

  const updated = await found.update(updatedData);
  res.success(updated);
});

const deleteCategory = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const found = await Category.findByPk(id);
  if (!found) return res.fail("Category not found", NOT_FOUND);

  // Ensure the user requesting the deletion is the creator
  if (found.createdBy !== res.locals.user.id) {
    return res.fail(
      "You are not authorized to delete this category",
      FORBIDDEN
    );
  }

  await Category.destroy({ where: { id } });
  res.success("Deleted");
});

const getBlogsByCategorySlug = asyncWrapper(async (req, res) => {
  const { slug } = req.params;

  // Find the category by slug
  const category = await Category.findOne({
    where: { slug },
    include: [{ model: Profile, as: "creator", foreignKey: "createdBy" }],
  });

  if (!category) {
    return res.fail("Category not found", NOT_FOUND);
  }

  // Fetch all blogs associated with this category
  const blogs = await Blog.findAll({
    where: { categoryId: category.id, status: "published" },
    include: [{ model: Profile, as: "profile" }], // Include the author's profile
    order: [["createdAt", "DESC"]],
  });

  res.success({
    category: category,
    blogs: blogs,
  });
});

module.exports = {
  getAllBlogs,
  getBlogsByAuthor,
  createBlog,
  getSingleBlog,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBlogsByCategorySlug,
};
