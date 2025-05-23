import { jest } from "@jest/globals";

jest.mock("node:console", () => ({
  info: jest.fn(),
  error: jest.fn() as jest.Mock,
  group: jest.fn(),
  groupEnd: jest.fn(),
  log: jest.fn(),
}));

global.jest = jest;