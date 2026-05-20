import React from "react";
import { render, screen } from "@testing-library/react";
import RootLayout from "./layout";

// Mock the Header component since it's external to the layout
jest.mock("@/components/shared/Header", () => {
  return function MockHeader() {
    return <header data-testid="mock-header">Header Component</header>;
  };
});

// Mock the Inter font import - this will be called when the module loads
jest.mock("next/font/google", () => {
  const Inter = jest.fn().mockReturnValue({ className: "mocked-inter-font-class" });
  return { Inter };
});

describe("RootLayout", () => {
  const mockChildren = <div data-testid="mock-children">Test Children Content</div>;

  beforeEach(() => {
    // Reset all mocks before each test to ensure clean state
    jest.clearAllMocks();
    // Re-import the component to trigger module level initialization
    jest.isolateModules(() => {
      require("./layout");
    });
  });

  it("renders the Header component and children", () => {
    // Note: Next.js layouts include html/body tags that can't be tested directly in a standard React test
    // We focus on testing the content that's actually rendered within the layout
    render(<RootLayout>{mockChildren}</RootLayout>);
    
    const header = screen.getByTestId("mock-header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("Header Component");
    
    const childrenDiv = screen.getByTestId("mock-children");
    expect(childrenDiv).toBeInTheDocument();
    expect(childrenDiv).toHaveTextContent("Test Children Content");
  });

  it("renders children inside the main element", () => {
    render(<RootLayout>{mockChildren}</RootLayout>);

    // Look for our test child element and check if it's within a main element
    const childrenDiv = screen.getByTestId("mock-children");
    const mainElement = childrenDiv.parentElement;

    // The children div should be inside a main element (which has tagName 'MAIN')
    expect(mainElement).not.toBeNull();
    if (mainElement) {
      expect(mainElement.tagName).toBe('MAIN');
    }
  });

  it("handles different children correctly", () => {
    const differentChildren = <span data-testid="different-children">Different Content</span>;
    render(<RootLayout>{differentChildren}</RootLayout>);

    const differentChildrenElement = screen.getByTestId("different-children");
    expect(differentChildrenElement).toBeInTheDocument();
    expect(differentChildrenElement).toHaveTextContent("Different Content");
  });

  it("handles multiple children correctly", () => {
    const multipleChildren = (
      <>
        <span data-testid="child1">Child 1</span>
        <span data-testid="child2">Child 2</span>
      </>
    );
    
    render(<RootLayout>{multipleChildren}</RootLayout>);

    const child1 = screen.getByTestId("child1");
    const child2 = screen.getByTestId("child2");

    expect(child1).toBeInTheDocument();
    expect(child2).toBeInTheDocument();
    expect(child1).toHaveTextContent("Child 1");
    expect(child2).toHaveTextContent("Child 2");
  });

  it("initializes the Inter font with correct subsets", () => {
    // Ensure the component was loaded and Inter font was initialized
    const { Inter } = require("next/font/google");
    expect(Inter).toHaveBeenCalledWith({ subsets: ["latin"] });
  });
});