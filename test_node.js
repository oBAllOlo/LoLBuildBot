const fs = require("fs");
console.log("Hello from Node");
try {
  const content = fs.readFileSync(".env.example", "utf8");
  console.log("File content length:", content.length);
  const match = content.match(/TOKEN=(.*)/);
  if (match) console.log("Token starts with:", match[1].substring(0, 5));
} catch (e) {
  console.log("Error reading file:", e.message);
}
