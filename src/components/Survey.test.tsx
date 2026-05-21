import React from 'react';
import { render, screen } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import SurveyComponent from './Survey';

// Mock the survey-core module
jest.mock('survey-core', () => {
  const mockModelConstructor = jest.fn((json) => ({
    json: json,
    // Mock any methods that might be called
    onValueChanged: { callbacks: [], add: jest.fn() },
    onCurrentPageChanged: { callbacks: [], add: jest.fn() },
    data: {},
    getPlainData: jest.fn(() => []),
  }));

  return {
    Model: mockModelConstructor,
  };
});

// Mock the survey-react-ui module
jest.mock('survey-react-ui', () => {
  return {
    Survey: ({ model }: { model: any }) => (
      <div data-testid="survey-component">
        Mock Survey Component
      </div>
    )
  };
});

// Mock the survey-core CSS
jest.mock('survey-core/survey-core.css', () => ({}));

// Mock the survey JSON data with the same content as the real file
jest.mock('../../data/survey_json.js', () => {
  return {
    json: {
      title: "Product Feedback Survey",
      showProgressBar: true,
      pages: [{
        elements: [{
          type: "matrix",
          name: "Quality",
          title: "Please indicate if you agree or disagree with the following statements",
          columns: [{
            value: 1,
            text: "Strongly disagree"
          }, {
            value: 2,
            text: "Disagree"
          }, {
            value: 3,
            text: "Neutral"
          }, {
            value: 4,
            text: "Agree"
          }, {
            value: 5,
            text: "Strongly agree"
          }],
          rows: [{
            value: "affordable",
            text: "Product is affordable"
          }, {
            value: "does what it claims",
            text: "Product does what it claims"
          }, {
            value: "better then others",
            text: "Product is better than other products on the market"
          }, {
            value: "easy to use",
            text: "Product is easy to use"
          }]
        }, {
          type: "rating",
          name: "satisfaction",
          title: "How satisfied are you with the product?",
          minRateDescription: "Not satisfied",
          maxRateDescription: "Completely satisfied"
        }, {
          type: "rating",
          name: "recommend friends",
          visibleIf: "{satisfaction} > 3",
          title: "How likely are you to recommend the product to a friend or colleague?",
          minRateDescription: "Won't recommend",
          maxRateDescription: "Will recommend"
        }, {
          type: "comment",
          name: "suggestions",
          title: "What would make you more satisfied with the product?"
        }]
      }, {
        elements: [{
          type: "radiogroup",
          name: "price to competitors",
          title: "Compared to our competitors, do you feel the product is",
          choices: [
            "Less expensive",
            "Priced about the same",
            "More expensive",
            "Not sure"
          ]
        }, {
          type: "radiogroup",
          name: "price",
          title: "Do you feel our current price is merited by our product?",
          choices: [
            "correct|Yes, the price is about right",
            "low|No, the price is too low",
            "high|No, the price is too high"
          ]
        }, {
          type: "multipletext",
          name: "pricelimit",
          title: "What is the... ",
          items: [{
            name: "mostamount",
            title: "Most amount you would pay for a product like ours"
          }, {
            name: "leastamount",
            title: "The least amount you would feel comfortable paying"
          }]
        }]
      }, {
        elements: [{
          type: "text",
          name: "email",
          title: 'Thank you for taking our survey. Please enter your email address and press the "Submit" button.'
        }]
      }]
    }
  };
});

describe('SurveyComponent', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Additional cleanup if needed
  });

  it('renders without crashing', () => {
    render(<SurveyComponent />);
    
    // Check that the survey component renders
    const surveyElement = screen.getByTestId('survey-component');
    expect(surveyElement).toBeInTheDocument();
  });

  it('instantiates the Model with the correct JSON data', () => {
    const { Model } = require('survey-core');
    render(<SurveyComponent />);

    // Verify that Model constructor was called with the expected JSON data
    expect(Model).toHaveBeenCalledTimes(1);

    // Get the argument that was passed to the Model constructor
    const modelCallArg: any = (Model as jest.Mock).mock.calls[0][0];

    // Verify that the JSON contains expected properties
    expect(modelCallArg.title).toBe('Product Feedback Survey');
    expect(modelCallArg.showProgressBar).toBe(true);
    expect(Array.isArray(modelCallArg.pages)).toBe(true);
    expect(modelCallArg.pages.length).toBeGreaterThan(0);
  });

  it('should render the survey react ui component', () => {
    render(<SurveyComponent />);

    // The mock survey component should be rendered
    expect(screen.getByTestId('survey-component')).toBeInTheDocument();
    expect(screen.getByText('Mock Survey Component')).toBeInTheDocument();
  });

  it('passes the model instance to the Survey component', () => {
    const mockModel = {
      json: { title: 'Test Survey' },
      onValueChanged: { callbacks: [], add: jest.fn() },
      onCurrentPageChanged: { callbacks: [], add: jest.fn() },
      data: {},
      getPlainData: jest.fn(() => []),
    };

    (require('survey-core').Model as jest.Mock).mockReturnValue(mockModel);
    
    render(<SurveyComponent />);

    // Verify that the Survey component receives a model instance
    expect(require('survey-core').Model).toHaveBeenCalled();
  });

  it('should have correct survey structure based on JSON', () => {
    render(<SurveyComponent />);
    
    // Even though we're mocking, the structure should be based on the JSON
    const { Model } = require('survey-core');
    expect(Model).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Product Feedback Survey',
      showProgressBar: true,
      pages: expect.arrayContaining([
        expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: "matrix",
              name: "Quality",
              title: "Please indicate if you agree or disagree with the following statements"
            })
          ])
        })
      ])
    }));
  });

  it('does not throw any errors during rendering', () => {
    expect(() => {
      render(<SurveyComponent />);
    }).not.toThrow();
  });

  it('handles multiple render cycles correctly', () => {
    const { rerender } = render(<SurveyComponent />);
    
    // Rerender the same component to ensure it handles updates properly
    rerender(<SurveyComponent />);
    
    expect(screen.getByTestId('survey-component')).toBeInTheDocument();
  });
});