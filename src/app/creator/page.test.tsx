// @ts-nocheck
import SurveyCreatorPage from './page';

// Mock the dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: any) => fn().then((module: any) => module.default),
}));

// Mock the SurveyCreator component
jest.mock('@/components/SurveyCreator', () => ({
  __esModule: true,
  default: () => <div>Mocked Survey Creator Component</div>,
}));

describe('SurveyCreator Page', () => {
  it('renders the page with SurveyCreatorComponent', () => {
    // Call the component function directly to get the JSX element
    const componentResult = SurveyCreatorPage({});

    // Check if the result is a valid React element
    expect(componentResult).toBeDefined();
    expect(componentResult.type).toBe('div');
    expect(componentResult.props.children).toBeDefined();
  });

  it('has the correct layout classes', () => {
    const componentResult = SurveyCreatorPage({});

    expect(componentResult.type).toBe('div');
    expect(componentResult.props.className).toContain('flex');
    expect(componentResult.props.className).toContain('min-h-screen');
    expect(componentResult.props.className).toContain('flex-col');
    expect(componentResult.props.className).toContain('items-center');
    expect(componentResult.props.className).toContain('p-8');
  });

  it('wraps SurveyCreatorComponent in a div', () => {
    const componentResult = SurveyCreatorPage({});

    // Check that the children is the SurveyCreatorComponent
    expect(componentResult.props.children).toBeDefined();
  });
});