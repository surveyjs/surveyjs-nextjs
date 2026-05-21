import { render, screen } from '@testing-library/react';
import SurveyPage from './page';

// Mock the dynamic import properly to return the mocked Survey component
jest.mock('next/dynamic', () => {
  return {
    __esModule: true,
    default: (importFunction: () => Promise<any>) => {
      // Resolve the import promise to get the actual component
      const MockSurvey = () => <div data-testid="survey-component">Mock Survey Component</div>;
      return MockSurvey;
    },
  };
});

// Also mock the Survey component to ensure it's properly replaced
jest.mock('@/components/Survey', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="survey-component">Mock Survey Component</div>,
  };
});

describe('Survey Page', () => {
  it('should render the survey page with correct structure', async () => {
    render(<SurveyPage />);

    // The survey component should be present
    const surveyComponent = await screen.findByTestId('survey-component');
    expect(surveyComponent).toBeInTheDocument();
  });

  it('should render with the correct wrapper div classes', async () => {
    render(<SurveyPage />);

    // Wait for the dynamic component to load
    const surveyComponent = await screen.findByTestId('survey-component');

    // Find the parent div that wraps the survey component
    const wrapperDiv = surveyComponent.parentElement;

    // The wrapper div should exist and have the expected classes
    expect(wrapperDiv).toHaveClass('flex');
    expect(wrapperDiv).toHaveClass('min-h-screen');
    expect(wrapperDiv).toHaveClass('flex-col');
    expect(wrapperDiv).toHaveClass('items-center');
    expect(wrapperDiv).toHaveClass('p-8');
  });
});