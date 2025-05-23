const mockExitCode = jest.fn();

jest.mock("node:process", () => ({
  __esModule: true,
  default: {
    set exitCode(x: number) {
      mockExitCode(x);
    },
  },
}));

describe("tsOnly", () => {
  it("runs as an iife", () => {
    const process = require("node:process").default;
    
    require("./cli");
    
    process.exitCode = 99;
    expect(mockExitCode).toHaveBeenCalledWith(99);
  });
});