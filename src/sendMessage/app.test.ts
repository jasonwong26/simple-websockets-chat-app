
import {getContentSk} from "./app";

describe("getContentPk", () => {
  it("generates expected pk early in year", () => {
    const output = getContentSk(new Date("2020-03-05 01:00"));
  
    expect(output).toBe("ChatLog#2020-03-05T00:00:00.000Z");
  });

  it("generates expected pk end of year", () => {
    const output = getContentSk(new Date("2019-11-14 13:00"));
  
    expect(output).toBe("ChatLog#2019-11-14T00:00:00.000Z");
  });
  it("generates expected pk at midnight", () => {
    const output = getContentSk(new Date("2020-06-01"));
  
    expect(output).toBe("ChatLog#2020-06-01T00:00:00.000Z");
  });
  it("generates same pk throughout day", () => {
    const output1 = getContentSk(new Date("2020-06-01 08:00"));
    const output2 = getContentSk(new Date("2020-06-01 09:00"));
    const output3 = getContentSk(new Date("2020-06-01 12:00"));
  
    expect(output1).toBe("ChatLog#2020-06-01T00:00:00.000Z");
    expect(output2).toBe("ChatLog#2020-06-01T00:00:00.000Z");
    expect(output3).toBe("ChatLog#2020-06-01T00:00:00.000Z");
  });
});
