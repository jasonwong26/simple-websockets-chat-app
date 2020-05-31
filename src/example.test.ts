import { exampleFunc } from "./example";

it("runs tests as expected", () => {
  const output = exampleFunc();

  expect(output).toEqual("Hello World");
});
