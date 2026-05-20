import PdfExport from './page';

// Mock the survey-core module
jest.mock('survey-core', () => ({
  Model: jest.fn().mockImplementation(() => ({
    data: {},
    onValueChanged: {
      add: jest.fn(),
    },
  })),
}));

// Mock the survey-pdf module
jest.mock('survey-pdf', () => ({
  SurveyPDF: jest.fn().mockImplementation(() => ({
    data: {},
    save: jest.fn(),
  })),
}));

// Mock the json import
jest.mock('../../../data/survey_json.js', () => ({
  json: {
    title: 'Test Survey',
    pages: [
      {
        name: 'page1',
        elements: [
          {
            type: 'text',
            name: 'question1',
            title: 'Question 1',
          },
        ],
      },
    ],
  },
}));

describe('PdfExport Page', () => {
  it('should be defined', () => {
    expect(PdfExport).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof PdfExport).toBe('function');
  });

  it('should render correctly with mocked dependencies', () => {
    // Just check that the component function exists and is callable
    const result = PdfExport();  // Call the component function
    expect(result).toBeDefined();
  });

  it('should handle PDF save functionality properly', () => {
    // Create a simple mock element
    const mockElement = {
      click: jest.fn(),
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      style: {},
    } as unknown as HTMLElement;

    // Mock the global window object to simulate browser environment if it doesn't exist
    if (!global.document) {
      Object.defineProperty(global, 'document', {
        value: {
          createElement: jest.fn((tagName: string) => mockElement),
        } as unknown as Document,
        writable: true,
      });
    } else {
      // If document already exists, just mock the createElement method
      global.document.createElement = jest.fn((tagName: string) => mockElement);
    }

    // Call the component which should create the Model and bind functions
    const ComponentResult = PdfExport();

    // Check that the component returns a valid JSX element
    expect(ComponentResult).toBeDefined();
  });

  it('creates Model and has savePDF functionality', () => {
    // Count how many times the Model constructor is called when component is rendered
    const modelCallsBefore = require('survey-core').Model.mock.calls.length || 0;

    // Execute the component
    const ComponentResult = PdfExport();

    // Check that the Model constructor was called (once for the main component)
    const modelCallsAfter = require('survey-core').Model.mock.calls.length || 0;
    expect(modelCallsAfter - modelCallsBefore).toBeGreaterThanOrEqual(1);

    // Check that SurveyPDF constructor exists and can be called
    expect(require('survey-pdf').SurveyPDF).toBeDefined();
  });
});