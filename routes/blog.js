const { Router } = require("express");
const {
  getAllBlogs,
  createBlog,
  getSingleBlog,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBlogsByAuthor,
} = require("../controllers/blog");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

// Category Routes
router
  .route("/categories")
  .get(getAllCategories)
  .post(requireAuth, createCategory);
router
  .route("/categories/:id")
  .put(requireAuth, updateCategory)
  .delete(requireAuth, deleteCategory);

// Author Routes
router.get("/author/:authorId", getBlogsByAuthor);

// Blog Routes
router.route("/").get(getAllBlogs).post(requireAuth, createBlog);
router
  .route("/:id")
  .get(getSingleBlog)
  .put(requireAuth, updateBlog)
  .delete(requireAuth, deleteBlog);
router.route("/slug/:slug").get(getBlogBySlug);

module.exports = router;
