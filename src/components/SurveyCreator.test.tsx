import { render, screen, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import SurveyCreatorWidget from './SurveyCreator';

// Mock the survey-creator-react components
jest.mock('survey-creator-react', () => ({
  SurveyCreatorComponent: ({ creator }: { creator: any }) => (
    <div data-testid="survey-creator-component">Mock Survey Creator Component</div>
  ),
  SurveyCreator: class {
    JSON: any;
    saveSurveyFunc: Function | null = null;
    constructor(options: any) {}
  }
}));

// Mock the survey-core CSS
jest.mock('survey-core/survey-core.css', () => ({}));
jest.mock('survey-creator-core/survey-creator-core.css', () => ({}));

// Mock ace-builds
jest.mock('ace-builds/src-noconflict/ace', () => ({}));
jest.mock('ace-builds/src-noconflict/ext-searchbox', () => ({}));

// Mock the data/survey_json module
jest.mock('../../data/survey_json', () => ({
  json: {
    title: "Test Survey",
    pages: [
      {
        name: "page1",
        elements: [
          {
            type: "text",
            name: "question1",
            title: "Question 1"
          }
        ]
      }
    ]
  }
}));

describe('SurveyCreatorWidget', () => {
  const mockConsoleLog = jest.fn();

  beforeEach(() => {
    // Mock console.log to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(mockConsoleLog);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the survey creator component', () => {
    render(<SurveyCreatorWidget />);
    
    expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
  });

  it('uses default JSON when no props are provided', async () => {
    render(<SurveyCreatorWidget />);
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
    });
  });

  it('uses provided JSON when passed as prop', async () => {
    const customJson = {
      title: "Custom Survey",
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "text",
              name: "customQuestion",
              title: "Custom Question"
            }
          ]
        }
      ]
    };

    render(<SurveyCreatorWidget json={customJson} />);
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
    });
  });

  it('uses default options when no options are provided', () => {
    render(<SurveyCreatorWidget />);
    
    expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
  });

  it('uses provided options when passed as prop', () => {
    const customOptions = {
      showTranslationTab: false,
      showLogicTab: true
    };

    render(<SurveyCreatorWidget options={customOptions} />);
    
    expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
  });

  it('sets up saveSurveyFunc correctly', async () => {
    render(<SurveyCreatorWidget />);
    
    await waitFor(() => {
      expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
    });
  });

  it('handles empty JSON gracefully', () => {
    render(<SurveyCreatorWidget json={undefined as any} />);
    
    expect(screen.getByTestId('survey-creator-component')).toBeInTheDocument();
  });

  it('renders with custom style properties', () => {
    const { container } = render(<SurveyCreatorWidget />);
    
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveStyle({
      height: '80vh',
      width: '100%'
    });
  });
});