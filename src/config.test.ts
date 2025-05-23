import { getConfig } from "./config";


describe("getConfig", () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return default config if configuration file does not exist", () => {
    const config = getConfig();

    expect(config).toEqual({
      exclude: ["node_modules", "dist"],
      files: [".js", ".jsx"],
    });
  });
});
