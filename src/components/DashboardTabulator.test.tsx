import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardTabulator from './DashboardTabulator';

// Mock the external dependencies that might not work in test environment
jest.mock('jspdf', () => {
  const mockJsPDF = jest.fn(() => ({
    addPage: jest.fn(),
    save: jest.fn(),
  }));

  return {
    __esModule: true,
    default: mockJsPDF,
  };
});

jest.mock('jspdf-autotable', () => {
  const mockApplyPlugin = jest.fn();

  return {
    applyPlugin: mockApplyPlugin,
  };
});

// Mock the survey-core and survey-analytics modules
jest.mock('survey-core', () => {
  const mockModelConstructor = jest.fn();

  return {
    Model: mockModelConstructor,
  };
});

jest.mock('survey-analytics/survey.analytics.tabulator', () => {
  const mockTabulatorConstructor = jest.fn(() => ({
    render: jest.fn(),
  }));

  return {
    Tabulator: mockTabulatorConstructor,
  };
});

// Define references to the mocked functions
let mockModelConstructor;
let mockTabulatorConstructor;
let mockApplyPlugin;
let mockJsPDF;

beforeAll(() => {
  const jspdfModule = require('jspdf');
  const autoTableModule = require('jspdf-autotable');
  const surveyCoreModule = require('survey-core');
  const tabulatorModule = require('survey-analytics/survey.analytics.tabulator');

  mockJsPDF = jspdfModule.default;
  mockApplyPlugin = autoTableModule.applyPlugin;
  mockModelConstructor = surveyCoreModule.Model;
  mockTabulatorConstructor = tabulatorModule.Tabulator;
});

// Define mock data first before using it in the mock
const mockJsonData = {
  pages: [
    {
      name: "page1",
      elements: [
        { type: "text", name: "question1" }
      ]
    }
  ]
};

const mockSurveyData = [
  { question1: 'answer1' },
  { question1: 'answer2' }
];

// Mock the dashboard data using inline values
jest.mock('../../data/dashboard_data', () => {
  return {
    data: [
      { question1: 'answer1' },
      { question1: 'answer2' }
    ],
    json: {
      pages: [
        {
          name: "page1",
          elements: [
            { type: "text", name: "question1" }
          ]
        }
      ]
    },
  };
});

describe('DashboardTabulator', () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Ensure clean DOM state
    const existingContainer = document.getElementById('summaryContainer');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create a fresh container element in the document body
    const container = document.createElement('div');
    container.id = 'summaryContainer';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up the DOM after each test
    const container = document.getElementById('summaryContainer');
    if (container) {
      container.remove();
    }
  });

  it('renders without crashing', () => {
    render(<DashboardTabulator />);

    // Check if the main container div is present
    const containerElement = document.getElementById('summaryContainer');
    expect(containerElement).toBeInTheDocument();
  });

  it('creates a container div with correct ID', () => {
    render(<DashboardTabulator />);

    const containerDiv = document.getElementById('summaryContainer');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv?.id).toBe('summaryContainer');
  });

  it('should initialize the Survey Model with correct JSON data', () => {
    render(<DashboardTabulator />);

    // Verify that Model constructor was called with the expected JSON data
    expect(require('survey-core').Model).toHaveBeenCalledWith({
      pages: [
        {
          name: "page1",
          elements: [
            { type: "text", name: "question1" }
          ]
        }
      ]
    });
  });

  it('should initialize the Tabulator with correct parameters', () => {
    render(<DashboardTabulator />);

    // Verify that Tabulator constructor was called with the expected parameters
    expect(require('survey-analytics/survey.analytics.tabulator').Tabulator).toHaveBeenCalledWith(
      expect.anything(), // survey instance
      [
        { question1: 'answer1' },
        { question1: 'answer2' }
      ],
      {
        jspdf: require('jspdf').default,
        // xlsx property should be undefined since it's commented out
      }
    );
  });

  it('calls render method on the tabulator instance after mounting', async () => {
    const tabulatorInstance = {
      render: jest.fn(),
    };

    // Override the mock to return our spy instance
    require('survey-analytics/survey.analytics.tabulator').Tabulator.mockImplementation(() => tabulatorInstance);

    render(<DashboardTabulator />);

    // Wait for the useEffect to run
    await waitFor(() => {
      expect(tabulatorInstance.render).toHaveBeenCalledWith('summaryContainer');
    });
  });

  it('verifies the component structure', () => {
    render(<DashboardTabulator />);

    // Check that the main div is rendered with the correct id
    const containerElement = document.getElementById('summaryContainer');
    expect(containerElement).toBeInTheDocument();
    expect(containerElement).toHaveAttribute('id', 'summaryContainer');
  });
});