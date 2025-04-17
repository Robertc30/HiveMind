const fs = require("fs");
const glob = require("glob");

const removePatterns = [
  /console\.log\(.*?\);?/g,
  /debugger;/g,
  /\/\*.*?Dead Code.*?\*\//gs
];

glob("src/**/*.ts?(x)", {}, (err, files) => {
  files.forEach(file => {
    let content = fs.readFileSync(file, "utf8");
    let cleaned = content;
    removePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, "");
    });

    if (cleaned !== content) {
      fs.writeFileSync(file, cleaned, "utf8");
      console.log(`Cleaned: ${file}`);
    }
  });
});
