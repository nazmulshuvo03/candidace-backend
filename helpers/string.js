const generateUsername = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let username = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    username += characters[randomIndex];
  }
  return username;
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const removeSpace = (str) => str.replace(/\s/g, "");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

module.exports = {
  generateUsername,
  capitalize,
  removeSpace,
  isNonEmptyString,
};
