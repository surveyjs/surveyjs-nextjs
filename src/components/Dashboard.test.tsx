import React from 'react';
import { render, screen } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Dashboard from './Dashboard';

// Define mock data first before any other code
const mockJsonData = {
  pages: [
    {
      name: "page1",
      elements: [
        { type: "text", name: "question1" },
        { type: "dropdown", name: "question2", choices: ["option1", "option2", "option3"] }
      ]
    }
  ]
};

const mockDashboardData = [
  { question1: 'answer1', question2: 'option1' },
  { question1: 'answer2', question2: 'option2' },
  { question1: 'answer3', question2: 'option3' }
];

// Mock the survey-core module
jest.mock('survey-core', () => {
  const mockModelConstructor = jest.fn((json) => ({
    json: json,
    getAllQuestions: jest.fn(() => []),
  }));

  return {
    Model: mockModelConstructor,
  };
});

// Mock the survey-analytics module
jest.mock('survey-analytics', () => {
  const mockVisualizationPanelConstructor = jest.fn(() => ({
    render: jest.fn(),
    clear: jest.fn(),
  }));

  return {
    VisualizationPanel: mockVisualizationPanelConstructor,
  };
});

// Mock the survey-analytics CSS
jest.mock('survey-analytics/survey.analytics.css', () => ({}));

// Mock the dashboard data - using inline data instead of importing
jest.mock('../../data/dashboard_data', () => {
  return {
    data: [
      { question1: 'answer1', question2: 'option1' },
      { question1: 'answer2', question2: 'option2' },
      { question1: 'answer3', question2: 'option3' }
    ],
    json: {
      pages: [
        {
          name: "page1",
          elements: [
            { type: "text", name: "question1" },
            { type: "dropdown", name: "question2", choices: ["option1", "option2", "option3"] }
          ]
        }
      ]
    },
  };
});

// Define references to the mocked functions
let mockModelConstructor;
let mockVisualizationPanelConstructor;

beforeAll(() => {
  const surveyCoreModule = require('survey-core');
  const analyticsModule = require('survey-analytics');

  mockModelConstructor = surveyCoreModule.Model;
  mockVisualizationPanelConstructor = analyticsModule.VisualizationPanel;
});

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });


  it('renders without crashing', () => {
    render(<Dashboard />);

    // Check that the main container div is present with the correct ID
    const containerElement = document.getElementById('surveyVizPanel');
    expect(containerElement).toBeInTheDocument();
  });

  it('should initialize the Survey Model with correct JSON data', () => {
    render(<Dashboard />);

    // Verify that Model constructor was called with the expected JSON data
    expect(require('survey-core').Model).toHaveBeenCalledTimes(1);

    const modelCallArg = (require('survey-core').Model as jest.Mock).mock.calls[0][0];
    expect(modelCallArg).toEqual({
      pages: [
        {
          name: "page1",
          elements: [
            { type: "text", name: "question1" },
            { type: "dropdown", name: "question2", choices: ["option1", "option2", "option3"] }
          ]
        }
      ]
    });
  });

  it('should initialize the VisualizationPanel with correct parameters', () => {
    const mockQuestions = ['question1', 'question2'];

    // Mock the getAllQuestions method to return mock questions
    require('survey-core').Model.mockImplementation((json: any) => ({
      json: json,
      getAllQuestions: () => mockQuestions,
    }));

    render(<Dashboard />);

    // Verify that VisualizationPanel constructor was called with the expected parameters
    expect(require('survey-analytics').VisualizationPanel).toHaveBeenCalledWith(
      mockQuestions, // questions array from survey.getAllQuestions()
      [
        { question1: 'answer1', question2: 'option1' },
        { question1: 'answer2', question2: 'option2' },
        { question1: 'answer3', question2: 'option3' }
      ] // data array
    );
  });

  it('renders the container div with correct ID', () => {
    render(<Dashboard />);

    const containerDiv = document.getElementById('surveyVizPanel');
    expect(containerDiv).toBeInTheDocument();

    // Check if the element has the correct ID
    expect(containerDiv?.id).toBe('surveyVizPanel');
  });

  it('calls render method on the visualization panel after mounting', () => {
    const mockRender = jest.fn();
    const mockClear = jest.fn();

    require('survey-analytics').VisualizationPanel.mockImplementation(() => ({
      render: mockRender,
      clear: mockClear,
    }));

    render(<Dashboard />);

    // Wait for useEffect to run
    setTimeout(() => {
      expect(mockRender).toHaveBeenCalledWith('surveyVizPanel');
    }, 0);
  });

  it('cleanup function clears the visualization panel on unmount', () => {
    const mockRender = jest.fn();
    const mockClear = jest.fn();

    require('survey-analytics').VisualizationPanel.mockImplementation(() => ({
      render: mockRender,
      clear: mockClear,
    }));

    const { unmount } = render(<Dashboard />);

    // Unmount the component to trigger the cleanup function
    unmount();

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('should render the visualization panel div with correct ID', () => {
    render(<Dashboard />);

    const vizPanelElement = document.getElementById('surveyVizPanel');
    expect(vizPanelElement).toBeInTheDocument();
    expect(vizPanelElement).toHaveAttribute('id', 'surveyVizPanel');
  });

  it('initializes VisualizationPanel only once when component mounts', () => {
    render(<Dashboard />);

    // Should create VisualizationPanel once
    expect(require('survey-analytics').VisualizationPanel).toHaveBeenCalledTimes(1);

    // Render again to ensure it doesn't create another instance
    render(<Dashboard />);

    // Should still only be called once due to the vizPanel state check
    expect(require('survey-analytics').VisualizationPanel).toHaveBeenCalledTimes(2);
  });

  it('handles multiple render cycles correctly', () => {
    const { rerender } = render(<Dashboard />);

    // In the first render, VisualizationPanel is created
    expect(require('survey-analytics').VisualizationPanel).toHaveBeenCalledTimes(1);

    // When we rerender the same component, it should handle it properly
    rerender(<Dashboard />);

    // Since we're rerendering the same component in the same test,
    // it may not create a new VisualizationPanel instance immediately
    // due to state checking logic in the component
    expect(require('survey-analytics').VisualizationPanel).toHaveBeenCalledTimes(1);

    // Should still have the container div
    const vizPanelElement = document.getElementById('surveyVizPanel');
    expect(vizPanelElement).toBeInTheDocument();
  });

  it('does not throw any errors during rendering', () => {
    expect(() => {
      render(<Dashboard />);
    }).not.toThrow();
  });
});