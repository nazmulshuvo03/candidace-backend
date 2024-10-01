const { Blog } = require("../models/blog");

const getSitemap = async (_req, res) => {
  try {
    const blogs = await Blog.findAll({
      where: { status: "published" }, // Only published blogs
      attributes: ["slug", "updatedAt"],
    });

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    blogs.forEach((blog) => {
      sitemap += `
        <url>
          <loc>${process.env.DASHBOARD_URL}/blog/${blog.slug}</loc>
          <lastmod>${blog.updatedAt.toISOString()}</lastmod>
          <priority>0.8</priority>
        </url>`;
    });

    sitemap += "</urlset>";
    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap: ", error);
    return res.fail("Failed to generate sitemap", 500);
  }
};

const getRobotsTxt = (_req, res) => {
  res.type("text/plain");
  res.send(`
    User-agent: *
    Allow: /

    Sitemap: ${process.env.DASHBOARD_URL}/sitemap.xml
  `);
};

module.exports = {
  getSitemap,
  getRobotsTxt,
};
