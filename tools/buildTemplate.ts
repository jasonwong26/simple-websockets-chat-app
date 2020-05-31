// This script copies src/serverless.yml into /dev/serverless.yml
// This is a good example of using Node and cheerio to do a simple file transformation.
// In this case, the transformation is useful since we only use a separate css file in prod.
import fs from "fs";
import colors from "colors";

const settings = {
  source: "src/template.yaml",
  dest: "lib/template.yaml"
};
fs.readFile(settings.source, "utf8", (err, content) => {
  if (err) {
    return console.log(err);
  }

  fs.writeFile(settings.dest, content, "utf8", (err) => {
    if (err) {
      return console.log(err);
    }

    console.log(colors.green("template.yaml written to /lib"));
  });
});
